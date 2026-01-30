"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useExerciseLookup } from '@/hooks/use-exercise';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ExerciseImageViewer, ExerciseImageButton } from '@/components/shared/ExerciseImageViewer';
import { AITemplateCard } from '@/components/templates/AITemplateCard';
import { useToast } from '@/hooks/use-toast';
import { Search, FileText, ChevronDown, ChevronUp, Play, Sparkles } from 'lucide-react';
import { WorkoutTemplate } from '@/lib/types';
import type { AIProgram } from '@/lib/types/ai-program';

export default function TrainerTemplates() {
  const { toast } = useToast();
  const currentUser = useUserStore((state) => state.currentUser);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'standard' | 'resistance_only'>('all');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [viewingExerciseId, setViewingExerciseId] = useState<string | null>(null);
  const [aiTemplates, setAITemplates] = useState<AIProgram[]>([]);
  const [loadingAITemplates, setLoadingAITemplates] = useState(true);
  const { getExercise } = useExerciseLookup();

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentUser.id) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/templates');
        if (response.ok) {
          const data = await response.json();
          // Map database format to frontend format
          const mappedTemplates: WorkoutTemplate[] = (data.templates || []).map((t: {
            id: string;
            name: string;
            description?: string;
            type?: 'standard' | 'resistance_only';
            json_definition?: WorkoutTemplate['blocks'];
            blocks?: WorkoutTemplate['blocks'];
            studio_id?: string;
            created_by?: string;
            created_at?: string;
            updated_at?: string;
            sign_off_mode?: string;
            is_default?: boolean;
          }) => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            type: t.type || 'standard',
            blocks: t.json_definition || t.blocks || [],
            assignedStudios: t.studio_id ? [t.studio_id] : [],
            createdBy: t.created_by || '',
            createdAt: t.created_at || new Date().toISOString(),
            updatedAt: t.updated_at || new Date().toISOString(),
            defaultSignOffMode: t.sign_off_mode as WorkoutTemplate['defaultSignOffMode'],
            isDefault: t.is_default || false,
          }));
          setTemplates(mappedTemplates);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [currentUser.id]);

  // Fetch AI templates (only for solo practitioners)
  useEffect(() => {
    async function fetchAITemplates() {
      // AI templates are only available to solo practitioners
      if (currentUser.role !== 'solo_practitioner') {
        setLoadingAITemplates(false);
        setAITemplates([]);
        return;
      }

      try {
        setLoadingAITemplates(true);
        const response = await fetch('/api/ai-programs/templates');

        if (!response.ok) {
          throw new Error('Failed to fetch AI templates');
        }

        const data = await response.json();
        setAITemplates(data.templates || []);
      } catch (error) {
        console.error('Error fetching AI templates:', error);
        setAITemplates([]);
        toast({
          variant: 'destructive',
          title: 'Error Loading AI Templates',
          description: 'Failed to load AI-generated templates. Please try refreshing the page.',
        });
      } finally {
        setLoadingAITemplates(false);
      }
    }

    fetchAITemplates();
  }, [toast, currentUser.role]);

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    return matchesSearch && matchesType;
  });

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplateId(expandedTemplateId === templateId ? null : templateId);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 mb-2 dark:text-gray-100">Workout Templates</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Browse assigned workout templates. Contact your studio owner to request changes.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            All Templates
          </Button>
          <Button
            variant={selectedType === 'standard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('standard')}
          >
            Standard 3-Block
          </Button>
          <Button
            variant={selectedType === 'resistance_only' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('resistance_only')}
          >
            Resistance Only
          </Button>
        </div>
      </div>

      {/* AI Program Templates Section */}
      {aiTemplates.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-wondrous-magenta" />
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
              AI Program Templates
            </h2>
            <Badge variant="secondary" className="ml-2">
              {aiTemplates.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiTemplates.map((template) => (
              <AITemplateCard
                key={template.id}
                template={template}
                onUpdate={() => {
                  // Refresh AI templates
                  fetch('/api/ai-programs/templates')
                    .then(res => res.json())
                    .then(data => setAITemplates(data.templates || []))
                    .catch(console.error);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Templates Section */}
      {filteredTemplates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100">
              Manual Templates
            </h2>
            <Badge variant="secondary" className="ml-2">
              {filteredTemplates.length}
            </Badge>
          </div>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="space-y-4">
          {filteredTemplates.map((template) => {
            const isExpanded = expandedTemplateId === template.id;
            const totalExercises = template.blocks.reduce((sum, block) => sum + block.exercises.length, 0);

            return (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        <Badge variant={template.type === 'standard' ? 'default' : 'secondary'}>
                          {template.type === 'standard' ? 'Standard' : 'Resistance Only'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{template.blocks.length} Blocks</span>
                        <span>{totalExercises} Exercises</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href="/trainer/sessions/new">
                        <Button size="sm" className="whitespace-nowrap">
                          <Play size={16} className="mr-2" />
                          Start Session
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpanded(template.id)}
                        className="whitespace-nowrap"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={16} className="mr-2" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} className="mr-2" />
                            View Details
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-4 mt-4">
                      {template.blocks.map((block) => (
                        <div key={block.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{block.name}</h3>
                          <div className="space-y-2">
                            {block.exercises.map((templateExercise) => {
                              const exercise = getExercise(templateExercise.exerciseId);
                              if (!exercise) return null;

                              return (
                                <div key={templateExercise.id}>
                                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-semibold text-wondrous-dark-blue">
                                          {templateExercise.position}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-gray-900 dark:text-gray-100">{exercise.name}</span>
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {templateExercise.muscleGroup}
                                          </Badge>
                                          <ExerciseImageButton
                                            exerciseId={exercise.exerciseId}
                                            exerciseName={exercise.name}
                                            isActive={viewingExerciseId === templateExercise.id}
                                            onClick={() => setViewingExerciseId(viewingExerciseId === templateExercise.id ? null : templateExercise.id)}
                                          />
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          {templateExercise.muscleGroup === 'cardio' ? (
                                            <span>
                                              {Math.floor((templateExercise.cardioDuration || 0) / 60)} min •
                                              Intensity {templateExercise.cardioIntensity}/10
                                            </span>
                                          ) : templateExercise.muscleGroup === 'stretch' ? (
                                            <span>{templateExercise.cardioDuration}s hold</span>
                                          ) : (
                                            <span>
                                              {templateExercise.resistanceValue}kg •
                                              {templateExercise.repsMin}-{templateExercise.repsMax} reps •
                                              {templateExercise.sets} sets
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Exercise Image Viewer */}
                                  {viewingExerciseId === templateExercise.id && (
                                    <ExerciseImageViewer
                                      exerciseId={exercise.exerciseId}
                                      exerciseName={exercise.name}
                                      isOpen={viewingExerciseId === templateExercise.id}
                                      onClose={() => setViewingExerciseId(null)}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        This template is read-only. Contact your studio owner to request modifications.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : aiTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || selectedType !== 'all' ? 'No templates found' : 'No templates available'}
          description={
            searchQuery || selectedType !== 'all'
              ? 'Try adjusting your search or filter'
              : 'No templates have been assigned yet'
          }
        />
      ) : null}
    </div>
  );
}
