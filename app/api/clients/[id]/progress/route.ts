import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/clients/[id]/progress
 * Get client progress summary using the v_client_progress database view
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Try to fetch from the v_client_progress view
    const { data: progress, error: viewError } = await serviceClient
      .from('v_client_progress')
      .select('*')
      .eq('client_id', clientId)
      .single();

    // If view doesn't exist or fails, compute manually
    if (viewError) {
      console.log('v_client_progress view not available, computing manually');

      // Get latest metrics
      const { data: latestMetric } = await serviceClient
        .from('ta_body_metrics')
        .select('weight_kg, body_fat_percent, recorded_at')
        .eq('client_id', clientId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      // Get goal counts
      const { data: goals } = await serviceClient
        .from('ta_client_goals')
        .select('status')
        .eq('client_id', clientId);

      const activeGoals = goals?.filter((g: { status: string }) => g.status === 'active').length || 0;
      const achievedGoals = goals?.filter((g: { status: string }) => g.status === 'achieved').length || 0;

      const computedProgress = {
        client_id: clientId,
        latest_weight: latestMetric?.weight_kg || null,
        latest_body_fat: latestMetric?.body_fat_percent || null,
        active_goals: activeGoals,
        achieved_goals: achievedGoals,
        last_measurement_date: latestMetric?.recorded_at || null,
      };

      return NextResponse.json({ progress: computedProgress });
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
