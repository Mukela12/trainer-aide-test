import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/availability
 * Returns trainer availability for the client's studio
 * Query params:
 * - trainerId (optional): Filter by specific trainer
 * - date (optional): Filter by specific date (YYYY-MM-DD)
 *
 * Multi-strategy lookup to handle various studio configurations
 * Uses service role client for database queries to bypass RLS
 * (clients need to see trainer availability but RLS blocks them)
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
    // This is needed because clients need to see trainer availability
    // but the RLS policy only allows trainers and staff to see it
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
      return NextResponse.json(
        { error: 'Client not found', availability: [], existingBookings: [] },
        { status: 404 }
      );
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const dateParam = request.nextUrl.searchParams.get('date');

    // Build list of studio/owner IDs to search for trainers
    const lookupIds: string[] = [];

    if (client.studio_id) {
      lookupIds.push(client.studio_id);
    }

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

    const uniqueLookupIds = [...new Set(lookupIds)];

    // Get all trainers for these studios/owners
    let trainerIds: string[] = [];

    if (trainerId) {
      // If specific trainer requested, validate they exist and use them
      trainerIds = [trainerId];
    } else if (uniqueLookupIds.length > 0) {
      // Get trainers from bs_staff matching any studio_id
      const { data: staff } = await supabase
        .from('bs_staff')
        .select('id')
        .in('studio_id', uniqueLookupIds)
        .in('staff_type', ['trainer', 'owner', 'instructor']);

      trainerIds = (staff || []).map((s) => s.id);

      // Also include the lookup IDs themselves as potential trainers (solo practitioners)
      for (const id of uniqueLookupIds) {
        if (!trainerIds.includes(id)) {
          // Check if this ID is a trainer/practitioner in profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', id)
            .maybeSingle();

          if (profile && ['solo_practitioner', 'studio_owner', 'trainer'].includes(profile.role || '')) {
            trainerIds.push(id);
          }
        }
      }
    }

    if (trainerIds.length === 0 && uniqueLookupIds.length === 0) {
      return NextResponse.json({ availability: [], existingBookings: [] });
    }

    // Also include the lookup IDs in trainerIds for availability query
    // This handles the case where availability is stored with studio owner's user ID
    for (const id of uniqueLookupIds) {
      if (!trainerIds.includes(id)) {
        trainerIds.push(id);
      }
    }

    // Get trainer profiles for names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', trainerIds);

    const trainerMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Trainer',
      ])
    );

    // Get availability blocks for the trainers
    // Search by BOTH trainer_id AND studio_id to handle all data patterns
    // Build OR condition for trainer_id and studio_id matches
    const trainerConditions = trainerIds.map(id => `trainer_id.eq.${id}`).join(',');
    const studioConditions = uniqueLookupIds.map(id => `studio_id.eq.${id}`).join(',');
    const orCondition = [trainerConditions, studioConditions].filter(Boolean).join(',');

    let availabilityQuery = supabase
      .from('ta_availability')
      .select('*')
      .or(orCondition)
      .eq('block_type', 'available');

    // If a specific date is provided, filter by day of week
    if (dateParam) {
      const date = new Date(dateParam);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      availabilityQuery = availabilityQuery.eq('day_of_week', dayOfWeek);
    }

    console.log('[Availability Debug] Client:', { id: client.id, studio_id: client.studio_id, invited_by: client.invited_by });
    console.log('[Availability Debug] Lookup IDs:', uniqueLookupIds);
    console.log('[Availability Debug] Trainer IDs:', trainerIds);
    console.log('[Availability Debug] OR condition:', orCondition);

    const { data: availability, error: availError } = await availabilityQuery;

    console.log('[Availability Debug] Found availability records:', availability?.length || 0);
    if (availability && availability.length > 0) {
      console.log('[Availability Debug] Sample availability:', availability.slice(0, 3));
    }

    // Also add trainer names for any trainer_ids found in availability that we don't have yet
    const allTrainerIds = new Set([
      ...trainerIds,
      ...(availability || []).map(a => a.trainer_id).filter(Boolean)
    ]);

    // Fetch any missing trainer profiles
    const missingTrainerIds = [...allTrainerIds].filter(id => !trainerMap.has(id));
    if (missingTrainerIds.length > 0) {
      const { data: moreProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', missingTrainerIds);

      (moreProfiles || []).forEach(p => {
        trainerMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Trainer');
      });
    }

    if (availError) {
      console.error('Error fetching availability:', availError);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    // Get existing bookings to check for conflicts
    let bookingsQuery = supabase
      .from('ta_bookings')
      .select('id, trainer_id, scheduled_at, duration, status')
      .in('trainer_id', trainerIds)
      .in('status', ['confirmed', 'pending']);

    // If a specific date is provided, filter bookings for that date
    if (dateParam) {
      const startOfDay = `${dateParam}T00:00:00`;
      const endOfDay = `${dateParam}T23:59:59`;
      bookingsQuery = bookingsQuery
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay);
    } else {
      // Only get future bookings
      const now = new Date().toISOString();
      bookingsQuery = bookingsQuery.gte('scheduled_at', now);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({
      availability: (availability || []).map((a) => ({
        id: a.id,
        trainerId: a.trainer_id,
        trainerName: trainerMap.get(a.trainer_id) || 'Trainer',
        dayOfWeek: a.day_of_week,
        startHour: a.start_hour,
        startMinute: a.start_minute,
        endHour: a.end_hour,
        endMinute: a.end_minute,
        recurrence: a.recurrence,
        specificDate: a.specific_date,
      })),
      existingBookings: (bookings || []).map((b) => ({
        id: b.id,
        trainerId: b.trainer_id,
        scheduledAt: b.scheduled_at,
        duration: b.duration,
        status: b.status,
      })),
    });
  } catch (error) {
    console.error('Error in client studio availability GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
