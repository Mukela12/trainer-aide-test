import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientGoals, createGoal } from '@/lib/services/goal-service';
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const { data: goals, error } = await getClientGoals(clientId, user.id, status);

    if (error) {
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

    const body: CreateGoalInput = await request.json();

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

    const { data: goal, error } = await createGoal(clientId, user.id, body);

    if (error) {
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
