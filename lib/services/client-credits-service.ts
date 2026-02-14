/**
 * Client Credits Service
 *
 * Business logic for client credit operations: query, add, and deduct.
 * Extracted from api/clients/[id]/credits route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientPackage {
  id: string;
  packageName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt: string;
  expiresAt: string;
  status: string;
}

type CreditStatus = 'none' | 'low' | 'medium' | 'good';

interface ClientCreditsResult {
  totalCredits: number;
  creditStatus: CreditStatus;
  nearestExpiry: string | null;
  packages: ClientPackage[];
}

interface AddCreditsResult {
  success: true;
  creditsAdded: number;
  expiresAt: string;
}

interface DeductCreditsResult {
  success: boolean;
  creditsDeducted: number;
}

interface AddCreditsInput {
  packageId: string;
  sessions: number;
  notes?: string;
}

// ── Service Functions ────────────────────────────────────────────────────────

/**
 * Fetch all client packages and compute credit totals.
 */
export async function getClientCredits(
  clientId: string,
  trainerId: string
): Promise<{ data: ClientCreditsResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: packages, error } = await supabase
      .from('ta_client_packages')
      .select(`
        id,
        sessions_total,
        sessions_used,
        sessions_remaining,
        purchased_at,
        expires_at,
        status,
        ta_packages (
          name,
          price_cents
        )
      `)
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId)
      .order('expires_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const rows = (packages || []) as Array<{
      id: string;
      sessions_total: number;
      sessions_used: number;
      sessions_remaining: number;
      purchased_at: string;
      expires_at: string;
      status: string;
      ta_packages: { name?: string; price_cents?: number } | null;
    }>;

    // Calculate totals from active packages
    const activePackages = rows.filter(
      (p: { status: string }) => p.status === 'active'
    );
    const totalCredits = activePackages.reduce(
      (sum: number, p: { sessions_remaining: number }) =>
        sum + p.sessions_remaining,
      0
    );
    const nearestExpiry =
      activePackages.length > 0 ? activePackages[0].expires_at : null;

    // Determine credit status
    let creditStatus: CreditStatus = 'none';
    if (totalCredits > 5) creditStatus = 'good';
    else if (totalCredits > 2) creditStatus = 'medium';
    else if (totalCredits > 0) creditStatus = 'low';

    // Map to camelCase
    const mappedPackages: ClientPackage[] = rows.map(
      (p: {
        id: string;
        sessions_total: number;
        sessions_used: number;
        sessions_remaining: number;
        purchased_at: string;
        expires_at: string;
        status: string;
        ta_packages: { name?: string; price_cents?: number } | null;
      }) => ({
        id: p.id,
        packageName:
          (p.ta_packages as { name?: string; price_cents?: number } | null)
            ?.name || 'Unknown Package',
        sessionsTotal: p.sessions_total,
        sessionsUsed: p.sessions_used,
        sessionsRemaining: p.sessions_remaining,
        purchasedAt: p.purchased_at,
        expiresAt: p.expires_at,
        status: p.status,
      })
    );

    return {
      data: { totalCredits, creditStatus, nearestExpiry, packages: mappedPackages },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Manually add credits to a client by creating a client_package record
 * and logging the addition in ta_credit_usage.
 */
export async function addClientCredits(
  clientId: string,
  trainerId: string,
  input: AddCreditsInput
): Promise<{ data: AddCreditsResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Get package details for validity_days
    const { data: pkg } = await supabase
      .from('ta_packages')
      .select('validity_days')
      .eq('id', input.packageId)
      .single();

    const validityDays: number = (pkg as { validity_days?: number } | null)?.validity_days || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Create client package (manual addition - no payment)
    const { data: clientPackage, error: insertError } = await supabase
      .from('ta_client_packages')
      .insert({
        client_id: clientId,
        package_id: input.packageId,
        trainer_id: trainerId,
        sessions_total: input.sessions,
        sessions_used: 0,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        notes: input.notes || 'Manual credit addition',
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: new Error(insertError.message) };
    }

    // Log the credit addition
    await supabase.from('ta_credit_usage').insert({
      client_package_id: (clientPackage as { id: string }).id,
      credits_used: -input.sessions, // Negative = addition
      balance_after: input.sessions,
      reason: 'manual_addition',
      notes: input.notes,
      created_by: trainerId,
    });

    return {
      data: {
        success: true,
        creditsAdded: input.sessions,
        expiresAt: expiresAt.toISOString(),
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Deduct credits from a client using the database FIFO function.
 */
export async function deductClientCredits(
  clientId: string,
  trainerId: string,
  sessions: number
): Promise<{ data: DeductCreditsResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error: deductError } = await supabase.rpc(
      'deduct_client_credit',
      {
        p_client_id: clientId,
        p_trainer_id: trainerId,
        p_booking_id: null,
        p_credits: sessions,
      }
    );

    if (deductError) {
      return { data: null, error: new Error(deductError.message) };
    }

    return {
      data: {
        success: data as boolean,
        creditsDeducted: (data as boolean) ? sessions : 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
