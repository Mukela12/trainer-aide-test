import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendPaymentReceiptEmail, sendBookingConfirmationEmail } from '@/lib/notifications/email-service';

// Use service role for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  const trainerId = session.metadata?.trainer_id;
  const packageId = session.metadata?.package_id;

  if (!trainerId) {
    console.error('Missing trainer_id in checkout session');
    return;
  }

  // Update payment record
  await supabase
    .from('ta_payments')
    .update({
      status: 'succeeded',
      stripe_payment_intent_id: session.payment_intent as string,
    })
    .eq('stripe_checkout_session_id', session.id);

  // Handle booking payment
  if (bookingId) {
    // Update booking status to confirmed
    await supabase
      .from('ta_bookings')
      .update({
        status: 'confirmed',
        hold_expiry: null,
      })
      .eq('id', bookingId);

    // Get booking details for email
    const { data: booking } = await supabase
      .from('ta_bookings')
      .select(`
        scheduled_at,
        duration,
        ta_services(name),
        fc_clients(first_name, last_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (booking && (booking.fc_clients as any)?.email) {
      const client = booking.fc_clients as { first_name?: string; last_name?: string; email?: string };
      const service = booking.ta_services as { name?: string } | null;

      // Get trainer info
      const { data: trainer } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', trainerId)
        .single();

      const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';
      const trainerName = trainer
        ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer'
        : 'Your Trainer';

      // Send booking confirmation email
      await sendBookingConfirmationEmail({
        clientEmail: client.email!,
        clientName,
        trainerName,
        serviceName: service?.name || 'Session',
        scheduledAt: booking.scheduled_at,
        duration: booking.duration,
        bookingId,
      });

      // Send payment receipt
      await sendPaymentReceiptEmail({
        clientEmail: client.email!,
        clientName,
        amount: session.amount_total || 0,
        serviceName: service?.name,
      });
    }

    console.log(`Checkout complete for booking ${bookingId}`);
  }

  // Handle package purchase
  if (packageId) {
    // Get package and client info
    const { data: clientPackage } = await supabase
      .from('ta_client_packages')
      .select(`
        client_id,
        ta_packages(name, price_cents),
        fc_clients(first_name, last_name, email)
      `)
      .eq('id', packageId)
      .single();

    if (clientPackage && (clientPackage.fc_clients as any)?.email) {
      const client = clientPackage.fc_clients as { first_name?: string; last_name?: string; email?: string };
      const pkg = clientPackage.ta_packages as { name?: string; price_cents?: number } | null;

      const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';

      await sendPaymentReceiptEmail({
        clientEmail: client.email!,
        clientName,
        amount: session.amount_total || pkg?.price_cents || 0,
        packageName: pkg?.name,
      });
    }

    console.log(`Checkout complete for package ${packageId}`);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { data: payment } = await supabase
    .from('ta_payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    // Get receipt URL from the latest charge if available
    let receiptUrl: string | null = null;
    if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === 'string') {
      try {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        receiptUrl = charge.receipt_url || null;
      } catch {
        // Ignore errors getting receipt URL
      }
    }

    await supabase
      .from('ta_payments')
      .update({
        status: 'succeeded',
        stripe_charge_id: paymentIntent.latest_charge as string,
        receipt_url: receiptUrl,
      })
      .eq('id', payment.id);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  await supabase
    .from('ta_payments')
    .update({
      status: 'failed',
      failure_message: paymentIntent.last_payment_error?.message || 'Payment failed',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Get booking ID from payment
  const { data: payment } = await supabase
    .from('ta_payments')
    .select('booking_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment?.booking_id) {
    // Update booking status
    await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', payment.booking_id);
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  await supabase
    .from('ta_stripe_accounts')
    .update({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.charges_enabled && account.payouts_enabled && account.details_submitted,
    })
    .eq('stripe_account_id', account.id);

  console.log(`Account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  // Update payment status
  await supabase
    .from('ta_payments')
    .update({
      status: 'refunded',
    })
    .eq('stripe_payment_intent_id', paymentIntentId);

  // Get payment details
  const { data: payment } = await supabase
    .from('ta_payments')
    .select('booking_id, package_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (payment?.booking_id) {
    // Update booking to cancelled
    await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', payment.booking_id);
  }

  // If this was a package purchase, would need to deduct credits
  // Will be implemented in Package phase

  console.log(`Refund processed for payment intent ${paymentIntentId}`);
}
