'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AvailabilitySetupForm,
  DEFAULT_AVAILABILITY,
  WeekAvailability,
} from '@/components/onboarding/AvailabilitySetupForm';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';

export default function SoloAvailabilityPage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [availability, setAvailability] = useState<WeekAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Delete existing weekly availability
      await supabase
        .from('ta_availability')
        .delete()
        .eq('trainer_id', currentUser.id)
        .eq('recurrence', 'weekly');

      // Insert new availability slots
      const slotsToInsert = Object.entries(availability).flatMap(
        ([dayNum, day]: [string, { enabled: boolean; slots: Array<{ startHour: number; startMinute: number; endHour: number; endMinute: number }> }]) =>
          day.enabled
            ? day.slots.map((slot) => ({
                trainer_id: currentUser.id,
                block_type: 'available',
                recurrence: 'weekly',
                day_of_week: parseInt(dayNum),
                start_hour: slot.startHour,
                start_minute: slot.startMinute,
                end_hour: slot.endHour,
                end_minute: slot.endMinute,
              }))
            : []
      );

      if (slotsToInsert.length > 0) {
        const { error } = await supabase.from('ta_availability').insert(slotsToInsert);
        if (error) throw error;
      }

      await supabase
        .from('profiles')
        .update({ onboarding_step: 4 })
        .eq('id', currentUser.id);

      router.push('/onboarding/solo/complete');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="When do you typically train clients?"
      subtitle="Set your default hours. You can always adjust this later."
      onBack={() => router.push('/onboarding/solo/services')}
      onNext={handleContinue}
      isLoading={isLoading}
      tipText="You can add multiple time slots per day (e.g., morning and evening availability). You can also block specific dates later from your calendar."
    >
      <AvailabilitySetupForm
        userId={currentUser.id}
        availability={availability}
        onAvailabilityChange={setAvailability}
      />
    </OnboardingStepWrapper>
  );
}
