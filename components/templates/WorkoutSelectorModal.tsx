'use client';

import { useState, useEffect } from 'react';
import { X, Dumbbell, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AIProgram, AIWorkout } from '@/lib/types/ai-program';

interface WorkoutSelectorModalProps {
  program: AIProgram;
  onClose: () => void;
  onSelectWorkout: (workout: AIWorkout) => void;
}

export function WorkoutSelectorModal({ program, onClose, onSelectWorkout }: WorkoutSelectorModalProps) {
  const [workouts, setWorkouts] = useState<AIWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        setLoading(true);
        const response = await fetch(`/api/ai-programs/${program.id}/workouts`);

        if (!response.ok) {
          throw new Error('Failed to fetch workouts');
        }

        const data = await response.json();
        setWorkouts(data.workouts || []);
      } catch (error) {
        console.error('Error fetching workouts:', error);
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkouts();
  }, [program.id]);

  const handleCreateSession = () => {
    if (!selectedWorkoutId) return;

    // Find the selected workout and pass it to parent
    const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);
    if (selectedWorkout) {
      onSelectWorkout(selectedWorkout);
    }
  };

  // Group workouts by week
  const workoutsByWeek = workouts.reduce((acc, workout) => {
    const week = workout.week_number;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(workout);
    return acc;
  }, {} as Record<number, AIWorkout[]>);

  const weeks = Object.keys(workoutsByWeek).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
              Select Workout
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {program.program_name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </Button>
        </div>

        <CardContent className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading workouts...</p>
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No workouts found in this program.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeks.map((weekNum) => (
                <div key={weekNum} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-wondrous-magenta" />
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                      Week {weekNum}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workoutsByWeek[weekNum]
                      .sort((a, b) => a.day_number - b.day_number)
                      .map((workout) => (
                        <button
                          key={workout.id}
                          onClick={() => setSelectedWorkoutId(workout.id)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedWorkoutId === workout.id
                              ? 'border-wondrous-magenta bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wondrous-magenta/20 to-wondrous-blue/20 flex items-center justify-center flex-shrink-0">
                              <Dumbbell size={18} className="text-wondrous-magenta" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {workout.workout_name}
                                </h4>
                                {selectedWorkoutId === workout.id && (
                                  <CheckCircle2 size={16} className="text-wondrous-magenta flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Day {workout.day_number}
                                {workout.workout_focus && ` • ${workout.workout_focus}`}
                              </p>
                              {workout.movement_patterns_covered && workout.movement_patterns_covered.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {workout.movement_patterns_covered.slice(0, 3).map((pattern) => (
                                    <span
                                      key={pattern}
                                      className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                    >
                                      {pattern}
                                    </span>
                                  ))}
                                  {workout.movement_patterns_covered.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{workout.movement_patterns_covered.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSession}
            disabled={!selectedWorkoutId}
            className="flex-1 bg-wondrous-primary hover:bg-purple-700 text-white"
          >
            Create Session
          </Button>
        </div>
      </Card>
    </div>
  );
}
