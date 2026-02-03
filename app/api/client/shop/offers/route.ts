import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/shop/offers
 * Returns available offers for the client's studio
 */
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email to get studio_id
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client || !client.studio_id) {
      return NextResponse.json(
        { error: 'Client not found or not associated with a studio' },
        { status: 404 }
      );
    }

    // Get active offers for this studio
    const { data: offers, error } = await supabase
      .from('referral_signup_links')
      .select(`
        id,
        title,
        description,
        payment_amount,
        currency,
        max_referrals,
        current_referrals,
        expires_at,
        credits,
        expiry_days,
        is_gift
      `)
      .eq('studio_id', client.studio_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }

    // Filter out offers that have reached max capacity or are expired
    const now = new Date();
    const availableOffers = (offers || []).filter((o) => {
      // Check expiry
      if (o.expires_at && new Date(o.expires_at) < now) {
        return false;
      }
      // Check capacity
      if (o.max_referrals && o.current_referrals >= o.max_referrals) {
        return false;
      }
      return true;
    });

    return NextResponse.json({
      offers: availableOffers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        paymentAmount: o.payment_amount,
        currency: o.currency,
        maxReferrals: o.max_referrals,
        currentReferrals: o.current_referrals,
        expiresAt: o.expires_at,
        credits: o.credits,
        expiryDays: o.expiry_days,
        isGift: o.is_gift,
        isFree: o.payment_amount === 0,
        remainingSpots: o.max_referrals ? o.max_referrals - o.current_referrals : null,
      })),
    });
  } catch (error) {
    console.error('Error in client shop offers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
