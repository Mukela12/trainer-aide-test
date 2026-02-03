import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions
 * Fetches sessions for the authenticated trainer
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || user.id;
    const completed = searchParams.get('completed');
    const limit = searchParams.get('limit');

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('ta_sessions')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('started_at', { ascending: false });

    if (completed !== null) {
      query = query.eq('completed', completed === 'true');
    }

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Creates a new session in the database
 * Uses service role to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // Convert camelCase to snake_case for database
    // Note: ta_sessions uses json_definition JSONB column for blocks and other nested data
    // id is omitted - Supabase will auto-generate UUID
    //
    // AI Workout handling (after migration 028_fix_ta_sessions_for_ai_workouts.sql):
    // - workout_id references ta_workouts (regular templates)
    // - ai_workout_id references ai_workouts (AI-generated workouts)
    // - For AI workouts: ai_workout_id = workoutId, workout_id = null
    // - For regular templates: workout_id = templateId, ai_workout_id = null
    const isAIWorkout = !!body.workoutId;

    const sessionData = {
      trainer_id: body.trainerId || user.id,
      client_id: body.clientId || null,
      // For regular templates: workout_id references ta_workouts
      // For AI workouts: workout_id is null, ai_workout_id references ai_workouts
      template_id: isAIWorkout ? null : body.templateId,
      workout_id: isAIWorkout ? null : body.templateId,
      ai_workout_id: isAIWorkout ? body.workoutId : null,
      session_name: body.sessionName || 'Training Session',
      json_definition: {
        blocks: body.blocks || [],
        sign_off_mode: body.signOffMode || 'full_session',
        planned_duration_minutes: body.plannedDurationMinutes || null,
        private_notes: body.privateNotes || null,
        public_notes: body.publicNotes || null,
        recommendations: body.recommendations || null,
        // Store additional metadata for reference
        is_ai_workout: isAIWorkout,
      },
      started_at: body.startedAt || new Date().toISOString(),
      completed_at: body.completedAt || null,
      overall_rpe: body.overallRpe || null,
      notes: body.privateNotes || null,
      trainer_declaration: body.trainerDeclaration || false,
      completed: body.completed || false,
    };

    const { data, error } = await serviceClient
      .from('ta_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
