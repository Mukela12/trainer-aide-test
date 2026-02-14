import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { RouteParams } from '@/lib/types/api';

// GET /api/trainers/[id]/stats - Get trainer statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: trainerId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch trainer's client count
    const { count: totalClients } = await serviceClient
      .from('fc_clients')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId);

    // Fetch total bookings count
    const { count: totalBookings } = await serviceClient
      .from('ta_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId);

    // Fetch upcoming bookings count (bookings in the future)
    const now = new Date().toISOString();
    const { count: upcomingBookings } = await serviceClient
      .from('ta_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId)
      .gte('start_time', now)
      .in('status', ['confirmed', 'pending']);

    // Fetch assigned templates count
    const { count: totalTemplates } = await serviceClient
      .from('ta_trainer_template_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId);

    return NextResponse.json({
      totalClients: totalClients || 0,
      totalBookings: totalBookings || 0,
      totalTemplates: totalTemplates || 0,
      upcomingBookings: upcomingBookings || 0,
    });
  } catch (error) {
    console.error('Error in trainer stats GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
