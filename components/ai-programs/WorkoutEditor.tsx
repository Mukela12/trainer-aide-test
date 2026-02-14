'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, GripVertical } from 'lucide-react';
import { ExerciseEditor } from './ExerciseEditor';
import { enrichExerciseWithDetails, stripEnrichment } from '@/lib/types/ai-program-editor';
import type { AIWorkout, AIWorkoutExercise } from '@/lib/types/ai-program';
import type { AIWorkoutExerciseWithDetails } from '@/lib/types/ai-program-editor';

interface WorkoutEditorProps {
  workout: AIWorkout;
  onChange: (workout: AIWorkout) => void;
}

export function WorkoutEditor({ workout, onChange }: WorkoutEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Enrich exercises with exercise library details for editing
  const enrichedExercises = useMemo(() => {
    if (!workout.exercises) return [];
    return workout.exercises.map(ex => enrichExerciseWithDetails(ex));
  }, [workout.exercises]);

  const handleWorkoutChange = (field: keyof AIWorkout, value: any) => {
    onChange({ ...workout, [field]: value });
  };

  const handleExerciseChange = (exerciseId: string, updatedExercise: AIWorkoutExerciseWithDetails) => {
    // Strip enrichment before saving
    const strippedExercise = stripEnrichment(updatedExercise);
    const updatedExercises = workout.exercises?.map(ex =>
      ex.id === exerciseId ? { ...ex, ...strippedExercise } as AIWorkoutExercise : ex
    );
    handleWorkoutChange('exercises', updatedExercises);
  };

  const handleAddExercise = () => {
    // TODO: Open exercise picker modal
  };

  const handleRemoveExercise = (exerciseId: string) => {
    const updatedExercises = workout.exercises?.filter(ex => ex.id !== exerciseId);
    handleWorkoutChange('exercises', updatedExercises);
  };

  const handleReorderExercise = (exerciseId: string, direction: 'up' | 'down') => {
    if (!workout.exercises) return;

    const currentIndex = workout.exercises.findIndex(ex => ex.id === exerciseId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= workout.exercises.length) return;

    const newExercises = [...workout.exercises];
    [newExercises[currentIndex], newExercises[newIndex]] = [newExercises[newIndex], newExercises[currentIndex]];

    // Update exercise_order for both exercises
    newExercises[currentIndex] = { ...newExercises[currentIndex], exercise_order: currentIndex };
    newExercises[newIndex] = { ...newExercises[newIndex], exercise_order: newIndex };

    handleWorkoutChange('exercises', newExercises);
  };

  return (
    <Card className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <GripVertical size={20} />
            </div>
            <div className="flex-1">
              <Input
                value={workout.workout_name}
                onChange={(e) => handleWorkoutChange('workout_name', e.target.value)}
                className="font-heading font-semibold text-lg bg-transparent border-none focus:ring-2 focus:ring-wondrous-magenta p-0 h-auto"
                placeholder="Workout Name"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Week {workout.week_number} • Day {workout.day_number}
                {workout.exercises && ` • ${workout.exercises.length} exercises`}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 dark:text-gray-400"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Workout Notes */}
          <div className="space-y-2">
            <Label htmlFor={`trainer-notes-${workout.id}`}>Workout Notes</Label>
            <Input
              id={`trainer-notes-${workout.id}`}
              value={workout.trainer_notes || ''}
              onChange={(e) => handleWorkoutChange('trainer_notes', e.target.value)}
              placeholder="Special instructions or warm-up notes..."
              className="bg-white dark:bg-gray-900"
            />
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Exercises</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddExercise}
                className="text-wondrous-magenta border-wondrous-magenta hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Plus size={16} className="mr-2" />
                Add Exercise
              </Button>
            </div>

            {enrichedExercises && enrichedExercises.length > 0 ? (
              <div className="space-y-3">
                {enrichedExercises.map((exercise, index) => (
                  <ExerciseEditor
                    key={exercise.id}
                    exercise={exercise}
                    onChange={(updatedExercise) => handleExerciseChange(exercise.id, updatedExercise)}
                    onRemove={() => handleRemoveExercise(exercise.id)}
                    onMoveUp={index > 0 ? () => handleReorderExercise(exercise.id, 'up') : undefined}
                    onMoveDown={index < enrichedExercises.length - 1 ? () => handleReorderExercise(exercise.id, 'down') : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No exercises yet. Click &quot;Add Exercise&quot; to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
