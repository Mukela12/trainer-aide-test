/**
 * AI Program Types
 *
 * Types for AI-generated workout programs (Anthropic Claude)
 */

import type { GoalType, ExperienceLevel } from './client-profile';

// ========================================
// ENUMS
// ========================================

export type ProgramStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type GenerationStatus = 'generating' | 'completed' | 'failed';

export type SessionType = 'strength' | 'hypertrophy' | 'conditioning' | 'mobility' | 'recovery' | 'mixed';

export type GenerationType = 'program' | 'workout' | 'exercise_block' | 'nutrition' | 'progression';

export type RevisionType = 'initial' | 'edit' | 'progression' | 'regeneration';

// ========================================
// AI PROGRAMS (Master Record)
// ========================================

export interface AIProgram {
  id: string;  // UUID

  // Links
  client_profile_id?: string | null;
  trainer_id: string;
  studio_id?: string | null;

  // Metadata
  program_name: string;
  description?: string | null;
  status: ProgramStatus;

  // Generation Status (for async background processing)
  generation_status: GenerationStatus;
  generation_error?: string | null;

  // Progress Tracking (for real-time updates)
  progress_message?: string | null;
  current_step?: number | null;
  total_steps?: number | null;
  progress_percentage?: number | null;

  // Structure
  total_weeks: number;
  sessions_per_week: number;
  session_duration_minutes?: number | null;

  // Goal Configuration
  primary_goal: string;  // GoalType as string
  secondary_goals: string[];
  experience_level: string;  // ExperienceLevel as string

  // Dates
  start_date?: string | null;  // ISO date
  end_date?: string | null;
  actual_completion_date?: string | null;

  // AI Generation Metadata
  ai_model: string;  // e.g., 'claude-3-5-sonnet-20241022'
  generation_prompt_version?: string | null;
  generation_parameters?: Record<string, any> | null;
  generated_at?: string | null;  // ISO timestamp

  // Program Summary
  ai_rationale?: string | null;
  movement_balance_summary?: MovementBalanceSummary | null;
  weekly_structure_summary?: string | null;

  // Progress
  completion_percentage: number;  // 0-100
  sessions_completed: number;
  sessions_total?: number | null;

  // Flags
  is_template: boolean;
  is_published: boolean;
  allow_client_modifications: boolean;

  // Metadata
  created_at: string;  // ISO timestamp
  updated_at: string;
  created_by?: string | null;
}

export interface MovementBalanceSummary {
  push_horizontal?: number;
  push_vertical?: number;
  pull_horizontal?: number;
  pull_vertical?: number;
  squat?: number;
  hinge?: number;
  lunge?: number;
  rotation?: number;
  carry?: number;
  mobility?: number;
  core?: number;
  [key: string]: number | undefined;
}

// ========================================
// AI WORKOUTS (Individual Sessions)
// ========================================

export interface AIWorkout {
  id: string;

  // Link
  program_id: string;

  // Position
  week_number: number;  // 1-52
  day_number: number;  // 1-7
  session_order?: number | null;  // 1st, 2nd, 3rd session of the week

  // Metadata
  workout_name: string;  // "Push Day A"
  workout_focus?: string | null;  // "Upper Body Push + Core"
  session_type?: SessionType | null;

  // Scheduling
  scheduled_date?: string | null;  // ISO date
  planned_duration_minutes?: number | null;

  // Movement Balance
  movement_patterns_covered: string[];
  planes_of_motion_covered: string[];
  primary_muscle_groups: string[];

  // AI Rationale
  ai_rationale?: string | null;
  exercise_selection_criteria?: Record<string, any> | null;

  // Completion
  is_completed: boolean;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
  overall_rpe?: number | null;  // 1-10
  trainer_notes?: string | null;
  client_feedback?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;

  // Related data (populated by API)
  exercises?: AIWorkoutExercise[];
}

// ========================================
// AI WORKOUT EXERCISES (Prescriptions)
// ========================================

export interface AIWorkoutExercise {
  id: string;

  // Links
  workout_id: string;
  exercise_id: string;  // FK to ta_exercise_library

  // Position
  exercise_order: number;
  block_label?: string | null;  // "A1", "A2", "B1"

  // Prescription (Target)
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  reps_target?: string | null;  // "8-12", "AMRAP", "EMOM:12"
  target_load_kg?: number | null;
  target_load_percentage?: number | null;  // % of 1RM
  target_rpe?: number | null;  // 1-10
  target_rir?: number | null;  // Reps in Reserve (0-5)

  // Tempo & Rest
  tempo?: string | null;  // "3-1-1-0"
  rest_seconds?: number | null;

  // Time-Based
  target_duration_seconds?: number | null;
  target_distance_meters?: number | null;

  // Flags
  is_unilateral: boolean;
  is_bodyweight: boolean;
  is_timed: boolean;

  // Coaching
  coaching_cues: string[];
  common_mistakes: string[];
  modifications: string[];

