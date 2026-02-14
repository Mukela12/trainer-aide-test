/**
 * Package Service
 *
 * Business logic for training package CRUD operations.
 * Extracted from api/packages route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  session_count: number;
  price_cents: number;
  validity_days: number;
  per_session_price_cents: number;
  savings_percent: number | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  trainer_id: string;
}

export interface FormattedPackage {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number;
  perSessionPriceCents: number;
  savingsPercent: number | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface FormattedClientPackage {
  id: string;
  clientName: string;
  packageName: string;
  creditsRemaining: number;
  creditsTotal: number;
  expiresAt: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPackage(p: PackageRow): FormattedPackage {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    sessionCount: p.session_count,
    priceCents: p.price_cents,
    validityDays: p.validity_days,
    perSessionPriceCents: p.per_session_price_cents,
    savingsPercent: p.savings_percent,
    isActive: p.is_active,
    isPublic: p.is_public,
    createdAt: p.created_at,
  };
}

/* ------------------------------------------------------------------ */
/*  getPackages                                                        */
/* ------------------------------------------------------------------ */

interface GetPackagesOptions {
  publicOnly?: boolean;
  format?: string;
}

interface GetPackagesResult {
  packages: FormattedPackage[];
  clientPackages?: FormattedClientPackage[];
}

export async function getPackages(
  trainerId: string,
  options?: GetPackagesOptions
): Promise<{ data: GetPackagesResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ta_packages')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (options?.publicOnly) {
      query = query.eq('is_public', true).eq('is_active', true);
    }

    const { data: packages, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const formattedPackages = (packages as PackageRow[]).map(
      (p: PackageRow): FormattedPackage => formatPackage(p)
    );

    // Wrapped format includes client packages (used by studio-owner pages)
    if (options?.format === 'wrapped') {
      const { data: clientPackages, error: cpError } = await supabase
        .from('ta_client_packages')
        .select(`
          id,
          credits_remaining,
          credits_total,
          expires_at,
          fc_clients!inner(first_name, last_name),
          ta_packages!inner(name)
        `)
        .eq('ta_packages.trainer_id', trainerId)
        .eq('is_active', true);

      if (cpError) {
        return { data: null, error: new Error(cpError.message) };
      }

      const formattedClientPackages = (clientPackages || []).map(
        (cp: Record<string, unknown>): FormattedClientPackage => ({
          id: cp.id as string,
          clientName: `${(cp.fc_clients as Record<string, string>)?.first_name || ''} ${(cp.fc_clients as Record<string, string>)?.last_name || ''}`.trim(),
          packageName: (cp.ta_packages as Record<string, string>)?.name || '',
          creditsRemaining: cp.credits_remaining as number,
          creditsTotal: cp.credits_total as number,
          expiresAt: cp.expires_at as string | null,
        })
      );

      return {
        data: { packages: formattedPackages, clientPackages: formattedClientPackages },
        error: null,
      };
    }

    return { data: { packages: formattedPackages }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/* ------------------------------------------------------------------ */
/*  createPackage                                                      */
/* ------------------------------------------------------------------ */

interface CreatePackageInput {
  name: string;
  description?: string;
  sessionCount: number;
  priceCents: number;
  validityDays?: number;
  isPublic?: boolean;
}

export async function createPackage(
  trainerId: string,
  input: CreatePackageInput
): Promise<{ data: FormattedPackage | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const perSessionPriceCents = Math.round(input.priceCents / input.sessionCount);

    const { data: newPackage, error } = await supabase
      .from('ta_packages')
      .insert({
        trainer_id: trainerId,
        name: input.name,
        description: input.description || null,
        session_count: input.sessionCount,
        price_cents: input.priceCents,
        validity_days: input.validityDays || 90,
        per_session_price_cents: perSessionPriceCents,
        is_active: true,
        is_public: input.isPublic !== false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: formatPackage(newPackage as PackageRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/* ------------------------------------------------------------------ */
/*  deletePackage                                                      */
/* ------------------------------------------------------------------ */

export async function deletePackage(
  packageId: string,
  trainerId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_packages')
      .update({ is_active: false })
      .eq('id', packageId)
      .eq('trainer_id', trainerId);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
