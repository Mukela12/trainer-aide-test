import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { completeBooking } from '@/lib/services/booking-service';

/**
 * POST /api/bookings/[id]/complete
 * Completes a booking and optionally creates a training session record
 */
export async function POST(
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

    // Get request body for optional session data
    let sessionData = null;
    try {
      sessionData = await request.json();
    } catch {
      // No body provided, that's ok
    }

    const { data, error } = await completeBooking(id, user.id, sessionData);

    if (error) {
      const status = error.message.includes('not found')
        ? 404
        : error.message.includes('Cannot complete')
        ? 400
        : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json({
      booking: data?.booking,
      session: data?.session,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
