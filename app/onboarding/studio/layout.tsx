'use client';

import { OnboardingProgressBar } from '@/components/onboarding/OnboardingProgressBar';

const STUDIO_STEPS = [
  { path: '/onboarding/studio', label: 'Structure' },
  { path: '/onboarding/studio/session-types', label: 'Sessions' },
  { path: '/onboarding/studio/booking-model', label: 'Booking' },
  { path: '/onboarding/studio/opening-hours', label: 'Hours' },
  { path: '/onboarding/studio/booking-protection', label: 'Protection' },
  { path: '/onboarding/studio/cancellation', label: 'Cancellation' },
  { path: '/onboarding/studio/complete', label: 'Go Live' },
];

export default function StudioOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OnboardingProgressBar steps={STUDIO_STEPS} />
      <div className="pt-16">{children}</div>
    </>
  );
}
