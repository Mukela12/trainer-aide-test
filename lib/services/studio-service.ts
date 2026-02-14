/**
 * Studio Service
 *
 * Shared utility for studio auto-creation and lookup.
 * Extracted from duplicated logic in api/clients, api/templates, and api/client-invitations routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpeningHoursSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface OpeningHoursDay {
  enabled: boolean;
  slots: OpeningHoursSlot[];
}

/** Keys are day-of-week as strings: "0"=Sunday .. "6"=Saturday */
export type OpeningHours = Record<string, OpeningHoursDay>;

export interface CancellationRefundTier {
  hours_before_session: number;
  refund_percent: number;
}

export interface CancellationPolicy {
  no_show_action?: 'charge_full' | 'charge_partial' | 'no_charge';
  refund_tiers?: CancellationRefundTier[];
}

export interface StudioConfig {
  booking_model: string | null;
  soft_hold_length: number | null;
  opening_hours: OpeningHours;
  cancellation_window_hours: number | null;
  cancellation_policy: CancellationPolicy;
  session_types: string[];
  waitlist_config: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Studio config helpers
// ---------------------------------------------------------------------------

/**
 * Fetch studio configuration settings used for booking, cancellation, and availability enforcement.
 */
export async function getStudioConfig(studioId: string): Promise<{
  data: StudioConfig | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data: studio, error } = await supabase
      .from('bs_studios')
      .select('booking_model, soft_hold_length, opening_hours, cancellation_window_hours, cancellation_policy, session_types, waitlist_config')
      .eq('id', studioId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching studio config:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!studio) {
      return { data: null, error: null };
    }

    return {
      data: {
        booking_model: (studio.booking_model as string) || null,
        soft_hold_length: (studio.soft_hold_length as number) ?? null,
        opening_hours: (studio.opening_hours as OpeningHours) || {},
        cancellation_window_hours: (studio.cancellation_window_hours as number) ?? null,
        cancellation_policy: (studio.cancellation_policy as CancellationPolicy) || {},
        session_types: (studio.session_types as string[]) || [],
        waitlist_config: (studio.waitlist_config as Record<string, unknown>) || null,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error in getStudioConfig:', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Check whether a scheduled booking falls within the studio's opening hours.
 *
 * @param openingHours - The studio's opening hours config (keyed by day-of-week "0"-"6")
 * @param scheduledAt  - ISO 8601 datetime string for the booking start
 * @param durationMinutes - Duration of the booking in minutes
 * @returns `{ valid: true }` or `{ valid: false, reason: "..." }`
 */
export function isWithinOpeningHours(
  openingHours: OpeningHours,
  scheduledAt: string,
  durationMinutes: number
): { valid: boolean; reason?: string } {
  // If opening hours are empty / not configured, allow all bookings
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return { valid: true };
  }

  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const dayOfWeek = String(start.getDay()); // "0"-"6"
  const dayConfig = openingHours[dayOfWeek];

  if (!dayConfig || !dayConfig.enabled) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      valid: false,
      reason: `The studio is closed on ${dayNames[start.getDay()]}`,
    };
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  // Check if the booking fits within any of the day's slots
  for (const slot of dayConfig.slots) {
    const [slotStartH, slotStartM] = slot.start.split(':').map(Number);
    const [slotEndH, slotEndM] = slot.end.split(':').map(Number);
    const slotStart = slotStartH * 60 + slotStartM;
    const slotEnd = slotEndH * 60 + slotEndM;

    if (startMinutes >= slotStart && endMinutes <= slotEnd) {
      return { valid: true };
    }
  }

  // Build a human-readable hours string for the error message
  const hoursStr = dayConfig.slots
    .map((s: OpeningHoursSlot) => `${s.start}-${s.end}`)
    .join(', ');

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    valid: false,
    reason: `The selected time is outside studio operating hours (${dayNames[start.getDay()]} ${hoursStr})`,
  };
}

export async function getOrCreateStudio(
  userId: string,
  role: string,
  firstName?: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Check if a studio already exists for this user
    const { data: existingStudio } = await supabase
      .from('bs_studios')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (existingStudio) {
      // Also update bs_staff to link to this studio if not already linked
      await supabase
        .from('bs_staff')
        .update({ studio_id: existingStudio.id })
        .eq('id', userId)
        .is('studio_id', null);

      return { data: { id: existingStudio.id }, error: null };
    }

    // Only solo_practitioner / studio_owner can auto-create studios
    if (role !== 'solo_practitioner' && role !== 'studio_owner') {
      return { data: null, error: new Error('No studio associated with your account') };
    }

    const studioConfig = {
      name: firstName ? `${firstName}'s Studio` : 'My Studio',
      studio_type: 'fitness',
      license_level: role === 'solo_practitioner' ? 'single-site' : 'starter',
    };

    const { data: newStudio, error: studioError } = await supabase
      .from('bs_studios')
      .insert({
        ...studioConfig,
        owner_id: userId,
        plan: 'free',
        platform_version: 'v2',
      })
      .select()
      .single();

    if (studioError) {
      console.error(`Error creating studio for ${role}:`, studioError);
      return { data: null, error: new Error(`Could not create studio for ${role}`) };
    }

    // Update bs_staff to link to the new studio
    await supabase
      .from('bs_staff')
      .update({ studio_id: newStudio.id })
      .eq('id', userId)
      .is('studio_id', null);

    return { data: { id: newStudio.id }, error: null };
  } catch (err) {
    console.error('Error in getOrCreateStudio:', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
