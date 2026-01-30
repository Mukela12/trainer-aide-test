// Client goals types for tracking fitness objectives and milestones

export type GoalType =
  | 'weight_loss'
  | 'muscle_gain'
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness'
  | 'custom';

export type GoalStatus = 'active' | 'achieved' | 'abandoned' | 'paused';

export type MilestoneStatus = 'pending' | 'achieved' | 'missed';

export interface ClientGoal {
  id: string;
  client_id: string;
  trainer_id: string | null;
  goal_type: GoalType;
  description: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  start_date: string;
  target_date: string | null;
  status: GoalStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  target_value: number | null;
  target_date: string | null;
  status: MilestoneStatus;
  achieved_at: string | null;
  achieved_value: number | null;
  notes: string | null;
}

export interface ClientGoalWithMilestones extends ClientGoal {
  milestones: GoalMilestone[];
}

export interface CreateGoalInput {
  goal_type: GoalType;
  description: string;
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  start_date?: string;
  target_date?: string;
  priority?: number;
}

export interface UpdateGoalInput {
  goal_type?: GoalType;
  description?: string;
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  target_date?: string;
  status?: GoalStatus;
  priority?: number;
}

export interface CreateMilestoneInput {
  title: string;
  target_value?: number;
  target_date?: string;
  notes?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  target_value?: number;
  target_date?: string;
  status?: MilestoneStatus;
  achieved_value?: number;
  notes?: string;
}
