import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/bookings/[id]/check-in
 * Checks in a booking - changes status to 'checked-in'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceClient = createServiceRoleClient();

    // First, verify the booking exists and is in a valid state for check-in
    const { data: existingBooking, error: fetchError } = await serviceClient
      .from('ta_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only confirmed or soft-hold bookings can be checked in
    const validStatuses = ['confirmed', 'soft-hold'];
    if (!validStatuses.includes(existingBooking.status)) {
      return NextResponse.json(
        { error: `Cannot check in booking with status '${existingBooking.status}'` },
        { status: 400 }
      );
    }

    // Update status to checked-in
    const { data, error } = await serviceClient
      .from('ta_bookings')
      .update({
        status: 'checked-in',
        hold_expiry: null, // Clear any soft-hold expiry
      })
      .eq('id', id)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error checking in booking:', error);
      return NextResponse.json(
        { error: 'Failed to check in booking', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
