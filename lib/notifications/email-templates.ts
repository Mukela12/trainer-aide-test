// Email templates for various notification types

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
Powered by allwondrous
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #12229D, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .detail { margin: 10px 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-size: 18px; font-weight: 600; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Booking Confirmed</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Your session has been confirmed!</p>

      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
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
        <div class="detail">
          <div class="label">Trainer</div>
          <div class="value">${data.trainerName}</div>
        </div>
      </div>

      <p>See you then!</p>
    </div>
    <div class="footer">
      Powered by allwondrous
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
Powered by allwondrous
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Session Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Your session is <strong>${timeText}</strong>.</p>

      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px; font-weight: 600;">${data.serviceName}</p>
        <p style="margin: 5px 0; color: #6b7280;">${dateStr} at ${timeStr}</p>
        <p style="margin: 0; color: #6b7280;">With ${data.trainerName}</p>
      </div>

      <p>See you soon!</p>
    </div>
    <div class="footer">
      Powered by allwondrous
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
Powered by allwondrous
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .cta { display: inline-block; background: #12229D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Low Credits Alert</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>You have <strong>${data.creditsRemaining} session credit${data.creditsRemaining !== 1 ? 's' : ''}</strong> remaining.</p>
      <p>To continue training with ${data.trainerName}, purchase a new package.</p>
      ${data.bookingLink ? `<p><a href="${data.bookingLink}" class="cta">Buy More Sessions</a></p>` : ''}
    </div>
    <div class="footer">
      Powered by allwondrous
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
Powered by allwondrous
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
    .amount { font-size: 32px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Payment Receipt</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>Thank you for your payment!</p>

      <div class="amount">£${(data.amount / 100).toFixed(2)}</div>

      ${data.packageName ? `<p><strong>Package:</strong> ${data.packageName}</p>` : ''}
      ${data.serviceName ? `<p><strong>Service:</strong> ${data.serviceName}</p>` : ''}

      <p style="color: #6b7280; font-size: 14px;">This is your receipt for your records.</p>
    </div>
    <div class="footer">
      Powered by allwondrous
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
