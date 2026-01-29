import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendBookingConfirmationEmail,
  sendReminderEmail,
  sendLowCreditsEmail,
  sendPaymentReceiptEmail,
} from '@/lib/notifications/email-service';

// Use service role for notification processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/notifications/send
 * Process pending notifications from the queue
 * Can be called by a cron job or triggered manually
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key for security (optional - can use a cron secret)
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.NOTIFICATION_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      // If API key is configured, require it
      // Otherwise allow unauthenticated access (for development)
      if (apiKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const type = body.type; // Optional filter by notification type

    // Get pending notifications
    let query = supabase
      .from('ta_notifications')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending notifications' });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of notifications) {
      results.processed++;

      try {
        let success = false;

        switch (notification.type) {
          case 'booking_confirmation': {
            const data = await getBookingData(notification.booking_id);
            if (data) {
              const result = await sendBookingConfirmationEmail({
                clientEmail: notification.recipient_email,
                clientName: data.clientName,
                trainerName: data.trainerName,
                serviceName: data.serviceName,
                scheduledAt: data.scheduledAt,
                duration: data.duration,
                bookingId: notification.booking_id,
              });
              success = result.success;
              if (!success) results.errors.push(result.error || 'Unknown error');
            }
            break;
          }

          case 'reminder_24h':
          case 'reminder_2h': {
            const hours = notification.type === 'reminder_24h' ? 24 : 2;
            const data = await getBookingData(notification.booking_id);
            if (data) {
              const result = await sendReminderEmail({
                clientEmail: notification.recipient_email,
                clientName: data.clientName,
                trainerName: data.trainerName,
                serviceName: data.serviceName,
                scheduledAt: data.scheduledAt,
                hours,
                bookingId: notification.booking_id,
              });
              success = result.success;
              if (!success) results.errors.push(result.error || 'Unknown error');
            }
            break;
          }

          case 'low_credits': {
            const metadata = notification.metadata as Record<string, unknown> | null;
            if (metadata) {
              const result = await sendLowCreditsEmail({
                clientEmail: notification.recipient_email,
                clientName: String(metadata.clientName || 'Client'),
                creditsRemaining: Number(metadata.creditsRemaining || 0),
                trainerName: String(metadata.trainerName || 'Your Trainer'),
                bookingLink: String(metadata.bookingLink || ''),
                clientId: notification.client_id,
              });
              success = result.success;
              if (!success) results.errors.push(result.error || 'Unknown error');
            }
            break;
          }

          case 'payment_receipt': {
            const metadata = notification.metadata as Record<string, unknown> | null;
            if (metadata) {
              const result = await sendPaymentReceiptEmail({
                clientEmail: notification.recipient_email,
                clientName: String(metadata.clientName || 'Client'),
                amount: Number(metadata.amount || 0),
                packageName: metadata.packageName ? String(metadata.packageName) : undefined,
                serviceName: metadata.serviceName ? String(metadata.serviceName) : undefined,
                paymentId: notification.payment_id,
              });
              success = result.success;
              if (!success) results.errors.push(result.error || 'Unknown error');
            }
            break;
          }

          default:
            console.log(`Unknown notification type: ${notification.type}`);
        }

        // Update notification status
        await supabase
          .from('ta_notifications')
          .update({
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : results.errors[results.errors.length - 1],
          })
          .eq('id', notification.id);

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        results.failed++;
        results.errors.push(String(error));

        await supabase
          .from('ta_notifications')
          .update({
            status: 'failed',
            error_message: String(error),
          })
          .eq('id', notification.id);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Unexpected error in notification processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get notification queue status
 */
export async function GET() {
  try {
    const { data: counts } = await supabase
      .from('ta_notifications')
      .select('status')
      .then(({ data }) => {
        const pending = data?.filter((n) => n.status === 'pending').length || 0;
        const sent = data?.filter((n) => n.status === 'sent').length || 0;
        const failed = data?.filter((n) => n.status === 'failed').length || 0;
        return { data: { pending, sent, failed } };
      });

    return NextResponse.json({
      queue: counts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}

/**
 * Helper to get booking data for email
 */
async function getBookingData(bookingId: string | null) {
  if (!bookingId) return null;

  const { data: booking } = await supabase
    .from('ta_bookings')
    .select(`
      scheduled_at,
      duration,
      ta_services(name),
      fc_clients(first_name, last_name, email),
      trainer_id
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) return null;

  // Get trainer info
  const { data: trainer } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', booking.trainer_id)
    .single();

  const client = booking.fc_clients as { first_name?: string; last_name?: string; email?: string } | null;
  const service = booking.ta_services as { name?: string } | null;

  return {
    clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client',
    trainerName: trainer ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer' : 'Your Trainer',
    serviceName: service?.name || 'Session',
    scheduledAt: booking.scheduled_at,
    duration: booking.duration,
  };
}
