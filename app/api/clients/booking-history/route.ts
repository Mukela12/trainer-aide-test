import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client_id from query params
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Handle invitation-prefixed IDs (pending invitations won't have booking history)
    if (clientId.startsWith('invitation_')) {
      return NextResponse.json({ bookings: [] });
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Fetch bookings for this client
    const { data: bookings, error: bookingsError } = await serviceClient
      .from('ta_bookings')
      .select(`
        id,
        scheduled_at,
        duration,
        status,
        notes,
        service_id,
        ta_services (
          name,
          credits_required
        )
      `)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch booking history' }, { status: 500 });
    }

    // Transform the data
    const formattedBookings = (bookings || []).map((booking: {
      id: string;
      scheduled_at: string;
      duration: number | null;
      status: string;
      notes: string | null;
      service_id: string | null;
      ta_services: { name: string; credits_required: number } | null;
    }) => ({
      id: booking.id,
      session_name: booking.ta_services?.name || 'Session',
      scheduled_at: booking.scheduled_at,
      status: booking.status,
      duration: booking.duration,
      credits_used: booking.ta_services?.credits_required || 0,
      notes: booking.notes,
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error in booking history API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
