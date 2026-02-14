'use client';

import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar';

const SOLO_STEPS = [
  { path: '/onboarding/solo', label: 'Business' },
  { path: '/onboarding/solo/services', label: 'Services' },
  { path: '/onboarding/solo/availability', label: 'Availability' },
  { path: '/onboarding/solo/complete', label: 'Go Live' },
];

export default function SoloOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OnboardingProgressBar steps={SOLO_STEPS} />
      <div className="pt-16">{children}</div>
    </>
  );
}
