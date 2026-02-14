'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, MousePointerClick, Shuffle, Check } from 'lucide-react';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { cn } from '@/lib/utils/cn';

const BOOKING_MODELS = [
  {
    id: 'trainer-led',
    title: 'Trainer-Led',
    description: 'Trainers manage all bookings. Clients request sessions and trainers confirm.',
    icon: UserCheck,
  },
  {
    id: 'client-self-book',
    title: 'Client Self-Book',
    description: 'Clients book directly from available slots. No trainer approval needed.',
    icon: MousePointerClick,
  },
  {
    id: 'hybrid',
    title: 'Hybrid',
    description: 'Clients can self-book some services, while others require trainer approval.',
    icon: Shuffle,
  },
];

export default function StudioBookingModelPage() {
  const router = useRouter();

  const [bookingModel, setBookingModel] = useState('trainer-led');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Save to the new booking_model column only.
      // studio_mode has a check constraint tied to studio_type — don't touch it here.
      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            booking_model: bookingModel,
          },
          onboardingStep: 4,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/opening-hours');
    } catch (error) {
      console.error('Error saving booking model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Who controls the booking?"
      subtitle="Choose how sessions get booked at your studio."
      onBack={() => router.push('/onboarding/studio/session-types')}
      onNext={handleContinue}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {BOOKING_MODELS.map((model) => {
          const Icon = model.icon;
          const isSelected = bookingModel === model.id;

          return (
            <Card
              key={model.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected
                  ? 'border-2 border-wondrous-blue ring-2 ring-wondrous-blue/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
              onClick={() => setBookingModel(model.id)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-wondrous-blue rounded-full flex items-center justify-center">
                  <Check className="text-white" size={14} />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'bg-wondrous-blue text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {model.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {model.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OnboardingStepWrapper>
  );
}
