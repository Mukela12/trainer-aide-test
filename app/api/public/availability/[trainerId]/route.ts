import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for public availability (bypasses RLS for read-only public data)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const { trainerId } = await params;

    // Get weekly availability
    const { data: availability, error: availError } = await supabase
      .from('ta_availability')
      .select('day_of_week, start_hour, start_minute, end_hour, end_minute')
      .eq('trainer_id', trainerId)
      .eq('block_type', 'available')
      .eq('recurrence', 'weekly');

    if (availError) {
      console.error('Error fetching availability:', availError);
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      );
    }

    // Get existing bookings for the next 4 weeks
    const now = new Date();
    const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    const { data: bookings, error: bookingsError } = await supabase
      .from('ta_bookings')
      .select('scheduled_at, duration')
      .eq('trainer_id', trainerId)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', fourWeeksFromNow.toISOString())
      .in('status', ['confirmed', 'soft-hold', 'checked-in']);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      availability: availability?.map((a) => ({
        dayOfWeek: a.day_of_week,
        startHour: a.start_hour,
        startMinute: a.start_minute || 0,
        endHour: a.end_hour,
        endMinute: a.end_minute || 0,
      })) || [],
      bookings: bookings?.map((b) => ({
        scheduledAt: b.scheduled_at,
        duration: b.duration,
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
