import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientShopOffers } from '@/lib/services/client-shop-service';

/**
 * GET /api/client/shop/offers
 * Returns available offers for the client's studio
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error, status } = await getClientShopOffers(user.email || '');

    if (error) {
      return NextResponse.json(
        { error: error.message, offers: [] },
        { status: status || 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client shop offers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
