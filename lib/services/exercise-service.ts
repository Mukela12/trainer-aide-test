/**
 * Exercise Service
 *
 * Provides functions to query exercises from Supabase ta_exercise_library_original_original table
 * Uses Trainer-Aide (images) database which has the complete exercise library with all required columns
 */

import { imagesSupabase as supabase } from '../supabase/images-client';
import type { SupabaseExercise, ExerciseLevel, MovementPattern, PlaneOfMotion, ExerciseType } from '../types';

export interface ExerciseFilters {
  equipment?: string | string[]; // Filter by equipment type
  level?: ExerciseLevel | ExerciseLevel[]; // Filter by difficulty level
  movementPattern?: MovementPattern | MovementPattern[]; // Filter by movement pattern
  planeOfMotion?: PlaneOfMotion | PlaneOfMotion[]; // Filter by plane
  exerciseType?: ExerciseType | ExerciseType[]; // Filter by type
  anatomicalCategory?: string | string[]; // Filter by anatomical category
  isBodyweight?: boolean; // Only bodyweight exercises
  isUnilateral?: boolean; // Only unilateral exercises
  primaryMuscles?: string | string[]; // Filter by primary muscles
  excludeExerciseIds?: string[]; // Exclude specific exercise IDs
  limit?: number; // Limit number of results
}

/**
 * Get all exercises from Supabase
 */
export async function getAllExercises(): Promise<SupabaseExercise[]> {
  const { data, error } = await supabase
    .from('ta_exercise_library_original')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error);
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  return data || [];
}

/**
 * Get exercises with filters
 */
export async function getExercises(filters?: ExerciseFilters): Promise<SupabaseExercise[]> {
  let query = supabase
    .from('ta_exercise_library_original')
    .select('*');

  // Apply filters
  if (filters) {
    // Equipment filter
    if (filters.equipment) {
      if (Array.isArray(filters.equipment)) {
        query = query.in('equipment', filters.equipment);
      } else {
        query = query.eq('equipment', filters.equipment);
      }
    }

    // Level filter
    if (filters.level) {
      if (Array.isArray(filters.level)) {
        query = query.in('level', filters.level);
      } else {
        query = query.eq('level', filters.level);
      }
    }

    // Movement pattern filter
    if (filters.movementPattern) {
      if (Array.isArray(filters.movementPattern)) {
        query = query.in('movement_pattern', filters.movementPattern);
      } else {
        query = query.eq('movement_pattern', filters.movementPattern);
      }
    }

    // Plane of motion filter
    if (filters.planeOfMotion) {
      if (Array.isArray(filters.planeOfMotion)) {
        query = query.in('plane_of_motion', filters.planeOfMotion);
      } else {
        query = query.eq('plane_of_motion', filters.planeOfMotion);
      }
    }

    // Exercise type filter
    if (filters.exerciseType) {
      if (Array.isArray(filters.exerciseType)) {
        query = query.in('exercise_type', filters.exerciseType);
      } else {
        query = query.eq('exercise_type', filters.exerciseType);
      }
    }

    // Anatomical category filter
    if (filters.anatomicalCategory) {
      if (Array.isArray(filters.anatomicalCategory)) {
        query = query.in('anatomical_category', filters.anatomicalCategory);
      } else {
        query = query.eq('anatomical_category', filters.anatomicalCategory);
      }
    }

    // Bodyweight filter
    if (filters.isBodyweight !== undefined) {
      query = query.eq('is_bodyweight', filters.isBodyweight);
    }

    // Unilateral filter
    if (filters.isUnilateral !== undefined) {
      query = query.eq('is_unilateral', filters.isUnilateral);
    }

    // Primary muscles filter (contains)
    if (filters.primaryMuscles) {
      if (Array.isArray(filters.primaryMuscles)) {
        query = query.overlaps('primary_muscles', filters.primaryMuscles);
      } else {
        query = query.contains('primary_muscles', [filters.primaryMuscles]);
      }
    }

    // Exclude specific exercise IDs
    if (filters.excludeExerciseIds && filters.excludeExerciseIds.length > 0) {
      query = query.not('id', 'in', `(${filters.excludeExerciseIds.join(',')})`);
    }

    // Limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
  }

  query = query.order('name');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching filtered exercises:', error);
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  return data || [];
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id: string): Promise<SupabaseExercise | null> {
  const { data, error } = await supabase
    .from('ta_exercise_library_original')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching exercise by ID:', error);
    return null;
  }

  return data;
}

