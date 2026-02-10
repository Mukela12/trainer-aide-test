import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmationEmail,
  sendReminderEmail,
  sendLowCreditsEmail,
  sendPaymentReceiptEmail,
  sendBookingRequestCreatedEmail,
  sendBookingRequestAcceptedEmail,
  sendBookingRequestDeclinedEmail,
  sendClientInvitationEmail,
  sendInvitationEmail,
  sendCustomEmail,
} from '@/lib/notifications/email-service';

/**
 * POST /api/test/emails
 * Tests all 10 email template types via Elastic Email
 * Body: { "to": "recipient@example.com" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing "to" email address in request body' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const results: Record<string, { success: boolean; messageId?: string; error?: string }> = {};

    // 1. Booking Confirmation
    results['booking_confirmation'] = await sendBookingConfirmationEmail({
      clientEmail: to,
      clientName: 'Test Client',
      trainerName: 'Coach Smith',
      serviceName: 'Personal Training Session',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      duration: 60,
    });

    // 2. Reminder (24h)
    results['reminder_24h'] = await sendReminderEmail({
      clientEmail: to,
      clientName: 'Test Client',
      trainerName: 'Coach Smith',
      serviceName: 'Personal Training Session',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      hours: 24,
    });

    // 3. Reminder (2h)
    results['reminder_2h'] = await sendReminderEmail({
      clientEmail: to,
      clientName: 'Test Client',
      trainerName: 'Coach Smith',
      serviceName: 'Personal Training Session',
      scheduledAt: new Date(Date.now() + 7200000).toISOString(),
      hours: 2,
    });

    // 4. Low Credits
    results['low_credits'] = await sendLowCreditsEmail({
      clientEmail: to,
      clientName: 'Test Client',
      creditsRemaining: 2,
      trainerName: 'Coach Smith',
      bookingLink: `${appUrl}/book/test-studio`,
    });

    // 5. Payment Receipt
    results['payment_receipt'] = await sendPaymentReceiptEmail({
      clientEmail: to,
      clientName: 'Test Client',
      amount: 7500, // $75.00
      packageName: '10 Session Pack',
      serviceName: 'Personal Training',
    });

    // 6. Booking Request Created (to trainer)
    results['booking_request_created'] = await sendBookingRequestCreatedEmail({
      trainerEmail: to,
      trainerName: 'Coach Smith',
      clientName: 'Jane Doe',
      serviceName: 'Personal Training Session',
      preferredTimes: ['Monday 10am', 'Wednesday 2pm', 'Friday 9am'],
      notes: 'I prefer morning sessions if possible.',
    });

    // 7. Booking Request Accepted
    results['booking_request_accepted'] = await sendBookingRequestAcceptedEmail({
      clientEmail: to,
      clientName: 'Test Client',
      trainerName: 'Coach Smith',
      serviceName: 'Personal Training Session',
      acceptedTime: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
    });

    // 8. Booking Request Declined
    results['booking_request_declined'] = await sendBookingRequestDeclinedEmail({
      clientEmail: to,
      clientName: 'Test Client',
      trainerName: 'Coach Smith',
      serviceName: 'Personal Training Session',
    });

    // 9. Client Invitation
    results['client_invitation'] = await sendClientInvitationEmail({
      recipientEmail: to,
      recipientName: 'New Client',
      inviterName: 'Coach Smith',
      studioName: 'AllWondrous Fitness',
      inviteUrl: `${appUrl}/client-invite/test-token-123`,
      message: 'Welcome to our studio! Looking forward to training with you.',
    });

    // 10. Staff Invitation
    results['staff_invitation'] = await sendInvitationEmail({
      recipientEmail: to,
      recipientName: 'New Trainer',
      inviterName: 'Studio Owner',
      studioName: 'AllWondrous Fitness',
      role: 'trainer',
      inviteUrl: `${appUrl}/invite/test-token-456`,
      message: 'We would love for you to join our team!',
    });

    // 11. Custom Email
    results['custom_email'] = await sendCustomEmail({
      recipientEmail: to,
      recipientName: 'Test Client',
      senderName: 'Coach Smith',
      studioName: 'AllWondrous Fitness',
      subject: 'Upcoming Holiday Schedule Change',
      message: 'Hi! Just wanted to let you know our schedule will be adjusted next week for the holiday. Please check the booking page for updated availability. See you soon!',
    });

    const totalSent = Object.values(results).filter(r => r.success).length;
    const totalFailed = Object.values(results).filter(r => !r.success).length;

    return NextResponse.json({
      summary: {
        totalTemplates: Object.keys(results).length,
        sent: totalSent,
        failed: totalFailed,
        allPassed: totalFailed === 0,
        recipient: to,
      },
      results,
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
