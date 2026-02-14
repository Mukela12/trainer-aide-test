/**
 * Client Studio Service
 *
 * Business logic for fetching studio-related data from a client's perspective.
 * Extracted from api/client/studio/trainers and api/client/studio/services routes.
 *
 * Both functions share a common pattern:
 * 1. Find client by email (case-insensitive)
 * 2. Build lookup IDs from studio_id, invited_by, bs_staff, bs_studios
 * 3. Query the target resource using those IDs
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getStudioConfig } from '@/lib/services/studio-service';

// ── Public types ──────────────────────────────────────────────────────────────

export interface StudioTrainer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface StudioService {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  creditsRequired: number;
  type: string;
  color: string | null;
}

// ── Private types ─────────────────────────────────────────────────────────────

interface ClientRecord {
  id: string;
  studio_id: string | null;
  invited_by: string | null;
}

interface ClientLookupResult {
  client: ClientRecord;
  lookupIds: string[];
  studioId: string | null;
}

// ── Shared helper ─────────────────────────────────────────────────────────────

/**
 * Find a client by email and build the set of IDs used to look up
 * studio-scoped resources (trainers, services, availability, etc.).
 *
 * The lookup IDs may include:
 * - client.studio_id
 * - client.invited_by
 * - inviter's studio_id (from bs_staff)
 * - studio owner_id (from bs_studios)
 *
 * As a side-effect, if the inviter's studio_id is found and the client's
 * studio_id is null, the client row is updated.
 */
