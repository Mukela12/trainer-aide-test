import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getOperatorStats, getUpcomingSessions } from '@/lib/services/analytics-service';
import { getOrCreateStudio } from '@/lib/services/studio-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get role
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, first_name')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'solo_practitioner' && profile.role !== 'studio_owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create studio
    const { data: studio, error: studioError } = await getOrCreateStudio(
      user.id,
      profile.role,
      profile.first_name || undefined
    );

    if (studioError || !studio) {
      return NextResponse.json({ error: studioError?.message || 'No studio found' }, { status: 500 });
    }

    // Fetch stats and upcoming sessions in parallel
    const [statsResult, upcomingSessions] = await Promise.all([
      getOperatorStats(studio.id),
      getUpcomingSessions(studio.id, 5),
    ]);

    if (statsResult.error) {
      return NextResponse.json({ error: statsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      stats: statsResult.data,
      upcomingSessions,
    });
  } catch (error) {
    console.error('Error fetching operator analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
