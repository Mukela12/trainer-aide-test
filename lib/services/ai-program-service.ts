/**
 * AI Program Service
 *
 * Supabase operations for AI-generated workout programs
 */

import { supabaseServer as supabase } from '../supabase-server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/services/profile-service';
import {
  getClientProfileByEmail,
  createClientProfile,
} from '@/lib/services/client-profile-service';
import type {
  AIProgram,
  AIWorkout,
  AIWorkoutExercise,
  AINutritionPlan,
  AIGeneration,
  AIProgramRevision,
  CreateAIProgramInput,
  UpdateAIProgramInput,
  CreateAIWorkoutInput,
  CreateAIWorkoutExerciseInput,
  ProgramStatus,
} from '../types/ai-program';

// ========================================
// AI PROGRAMS (Master Records)
// ========================================

/**
 * Create new AI program
 */
export async function createAIProgram(
  input: CreateAIProgramInput
): Promise<{ data: AIProgram | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_programs')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('❌ ERROR creating AI program:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error, null, 2),
      });
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('❌ EXCEPTION creating AI program:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      fullError: JSON.stringify(err, null, 2),
    });
    return { data: null, error: err };
  }
}

/**
 * Get AI program by ID
 */
export async function getAIProgramById(id: string): Promise<AIProgram | null> {
  const { data, error } = await supabase
    .from('ai_programs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching AI program:', error);
    return null;
  }

  return data;
}

/**
 * Get all AI programs for a trainer
 */
export async function getAIProgramsByTrainer(trainerId: string): Promise<AIProgram[]> {
  const { data, error } = await supabase
    .from('ai_programs')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trainer programs:', error);
    throw new Error(`Failed to fetch programs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get AI programs by client
 */
export async function getAIProgramsByClient(clientProfileId: string): Promise<AIProgram[]> {
  const { data, error } = await supabase
    .from('ai_programs')
    .select('*')
    .eq('client_profile_id', clientProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client programs:', error);
    throw new Error(`Failed to fetch programs: ${error.message}`);
  }

  return data || [];
}

/**
 * Get AI program templates (is_template = true)
 */
export async function getAIProgramTemplates(): Promise<AIProgram[]> {
  const { data, error } = await supabase
    .from('ai_programs')
    .select('*')
    .eq('is_template', true)
    .eq('is_published', true)
    .order('created_at', { ascending: false});

  if (error) {
    console.error('Error fetching AI templates:', error);
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }

  return data || [];
}

/**
 * Update AI program
 */
export async function updateAIProgram(
  id: string,
  updates: UpdateAIProgramInput
): Promise<{ data: AIProgram | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI program:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception updating AI program:', err);
    return { data: null, error: err };
  }
}

/**
 * Update program status
 */
export async function updateProgramStatus(
  id: string,
  status: ProgramStatus
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('ai_programs')
      .update({ status })
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

/**
 * Delete AI program (cascade deletes workouts, exercises)
 */
export async function deleteAIProgram(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('ai_programs')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

// ========================================
// AI WORKOUTS (Individual Sessions)
// ========================================

/**
 * Create AI workout
 */
export async function createAIWorkout(
  input: CreateAIWorkoutInput
): Promise<{ data: AIWorkout | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_workouts')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI workout:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating AI workout:', err);
    return { data: null, error: err };
  }
}

/**
 * Create multiple AI workouts (batch)
 * Uses upsert to handle duplicates (idempotent for retries/regeneration)
 */
export async function createAIWorkouts(
  inputs: CreateAIWorkoutInput[]
): Promise<{ data: AIWorkout[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_workouts')
      .upsert(inputs, {
        onConflict: 'program_id,week_number,day_number',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Error creating AI workouts:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating AI workouts:', err);
    return { data: null, error: err };
  }
}

/**
 * Get AI workout by ID
 */
export async function getAIWorkoutById(id: string): Promise<AIWorkout | null> {
  const { data, error } = await supabase
    .from('ai_workouts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching AI workout:', error);
    return null;
  }

  return data;
}

/**
 * Get all workouts for a program
 */
export async function getAIWorkoutsByProgram(programId: string): Promise<AIWorkout[]> {
  const { data, error } = await supabase
    .from('ai_workouts')
    .select('*')
    .eq('program_id', programId)
    .order('week_number', { ascending: true })
    .order('day_number', { ascending: true });

  if (error) {
    console.error('Error fetching program workouts:', error);
    throw new Error(`Failed to fetch workouts: ${error.message}`);
  }

  return data || [];
}

/**
 * Get workouts for specific week
 */
export async function getAIWorkoutsByWeek(
  programId: string,
  weekNumber: number
): Promise<AIWorkout[]> {
  const { data, error } = await supabase
    .from('ai_workouts')
    .select('*')
    .eq('program_id', programId)
    .eq('week_number', weekNumber)
    .order('day_number', { ascending: true });

  if (error) {
    console.error('Error fetching week workouts:', error);
    throw new Error(`Failed to fetch workouts: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete all workouts for a program (exercises cascade delete)
 * Used for cleanup before regenerating workouts
 */
export async function deleteAIWorkoutsByProgram(
  programId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('ai_workouts')
      .delete()
      .eq('program_id', programId);

    if (error) {
      console.error('Error deleting AI workouts:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Exception deleting AI workouts:', err);
    return { success: false, error: err };
  }
}

// ========================================
// AI WORKOUT EXERCISES (Prescriptions)
// ========================================

/**
 * Create AI workout exercise
 */
export async function createAIWorkoutExercise(
  input: CreateAIWorkoutExerciseInput
): Promise<{ data: AIWorkoutExercise | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_workout_exercises')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI workout exercise:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating AI workout exercise:', err);
    return { data: null, error: err };
  }
}

