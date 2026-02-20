/**
 * Analytics Service
 *
 * Business logic for dashboard analytics.
 * Extracted from api/analytics/dashboard route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Studio Owner / Operator analytics
// ---------------------------------------------------------------------------

export interface OperatorStats {
  todaySessions: number;
  activeTrainers: number;
  activeClients: number;
  pendingActions: number;
}

export interface UpcomingSessionRow {
  id: string;
  clientName: string;
  trainerName: string | null;
  scheduledAt: string;
  serviceName: string;
  status: string;
}

/**
 * Count sessions scheduled for today across the studio.
 */
export async function getTodaySessionCount(studioId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from('ta_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .in('status', ['confirmed', 'soft-hold', 'checked-in', 'completed']);

  if (error) {
    console.error('Error fetching today sessions:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Count active trainers (staff members linked to the studio).
 */
export async function getActiveTrainerCount(studioId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from('bs_staff')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('staff_type', 'trainer');

  if (error) {
    console.error('Error fetching active trainers:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Count pending actions: booking requests + expired health checks.
 */
export async function getPendingActionsCount(studioId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  // Pending booking requests
  const { count: pendingBookings } = await supabase
    .from('ta_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'pending');

  // Expired soft holds
  const { count: expiredHolds } = await supabase
    .from('ta_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'soft-hold')
    .lt('hold_expiry', new Date().toISOString());

  return (pendingBookings || 0) + (expiredHolds || 0);
}

/**
 * Get the next N upcoming sessions for a studio.
 */
export async function getUpcomingSessions(studioId: string, limit = 5): Promise<UpcomingSessionRow[]> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('ta_bookings')
    .select(`
      id,
      scheduled_at,
      status,
      duration,
      client:client_id ( first_name, last_name ),
      trainer:trainer_id ( first_name, last_name ),
      service:service_id ( name )
    `)
    .eq('studio_id', studioId)
    .gte('scheduled_at', now)
    .in('status', ['confirmed', 'soft-hold'])
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming sessions:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const client = row.client as { first_name?: string; last_name?: string } | null;
    const trainer = row.trainer as { first_name?: string; last_name?: string } | null;
    const service = row.service as { name?: string } | null;
    return {
      id: row.id as string,
      clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown',
      trainerName: trainer ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() : null,
      scheduledAt: row.scheduled_at as string,
      serviceName: service?.name || 'Session',
      status: row.status as string,
    };
  });
}

/**
 * Get aggregated operator stats for the studio owner dashboard.
 */
export async function getOperatorStats(studioId: string): Promise<{
  data: OperatorStats | null;
  error: Error | null;
}> {
  try {
    const [todaySessions, activeTrainers, pendingActions] = await Promise.all([
      getTodaySessionCount(studioId),
      getActiveTrainerCount(studioId),
      getPendingActionsCount(studioId),
    ]);

    // Active clients from fc_clients linked to the studio
    const supabase = createServiceRoleClient();
    const { count: activeClients } = await supabase
      .from('fc_clients')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', studioId);

    return {
      data: {
        todaySessions,
        activeTrainers,
        activeClients: activeClients || 0,
        pendingActions,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ---------------------------------------------------------------------------
// Trainer analytics (existing)
// ---------------------------------------------------------------------------

export interface DashboardAnalytics {
  earningsThisWeek: number;
  earningsThisMonth: number;
  sessionsThisWeek: number;
  sessionsCompleted: number;
  sessionsUpcoming: number;
  activeClients: number;
  utilizationPercent: number;
  softHoldsCount: number;
  outstandingCredits: number;
  lowCreditClients: number;
}

/**
 * Get dashboard analytics for a trainer.
 */
export async function getDashboardAnalytics(
  trainerId: string
): Promise<{ data: DashboardAnalytics | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Get date ranges
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    // Fetch earnings this week
    const { data: weeklyEarnings } = await supabase
      .from('ta_payments')
      .select('trainer_amount_cents')
      .eq('trainer_id', trainerId)
      .eq('status', 'succeeded')
      .gte('created_at', weekStart.toISOString());

    const earningsThisWeek = weeklyEarnings?.reduce((sum: number, p: { trainer_amount_cents?: number }) => sum + (p.trainer_amount_cents || 0), 0) || 0;

    // Fetch sessions this week (completed + upcoming)
    const { data: weekSessions } = await supabase
      .from('ta_bookings')
      .select('id, status')
      .eq('trainer_id', trainerId)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

    const sessionsCompleted = weekSessions?.filter((s: { status: string }) => s.status === 'completed').length || 0;
    const sessionsUpcoming = weekSessions?.filter((s: { status: string }) => ['confirmed', 'soft-hold'].includes(s.status)).length || 0;
    const sessionsThisWeek = sessionsCompleted + sessionsUpcoming;

    // Fetch active clients (sessions in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: recentClients } = await supabase
      .from('ta_bookings')
      .select('client_id')
      .eq('trainer_id', trainerId)
      .gte('scheduled_at', thirtyDaysAgo.toISOString())
      .in('status', ['confirmed', 'completed', 'checked-in']);

    const uniqueClients = new Set(recentClients?.map((b: { client_id: string }) => b.client_id).filter(Boolean));
    const activeClients = uniqueClients.size;

    // Calculate utilization
    const { data: availability } = await supabase
      .from('ta_availability')
      .select('start_hour, start_minute, end_hour, end_minute')
      .eq('trainer_id', trainerId)
      .eq('block_type', 'available')
      .eq('recurrence', 'weekly');

    const weeklyAvailableMinutes = availability?.reduce((total: number, slot: { start_hour: number; start_minute?: number; end_hour: number; end_minute?: number }) => {
      const start = slot.start_hour * 60 + (slot.start_minute || 0);
      const end = slot.end_hour * 60 + (slot.end_minute || 0);
      return total + (end - start);
    }, 0) || 0;

    const { data: weekBookings } = await supabase
      .from('ta_bookings')
      .select('duration')
      .eq('trainer_id', trainerId)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['confirmed', 'completed', 'checked-in']);

    const bookedMinutes = weekBookings?.reduce((sum: number, b: { duration?: number }) => sum + (b.duration || 0), 0) || 0;

    const utilizationPercent = weeklyAvailableMinutes > 0
      ? Math.round((bookedMinutes / weeklyAvailableMinutes) * 100)
      : 0;

    // Get soft holds count
    const { data: softHolds } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('status', 'soft-hold');

    const softHoldsCount = softHolds?.length || 0;

    // Get outstanding credits
    const { data: clientPackages } = await supabase
      .from('ta_client_packages')
      .select('sessions_remaining')
      .eq('trainer_id', trainerId)
      .eq('status', 'active');

    const outstandingCredits = clientPackages?.reduce((sum: number, p: { sessions_remaining?: number }) => sum + (p.sessions_remaining || 0), 0) || 0;

    // Get low credit clients (2 or fewer credits)
    const lowCreditClients = clientPackages?.filter((p: { sessions_remaining?: number }) => (p.sessions_remaining || 0) > 0 && (p.sessions_remaining || 0) <= 2).length || 0;

    return {
      data: {
        earningsThisWeek,
        earningsThisMonth: 0, // Would need another query
        sessionsThisWeek,
        sessionsCompleted,
        sessionsUpcoming,
        activeClients,
        utilizationPercent,
        softHoldsCount,
        outstandingCredits,
        lowCreditClients,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
