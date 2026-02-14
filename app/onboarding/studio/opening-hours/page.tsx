'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AvailabilitySetupForm,
  DEFAULT_AVAILABILITY,
  WeekAvailability,
} from '@/components/onboarding/AvailabilitySetupForm';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { useUserStore } from '@/lib/stores/user-store';

export default function StudioOpeningHoursPage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [availability, setAvailability] = useState<WeekAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Convert availability to JSONB format for bs_studios.opening_hours
      const openingHours: Record<string, { enabled: boolean; slots: Array<{ start: string; end: string }> }> = {};

      Object.entries(availability).forEach(([dayNum, day]: [string, { enabled: boolean; slots: Array<{ startHour: number; startMinute: number; endHour: number; endMinute: number }> }]) => {
        openingHours[dayNum] = {
          enabled: day.enabled,
          slots: day.enabled
            ? day.slots.map((slot) => ({
                start: `${slot.startHour.toString().padStart(2, '0')}:${slot.startMinute.toString().padStart(2, '0')}`,
                end: `${slot.endHour.toString().padStart(2, '0')}:${slot.endMinute.toString().padStart(2, '0')}`,
              }))
            : [],
        };
      });

      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { opening_hours: openingHours },
          onboardingStep: 5,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/booking-protection');
    } catch (error) {
      console.error('Error saving opening hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Set your studio's operating hours"
      subtitle="Define when your studio is open for sessions."
      onBack={() => router.push('/onboarding/studio/booking-model')}
      onNext={handleContinue}
      isLoading={isLoading}
      tipText="Individual trainers can set their own availability within these hours."
    >
      <AvailabilitySetupForm
        userId={currentUser.id}
        availability={availability}
        onAvailabilityChange={setAvailability}
        loadExisting={false}
      />
    </OnboardingStepWrapper>
  );
}
