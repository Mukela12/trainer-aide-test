import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import type { CreateGoalInput } from '@/lib/types/client-goals';

/**
 * GET /api/clients/[id]/goals
 * List all goals for a client with their milestones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'achieved', 'abandoned', 'paused', or null for all

    let query = serviceClient
      .from('ta_client_goals')
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .eq('client_id', clientId)
      .or(`trainer_id.eq.${user.id},trainer_id.is.null`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching client goals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch goals', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients/[id]/goals
 * Create a new goal for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const body: CreateGoalInput = await request.json();

    // Validate required fields
    if (!body.goal_type) {
      return NextResponse.json(
        { error: 'goal_type is required' },
        { status: 400 }
      );
    }

    if (!body.description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      );
    }

    const goalData = {
      client_id: clientId,
      trainer_id: user.id,
      goal_type: body.goal_type,
      description: body.description,
      target_value: body.target_value || null,
      target_unit: body.target_unit || null,
      current_value: body.current_value || null,
      start_date: body.start_date || new Date().toISOString().split('T')[0],
      target_date: body.target_date || null,
      status: 'active',
      priority: body.priority ?? 1,
    };

    const { data: goal, error } = await serviceClient
      .from('ta_client_goals')
      .insert(goalData)
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json(
        { error: 'Failed to create goal', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
