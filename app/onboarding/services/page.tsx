'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';

/**
 * Legacy redirect: /onboarding/services no longer exists.
 * Redirects to the solo services step.
 */
export default function OnboardingServicesRedirect() {
  const router = useRouter();
  const { currentRole } = useUserStore();

  useEffect(() => {
    const redirect = currentRole === 'studio_owner'
      ? '/onboarding/studio'
      : '/onboarding/solo/services';
    router.replace(redirect);
  }, [router, currentRole]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-wondrous-magenta border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
