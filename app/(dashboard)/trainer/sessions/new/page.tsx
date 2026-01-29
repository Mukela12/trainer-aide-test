"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useSessionStore } from '@/lib/stores/session-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useExerciseLookup } from '@/hooks/use-exercise';
import { generateId } from '@/lib/utils/generators';
import { convertAIWorkoutToSessionBlocks, getAIWorkoutSessionName } from '@/lib/utils/ai-workout-converter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SignOffMode, Client, WorkoutTemplate, SessionBlock } from '@/lib/types';
import type { AIWorkout } from '@/lib/types/ai-program';
import { Play, FileText, User, Settings, ChevronRight, Search, Sparkles, Building2, UserCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

interface AvailableTemplate {
  template_id: string;
  template_name: string;
  source: 'trainer_toolkit' | 'client_specific' | 'own_template';
}

interface GroupedTemplates {
  trainerToolkit: AvailableTemplate[];
  clientSpecific: AvailableTemplate[];
  ownTemplates: AvailableTemplate[];
}

const SIGN_OFF_MODES: { value: SignOffMode; label: string; description: string }[] = [
  {
    value: 'full_session',
    label: 'Full Session Sign-Off',
    description: 'Complete entire workout, then sign off at the end',
  },
  {
    value: 'per_block',
    label: 'Per Block Sign-Off',
    description: 'Sign off after completing each block',
  },
  {
    value: 'per_exercise',
    label: 'Per Exercise Sign-Off',
    description: 'Sign off after each individual exercise',
  },
];

function StartNewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templates = useTemplateStore((state) => state.templates);
  const currentUser = useUserStore((state) => state.currentUser);
  const startSession = useSessionStore((state) => state.startSession);
  const { toast } = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSignOffMode, setSelectedSignOffMode] = useState<SignOffMode>('full_session');
  const [clientSearch, setClientSearch] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // AI workout state
  const [aiWorkout, setAiWorkout] = useState<AIWorkout | null>(null);
  const [loadingAiWorkout, setLoadingAiWorkout] = useState(false);
  const [sourceType, setSourceType] = useState<'manual' | 'ai'>('manual');
  const { getExercise } = useExerciseLookup();

  // Real client fetching
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Available templates for selected client (grouped by source)
  const [availableTemplates, setAvailableTemplates] = useState<AvailableTemplate[]>([]);
  const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplates>({
    trainerToolkit: [],
    clientSpecific: [],
    ownTemplates: [],
  });
  const [loadingAvailableTemplates, setLoadingAvailableTemplates] = useState(false);
  const [selectedAvailableTemplate, setSelectedAvailableTemplate] = useState<AvailableTemplate | null>(null);

  // Fetch real clients from API
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          setApiClients(data.clients || []);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // Fetch available templates when a client is selected
  useEffect(() => {
    const fetchAvailableTemplates = async () => {
      if (!selectedClient) {
        // No client selected - just show the trainer's own templates from store
        setGroupedTemplates({
          trainerToolkit: [],
          clientSpecific: [],
          ownTemplates: templates.map(t => ({
            template_id: t.id,
            template_name: t.name,
            source: 'own_template' as const,
          })),
        });
        setAvailableTemplates(templates.map(t => ({
          template_id: t.id,
          template_name: t.name,
          source: 'own_template' as const,
        })));
        return;
      }

      setLoadingAvailableTemplates(true);
      try {
        const response = await fetch(`/api/clients/${selectedClient.id}/available-templates`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTemplates(data.templates || []);
          setGroupedTemplates(data.grouped || {
            trainerToolkit: [],
            clientSpecific: [],
            ownTemplates: [],
          });
        } else {
          // Fallback to templates from store
          setGroupedTemplates({
            trainerToolkit: [],
            clientSpecific: [],
            ownTemplates: templates.map(t => ({
              template_id: t.id,
              template_name: t.name,
              source: 'own_template' as const,
            })),
          });
        }
      } catch (error) {
        console.error('Error fetching available templates:', error);
      } finally {
        setLoadingAvailableTemplates(false);
      }
    };

    fetchAvailableTemplates();
  }, [selectedClient, templates]);

  // Pre-fill from calendar booking or AI template
  useEffect(() => {
    const clientId = searchParams?.get('clientId');
    const templateId = searchParams?.get('templateId');
    const signOffMode = searchParams?.get('signOffMode') as SignOffMode | null;
    const source = searchParams?.get('source');
    const programId = searchParams?.get('programId');
    const workoutId = searchParams?.get('workoutId');

    if (clientId && apiClients.length > 0) {
      const client = apiClients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient({
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          email: client.email,
          joinedAt: new Date().toISOString(),
        });
      }
    }

    // Handle AI template source
    if (source === 'ai-template' && programId && workoutId) {
      setSourceType('ai');
      setLoadingAiWorkout(true);

      // Fetch the AI workout
      fetch(`/api/ai-programs/${programId}/workouts`)
        .then(res => res.json())
        .then(data => {
          const workout = data.workouts?.find((w: AIWorkout) => w.id === workoutId);
          if (workout) {
            setAiWorkout(workout);
            setStep(2); // Skip template selection, go straight to client selection
          } else {
            toast({
              variant: "destructive",
              title: "Workout Not Found",
              description: "The selected AI workout could not be found.",
            });
          }
        })
        .catch(error => {
          console.error('Error fetching AI workout:', error);
          toast({
            variant: "destructive",
            title: "Error Loading Workout",
            description: "Failed to load the AI workout. Please try again.",
          });
        })
        .finally(() => setLoadingAiWorkout(false));
    }
    // Handle manual template
    else if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setSourceType('manual');
      }
    }

    if (signOffMode && (signOffMode === 'per_exercise' || signOffMode === 'per_block' || signOffMode === 'full_session')) {
      setSelectedSignOffMode(signOffMode);
    }
  }, [searchParams, templates, toast, apiClients]);

  const filteredClients = apiClients.filter((client) =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleStart = () => {
    let sessionBlocks: SessionBlock[];
    let sessionName: string;
    let templateId: string;
    let template: WorkoutTemplate | undefined;

    if (sourceType === 'ai' && aiWorkout) {
      // Convert AI workout to session blocks with error handling
      try {
        sessionBlocks = convertAIWorkoutToSessionBlocks(aiWorkout);

        // Validate we got blocks back
        if (sessionBlocks.length === 0) {
          throw new Error('The workout conversion produced no exercise blocks. Please try a different workout.');
        }

        sessionName = getAIWorkoutSessionName(
          aiWorkout,
          selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : undefined
        );
        // Use AI workout ID as template ID (for tracking purposes)
        templateId = aiWorkout.id;
        template = undefined; // AI workouts don't have a manual template

        // Start session with planned duration from AI workout
        const sessionId = startSession({
          trainerId: currentUser.id,
          clientId: selectedClient?.id,
          client: selectedClient || undefined,
          templateId,
          template,
          sessionName,
          signOffMode: selectedSignOffMode,
          blocks: sessionBlocks,
          plannedDurationMinutes: aiWorkout.planned_duration_minutes || undefined,
        });

        router.push(`/trainer/sessions/${sessionId}`);
      } catch (error) {
        console.error('Error creating session from AI workout:', error);
        toast({
          variant: "destructive",
          title: "Cannot Start Session",
          description: error instanceof Error ? error.message : "An error occurred while starting the session.",
        });
      }
      return;
    } else if (sourceType === 'manual' && selectedTemplate) {
      // Create session blocks from manual template
      sessionBlocks = selectedTemplate.blocks.map((block) => ({
        id: generateId('session-block'),
        blockNumber: block.blockNumber,
        name: block.name,
        completed: false,
        exercises: block.exercises.map((templateExercise) => ({
          id: generateId('session-exercise'),
          exerciseId: templateExercise.exerciseId,
          position: templateExercise.position,
          muscleGroup: templateExercise.muscleGroup,
          resistanceType: templateExercise.resistanceType,
          resistanceValue: templateExercise.resistanceValue,
          repsMin: templateExercise.repsMin,
          repsMax: templateExercise.repsMax,
          sets: templateExercise.sets,
          cardioDuration: templateExercise.cardioDuration,
          cardioIntensity: templateExercise.cardioIntensity,
          actualReps: undefined,
          actualResistance: undefined,
          rpe: undefined,
          completed: false,
        })),
      }));
      sessionName = `${selectedTemplate.name} - ${selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Walk-in'}`;
      templateId = selectedTemplate.id;
      template = selectedTemplate;

      // Start manual template session
      try {
        const sessionId = startSession({
          trainerId: currentUser.id,
          clientId: selectedClient?.id,
          client: selectedClient || undefined,
          templateId,
          template,
          sessionName,
          signOffMode: selectedSignOffMode,
          blocks: sessionBlocks,
        });

        router.push(`/trainer/sessions/${sessionId}`);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Cannot Start Session",
          description: error instanceof Error ? error.message : "An error occurred while starting the session.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Template Required",
        description: "Please select a workout template before starting the session.",
      });
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 mb-2">Start New Session</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Configure your training session in 3 simple steps
        </p>
      </div>

      {/* AI Workout Loading State */}
      {sourceType === 'ai' && loadingAiWorkout && (
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-wondrous-magenta/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wondrous-magenta/20 to-wondrous-blue/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-wondrous-magenta animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Loading AI Workout...
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Workout Banner */}
      {sourceType === 'ai' && aiWorkout && !loadingAiWorkout && (
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-wondrous-magenta/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wondrous-magenta/20 to-wondrous-blue/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-wondrous-magenta" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    AI-Generated Workout
                  </h3>
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200">
                    {aiWorkout.workout_name}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Week {aiWorkout.week_number}, Day {aiWorkout.day_number}
                  {aiWorkout.workout_focus && ` • ${aiWorkout.workout_focus}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Steps */}
      {!loadingAiWorkout && (
        <div className="flex items-center gap-2 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-wondrous-primary' : 'text-gray-400 dark:text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-wondrous-primary text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300'}`}>
              1
            </div>
            <span className="text-sm font-medium hidden sm:inline">Client</span>
          </div>
          <ChevronRight className="text-gray-400 dark:text-gray-500" size={20} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-wondrous-primary' : 'text-gray-400 dark:text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-wondrous-primary text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300'}`}>
              2
            </div>
            <span className="text-sm font-medium hidden sm:inline">Template</span>
          </div>
          <ChevronRight className="text-gray-400 dark:text-gray-500" size={20} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-wondrous-primary' : 'text-gray-400 dark:text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-wondrous-primary text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300'}`}>
              3
            </div>
            <span className="text-sm font-medium hidden sm:inline">Sign-Off Mode</span>
          </div>
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && !loadingAiWorkout && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-wondrous-primary" size={24} />
            <h2 className="text-heading-2">Select Workout Template</h2>
            {selectedClient && (
              <Badge variant="outline" className="ml-2">
                For {selectedClient.firstName} {selectedClient.lastName}
              </Badge>
            )}
          </div>

          {loadingAvailableTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading templates...</span>
            </div>
          ) : (
            <>
              {/* Studio Workout Plans (Trainer Toolkit) */}
              {groupedTemplates.trainerToolkit.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Studio Workout Plans</h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      Assigned to you
                    </Badge>
                  </div>
                  {groupedTemplates.trainerToolkit.map((availableTemplate) => {
                    const template = templates.find(t => t.id === availableTemplate.template_id);
                    const isSelected = selectedTemplate?.id === availableTemplate.template_id ||
                                       selectedAvailableTemplate?.template_id === availableTemplate.template_id;

                    return (
                      <Card
                        key={availableTemplate.template_id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'border-2 border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                        onClick={() => {
                          if (template) {
                            setSelectedTemplate(template);
                            setSelectedAvailableTemplate(null);
                          } else {
                            setSelectedAvailableTemplate(availableTemplate);
                            setSelectedTemplate(null);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{availableTemplate.template_name}</h3>
                                <Building2 size={14} className="text-blue-500" />
                              </div>
                              {template && (
                                <>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{template.blocks.length} Blocks</span>
                                    <span>{template.blocks.reduce((sum, block) => sum + block.exercises.length, 0)} Exercises</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Client-Specific Templates */}
              {groupedTemplates.clientSpecific.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCircle size={18} className="text-purple-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Client-Specific Templates</h3>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      For this client
                    </Badge>
                  </div>
                  {groupedTemplates.clientSpecific.map((availableTemplate) => {
                    const template = templates.find(t => t.id === availableTemplate.template_id);
                    const isSelected = selectedTemplate?.id === availableTemplate.template_id ||
                                       selectedAvailableTemplate?.template_id === availableTemplate.template_id;

                    return (
                      <Card
                        key={availableTemplate.template_id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'border-2 border-purple-500 bg-purple-50/30 dark:bg-purple-900/20' : 'hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                        onClick={() => {
                          if (template) {
                            setSelectedTemplate(template);
                            setSelectedAvailableTemplate(null);
                          } else {
                            setSelectedAvailableTemplate(availableTemplate);
                            setSelectedTemplate(null);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{availableTemplate.template_name}</h3>
                                <UserCircle size={14} className="text-purple-500" />
                              </div>
                              {template && (
                                <>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{template.blocks.length} Blocks</span>
                                    <span>{template.blocks.reduce((sum, block) => sum + block.exercises.length, 0)} Exercises</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* My Templates (Own Templates) */}
              {groupedTemplates.ownTemplates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-wondrous-primary" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">My Templates</h3>
                  </div>
                  {groupedTemplates.ownTemplates.map((availableTemplate) => {
                    const template = templates.find(t => t.id === availableTemplate.template_id);
                    const isSelected = selectedTemplate?.id === availableTemplate.template_id ||
                                       selectedAvailableTemplate?.template_id === availableTemplate.template_id;

                    if (!template) return null;

                    const totalExercises = template.blocks.reduce((sum, block) => sum + block.exercises.length, 0);

                    return (
                      <Card
                        key={availableTemplate.template_id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'border-2 border-wondrous-primary bg-blue-50/30 dark:bg-blue-900/20' : 'hover:border-wondrous-blue dark:hover:border-blue-400'
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setSelectedAvailableTemplate(null);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                isSelected ? 'border-wondrous-primary bg-wondrous-primary' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
                                <Badge variant={template.type === 'standard' ? 'default' : 'secondary'}>
                                  {template.type === 'standard' ? 'Standard' : 'Resistance Only'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{template.blocks.length} Blocks</span>
                                <span>{totalExercises} Exercises</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {groupedTemplates.trainerToolkit.length === 0 &&
               groupedTemplates.clientSpecific.length === 0 &&
               groupedTemplates.ownTemplates.length === 0 && (
                <Card className="p-8 text-center">
                  <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No templates available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Create a template or ask your studio owner to assign one to you
                  </p>
                </Card>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 sm:flex-none">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedTemplate && !selectedAvailableTemplate}
              className="flex-1 sm:flex-none"
            >
              Next: Sign-Off Mode
              <ChevronRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Select Client */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="text-wondrous-primary" size={24} />
            <h2 className="text-heading-2">Select Client</h2>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loadingClients ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading clients...</span>
            </div>
          ) : (
            <>
              {/* Walk-in Option */}
              <Card
                className={`cursor-pointer transition-all ${
                  selectedClient === null ? 'border-2 border-wondrous-primary bg-blue-50/30 dark:bg-blue-900/20' : 'hover:border-wondrous-blue dark:hover:border-blue-400'
                }`}
                onClick={() => setSelectedClient(null)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedClient === null ? 'border-wondrous-primary bg-wondrous-primary' : 'border-gray-300'
                      }`}
                    >
                      {selectedClient === null && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Walk-in Client</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">No client assignment</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client List */}
              {filteredClients.map((client) => {
                const clientObj: Client = {
                  id: client.id,
                  firstName: client.first_name,
                  lastName: client.last_name,
                  email: client.email,
                  joinedAt: new Date().toISOString(),
                };
                const isSelected = selectedClient?.id === client.id;

                return (
                  <Card
                    key={client.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-2 border-wondrous-primary bg-blue-50/30 dark:bg-blue-900/20' : 'hover:border-wondrous-blue dark:hover:border-blue-400'
                    }`}
                    onClick={() => setSelectedClient(clientObj)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-wondrous-primary bg-wondrous-primary' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {client.first_name} {client.last_name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredClients.length === 0 && clientSearch && (
                <p className="text-center text-gray-500 py-4">No clients found matching &ldquo;{clientSearch}&rdquo;</p>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={() => setStep(2)} className="flex-1 sm:flex-none">
              Next: Select Template
              <ChevronRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Select Sign-Off Mode */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="text-wondrous-primary" size={24} />
            <h2 className="text-heading-2">Choose Sign-Off Mode</h2>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Select how you want to track and sign off on this session
          </p>

          {SIGN_OFF_MODES.map((mode) => {
            const isSelected = selectedSignOffMode === mode.value;

            return (
              <Card
                key={mode.value}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'border-2 border-wondrous-primary bg-blue-50/30 dark:bg-blue-900/20' : 'hover:border-wondrous-blue dark:hover:border-blue-400'
                }`}
                onClick={() => setSelectedSignOffMode(mode.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                        isSelected ? 'border-wondrous-primary bg-wondrous-primary' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{mode.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{mode.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Session Summary */}
          <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Workout:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {sourceType === 'ai' && aiWorkout ? (
                    <>
                      {aiWorkout.workout_name}
                      <Sparkles size={14} className="text-wondrous-magenta" />
                    </>
                  ) : (
                    selectedTemplate?.name
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Client:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : 'Walk-in'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sign-Off Mode:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {SIGN_OFF_MODES.find((m) => m.value === selectedSignOffMode)?.label}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 sm:flex-none">
              Back
            </Button>
            <Button onClick={handleStart} className="flex-1 sm:flex-none">
              <Play size={20} className="mr-2" />
              Start Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StartNewSession() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <StartNewSessionContent />
    </Suspense>
  );
}
