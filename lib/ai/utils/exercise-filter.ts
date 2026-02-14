/**
 * Exercise Filtering for AI Workout Generation
 *
 * Intelligently filters exercises based on client constraints
 */

import type { SupabaseExercise } from '@/lib/types';
import type { GenerateProgramRequest } from '@/lib/types/ai-program';
import { getExercises } from '@/lib/services/exercise-service';

export interface ExerciseFilterStats {
  total_available: number;
  filtered_by_equipment: number;
  filtered_by_experience: number;
  filtered_by_injuries: number;
  filtered_by_aversions: number;
  final_count: number;
}

/**
 * Filter exercises based on client profile and program requirements
 */
export async function filterExercisesForClient(
  request: GenerateProgramRequest
): Promise<{ exercises: SupabaseExercise[]; stats: ExerciseFilterStats }> {
  const {
    available_equipment,
    experience_level,
    injuries = [],
    exercise_aversions = [],
  } = request;

  const stats: ExerciseFilterStats = {
    total_available: 0,
    filtered_by_equipment: 0,
    filtered_by_experience: 0,
    filtered_by_injuries: 0,
    filtered_by_aversions: 0,
    final_count: 0,
  };

  // Step 1: Get all exercises
  const allExercises = await getExercises();
  stats.total_available = allExercises.length;

  let filtered = allExercises;

  // Step 2: Filter by equipment
  filtered = filterByEquipment(filtered, available_equipment);
  stats.filtered_by_equipment = stats.total_available - filtered.length;

  // Step 3: Filter by experience level
  filtered = filterByExperience(filtered, experience_level);
  stats.filtered_by_experience = stats.total_available - stats.filtered_by_equipment - filtered.length;

  // Step 4: Filter by injuries (remove conflicting exercises)
  if (injuries.length > 0) {
    const beforeInjuryFilter = filtered.length;
    filtered = filterByInjuries(filtered, injuries);
    stats.filtered_by_injuries = beforeInjuryFilter - filtered.length;
  }

  // Step 5: Filter by exercise aversions
  if (exercise_aversions.length > 0) {
    const beforeAversionFilter = filtered.length;
    filtered = filterByAversions(filtered, exercise_aversions);
    stats.filtered_by_aversions = beforeAversionFilter - filtered.length;
  }

  stats.final_count = filtered.length;

  return { exercises: filtered, stats };
}

/**
 * Filter exercises by available equipment
 */
function filterByEquipment(
  exercises: SupabaseExercise[],
  availableEquipment: string[]
): SupabaseExercise[] {
  // If no equipment specified, return all
  if (availableEquipment.length === 0) {
    return exercises;
  }

  // Normalize equipment names
  const normalizedEquipment = availableEquipment.map((eq) => eq.toLowerCase().trim());

  // Always allow bodyweight exercises
  const allowBodyweight = true;

  return exercises.filter((ex) => {
    // Always include bodyweight exercises
    if (ex.is_bodyweight || !ex.equipment || ex.equipment.toLowerCase() === 'body only') {
      return allowBodyweight;
    }

    const exEquipment = ex.equipment.toLowerCase().trim();

    // Check if exercise equipment is in available equipment
    return normalizedEquipment.some((available) => {
      // Exact match
      if (exEquipment === available) return true;

      // Partial match (e.g., "dumbbell" matches "dumbbells")
      if (exEquipment.includes(available) || available.includes(exEquipment)) return true;

      // Handle "barbell" vs "bar"
      if (available === 'barbell' && (exEquipment.includes('bar') || exEquipment.includes('barbell'))) return true;
      if (available === 'bar' && exEquipment.includes('barbell')) return true;

      // Handle "dumbbell" vs "db"
      if (available.includes('dumbbell') && exEquipment.includes('dumbbell')) return true;

      return false;
    });
  });
}

/**
 * Filter exercises by experience level
 */
function filterByExperience(
  exercises: SupabaseExercise[],
  experienceLevel: string
): SupabaseExercise[] {
  const level = experienceLevel.toLowerCase();

  // Mapping: what levels can access what exercise difficulties
  const allowedLevels: Record<string, string[]> = {
    complete_beginner: ['beginner'],
    beginner: ['beginner', 'intermediate'],
    intermediate: ['beginner', 'intermediate', 'advanced'],
    advanced: ['beginner', 'intermediate', 'advanced'],
    elite: ['beginner', 'intermediate', 'advanced'],
  };

  const allowed = allowedLevels[level] || ['beginner', 'intermediate'];

  return exercises.filter((ex) => allowed.includes(ex.level));
}

/**
 * Filter exercises by injury restrictions
 */
