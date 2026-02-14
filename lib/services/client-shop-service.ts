/**
 * Client Shop Service
 *
 * Business logic for client shop operations: offers, packages, and claiming.
 * Extracted from api/client/shop/offers, packages, and claim routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Row types for Supabase `any` results ────────────────────────────

interface ClientRow {
  id: string;
  studio_id: string | null;
  invited_by: string | null;
  credits: number | null;
}

interface OfferRow {
  id: string;
  title: string;
  description: string | null;
  payment_amount: number;
  currency: string;
  max_referrals: number | null;
  current_referrals: number;
  expires_at: string | null;
  credits: number;
  expiry_days: number | null;
  is_gift: boolean;
  studio_id: string | null;
  created_by: string | null;
  is_active: boolean;
}

interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  credit_count: number;
  total_price: number;
  price_per_credit: number;
  expiry_days: number | null;
  studio_id: string | null;
  owner_id: string | null;
  is_active: boolean;
}

// ── Public return types ─────────────────────────────────────────────

export interface ShopOffer {
  id: string;
  title: string;
  description: string | null;
  paymentAmount: number;
  currency: string;
  maxReferrals: number | null;
  currentReferrals: number;
  expiresAt: string | null;
  credits: number;
  expiryDays: number | null;
  isGift: boolean;
  isFree: boolean;
  remainingSpots: number | null;
}

export interface ShopPackage {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  perSessionPriceCents: number;
  savingsPercent: null;
  isFree: boolean;
}

export interface ClaimPackageResult {
  success: boolean;
  message: string;
  creditsGranted: number;
  clientPackage: {
    id: string;
    packageName: string;
    sessionsTotal: number;
    expiresAt: string;
  };
}

export interface ClaimOfferResult {
  success: boolean;
  message: string;
  creditsGranted: number;
  newTotalCredits: number;
}

// ── Shared helper: multi-strategy studio lookup ─────────────────────

async function findClientWithLookupIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userEmail: string
): Promise<{
  client: { id: string; studio_id: string | null; credits: number | null; invited_by: string | null } | null;
  lookupIds: string[];
  error: Error | null;
}> {
  try {
    const { data: rawClient } = await supabase
      .from('fc_clients')
      .select('id, studio_id, invited_by, credits')
      .ilike('email', userEmail)
      .maybeSingle();

    const client = rawClient as ClientRow | null;

    if (!client) {
      return { client: null, lookupIds: [], error: null };
    }

    const lookupIds: string[] = [];

    if (client.studio_id) {
      lookupIds.push(client.studio_id);
    }

    // If client was invited, the inviter's ID is a potential lookup key
    if (client.invited_by) {
      lookupIds.push(client.invited_by);

      // Check if the inviter has a studio_id in bs_staff
      const { data: inviterStaff } = await supabase
        .from('bs_staff')
        .select('studio_id')
        .eq('id', client.invited_by)
        .maybeSingle();

      if (inviterStaff?.studio_id && !lookupIds.includes(inviterStaff.studio_id as string)) {
        lookupIds.push(inviterStaff.studio_id as string);

        // Update client's studio_id if it was NULL
        if (!client.studio_id) {
          await supabase
            .from('fc_clients')
            .update({ studio_id: inviterStaff.studio_id })
            .eq('id', client.id);

          client.studio_id = inviterStaff.studio_id as string;
        }
      }
    }

    // If studio_id exists, also get the studio owner
    if (client.studio_id) {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('owner_id')
        .eq('id', client.studio_id)
        .maybeSingle();

      if (studio?.owner_id && !lookupIds.includes(studio.owner_id as string)) {
        lookupIds.push(studio.owner_id as string);
      }
    }

    // Deduplicate
    const uniqueIds = [...new Set(lookupIds)];

    return { client, lookupIds: uniqueIds, error: null };
  } catch (err) {
    return {
      client: null,
      lookupIds: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// ── Exported service functions ──────────────────────────────────────

/**
 * Get available shop offers for a client identified by email.
 */
