// Trainer Aide - TypeScript Type Definitions

// ========================================
// ENUMS & TYPES
// ========================================

// MuscleGroup defines 12 category groups for exercise classification
// NOTE: The imported exercise data currently only contains exercises for 9 of these categories:
//   - Used (9): cardio, chest, back, legs, core, shoulders, biceps, triceps, stretch
//   - Not used (3): full_body, forearms, neck
// The 3 unused categories are defined here for future expansion when additional
// exercises are imported or created for these muscle groups.
export type MuscleGroup =
  | 'cardio'
  | 'chest'
  | 'back'
  | 'legs'
  | 'core'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'full_body'
  | 'stretch'
  | 'forearms'
  | 'neck';

export type ResistanceType = 'bodyweight' | 'weight';

export type SignOffMode = 'full_session' | 'per_block' | 'per_exercise';

export type TemplateType = 'standard' | 'resistance_only';

// Extended UserRole with all 8 roles from RBAC system
// For the full type with all roles, import from @/lib/permissions
export type UserRole =
  | 'super_admin'
  | 'solo_practitioner'
  | 'studio_owner'
  | 'studio_manager'
  | 'trainer'
  | 'receptionist'
  | 'finance_manager'
  | 'client';

export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced';

// ========================================
// EXERCISE LIBRARY
// ========================================

// New types for Supabase exercise schema
export type ExerciseType =
  | 'resistance'
  | 'cardio'
  | 'mobility-stretch'
  | 'bodyweight-static'
  | 'bodyweight-reps'
  | 'plyometric';

export type MovementPattern =
  | 'push_horizontal'
  | 'push_vertical'
  | 'pull_horizontal'
  | 'pull_vertical'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'rotation'
  | 'carry'
  | 'mobility'
  | 'anti-extension'
  | 'anti-rotation'
  | 'anti-lateral-flexion';

export type PlaneOfMotion =
  | 'sagittal'
  | 'frontal'
  | 'transverse'
  | 'multi-planar';

export type ForceType = 'push' | 'pull' | 'static';

export type MechanicType = 'compound' | 'isolation' | null;

export interface MusclesJson {
  primary: string[];
  secondary: string[];
  stabilizers: string[];
}

export interface MuscleIntensityJson {
  primary: Record<string, number>; // muscle_name: intensity (0.0-1.0)
  secondary: Record<string, number>;
  stabilizers: Record<string, number>;
}

// Complete Supabase Exercise schema (ta_exercise_library)
export interface SupabaseExercise {
  id: string; // UUID
  slug: string; // Kebab-case slug
  name: string;

  // Classification
  exercise_type: ExerciseType;
  anatomical_category: string; // e.g., "Chest", "Back", "Mobility-Stretch"
  legacy_category: string; // Original category from data import
  movement_pattern: MovementPattern | null;
  plane_of_motion: PlaneOfMotion | null;

  // Biomechanics
  force: ForceType | null;
  mechanic: MechanicType;
  is_unilateral: boolean;
  is_bodyweight: boolean;

  // Difficulty & Equipment
  level: ExerciseLevel;
  equipment: string | null;

  // Muscles
  primary_muscles: string[]; // Legacy array format
  secondary_muscles: string[];
  muscles_json: MusclesJson; // Structured format
  muscle_intensity_json: MuscleIntensityJson; // Intensity scores

  // Instructions & Guidance
  instructions: string[];
  common_mistakes_text: string | null;
  modifications_text: string | null;
  tempo_default: string | null; // e.g., "3-1-1-0" (eccentric-pause-concentric-pause)

  // Media
  image_folder: string;
  start_image_url: string | null;
  end_image_url: string | null;

  // Metadata
  created_at: string;
}

// Simplified Exercise interface for frontend use (backwards compatible)
export interface Exercise {
  id: string;
  exerciseId: string; // Kebab-case ID matching Supabase folder name (e.g., 'ring-dips')
  name: string;
  category: MuscleGroup;
  equipment?: string;
  level: ExerciseLevel;
  instructions: string[];
  modifications?: string[]; // Progressive disclosure: Alternative ways to perform the exercise
  commonMistakes?: string[]; // Progressive disclosure: Common errors to avoid
  primaryMuscles?: string; // Primary muscles worked (for progressive disclosure)
  secondaryMuscles?: string; // Secondary muscles worked (for progressive disclosure)
  imageUrl?: string;
  startImageUrl?: string;
  endImageUrl?: string;

