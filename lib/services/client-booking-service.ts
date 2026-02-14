import { createServiceRoleClient } from '@/lib/supabase/server';
import { getStudioConfig, isWithinOpeningHours } from '@/lib/services/studio-service';
import type { StudioConfig } from '@/lib/services/studio-service';

// =============================================
// Types
// =============================================

interface ClientBooking {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  serviceName: string;
  trainerName: string;
}

interface CreateClientBookingInput {
  serviceId: string;
  trainerId: string;
  scheduledAt: string;
}

interface CreateClientBookingResult {
  booking: ClientBooking;
  remainingCredits: number;
}

interface CancelBookingResult {
  success: boolean;
  creditsRefunded: number;
}

// =============================================
// Helpers
// =============================================

/** Build the lookup IDs for a client to validate studio membership. */
async function buildLookupIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  client: { id: string; studio_id: string | null; invited_by: string | null }
): Promise<string[]> {
  const lookupIds: string[] = [];

  if (client.studio_id) {
    lookupIds.push(client.studio_id);
  }

  if (client.invited_by) {
    lookupIds.push(client.invited_by);

    const { data: inviterStaff } = await supabase
      .from('bs_staff')
      .select('studio_id')
      .eq('id', client.invited_by)
      .maybeSingle();

    if (inviterStaff?.studio_id && !lookupIds.includes(inviterStaff.studio_id)) {
      lookupIds.push(inviterStaff.studio_id);

      if (!client.studio_id) {
        client.studio_id = inviterStaff.studio_id;
        await supabase
          .from('fc_clients')
          .update({ studio_id: inviterStaff.studio_id })
          .eq('id', client.id);
      }
    }
  }

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

  return [...new Set(lookupIds)];
}

/** Validate that a trainer belongs to the client's studio. */
async function validateTrainer(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trainerId: string,
  lookupIds: string[]
): Promise<boolean> {
  // Check 1: Direct match
  if (lookupIds.includes(trainerId)) return true;

  // Check 2: Trainer in bs_staff with matching studio_id
  if (lookupIds.length > 0) {
    const { data: trainerStaff } = await supabase
      .from('bs_staff')
      .select('id, studio_id')
      .eq('id', trainerId)
      .in('staff_type', ['trainer', 'owner', 'instructor'])
      .maybeSingle();

    if (trainerStaff && lookupIds.includes(trainerStaff.studio_id)) {
      return true;
    }
  }

  // Check 3: Trainer is studio owner
  const { data: trainerProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', trainerId)
    .maybeSingle();

  if (trainerProfile && ['solo_practitioner', 'studio_owner', 'trainer'].includes(trainerProfile.role || '')) {
    const { data: ownedStudios } = await supabase
      .from('bs_studios')
      .select('id')
      .eq('owner_id', trainerId);

    if (ownedStudios && ownedStudios.length > 0) {
      return ownedStudios.some((s: { id: string }) => lookupIds.includes(s.id));
    }
  }

  return false;
}

/** Check for booking time conflicts. */
async function checkBookingConflicts(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trainerId: string,
  scheduledAt: string,
  durationMinutes: number
): Promise<boolean> {
  const scheduledDate = new Date(scheduledAt);
  const endTime = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);

  const { data: conflicts } = await supabase
    .from('ta_bookings')
    .select('id')
    .eq('trainer_id', trainerId)
    .in('status', ['confirmed', 'pending'])
    .lt('scheduled_at', endTime.toISOString())
    .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString());

  if (!conflicts || conflicts.length === 0) return false;

  const { data: existingBookings } = await supabase
    .from('ta_bookings')
    .select('id, scheduled_at, duration')
    .eq('trainer_id', trainerId)
    .in('status', ['confirmed', 'pending'])
    .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString())
    .lte('scheduled_at', endTime.toISOString());

  for (const booking of existingBookings || []) {
    const bookingStart = new Date(booking.scheduled_at as string);
    const bookingEnd = new Date(bookingStart.getTime() + (booking.duration as number) * 60 * 1000);

    if (scheduledDate < bookingEnd && endTime > bookingStart) {
      return true;
    }
  }

  return false;
}

