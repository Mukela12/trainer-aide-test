// Email service using Resend API

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import {
  getBookingConfirmationEmail,
  getReminderEmail,
  getLowCreditsEmail,
  getPaymentReceiptEmail,
  getBookingRequestCreatedEmail,
  getBookingRequestAcceptedEmail,
  getBookingRequestDeclinedEmail,
} from './email-templates';

// Lazy initialization of Resend client to avoid build-time errors when API key is not set
let resendClient: Resend | null = null;

const getResendClient = (): Resend => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// Supabase service client for database operations
const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

const FROM_EMAIL = process.env.EMAIL_FROM || 'contact@fluxium.dev';
const FROM_NAME = process.env.FROM_NAME || 'AllWondrous';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send booking confirmation email to client
 */
export async function sendBookingConfirmationEmail(params: {
  clientEmail: string;
  clientName: string;
  trainerName: string;
  serviceName: string;
  scheduledAt: string | Date;
  duration?: number;
  bookingId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getBookingConfirmationEmail({
      clientName: params.clientName,
      trainerName: params.trainerName,
      serviceName: params.serviceName,
      scheduledAt: params.scheduledAt,
      duration: params.duration,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    // Log notification to database
    if (params.bookingId) {
      await logNotification({
        type: 'booking_confirmation',
        recipientEmail: params.clientEmail,
        bookingId: params.bookingId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send reminder email to client
 */
export async function sendReminderEmail(params: {
  clientEmail: string;
  clientName: string;
  trainerName: string;
  serviceName: string;
  scheduledAt: string | Date;
  hours: number; // 24 or 2
  bookingId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getReminderEmail(
      {
        clientName: params.clientName,
        trainerName: params.trainerName,
        serviceName: params.serviceName,
        scheduledAt: params.scheduledAt,
      },
      params.hours
    );

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (params.bookingId) {
      await logNotification({
        type: params.hours === 24 ? 'reminder_24h' : 'reminder_2h',
        recipientEmail: params.clientEmail,
        bookingId: params.bookingId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending reminder:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send low credits alert to client
 */
export async function sendLowCreditsEmail(params: {
  clientEmail: string;
  clientName: string;
  creditsRemaining: number;
  trainerName: string;
  bookingLink?: string;
  clientId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getLowCreditsEmail({
      clientName: params.clientName,
      creditsRemaining: params.creditsRemaining,
      trainerName: params.trainerName,
      bookingLink: params.bookingLink,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (params.clientId) {
      await logNotification({
        type: 'low_credits',
        recipientEmail: params.clientEmail,
        clientId: params.clientId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending low credits alert:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send payment receipt to client
 */
export async function sendPaymentReceiptEmail(params: {
  clientEmail: string;
  clientName: string;
  amount: number; // in cents
  packageName?: string;
  serviceName?: string;
  paymentId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getPaymentReceiptEmail({
      clientName: params.clientName,
      amount: params.amount,
      packageName: params.packageName,
      serviceName: params.serviceName,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (params.paymentId) {
      await logNotification({
        type: 'payment_receipt',
        recipientEmail: params.clientEmail,
        paymentId: params.paymentId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send booking request created email to trainer
 */
export async function sendBookingRequestCreatedEmail(params: {
  trainerEmail: string;
  trainerName: string;
  clientName: string;
  serviceName?: string;
  preferredTimes: string[];
  notes?: string;
  requestId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getBookingRequestCreatedEmail({
      clientName: params.clientName,
      trainerName: params.trainerName,
      serviceName: params.serviceName,
      preferredTimes: params.preferredTimes,
      notes: params.notes,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.trainerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_created',
        recipientEmail: params.trainerEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending booking request created email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send booking request accepted email to client
 */
export async function sendBookingRequestAcceptedEmail(params: {
  clientEmail: string;
  clientName: string;
  trainerName: string;
  serviceName?: string;
  acceptedTime: string | Date;
  requestId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getBookingRequestAcceptedEmail({
      clientName: params.clientName,
      trainerName: params.trainerName,
      serviceName: params.serviceName,
      acceptedTime: params.acceptedTime,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_accepted',
        recipientEmail: params.clientEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending booking request accepted email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send booking request declined email to client
 */
export async function sendBookingRequestDeclinedEmail(params: {
  clientEmail: string;
  clientName: string;
  trainerName: string;
  serviceName?: string;
  requestId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getBookingRequestDeclinedEmail({
      clientName: params.clientName,
      trainerName: params.trainerName,
      serviceName: params.serviceName,
    });

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_declined',
        recipientEmail: params.clientEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending booking request declined email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send invitation email to new trainer/staff
 */
export async function sendInvitationEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  studioName?: string;
  role: string;
  inviteUrl: string;
  message?: string;
  invitationId?: string;
}): Promise<SendEmailResult> {
  try {
    const subject = `${params.inviterName} invited you to join ${params.studioName || 'allwondrous'}`;
    const displayName = params.recipientName || 'there';
    const roleDisplay = params.role.replace('_', ' ');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #12229D, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .cta { display: inline-block; background: #12229D; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hi ${displayName},</p>
      <p><strong>${params.inviterName}</strong> has invited you to join ${params.studioName ? `<strong>${params.studioName}</strong>` : 'their team'} as a <strong>${roleDisplay}</strong>.</p>
      ${params.message ? `<p style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #12229D; font-style: italic;">"${params.message}"</p>` : ''}
      <p style="text-align: center;">
        <a href="${params.inviteUrl}" class="cta">Accept Invitation</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">This invitation will expire in 7 days.</p>
    </div>
    <div class="footer">
      Powered by allwondrous
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Hi ${displayName},

${params.inviterName} has invited you to join ${params.studioName || 'their team'} as a ${roleDisplay}.

${params.message ? `Message: "${params.message}"` : ''}

Accept your invitation: ${params.inviteUrl}

This invitation will expire in 7 days.

—
Powered by allwondrous
    `.trim();

    const { data, error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.recipientEmail,
      subject,
      html,
      text,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (params.invitationId) {
      await logNotification({
        type: 'invitation',
        recipientEmail: params.recipientEmail,
        invitationId: params.invitationId,
        status: 'sent',
        messageId: data?.id,
      });
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending invitation:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Log notification to database for tracking
 */
async function logNotification(params: {
  type: string;
  recipientEmail: string;
  bookingId?: string;
  clientId?: string;
  paymentId?: string;
  invitationId?: string;
  status: 'pending' | 'sent' | 'failed';
  messageId?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('ta_notifications').insert({
      type: params.type,
      recipient_email: params.recipientEmail,
      booking_id: params.bookingId,
      client_id: params.clientId,
      payment_id: params.paymentId,
      invitation_id: params.invitationId,
      status: params.status,
      message_id: params.messageId,
      error_message: params.errorMessage,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Queue a notification for later processing
 */
export async function queueNotification(params: {
  type: string;
  recipientEmail: string;
  bookingId?: string;
  clientId?: string;
  scheduledFor?: Date;
  templateData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('ta_notifications').insert({
      type: params.type,
      channel: 'email',
      recipient_email: params.recipientEmail,
      booking_id: params.bookingId,
      client_id: params.clientId,
      status: 'pending',
      scheduled_for: params.scheduledFor?.toISOString(),
      template_data: params.templateData || {},
    });
  } catch (error) {
    console.error('Error queuing notification:', error);
  }
}
