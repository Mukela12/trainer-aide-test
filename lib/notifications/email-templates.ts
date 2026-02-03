// Email templates for various notification types
// Brand colors: Primary Magenta #A71075, Dark Blue #0A1466, Brand Blue #12229D,
// Blue Light #E8EAFF, Orange #F4B324, Grey Dark #272030, Grey Light #D7D7DB, Cyan #B8E6F0
//
// LOGO HANDLING:
// - Logos are hosted on Cloudinary CDN for reliable email delivery
// - Always use HTTPS URLs
// - Include alt text as fallback when images are blocked
// - PNG format for widest email client compatibility

import { format } from 'date-fns';

/**
 * Branding options for email templates
 * Allows studios to customize their email appearance
 */
interface EmailBranding {
  logoUrl?: string | null;
  businessName?: string | null;
}

interface BookingData {
  clientName: string;
  trainerName: string;
  serviceName: string;
  scheduledAt: string | Date;
  duration?: number;
  branding?: EmailBranding;
}

interface PaymentData {
  clientName: string;
  amount: number;
  packageName?: string;
  serviceName?: string;
  branding?: EmailBranding;
}

interface CreditData {
  clientName: string;
  creditsRemaining: number;
  expiresAt?: string | Date;
  trainerName: string;
  bookingLink?: string;
  branding?: EmailBranding;
}