  // Enhanced S&C fields (from Supabase)
  exerciseType?: ExerciseType;
  anatomicalCategory?: string;
  movementPattern?: MovementPattern | null;
  planeOfMotion?: PlaneOfMotion | null;
  musclesJson?: MusclesJson;
  muscleIntensityJson?: MuscleIntensityJson;
  isUnilateral?: boolean;
  isBodyweight?: boolean;
  tempoDefault?: string | null;
  force?: ForceType | null;
  mechanic?: MechanicType;
}

// ========================================
// WORKOUT TEMPLATE
// ========================================

export interface TemplateExercise {
  id: string;
  exerciseId: string;
  position: number;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  resistanceValue: number;
  repsMin: number;
  repsMax: number;
  sets: number;
  // For cardio
  cardioDuration?: number;  // in seconds
  cardioIntensity?: number; // 1-10 scale
}

export interface WorkoutBlock {
  id: string;
  blockNumber: number;
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;  // 'standard' = 3-block with cardio, 'resistance_only' = no cardio required
  createdBy: string;   // user ID
  assignedStudios: string[];
  blocks: WorkoutBlock[];
  defaultSignOffMode?: SignOffMode; // How trainers should sign off sessions using this template
  alertIntervalMinutes?: number; // Alert interval in minutes (e.g., 10 = alert every 10 mins)
  isDefault?: boolean; // Whether this is the default template for the studio
  createdAt: string;
  updatedAt: string;
}

// ========================================
// CLIENT
// ========================================

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

// ========================================
// SESSION
// ========================================

export interface SessionExercise {
  id: string;
  exerciseId: string;
  position: number;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  resistanceValue: number;
  repsMin: number;
  repsMax: number;
  sets: number;
  // For cardio
  cardioDuration?: number;
  cardioIntensity?: number;
  // AI-specific fields (from AI-generated workouts)
  tempo?: string; // e.g., "3-1-1-0"
  restSeconds?: number; // Rest period between sets
  targetRpe?: number; // Target RPE (Rate of Perceived Exertion) for the exercise
  rir?: number; // Reps in Reserve
  coachingCues?: string[]; // Array of coaching cues for this exercise
  notes?: string; // Exercise-specific notes
  isBodyweight?: boolean; // Whether this is a bodyweight exercise
  // Tracking during session
  completed: boolean;
  actualResistance?: number;
  actualReps?: number;
  actualDuration?: number;
  rpe?: number; // Rate of Perceived Exertion for this exercise (1-10)
}

export interface SessionBlock {
  id: string;
  blockNumber: number;
  name: string;
  exercises: SessionExercise[];
  rpe?: number;  // Rate of Perceived Exertion (1-10)
  completed: boolean;
}

export interface Session {
  id: string;
  trainerId: string;
  clientId?: string;
  client?: Client;
  templateId: string;
  template?: WorkoutTemplate;
  sessionName: string;
  signOffMode: SignOffMode;
  blocks: SessionBlock[];
  startedAt: string;
  completedAt?: string;
  duration?: number; // in seconds (actual duration)
  plannedDurationMinutes?: number; // Estimated/planned duration in minutes (from AI workout or template)
  overallRpe?: number;
  privateNotes?: string; // Trainer only - not shared with client
  publicNotes?: string; // Shared with client in their dashboard
  recommendations?: string;
  trainerDeclaration: boolean;
  completed: boolean;
}

// ========================================
// USER
// ========================================

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
}

// ========================================
// FORM TYPES
// ========================================

export interface CreateTemplateFormData {
  name: string;
  description: string;
  type: TemplateType;
  assignedStudios: string[];
}

export interface StartSessionFormData {
  templateId: string;
  clientId: string;
  signOffMode: SignOffMode;
}

export interface CompleteSessionFormData {
  overallRpe: number;
  privateNotes: string;
  publicNotes: string;
  recommendations?: string;
  trainerDeclaration: boolean;
}