  // Actual Performance (logged during session)
  actual_sets?: number | null;
  actual_reps?: number | null;
  actual_load_kg?: number | null;
  actual_rpe?: number | null;
  actual_duration_seconds?: number | null;
  actual_distance_meters?: number | null;
  performance_notes?: string | null;

  // Completion
  is_completed: boolean;
  skipped: boolean;
  skip_reason?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ========================================
// AI NUTRITION PLANS
// ========================================

export interface AINutritionPlan {
  id: string;

  // Link (1:1 with program)
  program_id: string;

  // Targets
  daily_calories?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fats_grams?: number | null;
  fiber_grams?: number | null;

  // Calculation
  calculation_method?: string | null;
  tdee_estimated?: number | null;
  calorie_adjustment_percentage?: number | null;

  // Meal Structure
  meals_per_day?: number | null;
  meal_timing_notes?: string | null;
  pre_workout_nutrition?: string | null;
  post_workout_nutrition?: string | null;

  // Meal Templates
  meal_templates?: MealTemplate[] | null;

  // Hydration & Supplements
  daily_water_liters?: number | null;
  supplement_recommendations: string[];

  // Dietary
  dietary_restrictions: string[];
  dietary_preferences: string[];

  // AI
  ai_rationale?: string | null;
  generated_at?: string | null;

