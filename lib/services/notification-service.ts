/**
 * Notification Service
 *
 * Business logic for notification queue processing.
 * Extracted from api/notifications/send route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  sendBookingConfirmationEmail,
  sendReminderEmail,
  sendLowCreditsEmail,
  sendPaymentReceiptEmail,
} from '@/lib/notifications/email-service';

/**
 * Get booking data enriched with client, trainer, and service info for email templates.
 */
export async function getBookingNotificationData(bookingId: string | null): Promise<{
  clientName: string;
  trainerName: string;
  serviceName: string;
  scheduledAt: string;
  duration: number;
} | null> {
  if (!bookingId) return null;

  const supabase = createServiceRoleClient();

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

/**
 * Process pending notifications from the queue.
 */
export async function processNotificationQueue(
  batchSize: number = 10,
  type?: string
): Promise<{
  data: { processed: number; sent: number; failed: number; errors: string[] } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

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
      return { data: null, error: new Error('Failed to fetch notifications') };
    }

    if (!notifications || notifications.length === 0) {
      return { data: { processed: 0, sent: 0, failed: 0, errors: [] }, error: null };
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
            const data = await getBookingNotificationData(notification.booking_id);
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
            const data = await getBookingNotificationData(notification.booking_id);
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
            break;
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

    return { data: results, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get notification queue status counts.
 */
export async function getNotificationQueueStatus(): Promise<{
  data: { pending: number; sent: number; failed: number } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
      .from('ta_notifications')
      .select('status')
      .then(({ data }: { data: Array<{ status: string }> | null }) => {
        const pending = data?.filter((n: { status: string }) => n.status === 'pending').length || 0;
        const sent = data?.filter((n: { status: string }) => n.status === 'sent').length || 0;
        const failed = data?.filter((n: { status: string }) => n.status === 'failed').length || 0;
        return { data: { pending, sent, failed } };
      });

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
