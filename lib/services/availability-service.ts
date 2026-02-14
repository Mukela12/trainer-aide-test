/**
 * Availability Service
 *
 * Business logic for trainer availability operations.
 * Extracted from api/availability and api/client/studio/availability routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getStudioConfig } from '@/lib/services/studio-service';
import type { OpeningHours } from '@/lib/services/studio-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailabilityBlockInput {
  trainerId?: string;
  trainer_id?: string;
  blockType?: string;
  block_type?: string;
  recurrence?: string;
  dayOfWeek?: number | null;
  day_of_week?: number | null;
  startHour?: number | null;
  start_hour?: number | null;
  startMinute?: number | null;
  start_minute?: number | null;
  endHour?: number | null;
  end_hour?: number | null;
  endMinute?: number | null;
  end_minute?: number | null;
  specificDate?: string | null;
  specific_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export interface AvailabilityBlockUpdateInput extends AvailabilityBlockInput {
  id?: string; // not used by service (blockId is a separate param) but kept for compat
}

export interface ClientAvailabilitySlot {
  id: string;
  trainerId: string;
  trainerName: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  recurrence: string;
  specificDate: string | null;
}

export interface ExistingBooking {
  id: string;
  trainerId: string;
  scheduledAt: string;
  duration: number;
  status: string;
}

export interface ClientStudioAvailabilityResult {
  availability: ClientAvailabilitySlot[];
  existingBookings: ExistingBooking[];
}

// ---------------------------------------------------------------------------
// Default availability to seed for new trainers
// ---------------------------------------------------------------------------

export const DEFAULT_AVAILABILITY = [
  // Monday - Friday: 6am - 8pm
  { day_of_week: 1, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 2, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 3, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 4, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 5, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  // Saturday: 7am - 12pm
  { day_of_week: 6, start_hour: 7, start_minute: 0, end_hour: 12, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  // Lunch break Mon-Fri: 12pm - 1pm
  { day_of_week: 1, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 2, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 3, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 4, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 5, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
];

// ---------------------------------------------------------------------------
// Trainer-facing CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch availability blocks for a trainer. Seeds defaults when empty.
 */
