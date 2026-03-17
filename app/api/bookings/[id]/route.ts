import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  getBookingById,
  updateBooking,
  deleteBooking,
} from '@/lib/services/booking-service';

/**
 * Check if userId owns the booking (is the trainer) or is staff in the same studio.
 */
async function canAccessBooking(
  userId: string,
  booking: Record<string, unknown>
): Promise<boolean> {
  const trainerId = booking.trainer_id as string;
  if (userId === trainerId) return true;

  // Check if user and trainer are in the same studio
  const supabase = createServiceRoleClient();
  const { data: userStaff } = await supabase
    .from('bs_staff')
    .select('studio_id')
    .eq('id', userId)
    .single();

  if (!userStaff?.studio_id) return false;

  const { data: trainerStaff } = await supabase
    .from('bs_staff')
    .select('studio_id')
    .eq('id', trainerId)
    .eq('studio_id', userStaff.studio_id)
    .single();

  return !!trainerStaff;
}

/**
 * GET /api/bookings/[id]
 * Fetches a single booking by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { data: booking, error } = await getBookingById(id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch booking', details: error.message },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!(await canAccessBooking(user.id, booking))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Updates a booking by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before allowing update
    const { data: existing } = await getBookingById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (!(await canAccessBooking(user.id, existing))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { data, error } = await updateBooking(id, body);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update booking', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancels or deletes a booking by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before allowing delete
    const { data: existing } = await getBookingById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (!(await canAccessBooking(user.id, existing))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    const { data, error } = await deleteBooking(id, hardDelete);

    if (error) {
      const action = hardDelete ? 'delete' : 'cancel';
      return NextResponse.json(
        { error: `Failed to ${action} booking`, details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