export async function getClientShopOffers(
  userEmail: string
): Promise<{ data: { offers: ShopOffer[] } | null; error: Error | null; status?: number }> {
  try {
    const supabase = createServiceRoleClient();
    const { client, lookupIds, error: lookupError } = await findClientWithLookupIds(supabase, userEmail);

    if (lookupError) {
      return { data: null, error: lookupError, status: 500 };
    }

    if (!client) {
      return { data: null, error: new Error('Client not found'), status: 404 };
    }

    if (lookupIds.length === 0) {
      return { data: { offers: [] }, error: null };
    }

    // Query offers by studio_id OR created_by matching any of the lookup IDs
    const { data: rawOffers, error: queryError } = await supabase
      .from('referral_signup_links')
      .select(`
        id,
        title,
        description,
        payment_amount,
        currency,
        max_referrals,
        current_referrals,
        expires_at,
        credits,
        expiry_days,
        is_gift,
        studio_id,
        created_by
      `)
      .or(
        lookupIds.map((id: string) => `studio_id.eq.${id}`).join(',') +
        ',' +
        lookupIds.map((id: string) => `created_by.eq.${id}`).join(',')
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (queryError) {
      return { data: null, error: new Error(queryError.message), status: 500 };
    }

    const offers = (rawOffers || []) as OfferRow[];

    // Filter out expired or at-capacity offers
    const now = new Date();
    const availableOffers = offers.filter((o: OfferRow) => {
      if (o.expires_at && new Date(o.expires_at) < now) {
        return false;
      }
      if (o.max_referrals && o.current_referrals >= o.max_referrals) {
        return false;
      }
      return true;
    });

    // Deduplicate by ID
    const uniqueOffers = Array.from(
      new Map(availableOffers.map((o: OfferRow) => [o.id, o])).values()
    );

    return {
      data: {
        offers: uniqueOffers.map((o: OfferRow) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          paymentAmount: o.payment_amount,
          currency: o.currency,
          maxReferrals: o.max_referrals,
          currentReferrals: o.current_referrals,
          expiresAt: o.expires_at,
          credits: o.credits,
          expiryDays: o.expiry_days,
          isGift: o.is_gift,
          isFree: o.payment_amount === 0,
          remainingSpots: o.max_referrals ? o.max_referrals - o.current_referrals : null,
        })),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
      status: 500,
    };
  }
}

/**
 * Get available shop packages for a client identified by email.
 */
export async function getClientShopPackages(
  userEmail: string
): Promise<{ data: { packages: ShopPackage[] } | null; error: Error | null; status?: number }> {
  try {
    const supabase = createServiceRoleClient();
    const { client, lookupIds, error: lookupError } = await findClientWithLookupIds(supabase, userEmail);

    if (lookupError) {
      return { data: null, error: lookupError, status: 500 };
    }

    if (!client) {
      return { data: null, error: new Error('Client not found'), status: 404 };
    }

    if (lookupIds.length === 0) {
      return { data: { packages: [] }, error: null };
    }

    // Query packages by studio_id OR owner_id matching any of the lookup IDs
    const { data: rawPackages, error: queryError } = await supabase
      .from('credit_bundles')
      .select(`
        id,
        name,
        description,
        credit_count,
        total_price,
        price_per_credit,
        expiry_days,
        studio_id,
        owner_id
      `)
      .or(
        lookupIds.map((id: string) => `studio_id.eq.${id}`).join(',') +
        ',' +
        lookupIds.map((id: string) => `owner_id.eq.${id}`).join(',')
      )
      .eq('is_active', true)
      .order('total_price', { ascending: true });

    if (queryError) {
      return { data: null, error: new Error(queryError.message), status: 500 };
    }

    const packages = (rawPackages || []) as PackageRow[];

    // Deduplicate by ID
    const uniquePackages = Array.from(
      new Map(packages.map((p: PackageRow) => [p.id, p])).values()
    );

    return {
      data: {
        packages: uniquePackages.map((p: PackageRow) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          sessionCount: p.credit_count,
          priceCents: Math.round(p.total_price * 100),
          validityDays: p.expiry_days,
          perSessionPriceCents: Math.round(p.price_per_credit * 100),
          savingsPercent: null,
          isFree: p.total_price === 0,
        })),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
      status: 500,
    };
  }
}

/**
 * Claim a free package for a client identified by email.
 */
