import { NextRequest, NextResponse } from 'next/server';
import { getAIProgramById, deleteAIProgram, updateAIProgramWithWorkouts } from '@/lib/services/ai-program-service';
import { getProfileById } from '@/lib/services/profile-service';

/**
 * GET /api/ai-programs/[id]
 * Fetch a single AI program with its workouts and exercises
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const program = await getAIProgramById(id);

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai-programs/[id]
 * Update an AI program
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: fullProgram, error } = await updateAIProgramWithWorkouts(id, body);

    if (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Unauthorized') ? 403
        : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json({
      program: fullProgram,
      message: 'Program updated successfully'
    });
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json(
      { error: 'Failed to update program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-programs/[id]
 * Delete an AI program
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Role-based access control: Verify program belongs to a solo practitioner
    const existingProgram = await getAIProgramById(id);
    if (!existingProgram) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Allow deletion of failed/stuck programs regardless of role for cleanup
    const isFailed = existingProgram.generation_status === 'failed' ||
                    existingProgram.generation_status === 'generating'; // stuck programs

    if (!isFailed) {
      const user = await getProfileById(existingProgram.trainer_id);
      if (!user || user.role !== 'solo_practitioner') {
        return NextResponse.json(
          { error: 'Unauthorized: AI Programs are only available to solo practitioners' },
          { status: 403 }
        );
      }
    }

    const { success, error } = await deleteAIProgram(id);

    if (!success || error) {
      console.error('Error deleting program:', error);
      return NextResponse.json(
        { error: 'Failed to delete program', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Program deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json(
      { error: 'Failed to delete program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