export async function getAvailability(
  trainerId: string,
  studioId: string,
  blockType?: string | null
): Promise<{ data: unknown[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ta_availability')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week', { ascending: true })
      .order('start_hour', { ascending: true });

    if (blockType) {
      query = query.eq('block_type', blockType);
    }

    const { data: availability, error } = await query;

    if (error) {
      console.error('Error fetching availability:', error);
      return { data: null, error: new Error(error.message) };
    }

    // If no availability exists, seed default availability
    if (!availability || availability.length === 0) {
      const defaultBlocks = DEFAULT_AVAILABILITY.map((block: typeof DEFAULT_AVAILABILITY[number]) => ({
        ...block,
        trainer_id: trainerId,
        studio_id: studioId,
      }));

      const { data: seededAvailability, error: seedError } = await supabase
        .from('ta_availability')
        .insert(defaultBlocks)
        .select();

      if (seedError) {
        console.error('Error seeding default availability:', seedError);
        // Return empty array instead of failing
        return { data: [], error: null };
      }

      return { data: seededAvailability || [], error: null };
    }

    return { data: availability, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new availability block.
 */
export async function createAvailabilityBlock(
  trainerId: string,
  studioId: string,
  input: AvailabilityBlockInput
): Promise<{ data: unknown | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const blockData = {
      trainer_id: input.trainerId || input.trainer_id || trainerId,
      studio_id: studioId,
      block_type: input.blockType || input.block_type,
      recurrence: input.recurrence || 'weekly',
      day_of_week: input.dayOfWeek ?? input.day_of_week ?? null,
      start_hour: input.startHour ?? input.start_hour ?? null,
      start_minute: input.startMinute ?? input.start_minute ?? 0,
      end_hour: input.endHour ?? input.end_hour ?? null,
      end_minute: input.endMinute ?? input.end_minute ?? 0,
      specific_date: input.specificDate || input.specific_date || null,
      end_date: input.endDate || input.end_date || null,
      reason: input.reason || null,
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('ta_availability')
      .insert(blockData)
      .select()
      .single();

    if (error) {
      console.error('Error creating availability block:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing availability block.
 */
export async function updateAvailabilityBlock(
  blockId: string,
  input: AvailabilityBlockUpdateInput
): Promise<{ data: unknown | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};

    if (input.blockType !== undefined || input.block_type !== undefined) {
      updateData.block_type = input.blockType || input.block_type;
    }
    if (input.recurrence !== undefined) updateData.recurrence = input.recurrence;
    if (input.dayOfWeek !== undefined || input.day_of_week !== undefined) {
      updateData.day_of_week = input.dayOfWeek ?? input.day_of_week;
    }
    if (input.startHour !== undefined || input.start_hour !== undefined) {
      updateData.start_hour = input.startHour ?? input.start_hour;
    }
    if (input.startMinute !== undefined || input.start_minute !== undefined) {
      updateData.start_minute = input.startMinute ?? input.start_minute;
    }
    if (input.endHour !== undefined || input.end_hour !== undefined) {
      updateData.end_hour = input.endHour ?? input.end_hour;
    }
    if (input.endMinute !== undefined || input.end_minute !== undefined) {
      updateData.end_minute = input.endMinute ?? input.end_minute;
    }
    if (input.specificDate !== undefined || input.specific_date !== undefined) {
      updateData.specific_date = input.specificDate || input.specific_date;
    }
    if (input.endDate !== undefined || input.end_date !== undefined) {
      updateData.end_date = input.endDate || input.end_date;
    }
    if (input.reason !== undefined) updateData.reason = input.reason;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('ta_availability')
      .update(updateData)
      .eq('id', blockId)
      .select()
      .single();

    if (error) {
      console.error('Error updating availability block:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete an availability block.
 */
export async function deleteAvailabilityBlock(
  blockId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_availability')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('Error deleting availability block:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ---------------------------------------------------------------------------
// Client-facing read-only
// ---------------------------------------------------------------------------

/**
 * Fetch trainer availability for a client's studio.
 *
 * Multi-strategy lookup to handle various studio configurations.
 * Uses service role client for database queries to bypass RLS
 * (clients need to see trainer availability but RLS blocks them).
 */
export async function getClientStudioAvailability(
  userEmail: string,
  trainerId?: string | null,
  date?: string | null
): Promise<{ data: ClientStudioAvailabilityResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Find the client record for this user by email (case-insensitive)
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by')
      .ilike('email', userEmail)
      .maybeSingle();

    if (!client) {
      return {
        data: null,
        error: new Error('Client not found'),
      };
    }

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
      // If specific trainer requested, use them directly
      trainerIds = [trainerId];
    } else if (uniqueLookupIds.length > 0) {
      // Get trainers from bs_staff matching any studio_id
      const { data: staff } = await supabase
        .from('bs_staff')
        .select('id')
        .in('studio_id', uniqueLookupIds)
        .in('staff_type', ['trainer', 'owner', 'instructor']);

      trainerIds = (staff || []).map((s: { id: string }) => s.id);

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
      return {
        data: { availability: [], existingBookings: [] },
        error: null,
      };
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

    const trainerMap = new Map<string, string>(
      (profiles || []).map((p: { id: string; first_name: string | null; last_name: string | null }) => [
        p.id,
        `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Trainer',
      ])
    );

    // Get availability blocks for the trainers
    // Search by BOTH trainer_id AND studio_id to handle all data patterns
    const trainerConditions = trainerIds.map((id: string) => `trainer_id.eq.${id}`).join(',');
    const studioConditions = uniqueLookupIds.map((id: string) => `studio_id.eq.${id}`).join(',');
    const orCondition = [trainerConditions, studioConditions].filter(Boolean).join(',');

    let availabilityQuery = supabase
      .from('ta_availability')
      .select('*')
      .or(orCondition)
      .eq('block_type', 'available');

    // If a specific date is provided, filter by day of week
    if (date) {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      availabilityQuery = availabilityQuery.eq('day_of_week', dayOfWeek);
    }

    const { data: availability, error: availError } = await availabilityQuery;

    if (availError) {
      console.error('Error fetching availability:', availError);
      return { data: null, error: new Error(availError.message) };
    }

    // Also add trainer names for any trainer_ids found in availability that we don't have yet
    const allTrainerIds = new Set<string>([
      ...trainerIds,
      ...(availability || []).map((a: { trainer_id: string }) => a.trainer_id).filter(Boolean),
    ]);

    // Fetch any missing trainer profiles
    const missingTrainerIds = [...allTrainerIds].filter((id: string) => !trainerMap.has(id));
    if (missingTrainerIds.length > 0) {
      const { data: moreProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', missingTrainerIds);

      (moreProfiles || []).forEach((p: { id: string; first_name: string | null; last_name: string | null }) => {
        trainerMap.set(p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Trainer');
      });
    }

    // Filter availability blocks by studio opening hours
    // Resolve which studioId to use for config — client.studio_id or first from uniqueLookupIds
    const resolvedStudioId = client.studio_id || uniqueLookupIds[0] || null;
    let studioOpeningHours: OpeningHours | null = null;

    if (resolvedStudioId) {
      const { data: studioCfg } = await getStudioConfig(resolvedStudioId);
      if (studioCfg?.opening_hours && Object.keys(studioCfg.opening_hours).length > 0) {
        studioOpeningHours = studioCfg.opening_hours;
      }
    }

    // Filter: clip or remove availability blocks that fall outside studio opening hours
    let filteredAvailability = availability || [];
    if (studioOpeningHours) {
      filteredAvailability = filteredAvailability.filter((a: {
        day_of_week: number;
        start_hour: number;
        start_minute: number;
        end_hour: number;
        end_minute: number;
      }) => {
        const dayKey = String(a.day_of_week);
        const dayConfig = studioOpeningHours![dayKey];

        // If the studio is closed on this day, exclude the availability block
        if (!dayConfig || !dayConfig.enabled || dayConfig.slots.length === 0) {
          return false;
        }

        // Check if the availability block overlaps with any opening hours slot
        const blockStart = a.start_hour * 60 + a.start_minute;
        const blockEnd = a.end_hour * 60 + a.end_minute;

        return dayConfig.slots.some((slot: { start: string; end: string }) => {
          const [slotStartH, slotStartM] = slot.start.split(':').map(Number);
          const [slotEndH, slotEndM] = slot.end.split(':').map(Number);
          const slotStart = slotStartH * 60 + slotStartM;
          const slotEnd = slotEndH * 60 + slotEndM;

          // Block overlaps with slot if block starts before slot ends AND block ends after slot starts
          return blockStart < slotEnd && blockEnd > slotStart;
        });
      });
    }

    // Get existing bookings to check for conflicts
    let bookingsQuery = supabase
      .from('ta_bookings')
      .select('id, trainer_id, scheduled_at, duration, status')
      .in('trainer_id', trainerIds)
      .in('status', ['confirmed', 'pending']);

    // If a specific date is provided, filter bookings for that date
    if (date) {
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
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
      return { data: null, error: new Error(bookingsError.message) };
    }

    return {
      data: {
        availability: filteredAvailability.map((a: {
          id: string;
          trainer_id: string;
          day_of_week: number;
          start_hour: number;
          start_minute: number;
          end_hour: number;
          end_minute: number;
          recurrence: string;
          specific_date: string | null;
        }) => ({
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
        existingBookings: (bookings || []).map((b: {
          id: string;
          trainer_id: string;
          scheduled_at: string;
          duration: number;
          status: string;
        }) => ({
          id: b.id,
          trainerId: b.trainer_id,
          scheduledAt: b.scheduled_at,
          duration: b.duration,
          status: b.status,
        })),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
