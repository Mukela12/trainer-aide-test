// SMS service using Telnyx API

import { createClient } from '@supabase/supabase-js';

const TELNYX_API_URL = 'https://api.telnyx.com/v2/messages';

const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Check if SMS functionality is enabled (Telnyx env vars present)
 */
export function isSMSEnabled(): boolean {
  return !!(process.env.TELNYX_API_KEY && process.env.TELNYX_PHONE_NUMBER);
}

/**
 * Send an SMS via Telnyx API
 */
export async function sendViaTelnyx(params: {
  to: string;
  text: string;
}): Promise<{ messageId?: string; error?: string }> {
  const apiKey = process.env.TELNYX_API_KEY;
  const fromNumber = process.env.TELNYX_PHONE_NUMBER;

  if (!apiKey || !fromNumber) {
    return { error: 'Telnyx is not configured' };
  }

  try {
    const response = await fetch(TELNYX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromNumber,
        to: params.to,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telnyx API error:', response.status, errorText);
      return { error: `Telnyx API error (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    return { messageId: data?.data?.id };
  } catch (error) {
    console.error('Error sending SMS via Telnyx:', error);
    return { error: String(error) };
  }
}

/**
 * Queue an SMS for delivery
 */
export async function queueSMS(params: {
  phone: string;
  message: string;
  type?: 'transactional' | 'marketing';
  userId?: string;
  bookingId?: string;
  sendAt?: Date;
}): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('sms_queue')
      .insert({
        phone_number: params.phone,
        message: params.message,
        type: params.type || 'transactional',
        user_id: params.userId,
        booking_id: params.bookingId,
        send_at: params.sendAt?.toISOString() || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Process pending SMS messages from the queue
 */
export async function processSMSQueue(batchSize: number = 10): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();
  const result = { processed: 0, sent: 0, failed: 0, errors: [] as string[] };

  // Fetch pending messages ready to send
  const { data: pendingMessages, error: fetchError } = await supabase
    .from('sms_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .lt('attempt_count', 3)
    .order('send_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    return { ...result, errors: [fetchError.message] };
  }

  if (!pendingMessages || pendingMessages.length === 0) {
    return result;
  }

  for (const msg of pendingMessages) {
    result.processed++;

    const sendResult = await sendViaTelnyx({
      to: msg.phone_number,
      text: msg.message,
    });

    if (sendResult.error) {
      result.failed++;
      result.errors.push(`${msg.id}: ${sendResult.error}`);

      await supabase
        .from('sms_queue')
        .update({
          attempt_count: msg.attempt_count + 1,
          error_message: sendResult.error,
          status: msg.attempt_count + 1 >= msg.max_attempts ? 'failed' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id);
    } else {
      result.sent++;

      await supabase
        .from('sms_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: sendResult.messageId,
          attempt_count: msg.attempt_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', msg.id);

      // Audit trail in ta_notifications
      await supabase.from('ta_notifications').insert({
        type: 'sms_sent',
        channel: 'sms',
        recipient_email: msg.phone_number,
        booking_id: msg.booking_id,
        status: 'sent',
        message_id: sendResult.messageId,
      });
    }
  }

  return result;
}
