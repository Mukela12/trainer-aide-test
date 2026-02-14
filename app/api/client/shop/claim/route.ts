import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { claimPackage, claimOffer } from '@/lib/services/client-shop-service';

/**
 * POST /api/client/shop/claim
 * Claim a free package or offer
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'type and id are required' },
        { status: 400 }
      );
    }

    if (type !== 'package' && type !== 'offer') {
      return NextResponse.json(
        { error: 'type must be "package" or "offer"' },
        { status: 400 }
      );
    }

    const email = user.email || '';

    if (type === 'package') {
      const { data, error, status } = await claimPackage(email, id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: status || 500 });
      }
      return NextResponse.json(data);
    } else {
      const { data, error, status } = await claimOffer(email, id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: status || 500 });
      }
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error in client shop claim POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
