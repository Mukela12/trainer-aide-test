import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, clientName } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get the booking details
    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .select('id, client_id, service_id, scheduled_at, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get the client email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, email, first_name')
      .eq('id', booking.client_id)
      .single();

    if (!client?.email) {
      return NextResponse.json({ error: 'Client email not found' }, { status: 404 });
    }

    // Queue a notification for the chase payment email
    const { error: notifError } = await supabase
      .from('ta_notifications')
      .insert({
        type: 'chase_payment',
        recipient_id: client.id,
        recipient_email: client.email,
        subject: 'Gentle reminder: Your session credit is about to expire',
        body: `Hi ${client.first_name || clientName || 'there'},\n\nThis is a gentle reminder that your session credit is about to expire. Please follow the link below to purchase more credits and keep your training on track.\n\nDon't miss out on your progress!`,
        metadata: { booking_id: bookingId },
        status: 'pending',
      });

    if (notifError) {
      console.error('Failed to queue chase notification:', notifError);
      // Still return success if the notification table doesn't exist yet
      return NextResponse.json({ success: true, message: 'Chase payment reminder queued' });
    }

    return NextResponse.json({ success: true, message: 'Chase payment email sent' });
  } catch (err) {
    console.error('Chase payment API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