// Shared base styles for all email templates
const baseStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #272030; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { background: #A71075; color: #ffffff; padding: 32px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header-with-logo { background: #ffffff; padding: 24px 32px; border-radius: 12px 12px 0 0; border: 1px solid #D7D7DB; border-bottom: none; text-align: center; }
    .logo { max-width: 150px; max-height: 60px; width: auto; height: auto; }
    .content { background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #D7D7DB; border-top: none; }
    .content-with-logo { border-top: 1px solid #D7D7DB; border-radius: 0 0 12px 12px; }
    .content p { margin: 0 0 16px 0; color: #272030; }
    .detail-card { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #D7D7DB; }
    .detail { margin: 16px 0; padding: 12px 0; border-bottom: 1px solid #D7D7DB; }
    .detail:first-child { margin-top: 0; padding-top: 0; }
    .detail:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .label { color: #6b7280; font-size: 13px; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 600; color: #272030; }
    .cta { display: inline-block; background: #A71075; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; padding: 24px; margin-top: 24px; font-size: 13px; color: #6b7280; }
    .note { background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #12229D; margin: 20px 0; }
`;

/**
 * Generate email header HTML with optional logo
 * Uses hosted Cloudinary URL for reliable email image delivery
 *
 * Best practices followed:
 * - HTTPS URL for security
 * - Alt text fallback if image is blocked
 * - Max dimensions to prevent layout issues
 * - Centered alignment for logos
 */
function getEmailHeader(title: string, branding?: EmailBranding): string {
  const logoUrl = branding?.logoUrl;
  const businessName = branding?.businessName || 'AllWondrous';

  if (logoUrl) {
    // Header with logo - white background to showcase logo
    return `
    <div class="header-with-logo">
      <img src="${logoUrl}" alt="${businessName}" class="logo" style="max-width: 150px; max-height: 60px; width: auto; height: auto;" />
    </div>
    <div class="header" style="border-radius: 0;">
      <h1>${title}</h1>
    </div>`;
  }

  // Standard header without logo
  return `
    <div class="header">
      <h1>${title}</h1>
    </div>`;
}

/**
 * Get the footer text, showing business name if branded
 */
function getFooterText(branding?: EmailBranding): string {
  if (branding?.businessName) {
    return `${branding.businessName} | Powered by AllWondrous`;
  }
  return 'Powered by AllWondrous';
}

export function getBookingConfirmationEmail(data: BookingData) {
  const scheduledDate = new Date(data.scheduledAt);
  const dateStr = format(scheduledDate, 'EEEE, MMMM d, yyyy');
  const timeStr = format(scheduledDate, 'h:mm a');
  const footerText = getFooterText(data.branding);

  return {
    subject: `Booking Confirmed: ${data.serviceName} on ${dateStr}`,
    text: `
Hi ${data.clientName},

Your session has been confirmed!

${data.serviceName}
Date: ${dateStr}
Time: ${timeStr}
${data.duration ? `Duration: ${data.duration} minutes` : ''}
Trainer: ${data.trainerName}

See you then!

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Booking Confirmed', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Your session has been confirmed!</p>

      <div class="detail-card">
        <div class="detail">
          <div class="label">Service</div>
          <div class="value">${data.serviceName}</div>
        </div>
        <div class="detail">
          <div class="label">Date</div>
          <div class="value">${dateStr}</div>
        </div>
        <div class="detail">
          <div class="label">Time</div>
          <div class="value">${timeStr}</div>
        </div>
        ${data.duration ? `<div class="detail"><div class="label">Duration</div><div class="value">${data.duration} minutes</div></div>` : ''}
        <div class="detail">
          <div class="label">Trainer</div>
          <div class="value">${data.trainerName}</div>
        </div>
      </div>

      <p>See you then!</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getReminderEmail(data: BookingData, hours: number) {
  const scheduledDate = new Date(data.scheduledAt);
  const dateStr = format(scheduledDate, 'EEEE, MMMM d');
  const timeStr = format(scheduledDate, 'h:mm a');
  const timeText = hours === 24 ? 'tomorrow' : 'in 2 hours';
  const footerText = getFooterText(data.branding);

  return {
    subject: `Reminder: ${data.serviceName} ${timeText}`,
    text: `
Hi ${data.clientName},

This is a reminder that your session is ${timeText}.

${data.serviceName}
${dateStr} at ${timeStr}
With ${data.trainerName}

See you soon!

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Session Reminder', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Your session is <strong style="color: #0A1466;">${timeText}</strong>.</p>

      <div class="detail-card">
        <div class="detail">
          <div class="value" style="font-size: 18px;">${data.serviceName}</div>
        </div>
        <div class="detail">
          <div class="label">When</div>
          <div class="value">${dateStr} at ${timeStr}</div>
        </div>
        <div class="detail">
          <div class="label">Trainer</div>
          <div class="value">${data.trainerName}</div>
        </div>
      </div>

      <p>See you soon!</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getLowCreditsEmail(data: CreditData) {
  const footerText = getFooterText(data.branding);

  return {
    subject: `Low Credits: Only ${data.creditsRemaining} session${data.creditsRemaining !== 1 ? 's' : ''} remaining`,
    text: `
Hi ${data.clientName},

You have ${data.creditsRemaining} session credit${data.creditsRemaining !== 1 ? 's' : ''} remaining.

To continue training with ${data.trainerName}, purchase a new package.

${data.bookingLink ? `Book now: ${data.bookingLink}` : ''}

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}
    .alert-badge { display: inline-block; background: #F4B324; color: #272030; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Low Credits Alert', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>

      <div style="text-align: center; margin: 24px 0;">
        <span class="alert-badge">${data.creditsRemaining} session${data.creditsRemaining !== 1 ? 's' : ''} remaining</span>
      </div>

      <p>To continue training with <strong>${data.trainerName}</strong>, purchase a new package.</p>

      ${data.bookingLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.bookingLink}" class="cta">Buy More Sessions</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

interface BookingRequestData {
  clientName: string;
  trainerName: string;
  serviceName?: string;
  preferredTimes: string[];
  notes?: string;
  branding?: EmailBranding;
}

interface BookingRequestAcceptedData {
  clientName: string;
  trainerName: string;
  serviceName?: string;
  acceptedTime: string | Date;
  branding?: EmailBranding;
}

interface BookingRequestDeclinedData {
  clientName: string;
  trainerName: string;
  serviceName?: string;
  branding?: EmailBranding;
}

export function getBookingRequestCreatedEmail(data: BookingRequestData) {
  const timesHtml = data.preferredTimes
    .map((t) => `<li style="margin: 8px 0; color: #272030;">${format(new Date(t), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}</li>`)
    .join('');
  const timesText = data.preferredTimes
    .map((t) => `  - ${format(new Date(t), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`)
    .join('\n');
  const footerText = getFooterText(data.branding);

  return {
    subject: `New Booking Request from ${data.clientName}`,
    text: `
Hi ${data.trainerName},

You have a new booking request from ${data.clientName}.

${data.serviceName ? `Service: ${data.serviceName}` : ''}

Preferred times:
${timesText}

${data.notes ? `Notes: ${data.notes}` : ''}

Log in to accept or decline this request.

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('New Booking Request', data.branding)}
    <div class="content">
      <p>Hi ${data.trainerName},</p>
      <p>You have a new booking request from <strong style="color: #0A1466;">${data.clientName}</strong>.</p>

      ${data.serviceName ? `<p><strong>Service:</strong> ${data.serviceName}</p>` : ''}

      <div class="detail-card">
        <div class="label" style="margin-bottom: 12px;">Preferred times:</div>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">${timesHtml}</ul>
      </div>

      ${data.notes ? `
      <div class="note">
        <div class="label" style="margin-bottom: 8px;">Notes from client:</div>
        <div style="color: #272030;">${data.notes}</div>
      </div>
      ` : ''}

      <p>Log in to accept or decline this request.</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getBookingRequestAcceptedEmail(data: BookingRequestAcceptedData) {
  const scheduledDate = new Date(data.acceptedTime);
  const dateStr = format(scheduledDate, 'EEEE, MMMM d, yyyy');
  const timeStr = format(scheduledDate, 'h:mm a');
  const footerText = getFooterText(data.branding);

  return {
    subject: `Booking Request Accepted - ${dateStr}`,
    text: `
Hi ${data.clientName},

Great news! Your booking request has been accepted.

${data.serviceName ? `Service: ${data.serviceName}` : ''}
Date: ${dateStr}
Time: ${timeStr}
Trainer: ${data.trainerName}

See you then!

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}
    .success-icon { display: inline-block; width: 48px; height: 48px; background: #B8E6F0; border-radius: 50%; line-height: 48px; text-align: center; font-size: 24px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Booking Confirmed!', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Great news! Your booking request has been accepted.</p>

      <div class="detail-card">
        ${data.serviceName ? `<div class="detail"><div class="label">Service</div><div class="value">${data.serviceName}</div></div>` : ''}
        <div class="detail">
          <div class="label">Date</div>
          <div class="value">${dateStr}</div>
        </div>
        <div class="detail">
          <div class="label">Time</div>
          <div class="value">${timeStr}</div>
        </div>
        <div class="detail">
          <div class="label">Trainer</div>
          <div class="value">${data.trainerName}</div>
        </div>
      </div>

      <p>See you then!</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getBookingRequestDeclinedEmail(data: BookingRequestDeclinedData) {
  const footerText = getFooterText(data.branding);

  return {
    subject: 'Booking Request Update',
    text: `
Hi ${data.clientName},

Unfortunately, ${data.trainerName} was unable to accommodate your booking request${data.serviceName ? ` for ${data.serviceName}` : ''} at the requested times.

Please try booking a different time, or contact your trainer directly.

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Booking Request Update', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Unfortunately, <strong>${data.trainerName}</strong> was unable to accommodate your booking request${data.serviceName ? ` for <strong>${data.serviceName}</strong>` : ''} at the requested times.</p>

      <div class="note">
        <p style="margin: 0;">Please try booking a different time, or contact your trainer directly.</p>
      </div>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

interface ClientInvitationData {
  recipientName?: string;
  inviterName: string;
  studioName?: string;
  inviteUrl: string;
  message?: string;
  branding?: EmailBranding;
}

export function getClientInvitationEmail(data: ClientInvitationData) {
  const displayName = data.recipientName || 'there';
  const studioDisplay = data.studioName || 'your trainer';
  const footerText = getFooterText(data.branding);

  return {
    subject: `${data.inviterName} invited you to join ${data.studioName || 'AllWondrous'}`,
    text: `
Hi ${displayName},

${data.inviterName} has invited you to join ${studioDisplay} as a client.

${data.message ? `Message from your trainer: "${data.message}"` : ''}

Click here to accept and create your account: ${data.inviteUrl}

This invitation will expire in 7 days.

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}
    .welcome-badge { display: inline-block; background: #B8E6F0; color: #0A1466; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('You are Invited!', data.branding)}
    <div class="content">
      <p>Hi ${displayName},</p>

      <div style="text-align: center; margin: 24px 0;">
        <span class="welcome-badge">New Client Invitation</span>
      </div>

      <p><strong style="color: #0A1466;">${data.inviterName}</strong> has invited you to join ${data.studioName ? `<strong>${data.studioName}</strong>` : 'their training platform'} as a client.</p>

      ${data.message ? `
      <div class="note">
        <div class="label" style="margin-bottom: 8px;">Message from your trainer:</div>
        <div style="color: #272030; font-style: italic;">"${data.message}"</div>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.inviteUrl}" class="cta">Accept Invitation</a>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center;">This invitation will expire in 7 days.</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getPaymentReceiptEmail(data: PaymentData) {
  const footerText = getFooterText(data.branding);

  return {
    subject: `Payment Receipt: £${(data.amount / 100).toFixed(2)}`,
    text: `
Hi ${data.clientName},

Thank you for your payment!

Amount: £${(data.amount / 100).toFixed(2)}
${data.packageName ? `Package: ${data.packageName}` : ''}
${data.serviceName ? `Service: ${data.serviceName}` : ''}

This is your receipt for your records.

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}
    .amount { font-size: 36px; font-weight: 700; color: #0A1466; margin: 24px 0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader('Payment Receipt', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Thank you for your payment!</p>

      <div class="amount">£${(data.amount / 100).toFixed(2)}</div>

      <div class="detail-card">
        ${data.packageName ? `<div class="detail"><div class="label">Package</div><div class="value">${data.packageName}</div></div>` : ''}
        ${data.serviceName ? `<div class="detail"><div class="label">Service</div><div class="value">${data.serviceName}</div></div>` : ''}
        ${!data.packageName && !data.serviceName ? '<div class="detail"><div class="value">Payment received</div></div>' : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">This is your receipt for your records.</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

interface CustomEmailData {
  recipientName: string;
  senderName: string;
  studioName: string;
  subject: string;
  message: string;
  branding?: EmailBranding;
}

export function getCustomEmail(data: CustomEmailData) {
  // Convert newlines to HTML breaks for the HTML version
  const htmlMessage = data.message
    .split('\n')
    .map(line => line.trim() === '' ? '<br>' : `<p style="margin: 0 0 12px 0;">${line}</p>`)
    .join('');

  const footerText = getFooterText(data.branding);

  return {
    subject: data.subject,
    text: `
Hi ${data.recipientName},

${data.message}

Best regards,
${data.senderName}
${data.studioName}

—
${footerText}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    ${getEmailHeader(data.studioName, data.branding)}
    <div class="content">
      <p>Hi ${data.recipientName},</p>

      <div style="margin: 24px 0;">
        ${htmlMessage}
      </div>

      <p style="margin-top: 32px; margin-bottom: 4px;">Best regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0A1466;">${data.senderName}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">${data.studioName}</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