export async function claimPackage(
  userEmail: string,
  packageId: string
): Promise<{ data: ClaimPackageResult | null; error: Error | null; status?: number }> {
  try {
    const supabase = createServiceRoleClient();
    const { client, error: lookupError } = await findClientWithLookupIds(supabase, userEmail);

    if (lookupError) {
      return { data: null, error: lookupError, status: 500 };
    }

    if (!client || !client.studio_id) {
      return {
        data: null,
        error: new Error('Client not found or not associated with a studio'),
        status: 404,
      };
    }

    // Get the package from credit_bundles
    const { data: rawPkg, error: pkgError } = await supabase
      .from('credit_bundles')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !rawPkg) {
      return { data: null, error: new Error('Package not found'), status: 404 };
    }

    const pkg = rawPkg as PackageRow & { [key: string]: unknown };

    // Verify package belongs to client's studio
    if (pkg.studio_id !== client.studio_id) {
      return {
        data: null,
        error: new Error('Package does not belong to your studio'),
        status: 403,
      };
    }

    // Verify package is active
    if (!pkg.is_active) {
      return { data: null, error: new Error('Package is not available'), status: 400 };
    }

    // Verify package is free
    if (pkg.total_price !== 0) {
      return {
        data: null,
        error: new Error('Only free packages can be claimed. Payment integration coming soon.'),
        status: 400,
      };
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (pkg.expiry_days || 90));

    // Create client package record
    const { data: clientPackage, error: insertError } = await supabase
      .from('ta_client_packages')
      .insert({
        client_id: client.id,
        package_id: packageId,
        sessions_total: pkg.credit_count,
        sessions_used: 0,
        sessions_remaining: pkg.credit_count,
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        payment_id: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating client package:', insertError);
      return { data: null, error: new Error('Failed to claim package'), status: 500 };
    }

    return {
      data: {
        success: true,
        message: `Successfully claimed "${pkg.name}" - ${pkg.credit_count} session${pkg.credit_count !== 1 ? 's' : ''} added!`,
        creditsGranted: pkg.credit_count,
        clientPackage: {
          id: (clientPackage as Record<string, unknown>).id as string,
          packageName: pkg.name,
          sessionsTotal: (clientPackage as Record<string, unknown>).sessions_total as number,
          expiresAt: (clientPackage as Record<string, unknown>).expires_at as string,
        },
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
      status: 500,
    };
  }
}

/**
 * Claim a free offer for a client identified by email.
 */
export async function claimOffer(
  userEmail: string,
  offerId: string
): Promise<{ data: ClaimOfferResult | null; error: Error | null; status?: number }> {
  try {
    const supabase = createServiceRoleClient();
    const { client, error: lookupError } = await findClientWithLookupIds(supabase, userEmail);

    if (lookupError) {
      return { data: null, error: lookupError, status: 500 };
    }

    if (!client || !client.studio_id) {
      return {
        data: null,
        error: new Error('Client not found or not associated with a studio'),
        status: 404,
      };
    }

    // Get the offer
    const { data: rawOffer, error: offerError } = await supabase
      .from('referral_signup_links')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError || !rawOffer) {
      return { data: null, error: new Error('Offer not found'), status: 404 };
    }

    const offer = rawOffer as OfferRow;

    // Verify offer belongs to client's studio
    if (offer.studio_id !== client.studio_id) {
      return {
        data: null,
        error: new Error('Offer does not belong to your studio'),
        status: 403,
      };
    }

    // Verify offer is active
    if (!offer.is_active) {
      return { data: null, error: new Error('Offer is not available'), status: 400 };
    }

    // Check expiry
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      return { data: null, error: new Error('Offer has expired'), status: 400 };
    }

    // Check capacity
    if (offer.max_referrals && offer.current_referrals >= offer.max_referrals) {
      return {
        data: null,
        error: new Error('Offer has reached maximum capacity'),
        status: 400,
      };
    }

    // Verify offer is free
    if (offer.payment_amount !== 0) {
      return {
        data: null,
        error: new Error('Only free offers can be claimed. Payment integration coming soon.'),
        status: 400,
      };
    }

    // Add credits to client
    const newCredits = (client.credits || 0) + (offer.credits || 0);
    const { error: updateError } = await supabase
      .from('fc_clients')
      .update({ credits: newCredits })
      .eq('id', client.id);

    if (updateError) {
      console.error('Error updating client credits:', updateError);
      return { data: null, error: new Error('Failed to grant credits'), status: 500 };
    }

    // Increment current_referrals on the offer
    const { error: offerUpdateError } = await supabase
      .from('referral_signup_links')
      .update({ current_referrals: (offer.current_referrals || 0) + 1 })
      .eq('id', offerId);

    if (offerUpdateError) {
      console.error('Error updating offer referral count:', offerUpdateError);
      // Don't fail - credits already granted
    }

    return {
      data: {
        success: true,
        message: `Successfully claimed "${offer.title}" - ${offer.credits} credit${offer.credits !== 1 ? 's' : ''} added!`,
        creditsGranted: offer.credits,
        newTotalCredits: newCredits,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
      status: 500,
    };
  }
}
