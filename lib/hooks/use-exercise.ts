/**
 * Custom hooks for exercise data fetching and lookup
 *
 * These hooks replace the synchronous getExerciseByIdSync() function
 * with a properly async pattern using React state.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Exercise } from '@/lib/types';
import { loadExercises, getExerciseById } from '@/lib/services/exercise-service-client';

/**
 * Hook to fetch a single exercise by ID
 * Returns { exercise, isLoading, error }
 */
export function useExercise(exerciseId: string | null | undefined) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      setExercise(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getExerciseById(exerciseId)
      .then((data) => {
        if (!cancelled) {
          setExercise(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return { exercise, isLoading, error };
}

/**
 * Hook to preload all exercises and provide a synchronous lookup function
 *
 * This is useful when you need to look up multiple exercises in a render loop,
 * like displaying template exercises.
 *
 * Usage:
 * const { getExercise, isLoading, exercises } = useExerciseLookup();
 *
 * // In render:
 * {block.exercises.map(ex => {
 *   const exercise = getExercise(ex.exerciseId);
 *   return exercise ? <ExerciseCard exercise={exercise} /> : null;
 * })}
 */
export function useExerciseLookup() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadExercises()
      .then((data) => {
        if (!cancelled) {
          setExercises(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setExercises([]);
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Create a Map for O(1) lookups
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exercises) {
      map.set(ex.id, ex);
    }
    return map;
  }, [exercises]);

  // Synchronous lookup function (returns undefined if not found)
  const getExercise = useCallback(
    (exerciseId: string): Exercise | undefined => {
      return exerciseMap.get(exerciseId);
    },
    [exerciseMap]
  );

  return {
    exercises,
    isLoading,
    error,
    getExercise,
  };
}

/**
 * Hook to fetch multiple exercises by IDs
 * More efficient than calling useExercise multiple times
 */
export function useExercises(exerciseIds: string[]) {
  const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable key for the effect dependency
  const idsKey = exerciseIds.sort().join(',');

  useEffect(() => {
    if (exerciseIds.length === 0) {
      setExercises(new Map());
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Load all exercises and filter to the ones we need
    loadExercises()
      .then((allExercises) => {
        if (!cancelled) {
          const idsSet = new Set(exerciseIds);
          const map = new Map<string, Exercise>();
          for (const ex of allExercises) {
            if (idsSet.has(ex.id)) {
              map.set(ex.id, ex);
            }
          }
          setExercises(map);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setExercises(new Map());
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Using idsKey for stable dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Get function for easy access
  const getExercise = useCallback(
    (exerciseId: string): Exercise | undefined => {
      return exercises.get(exerciseId);
    },
    [exercises]
  );

  return {
    exercises,
    isLoading,
    error,
    getExercise,
  };
}