// =============================================
// Read operations
// =============================================

/** Fetch bookings for a client identified by email. */
export async function getClientBookings(userEmail: string) {
  const supabase = createServiceRoleClient();

  const { data: client } = await supabase
    .from('fc_clients')
    .select('id')
    .ilike('email', userEmail)
    .maybeSingle();

  if (!client) {
    return { data: [] as ClientBooking[], error: null };
  }

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
    return { data: null, error: new Error(error.message) };
  }

  const trainerIds = [...new Set((bookings || []).map((b: Record<string, unknown>) => b.trainer_id as string))];
  const { data: trainers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', trainerIds);

  const trainerMap = new Map(
    (trainers || []).map((t: Record<string, unknown>) => [
      t.id as string,
      `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Trainer',
    ])
  );

  const result: ClientBooking[] = (bookings || []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    scheduledAt: b.scheduled_at as string,
    duration: b.duration as number,
    status: b.status as string,
    serviceName: (b.ta_services as { name?: string } | null)?.name || 'Session',
    trainerName: trainerMap.get(b.trainer_id as string) || 'Trainer',
  }));

  return { data: result, error: null };
}

// =============================================
// Write operations
// =============================================

/** Create a booking for a client. Validates studio membership, trainer, credits, and conflicts. */
export async function createClientBooking(
  userEmail: string,
  input: CreateClientBookingInput
): Promise<{ data: CreateClientBookingResult | null; error: Error | null; status?: number }> {
  const supabase = createServiceRoleClient();
  const { serviceId, trainerId, scheduledAt } = input;

  // Find client
  const { data: client } = await supabase
    .from('fc_clients')
    .select('id, studio_id, invited_by, self_booking_allowed, credits')
    .ilike('email', userEmail)
    .maybeSingle();

  if (!client) {
    return { data: null, error: new Error('Client not found'), status: 404 };
  }

  if (client.self_booking_allowed === false) {
    return { data: null, error: new Error('Self-booking is not enabled for your account. Please contact your studio.'), status: 403 };
  }

  // Fetch studio config for booking model, opening hours, and cancellation settings
  let clientStudioConfig: StudioConfig | null = null;
  if (client.studio_id) {
    const { data: cfg } = await getStudioConfig(client.studio_id as string);
    clientStudioConfig = cfg;
  }

  // Enforce booking model — trainer-led studios require booking requests
  if (clientStudioConfig?.booking_model === 'trainer-led') {
    return {
      data: null,
      error: new Error('This studio requires trainer-approved bookings. Please submit a booking request instead.'),
      status: 403,
    };
  }

  const simpleCredits = (client.credits as number) || 0;
  const lookupIds = await buildLookupIds(supabase, client as { id: string; studio_id: string | null; invited_by: string | null });

  // Validate service
  const { data: service, error: serviceError } = await supabase
    .from('ta_services')
    .select('id, name, duration, credits_required, studio_id, created_by, is_active, is_public')
    .eq('id', serviceId)
    .single();

  if (serviceError || !service) {
    return { data: null, error: new Error('Service not found'), status: 404 };
  }

  const serviceIsValid = lookupIds.some(
    (id: string) => (service.studio_id as string) === id || (service.created_by as string) === id
  );

  if (!serviceIsValid) {
    return { data: null, error: new Error('Service does not belong to your studio'), status: 400 };
  }

  if (!service.is_active || !service.is_public) {
    return { data: null, error: new Error('This service is not available for booking'), status: 400 };
  }

  // Validate trainer
  const trainerIsValid = await validateTrainer(supabase, trainerId, lookupIds);
  if (!trainerIsValid) {
    return { data: null, error: new Error('Trainer not found at your studio'), status: 400 };
  }

  // Get trainer name
  const { data: trainerProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', trainerId)
    .single();

  const trainerName = trainerProfile
    ? `${trainerProfile.first_name || ''} ${trainerProfile.last_name || ''}`.trim() || 'Trainer'
    : 'Trainer';

  // Check credits
  const { data: packages } = await supabase
    .from('ta_client_packages')
    .select('id, sessions_remaining')
    .eq('client_id', client.id as string)
    .eq('status', 'active')
    .gt('sessions_remaining', 0)
    .order('expires_at', { ascending: true });

  const packageCredits = (packages || []).reduce((sum: number, p: Record<string, unknown>) => sum + (p.sessions_remaining as number), 0);
  const creditsRequired = (service.credits_required as number) || 1;
  const hasPackages = packages && packages.length > 0;
  const totalCredits = hasPackages ? packageCredits : simpleCredits;

  if (totalCredits < creditsRequired) {
    return {
      data: null,
      error: new Error(`Insufficient credits. You have ${totalCredits} credits but need ${creditsRequired}.`),
      status: 400,
    };
  }

  // Validate against studio opening hours
  if (clientStudioConfig?.opening_hours) {
    const hoursCheck = isWithinOpeningHours(
      clientStudioConfig.opening_hours,
      scheduledAt,
      service.duration as number
    );
    if (!hoursCheck.valid) {
      return {
        data: null,
        error: new Error(hoursCheck.reason || 'Outside studio operating hours'),
        status: 400,
      };
    }
  }

  // Check conflicts
  const hasConflict = await checkBookingConflicts(supabase, trainerId, scheduledAt, service.duration as number);
  if (hasConflict) {
    return {
      data: null,
      error: new Error('This time slot is already booked. Please choose another time.'),
      status: 409,
    };
  }

  // Create booking
  const bookingStudioId = (client.studio_id as string) || (service.studio_id as string) || (service.created_by as string) || trainerId;

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
    return { data: null, error: new Error('Failed to create booking'), status: 500 };
  }

  // Deduct credits
  let remainingCredits = 0;

  if (hasPackages) {
    const { error: deductError } = await supabase.rpc('deduct_client_credit', {
      p_client_id: client.id,
      p_trainer_id: trainerId,
      p_booking_id: (booking as Record<string, unknown>).id,
      p_credits: creditsRequired,
    });

    if (deductError) {
      await supabase.from('ta_bookings').delete().eq('id', (booking as Record<string, unknown>).id as string);
      return { data: null, error: new Error('Failed to process credits'), status: 500 };
    }

    const { data: updatedPackages } = await supabase
      .from('ta_client_packages')
      .select('sessions_remaining')
      .eq('client_id', client.id as string)
      .eq('status', 'active')
      .gt('sessions_remaining', 0);

    remainingCredits = (updatedPackages || []).reduce((sum: number, p: Record<string, unknown>) => sum + (p.sessions_remaining as number), 0);
  } else {
    const newCredits = simpleCredits - creditsRequired;
    const { error: updateError } = await supabase
      .from('fc_clients')
      .update({ credits: newCredits })
      .eq('id', client.id as string);

    if (updateError) {
      await supabase.from('ta_bookings').delete().eq('id', (booking as Record<string, unknown>).id as string);
      return { data: null, error: new Error('Failed to process credits'), status: 500 };
    }

    remainingCredits = newCredits;
  }

  return {
    data: {
      booking: {
        id: (booking as Record<string, unknown>).id as string,
        scheduledAt: (booking as Record<string, unknown>).scheduled_at as string,
        duration: (booking as Record<string, unknown>).duration as number,
        status: (booking as Record<string, unknown>).status as string,
        serviceName: service.name as string,
        trainerName,
      },
      remainingCredits,
    },
    error: null,
  };
}

/** Cancel a booking. Validates ownership, checks 24h deadline, refunds credits. */
export async function cancelClientBooking(
  userEmail: string,
  bookingId: string
): Promise<{ data: CancelBookingResult | null; error: Error | null; status?: number }> {
  const supabase = createServiceRoleClient();

  // Find client
  const { data: client } = await supabase
    .from('fc_clients')
    .select('id')
    .ilike('email', userEmail)
    .maybeSingle();

  if (!client) {
    return { data: null, error: new Error('Client not found'), status: 404 };
  }

  // Verify booking ownership (include studio_id for config lookup)
  const { data: booking } = await supabase
    .from('ta_bookings')
    .select('id, status, scheduled_at, studio_id')
    .eq('id', bookingId)
    .eq('client_id', client.id as string)
    .single();

  if (!booking) {
    return { data: null, error: new Error('Booking not found'), status: 404 };
  }

  // Fetch studio config for cancellation window and policy
  let cancelConfig: StudioConfig | null = null;
  if (booking.studio_id) {
    const { data: cfg } = await getStudioConfig(booking.studio_id as string);
    cancelConfig = cfg;
  }

  const cancellationWindowHours = cancelConfig?.cancellation_window_hours ?? 24;
  const scheduledAt = new Date(booking.scheduled_at as string);
  const now = new Date();
  const hoursUntilSession = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Determine refund percentage based on cancellation policy
  let refundPercent = 100; // default: full refund

  if (hoursUntilSession < cancellationWindowHours) {
    // Inside the cancellation window — check for tiered refunds
    const refundTiers = cancelConfig?.cancellation_policy?.refund_tiers;

    if (refundTiers && refundTiers.length > 0) {
      // Find the tier whose hours_before_session is closest to (but >= ) actual hours remaining
      const sortedTiers = [...refundTiers].sort(
        (a: { hours_before_session: number }, b: { hours_before_session: number }) =>
          a.hours_before_session - b.hours_before_session
      );

      let matchedTier: { hours_before_session: number; refund_percent: number } | null = null;
      for (const tier of sortedTiers) {
        if (hoursUntilSession <= tier.hours_before_session) {
          matchedTier = tier;
          break;
        }
      }

      if (matchedTier) {
        refundPercent = matchedTier.refund_percent;
      } else {
        // No matching tier — too close to session, 0% refund
        refundPercent = 0;
      }
    } else {
      // No tiers configured — block cancellation within window (original behavior)
      return {
        data: null,
        error: new Error(`Cannot cancel within ${cancellationWindowHours} hours of scheduled time`),
        status: 400,
      };
    }
  }

  // Cancel
  const { error: updateError } = await supabase
    .from('ta_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);

  if (updateError) {
    return { data: null, error: new Error('Failed to cancel booking'), status: 500 };
  }

  // Refund credits (proportional to refundPercent)
  let creditsRefunded = 0;

  if (refundPercent > 0) {
    const { data: creditUsage } = await supabase
      .from('ta_credit_usage')
      .select('id, client_package_id, credits_used, balance_after')
      .eq('booking_id', bookingId)
      .eq('reason', 'booking')
      .single();

    if (creditUsage) {
      const fullCredits = creditUsage.credits_used as number;
      const creditsToRefund = refundPercent === 100
        ? fullCredits
        : Math.round(fullCredits * refundPercent / 100);

      if (creditsToRefund > 0) {
        const { data: clientPackage } = await supabase
          .from('ta_client_packages')
          .select('id, sessions_remaining')
          .eq('id', creditUsage.client_package_id as string)
          .single();

        if (clientPackage) {
          const newBalance = (clientPackage.sessions_remaining as number) + creditsToRefund;

          const { error: refundError } = await supabase
            .from('ta_client_packages')
            .update({ sessions_remaining: newBalance })
            .eq('id', creditUsage.client_package_id as string);

          if (!refundError) {
            const refundNote = refundPercent === 100
              ? 'Credit refund for cancelled booking'
              : `Partial credit refund (${refundPercent}%) for late cancellation`;

            await supabase
              .from('ta_credit_usage')
              .insert({
                client_package_id: creditUsage.client_package_id,
                booking_id: bookingId,
                credits_used: -creditsToRefund,
                balance_after: newBalance,
                reason: 'refund',
                notes: refundNote,
              });

            creditsRefunded = creditsToRefund;
          }
        }
      }
    }
  }

  // TODO: no_show_action enforcement from cancellation_policy requires a cron job
  // or session completion hook to detect expired bookings and apply charges.

  return { data: { success: true, creditsRefunded }, error: null };
}
