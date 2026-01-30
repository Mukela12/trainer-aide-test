import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

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
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    // Get request body for optional session data
    let sessionData = null;
    try {
      sessionData = await request.json();
    } catch {
      // No body provided, that's ok
    }

    // First, fetch the booking
    const { data: existingBooking, error: fetchError } = await serviceClient
      .from('ta_bookings')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only checked-in or confirmed bookings can be completed
    const validStatuses = ['checked-in', 'confirmed'];
    if (!validStatuses.includes(existingBooking.status)) {
      return NextResponse.json(
        { error: `Cannot complete booking with status '${existingBooking.status}'` },
        { status: 400 }
      );
    }

    let createdSession = null;

    // If session data is provided, create a training session
    if (sessionData && sessionData.createSession !== false) {
      const sessionRecord = {
        id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        studio_id: studioId,
        trainer_id: existingBooking.trainer_id,
        client_id: existingBooking.client_id,
        template_id: existingBooking.template_id || sessionData.templateId || null,
        status: 'completed',
        sign_off_mode: existingBooking.sign_off_mode || 'full_session',
        started_at: sessionData.startedAt || existingBooking.scheduled_at,
        completed_at: sessionData.completedAt || new Date().toISOString(),
        notes: sessionData.notes || existingBooking.notes || null,
        blocks: sessionData.blocks || [],
      };

      const { data: session, error: sessionError } = await serviceClient
        .from('ta_sessions')
        .insert(sessionRecord)
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        // Don't fail the whole operation, just log the error
      } else {
        createdSession = session;
      }
    }

    // Deduct credits for completed session
    const creditsRequired = existingBooking.service?.credits_required || 1;

    const { error: creditError } = await serviceClient.rpc(
      'deduct_client_credit',
      {
        p_client_id: existingBooking.client_id,
        p_trainer_id: existingBooking.trainer_id || user.id,
        p_booking_id: id,
        p_credits: creditsRequired,
      }
    );

    if (creditError) {
      console.error('Credit deduction failed:', creditError);
      // Log but don't fail - session is completed regardless
    }

    // Update booking to completed
    const updateData: Record<string, unknown> = {
      status: 'completed',
    };

    if (createdSession) {
      updateData.session_id = createdSession.id;
    }

    const { data, error } = await serviceClient
      .from('ta_bookings')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error completing booking:', error);
      return NextResponse.json(
        { error: 'Failed to complete booking', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      booking: data,
      session: createdSession,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
