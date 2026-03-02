import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Telnyx webhook payload structure
    const event = body?.data;
    if (!event) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const eventType = event.event_type || body.event_type;
    if (eventType !== 'message.received') {
      // Acknowledge non-message events
      return NextResponse.json({ ok: true });
    }

    const payload = event.payload || event;
    const fromNumber = payload.from?.phone_number || payload.from;
    const messageBody = (payload.text || '').trim().toUpperCase();

    if (!fromNumber) {
      return NextResponse.json({ error: 'Missing from number' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Handle STOP/START opt-out commands
    if (messageBody === 'STOP') {
      await supabase
        .from('fc_clients')
        .update({
          sms_transactional_opt_in: false,
          sms_marketing_opt_in: false,
          sms_opted_out_at: new Date().toISOString(),
        })
        .eq('phone', fromNumber);

      // Audit trail
      await supabase.from('ta_notifications').insert({
        type: 'sms_opt_out',
        channel: 'sms',
        recipient_email: fromNumber,
        status: 'sent',
      });

      return NextResponse.json({ ok: true, action: 'opted_out' });
    }

    if (messageBody === 'START') {
      await supabase
        .from('fc_clients')
        .update({
          sms_transactional_opt_in: true,
          sms_marketing_opt_in: false, // only re-enable transactional by default
          sms_opted_out_at: null,
        })
        .eq('phone', fromNumber);

      // Audit trail
      await supabase.from('ta_notifications').insert({
        type: 'sms_opt_in',
        channel: 'sms',
        recipient_email: fromNumber,
        status: 'sent',
      });

      return NextResponse.json({ ok: true, action: 'opted_in' });
    }

    // Log other inbound messages for audit
    await supabase.from('ta_notifications').insert({
      type: 'sms_inbound',
      channel: 'sms',
      recipient_email: fromNumber,
      status: 'sent',
      template_data: { body: payload.text },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing inbound SMS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
