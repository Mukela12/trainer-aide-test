'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface Step {
  path: string;
  label: string;
}

interface Props {
  steps: Step[];
  currentPath?: string;
}

export function OnboardingProgressBar({ steps, currentPath }: Props) {
  const pathname = usePathname();
  const activePath = currentPath || pathname;

  const currentIndex = steps.findIndex((s) => activePath === s.path);
  const currentStep = currentIndex >= 0 ? currentIndex + 1 : 1;

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        <div className="flex gap-2">
          {steps.map((step, idx) => (
            <div
              key={step.path}
              className={cn(
                'h-2 flex-1 rounded-full transition-all duration-300',
                idx + 1 < currentStep
                  ? 'bg-green-500'
                  : idx + 1 === currentStep
                  ? 'bg-wondrous-blue'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
