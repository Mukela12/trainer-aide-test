/**
 * Goal Service
 *
 * Business logic for client goal and milestone operations.
 * Extracted from api/clients/[id]/goals, api/goals/[id], and api/goals/[id]/milestones routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ClientGoalWithMilestones,
  GoalMilestone,
} from '@/lib/types/client-goals';

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/**
 * List all goals for a client with their milestones.
 */
export async function getClientGoals(
  clientId: string,
  trainerId: string,
  status?: string
): Promise<{ data: ClientGoalWithMilestones[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ta_client_goals')
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .eq('client_id', clientId)
      .or(`trainer_id.eq.${trainerId},trainer_id.is.null`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching client goals:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: goals as ClientGoalWithMilestones[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new goal for a client.
 */
export async function createGoal(
  clientId: string,
  trainerId: string,
  input: CreateGoalInput
): Promise<{ data: ClientGoalWithMilestones | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const goalData = {
      client_id: clientId,
      trainer_id: trainerId,
      goal_type: input.goal_type,
      description: input.description,
      target_value: input.target_value || null,
      target_unit: input.target_unit || null,
      current_value: input.current_value || null,
      start_date: input.start_date || new Date().toISOString().split('T')[0],
      target_date: input.target_date || null,
      status: 'active',
      priority: input.priority ?? 1,
    };

    const { data: goal, error } = await supabase
      .from('ta_client_goals')
      .insert(goalData)
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: goal as ClientGoalWithMilestones, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get a single goal with its milestones.
 */
export async function getGoalById(
  goalId: string
): Promise<{ data: ClientGoalWithMilestones | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: goal, error } = await supabase
      .from('ta_client_goals')
      .select(`
        *,
        milestones:ta_goal_milestones(*)
      `)
      .eq('id', goalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Goal not found') };
      }
      console.error('Error fetching goal:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: goal as ClientGoalWithMilestones, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a goal's status, current_value, or other fields.
 */
export async function updateGoal(
  goalId: string,
  input: UpdateGoalInput
): Promise<{ data: ClientGoalWithMilestones | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.goal_type !== undefined) updateData.goal_type = input.goal_type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.target_value !== undefined) updateData.target_value = input.target_value;
    if (input.target_unit !== undefined) updateData.target_unit = input.target_unit;
    if (input.current_value !== undefined) updateData.current_value = input.current_value;
    if (input.target_date !== undefined) updateData.target_date = input.target_date;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;

    const { data: goal, error } = await supabase
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
        return { data: null, error: new Error('Goal not found') };
      }
      console.error('Error updating goal:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: goal as ClientGoalWithMilestones, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a goal and its milestones.
 */
export async function deleteGoal(
  goalId: string
): Promise<{ data: null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Delete milestones first (cascade should handle this, but being explicit)
    await supabase
      .from('ta_goal_milestones')
      .delete()
      .eq('goal_id', goalId);

    const { error } = await supabase
      .from('ta_client_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

/**
 * List all milestones for a goal.
 */
export async function getMilestones(
  goalId: string
): Promise<{ data: GoalMilestone[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: milestones, error } = await supabase
      .from('ta_goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: milestones as GoalMilestone[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new milestone for a goal.
 */
export async function createMilestone(
  goalId: string,
  input: CreateMilestoneInput
): Promise<{ data: GoalMilestone | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Verify goal exists
    const { data: goal, error: goalError } = await supabase
      .from('ta_client_goals')
      .select('id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return { data: null, error: new Error('Goal not found') };
    }

    const milestoneData = {
      goal_id: goalId,
      title: input.title,
      target_value: input.target_value || null,
      target_date: input.target_date || null,
      status: 'pending',
      notes: input.notes || null,
    };

    const { data: milestone, error } = await supabase
      .from('ta_goal_milestones')
      .insert(milestoneData)
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: milestone as GoalMilestone, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a milestone.
 */
export async function updateMilestone(
  goalId: string,
  milestoneId: string,
  input: UpdateMilestoneInput & { achieved_value?: number }
): Promise<{ data: GoalMilestone | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.target_value !== undefined) updateData.target_value = input.target_value;
    if (input.target_date !== undefined) updateData.target_date = input.target_date;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'achieved') {
        updateData.achieved_at = new Date().toISOString();
        if (input.achieved_value !== undefined) {
          updateData.achieved_value = input.achieved_value;
        }
      }
    }
    if (input.achieved_value !== undefined) updateData.achieved_value = input.achieved_value;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data: milestone, error } = await supabase
      .from('ta_goal_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .eq('goal_id', goalId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Milestone not found') };
      }
      console.error('Error updating milestone:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: milestone as GoalMilestone, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a milestone.
 */
export async function deleteMilestone(
  goalId: string,
  milestoneId: string
): Promise<{ data: null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_goal_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('goal_id', goalId);

    if (error) {
      console.error('Error deleting milestone:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
