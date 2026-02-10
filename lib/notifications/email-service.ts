// Email service using Elastic Email REST API

import { createClient } from '@supabase/supabase-js';
import {
  getBookingConfirmationEmail,
  getReminderEmail,
  getLowCreditsEmail,
  getPaymentReceiptEmail,
  getBookingRequestCreatedEmail,
  getBookingRequestAcceptedEmail,
  getBookingRequestDeclinedEmail,
  getClientInvitationEmail,
  getCustomEmail,
} from './email-templates';

const ELASTIC_EMAIL_API_URL = 'https://api.elasticemail.com/v4/emails/transactional';

const getApiKey = (): string => {
  const key = process.env.ELASTIC_EMAIL_API_KEY;
  if (!key) {
    throw new Error('ELASTIC_EMAIL_API_KEY environment variable is not set');
  }
  return key;
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
 * Send an email via Elastic Email REST API
 */
async function sendViaElasticEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId?: string; error?: string }> {
  const response = await fetch(ELASTIC_EMAIL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ElasticEmail-ApiKey': getApiKey(),
    },
    body: JSON.stringify({
      Recipients: {
        To: [params.to],
      },
      Content: {
        From: `${FROM_NAME} <${FROM_EMAIL}>`,
        Subject: params.subject,
        Body: [
          {
            ContentType: 'HTML',
            Charset: 'utf-8',
            Content: params.html,
          },
          {
            ContentType: 'PlainText',
            Charset: 'utf-8',
            Content: params.text,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Elastic Email error:', response.status, errorText);
    return { error: `Elastic Email API error (${response.status}): ${errorText}` };
  }

  const data = await response.json();
  return { messageId: data?.TransactionID || data?.MessageID || JSON.stringify(data) };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.bookingId) {
      await logNotification({
        type: 'booking_confirmation',
        recipientEmail: params.clientEmail,
        bookingId: params.bookingId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.bookingId) {
      await logNotification({
        type: params.hours === 24 ? 'reminder_24h' : 'reminder_2h',
        recipientEmail: params.clientEmail,
        bookingId: params.bookingId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.clientId) {
      await logNotification({
        type: 'low_credits',
        recipientEmail: params.clientEmail,
        clientId: params.clientId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.paymentId) {
      await logNotification({
        type: 'payment_receipt',
        recipientEmail: params.clientEmail,
        paymentId: params.paymentId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.trainerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_created',
        recipientEmail: params.trainerEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_accepted',
        recipientEmail: params.clientEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
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

    const result = await sendViaElasticEmail({
      to: params.clientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.requestId) {
      await logNotification({
        type: 'booking_request_declined',
        recipientEmail: params.clientEmail,
        bookingId: params.requestId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending booking request declined email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send client invitation email
 */
export async function sendClientInvitationEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  studioName?: string;
  inviteUrl: string;
  message?: string;
  invitationId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getClientInvitationEmail({
      recipientName: params.recipientName,
      inviterName: params.inviterName,
      studioName: params.studioName,
      inviteUrl: params.inviteUrl,
      message: params.message,
    });

    const result = await sendViaElasticEmail({
      to: params.recipientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.invitationId) {
      await logNotification({
        type: 'client_invitation',
        recipientEmail: params.recipientEmail,
        invitationId: params.invitationId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending client invitation email:', error);
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

    const result = await sendViaElasticEmail({
      to: params.recipientEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.invitationId) {
      await logNotification({
        type: 'invitation',
        recipientEmail: params.recipientEmail,
        invitationId: params.invitationId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending invitation:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send custom email from trainer/studio owner to client
 */
export async function sendCustomEmail(params: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  studioName: string;
  subject: string;
  message: string;
  clientId?: string;
}): Promise<SendEmailResult> {
  try {
    const email = getCustomEmail({
      recipientName: params.recipientName,
      senderName: params.senderName,
      studioName: params.studioName,
      subject: params.subject,
      message: params.message,
    });

    const result = await sendViaElasticEmail({
      to: params.recipientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (params.clientId) {
      await logNotification({
        type: 'custom_email',
        recipientEmail: params.recipientEmail,
        clientId: params.clientId,
        status: 'sent',
        messageId: result.messageId,
      });
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending custom email:', error);
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
