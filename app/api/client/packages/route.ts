import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientPackages } from '@/lib/services/client-package-service';

/**
 * GET /api/client/packages
 * Returns the authenticated client's packages and credit balance
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getClientPackages(user.email!);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
