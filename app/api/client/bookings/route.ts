import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/bookings
 * Returns the authenticated client's bookings
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client) {
      return NextResponse.json({ bookings: [] });
    }

    // Get bookings for this client
    const { data: bookings, error } = await supabase
      .from('ta_bookings')
      .select(`
        id,
        scheduled_at,
        duration,
        status,
        ta_services(name),
        trainer_id
      `)
      .eq('client_id', client.id)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching client bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Get trainer names for all bookings
    const trainerIds = [...new Set((bookings || []).map((b) => b.trainer_id))];
    const { data: trainers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', trainerIds);

    const trainerMap = new Map(
      (trainers || []).map((t) => [
        t.id,
        `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Trainer',
      ])
    );

    return NextResponse.json({
      bookings: (bookings || []).map((b) => ({
        id: b.id,
        scheduledAt: b.scheduled_at,
        duration: b.duration,
        status: b.status,
        serviceName: (b.ta_services as any)?.name || 'Session',
        trainerName: trainerMap.get(b.trainer_id) || 'Trainer',
      })),
    });
  } catch (error) {
    console.error('Error in client bookings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/client/bookings?id=xxx
 * Cancel a booking
 */
export async function DELETE(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('id');
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Verify the booking belongs to this client
    const { data: booking } = await supabase
      .from('ta_bookings')
      .select('id, status, scheduled_at')
      .eq('id', bookingId)
      .eq('client_id', client.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking can be cancelled (at least 24 hours before)
    const scheduledAt = new Date(booking.scheduled_at);
    const cancellationDeadline = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);

    if (new Date() > cancellationDeadline) {
      return NextResponse.json(
        { error: 'Cannot cancel booking within 24 hours of scheduled time' },
        { status: 400 }
      );
    }

    // Cancel the booking
    const { error: updateError } = await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in client bookings DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
