'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLoading?: boolean;
  tipText?: string;
}

export function OnboardingStepWrapper({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  isLoading = false,
  tipText,
}: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>

      {children}

      {/* Tip Box */}
      {tipText && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> {tipText}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={onNext}
          disabled={nextDisabled || isLoading}
          className="min-w-[140px]"
        >
          {isLoading ? 'Saving...' : nextLabel}
          <ArrowRight className="ml-2" size={16} />
        </Button>
      </div>
    </div>
  );
}
