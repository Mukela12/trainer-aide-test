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
  const formatTime = (t: string) => {
    const d = new Date(t);
    return isNaN(d.getTime()) ? t : format(d, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  };
  const timesHtml = data.preferredTimes
    .map((t) => `<li style="margin: 8px 0; color: #272030;">${formatTime(t)}</li>`)
    .join('');
  const timesText = data.preferredTimes
    .map((t) => `  - ${formatTime(t)}`)
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

/**
 * Reschedule notification email template
 */
export function getRescheduleEmail(data: {
  clientName: string;
  trainerName: string;
  serviceName: string;
  oldTime: string | Date;
  newTime: string | Date;
  branding?: EmailBranding;
}): { subject: string; html: string; text: string } {
  const oldFormatted = format(new Date(data.oldTime), 'EEEE d MMMM yyyy \'at\' HH:mm');
  const newFormatted = format(new Date(data.newTime), 'EEEE d MMMM yyyy \'at\' HH:mm');
  const footerText = data.branding?.businessName
    ? `Powered by ${data.branding.businessName} &amp; AllWondrous`
    : 'Powered by AllWondrous';

  return {
    subject: `Your session has been rescheduled — ${data.serviceName}`,
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
    ${getEmailHeader('Session Rescheduled', data.branding)}
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Your session has been rescheduled by <strong>${data.trainerName}</strong>.</p>

      <div class="detail-card">
        <div class="detail">
          <div class="label">Service</div>
          <div class="value">${data.serviceName}</div>
        </div>
        <div class="detail">
          <div class="label">Previous Time</div>
          <div class="value" style="text-decoration: line-through; color: #9CA3AF;">${oldFormatted}</div>
        </div>
        <div class="detail">
          <div class="label">New Time</div>
          <div class="value" style="color: #A71075;">${newFormatted}</div>
        </div>
        <div class="detail">
          <div class="label">Trainer</div>
          <div class="value">${data.trainerName}</div>
        </div>
      </div>

      <p>If this time doesn't work for you, please contact your trainer to arrange an alternative.</p>
    </div>
    <div class="footer">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `Hi ${data.clientName},\n\nYour ${data.serviceName} session with ${data.trainerName} has been rescheduled.\n\nPrevious: ${oldFormatted}\nNew: ${newFormatted}\n\nIf this doesn't work for you, please contact your trainer.\n\n—\n${data.branding?.businessName || 'AllWondrous'}`,
  };
}

/**
 * Soft Hold Email - Sent when a trainer creates a soft hold for a client who lacks credits
 */
interface SoftHoldData {
  clientName: string;
  trainerName: string;
  serviceName: string;
  sessionDatetime: string | Date;
  creditsRequired: number;
  holdExpiry: string | Date;
  topUpLink?: string;
  branding?: EmailBranding;
}

export function generateSoftHoldEmail(data: SoftHoldData): { subject: string; html: string; text: string } {
  const sessionDate = new Date(data.sessionDatetime);
  const expiryDate = new Date(data.holdExpiry);
  const sessionDateStr = format(sessionDate, 'EEEE, MMMM d, yyyy');
  const sessionTimeStr = format(sessionDate, 'HH:mm');
  const expiryTimeStr = format(expiryDate, "h:mm a 'on' EEEE");
  const holdHours = Math.max(1, Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)));
  const holdDurationText = holdHours === 1 ? '1 hour' : `${holdHours} hours`;
  const footerText = data.branding?.businessName
    ? `Powered by ${data.branding.businessName}`
    : 'Powered by allWondrous';

  const topUpUrl = data.topUpLink || '#';
  const businessName = data.branding?.businessName || '';
  const logoUrl = data.branding?.logoUrl;

  return {
    subject: `Your spot is held — complete booking by ${format(expiryDate, "h a 'tomorrow'")}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #272030; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      ${logoUrl ? `
      <div style="padding: 20px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
        <img src="${logoUrl}" alt="${businessName}" style="max-width: 140px; max-height: 50px; width: auto; height: auto;" />
      </div>
      ` : ''}

      <!-- Hero Section -->
      <div style="text-align: center; padding: 32px 24px 24px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: #FFF3E0; border-radius: 50%; line-height: 56px; text-align: center; margin-bottom: 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; color: #272030; margin: 0 0 6px;">Your spot is held!</h1>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">Complete your booking within <strong style="color: #272030;">${holdDurationText}</strong></p>
      </div>

      <!-- Body -->
      <div style="padding: 0 24px 24px;">
        <p style="margin: 0 0 20px; font-size: 15px;">Hi ${data.clientName},</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563;">Your trainer has reserved a spot for you. You don't have enough credits to confirm it automatically, so we're holding it for <strong>${holdDurationText}</strong>.</p>

        <!-- Session Details Card -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #272030; margin: 0 0 14px;">${data.serviceName}</h2>
          <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; vertical-align: top; width: 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </td>
              <td style="padding: 5px 0; color: #272030;">${sessionDateStr}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; vertical-align: top; width: 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </td>
              <td style="padding: 5px 0; color: #272030;">${sessionTimeStr}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; vertical-align: top; width: 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </td>
              <td style="padding: 5px 0; color: #272030;">with ${data.trainerName}</td>
            </tr>
            ${businessName ? `
            <tr>
              <td style="padding: 5px 0; vertical-align: top; width: 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </td>
              <td style="padding: 5px 0; color: #272030;">${businessName}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Deadline Warning -->
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 16px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 13px; color: #DC2626; font-weight: 600;">Spot released at ${expiryTimeStr} if unpaid</span>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${topUpUrl}" style="display: inline-block; background: #16A34A; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Top Up Credits &amp; Confirm →
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 0;">Questions? Reply to this email or contact ${data.trainerName} directly.</p>
      </div>
    </div>

    <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
      ${footerText}
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `Hi ${data.clientName},\n\nYour spot is held! Complete your booking within ${holdDurationText}.\n\nYour trainer has reserved a spot for you. You don't have enough credits to confirm it automatically, so we're holding it for ${holdDurationText}.\n\n${data.serviceName}\nDate: ${sessionDateStr}\nTime: ${sessionTimeStr}\nTrainer: ${data.trainerName}\n\nSpot released at ${expiryTimeStr} if unpaid.\n\nTop up your credits to confirm your session.\n\nQuestions? Reply to this email or contact ${data.trainerName} directly.\n\n—\n${data.branding?.businessName || 'allWondrous'}`,
  };
}
