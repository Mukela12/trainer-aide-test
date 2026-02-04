import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/client/bookings
 * Returns the authenticated client's bookings
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

    // Find the client record for this user by email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client) {
      return NextResponse.json({ bookings: [] });
    }

    // Get bookings for this client
    const { data: bookings, error } = await supabase
      .from('ta_bookings')
      .select(`
        id,
        scheduled_at,
        duration,
        status,
        ta_services(name),
        trainer_id
      `)
      .eq('client_id', client.id)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching client bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Get trainer names for all bookings
    const trainerIds = [...new Set((bookings || []).map((b) => b.trainer_id))];
    const { data: trainers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', trainerIds);

    const trainerMap = new Map(
      (trainers || []).map((t) => [
        t.id,
        `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Trainer',
      ])
    );

    return NextResponse.json({
      bookings: (bookings || []).map((b) => ({
        id: b.id,
        scheduledAt: b.scheduled_at,
        duration: b.duration,
        status: b.status,
        serviceName: (b.ta_services as any)?.name || 'Session',
        trainerName: trainerMap.get(b.trainer_id) || 'Trainer',
      })),
    });
  } catch (error) {
    console.error('Error in client bookings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/client/bookings
 * Create a new booking for the client
 * Body: { serviceId, trainerId, scheduledAt }
 *
 * Uses multi-strategy lookup to handle various studio configurations
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { serviceId, trainerId, scheduledAt } = body;

    if (!serviceId || !trainerId || !scheduledAt) {
      return NextResponse.json(
        { error: 'serviceId, trainerId, and scheduledAt are required' },
        { status: 400 }
      );
    }

    // Find the client record with self_booking_allowed flag and credits (case-insensitive)
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by, self_booking_allowed, credits')
      .ilike('email', user.email || '')
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get simple credits from fc_clients as fallback
    const simpleCredits = client.credits || 0;

    // Check if self-booking is allowed
    if (client.self_booking_allowed === false) {
      return NextResponse.json(
        { error: 'Self-booking is not enabled for your account. Please contact your studio.' },
        { status: 403 }
      );
    }

    // Build lookup IDs for validation (same multi-strategy approach as other client APIs)
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

        // Update client's studio_id if it was NULL
        if (!client.studio_id) {
          client.studio_id = inviterStaff.studio_id;
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

    const uniqueLookupIds = [...new Set(lookupIds)];

    // Validate service belongs to the client's studio/trainer
    const { data: service, error: serviceError } = await supabase
      .from('ta_services')
      .select('id, name, duration, credits_required, studio_id, created_by, is_active, is_public')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if service belongs to any of the lookup IDs (studio_id or created_by)
    const serviceIsValid = uniqueLookupIds.some(
      id => service.studio_id === id || service.created_by === id
    );

    if (!serviceIsValid) {
      console.error('Service validation failed:', {
        serviceId,
        serviceStudioId: service.studio_id,
        serviceCreatedBy: service.created_by,
        lookupIds: uniqueLookupIds,
      });
      return NextResponse.json(
        { error: 'Service does not belong to your studio' },
        { status: 400 }
      );
    }

    if (!service.is_active || !service.is_public) {
      return NextResponse.json(
        { error: 'This service is not available for booking' },
        { status: 400 }
      );
    }

    // Validate trainer belongs to the client's studio (multi-strategy)
    // Check 1: Is trainer directly in the lookup IDs (solo practitioner)?
    let trainerIsValid = uniqueLookupIds.includes(trainerId);

    // Check 2: Is trainer in bs_staff with matching studio_id?
    if (!trainerIsValid && uniqueLookupIds.length > 0) {
      const { data: trainerStaff } = await supabase
        .from('bs_staff')
        .select('id, studio_id')
        .eq('id', trainerId)
        .in('staff_type', ['trainer', 'owner', 'instructor'])
        .maybeSingle();

      if (trainerStaff) {
        // Check if trainer's studio_id matches any of our lookup IDs
        trainerIsValid = uniqueLookupIds.includes(trainerStaff.studio_id);
      }
    }

    // Check 3: Is the trainer the studio owner?
    if (!trainerIsValid) {
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', trainerId)
        .maybeSingle();

      if (trainerProfile && ['solo_practitioner', 'studio_owner', 'trainer'].includes(trainerProfile.role || '')) {
        // Check if this trainer owns a studio that matches our lookup IDs
        const { data: ownedStudios } = await supabase
          .from('bs_studios')
          .select('id')
          .eq('owner_id', trainerId);

        if (ownedStudios && ownedStudios.length > 0) {
          trainerIsValid = ownedStudios.some(s => uniqueLookupIds.includes(s.id));
        }
      }
    }

    if (!trainerIsValid) {
      console.error('Trainer validation failed:', {
        trainerId,
        lookupIds: uniqueLookupIds,
        clientStudioId: client.studio_id,
        clientInvitedBy: client.invited_by,
      });
      return NextResponse.json(
        { error: 'Trainer not found at your studio' },
        { status: 400 }
      );
    }

    // Get trainer profile for name
    const { data: trainerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', trainerId)
      .single();

    const trainerName = trainerProfile
      ? `${trainerProfile.first_name || ''} ${trainerProfile.last_name || ''}`.trim() || 'Trainer'
      : 'Trainer';

    // Check client has sufficient credits (from packages or simple credits)
    const { data: packages } = await supabase
      .from('ta_client_packages')
      .select('id, sessions_remaining')
      .eq('client_id', client.id)
      .eq('status', 'active')
      .gt('sessions_remaining', 0)
      .order('expires_at', { ascending: true });

    const packageCredits = (packages || []).reduce((sum, p) => sum + p.sessions_remaining, 0);
    const creditsRequired = service.credits_required || 1;

    // Use package credits if available, otherwise use simple credits
    const hasPackages = packages && packages.length > 0;
    const totalCredits = hasPackages ? packageCredits : simpleCredits;

    if (totalCredits < creditsRequired) {
      return NextResponse.json(
        { error: `Insufficient credits. You have ${totalCredits} credits but need ${creditsRequired}.` },
        { status: 400 }
      );
    }

    // Check for booking conflicts at that time
    const scheduledDate = new Date(scheduledAt);
    const endTime = new Date(scheduledDate.getTime() + service.duration * 60 * 1000);

    const { data: conflicts } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', trainerId)
      .in('status', ['confirmed', 'pending'])
      .lt('scheduled_at', endTime.toISOString())
      .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString()); // Check 2 hours before

    // More accurate conflict check
    if (conflicts && conflicts.length > 0) {
      // Re-check with proper overlap logic by fetching full booking data
      const { data: existingBookings } = await supabase
        .from('ta_bookings')
        .select('id, scheduled_at, duration')
        .eq('trainer_id', trainerId)
        .in('status', ['confirmed', 'pending'])
        .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString())
        .lte('scheduled_at', endTime.toISOString());

      for (const booking of existingBookings || []) {
        const bookingStart = new Date(booking.scheduled_at);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);

        // Check if there's an overlap
        if (scheduledDate < bookingEnd && endTime > bookingStart) {
          return NextResponse.json(
            { error: 'This time slot is already booked. Please choose another time.' },
            { status: 409 }
          );
        }
      }
    }

    // Determine the best studio_id for the booking
    // Priority: client.studio_id -> service.studio_id -> service.created_by -> trainerId
    const bookingStudioId = client.studio_id || service.studio_id || service.created_by || trainerId;

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .insert({
        client_id: client.id,
        trainer_id: trainerId,
        service_id: serviceId,
        studio_id: bookingStudioId,
        scheduled_at: scheduledAt,
        duration: service.duration,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    let remainingCredits = 0;

    if (hasPackages) {
      // Deduct credits from packages using FIFO
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_client_credit', {
        p_client_id: client.id,
        p_trainer_id: trainerId,
        p_booking_id: booking.id,
        p_credits: creditsRequired,
      });

      if (deductError) {
        console.error('Error deducting credits:', deductError);
        // Rollback the booking if credit deduction fails
        await supabase.from('ta_bookings').delete().eq('id', booking.id);
        return NextResponse.json({ error: 'Failed to process credits' }, { status: 500 });
      }

      // Calculate remaining credits after deduction from packages
      const { data: updatedPackages } = await supabase
        .from('ta_client_packages')
        .select('sessions_remaining')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .gt('sessions_remaining', 0);

      remainingCredits = (updatedPackages || []).reduce((sum, p) => sum + p.sessions_remaining, 0);
    } else {
      // Deduct credits directly from fc_clients.credits (simple credits)
      const newCredits = simpleCredits - creditsRequired;
      const { error: updateError } = await supabase
        .from('fc_clients')
        .update({ credits: newCredits })
        .eq('id', client.id);

      if (updateError) {
        console.error('Error deducting simple credits:', updateError);
        // Rollback the booking if credit deduction fails
        await supabase.from('ta_bookings').delete().eq('id', booking.id);
        return NextResponse.json({ error: 'Failed to process credits' }, { status: 500 });
      }

      remainingCredits = newCredits;
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduled_at,
        duration: booking.duration,
        status: booking.status,
        serviceName: service.name,
        trainerName,
      },
      remainingCredits,
    });
  } catch (error) {
    console.error('Error in client bookings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/client/bookings?id=xxx
 * Cancel a booking
 */
export async function DELETE(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('id');
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

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

    // Find the client record for this user by email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Verify the booking belongs to this client
    const { data: booking } = await supabase
      .from('ta_bookings')
      .select('id, status, scheduled_at')
      .eq('id', bookingId)
      .eq('client_id', client.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking can be cancelled (at least 24 hours before)
    const scheduledAt = new Date(booking.scheduled_at);
    const cancellationDeadline = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);

    if (new Date() > cancellationDeadline) {
      return NextResponse.json(
        { error: 'Cannot cancel booking within 24 hours of scheduled time' },
        { status: 400 }
      );
    }

    // Cancel the booking
    const { error: updateError } = await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    // Refund credits for the cancelled booking
    const serviceClient = createServiceRoleClient();

    // Find the credit usage record for this booking
    const { data: creditUsage } = await serviceClient
      .from('ta_credit_usage')
      .select('id, client_package_id, credits_used, balance_after')
      .eq('booking_id', bookingId)
      .eq('reason', 'booking')
      .single();

    if (creditUsage) {
      // Get current package state
      const { data: clientPackage } = await serviceClient
        .from('ta_client_packages')
        .select('id, sessions_remaining')
        .eq('id', creditUsage.client_package_id)
        .single();

      if (clientPackage) {
        const newBalance = clientPackage.sessions_remaining + creditUsage.credits_used;

        // Add credits back to the package
        const { error: refundError } = await serviceClient
          .from('ta_client_packages')
          .update({ sessions_remaining: newBalance })
          .eq('id', creditUsage.client_package_id);

        if (!refundError) {
          // Create a credit usage entry to track the refund
          await serviceClient
            .from('ta_credit_usage')
            .insert({
              client_package_id: creditUsage.client_package_id,
              booking_id: bookingId,
              credits_used: -creditUsage.credits_used, // Negative to indicate refund
              balance_after: newBalance,
              reason: 'refund',
              notes: 'Credit refund for cancelled booking',
            });
        } else {
          console.error('Error refunding credits:', refundError);
          // Don't fail the cancellation if refund fails, just log it
        }
      }
    }

    return NextResponse.json({ success: true, creditsRefunded: creditUsage ? creditUsage.credits_used : 0 });
  } catch (error) {
    console.error('Error in client bookings DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
