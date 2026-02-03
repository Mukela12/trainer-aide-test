import { NextRequest, NextResponse } from 'next/server';
import { updateAIProgram } from '@/lib/services/ai-program-service';

/**
 * POST /api/ai-programs/[id]/template
 * Convert a program to a template or remove template status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_template } = body;

    if (typeof is_template !== 'boolean') {
      return NextResponse.json(
        { error: 'is_template must be a boolean' },
        { status: 400 }
      );
    }

    const { data: updatedProgram, error } = await updateAIProgram(id, {
      is_template,
      // When converting to template, also publish it and remove client association
      ...(is_template && { client_profile_id: null, is_published: true }),
      // When unmarking as template, unpublish it
      ...(!is_template && { is_published: false }),
    });

    if (error || !updatedProgram) {
      console.error('Error updating template status:', error);
      return NextResponse.json(
        { error: 'Failed to update template status', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      program: updatedProgram,
      message: is_template
        ? 'Program converted to template successfully'
        : 'Template status removed successfully'
    });
  } catch (error) {
    console.error('Error updating template status:', error);
    return NextResponse.json(
      { error: 'Failed to update template status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
