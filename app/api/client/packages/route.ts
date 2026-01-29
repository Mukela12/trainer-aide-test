import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/packages
 * Returns the authenticated client's packages and credit balance
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email
    const { data: client, error: clientError } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (clientError || !client) {
      // Return empty data if no client record exists
      return NextResponse.json({
        totalCredits: 0,
        creditStatus: 'none',
        nearestExpiry: null,
        packages: [],
      });
    }

    // Get all packages for this client
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
      .eq('client_id', client.id)
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('Error fetching client packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    // Calculate totals
    const activePackages = (packages || []).filter(
      (p) => p.status === 'active' && p.sessions_remaining > 0
    );
    const totalCredits = activePackages.reduce((sum, p) => sum + p.sessions_remaining, 0);
    const nearestExpiry = activePackages.length > 0 ? activePackages[0].expires_at : null;

    // Determine credit status
    let creditStatus: 'none' | 'low' | 'medium' | 'good' = 'none';
    if (totalCredits > 5) creditStatus = 'good';
    else if (totalCredits > 2) creditStatus = 'medium';
    else if (totalCredits > 0) creditStatus = 'low';

    return NextResponse.json({
      totalCredits,
      creditStatus,
      nearestExpiry,
      packages: (packages || []).map((p) => ({
        id: p.id,
        packageName: (p.ta_packages as any)?.name || 'Unknown Package',
        sessionsTotal: p.sessions_total,
        sessionsUsed: p.sessions_used,
        sessionsRemaining: p.sessions_remaining,
        purchasedAt: p.purchased_at,
        expiresAt: p.expires_at,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Error in client packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
