/**
 * Service Service
 *
 * Business logic for ta_services CRUD operations.
 * Extracted from api/services route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  duration: number;
  type: string;
  max_capacity: number;
  credits_required: number;
  color: string;
  is_active: boolean;
  requires_approval: boolean;
  created_by: string;
  created_at: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  duration: number;
  type?: string;
  maxCapacity?: number;
  max_capacity?: number;
  creditsRequired?: number;
  credits_required?: number;
  color?: string;
  isActive?: boolean;
  requiresApproval?: boolean;
  requires_approval?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  duration?: number;
  type?: string;
  maxCapacity?: number;
  max_capacity?: number;
  creditsRequired?: number;
  credits_required?: number;
  color?: string;
  isActive?: boolean;
  is_active?: boolean;
  requiresApproval?: boolean;
  requires_approval?: boolean;
}

// ── Default services seeded for new studios/practitioners ────────────────────

export const DEFAULT_SERVICES = [
  { name: '30min PT Session', duration: 30, credits_required: 1, color: '#12229D', type: '1-2-1' },
  { name: '45min PT Session', duration: 45, credits_required: 1.5, color: '#A71075', type: '1-2-1' },
  { name: '60min PT Session', duration: 60, credits_required: 2, color: '#AB1D79', type: '1-2-1' },
  { name: '75min PT Session', duration: 75, credits_required: 2.5, color: '#F4B324', type: '1-2-1' },
  { name: '90min PT Session', duration: 90, credits_required: 3, color: '#12229D', type: '1-2-1' },
];

// ── Service functions ────────────────────────────────────────────────────────

/**
 * Fetch services for a studio/user. Seeds defaults when none exist.
 */
export async function getServices(
  studioId: string,
  userId: string,
  options?: { activeOnly?: boolean }
): Promise<{ data: ServiceRow[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ta_services')
      .select('*')
      .or(`studio_id.eq.${studioId},created_by.eq.${userId}`)
      .order('duration', { ascending: true });

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: services, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Seed defaults when no services exist
    if (!services || services.length === 0) {
      const rows = DEFAULT_SERVICES.map((s) => ({
        ...s,
        studio_id: studioId,
        created_by: userId,
        is_active: true,
        max_capacity: 1,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from('ta_services')
        .insert(rows)
        .select();

      if (seedError) {
        console.error('Error seeding default services:', seedError);
        return { data: [], error: null };
      }

      return { data: (seeded || []) as ServiceRow[], error: null };
    }

    return { data: services as ServiceRow[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new service.
 */
export async function createService(
  studioId: string,
  userId: string,
  input: CreateServiceInput
): Promise<{ data: ServiceRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const row = {
      studio_id: studioId,
      name: input.name,
      description: input.description || null,
      duration: input.duration,
      type: input.type || '1-2-1',
      max_capacity: input.maxCapacity || input.max_capacity || 1,
      credits_required: input.creditsRequired || input.credits_required || 1,
      color: input.color || '#12229D',
      is_active: input.isActive !== undefined ? input.isActive : true,
      requires_approval: input.requiresApproval ?? input.requires_approval ?? false,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('ta_services')
      .insert(row)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as ServiceRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing service.
 */
export async function updateService(
  serviceId: string,
  input: UpdateServiceInput
): Promise<{ data: ServiceRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.maxCapacity !== undefined || input.max_capacity !== undefined) {
      updateData.max_capacity = input.maxCapacity || input.max_capacity;
    }
    if (input.creditsRequired !== undefined || input.credits_required !== undefined) {
      updateData.credits_required = input.creditsRequired || input.credits_required;
    }
    if (input.color !== undefined) updateData.color = input.color;
    if (input.isActive !== undefined || input.is_active !== undefined) {
      updateData.is_active = input.isActive !== undefined ? input.isActive : input.is_active;
    }
    if (input.requiresApproval !== undefined || input.requires_approval !== undefined) {
      updateData.requires_approval = input.requiresApproval !== undefined ? input.requiresApproval : input.requires_approval;
    }

    const { data, error } = await supabase
      .from('ta_services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as ServiceRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Soft-delete a service (sets is_active = false).
 */
export async function deleteService(
  serviceId: string
): Promise<{ data: ServiceRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('ta_services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as ServiceRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