async function resolveClientLookup(
  userEmail: string
): Promise<{ data: ClientLookupResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Find client by email (case-insensitive)
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by')
      .ilike('email', userEmail)
      .maybeSingle();

    if (!client) {
      return { data: null, error: new Error('Client not found') };
    }

    let studioId: string | null = client.studio_id;
    const lookupIds: string[] = [];

    if (studioId) {
      lookupIds.push(studioId);
    }

    // If client was invited, the inviter's ID might match studio_id or created_by
    if (client.invited_by) {
      if (!lookupIds.includes(client.invited_by)) {
        lookupIds.push(client.invited_by);
      }

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
          studioId = inviterStaff.studio_id;
          await supabase
            .from('fc_clients')
            .update({ studio_id: inviterStaff.studio_id })
            .eq('id', client.id);
        }
      }
    }

    // If studio_id might be a bs_studios.id, also include the owner_id
    if (studioId) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('owner_id')
        .eq('id', studioId)
        .maybeSingle();

      if (studio?.owner_id && !lookupIds.includes(studio.owner_id)) {
        lookupIds.push(studio.owner_id);
      }
    }

    return {
      data: { client, lookupIds: [...new Set(lookupIds)], studioId },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// ── Public functions ──────────────────────────────────────────────────────────

/**
 * Get trainers at the client's studio.
 *
 * Uses a 4-strategy lookup:
 *   1. studio_id -> bs_staff (trainer/owner/instructor)
 *   2. invited_by -> inviter in bs_staff + other staff from inviter's studio;
 *      also checks profiles for solo practitioners
 *   3. studio_id as user ID -> profiles (solo practitioner)
 *   4. studio_id as bs_studios.id -> owner profile + bs_staff for that studio
 *
 * Deduplicates trainers by ID.
 */
export async function getClientStudioTrainers(
  userEmail: string
): Promise<{ data: StudioTrainer[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Find client by email (case-insensitive)
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by')
      .ilike('email', userEmail)
      .maybeSingle();

    if (!client) {
      return { data: null, error: new Error('Client not found') };
    }

    let studioId: string | null = client.studio_id;
    let trainers: StudioTrainer[] = [];

    // Strategy 1: Use client's studio_id if available
    if (studioId) {
      const { data: staff } = await supabase
        .from('bs_staff')
        .select('id, first_name, last_name, staff_type')
        .eq('studio_id', studioId)
        .in('staff_type', ['trainer', 'owner', 'instructor']);

      if (staff && staff.length > 0) {
        trainers = (staff as Array<{ id: string; first_name: string | null; last_name: string | null; staff_type: string }>).map(
          (s: { id: string; first_name: string | null; last_name: string | null; staff_type: string }) => ({
            id: s.id,
            firstName: s.first_name || '',
            lastName: s.last_name || '',
            fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
          })
        );
      }
    }

    // Strategy 2: If no trainers found and client was invited, find through inviter
    if (trainers.length === 0 && client.invited_by) {
      const { data: inviterStaff } = await supabase
        .from('bs_staff')
        .select('id, studio_id, first_name, last_name, staff_type')
        .eq('id', client.invited_by)
        .maybeSingle();

      if (inviterStaff) {
        trainers.push({
          id: inviterStaff.id,
          firstName: inviterStaff.first_name || '',
          lastName: inviterStaff.last_name || '',
          fullName:
            `${inviterStaff.first_name || ''} ${inviterStaff.last_name || ''}`.trim() || 'Trainer',
        });

        // If the inviter has a studio_id, get other trainers from that studio
        if (inviterStaff.studio_id) {
          studioId = inviterStaff.studio_id;
          const { data: otherStaff } = await supabase
            .from('bs_staff')
            .select('id, first_name, last_name, staff_type')
            .eq('studio_id', inviterStaff.studio_id)
            .in('staff_type', ['trainer', 'owner', 'instructor'])
            .neq('id', client.invited_by);

          if (otherStaff && otherStaff.length > 0) {
            trainers.push(
              ...(otherStaff as Array<{ id: string; first_name: string | null; last_name: string | null; staff_type: string }>).map(
                (s: { id: string; first_name: string | null; last_name: string | null; staff_type: string }) => ({
                  id: s.id,
                  firstName: s.first_name || '',
                  lastName: s.last_name || '',
                  fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
                })
              )
            );
          }

          // Update the client's studio_id if it was NULL
          if (!client.studio_id) {
            await supabase
              .from('fc_clients')
              .update({ studio_id: inviterStaff.studio_id })
              .eq('id', client.id);
          }
        }
      }

      // Also check profiles table for inviter (solo practitioners)
      if (trainers.length === 0) {
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .eq('id', client.invited_by)
          .maybeSingle();

        if (
          inviterProfile &&
          ['solo_practitioner', 'studio_owner', 'trainer'].includes(inviterProfile.role || '')
        ) {
          trainers.push({
            id: inviterProfile.id,
            firstName: inviterProfile.first_name || '',
            lastName: inviterProfile.last_name || '',
            fullName:
              `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() ||
              'Trainer',
          });

          // For solo practitioners, the user.id IS the studio_id
          if (!client.studio_id) {
            await supabase
              .from('fc_clients')
              .update({ studio_id: client.invited_by })
              .eq('id', client.id);
          }
        }
      }
    }

    // Strategy 3: If studio_id points to a user (solo practitioner model)
    if (trainers.length === 0 && studioId) {
      const { data: soloProfile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', studioId)
        .maybeSingle();

      if (
        soloProfile &&
        ['solo_practitioner', 'studio_owner', 'trainer'].includes(soloProfile.role || '')
      ) {
        trainers.push({
          id: soloProfile.id,
          firstName: soloProfile.first_name || '',
          lastName: soloProfile.last_name || '',
          fullName:
            `${soloProfile.first_name || ''} ${soloProfile.last_name || ''}`.trim() || 'Trainer',
        });
      }
    }

    // Strategy 4: Check if studio_id is a bs_studios.id and find the owner
    if (trainers.length === 0 && studioId) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('id, owner_id')
        .eq('id', studioId)
        .maybeSingle();

      if (studio?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', studio.owner_id)
          .maybeSingle();

        if (ownerProfile) {
          trainers.push({
            id: ownerProfile.id,
            firstName: ownerProfile.first_name || '',
            lastName: ownerProfile.last_name || '',
            fullName:
              `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() ||
              'Studio Owner',
          });
        }

        // Also check bs_staff for trainers with this studio_id OR owner_id as studio_id
        const { data: moreStaff } = await supabase
          .from('bs_staff')
          .select('id, first_name, last_name, staff_type')
          .or(`studio_id.eq.${studioId},studio_id.eq.${studio.owner_id}`)
          .in('staff_type', ['trainer', 'owner', 'instructor']);

        if (moreStaff && moreStaff.length > 0) {
          const existingIds = new Set(trainers.map((t: StudioTrainer) => t.id));
          trainers.push(
            ...(moreStaff as Array<{ id: string; first_name: string | null; last_name: string | null; staff_type: string }>)
              .filter((s: { id: string; first_name: string | null; last_name: string | null; staff_type: string }) => !existingIds.has(s.id))
              .map((s: { id: string; first_name: string | null; last_name: string | null; staff_type: string }) => ({
                id: s.id,
                firstName: s.first_name || '',
                lastName: s.last_name || '',
                fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
              }))
          );
        }
      }
    }

    // Deduplicate trainers by ID
    const uniqueTrainers = Array.from(
      new Map(trainers.map((t: StudioTrainer) => [t.id, t])).values()
    );

    return { data: uniqueTrainers, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Get bookable services for the client's studio.
 *
 * Uses the shared multi-strategy lookup:
 * 1. Find client by email (ilike)
 * 2. Build lookupIds from studio_id, invited_by, bs_staff, bs_studios
 * 3. Query ta_services where studio_id or created_by matches any lookupId,
 *    filtered to is_active=true and is_public=true
 * 4. Deduplicate by ID and return camelCase mapped services
 */
export async function getClientStudioServices(
  userEmail: string
): Promise<{ data: StudioService[] | null; error: Error | null }> {
  try {
    const lookupResult = await resolveClientLookup(userEmail);

    if (lookupResult.error || !lookupResult.data) {
      return { data: null, error: lookupResult.error };
    }

    const { lookupIds, studioId } = lookupResult.data;

    if (lookupIds.length === 0) {
      return { data: [], error: null };
    }

    const supabase = createServiceRoleClient();

    // Fetch studio config for session_types filtering
    let sessionTypes: string[] = [];
    if (studioId) {
      const { data: studioCfg } = await getStudioConfig(studioId);
      if (studioCfg?.session_types && studioCfg.session_types.length > 0) {
        sessionTypes = studioCfg.session_types;
      }
    }

    // Query services where studio_id or created_by matches any lookup ID
    let serviceQuery = supabase
      .from('ta_services')
      .select(`
        id,
        name,
        description,
        duration,
        credits_required,
        type,
        color,
        studio_id,
        created_by
      `)
      .or(
        lookupIds.map((id: string) => `studio_id.eq.${id}`).join(',') +
          ',' +
          lookupIds.map((id: string) => `created_by.eq.${id}`).join(',')
      )
      .eq('is_active', true)
      .eq('is_public', true);

    // Filter by studio's configured session types
    if (sessionTypes.length > 0) {
      serviceQuery = serviceQuery.in('type', sessionTypes);
    }

    const { data: serviceData, error: queryError } = await serviceQuery.order('name');

    if (queryError) {
      return { data: null, error: new Error(queryError.message) };
    }

    // Deduplicate services by ID
    const uniqueServices = Array.from(
      new Map(
        ((serviceData || []) as Array<{
          id: string;
          name: string;
          description: string | null;
          duration: number;
          credits_required: number;
          type: string;
          color: string | null;
        }>).map(
          (s: {
            id: string;
            name: string;
            description: string | null;
            duration: number;
            credits_required: number;
            type: string;
            color: string | null;
          }) => [s.id, s]
        )
      ).values()
    );

    const services: StudioService[] = uniqueServices.map(
      (s: {
        id: string;
        name: string;
        description: string | null;
        duration: number;
        credits_required: number;
        type: string;
        color: string | null;
      }) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        creditsRequired: s.credits_required,
        type: s.type,
        color: s.color,
      })
    );

    return { data: services, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
