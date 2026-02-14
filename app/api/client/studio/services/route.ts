import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientStudioServices } from '@/lib/services/client-studio-service';

/**
 * GET /api/client/studio/services
 * Returns bookable services for the client's studio
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

    const { data: services, error } = await getClientStudioServices(user.email || '');

    if (error) {
      if (error.message === 'Client not found') {
        return NextResponse.json(
          { error: 'Client not found', services: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ services: services || [] });
  } catch (error) {
    console.error('Error in client studio services GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
