import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendRescheduleEmail } from '@/lib/notifications/email-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, oldTime, newTime } = body;

    if (!bookingId || !oldTime || !newTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch booking with client and service details
    const { data: booking, error: bookingError } = await serviceClient
      .from('ta_bookings')
      .select(`
        id,
        client:fc_clients(email, first_name, last_name),
        service:ta_services(name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const client = booking.client as { email?: string; first_name?: string; last_name?: string } | null;
    const service = booking.service as { name?: string } | null;

    if (!client?.email) {
      return NextResponse.json({ error: 'Client has no email' }, { status: 400 });
    }

    // Fetch trainer name
    const { data: trainer } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const trainerName = trainer
      ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer'
      : 'Your Trainer';

    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';

    await sendRescheduleEmail({
      clientEmail: client.email,
      clientName,
      trainerName,
      serviceName: service?.name || 'Session',
      oldTime,
      newTime,
      bookingId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending reschedule email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
