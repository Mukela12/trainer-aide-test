'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';

/**
 * Legacy redirect: /onboarding/business no longer exists.
 * Redirects to the appropriate new flow based on role.
 */
export default function OnboardingBusinessRedirect() {
  const router = useRouter();
  const { currentRole } = useUserStore();

  useEffect(() => {
    const redirect = currentRole === 'studio_owner'
      ? '/onboarding/studio'
      : '/onboarding/solo';
    router.replace(redirect);
  }, [router, currentRole]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-wondrous-magenta border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
