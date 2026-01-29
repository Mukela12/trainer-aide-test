import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');
    const now = new Date();

    // Fetch upcoming bookings with related data
    const { data: bookings, error } = await supabase
      .from('ta_bookings')
      .select(`
        id,
        scheduled_at,
        status,
        fc_clients (id, first_name, last_name, name),
        ta_services (name)
      `)
      .eq('trainer_id', user.id)
      .gte('scheduled_at', now.toISOString())
      .in('status', ['confirmed', 'soft-hold'])
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    const sessions = (bookings || []).map((booking) => {
      const client = booking.fc_clients as { name?: string; first_name?: string; last_name?: string } | null;
      const service = booking.ta_services as { name?: string } | null;

      return {
        id: booking.id,
        clientName: client?.name ||
          (client?.first_name && client?.last_name
            ? `${client.first_name} ${client.last_name}`.trim()
            : 'Client'),
        scheduledAt: booking.scheduled_at,
        serviceName: service?.name || 'Session',
        status: booking.status,
      };
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error in upcoming sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
