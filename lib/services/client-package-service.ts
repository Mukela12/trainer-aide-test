/**
 * Client Package Service
 *
 * Business logic for client package and credit operations.
 * Extracted from api/client/packages route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

interface ClientPackage {
  id: string;
  packageName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt: string | null;
  expiresAt: string | null;
  status: string;
}

interface ClientPackagesResult {
  totalCredits: number;
  creditStatus: 'none' | 'low' | 'medium' | 'good';
  nearestExpiry: string | null;
  packages: ClientPackage[];
}

/**
 * Fetch packages and credits for the authenticated client (self-service view).
 */
export async function getClientPackages(
  userEmail: string
): Promise<{ data: ClientPackagesResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Find client by email (case-insensitive)
    const { data: client, error: clientError } = await supabase
      .from('fc_clients')
      .select('id, credits')
      .ilike('email', userEmail)
      .single();

    if (clientError || !client) {
      // Return empty data if no client record exists
      return {
        data: {
          totalCredits: 0,
          creditStatus: 'none',
          nearestExpiry: null,
          packages: [],
        },
        error: null,
      };
    }

    // Get the simple credits from fc_clients as a fallback
    const simpleCredits: number = client.credits || 0;

    // Get all packages for this client
    const { data: packages, error: packagesError } = await supabase
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
      .eq('client_id', client.id)
      .order('expires_at', { ascending: true });

    if (packagesError) {
      return { data: null, error: new Error('Failed to fetch packages') };
    }

    // Calculate totals from active packages
    const activePackages = (packages || []).filter(
      (p: { status: string; sessions_remaining: number }) =>
        p.status === 'active' && p.sessions_remaining > 0
    );

    const packageCredits: number = activePackages.reduce(
      (sum: number, p: { sessions_remaining: number }) => sum + p.sessions_remaining,
      0
    );

    const nearestExpiry: string | null =
      activePackages.length > 0
        ? (activePackages[0] as { expires_at: string | null }).expires_at
        : null;

    // Use package credits if available, otherwise fall back to simple credits
    const totalCredits: number = packageCredits > 0 ? packageCredits : simpleCredits;

    // Determine credit status
    let creditStatus: 'none' | 'low' | 'medium' | 'good' = 'none';
    if (totalCredits > 5) creditStatus = 'good';
    else if (totalCredits > 2) creditStatus = 'medium';
    else if (totalCredits > 0) creditStatus = 'low';

    // Map packages to camelCase
    const packageList: ClientPackage[] = (packages || []).map(
      (p: {
        id: string;
        sessions_total: number;
        sessions_used: number;
        sessions_remaining: number;
        purchased_at: string | null;
        expires_at: string | null;
        status: string;
        ta_packages: unknown;
      }) => ({
        id: p.id,
        packageName:
          (p.ta_packages as { name?: string } | null)?.name || 'Unknown Package',
        sessionsTotal: p.sessions_total,
        sessionsUsed: p.sessions_used,
        sessionsRemaining: p.sessions_remaining,
        purchasedAt: p.purchased_at,
        expiresAt: p.expires_at,
        status: p.status,
      })
    );

    // Add virtual package for simple credits if no real packages exist
    if (packageList.length === 0 && simpleCredits > 0) {
      packageList.push({
        id: 'direct-credits',
        packageName: 'Direct Credits',
        sessionsTotal: simpleCredits,
        sessionsUsed: 0,
        sessionsRemaining: simpleCredits,
        purchasedAt: null,
        expiresAt: null,
        status: 'active',
      });
    }

    return {
      data: {
        totalCredits,
        creditStatus,
        nearestExpiry,
        packages: packageList,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
