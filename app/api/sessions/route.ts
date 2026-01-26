import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

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

    // Get user profile for studio_id
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.templateId) {
      return NextResponse.json(
        { error: 'templateId is required' },
        { status: 400 }
      );
    }

    // For solo practitioners, user_id acts as studio_id
    const studioId = profile?.studio_id || user.id;

    // Convert camelCase to snake_case for database
    const sessionData = {
      id: body.id || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      trainer_id: body.trainerId || user.id,
      client_id: body.clientId || null,
      template_id: body.templateId,
      session_name: body.sessionName || 'Training Session',
      sign_off_mode: body.signOffMode || 'full_session',
      blocks: body.blocks || [],
      started_at: body.startedAt || new Date().toISOString(),
      completed_at: body.completedAt || null,
      duration: body.duration || null,
      planned_duration_minutes: body.plannedDurationMinutes || null,
      overall_rpe: body.overallRpe || null,
      private_notes: body.privateNotes || null,
      public_notes: body.publicNotes || null,
      recommendations: body.recommendations || null,
      trainer_declaration: body.trainerDeclaration || false,
      completed: body.completed || false,
      studio_id: studioId,
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
