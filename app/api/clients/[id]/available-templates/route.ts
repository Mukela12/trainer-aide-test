import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAvailableTemplatesForClient } from '@/lib/services/available-template-service';
import type { RouteParams } from '@/lib/types/api';

/**
 * GET /api/clients/[id]/available-templates
 *
 * Returns all templates available for the current trainer to use with this client.
 * Combines trainer toolkit, client-specific, own templates, and AI programs.
 *
 * Query params:
 * - trainerId (optional): Specify a different trainer. Defaults to current user.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId') || user.id;

    const { data, error } = await getAvailableTemplatesForClient(trainerId, clientId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch available templates' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      trainerId,
      clientId,
    });
  } catch (error) {
    console.error('Error in available templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