function filterByInjuries(
  exercises: SupabaseExercise[],
  injuries: Array<{ body_part: string; restrictions: string[] }>
): SupabaseExercise[] {
  // Collect all restrictions
  const allRestrictions = injuries.flatMap((inj) =>
    inj.restrictions.map((r) => r.toLowerCase().trim())
  );

  if (allRestrictions.length === 0) {
    return exercises;
  }

  return exercises.filter((ex) => {
    const exName = ex.name.toLowerCase();
    const exCategory = ex.anatomical_category?.toLowerCase() || '';
    const exMovement = ex.movement_pattern?.toLowerCase() || '';
    const exMuscles = [...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])]
      .map((m) => m.toLowerCase());

    // Check if exercise conflicts with any restriction
    for (const restriction of allRestrictions) {
      // Direct name match
      if (restriction.includes(exName) || exName.includes(restriction)) {
        return false;  // EXCLUDE
      }

      // Movement pattern conflicts
      if (restriction.includes('overhead') && exMovement.includes('push_vertical')) {
        return false;
      }

      if (restriction.includes('squat') && exMovement.includes('squat')) {
        return false;
      }

      if (restriction.includes('hinge') && exMovement.includes('hinge')) {
        return false;
      }

      // Body part conflicts
      if (restriction.includes('shoulder') && exCategory.includes('shoulder')) {
        return false;
      }

      if (restriction.includes('knee') && (exCategory.includes('leg') || exMovement.includes('squat'))) {
        return false;
      }

      if (restriction.includes('back') && exCategory.includes('back')) {
        return false;
      }

      // Muscle conflicts
      if (exMuscles.some((muscle) => restriction.includes(muscle) || muscle.includes(restriction))) {
        return false;
      }
    }

    return true;  // INCLUDE
  });
}

/**
 * Filter exercises by client aversions
 */
function filterByAversions(
  exercises: SupabaseExercise[],
  aversions: string[]
): SupabaseExercise[] {
  if (aversions.length === 0) {
    return exercises;
  }

  const normalizedAversions = aversions.map((a) => a.toLowerCase().trim());

  return exercises.filter((ex) => {
    const exName = ex.name.toLowerCase();
    const exType = ex.exercise_type?.toLowerCase() || '';

    // Check if exercise name matches aversion
    for (const aversion of normalizedAversions) {
      if (exName.includes(aversion) || aversion.includes(exName)) {
        return false;  // EXCLUDE
      }

      // Type-based aversions (e.g., "cardio", "plyometric")
      if (aversion.includes('cardio') && exType.includes('cardio')) {
        return false;
      }

      if (aversion.includes('plyo') && exType.includes('plyometric')) {
        return false;
      }

      if (aversion.includes('burpee') && exName.includes('burpee')) {
        return false;
      }

      if (aversion.includes('running') && exName.includes('run')) {
        return false;
      }
    }

    return true;  // INCLUDE
  });
}

/**
 * Get exercise count by movement pattern (for AI decision making)
 */
export function getExerciseCountByPattern(
  exercises: SupabaseExercise[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  exercises.forEach((ex) => {
    const pattern = ex.movement_pattern || 'unknown';
    counts[pattern] = (counts[pattern] || 0) + 1;
  });

  return counts;
}

/**
 * Get exercise count by equipment type
 */
export function getExerciseCountByEquipment(
  exercises: SupabaseExercise[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  exercises.forEach((ex) => {
    const equipment = ex.equipment || 'bodyweight';
    counts[equipment] = (counts[equipment] || 0) + 1;
  });

  return counts;
}

/**
 * Validate that filtered exercises provide sufficient variety
 */
export function validateExerciseVariety(
  exercises: SupabaseExercise[],
  sessionsPerWeek: number
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check total count
  const minRequired = sessionsPerWeek * 4;  // At least 4 exercises per session
  if (exercises.length < minRequired) {
    warnings.push(`Insufficient exercises: ${exercises.length} available, need at least ${minRequired}`);
  }

  // Check movement pattern variety
  const patternCounts = getExerciseCountByPattern(exercises);
  const requiredPatterns = ['push_horizontal', 'pull_horizontal', 'squat', 'hinge'];

  requiredPatterns.forEach((pattern) => {
    if (!patternCounts[pattern] || patternCounts[pattern] < 2) {
      warnings.push(`Low variety for ${pattern}: only ${patternCounts[pattern] || 0} exercises`);
    }
  });

  // Check equipment variety
  const equipmentCounts = getExerciseCountByEquipment(exercises);
  if (Object.keys(equipmentCounts).length < 2) {
    warnings.push('Limited equipment variety may reduce program effectiveness');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Sort exercises by priority for AI selection
 * Prioritizes compound movements, appropriate difficulty, and variety
 */
export function sortExercisesByPriority(
  exercises: SupabaseExercise[],
  primaryGoal: string
): SupabaseExercise[] {
  return exercises.sort((a, b) => {
    // Priority 1: Compound movements over isolation
    const aCompound = a.mechanic === 'compound' ? 1 : 0;
    const bCompound = b.mechanic === 'compound' ? 1 : 0;
    if (aCompound !== bCompound) return bCompound - aCompound;

    // Priority 2: Match goal (strength favors heavy, hypertrophy favors moderate)
    if (primaryGoal === 'strength') {
      const aGoodForStrength = a.mechanic === 'compound' && !a.is_unilateral ? 1 : 0;
      const bGoodForStrength = b.mechanic === 'compound' && !b.is_unilateral ? 1 : 0;
      if (aGoodForStrength !== bGoodForStrength) return bGoodForStrength - aGoodForStrength;
    }

    // Priority 3: Alphabetical (for consistency)
    return a.name.localeCompare(b.name);
  });
}
