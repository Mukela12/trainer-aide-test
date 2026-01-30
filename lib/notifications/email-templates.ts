// Email templates for various notification types
// Brand colors: Primary Magenta #A71075, Dark Blue #0A1466, Brand Blue #12229D,
// Blue Light #E8EAFF, Orange #F4B324, Grey Dark #272030, Grey Light #D7D7DB, Cyan #B8E6F0

import { format } from 'date-fns';

interface BookingData {
  clientName: string;
  trainerName: string;
  serviceName: string;
  scheduledAt: string | Date;
  duration?: number;
}

interface PaymentData {
  clientName: string;
  amount: number;
  packageName?: string;
  serviceName?: string;
}

interface CreditData {
  clientName: string;
  creditsRemaining: number;
  expiresAt?: string | Date;
  trainerName: string;
  bookingLink?: string;
}

// Shared base styles for all email templates
const baseStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #272030; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { background: #A71075; color: #ffffff; padding: 32px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #D7D7DB; border-top: none; }
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

export function getBookingConfirmationEmail(data: BookingData) {
  const scheduledDate = new Date(data.scheduledAt);
  const dateStr = format(scheduledDate, 'EEEE, MMMM d, yyyy');
  const timeStr = format(scheduledDate, 'h:mm a');

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
Powered by AllWondrous
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
    <div class="header">
      <h1>Booking Confirmed</h1>
    </div>
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
      Powered by AllWondrous
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
Powered by AllWondrous
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
    <div class="header">
      <h1>Session Reminder</h1>
    </div>
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
      Powered by AllWondrous
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getLowCreditsEmail(data: CreditData) {
  return {
    subject: `Low Credits: Only ${data.creditsRemaining} session${data.creditsRemaining !== 1 ? 's' : ''} remaining`,
    text: `
Hi ${data.clientName},

You have ${data.creditsRemaining} session credit${data.creditsRemaining !== 1 ? 's' : ''} remaining.

To continue training with ${data.trainerName}, purchase a new package.

${data.bookingLink ? `Book now: ${data.bookingLink}` : ''}

—
Powered by AllWondrous
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
    <div class="header">
      <h1>Low Credits Alert</h1>
    </div>
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
      Powered by AllWondrous
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
}

interface BookingRequestAcceptedData {
  clientName: string;
  trainerName: string;
  serviceName?: string;
  acceptedTime: string | Date;
}

interface BookingRequestDeclinedData {
  clientName: string;
  trainerName: string;
  serviceName?: string;
}

export function getBookingRequestCreatedEmail(data: BookingRequestData) {
  const timesHtml = data.preferredTimes
    .map((t) => `<li style="margin: 8px 0; color: #272030;">${format(new Date(t), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}</li>`)
    .join('');
  const timesText = data.preferredTimes
    .map((t) => `  - ${format(new Date(t), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`)
    .join('\n');

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
Powered by AllWondrous
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
    <div class="header">
      <h1>New Booking Request</h1>
    </div>
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
      Powered by AllWondrous
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
Powered by AllWondrous
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
    <div class="header">
      <h1>Booking Confirmed!</h1>
    </div>
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
      Powered by AllWondrous
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getBookingRequestDeclinedEmail(data: BookingRequestDeclinedData) {
  return {
    subject: 'Booking Request Update',
    text: `
Hi ${data.clientName},

Unfortunately, ${data.trainerName} was unable to accommodate your booking request${data.serviceName ? ` for ${data.serviceName}` : ''} at the requested times.

Please try booking a different time, or contact your trainer directly.

—
Powered by AllWondrous
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
    <div class="header">
      <h1>Booking Request Update</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Unfortunately, <strong>${data.trainerName}</strong> was unable to accommodate your booking request${data.serviceName ? ` for <strong>${data.serviceName}</strong>` : ''} at the requested times.</p>

      <div class="note">
        <p style="margin: 0;">Please try booking a different time, or contact your trainer directly.</p>
      </div>
    </div>
    <div class="footer">
      Powered by AllWondrous
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function getPaymentReceiptEmail(data: PaymentData) {
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
Powered by AllWondrous
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
    <div class="header">
      <h1>Payment Receipt</h1>
    </div>
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
      Powered by AllWondrous
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
