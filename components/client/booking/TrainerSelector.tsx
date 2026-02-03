'use client';

import { Card, CardContent } from '@/components/ui/card';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StudioTrainer } from '@/lib/types/client-booking';

interface TrainerSelectorProps {
  trainers: StudioTrainer[];
  selectedTrainer: StudioTrainer | null;
  onSelect: (trainer: StudioTrainer | null) => void;
  isLoading?: boolean;
  showAnyOption?: boolean;
}

const ANY_TRAINER: StudioTrainer = {
  id: 'any',
  firstName: 'Any',
  lastName: 'Available',
  fullName: 'Any Available Trainer',
};

export function TrainerSelector({
  trainers,
  selectedTrainer,
  onSelect,
  isLoading,
  showAnyOption = true,
}: TrainerSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (trainers.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">No Trainers Available</p>
          <p className="text-sm">
            There are no trainers available at this time. Please try again later.
          </p>
        </div>
      </Card>
    );
  }

  const allOptions = showAnyOption ? [ANY_TRAINER, ...trainers] : trainers;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {allOptions.map((trainer) => {
        const isAny = trainer.id === 'any';
        const isSelected = selectedTrainer?.id === trainer.id;

        return (
          <Card
            key={trainer.id}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              isSelected
                ? 'ring-2 ring-wondrous-blue border-wondrous-blue'
                : 'hover:border-gray-300 dark:hover:border-gray-600'
            )}
            onClick={() => onSelect(isAny ? null : trainer)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mb-2',
                  isAny
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-wondrous-cyan dark:bg-wondrous-cyan/80'
                )}
              >
                {isAny ? (
                  <Users
                    size={24}
                    className="text-purple-600 dark:text-purple-400"
                  />
                ) : (
                  <User
                    size={24}
                    className="text-wondrous-dark-blue dark:text-wondrous-dark-blue"
                  />
                )}
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {isAny ? 'Any Available' : trainer.fullName}
              </p>
              {isAny && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  First available trainer
                </p>
              )}
              {isSelected && (
                <div className="mt-2 w-5 h-5 rounded-full bg-wondrous-blue flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
