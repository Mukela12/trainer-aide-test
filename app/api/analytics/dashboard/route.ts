import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date ranges
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch earnings this week
    const { data: weeklyEarnings } = await supabase
      .from('ta_payments')
      .select('trainer_amount_cents')
      .eq('trainer_id', user.id)
      .eq('status', 'succeeded')
      .gte('created_at', weekStart.toISOString());

    const earningsThisWeek = weeklyEarnings?.reduce((sum, p) => sum + (p.trainer_amount_cents || 0), 0) || 0;

    // Fetch sessions this week (completed + upcoming)
    const { data: weekSessions } = await supabase
      .from('ta_bookings')
      .select('id, status')
      .eq('trainer_id', user.id)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

    const sessionsCompleted = weekSessions?.filter(s => s.status === 'completed').length || 0;
    const sessionsUpcoming = weekSessions?.filter(s => ['confirmed', 'soft-hold'].includes(s.status)).length || 0;
    const sessionsThisWeek = sessionsCompleted + sessionsUpcoming;

    // Fetch active clients (sessions in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { data: recentClients } = await supabase
      .from('ta_bookings')
      .select('client_id')
      .eq('trainer_id', user.id)
      .gte('scheduled_at', thirtyDaysAgo.toISOString())
      .in('status', ['confirmed', 'completed', 'checked-in']);

    const uniqueClients = new Set(recentClients?.map(b => b.client_id).filter(Boolean));
    const activeClients = uniqueClients.size;

    // Calculate utilization
    // Get available hours per week
    const { data: availability } = await supabase
      .from('ta_availability')
      .select('start_hour, start_minute, end_hour, end_minute')
      .eq('trainer_id', user.id)
      .eq('block_type', 'available')
      .eq('recurrence', 'weekly');

    const weeklyAvailableMinutes = availability?.reduce((total, slot) => {
      const start = slot.start_hour * 60 + (slot.start_minute || 0);
      const end = slot.end_hour * 60 + (slot.end_minute || 0);
      return total + (end - start);
    }, 0) || 0;

    // Get booked minutes this week
    const { data: weekBookings } = await supabase
      .from('ta_bookings')
      .select('duration')
      .eq('trainer_id', user.id)
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['confirmed', 'completed', 'checked-in']);

    const bookedMinutes = weekBookings?.reduce((sum, b) => sum + (b.duration || 0), 0) || 0;

    const utilizationPercent = weeklyAvailableMinutes > 0
      ? Math.round((bookedMinutes / weeklyAvailableMinutes) * 100)
      : 0;

    // Get soft holds count
    const { data: softHolds } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', user.id)
      .eq('status', 'soft-hold');

    const softHoldsCount = softHolds?.length || 0;

    // Get outstanding credits
    const { data: clientPackages } = await supabase
      .from('ta_client_packages')
      .select('sessions_remaining')
      .eq('trainer_id', user.id)
      .eq('status', 'active');

    const outstandingCredits = clientPackages?.reduce((sum, p) => sum + (p.sessions_remaining || 0), 0) || 0;

    // Get low credit clients (2 or fewer credits)
    const lowCreditClients = clientPackages?.filter(p => p.sessions_remaining > 0 && p.sessions_remaining <= 2).length || 0;

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
