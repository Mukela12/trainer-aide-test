import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
    const { id } = await params;
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
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

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
