import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getClientBookings,
  createClientBooking,
  cancelClientBooking,
} from '@/lib/services/client-booking-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getClientBookings(user.email!);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data });
  } catch (error) {
    console.error('Error in client bookings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, trainerId, scheduledAt } = body;

    if (!serviceId || !trainerId || !scheduledAt) {
      return NextResponse.json(
        { error: 'serviceId, trainerId, and scheduledAt are required' },
        { status: 400 }
      );
    }

    const { data, error, status } = await createClientBooking(user.email!, {
      serviceId,
      trainerId,
      scheduledAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: status || 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client bookings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('id');
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error, status } = await cancelClientBooking(user.email!, bookingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: status || 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client bookings DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
