import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { duplicateAIProgram } from '@/lib/services/ai-program-service';

/**
 * POST /api/ai-programs/[id]/duplicate
 * Duplicate an AI program with all its workouts and exercises
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before allowing duplication
    const svc = createServiceRoleClient();
    const { data: existing } = await svc
      .from('ta_ai_programs')
      .select('trainer_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (user.id !== existing.trainer_id) {
      const { data: userStaff } = await svc
        .from('bs_staff')
        .select('studio_id')
        .eq('id', user.id)
        .single();

      const sameStudio = userStaff?.studio_id
        ? await svc
            .from('bs_staff')
            .select('id')
            .eq('id', existing.trainer_id)
            .eq('studio_id', userStaff.studio_id)
            .single()
            .then(({ data }: { data: unknown }) => !!data)
        : false;

      if (!sameStudio) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: program, error } = await duplicateAIProgram(id);

    if (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json({
      program,
      message: 'Program duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating program:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