/**
 * Create multiple AI workout exercises (batch)
 */
export async function createAIWorkoutExercises(
  inputs: CreateAIWorkoutExerciseInput[]
): Promise<{ data: AIWorkoutExercise[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_workout_exercises')
      .insert(inputs)
      .select();

    if (error) {
      console.error('Error creating AI workout exercises:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating AI workout exercises:', err);
    return { data: null, error: err };
  }
}

/**
 * Get exercises for a workout
 */
export async function getAIWorkoutExercisesByWorkout(workoutId: string): Promise<AIWorkoutExercise[]> {
  const { data, error } = await supabase
    .from('ai_workout_exercises')
    .select('*')
    .eq('workout_id', workoutId)
    .order('exercise_order', { ascending: true });

  if (error) {
    console.error('Error fetching workout exercises:', error);
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  return data || [];
}

// ========================================
// AI NUTRITION PLANS
// ========================================

/**
 * Create AI nutrition plan
 */
export async function createAINutritionPlan(
  input: Omit<AINutritionPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: AINutritionPlan | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_nutrition_plans')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating AI nutrition plan:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating AI nutrition plan:', err);
    return { data: null, error: err };
  }
}

/**
 * Get nutrition plan by program
 */
export async function getAINutritionPlanByProgram(programId: string): Promise<AINutritionPlan | null> {
  const { data, error } = await supabase
    .from('ai_nutrition_plans')
    .select('*')
    .eq('program_id', programId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching nutrition plan:', error);
    return null;
  }

  return data;
}

// ========================================
// AI GENERATION LOGGING
// ========================================

/**
 * Log AI generation
 */
export async function logAIGeneration(
  input: Omit<AIGeneration, 'id' | 'created_at'>
): Promise<{ data: AIGeneration | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_generations')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error logging AI generation:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception logging AI generation:', err);
    return { data: null, error: err };
  }
}

/**
 * Get AI generations for an entity
 */
export async function getAIGenerationsByEntity(
  entityId: string,
  entityType: string
): Promise<AIGeneration[]> {
  const { data, error } = await supabase
    .from('ai_generations')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching AI generations:', error);
    throw new Error(`Failed to fetch generations: ${error.message}`);
  }

  return data || [];
}

// ========================================
// PROGRAM REVISIONS (Version History)
// ========================================

/**
 * Create program revision
 */
