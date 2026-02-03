import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/availability
 * Returns trainer availability for the client's studio
 * Query params:
 * - trainerId (optional): Filter by specific trainer
 * - date (optional): Filter by specific date (YYYY-MM-DD)
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

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const dateParam = request.nextUrl.searchParams.get('date');

    // Get all trainers for this studio
    const { data: staff } = await supabase
      .from('bs_staff')
      .select('id')
      .eq('studio_id', client.studio_id)
      .in('staff_type', ['trainer', 'owner', 'instructor']);

    let trainerIds: string[];

    if (trainerId) {
      // Validate that the specified trainer belongs to this client's studio
      const { data: validTrainer } = await supabase
        .from('bs_staff')
        .select('id')
        .eq('id', trainerId)
        .eq('studio_id', client.studio_id)
        .in('staff_type', ['trainer', 'owner', 'instructor'])
        .single();

      if (!validTrainer) {
        return NextResponse.json(
          { error: 'Trainer not found in your studio' },
          { status: 400 }
        );
      }
      trainerIds = [trainerId];
    } else {
      trainerIds = (staff || []).map((s) => s.id);
    }

    if (trainerIds.length === 0) {
      return NextResponse.json({ availability: [], existingBookings: [] });
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
    let availabilityQuery = supabase
      .from('ta_availability')
      .select('*')
      .in('trainer_id', trainerIds)
      .eq('block_type', 'available');

    // If a specific date is provided, filter by day of week
    if (dateParam) {
      const date = new Date(dateParam);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      availabilityQuery = availabilityQuery.eq('day_of_week', dayOfWeek);
    }

    const { data: availability, error: availError } = await availabilityQuery;

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
