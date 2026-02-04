import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/client/shop/offers
 * Returns available offers for the client's studio
 *
 * Multi-strategy lookup:
 * 1. Find client by email (case-insensitive)
 * 2. Get studio_id from client, or fall back to finding through invited_by
 * 3. Find offers by studio_id or created_by
 *
 * Uses service role client for database queries to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    // Auth client for checking user identity
    const authClient = createServerClient(
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

    // Service role client for database queries (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email (case-insensitive)
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by')
      .ilike('email', user.email || '')
      .maybeSingle();

    if (!client) {
      console.error('Client not found for email:', user.email);
      return NextResponse.json(
        { error: 'Client not found', offers: [] },
        { status: 404 }
      );
    }

    // Build the lookup IDs for offers
    const lookupIds: string[] = [];

    if (client.studio_id) {
      lookupIds.push(client.studio_id);
    }

    // If client was invited, the inviter's ID might be the created_by
    if (client.invited_by) {
      lookupIds.push(client.invited_by);

      // Check if the inviter has a studio_id in bs_staff
      const { data: inviterStaff } = await supabase
        .from('bs_staff')
        .select('studio_id')
        .eq('id', client.invited_by)
        .maybeSingle();

      if (inviterStaff?.studio_id && !lookupIds.includes(inviterStaff.studio_id)) {
        lookupIds.push(inviterStaff.studio_id);

        // Update client's studio_id if it was NULL
        if (!client.studio_id) {
          await supabase
            .from('fc_clients')
            .update({ studio_id: inviterStaff.studio_id })
            .eq('id', client.id);
        }
      }
    }

    // If studio_id might be a bs_studios.id, get the owner_id too
    if (client.studio_id) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('owner_id')
        .eq('id', client.studio_id)
        .maybeSingle();

      if (studio?.owner_id && !lookupIds.includes(studio.owner_id)) {
        lookupIds.push(studio.owner_id);
      }
    }

    // Remove duplicates
    const uniqueLookupIds = [...new Set(lookupIds)];

    if (uniqueLookupIds.length === 0) {
      console.error('No studio or creator IDs found for client:', client.id);
      return NextResponse.json({ offers: [] });
    }

    // Query offers by studio_id OR created_by matching any of our lookup IDs
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
        is_gift,
        studio_id,
        created_by
      `)
      .or(
        uniqueLookupIds.map(id => `studio_id.eq.${id}`).join(',') +
        ',' +
        uniqueLookupIds.map(id => `created_by.eq.${id}`).join(',')
      )
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

    // Deduplicate offers by ID
    const uniqueOffers = Array.from(
      new Map(availableOffers.map(o => [o.id, o])).values()
    );

    return NextResponse.json({
      offers: uniqueOffers.map((o) => ({
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
