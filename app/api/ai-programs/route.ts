import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/ai-programs
 * Fetch all AI programs for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data: programs, error } = await serviceClient
      .from('ai_programs')
      .select('*')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI programs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch programs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ programs: programs || [] });
  } catch (error) {
    console.error('Error fetching AI programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch programs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
