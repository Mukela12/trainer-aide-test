import { NextRequest, NextResponse } from 'next/server';
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
    const { id } = await params;

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
