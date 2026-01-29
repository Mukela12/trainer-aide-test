'use client';

import { usePathname } from 'next/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ONBOARDING_STEPS = [
  { path: '/onboarding', label: 'Role', step: 1 },
  { path: '/onboarding/profile', label: 'Profile', step: 2 },
  { path: '/onboarding/business', label: 'Business', step: 3 },
  { path: '/onboarding/services', label: 'Services', step: 4 },
  { path: '/onboarding/availability', label: 'Availability', step: 5 },
  { path: '/onboarding/complete', label: 'Complete', step: 6 },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getCurrentStep = () => {
    const step = ONBOARDING_STEPS.find((s) => s.path === pathname);
    return step?.step || 1;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentStep} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {ONBOARDING_STEPS[currentStep - 1]?.label}
            </span>
          </div>
          <div className="flex gap-2">
            {ONBOARDING_STEPS.map((step) => (
              <div
                key={step.step}
                className={cn(
                  'h-2 flex-1 rounded-full transition-all duration-300',
                  step.step < currentStep
                    ? 'bg-green-500'
                    : step.step === currentStep
                    ? 'bg-wondrous-blue'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-2xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