/**
 * Get exercise by slug
 */
export async function getExerciseBySlug(slug: string): Promise<SupabaseExercise | null> {
  const { data, error } = await supabase
    .from('ta_exercise_library_original')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching exercise by slug:', error);
    return null;
  }

  return data;
}

/**
 * Search exercises by name
 */
export async function searchExercises(searchTerm: string, filters?: ExerciseFilters): Promise<SupabaseExercise[]> {
  let query = supabase
    .from('ta_exercise_library_original')
    .select('*')
    .ilike('name', `%${searchTerm}%`);

  // Apply additional filters if provided
  if (filters) {
    if (filters.equipment) {
      query = Array.isArray(filters.equipment)
        ? query.in('equipment', filters.equipment)
        : query.eq('equipment', filters.equipment);
    }
    if (filters.level) {
      query = Array.isArray(filters.level)
        ? query.in('level', filters.level)
        : query.eq('level', filters.level);
    }
    if (filters.exerciseType) {
      query = Array.isArray(filters.exerciseType)
        ? query.in('exercise_type', filters.exerciseType)
        : query.eq('exercise_type', filters.exerciseType);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
  }

  query = query.order('name').limit(filters?.limit || 50);

  const { data, error } = await query;

  if (error) {
    console.error('Error searching exercises:', error);
    throw new Error(`Failed to search exercises: ${error.message}`);
  }

  return data || [];
}

/**
 * Get exercises by movement pattern (for balanced programming)
 */
export async function getExercisesByMovementPattern(
  pattern: MovementPattern,
  filters?: Omit<ExerciseFilters, 'movementPattern'>
): Promise<SupabaseExercise[]> {
  return getExercises({ ...filters, movementPattern: pattern });
}

/**
 * Get exercises by anatomical category
 */
export async function getExercisesByCategory(
  category: string,
  filters?: Omit<ExerciseFilters, 'anatomicalCategory'>
): Promise<SupabaseExercise[]> {
  return getExercises({ ...filters, anatomicalCategory: category });
}

/**
 * Get exercise count
 */
export async function getExerciseCount(filters?: ExerciseFilters): Promise<number> {
  let query = supabase
    .from('ta_exercise_library_original')
    .select('*', { count: 'exact', head: true });

  // Apply same filters as getExercises
  if (filters) {
    if (filters.equipment) {
      query = Array.isArray(filters.equipment)
        ? query.in('equipment', filters.equipment)
        : query.eq('equipment', filters.equipment);
    }
    if (filters.level) {
      query = Array.isArray(filters.level)
        ? query.in('level', filters.level)
        : query.eq('level', filters.level);
    }
    if (filters.movementPattern) {
      query = Array.isArray(filters.movementPattern)
        ? query.in('movement_pattern', filters.movementPattern)
        : query.eq('movement_pattern', filters.movementPattern);
    }
    if (filters.isBodyweight !== undefined) {
      query = query.eq('is_bodyweight', filters.isBodyweight);
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting exercises:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get available equipment types (for filter dropdowns)
 */
export async function getAvailableEquipment(): Promise<string[]> {
  const { data, error } = await supabase
    .from('ta_exercise_library_original')
    .select('equipment')
    .not('equipment', 'is', null);

  if (error) {
    console.error('Error fetching equipment types:', error);
    return [];
  }

  // Extract unique equipment types
  const equipmentSet = new Set<string>();
  data?.forEach((row: { equipment?: string | null }) => {
    if (row.equipment) {
      equipmentSet.add(row.equipment);
    }
  });

  return Array.from(equipmentSet).sort();
}

/**
 * Get available anatomical categories (for filter dropdowns)
 */
export async function getAvailableCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('ta_exercise_library_original')
    .select('anatomical_category')
    .not('anatomical_category', 'is', null);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Extract unique categories
  const categorySet = new Set<string>();
  data?.forEach((row: { anatomical_category?: string | null }) => {
    if (row.anatomical_category) {
      categorySet.add(row.anatomical_category);
    }
  });

  return Array.from(categorySet).sort();
}
