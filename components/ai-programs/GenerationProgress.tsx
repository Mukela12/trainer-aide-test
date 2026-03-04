'use client';

import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface GenerationProgressProps {
  progressMessage?: string | null;
  progressPercentage?: number | null;
  currentStep?: number | null;
  totalSteps?: number | null;
  progressLog?: string[]; // Historical progress messages
}

export function GenerationProgress({
  progressMessage = 'Starting program generation...',
  progressPercentage = 0,
  currentStep = 0,
  totalSteps = 0,
  progressLog = [],
}: GenerationProgressProps) {
  const percentage = Math.max(0, Math.min(100, progressPercentage || 0));
  const isCompleted = percentage === 100;

  return (
    <Card className="border-wondrous-magenta">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {isCompleted ? (
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              ) : (
                <>
                  <Loader2 className="h-16 w-16 text-wondrous-magenta animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-full" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">
              {isCompleted ? 'Program Generated!' : 'Generating Your Program'}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Wondrous AI is building your program...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {progressMessage || 'Processing...'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {percentage}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-wondrous-magenta to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {currentStep != null && totalSteps != null && currentStep > 0 && totalSteps > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStep} of {totalSteps}
              </div>
            )}
          </div>

          {/* Progress Log */}
          {progressLog.length > 0 && (
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2 text-left">
                  {progressLog.slice(-5).map((message, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      {message.includes('✅') ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-wondrous-magenta flex-shrink-0 mt-1.5" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {message.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2705}\u{274C}]/gu, '').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Time Estimate */}
          {!isCompleted && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              This may take 2-5 minutes depending on program size
            </div>
          )}

          {/* Warning */}
          {!isCompleted && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center justify-center gap-2">
                <AlertTriangle size={16} />
                Do not close this window
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
