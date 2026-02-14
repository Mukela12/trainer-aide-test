import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientShopPackages } from '@/lib/services/client-shop-service';

/**
 * GET /api/client/shop/packages
 * Returns available packages for the client's studio
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error, status } = await getClientShopPackages(user.email || '');

    if (error) {
      return NextResponse.json(
        { error: error.message, packages: [] },
        { status: status || 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client shop packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
