'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ServiceSetupForm, ServiceDraft } from '@/components/onboarding/ServiceSetupForm';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';

export default function SoloServicesPage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Delete existing services created during onboarding
      await supabase.from('ta_services').delete().eq('created_by', currentUser.id);

      // Insert all services with their active/inactive state
      if (services.length > 0) {
        const servicesToInsert = services.map((s: ServiceDraft) => ({
          name: s.name,
          description: s.description || null,
          duration: s.duration,
          type: s.type,
          max_capacity: s.maxCapacity,
          credits_required: 1,
          price_cents: s.priceInPounds ? Math.round(parseFloat(s.priceInPounds) * 100) : null,
          is_intro_session: s.isIntro,
          is_public: s.isPublic,
          is_active: s.isActive,
          created_by: currentUser.id,
          studio_id: currentUser.id,
        }));

        const { error } = await supabase.from('ta_services').insert(servicesToInsert);
        if (error) throw error;
      }

      await supabase
        .from('profiles')
        .update({ onboarding_step: 3 })
        .eq('id', currentUser.id);

      router.push('/onboarding/solo/availability');
    } catch (error) {
      console.error('Error saving services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Your services"
      subtitle="Define what you offer. You can add more services at any time."
      onBack={() => router.push('/onboarding/solo')}
      onNext={handleContinue}
      nextLabel="Continue"
      isLoading={isLoading}
    >
      <ServiceSetupForm
        userId={currentUser.id}
        services={services}
        onServicesChange={setServices}
      />
    </OnboardingStepWrapper>
  );
}
