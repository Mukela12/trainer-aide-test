/**
 * Exercise Adapter Utilities
 *
 * Converts between Supabase exercise schema and frontend Exercise interface
 */

import type { SupabaseExercise, Exercise, MuscleGroup } from '../types';
import { getExerciseImageUrl } from '../supabase';

/**
 * Map Supabase anatomical_category to frontend MuscleGroup
 */
function mapAnatomicalCategoryToMuscleGroup(anatomicalCategory: string): MuscleGroup {
  const categoryLower = anatomicalCategory.toLowerCase();

  // Direct matches
  if (categoryLower.includes('chest')) return 'chest';
  if (categoryLower.includes('back')) return 'back';
  if (categoryLower.includes('leg') || categoryLower.includes('quad') || categoryLower.includes('hamstring') || categoryLower.includes('glutes')) return 'legs';
  if (categoryLower.includes('shoulder') || categoryLower.includes('deltoid')) return 'shoulders';
  if (categoryLower.includes('bicep')) return 'biceps';
  if (categoryLower.includes('tricep')) return 'triceps';
  if (categoryLower.includes('core') || categoryLower.includes('abdominal') || categoryLower.includes('abs')) return 'core';
  if (categoryLower.includes('forearm')) return 'forearms';
  if (categoryLower.includes('neck')) return 'neck';
  if (categoryLower.includes('full') && categoryLower.includes('body')) return 'full_body';
  if (categoryLower.includes('cardio')) return 'cardio';
  if (categoryLower.includes('stretch') || categoryLower.includes('mobility')) return 'stretch';

  // Default fallback
  return 'core';
}

/**
 * Convert Supabase exercise to frontend Exercise format
 */
export function supabaseToFrontendExercise(supabaseExercise: SupabaseExercise): Exercise {
  // Parse modifications from text
  const modifications = supabaseExercise.modifications_text
    ? supabaseExercise.modifications_text.split('|').map((mod) => mod.trim())
    : undefined;

  // Parse common mistakes from text
  const commonMistakes = supabaseExercise.common_mistakes_text
    ? supabaseExercise.common_mistakes_text.split('\n').filter((line) => line.trim().length > 0)
    : undefined;

  // Format primary and secondary muscles as strings
  const primaryMuscles = supabaseExercise.muscles_json?.primary
    ? supabaseExercise.muscles_json.primary.join(', ')
    : supabaseExercise.primary_muscles?.join(', ') || undefined;

  const secondaryMuscles = supabaseExercise.muscles_json?.secondary
    ? supabaseExercise.muscles_json.secondary.join(', ')
    : supabaseExercise.secondary_muscles?.join(', ') || undefined;

  // Get image URLs from Supabase storage
  const imageFolder = supabaseExercise.image_folder || supabaseExercise.slug;
  const startImageUrl = getExerciseImageUrl(imageFolder, 'start');
  const endImageUrl = getExerciseImageUrl(imageFolder, 'end');

  return {
    id: supabaseExercise.id,
    exerciseId: supabaseExercise.slug || supabaseExercise.id,
    name: supabaseExercise.name || 'Unknown Exercise',
    category: supabaseExercise.exercise_type === 'cardio'
      ? 'cardio'
      : supabaseExercise.exercise_type === 'mobility-stretch'
        ? 'stretch'
        : mapAnatomicalCategoryToMuscleGroup(supabaseExercise.anatomical_category || supabaseExercise.legacy_category || 'Core'),
    equipment: supabaseExercise.equipment || undefined,
    level: supabaseExercise.level || 'beginner',
    instructions: supabaseExercise.instructions || [],
    modifications,
    commonMistakes,
    primaryMuscles,
    secondaryMuscles,
    startImageUrl,
    endImageUrl,

    // Enhanced S&C fields
    exerciseType: supabaseExercise.exercise_type,
    anatomicalCategory: supabaseExercise.anatomical_category,
    movementPattern: supabaseExercise.movement_pattern,
    planeOfMotion: supabaseExercise.plane_of_motion,
    musclesJson: supabaseExercise.muscles_json,
    muscleIntensityJson: supabaseExercise.muscle_intensity_json,
    isUnilateral: supabaseExercise.is_unilateral,
    isBodyweight: supabaseExercise.is_bodyweight,
    tempoDefault: supabaseExercise.tempo_default,
    force: supabaseExercise.force,
    mechanic: supabaseExercise.mechanic,
  };
}

/**
 * Convert array of Supabase exercises to frontend format
 */
export function supabaseToFrontendExercises(supabaseExercises: SupabaseExercise[]): Exercise[] {
  const results: Exercise[] = [];
  for (const ex of supabaseExercises) {
    try {
      results.push(supabaseToFrontendExercise(ex));
    } catch (err) {
      // Skip exercises that fail to convert rather than failing the entire batch
      console.warn(`Failed to convert exercise ${ex.id} (${ex.name}):`, err);
    }
  }
  return results;
}

