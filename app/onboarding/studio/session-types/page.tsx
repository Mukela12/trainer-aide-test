'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Users, User, Monitor, Dumbbell, Zap, GraduationCap, Check } from 'lucide-react';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { cn } from '@/lib/utils/cn';

const SESSION_TYPE_OPTIONS = [
  { id: '1-2-1', label: '1-2-1', description: 'Private personal training', icon: User },
  { id: 'duet', label: 'Duet', description: 'Partner / semi-private sessions', icon: Users },
  { id: 'group', label: 'Group', description: 'Small group training', icon: Users },
  { id: 'online', label: 'Online', description: 'Virtual sessions', icon: Monitor },
  { id: 'bootcamp', label: 'Bootcamp', description: 'Large outdoor/indoor sessions', icon: Zap },
  { id: 'class', label: 'Class', description: 'Scheduled group classes', icon: GraduationCap },
];

export default function StudioSessionTypesPage() {
  const router = useRouter();

  const [selectedTypes, setSelectedTypes] = useState<string[]>(['1-2-1']);
  const [isLoading, setIsLoading] = useState(false);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { session_types: selectedTypes },
          onboardingStep: 3,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/booking-model');
    } catch (error) {
      console.error('Error saving session types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="What types of sessions does your studio offer?"
      subtitle="Select all that apply. You can change these later."
      onBack={() => router.push('/onboarding/studio')}
      onNext={handleContinue}
      nextDisabled={selectedTypes.length === 0}
      isLoading={isLoading}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SESSION_TYPE_OPTIONS.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedTypes.includes(type.id);

          return (
            <Card
              key={type.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected
                  ? 'border-2 border-wondrous-blue ring-2 ring-wondrous-blue/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
              onClick={() => toggleType(type.id)}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-wondrous-blue rounded-full flex items-center justify-center">
                  <Check className="text-white" size={12} />
                </div>
              )}
              <CardContent className="p-5">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                    isSelected
                      ? 'bg-wondrous-blue text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {type.label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {type.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OnboardingStepWrapper>
  );
}
