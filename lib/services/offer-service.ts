/**
 * Offer Service
 *
 * Business logic for referral/offer link operations.
 * Extracted from api/offers route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateOfferInput {
  title: string;
  description?: string | null;
  payment_amount?: number;
  currency?: string;
  max_referrals?: number | null;
  expires_at?: string | null;
  credits?: number;
  expiry_days?: number;
  is_gift?: boolean;
}

export interface UpdateOfferInput {
  title?: string;
  description?: string;
  payment_amount?: number;
  max_referrals?: number | null;
  expires_at?: string | null;
  credits?: number;
  expiry_days?: number;
  is_gift?: boolean;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a unique 8-character referral code.
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Fetch offers (referral_signup_links) scoped to a studio or a specific user.
 */
export async function getOffers(
  studioId: string | null,
  userId: string
): Promise<{ data: Record<string, unknown>[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('referral_signup_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (studioId) {
      query = query.eq('studio_id', studioId);
    } else {
      query = query.eq('created_by', userId);
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error('Error fetching offers:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (offers || []) as Record<string, unknown>[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new offer/referral signup link.
 */
export async function createOffer(
  studioId: string,
  userId: string,
  input: CreateOfferInput
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const offerData = {
      title: input.title,
      description: input.description || null,
      payment_amount: input.payment_amount || 0,
      currency: input.currency || 'GBP',
      max_referrals: input.max_referrals || null,
      current_referrals: 0,
      expires_at: input.expires_at || null,
      credits: input.credits || 0,
      expiry_days: input.expiry_days || 90,
      is_gift: input.is_gift || false,
      is_active: true,
      created_by: userId,
      studio_id: studioId,
      referral_code: generateReferralCode(),
    };

    const { data, error } = await supabase
      .from('referral_signup_links')
      .insert(offerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating offer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Record<string, unknown>, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing offer owned by the given user.
 */
export async function updateOffer(
  offerId: string,
  userId: string,
  input: UpdateOfferInput
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.payment_amount !== undefined) updateData.payment_amount = input.payment_amount;
    if (input.max_referrals !== undefined) updateData.max_referrals = input.max_referrals;
    if (input.expires_at !== undefined) updateData.expires_at = input.expires_at;
    if (input.credits !== undefined) updateData.credits = input.credits;
    if (input.expiry_days !== undefined) updateData.expiry_days = input.expiry_days;
    if (input.is_gift !== undefined) updateData.is_gift = input.is_gift;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('referral_signup_links')
      .update(updateData)
      .eq('id', offerId)
      .eq('created_by', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating offer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Record<string, unknown>, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete an offer owned by the given user.
 */
export async function deleteOffer(
  offerId: string,
  userId: string
): Promise<{ data: null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('referral_signup_links')
      .delete()
      .eq('id', offerId)
      .eq('created_by', userId);

    if (error) {
      console.error('Error deleting offer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
