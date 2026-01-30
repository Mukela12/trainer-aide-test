import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { UpdateGoalInput } from '@/lib/types/client-goals';

/**
 * GET /api/goals/[id]
 * Get a single goal with its milestones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: goal, error } = await serviceClient
      .from('ta_client_goals')
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .eq('id', goalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      console.error('Error fetching goal:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goal', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]
 * Update a goal's status, current_value, or other fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const body: UpdateGoalInput = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.goal_type !== undefined) updateData.goal_type = body.goal_type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.target_value !== undefined) updateData.target_value = body.target_value;
    if (body.target_unit !== undefined) updateData.target_unit = body.target_unit;
    if (body.current_value !== undefined) updateData.current_value = body.current_value;
    if (body.target_date !== undefined) updateData.target_date = body.target_date;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const { data: goal, error } = await serviceClient
      .from('ta_client_goals')
      .update(updateData)
      .eq('id', goalId)
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      console.error('Error updating goal:', error);
      return NextResponse.json(
        { error: 'Failed to update goal', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]
 * Delete a goal and its milestones
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: goalId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Delete milestones first (cascade should handle this, but being explicit)
    await serviceClient
      .from('ta_goal_milestones')
      .delete()
      .eq('goal_id', goalId);

    const { error } = await serviceClient
      .from('ta_client_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      return NextResponse.json(
        { error: 'Failed to delete goal', details: error.message },
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