/**
 * Get exercise display category label
 */
export function getExerciseCategoryLabel(exercise: Exercise): string {
  if (exercise.anatomicalCategory) {
    return exercise.anatomicalCategory;
  }
  return exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1);
}

/**
 * Get exercise type label
 */
export function getExerciseTypeLabel(exerciseType?: string): string {
  if (!exerciseType) return 'Unknown';

  const typeLabels: Record<string, string> = {
    'resistance': 'Resistance',
    'cardio': 'Cardio',
    'mobility-stretch': 'Mobility/Stretch',
    'bodyweight-static': 'Bodyweight (Static)',
    'bodyweight-reps': 'Bodyweight (Reps)',
    'plyometric': 'Plyometric',
  };

  return typeLabels[exerciseType] || exerciseType;
}

/**
 * Get movement pattern label
 */
export function getMovementPatternLabel(pattern?: string | null): string {
  if (!pattern) return 'N/A';

  const patternLabels: Record<string, string> = {
    'push_horizontal': 'Horizontal Push',
    'push_vertical': 'Vertical Push',
    'pull_horizontal': 'Horizontal Pull',
    'pull_vertical': 'Vertical Pull',
    'squat': 'Squat',
    'hinge': 'Hinge',
    'lunge': 'Lunge',
    'rotation': 'Rotation',
    'carry': 'Carry',
    'mobility': 'Mobility',
    'anti-extension': 'Anti-Extension',
    'anti-rotation': 'Anti-Rotation',
    'anti-lateral-flexion': 'Anti-Lateral Flexion',
  };

  return patternLabels[pattern] || pattern;
}

/**
 * Get plane of motion label
 */
export function getPlaneOfMotionLabel(plane?: string | null): string {
  if (!plane) return 'N/A';

  const planeLabels: Record<string, string> = {
    'sagittal': 'Sagittal (Forward/Back)',
    'frontal': 'Frontal (Side-to-Side)',
    'transverse': 'Transverse (Rotational)',
    'multi-planar': 'Multi-Planar',
  };

  return planeLabels[plane] || plane;
}

/**
 * Check if exercise is suitable for client based on injuries/limitations
 * (Placeholder - actual implementation would need injury mapping logic)
 */
export function isExerciseSuitableForClient(
  exercise: Exercise,
  clientInjuries?: string[],
  clientLimitations?: string[]
): boolean {
  // TODO: Implement injury-exercise conflict detection
  // For now, return true (no conflicts)

  // Example logic (to be expanded):
  // if (clientInjuries?.includes('shoulder') && exercise.movementPattern === 'push_vertical') {
  //   return false;
  // }

  return true;
}

/**
 * Get exercise difficulty color
 */
export function getExerciseDifficultyColor(level: string): string {
  const colors: Record<string, string> = {
    'beginner': 'text-green-600',
    'intermediate': 'text-yellow-600',
    'advanced': 'text-red-600',
  };
  return colors[level] || 'text-gray-600';
}

/**
 * Format tempo string for display
 */
export function formatTempo(tempo?: string | null): string {
  if (!tempo) return 'N/A';

  // Tempo format: "eccentric-pause-concentric-pause" (e.g., "3-1-1-0")
  // 3 seconds down, 1 second pause, 1 second up, 0 second pause
  const parts = tempo.split('-');
  if (parts.length === 4) {
    return `${parts[0]}s down, ${parts[1]}s pause, ${parts[2]}s up, ${parts[3]}s pause`;
  }

  return tempo;
}

/**
 * Get primary muscle intensity score (0-1 scale)
 */
export function getPrimaryMuscleIntensity(exercise: Exercise): number {
  if (!exercise.muscleIntensityJson?.primary) return 0.5; // default

  const intensities = Object.values(exercise.muscleIntensityJson.primary);
  if (intensities.length === 0) return 0.5;

  // Return the maximum intensity among primary muscles
  return Math.max(...intensities);
}

/**
 * Get equipment abbreviation label
 */
export function getEquipmentIcon(equipment?: string): string {
  if (!equipment) return 'BB';

  const equipmentLabels: Record<string, string> = {
    'barbell': 'BB',
    'dumbbell': 'DB',
    'dumbbells': 'DB',
    'kettlebell': 'KB',
    'body only': 'BW',
    'bodyweight': 'BW',
    'exercise ball': 'SB',
    'resistance band': 'RB',
    'cable machine': 'CM',
    'machine': 'MC',
    'other': 'EQ',
  };

  const key = equipment.toLowerCase();
  return equipmentLabels[key] || 'BB';
}
