import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/trainers
 * Returns trainers at the client's studio
 *
 * Multi-strategy lookup:
 * 1. Find client by email (case-insensitive)
 * 2. Get studio_id from client, or fall back to finding studio through invited_by
 * 3. Find trainers by studio_id, or fall back to finding by studio owner
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
        { error: 'Client not found', trainers: [] },
        { status: 404 }
      );
    }

    let studioId = client.studio_id;
    let trainers: Array<{ id: string; firstName: string; lastName: string; fullName: string }> = [];

    // Strategy 1: Use client's studio_id if available
    if (studioId) {
      const { data: staff } = await supabase
        .from('bs_staff')
        .select('id, first_name, last_name, staff_type')
        .eq('studio_id', studioId)
        .in('staff_type', ['trainer', 'owner', 'instructor']);

      if (staff && staff.length > 0) {
        trainers = staff.map((s) => ({
          id: s.id,
          firstName: s.first_name || '',
          lastName: s.last_name || '',
          fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
        }));
      }
    }

    // Strategy 2: If no trainers found and client was invited, find through inviter
    if (trainers.length === 0 && client.invited_by) {
      // The inviter might be the studio owner or a trainer
      // First, check if the inviter is in bs_staff with a studio_id
      const { data: inviterStaff } = await supabase
        .from('bs_staff')
        .select('id, studio_id, first_name, last_name, staff_type')
        .eq('id', client.invited_by)
        .maybeSingle();

      if (inviterStaff) {
        // Add the inviter as a trainer option
        trainers.push({
          id: inviterStaff.id,
          firstName: inviterStaff.first_name || '',
          lastName: inviterStaff.last_name || '',
          fullName: `${inviterStaff.first_name || ''} ${inviterStaff.last_name || ''}`.trim() || 'Trainer',
        });

        // If the inviter has a studio_id, get other trainers from that studio
        if (inviterStaff.studio_id) {
          studioId = inviterStaff.studio_id;
          const { data: otherStaff } = await supabase
            .from('bs_staff')
            .select('id, first_name, last_name, staff_type')
            .eq('studio_id', inviterStaff.studio_id)
            .in('staff_type', ['trainer', 'owner', 'instructor'])
            .neq('id', client.invited_by); // Exclude the inviter we already added

          if (otherStaff && otherStaff.length > 0) {
            trainers.push(...otherStaff.map((s) => ({
              id: s.id,
              firstName: s.first_name || '',
              lastName: s.last_name || '',
              fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
            })));
          }

          // Update the client's studio_id if it was NULL
          if (!client.studio_id) {
            await supabase
              .from('fc_clients')
              .update({ studio_id: inviterStaff.studio_id })
              .eq('id', client.id);
          }
        }
      }

      // Also check profiles table for inviter (solo practitioners)
      if (trainers.length === 0) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .eq('id', client.invited_by)
          .maybeSingle();

        if (inviterProfile && ['solo_practitioner', 'studio_owner', 'trainer'].includes(inviterProfile.role || '')) {
          trainers.push({
            id: inviterProfile.id,
            firstName: inviterProfile.first_name || '',
            lastName: inviterProfile.last_name || '',
            fullName: `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'Trainer',
          });

          // For solo practitioners, the user.id IS the studio_id
          // Update the client's studio_id
          if (!client.studio_id) {
            await supabase
              .from('fc_clients')
              .update({ studio_id: client.invited_by })
              .eq('id', client.id);
          }
        }
      }
    }

    // Strategy 3: If studio_id points to a user (solo practitioner model), find that user
    if (trainers.length === 0 && studioId) {
      // Check if studio_id is actually a user ID (solo practitioner)
      const { data: soloProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', studioId)
        .maybeSingle();

      if (soloProfile && ['solo_practitioner', 'studio_owner', 'trainer'].includes(soloProfile.role || '')) {
        trainers.push({
          id: soloProfile.id,
          firstName: soloProfile.first_name || '',
          lastName: soloProfile.last_name || '',
          fullName: `${soloProfile.first_name || ''} ${soloProfile.last_name || ''}`.trim() || 'Trainer',
        });
      }
    }

    // Strategy 4: Check if studio_id is a bs_studios.id and find the owner
    if (trainers.length === 0 && studioId) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('id, owner_id')
        .eq('id', studioId)
        .maybeSingle();

      if (studio?.owner_id) {
        // Get the studio owner's profile
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', studio.owner_id)
          .maybeSingle();

        if (ownerProfile) {
          trainers.push({
            id: ownerProfile.id,
            firstName: ownerProfile.first_name || '',
            lastName: ownerProfile.last_name || '',
            fullName: `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() || 'Studio Owner',
          });
        }

        // Also check bs_staff for trainers with this studio_id OR owner_id as studio_id
        const { data: moreStaff } = await supabase
          .from('bs_staff')
          .select('id, first_name, last_name, staff_type')
          .or(`studio_id.eq.${studioId},studio_id.eq.${studio.owner_id}`)
          .in('staff_type', ['trainer', 'owner', 'instructor']);

        if (moreStaff && moreStaff.length > 0) {
          const existingIds = new Set(trainers.map(t => t.id));
          trainers.push(...moreStaff
            .filter(s => !existingIds.has(s.id))
            .map((s) => ({
              id: s.id,
              firstName: s.first_name || '',
              lastName: s.last_name || '',
              fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
            })));
        }
      }
    }

    // Deduplicate trainers by ID
    const uniqueTrainers = Array.from(
      new Map(trainers.map(t => [t.id, t])).values()
    );

    return NextResponse.json({ trainers: uniqueTrainers });
  } catch (error) {
    console.error('Error in client studio trainers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
