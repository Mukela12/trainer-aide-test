import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe/config';

export async function GET(request: NextRequest) {
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

    // Get stored account
    const { data: storedAccount } = await supabase
      .from('ta_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!storedAccount) {
      return NextResponse.json({
        connected: false,
        hasAccount: false,
      });
    }

    // Fetch latest status from Stripe
    const account = await stripe.accounts.retrieve(storedAccount.stripe_account_id);

    // Update our records
    const updateData = {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.charges_enabled && account.payouts_enabled && account.details_submitted,
      business_type: account.business_type,
    };

    await supabase
      .from('ta_stripe_accounts')
      .update(updateData)
      .eq('id', storedAccount.id);

    return NextResponse.json({
      connected: true,
      hasAccount: true,
      accountId: storedAccount.stripe_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: updateData.onboarding_complete,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
      },
    });
  } catch (error) {
    console.error('Error fetching Stripe account status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}
