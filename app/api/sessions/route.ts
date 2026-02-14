import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessions, createSession } from '@/lib/services/session-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || user.id;
    const completed = searchParams.get('completed');
    const limit = searchParams.get('limit');

    const { data, error } = await getSessions(trainerId, {
      completed: completed !== null ? completed === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const { data, error } = await createSession({
      trainerId: body.trainerId || user.id,
      clientId: body.clientId,
      templateId: body.templateId,
      workoutId: body.workoutId,
      sessionName: body.sessionName,
      blocks: body.blocks,
      signOffMode: body.signOffMode,
      plannedDurationMinutes: body.plannedDurationMinutes,
      privateNotes: body.privateNotes,
      publicNotes: body.publicNotes,
      recommendations: body.recommendations,
      startedAt: body.startedAt,
      completedAt: body.completedAt,
      overallRpe: body.overallRpe,
      trainerDeclaration: body.trainerDeclaration,
      completed: body.completed,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
