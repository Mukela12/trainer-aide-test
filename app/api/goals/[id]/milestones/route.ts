import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '@/lib/types/client-goals';

/**
 * GET /api/goals/[id]/milestones
 * List all milestones for a goal
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

    const { data: milestones, error } = await serviceClient
      .from('ta_goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch milestones', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/goals/[id]/milestones
 * Create a new milestone for a goal
 */
export async function POST(
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
    const body: CreateMilestoneInput = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // Verify goal exists
    const { data: goal, error: goalError } = await serviceClient
      .from('ta_client_goals')
      .select('id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const milestoneData = {
      goal_id: goalId,
      title: body.title,
      target_value: body.target_value || null,
      target_date: body.target_date || null,
      status: 'pending',
      notes: body.notes || null,
    };

    const { data: milestone, error } = await serviceClient
      .from('ta_goal_milestones')
      .insert(milestoneData)
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json(
        { error: 'Failed to create milestone', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/[id]/milestones
 * Update a milestone (pass milestoneId in request body)
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
    const body: UpdateMilestoneInput & { milestoneId: string } = await request.json();

    if (!body.milestoneId) {
      return NextResponse.json(
        { error: 'milestoneId is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.target_value !== undefined) updateData.target_value = body.target_value;
    if (body.target_date !== undefined) updateData.target_date = body.target_date;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'achieved') {
        updateData.achieved_at = new Date().toISOString();
        if (body.achieved_value !== undefined) {
          updateData.achieved_value = body.achieved_value;
        }
      }
    }
    if (body.achieved_value !== undefined) updateData.achieved_value = body.achieved_value;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data: milestone, error } = await serviceClient
      .from('ta_goal_milestones')
      .update(updateData)
      .eq('id', body.milestoneId)
      .eq('goal_id', goalId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
      }
      console.error('Error updating milestone:', error);
      return NextResponse.json(
        { error: 'Failed to update milestone', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/[id]/milestones
 * Delete a milestone (pass milestoneId as query param)
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

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestoneId');

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'milestoneId query parameter is required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('ta_goal_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('goal_id', goalId);

    if (error) {
      console.error('Error deleting milestone:', error);
      return NextResponse.json(
        { error: 'Failed to delete milestone', details: error.message },
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
