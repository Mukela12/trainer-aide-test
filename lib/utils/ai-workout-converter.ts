import { AIWorkout, AIWorkoutExercise } from '@/lib/types/ai-program';
import { SessionBlock, SessionExercise } from '@/lib/types';

/**
 * Converts an AI workout to session blocks format
 * This allows AI-generated workouts to be used in training sessions
 */
export function convertAIWorkoutToSessionBlocks(workout: AIWorkout): SessionBlock[] {
  // Validate workout has exercises
  if (!workout) {
    console.error('AI workout converter: Workout is null or undefined');
    throw new Error('Invalid workout data. Please try selecting a different workout.');
  }

  if (!workout.exercises || workout.exercises.length === 0) {
    console.error('AI workout converter: Workout has no exercises', {
      workout_id: workout.id,
      workout_name: workout.workout_name,
      week: workout.week_number,
      day: workout.day_number
    });
    throw new Error(
      `This workout (${workout.workout_name}) has no exercises. ` +
      'The program may not have generated correctly. Please regenerate the program or select a different workout.'
    );
  }

  // Group exercises by block label (AI workouts may have exercises in different blocks like A1, A2, B1, etc.)
  const exercisesByBlock = workout.exercises.reduce((acc, exercise) => {
    // Extract block identifier from block_label (e.g., "A1" -> "A", "B1" -> "B")
    const blockLabel = exercise.block_label || 'A';
    const blockId = blockLabel.charAt(0); // Get first character as block ID
    if (!acc[blockId]) {
      acc[blockId] = [];
    }
    acc[blockId].push(exercise);
    return acc;
  }, {} as Record<string, AIWorkoutExercise[]>);

  // Convert to session blocks
  const blocks: SessionBlock[] = Object.entries(exercisesByBlock)
    .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically (A, B, C, etc.)
    .map(([blockId, exercises], index) => {
      const sortedExercises = exercises.sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0));

      return {
        id: `ai_block_${workout.id}_${blockId}`,
        blockNumber: index + 1, // Use array index as block number
        name: `Block ${blockId}`,
        exercises: sortedExercises.map((exercise, exerciseIndex) =>
          convertAIExerciseToSessionExercise(exercise, exerciseIndex + 1)
        ),
        rpe: undefined,
        completed: false,
      };
    });

  return blocks;
}

/**
 * Converts an AI exercise to session exercise format
 */
export function convertAIExerciseToSessionExercise(
  aiExercise: AIWorkoutExercise,
  position: number
): SessionExercise {
  // Default muscle group - would need exercise library to determine from exercise_id
  const muscleGroup = 'full_body'; // Use full_body as default when we don't have exercise details

  // Determine resistance type based on AI exercise data
  const resistanceType = aiExercise.is_bodyweight
    ? 'bodyweight'
    : 'weight';

  // Get reps from AI format - parse reps_target string if reps_min/max not set
  let repsMin = aiExercise.reps_min || 0;
  let repsMax = aiExercise.reps_max || 0;

  // If reps_min/max are 0 but we have reps_target string (e.g., "8-12"), parse it
  if (repsMin === 0 && repsMax === 0 && aiExercise.reps_target) {
    const parsed = parseReps(String(aiExercise.reps_target));
    repsMin = parsed.repsMin;
    repsMax = parsed.repsMax;
  }

  return {
    id: `ai_ex_${aiExercise.id}`,
    exerciseId: aiExercise.exercise_id,
    position,
    muscleGroup,
    resistanceType,
    resistanceValue: aiExercise.target_load_kg || 0,
    repsMin,
    repsMax,
    sets: aiExercise.sets || 1,
    cardioDuration: aiExercise.target_duration_seconds ? Math.floor(aiExercise.target_duration_seconds / 60) : undefined,
    cardioIntensity: undefined,
    completed: aiExercise.is_completed,
    actualResistance: aiExercise.actual_load_kg ?? undefined,
    actualReps: aiExercise.actual_reps ?? undefined,
    actualDuration: aiExercise.actual_duration_seconds ? Math.floor(aiExercise.actual_duration_seconds / 60) : undefined,
    rpe: aiExercise.actual_rpe ?? undefined,
    // Store AI-specific fields in a way that can be accessed during the session
    tempo: aiExercise.tempo ?? undefined,
    restSeconds: aiExercise.rest_seconds ?? undefined,
    rir: aiExercise.target_rir ?? undefined,
    coachingCues: aiExercise.coaching_cues,
    notes: aiExercise.performance_notes ?? undefined,
  };
}

/**
 * Determines muscle group from exercise name
 * This is a simple heuristic - in production you'd want a proper mapping
 */
function determineMuscleGroup(exerciseName: string): 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core' | 'cardio' | 'stretch' | 'full_body' {
  const name = exerciseName.toLowerCase();

  if (name.includes('chest') || name.includes('press') || name.includes('pushup')) {
    return 'chest';
  }
  if (name.includes('back') || name.includes('row') || name.includes('pulldown') || name.includes('pull-up')) {
    return 'back';
  }
  if (name.includes('squat') || name.includes('lunge') || name.includes('leg')) {
    return 'legs';
  }
  if (name.includes('shoulder') || name.includes('lateral') || name.includes('overhead')) {
    return 'shoulders';
  }
  if (name.includes('bicep') || name.includes('curl')) {
    return 'biceps';
  }
  if (name.includes('tricep') || name.includes('extension')) {
    return 'triceps';
  }
  if (name.includes('core') || name.includes('plank') || name.includes('crunch') || name.includes('ab')) {
    return 'core';
  }
  if (name.includes('cardio') || name.includes('run') || name.includes('bike') || name.includes('row')) {
    return 'cardio';
  }
  if (name.includes('stretch')) {
    return 'stretch';
  }

  return 'full_body';
}

/**
 * Parses reps string (e.g., "10-12" or "10") into min/max values
 */
function parseReps(reps: string | number | null | undefined): { repsMin: number; repsMax: number } {
  if (!reps) return { repsMin: 0, repsMax: 0 };

  const repsStr = String(reps).trim();

  if (repsStr.includes('-')) {
    const [min, max] = repsStr.split('-').map(s => parseInt(s.trim(), 10));
    return { repsMin: min || 0, repsMax: max || min || 0 };
  }

  const repCount = parseInt(repsStr, 10) || 0;
  return { repsMin: repCount, repsMax: repCount };
}

/**
 * Gets a descriptive name for a session created from an AI workout
 */
export function getAIWorkoutSessionName(
  workout: AIWorkout,
  clientName?: string
): string {
  const workoutName = workout.workout_name || `Week ${workout.week_number} Day ${workout.day_number}`;

  if (clientName) {
    return `${workoutName} with ${clientName}`;
  }

  return workoutName;
}
