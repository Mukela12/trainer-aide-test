'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { MethodSelection } from './MethodSelection';
import { ClientSelection } from './ClientSelection';
import { ProgramConfiguration } from './ProgramConfiguration';
import { GenerationProgress } from './GenerationProgress';
import { GenerationResults } from './GenerationResults';
import type { ClientProfile } from '@/lib/types/client-profile';

export type WizardStep = 'method' | 'client' | 'configure' | 'generating' | 'results';
export type GenerationMethod = 'ai' | 'manual' | null;

export interface ProgramConfig {
  // Program structure
  program_name: string;
  total_weeks: number;
  sessions_per_week: number;
  session_duration_minutes: number;

  // Client info (if no client selected)
  primary_goal?: 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss' | 'general_fitness';
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  available_equipment?: string[];
  injuries?: string[];
  exercise_aversions?: string[];

  // Optional
  include_nutrition?: boolean;
}

export interface GenerationResult {
  success: boolean;
  program_id?: string;
  program?: any;
  workouts_count?: number;
  exercises_count?: number;
  generation_log?: {
    tokens_used: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    latency_ms: number;
  };
  filtering_stats?: any;
  error?: string;
}

export function ProgramGeneratorWizard() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('method');
  const [method, setMethod] = useState<GenerationMethod>(null);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [programConfig, setProgramConfig] = useState<ProgramConfig | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Real-time progress tracking
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [currentProgressStep, setCurrentProgressStep] = useState<number>(0);
  const [totalProgressSteps, setTotalProgressSteps] = useState<number>(0);
  const [progressLog, setProgressLog] = useState<string[]>([]);

  // Navigation handlers
  const handleMethodSelect = (selectedMethod: 'ai' | 'manual') => {
    setMethod(selectedMethod);
    if (selectedMethod === 'manual') {
      // Redirect to manual template builder
      router.push('/trainer/sessions/new');
    } else {
      // Continue to client selection
      setCurrentStep('client');
    }
  };

  const handleClientSelect = (client: ClientProfile | null) => {
    setSelectedClient(client);
    setCurrentStep('configure');
  };

  const handleConfigSubmit = (config: ProgramConfig) => {
    setProgramConfig(config);
    setCurrentStep('generating');
    startGeneration(config);
  };

  const startGeneration = async (config: ProgramConfig) => {
    // Initialize progress tracking
    setProgressMessage('Submitting program request...');
    setProgressPercentage(0);
    setProgressLog(['Submitting program request...']);

    try {
      // Prepare API request
      const requestBody = {
        trainer_id: currentUser.id,
        client_profile_id: selectedClient?.id || null,
        program_name: config.program_name,
        total_weeks: config.total_weeks,
        sessions_per_week: config.sessions_per_week,
        session_duration_minutes: config.session_duration_minutes,

        // If no client, use manual params
        ...(selectedClient ? {} : {
          primary_goal: config.primary_goal,
          experience_level: config.experience_level,
          available_equipment: config.available_equipment,
          injuries: config.injuries || [],
          exercise_aversions: config.exercise_aversions || [],
        }),
      };

      // Step 1: Submit generation request (returns immediately with program_id)
      const response = await fetch('/api/ai/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const { program_id } = await response.json();

      // Step 2: Use Server-Sent Events (SSE) for real-time progress updates
      // Falls back to polling if SSE fails
      const useSSE = typeof EventSource !== 'undefined';

      if (useSSE) {
        await connectSSEStream(program_id, config);
      } else {
        await pollForProgress(program_id, config);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationResult({
        success: false,
        error: errorMessage,
      });
      setCurrentStep('results');
    }
  };

  // SSE-based progress tracking (preferred)
  const connectSSEStream = (programId: string, config: ProgramConfig): Promise<void> => {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`/api/ai-programs/${programId}/stream`);
      let lastMessage = '';

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connected':
              break;

            case 'progress':
              // Update progress state
              setProgressMessage(data.message || 'Generating...');
              setProgressPercentage(data.percentage || 0);
              setCurrentProgressStep(data.currentStep || 0);
              setTotalProgressSteps(data.totalSteps || 0);

              // Add to progress log if message changed
              if (data.message && data.message !== lastMessage) {
                lastMessage = data.message;
                setProgressLog(prev => [...prev, data.message]);
              }
              break;

            case 'completed':
              eventSource.close();

              // Fetch workouts to get accurate counts
              await fetchProgramResults(programId);
              resolve();
              break;

            case 'failed':
              console.error('❌ Generation failed via SSE:', data.error);
              eventSource.close();
              setGenerationResult({
                success: false,
                error: data.error || 'Generation failed',
              });
              setCurrentStep('results');
              resolve();
              break;

            case 'timeout':
              console.warn('⚠️ SSE timeout:', data.error);
              eventSource.close();
              // Fall back to polling for remainder
              await pollForProgress(programId, config);
              resolve();
              break;

            case 'error':
              console.error('❌ SSE error:', data.error);
              eventSource.close();
              // Fall back to polling
              await pollForProgress(programId, config);
              resolve();
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError);
        }
      };

      eventSource.onerror = async (error) => {
        console.error('❌ SSE connection error, falling back to polling:', error);
        eventSource.close();
        // Fall back to polling
        await pollForProgress(programId, config);
        resolve();
      };
    });
  };

  // Polling fallback (if SSE fails)
  const pollForProgress = async (programId: string, config: ProgramConfig): Promise<void> => {
    // Extended timeout for AI generation (6 minutes max)
    const pollTimeoutSec = 360;
    const maxPollAttempts = Math.ceil(pollTimeoutSec / 2);

    let pollAttempts = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          pollAttempts++;

          if (pollAttempts > maxPollAttempts) {
            clearInterval(pollInterval);
            console.error(`❌ Polling timeout after ${pollAttempts * 2} seconds`);
            setGenerationResult({
              success: false,
              error: `Generation is taking longer than expected. The program may still be generating in the background. Check your programs list in a few minutes.`,
            });
            setCurrentStep('results');
            resolve();
            return;
          }

          const statusResponse = await fetch(`/api/ai-programs/${programId}`);

          if (!statusResponse.ok) {
            clearInterval(pollInterval);
            setGenerationResult({
              success: false,
              error: 'Failed to check generation status',
            });
            setCurrentStep('results');
            resolve();
            return;
          }

          const response = await statusResponse.json();
          const programData = response.program || response;

          // Update progress state
          const message = programData?.progress_message || 'Generating...';
          const percentage = programData?.progress_percentage || 0;

          setProgressMessage(message);
          setProgressPercentage(percentage);
          setCurrentProgressStep(programData?.current_step || 0);
          setTotalProgressSteps(programData?.total_steps || 0);

          // Add to progress log if message changed
          setProgressLog(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage !== message && message) {
              return [...prev, message];
            }
            return prev;
          });

          if (programData?.generation_status === 'completed') {
            clearInterval(pollInterval);
            await fetchProgramResults(programId);
            resolve();
          } else if (programData?.generation_status === 'failed') {
            clearInterval(pollInterval);
            console.error('❌ Generation failed:', programData.generation_error);
            setGenerationResult({
              success: false,
              error: programData.generation_error || 'Generation failed',
            });
            setCurrentStep('results');
            resolve();
          }
        } catch (pollError) {
          clearInterval(pollInterval);
          setGenerationResult({
            success: false,
            error: pollError instanceof Error ? pollError.message : 'Unknown error',
          });
          setCurrentStep('results');
          resolve();
        }
      }, 2000);
    });
  };

  // Helper to fetch final program results
  const fetchProgramResults = async (programId: string) => {
    try {
      // Fetch program data
      const programResponse = await fetch(`/api/ai-programs/${programId}`);
      const programJson = await programResponse.json();
      const programData = programJson.program || programJson;

      // Fetch workouts to get accurate counts
      const workoutsResponse = await fetch(`/api/ai-programs/${programId}/workouts`);
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        const workouts = workoutsData.workouts || [];
        const totalExercises = workouts.reduce((sum: number, workout: any) => {
          return sum + (workout.exercises?.length || 0);
        }, 0);

        setGenerationResult({
          success: true,
          program_id: programId,
          program: programData,
          workouts_count: workouts.length,
          exercises_count: totalExercises,
        });
      } else {
        setGenerationResult({
          success: true,
          program_id: programId,
          program: programData,
          workouts_count: 0,
          exercises_count: 0,
        });
      }
    } catch (fetchError) {
      console.error('❌ Error fetching program results:', fetchError);
      setGenerationResult({
        success: true,
        program_id: programId,
        workouts_count: 0,
        exercises_count: 0,
      });
    }

    setCurrentStep('results');
  };

  const handleCreateAnother = () => {
    // Reset wizard
    setCurrentStep('method');
    setMethod(null);
    setSelectedClient(null);
    setProgramConfig(null);
    setGenerationResult(null);

    // Reset progress tracking
    setProgressMessage(null);
    setProgressPercentage(0);
    setCurrentProgressStep(0);
    setTotalProgressSteps(0);
    setProgressLog([]);
  };

  const handleViewProgram = () => {
    if (generationResult?.program_id) {
      router.push(`/trainer/programs/${generationResult.program_id}`);
    }
  };

  const handleCancel = () => {
    router.push('/trainer/programs');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'client':
        setCurrentStep('method');
        break;
      case 'configure':
        setCurrentStep('client');
        break;
      default:
        handleCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="text-center">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Create Training Program
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {currentStep === 'method' && 'Choose how you want to create your program'}
          {currentStep === 'client' && 'Select a client or use custom parameters'}
          {currentStep === 'configure' && 'Configure program details'}
          {currentStep === 'generating' && 'Generating your program...'}
          {currentStep === 'results' && (generationResult?.success ? 'Program generated successfully!' : 'Generation failed')}
        </p>
      </div>

      {/* Step Content */}
      {currentStep === 'method' && (
        <MethodSelection
          selectedMethod={method}
          onSelect={handleMethodSelect}
          onCancel={handleCancel}
        />
      )}

      {currentStep === 'client' && (
        <ClientSelection
          selectedClient={selectedClient}
          onSelect={handleClientSelect}
          onBack={handleBack}
        />
      )}

      {currentStep === 'configure' && (
        <ProgramConfiguration
          client={selectedClient}
          onSubmit={handleConfigSubmit}
          onBack={handleBack}
        />
      )}

      {currentStep === 'generating' && (
        <GenerationProgress
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
          currentStep={currentProgressStep}
          totalSteps={totalProgressSteps}
          progressLog={progressLog}
        />
      )}

      {currentStep === 'results' && generationResult && (
        <GenerationResults
          result={generationResult}
          onCreateAnother={handleCreateAnother}
          onViewProgram={handleViewProgram}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
