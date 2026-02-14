/**
 * Credit Bundle Service
 *
 * Business logic for credit bundle CRUD operations.
 * Extracted from api/credit-bundles route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

interface CreditBundleRow {
  id: string;
  name: string;
  credit_count: number;
  total_price: number;
  price_per_credit: number;
  expiry_days: number;
  is_active: boolean;
  owner_id: string;
  studio_id: string;
  created_at: string;
}

export async function getCreditBundles(
  userId: string,
  studioId: string
): Promise<{ data: CreditBundleRow[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: bundles, error } = await supabase
      .from('credit_bundles')
      .select('*')
      .or(`owner_id.eq.${userId},studio_id.eq.${studioId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: (bundles || []) as CreditBundleRow[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function createCreditBundle(params: {
  userId: string;
  studioId: string;
  name: string;
  creditCount: number;
  totalPrice: number;
  expiryDays?: number;
}): Promise<{ data: CreditBundleRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();
    const pricePerCredit = params.totalPrice / params.creditCount;

    const { data, error } = await supabase
      .from('credit_bundles')
      .insert({
        name: params.name,
        credit_count: params.creditCount,
        total_price: params.totalPrice,
        price_per_credit: pricePerCredit,
        expiry_days: params.expiryDays || 90,
        is_active: true,
        owner_id: params.userId,
        studio_id: params.studioId,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CreditBundleRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateCreditBundle(
  bundleId: string,
  ownerId: string,
  updates: {
    name?: string;
    credit_count?: number;
    total_price?: number;
    expiry_days?: number;
    is_active?: boolean;
  }
): Promise<{ data: CreditBundleRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.credit_count !== undefined) updateData.credit_count = updates.credit_count;
    if (updates.total_price !== undefined) updateData.total_price = updates.total_price;
    if (updates.expiry_days !== undefined) updateData.expiry_days = updates.expiry_days;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

    if (updates.credit_count && updates.total_price) {
      updateData.price_per_credit = updates.total_price / updates.credit_count;
    }

    const { data, error } = await supabase
      .from('credit_bundles')
      .update(updateData)
      .eq('id', bundleId)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CreditBundleRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteCreditBundle(
  bundleId: string,
  ownerId: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('credit_bundles')
      .delete()
      .eq('id', bundleId)
      .eq('owner_id', ownerId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
