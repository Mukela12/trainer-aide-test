import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/services
 * Returns bookable services for the client's studio
 *
 * Multi-strategy lookup:
 * 1. Find client by email (case-insensitive)
 * 2. Get studio_id from client, or fall back to finding through invited_by
 * 3. Find services by studio_id or created_by (for solo practitioners)
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
        { error: 'Client not found', services: [] },
        { status: 404 }
      );
    }

    let studioId = client.studio_id;
    let createdBy: string | null = null;
    let services: Array<{
      id: string;
      name: string;
      description: string | null;
      duration: number;
      creditsRequired: number;
      type: string;
      color: string | null;
    }> = [];

    // Build the lookup IDs for services
    const lookupIds: string[] = [];

    if (studioId) {
      lookupIds.push(studioId);
    }

    // If client was invited, the inviter's ID might be the studio_id or created_by
    if (client.invited_by) {
      lookupIds.push(client.invited_by);
      createdBy = client.invited_by;

      // Also check if the inviter has a studio_id in bs_staff
      const { data: inviterStaff } = await supabase
        .from('bs_staff')
        .select('studio_id')
        .eq('id', client.invited_by)
        .maybeSingle();

      if (inviterStaff?.studio_id && !lookupIds.includes(inviterStaff.studio_id)) {
        lookupIds.push(inviterStaff.studio_id);

        // Update client's studio_id if it was NULL
        if (!client.studio_id) {
          studioId = inviterStaff.studio_id;
          await supabase
            .from('fc_clients')
            .update({ studio_id: inviterStaff.studio_id })
            .eq('id', client.id);
        }
      }
    }

    // If studio_id might be a bs_studios.id, get the owner_id too
    if (studioId) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('owner_id')
        .eq('id', studioId)
        .maybeSingle();

      if (studio?.owner_id && !lookupIds.includes(studio.owner_id)) {
        lookupIds.push(studio.owner_id);
      }
    }

    // Remove duplicates
    const uniqueLookupIds = [...new Set(lookupIds)];

    if (uniqueLookupIds.length === 0) {
      console.error('No studio or creator IDs found for client:', client.id);
      return NextResponse.json({ services: [] });
    }

    // Query services by studio_id OR created_by matching any of our lookup IDs
    // This handles both studio model (studio_id) and solo practitioner model (created_by)
    const { data: serviceData, error } = await supabase
      .from('ta_services')
      .select(`
        id,
        name,
        description,
        duration,
        credits_required,
        type,
        color,
        studio_id,
        created_by
      `)
      .or(
        uniqueLookupIds.map(id => `studio_id.eq.${id}`).join(',') +
        ',' +
        uniqueLookupIds.map(id => `created_by.eq.${id}`).join(',')
      )
      .eq('is_active', true)
      .eq('is_public', true)
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    // Deduplicate services by ID
    const uniqueServices = Array.from(
      new Map((serviceData || []).map(s => [s.id, s])).values()
    );

    return NextResponse.json({
      services: uniqueServices.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        creditsRequired: s.credits_required,
        type: s.type,
        color: s.color,
      })),
    });
  } catch (error) {
    console.error('Error in client studio services GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
