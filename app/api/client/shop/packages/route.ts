import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/shop/packages
 * Returns available packages for the client's studio
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

    // Find the client record for this user by email to get studio_id
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client || !client.studio_id) {
      return NextResponse.json(
        { error: 'Client not found or not associated with a studio' },
        { status: 404 }
      );
    }

    // Get active packages for this studio from credit_bundles table
    const { data: packages, error } = await supabase
      .from('credit_bundles')
      .select(`
        id,
        name,
        description,
        credit_count,
        total_price,
        price_per_credit,
        expiry_days
      `)
      .eq('studio_id', client.studio_id)
      .eq('is_active', true)
      .order('total_price', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    return NextResponse.json({
      packages: (packages || []).map((p) => ({
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
    });
  } catch (error) {
    console.error('Error in client shop packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
