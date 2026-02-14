/**
 * Stripe Webhook Service
 *
 * Business logic for processing Stripe webhook events.
 * Extracted from api/stripe/webhooks route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { sendPaymentReceiptEmail, sendBookingConfirmationEmail } from '@/lib/notifications/email-service';
import type Stripe from 'stripe';

export async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = createServiceRoleClient();
  const bookingId = session.metadata?.booking_id;
  const trainerId = session.metadata?.trainer_id;
  const packageId = session.metadata?.package_id;

  if (!trainerId) {
    throw new Error('Missing trainer_id in checkout session metadata');
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
    await supabase
      .from('ta_bookings')
      .update({
        status: 'confirmed',
        hold_expiry: null,
      })
      .eq('id', bookingId);

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

    if (booking && (booking.fc_clients as { email?: string })?.email) {
      const client = booking.fc_clients as { first_name?: string; last_name?: string; email?: string };
      const service = booking.ta_services as { name?: string } | null;

      const { data: trainer } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', trainerId)
        .single();

      const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';
      const trainerName = trainer
        ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer'
        : 'Your Trainer';

      await sendBookingConfirmationEmail({
        clientEmail: client.email!,
        clientName,
        trainerName,
        serviceName: service?.name || 'Session',
        scheduledAt: booking.scheduled_at,
        duration: booking.duration,
        bookingId,
      });

      await sendPaymentReceiptEmail({
        clientEmail: client.email!,
        clientName,
        amount: session.amount_total || 0,
        serviceName: service?.name,
      });
    }
  }

  // Handle package purchase
  if (packageId) {
    const { data: clientPackage } = await supabase
      .from('ta_client_packages')
      .select(`
        client_id,
        ta_packages(name, price_cents),
        fc_clients(first_name, last_name, email)
      `)
      .eq('id', packageId)
      .single();

    if (clientPackage && (clientPackage.fc_clients as { email?: string })?.email) {
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
  }
}

export async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: payment } = await supabase
    .from('ta_payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
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

export async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase
    .from('ta_payments')
    .update({
      status: 'failed',
      failure_message: paymentIntent.last_payment_error?.message || 'Payment failed',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  const { data: payment } = await supabase
    .from('ta_payments')
    .select('booking_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment?.booking_id) {
    await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', payment.booking_id);
  }
}

export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase
    .from('ta_stripe_accounts')
    .update({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.charges_enabled && account.payouts_enabled && account.details_submitted,
    })
    .eq('stripe_account_id', account.id);
}

export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const supabase = createServiceRoleClient();
  const paymentIntentId = charge.payment_intent as string;

  await supabase
    .from('ta_payments')
    .update({ status: 'refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId);

  const { data: payment } = await supabase
    .from('ta_payments')
    .select('booking_id, package_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (payment?.booking_id) {
    await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', payment.booking_id);
  }
}
