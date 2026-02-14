'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Copy, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/lib/hooks/use-templates';
import { useUserStore } from '@/lib/stores/user-store';
import { useExerciseLookup } from '@/lib/hooks/use-exercise';
import type { WorkoutTemplate } from '@/lib/types';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const { currentUser } = useUserStore();
  const { data: templates = [] } = useTemplates(currentUser?.id);
  const deleteTemplateMutation = useDeleteTemplate();
  const duplicateTemplateMutation = useDuplicateTemplate();
  const { getExercise } = useExerciseLookup();

  const template = templates.find(t => t.id === templateId) ?? null;

  const handleBack = () => {
    router.push('/studio-owner/templates');
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality when template editor is created
  };

  const handleDuplicate = () => {
    duplicateTemplateMutation.mutate(templateId);
    router.push('/studio-owner/templates');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(templateId);
      router.push('/studio-owner/templates');
    }
  };

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-red-600 dark:text-red-400">Template not found</p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              ← Back to Templates
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const getExerciseDetails = (exerciseId: string) => {
    return getExercise(exerciseId);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Templates
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
                  {template.name}
                </h1>
                <Badge variant="outline" className="capitalize">
                  {template.type.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {template.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Created {new Date(template.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleEdit}
              >
                <Edit size={16} />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleDuplicate}
              >
                <Copy size={16} />
                Duplicate
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Template Details */}
        <div className="space-y-6">
          {/* Settings Card */}
          <Card className="p-6">
            <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Template Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sign-off Mode</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {template.defaultSignOffMode?.replace('_', ' ') || 'Full Session'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Alert Interval</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {template.alertIntervalMinutes ? `${template.alertIntervalMinutes} minutes` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Blocks</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {template.blocks.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Studios</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {template.assignedStudios.length} studio{template.assignedStudios.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </Card>

          {/* Blocks */}
          {template.blocks.map((block) => (
            <Card key={block.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100">
                  Block {block.blockNumber}: {block.name}
                </h3>
                <Badge variant="outline">
                  {block.exercises.length} exercise{block.exercises.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="space-y-3">
                {block.exercises.map((exercise) => {
                  const exerciseDetails = getExerciseDetails(exercise.exerciseId);
                  return (
                    <div
                      key={exercise.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {exercise.position}.
                            </span>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {exerciseDetails?.name || 'Exercise not found'}
                            </h4>
                            <Badge variant="outline" className="capitalize">
                              {exercise.muscleGroup}
                            </Badge>
                          </div>
                          {exerciseDetails?.equipment && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Equipment: {exerciseDetails.equipment}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {exercise.muscleGroup === 'cardio' ? (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {Math.floor((exercise.cardioDuration || 0) / 60)} min
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Intensity: {exercise.cardioIntensity}/10
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {exercise.resistanceValue}kg
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {exercise.repsMin}-{exercise.repsMax} reps × {exercise.sets} sets
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
