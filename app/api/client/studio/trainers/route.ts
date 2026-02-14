import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientStudioTrainers } from '@/lib/services/client-studio-service';

/**
 * GET /api/client/studio/trainers
 * Returns trainers at the client's studio
 *
 * Multi-strategy lookup delegated to client-studio-service.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: trainers, error } = await getClientStudioTrainers(user.email || '');

    if (error) {
      if (error.message === 'Client not found') {
        return NextResponse.json(
          { error: 'Client not found', trainers: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trainers: trainers || [] });
  } catch (error) {
    console.error('Error in client studio trainers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
