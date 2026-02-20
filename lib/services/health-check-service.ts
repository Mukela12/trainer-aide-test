/**
 * Health Check Service
 *
 * Manages PAR-Q health questionnaire data for clients.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

export interface HealthCheckData {
  id: string;
  client_id: string;
  studio_id: string | null;
  responses: Record<string, boolean>;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_conditions: boolean;
  completed_at: string;
  expires_at: string;
  created_at: string;
}

/**
 * Fetch the latest health check for a client.
 */
export async function getHealthCheck(
  clientId: string
): Promise<{ data: HealthCheckData | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('ta_health_checks')
      .select('*')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as HealthCheckData | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new health check record and update the client's health_check_completed_at.
 */
export async function createHealthCheck(
  clientId: string,
  studioId: string | null,
  data: {
    responses: Record<string, boolean>;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    has_conditions: boolean;
  }
): Promise<{ data: HealthCheckData | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: healthCheck, error } = await supabase
      .from('ta_health_checks')
      .insert({
        client_id: clientId,
        studio_id: studioId,
        responses: data.responses,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        has_conditions: data.has_conditions,
        completed_at: now,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Update fc_clients.health_check_completed_at for quick lookup
    await supabase
      .from('fc_clients')
      .update({ health_check_completed_at: now })
      .eq('id', clientId);

    return { data: healthCheck as HealthCheckData, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Check if a client has a valid (non-expired) health check.
 */
export async function isHealthCheckValid(
  clientId: string
): Promise<{ valid: boolean; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('fc_clients')
      .select('health_check_completed_at')
      .eq('id', clientId)
      .single();

    if (error) {
      return { valid: false, error: new Error(error.message) };
    }

    if (!data?.health_check_completed_at) {
      return { valid: false, error: null };
    }

    // Check if the health check is less than 6 months old
    const completedAt = new Date(data.health_check_completed_at);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return { valid: completedAt > sixMonthsAgo, error: null };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
