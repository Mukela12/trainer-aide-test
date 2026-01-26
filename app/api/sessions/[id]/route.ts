import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/[id]
 * Fetches a single session by ID
 * Uses service role to bypass RLS
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('ta_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[id]
 * Updates a session by ID
 * Uses service role to bypass RLS
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Convert camelCase to snake_case for database
    const updateData: Record<string, unknown> = {};

    if (body.blocks !== undefined) updateData.blocks = body.blocks;
    if (body.completedAt !== undefined) updateData.completed_at = body.completedAt;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.overallRpe !== undefined) updateData.overall_rpe = body.overallRpe;
    if (body.privateNotes !== undefined) updateData.private_notes = body.privateNotes;
    if (body.publicNotes !== undefined) updateData.public_notes = body.publicNotes;
    if (body.recommendations !== undefined) updateData.recommendations = body.recommendations;
    if (body.trainerDeclaration !== undefined) updateData.trainer_declaration = body.trainerDeclaration;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.signOffMode !== undefined) updateData.sign_off_mode = body.signOffMode;
    if (body.sessionName !== undefined) updateData.session_name = body.sessionName;
    if (body.clientId !== undefined) updateData.client_id = body.clientId;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('ta_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating session:', error);
      return NextResponse.json(
        { error: 'Failed to update session', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Deletes a session by ID
 * Uses service role to bypass RLS
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // First check if the session exists and belongs to the user
    const { data: existing } = await serviceClient
      .from('ta_sessions')
      .select('trainer_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Only allow deletion by the trainer who owns the session
    if (existing.trainer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own sessions' },
        { status: 403 }
      );
    }

    const { error } = await serviceClient
      .from('ta_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting session:', error);
      return NextResponse.json(
        { error: 'Failed to delete session', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
