import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/client/shop/packages
 * Returns available packages for the client's studio
 *
 * Multi-strategy lookup:
 * 1. Find client by email (case-insensitive)
 * 2. Get studio_id from client, or fall back to finding through invited_by
 * 3. Find packages by studio_id or owner_id
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
        { error: 'Client not found', packages: [] },
        { status: 404 }
      );
    }

    // Build the lookup IDs for packages
    const lookupIds: string[] = [];

    if (client.studio_id) {
      lookupIds.push(client.studio_id);
    }

    // If client was invited, the inviter's ID might be the owner_id
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
      console.error('No studio or owner IDs found for client:', client.id);
      return NextResponse.json({ packages: [] });
    }

    // Query packages by studio_id OR owner_id matching any of our lookup IDs
    const { data: packages, error } = await supabase
      .from('credit_bundles')
      .select(`
        id,
        name,
        description,
        credit_count,
        total_price,
        price_per_credit,
        expiry_days,
        studio_id,
        owner_id
      `)
      .or(
        uniqueLookupIds.map(id => `studio_id.eq.${id}`).join(',') +
        ',' +
        uniqueLookupIds.map(id => `owner_id.eq.${id}`).join(',')
      )
      .eq('is_active', true)
      .order('total_price', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    // Deduplicate packages by ID
    const uniquePackages = Array.from(
      new Map((packages || []).map(p => [p.id, p])).values()
    );

    return NextResponse.json({
      packages: uniquePackages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: p.credit_count,
        priceCents: Math.round(p.total_price * 100),
        validityDays: p.expiry_days,
        perSessionPriceCents: Math.round(p.price_per_credit * 100),
        savingsPercent: null,
        isFree: p.total_price === 0,
      })),
    });
  } catch (error) {
    console.error('Error in client shop packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