  // Disclaimer
  disclaimer: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface MealTemplate {
  meal: string;  // "Breakfast", "Lunch", "Dinner", "Snack"
  timing?: string;  // "7:00 AM", "Post-workout"
  ideas: string[];  // Meal suggestions
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

// ========================================
// AI GENERATIONS (Logging)
// ========================================

export interface AIGeneration {
  id: string;

  // Scope
  generation_type: GenerationType;
  entity_id?: string | null;
  entity_type?: string | null;

  // Model
  ai_provider: string;  // 'anthropic', 'openai'
  ai_model: string;
  prompt_version?: string | null;

  // Request/Response
  system_prompt?: string | null;
  user_prompt?: string | null;
  prompt_parameters?: Record<string, any> | null;
  ai_response?: string | null;
  structured_output?: Record<string, any> | null;

  // Tokens
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: number | null;

  // Tool Calls
  tool_calls?: Record<string, any> | null;
  tool_results?: Record<string, any> | null;

  // Performance
  latency_ms?: number | null;
  retry_count: number;

  // Status
  status: string;  // 'success', 'error', 'partial'
  error_message?: string | null;
  error_code?: string | null;

  // Context
  created_by?: string | null;
  created_at: string;
}

// ========================================
// AI PROGRAM REVISIONS (Version History)
// ========================================

export interface AIProgramRevision {
  id: string;

  // Link
  program_id: string;

  // Version
  revision_number: number;
  revision_type?: RevisionType | null;
  change_description?: string | null;

  // Snapshot
  program_snapshot: ProgramSnapshot;
  workouts_count?: number | null;
  exercises_count?: number | null;

  // Changes
  changes_made?: RevisionChanges | null;

  // Metadata
  created_by?: string | null;
  created_at: string;
}

export interface ProgramSnapshot {
  program: AIProgram;
  workouts: AIWorkout[];
  exercises: AIWorkoutExercise[];
  nutrition?: AINutritionPlan;
}

export interface RevisionChanges {
  added?: string[];
  removed?: string[];
  modified?: string[];
}

// ========================================
// CREATE/UPDATE INPUT TYPES
// ========================================

export type CreateAIProgramInput = Omit<AIProgram, 'id' | 'created_at' | 'updated_at' | 'completion_percentage' | 'sessions_completed' | 'generation_status' | 'generation_error' | 'progress_message' | 'current_step' | 'total_steps' | 'progress_percentage'> & {
  id?: string;
  generation_status?: GenerationStatus;
  generation_error?: string | null;
  progress_message?: string | null;
  current_step?: number | null;
  total_steps?: number | null;
  progress_percentage?: number | null;
};

export type UpdateAIProgramInput = Partial<Omit<AIProgram, 'id' | 'created_at'>>;

export type CreateAIWorkoutInput = Omit<AIWorkout, 'id' | 'created_at' | 'updated_at' | 'is_completed'> & {
  id?: string;
};

export type UpdateAIWorkoutInput = Partial<Omit<AIWorkout, 'id' | 'created_at' | 'program_id'>>;

export type CreateAIWorkoutExerciseInput = Omit<AIWorkoutExercise, 'id' | 'created_at' | 'updated_at' | 'is_completed' | 'skipped'> & {
  id?: string;
};

export type UpdateAIWorkoutExerciseInput = Partial<Omit<AIWorkoutExercise, 'id' | 'created_at' | 'workout_id' | 'exercise_id'>>;

// ========================================
// AI GENERATION REQUEST/RESPONSE TYPES
// ========================================

/**
 * Input for AI program generation
 */
export interface GenerateProgramRequest {
  client_profile_id?: string;
  trainer_id: string;
  studio_id?: string;

  // Program config
  program_name?: string;
  total_weeks: number;
  sessions_per_week: number;
  session_duration_minutes: number;

  // Client constraints
  primary_goal: GoalType;
  secondary_goals?: GoalType[];
  experience_level: ExperienceLevel;
  available_equipment: string[];
  training_location: string;

  // Health constraints
  injuries?: Array<{ body_part: string; restrictions: string[] }>;
  physical_limitations?: string[];
  exercise_aversions?: string[];

  // Preferences
  preferred_exercise_types?: string[];
  preferred_movement_patterns?: string[];

  // Optional overrides
  movement_pattern_quotas?: Partial<MovementBalanceSummary>;
  include_nutrition?: boolean;

  // Client goals from ta_client_goals table (detailed targets with deadlines)
  client_goals?: Array<{
    goal_type: string;
    description: string;
    target_value: number | null;
    target_unit: string | null;
    current_value: number | null;
    target_date: string | null;
    priority: number;
  }>;
}

/**
 * AI program generation response
 */
export interface GenerateProgramResponse {
  program: AIProgram;
  workouts: AIWorkout[];
  exercises: AIWorkoutExercise[];
  nutrition?: AINutritionPlan;
  generation_log: AIGeneration;
}

/**
 * Movement pattern quotas for balanced programming
 */
export interface MovementPatternQuotas {
  push_horizontal: number;
  push_vertical: number;
  pull_horizontal: number;
  pull_vertical: number;
  squat: number;
  hinge: number;
  lunge: number;
  rotation: number;
  carry: number;
  mobility: number;
  core: number;
}

/**
 * Default quotas based on experience level and goal
 */
export function getDefaultMovementQuotas(
  experienceLevel: ExperienceLevel,
  primaryGoal: GoalType,
  sessionsPerWeek: number
): Partial<MovementPatternQuotas> {
  // Example: adjust based on experience and goal
  const baseQuotas: Partial<MovementPatternQuotas> = {
    push_horizontal: sessionsPerWeek >= 3 ? 2 : 1,
    push_vertical: sessionsPerWeek >= 4 ? 1 : 0,
    pull_horizontal: sessionsPerWeek >= 3 ? 2 : 1,
    pull_vertical: sessionsPerWeek >= 4 ? 1 : 1,
    squat: sessionsPerWeek >= 2 ? 2 : 1,
    hinge: sessionsPerWeek >= 2 ? 2 : 1,
    lunge: sessionsPerWeek >= 3 ? 1 : 0,
    core: Math.min(sessionsPerWeek, 3),
    mobility: 1,
  };

  // Adjust for goals
  if (primaryGoal === 'strength') {
    baseQuotas.squat = (baseQuotas.squat || 0) + 1;
    baseQuotas.hinge = (baseQuotas.hinge || 0) + 1;
  } else if (primaryGoal === 'hypertrophy') {
    // More volume across all patterns
    Object.keys(baseQuotas).forEach((key) => {
      baseQuotas[key as keyof MovementPatternQuotas] = Math.ceil((baseQuotas[key as keyof MovementPatternQuotas] || 0) * 1.5);
    });
  } else if (primaryGoal === 'mobility') {
    baseQuotas.mobility = (baseQuotas.mobility || 0) + 2;
  }

  return baseQuotas;
}

// ========================================
// DISPLAY HELPERS
// ========================================

export function getProgramStatusLabel(status: ProgramStatus): string {
  const labels: Record<ProgramStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  };
  return labels[status];
}

export function getSessionTypeLabel(type?: SessionType | null): string {
  if (!type) return 'Mixed';

  const labels: Record<SessionType, string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    conditioning: 'Conditioning',
    mobility: 'Mobility',
    recovery: 'Recovery',
    mixed: 'Mixed',
  };
  return labels[type];
}

export function formatWeekDay(weekNumber: number, dayNumber: number): string {
  return `Week ${weekNumber}, Day ${dayNumber}`;
}

export function calculateProgramProgress(program: AIProgram): number {
  if (!program.sessions_total || program.sessions_total === 0) return 0;
  return Math.round((program.sessions_completed / program.sessions_total) * 100);
}

export function getTotalExercisesInWorkout(exercises: AIWorkoutExercise[]): number {
  return exercises.filter((ex) => !ex.skipped).length;
}

export function getCompletedExercisesInWorkout(exercises: AIWorkoutExercise[]): number {
  return exercises.filter((ex) => ex.is_completed && !ex.skipped).length;
}

export function formatBlockLabel(label?: string | null): string {
  if (!label) return 'Main';
  return label;
}

export function formatRepsTarget(exercise: AIWorkoutExercise): string {
  if (exercise.reps_target) return exercise.reps_target;
  if (exercise.reps_min && exercise.reps_max) {
    return `${exercise.reps_min}-${exercise.reps_max}`;
  }
  if (exercise.reps_min) return `${exercise.reps_min}`;
  return 'As prescribed';
}

export function formatLoadTarget(exercise: AIWorkoutExercise): string {
  if (exercise.is_bodyweight) return 'Bodyweight';
  if (exercise.target_load_kg) return `${exercise.target_load_kg} kg`;
  if (exercise.target_load_percentage) return `${exercise.target_load_percentage}% 1RM`;
  return 'As tolerated';
}