export async function createProgramRevision(
  input: Omit<AIProgramRevision, 'id' | 'created_at'>
): Promise<{ data: AIProgramRevision | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('ai_program_revisions')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('Error creating program revision:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Exception creating program revision:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all revisions for a program
 */
export async function getProgramRevisions(programId: string): Promise<AIProgramRevision[]> {
  const { data, error } = await supabase
    .from('ai_program_revisions')
    .select('*')
    .eq('program_id', programId)
    .order('revision_number', { ascending: false });

  if (error) {
    console.error('Error fetching program revisions:', error);
    throw new Error(`Failed to fetch revisions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get latest program revision
 */
export async function getLatestProgramRevision(programId: string): Promise<AIProgramRevision | null> {
  const { data, error } = await supabase
    .from('ai_program_revisions')
    .select('*')
    .eq('program_id', programId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching latest revision:', error);
    return null;
  }

  return data;
}

// ========================================
// COMPLEX QUERIES
// ========================================

/**
 * Get complete program with all workouts and exercises
 */
export async function getCompleteProgramData(programId: string): Promise<{
  program: AIProgram | null;
  workouts: AIWorkout[];
  exercises: AIWorkoutExercise[];
  nutrition: AINutritionPlan | null;
}> {
  const program = await getAIProgramById(programId);
  if (!program) {
    return { program: null, workouts: [], exercises: [], nutrition: null };
  }

  const workouts = await getAIWorkoutsByProgram(programId);

  // Get all exercises for all workouts
  const exercisesPromises = workouts.map((w) => getAIWorkoutExercisesByWorkout(w.id));
  const exercisesArrays = await Promise.all(exercisesPromises);
  const exercises = exercisesArrays.flat();

  const nutrition = await getAINutritionPlanByProgram(programId);

  return { program, workouts, exercises, nutrition };
}

/**
 * Get program statistics
 */
export async function getProgramStats(programId: string): Promise<{
  total_workouts: number;
  total_exercises: number;
  completed_workouts: number;
  completion_percentage: number;
}> {
  const workouts = await getAIWorkoutsByProgram(programId);
  const completedWorkouts = workouts.filter((w) => w.is_completed).length;

  const exercisesPromises = workouts.map((w) => getAIWorkoutExercisesByWorkout(w.id));
  const exercisesArrays = await Promise.all(exercisesPromises);
  const totalExercises = exercisesArrays.flat().length;

  return {
    total_workouts: workouts.length,
    total_exercises: totalExercises,
    completed_workouts: completedWorkouts,
    completion_percentage: workouts.length > 0 ? Math.round((completedWorkouts / workouts.length) * 100) : 0,
  };
}

// ========================================
// ORCHESTRATION FUNCTIONS
// ========================================

/**
 * Update an AI program with nested workouts and exercises.
 * Replaces mock data getUserById with profile-service getProfileById.
 */
export async function updateAIProgramWithWorkouts(
  programId: string,
  body: {
    program_name?: string;
    description?: string;
    total_weeks?: number;
    sessions_per_week?: number;
    session_duration_minutes?: number;
    status?: string;
    workouts?: Array<{
      id: string;
      workout_name?: string;
      notes?: string;
      exercises?: Array<{
        id: string;
        exercise_name?: string;
        sets?: number;
        reps?: string;
        tempo?: string;
        rest_seconds?: number;
        rir?: number;
        movement_pattern?: string;
        primary_muscles?: string[];
        coaching_cues?: string[];
        notes?: string;
        order_index?: number;
      }>;
    }>;
  }
): Promise<{ data: AIProgram | null; error: Error | null }> {
  try {
    // Role-based access control
    const existingProgram = await getAIProgramById(programId);
    if (!existingProgram) {
      return { data: null, error: new Error('Program not found') };
    }

    const user = await getProfileById(existingProgram.trainer_id);
    if (!user || user.role !== 'solo_practitioner') {
      return { data: null, error: new Error('Unauthorized: AI Programs are only available to solo practitioners') };
    }

    // Update program metadata
    const { data: updatedProgram, error } = await updateAIProgram(programId, {
      program_name: body.program_name,
      description: body.description,
      total_weeks: body.total_weeks,
      sessions_per_week: body.sessions_per_week,
      session_duration_minutes: body.session_duration_minutes,
      status: body.status as ProgramStatus | undefined,
    });

    if (error || !updatedProgram) {
      return { data: null, error: error || new Error('Failed to update program') };
    }

    // Update workouts if provided
    if (body.workouts && Array.isArray(body.workouts)) {
      for (const workout of body.workouts) {
        await supabase
          .from('ai_workouts')
          .update({
            workout_name: workout.workout_name,
            notes: workout.notes,
          })
          .eq('id', workout.id);

        if (workout.exercises && Array.isArray(workout.exercises)) {
          for (const exercise of workout.exercises) {
            await supabase
              .from('ai_workout_exercises')
              .update({
                exercise_name: exercise.exercise_name,
                sets: exercise.sets,
                reps: exercise.reps,
                tempo: exercise.tempo,
                rest_seconds: exercise.rest_seconds,
                rir: exercise.rir,
                movement_pattern: exercise.movement_pattern,
                primary_muscles: exercise.primary_muscles,
                coaching_cues: exercise.coaching_cues,
                notes: exercise.notes,
                order_index: exercise.order_index,
              })
              .eq('id', exercise.id);
          }
        }
      }
    }

    // Fetch updated program with all relations
    const fullProgram = await getAIProgramById(programId);
    return { data: fullProgram, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Duplicate an AI program with all its workouts and exercises.
 */
export async function duplicateAIProgram(
  programId: string
): Promise<{ data: AIProgram | null; error: Error | null }> {
  try {
    const { program: originalProgram, workouts, exercises } = await getCompleteProgramData(programId);

    if (!originalProgram) {
      return { data: null, error: new Error('Program not found') };
    }

    // Create new program (copy of original)
    const { data: newProgram, error: programError } = await createAIProgram({
      trainer_id: originalProgram.trainer_id,
      created_by: originalProgram.created_by,
      client_profile_id: null,
      program_name: `${originalProgram.program_name} (Copy)`,
      description: originalProgram.description,
      total_weeks: originalProgram.total_weeks,
      sessions_per_week: originalProgram.sessions_per_week,
      session_duration_minutes: originalProgram.session_duration_minutes,
      primary_goal: originalProgram.primary_goal,
      secondary_goals: originalProgram.secondary_goals,
      experience_level: originalProgram.experience_level,
      ai_model: originalProgram.ai_model,
      ai_rationale: originalProgram.ai_rationale,
      movement_balance_summary: originalProgram.movement_balance_summary,
      status: 'draft',
      is_template: false,
      is_published: false,
      allow_client_modifications: originalProgram.allow_client_modifications,
    });

    if (programError || !newProgram) {
      return { data: null, error: programError || new Error('Failed to duplicate program') };
    }

    // Copy all workouts
    const workoutIdMap = new Map<string, string>();

    if (workouts && workouts.length > 0) {
      for (const workout of workouts) {
        const { data: newWorkout, error: workoutError } = await createAIWorkout({
          program_id: newProgram.id,
          week_number: workout.week_number,
          day_number: workout.day_number,
          session_order: workout.session_order,
          workout_name: workout.workout_name,
          workout_focus: workout.workout_focus,
          session_type: workout.session_type,
          scheduled_date: workout.scheduled_date,
          planned_duration_minutes: workout.planned_duration_minutes,
          movement_patterns_covered: workout.movement_patterns_covered,
          planes_of_motion_covered: workout.planes_of_motion_covered,
          primary_muscle_groups: workout.primary_muscle_groups,
          ai_rationale: workout.ai_rationale,
          exercise_selection_criteria: workout.exercise_selection_criteria,
          overall_rpe: workout.overall_rpe,
          trainer_notes: workout.trainer_notes,
          client_feedback: workout.client_feedback,
        });

        if (workoutError || !newWorkout) {
          console.error('Error duplicating workout:', workoutError);
          continue;
        }

        workoutIdMap.set(workout.id, newWorkout.id);
      }
    }

    // Copy all exercises
    if (exercises && exercises.length > 0) {
      const exercisesToInsert = exercises
        .filter(exercise => workoutIdMap.has(exercise.workout_id))
        .map(exercise => ({
          workout_id: workoutIdMap.get(exercise.workout_id)!,
          exercise_id: exercise.exercise_id,
          exercise_order: exercise.exercise_order,
          block_label: exercise.block_label,
          sets: exercise.sets,
          reps_min: exercise.reps_min,
          reps_max: exercise.reps_max,
          reps_target: exercise.reps_target,
          target_load_kg: exercise.target_load_kg,
          target_load_percentage: exercise.target_load_percentage,
          target_rpe: exercise.target_rpe,
          target_rir: exercise.target_rir,
          tempo: exercise.tempo,
          rest_seconds: exercise.rest_seconds,
          target_duration_seconds: exercise.target_duration_seconds,
          target_distance_meters: exercise.target_distance_meters,
          is_unilateral: exercise.is_unilateral,
          is_bodyweight: exercise.is_bodyweight,
          is_timed: exercise.is_timed,
          coaching_cues: exercise.coaching_cues,
          common_mistakes: exercise.common_mistakes,
          modifications: exercise.modifications,
          actual_sets: exercise.actual_sets,
          actual_reps: exercise.actual_reps,
          actual_load_kg: exercise.actual_load_kg,
          actual_rpe: exercise.actual_rpe,
          actual_duration_seconds: exercise.actual_duration_seconds,
          actual_distance_meters: exercise.actual_distance_meters,
          performance_notes: exercise.performance_notes,
          skip_reason: exercise.skip_reason,
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await createAIWorkoutExercises(exercisesToInsert);
        if (exercisesError) {
          console.error('Error duplicating exercises:', exercisesError);
        }
      }
    }

    // Fetch the complete duplicated program
    const { program: completeDuplicate } = await getCompleteProgramData(newProgram.id);
    return { data: completeDuplicate, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Assign an AI program to a client.
 */
export async function assignProgramToClient(
  programId: string,
  clientId: string
): Promise<{ data: AIProgram | null; error: Error | null }> {
  try {
    const serviceClient = createServiceRoleClient();

    // Get the fc_clients record
    const { data: fcClient, error: fcError } = await serviceClient
      .from('fc_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fcError || !fcClient) {
      return { data: null, error: new Error('Client not found') };
    }

    // Find or create client_profile by email
    let clientProfile = await getClientProfileByEmail(fcClient.email);

    if (!clientProfile) {
      const { data: newProfile, error: createError } = await createClientProfile({
        email: fcClient.email,
        first_name: fcClient.first_name || fcClient.name?.split(' ')[0] || 'Unknown',
        last_name: fcClient.last_name || fcClient.name?.split(' ').slice(1).join(' ') || '',
        experience_level: 'intermediate',
        primary_goal: 'general_fitness',
        current_activity_level: 'moderately_active',
        secondary_goals: [],
        preferred_training_days: [],
        preferred_training_times: [],
        available_equipment: [],
        injuries: [],
        medical_conditions: [],
        medications: [],
        physical_limitations: [],
        doctor_clearance: true,
        preferred_exercise_types: [],
        exercise_aversions: [],
        preferred_movement_patterns: [],
        dietary_restrictions: [],
        dietary_preferences: [],
        is_active: true,
      });

      if (createError || !newProfile) {
        return { data: null, error: createError || new Error('Failed to create client profile') };
      }
      clientProfile = newProfile;
    }

    // Assign program using client_profile.id
    const { data: updatedProgram, error } = await updateAIProgram(programId, {
      client_profile_id: clientProfile.id,
      status: 'active',
    });

    if (error || !updatedProgram) {
      return { data: null, error: error || new Error('Failed to assign program') };
    }

    return { data: updatedProgram, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Assign an AI program to a trainer.
 */
export async function assignProgramToTrainer(
  programId: string,
  trainerId: string,
  assignedBy: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const serviceClient = createServiceRoleClient();

    const { error: assignError } = await serviceClient
      .from('ai_program_trainer_assignments')
      .upsert({
        ai_program_id: programId,
        trainer_id: trainerId,
        assigned_by: assignedBy,
      }, {
        onConflict: 'ai_program_id,trainer_id'
      });

    if (assignError) {
      console.error('Error assigning to trainer:', assignError);
      return { data: null, error: new Error(assignError.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Unassign an AI program from a trainer.
 */
export async function unassignProgramFromTrainer(
  programId: string,
  trainerId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const serviceClient = createServiceRoleClient();

    const { error: deleteError } = await serviceClient
      .from('ai_program_trainer_assignments')
      .delete()
      .eq('ai_program_id', programId)
      .eq('trainer_id', trainerId);

    if (deleteError) {
      console.error('Error unassigning from trainer:', deleteError);
      return { data: null, error: new Error(deleteError.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
