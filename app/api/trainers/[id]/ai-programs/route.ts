import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trainers/[id]/ai-programs
 * Get AI programs assigned to a specific trainer
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: trainerId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch AI programs assigned to this trainer
    const { data: assignments, error } = await serviceClient
      .from('ai_program_trainer_assignments')
      .select(`
        id,
        assigned_at,
        assigned_by,
        ai_programs (
          id,
          program_name,
          description,
          primary_goal,
          experience_level,
          total_weeks,
          sessions_per_week,
          session_duration_minutes,
          status,
          is_template,
          created_at,
          movement_balance_summary
        )
      `)
      .eq('trainer_id', trainerId);

    if (error) {
      console.error('Error fetching trainer AI programs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI programs' },
        { status: 500 }
      );
    }

    // Transform to flat AI program list
    const aiPrograms = (assignments || []).map((a: Record<string, unknown>) => {
      const program = a.ai_programs as Record<string, unknown> | null;
      if (!program) return null;

      return {
        id: program.id,
        program_name: program.program_name,
        description: program.description,
        primary_goal: program.primary_goal,
        experience_level: program.experience_level,
        total_weeks: program.total_weeks,
        sessions_per_week: program.sessions_per_week,
        session_duration_minutes: program.session_duration_minutes,
        status: program.status,
        is_template: program.is_template,
        created_at: program.created_at,
        movement_balance_summary: program.movement_balance_summary,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
      };
    }).filter(Boolean);

    return NextResponse.json({ aiPrograms });
  } catch (error) {
    console.error('Error in trainer AI programs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
