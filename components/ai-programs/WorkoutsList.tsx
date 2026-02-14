'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkouts } from '@/lib/hooks/use-ai-programs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from './ExerciseCard';
import type { WorkoutExercise } from './ExerciseCard';
import type { AIProgram, AIWorkout } from '@/lib/types/ai-program';

interface WorkoutsListProps {
  programId: string;
  program: AIProgram;
}

/** Map an AIWorkout's exercises to the display-friendly WorkoutExercise type. */
function toDisplayExercises(workout: AIWorkout): WorkoutExercise[] {
  return (workout.exercises || []).map((ex) => ({
    id: ex.id,
    exercise_id: ex.exercise_id,
    // exercise_name is populated by the API join but not on the TS interface
    exercise_name: (ex as unknown as { exercise_name?: string }).exercise_name || 'Unknown Exercise',
    exercise_slug: (ex as unknown as { exercise_slug?: string | null }).exercise_slug ?? null,
    exercise_image_folder: (ex as unknown as { exercise_image_folder?: string | null }).exercise_image_folder ?? null,
    exercise_order: ex.exercise_order,
    sets: ex.sets ?? 0,
    reps_min: ex.reps_min ?? undefined,
    reps_max: ex.reps_max ?? undefined,
    target_rpe: ex.target_rpe ?? undefined,
    tempo: ex.tempo ?? undefined,
    rest_seconds: ex.rest_seconds ?? undefined,
    coaching_cues: Array.isArray(ex.coaching_cues) ? ex.coaching_cues.join('. ') : undefined,
  }));
}

export function WorkoutsList({ programId, program }: WorkoutsListProps) {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  const { data: allWorkouts = [], isLoading: loading } = useWorkouts(programId);

  const workouts = useMemo(
    () => allWorkouts.filter(w => w.week_number === selectedWeek),
    [allWorkouts, selectedWeek]
  );

  useEffect(() => {
    if (workouts.length > 0) {
      setExpandedWorkouts(new Set([workouts[0].id]));
    }
  }, [workouts]);

  const toggleWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(workoutId)) {
        next.delete(workoutId);
      } else {
        next.add(workoutId);
      }
      return next;
    });
  };

  const getTotalSets = (exercises: WorkoutExercise[]) => {
    return exercises.reduce((sum, ex) => sum + ex.sets, 0);
  };

  const getEstimatedDuration = (exercises: WorkoutExercise[]) => {
    // Rough estimate: 3 min per set + rest time
    const totalSets = getTotalSets(exercises);
    const avgRestTime = exercises.reduce((sum, ex) => sum + (ex.rest_seconds || 60), 0) / exercises.length;
    return Math.round((totalSets * 180 + totalSets * avgRestTime) / 60); // minutes
  };

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: program.total_weeks }, (_, i) => i + 1).map((week) => (
          <Button
            key={week}
            onClick={() => setSelectedWeek(week)}
            variant={selectedWeek === week ? 'default' : 'outline'}
            className={
              selectedWeek === week
                ? 'bg-wondrous-primary hover:bg-purple-700 text-white'
                : ''
            }
          >
            Week {week}
          </Button>
        ))}
      </div>

      {/* Workouts */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wondrous-magenta mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading workouts...</p>
        </div>
      ) : workouts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No workouts found for this week</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkouts.has(workout.id);
            const displayExercises = toDisplayExercises(workout);

            return (
              <Card key={workout.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => toggleWorkout(workout.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">
                          Day {workout.day_number}: {workout.workout_name}
                        </CardTitle>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {getEstimatedDuration(displayExercises)} min
                        </span>
                      </div>
                      {workout.workout_focus && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {workout.workout_focus}
                        </p>
                      )}
                      {!isExpanded && (
                        <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{displayExercises.length} exercises</span>
                          <span>{getTotalSets(displayExercises)} sets</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWorkout(workout.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                      {displayExercises.map((exercise) => (
                        <ExerciseCard key={exercise.id} exercise={exercise} />
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Total Volume:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {getTotalSets(displayExercises)} sets
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Estimated Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {getEstimatedDuration(displayExercises)} minutes
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
