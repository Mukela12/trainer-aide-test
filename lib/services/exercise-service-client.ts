/**
 * Client-side Exercise Service
 *
 * Uses images (Trainer-Aide) Supabase client for complete exercise data
 */

import { imagesSupabase } from '@/lib/supabase/images-client';
import type { Exercise, SupabaseExercise, ExerciseLevel, MovementPattern, PlaneOfMotion, ExerciseType } from '../types';
import {
  supabaseToFrontendExercises,
  supabaseToFrontendExercise,
} from '@/lib/utils/exercise-adapter';

export interface ExerciseFilters {
  equipment?: string | string[];
  level?: ExerciseLevel | ExerciseLevel[];
  movementPattern?: MovementPattern | MovementPattern[];
  planeOfMotion?: PlaneOfMotion | PlaneOfMotion[];
  exerciseType?: ExerciseType | ExerciseType[];
  anatomicalCategory?: string | string[];
  isBodyweight?: boolean;
  isUnilateral?: boolean;
  primaryMuscles?: string | string[];
  excludeExerciseIds?: string[];
  limit?: number;
}

/**
 * Get all exercises from Supabase (client-side)
 */
export async function getAllExercisesClient(): Promise<SupabaseExercise[]> {
  const supabase = imagesSupabase; // Using images database for complete exercise data

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
 * Get exercises with filters (client-side)
 */
export async function getExercisesClient(filters?: ExerciseFilters): Promise<SupabaseExercise[]> {
  const supabase = imagesSupabase; // Using images database for complete exercise data

  let query = supabase
    .from('ta_exercise_library_original')
    .select('*');

  if (filters) {
    if (filters.equipment) {
      if (Array.isArray(filters.equipment)) {
        query = query.in('equipment', filters.equipment);
      } else {
        query = query.eq('equipment', filters.equipment);
      }
    }

    if (filters.level) {
      if (Array.isArray(filters.level)) {
        query = query.in('level', filters.level);
      } else {
        query = query.eq('level', filters.level);
      }
    }

    if (filters.movementPattern) {
      if (Array.isArray(filters.movementPattern)) {
        query = query.in('movement_pattern', filters.movementPattern);
      } else {
        query = query.eq('movement_pattern', filters.movementPattern);
      }
    }

    if (filters.planeOfMotion) {
      if (Array.isArray(filters.planeOfMotion)) {
        query = query.in('plane_of_motion', filters.planeOfMotion);
      } else {
        query = query.eq('plane_of_motion', filters.planeOfMotion);
      }
    }

    if (filters.exerciseType) {
      if (Array.isArray(filters.exerciseType)) {
        query = query.in('exercise_type', filters.exerciseType);
      } else {
        query = query.eq('exercise_type', filters.exerciseType);
      }
    }

    if (filters.anatomicalCategory) {
      if (Array.isArray(filters.anatomicalCategory)) {
        query = query.in('anatomical_category', filters.anatomicalCategory);
      } else {
        query = query.eq('anatomical_category', filters.anatomicalCategory);
      }
    }

    if (filters.isBodyweight !== undefined) {
      query = query.eq('is_bodyweight', filters.isBodyweight);
    }

    if (filters.isUnilateral !== undefined) {
      query = query.eq('is_unilateral', filters.isUnilateral);
    }

    if (filters.primaryMuscles) {
      if (Array.isArray(filters.primaryMuscles)) {
        query = query.overlaps('primary_muscles', filters.primaryMuscles);
      } else {
        query = query.contains('primary_muscles', [filters.primaryMuscles]);
      }
    }

    if (filters.excludeExerciseIds && filters.excludeExerciseIds.length > 0) {
      query = query.not('id', 'in', `(${filters.excludeExerciseIds.join(',')})`);
    }

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
 * Get exercise by ID (client-side)
 */
export async function getExerciseByIdClient(id: string): Promise<SupabaseExercise | null> {
  const supabase = imagesSupabase; // Using images database for complete exercise data

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
 * Search exercises by name (client-side)
 */
export async function searchExercisesClient(searchTerm: string, filters?: ExerciseFilters): Promise<SupabaseExercise[]> {
  const supabase = imagesSupabase; // Using images database for complete exercise data

  let query = supabase
    .from('ta_exercise_library_original')
    .select('*')
    .ilike('name', `%${searchTerm}%`);

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

// --- High-level exercise functions (consolidated from mock-data/exercises.ts) ---

// Cache for exercises (to avoid repeated Supabase calls)
let cachedExercises: Exercise[] | null = null;
let lastCacheTime: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all exercises from Supabase with client-side caching
 */
export async function loadExercises(): Promise<Exercise[]> {
  const now = Date.now();
  if (cachedExercises && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION_MS) {
    return cachedExercises;
  }

  const supabaseExercises = await getAllExercisesClient();
  const exercises = supabaseToFrontendExercises(supabaseExercises);

  cachedExercises = exercises;
  lastCacheTime = now;

  return exercises;
}

/**
 * Get exercise by ID (returns frontend Exercise type)
 */
export async function getExerciseById(id: string): Promise<Exercise | null> {
  try {
    const supabaseExercise = await getExerciseByIdClient(id);
    if (!supabaseExercise) return null;
    return supabaseToFrontendExercise(supabaseExercise);
  } catch (error) {
    console.error('Error fetching exercise by ID:', error);
    const fallback = cachedExercises?.find((ex: Exercise) => ex.id === id);
    return fallback || null;
  }
}

/**
 * Get exercises by category (returns frontend Exercise type)
 */
export async function getExercisesByCategory(category: string): Promise<Exercise[]> {
  try {
    const supabaseExercises = await getExercisesClient({
      anatomicalCategory: category,
    });
    return supabaseToFrontendExercises(supabaseExercises);
  } catch (error) {
    console.error('Error fetching exercises by category:', error);
    return (cachedExercises || []).filter((ex: Exercise) => ex.category === category);
  }
}

/**
 * Search exercises by name (returns frontend Exercise type)
 */
export async function searchExercises(searchTerm: string, limit = 50): Promise<Exercise[]> {
  try {
    const supabaseExercises = await searchExercisesClient(searchTerm, { limit });
    return supabaseToFrontendExercises(supabaseExercises);
  } catch (error) {
    console.error('Error searching exercises:', error);
    const searchLower = searchTerm.toLowerCase();
    return (cachedExercises || [])
      .filter((ex: Exercise) => ex.name.toLowerCase().includes(searchLower))
      .slice(0, limit);
  }
}
