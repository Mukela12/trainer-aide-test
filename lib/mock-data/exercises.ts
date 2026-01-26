import { Exercise } from '@/lib/types';
import generatedExercises from '@/data/generated-exercises.json';
import {
  getAllExercisesClient,
  getExerciseByIdClient,
  getExercisesClient,
  searchExercisesClient,
} from '@/lib/services/exercise-service-client';
import {
  supabaseToFrontendExercises,
  supabaseToFrontendExercise,
} from '@/lib/utils/exercise-adapter';

// LEGACY: Mock exercises from JSON file (fallback)
// This is kept for backwards compatibility during migration
// Convert null values to undefined for TypeScript compatibility
const LEGACY_EXERCISES: Exercise[] = generatedExercises.map((ex: any) => ({
  ...ex,
  startImageUrl: ex.startImageUrl ?? undefined,
  endImageUrl: ex.endImageUrl ?? undefined,
  primaryMuscles: ex.primaryMuscles ?? undefined,
  secondaryMuscles: ex.secondaryMuscles ?? undefined,
  equipment: ex.equipment ?? undefined,
  modifications: ex.modifications ?? undefined,
  commonMistakes: ex.commonMistakes ?? undefined,
}));

// Cache for exercises (to avoid repeated Supabase calls)
let cachedExercises: Exercise[] | null = null;
let lastCacheTime: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all exercises (Supabase-powered with fallback to JSON)
 * Uses client-side caching to improve performance
 */
export async function loadExercises(): Promise<Exercise[]> {
  // Check cache first
  const now = Date.now();
  if (cachedExercises && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION_MS) {
    return cachedExercises;
  }

  try {
    // Try fetching from Supabase (client-side)
    const supabaseExercises = await getAllExercisesClient();
    const exercises = supabaseToFrontendExercises(supabaseExercises);

    // Update cache
    cachedExercises = exercises;
    lastCacheTime = now;

    console.log(`✅ Loaded ${exercises.length} exercises from Supabase`);
    return exercises;
  } catch (error) {
    console.error('❌ Failed to load exercises from Supabase, using fallback:', error);
    // Fallback to legacy JSON exercises
    return LEGACY_EXERCISES;
  }
}

/**
 * Get all exercises synchronously (returns cached or legacy)
 * NOTE: Prefer loadExercises() for fresh data
 */
export const MOCK_EXERCISES = cachedExercises || LEGACY_EXERCISES;

/**
 * Clear exercise cache (force reload on next fetch)
 */
export function clearExerciseCache(): void {
  cachedExercises = null;
  lastCacheTime = null;
  console.log('🔄 Exercise cache cleared');
}

/**
 * Get exercise by ID (async Supabase version)
 */
export async function getExerciseById(id: string): Promise<Exercise | null> {
  try {
    const supabaseExercise = await getExerciseByIdClient(id);
    if (!supabaseExercise) return null;
    return supabaseToFrontendExercise(supabaseExercise);
  } catch (error) {
    console.error('Error fetching exercise by ID:', error);
    // Fallback to cached/legacy exercises
    const fallback = (cachedExercises || LEGACY_EXERCISES).find((ex) => ex.id === id);
    return fallback || null;
  }
}

/**
 * Get exercise by ID (synchronous legacy version)
 */
export function getExerciseByIdSync(id: string): Exercise | undefined {
  return (cachedExercises || LEGACY_EXERCISES).find((ex) => ex.id === id);
}

/**
 * Get exercises by category (async Supabase version)
 */
export async function getExercisesByCategory(category: string): Promise<Exercise[]> {
  try {
    const supabaseExercises = await getExercisesClient({
      anatomicalCategory: category,
    });
    return supabaseToFrontendExercises(supabaseExercises);
  } catch (error) {
    console.error('Error fetching exercises by category:', error);
    // Fallback to cached/legacy exercises
    return (cachedExercises || LEGACY_EXERCISES).filter((ex) => ex.category === category);
  }
}

/**
 * Get exercises by category (synchronous legacy version)
 */
export function getExercisesByCategorySync(category: string): Exercise[] {
  return (cachedExercises || LEGACY_EXERCISES).filter((ex) => ex.category === category);
}

/**
 * Search exercises by name (async)
 */
export async function searchExercises(searchTerm: string, limit: number = 50): Promise<Exercise[]> {
  try {
    const supabaseExercises = await searchExercisesClient(searchTerm, { limit });
    return supabaseToFrontendExercises(supabaseExercises);
  } catch (error) {
    console.error('Error searching exercises:', error);
    // Fallback to legacy search
    const searchLower = searchTerm.toLowerCase();
    return (cachedExercises || LEGACY_EXERCISES)
      .filter((ex) => ex.name.toLowerCase().includes(searchLower))
      .slice(0, limit);
  }
}

// Export legacy exercises for backwards compatibility
export { LEGACY_EXERCISES };
