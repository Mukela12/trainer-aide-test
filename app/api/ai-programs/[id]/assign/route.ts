import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  assignProgramToClient,
  assignProgramToTrainer,
  unassignProgramFromTrainer,
} from '@/lib/services/ai-program-service';

/**
 * POST /api/ai-programs/[id]/assign
 * Assign a program to a client OR a trainer
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

    // Verify the user owns this program or is in the same studio as the owner
    const svc = createServiceRoleClient();
    const { data: program } = await svc
      .from('ta_ai_programs')
      .select('trainer_id')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (user.id !== program.trainer_id) {
      const { data: userStaff } = await svc
        .from('bs_staff')
        .select('studio_id')
        .eq('id', user.id)
        .single();

      const sameStudio = userStaff?.studio_id
        ? await svc
            .from('bs_staff')
            .select('id')
            .eq('id', program.trainer_id)
            .eq('studio_id', userStaff.studio_id)
            .single()
            .then(({ data }: { data: unknown }) => !!data)
        : false;

      if (!sameStudio) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { client_id, trainer_id } = body;

    if (!client_id && !trainer_id) {
      return NextResponse.json(
        { error: 'client_id or trainer_id is required' },
        { status: 400 }
      );
    }

    // Handle trainer assignment
    if (trainer_id) {

      const { data, error } = await assignProgramToTrainer(id, trainer_id, user.id);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to assign to trainer', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'AI program assigned to trainer',
        assignedTo: 'trainer',
        trainerId: trainer_id,
      });
    }

    // Handle client assignment
    const { data: updatedProgram, error } = await assignProgramToClient(id, client_id);

    if (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json({
      program: updatedProgram,
      message: 'Program assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning program:', error);
    return NextResponse.json(
      { error: 'Failed to assign program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-programs/[id]/assign?trainer_id=xxx
 * Unassign a program from a trainer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const trainer_id = searchParams.get('trainer_id');

    if (!trainer_id) {
      return NextResponse.json(
        { error: 'trainer_id is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership before unassigning
    const svc = createServiceRoleClient();
    const { data: program } = await svc
      .from('ta_ai_programs')
      .select('trainer_id')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (user.id !== program.trainer_id) {
      const { data: userStaff } = await svc
        .from('bs_staff')
        .select('studio_id')
        .eq('id', user.id)
        .single();

      const sameStudio = userStaff?.studio_id
        ? await svc
            .from('bs_staff')
            .select('id')
            .eq('id', program.trainer_id)
            .eq('studio_id', userStaff.studio_id)
            .single()
            .then(({ data }: { data: unknown }) => !!data)
        : false;

      if (!sameStudio) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await unassignProgramFromTrainer(id, trainer_id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to unassign from trainer', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI program unassigned from trainer',
    });
  } catch (error) {
    console.error('Error unassigning program:', error);
    return NextResponse.json(
      { error: 'Failed to unassign program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
