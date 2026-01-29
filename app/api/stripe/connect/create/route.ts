import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('ta_stripe_accounts')
      .select('stripe_account_id, onboarding_complete')
      .eq('user_id', user.id)
      .single();

    if (existingAccount?.onboarding_complete) {
      return NextResponse.json({
        accountId: existingAccount.stripe_account_id,
        alreadyComplete: true,
      });
    }

    // Get user profile for pre-filling
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, business_name')
      .eq('id', user.id)
      .single();

    let stripeAccountId = existingAccount?.stripe_account_id;

    // Create new Stripe account if needed
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: profile?.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: profile?.business_name || `${profile?.first_name} ${profile?.last_name}`,
          product_description: 'Personal training services',
        },
        metadata: {
          user_id: user.id,
          platform: 'trainer_aide',
        },
      });

      stripeAccountId = account.id;

      // Store in database
      await supabase.from('ta_stripe_accounts').insert({
        user_id: user.id,
        stripe_account_id: stripeAccountId,
        charges_enabled: false,
        payouts_enabled: false,
        onboarding_complete: false,
      });
    }

    return NextResponse.json({
      accountId: stripeAccountId,
      alreadyComplete: false,
    });
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
}
