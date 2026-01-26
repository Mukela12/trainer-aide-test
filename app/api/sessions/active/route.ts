import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/active
 * Fetches the active (in-progress) session for the authenticated trainer
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || user.id;

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('ta_sessions')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('completed', false)
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching active session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch active session', details: error.message },
        { status: 500 }
      );
    }

    // Return the first session or null
    return NextResponse.json({ session: data?.[0] || null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
