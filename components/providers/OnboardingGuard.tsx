'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { getOnboardingRedirect } from '@/lib/utils/onboarding';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_onboarded, role, onboarding_step')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && profile.is_onboarded === false) {
          setNeedsOnboarding(true);
          if (!pathname?.startsWith('/onboarding')) {
            const redirect = getOnboardingRedirect(
              profile.role || '',
              profile.onboarding_step || 0
            );
            router.push(redirect);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading, router, pathname]);

  if (isChecking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-wondrous-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsOnboarding && !pathname?.startsWith('/onboarding')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-wondrous-magenta border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
