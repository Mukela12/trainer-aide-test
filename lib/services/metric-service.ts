/**
 * Metric Service
 *
 * Business logic for body-metric operations.
 * Extracted from api/clients/[id]/metrics and api/metrics/[id] routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  BodyMetric,
  CreateBodyMetricInput,
  UpdateBodyMetricInput,
} from '@/lib/types/body-metrics';

// ── Client-scoped queries ──────────────────────────────────────────

/**
 * List body metrics for a client with pagination and optional date range.
 */
export async function getClientMetrics(
  clientId: string,
  options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
): Promise<{
  data: {
    metrics: BodyMetric[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    const limit: number = options?.limit ?? 50;
    const offset: number = options?.offset ?? 0;

    let query = supabase
      .from('ta_body_metrics')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.startDate) {
      query = query.gte('recorded_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('recorded_at', options.endDate);
    }

    const { data: metrics, error, count } = await query;

    if (error) {
      console.error('Error fetching body metrics:', error);
      return { data: null, error: new Error(error.message) };
    }

    const total: number = count ?? 0;

    return {
      data: {
        metrics: (metrics ?? []) as BodyMetric[],
        pagination: {
          total,
          limit,
          offset,
          hasMore: total > offset + limit,
        },
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new body metric record for a client.
 */
export async function createBodyMetric(
  clientId: string,
  trainerId: string,
  input: CreateBodyMetricInput
): Promise<{ data: BodyMetric | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const metricData = {
      client_id: clientId,
      trainer_id: trainerId,
      recorded_by: trainerId,
      recorded_at: input.recorded_at || new Date().toISOString(),
      weight_kg: input.weight_kg ?? null,
      body_fat_percent: input.body_fat_percent ?? null,
      muscle_mass_kg: input.muscle_mass_kg ?? null,
      chest_cm: input.chest_cm ?? null,
      waist_cm: input.waist_cm ?? null,
      hips_cm: input.hips_cm ?? null,
      arm_left_cm: input.arm_left_cm ?? null,
      arm_right_cm: input.arm_right_cm ?? null,
      thigh_left_cm: input.thigh_left_cm ?? null,
      thigh_right_cm: input.thigh_right_cm ?? null,
      resting_heart_rate: input.resting_heart_rate ?? null,
      blood_pressure_systolic: input.blood_pressure_systolic ?? null,
      blood_pressure_diastolic: input.blood_pressure_diastolic ?? null,
      notes: input.notes ?? null,
      photo_urls: input.photo_urls || [],
    };

    const { data: metric, error } = await supabase
      .from('ta_body_metrics')
      .insert(metricData)
      .select()
      .single();

    if (error) {
      console.error('Error creating body metric:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: metric as BodyMetric, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ── Single-metric queries ──────────────────────────────────────────

/**
 * Fetch a single body metric by id.
 * Returns a "Metric not found" error for PGRST116.
 */
export async function getMetricById(
  metricId: string
): Promise<{ data: BodyMetric | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: metric, error } = await supabase
      .from('ta_body_metrics')
      .select('*')
      .eq('id', metricId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Metric not found') };
      }
      console.error('Error fetching metric:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: metric as BodyMetric, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a body metric by id.
 * Returns a "Metric not found" error for PGRST116.
 */
export async function updateMetric(
  metricId: string,
  input: UpdateBodyMetricInput
): Promise<{ data: BodyMetric | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};

    if (input.recorded_at !== undefined) updateData.recorded_at = input.recorded_at;
    if (input.weight_kg !== undefined) updateData.weight_kg = input.weight_kg;
    if (input.body_fat_percent !== undefined) updateData.body_fat_percent = input.body_fat_percent;
    if (input.muscle_mass_kg !== undefined) updateData.muscle_mass_kg = input.muscle_mass_kg;
    if (input.chest_cm !== undefined) updateData.chest_cm = input.chest_cm;
    if (input.waist_cm !== undefined) updateData.waist_cm = input.waist_cm;
    if (input.hips_cm !== undefined) updateData.hips_cm = input.hips_cm;
    if (input.arm_left_cm !== undefined) updateData.arm_left_cm = input.arm_left_cm;
    if (input.arm_right_cm !== undefined) updateData.arm_right_cm = input.arm_right_cm;
    if (input.thigh_left_cm !== undefined) updateData.thigh_left_cm = input.thigh_left_cm;
    if (input.thigh_right_cm !== undefined) updateData.thigh_right_cm = input.thigh_right_cm;
    if (input.resting_heart_rate !== undefined) updateData.resting_heart_rate = input.resting_heart_rate;
    if (input.blood_pressure_systolic !== undefined) updateData.blood_pressure_systolic = input.blood_pressure_systolic;
    if (input.blood_pressure_diastolic !== undefined) updateData.blood_pressure_diastolic = input.blood_pressure_diastolic;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.photo_urls !== undefined) updateData.photo_urls = input.photo_urls;

    const { data: metric, error } = await supabase
      .from('ta_body_metrics')
      .update(updateData)
      .eq('id', metricId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Metric not found') };
      }
      console.error('Error updating metric:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: metric as BodyMetric, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a body metric by id.
 */
export async function deleteMetric(
  metricId: string
): Promise<{ data: null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_body_metrics')
      .delete()
      .eq('id', metricId);

    if (error) {
      console.error('Error deleting metric:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
