import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe, calculateFees } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      trainerId,
      amountCents,
      description,
      customerEmail,
      successUrl,
      cancelUrl,
      slug,
    } = body;

    if (!bookingId || !trainerId || !amountCents) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only
          },
        },
      }
    );

    // Get trainer's Stripe account
    const { data: stripeAccount } = await supabase
      .from('ta_stripe_accounts')
      .select('stripe_account_id, onboarding_complete')
      .eq('user_id', trainerId)
      .single();

    if (!stripeAccount?.onboarding_complete) {
      return NextResponse.json(
        { error: 'Trainer has not completed payment setup' },
        { status: 400 }
      );
    }

    // Calculate fees
    const { platformFeeCents, trainerAmountCents } = calculateFees(amountCents);

    // Get base URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: amountCents,
            product_data: {
              name: description || 'Training Session',
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
      },
      customer_email: customerEmail,
      success_url: successUrl || `${origin}/book/${slug}/confirm/${bookingId}?payment=success`,
      cancel_url: cancelUrl || `${origin}/book/${slug}/checkout?cancelled=true`,
      metadata: {
        booking_id: bookingId,
        trainer_id: trainerId,
        platform: 'trainer_aide',
      },
    });

    // Create payment record
    await supabase.from('ta_payments').insert({
      trainer_id: trainerId,
      booking_id: bookingId,
      stripe_checkout_session_id: session.id,
      amount_cents: amountCents,
      platform_fee_cents: platformFeeCents,
      trainer_amount_cents: trainerAmountCents,
      currency: 'gbp',
      status: 'pending',
      payment_type: 'session',
      description: description || 'Training Session',
      metadata: { slug },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
