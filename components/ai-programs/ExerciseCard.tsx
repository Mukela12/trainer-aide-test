'use client';

import { useState } from 'react';
import { Lightbulb, Image as ImageIcon } from 'lucide-react';
import { ExerciseImageViewer } from '@/components/shared/ExerciseImageViewer';
import { Button } from '@/components/ui/button';

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_slug?: string | null;
  exercise_image_folder?: string | null;
  exercise_order: number;
  sets: number;
  reps_min?: number;
  reps_max?: number;
  target_rpe?: number;
  tempo?: string;
  rest_seconds?: number;
  coaching_cues?: string;
  notes?: string;
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const [showImages, setShowImages] = useState(false);

  // Use slug first, fallback to image_folder, then exercise_id (UUID) as last resort
  const imageId = exercise.exercise_slug || exercise.exercise_image_folder || exercise.exercise_id;
  const formatReps = () => {
    if (exercise.reps_min && exercise.reps_max) {
      return `${exercise.reps_min}-${exercise.reps_max} reps`;
    } else if (exercise.reps_min) {
      return `${exercise.reps_min} reps`;
    } else {
      return 'AMRAP';
    }
  };

  const formatRest = () => {
    if (!exercise.rest_seconds) return null;
    const seconds = exercise.rest_seconds;
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0
        ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}min`
        : `${minutes}min`;
    }
    return `${seconds}s`;
  };

  const formatTempo = () => {
    if (!exercise.tempo) return null;
    if (exercise.tempo === 'HOLD') return 'Hold';
    // Tempo format: Eccentric-Pause-Concentric-Pause (e.g., "3-1-1-0")
    return exercise.tempo;
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Exercise Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-wondrous-magenta text-white text-xs font-bold">
              {exercise.exercise_order}
            </span>
            <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {exercise.exercise_name}
            </h4>
          </div>
        </div>
        {/* View Images Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowImages(!showImages)}
          className="flex items-center gap-1 text-wondrous-magenta hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <ImageIcon size={16} />
          <span className="text-xs">
            {showImages ? 'Hide' : 'View'} Images
          </span>
        </Button>
      </div>

      {/* Sets, Reps, RPE */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {exercise.sets} sets × {formatReps()}
          {exercise.target_rpe && (
            <span className="ml-2 text-wondrous-magenta">@ RPE {exercise.target_rpe}</span>
          )}
        </p>
      </div>

      {/* Tempo & Rest */}
      <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {formatTempo() && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Tempo:</span>
            <span>{formatTempo()}</span>
          </div>
        )}
        {formatRest() && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Rest:</span>
            <span>{formatRest()}</span>
          </div>
        )}
      </div>

      {/* Coaching Cues */}
      {exercise.coaching_cues && (
        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            {exercise.coaching_cues}
          </p>
        </div>
      )}

      {/* Notes */}
      {exercise.notes && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <span className="font-medium">Note:</span> {exercise.notes}
          </p>
        </div>
      )}

      {/* Exercise Images Viewer */}
      <ExerciseImageViewer
        exerciseId={imageId}
        exerciseName={exercise.exercise_name}
        isOpen={showImages}
        onClose={() => setShowImages(false)}
      />
    </div>
  );
}
