/**
 * Onboarding flow utilities
 *
 * Solo flow (4 steps):
 *   1. Business → 2. Services → 3. Availability → 4. Complete
 *
 * Studio flow (7 steps):
 *   1. Structure → 2. Session Types → 3. Booking Model → 4. Opening Hours
 *   → 5. Booking Protection → 6. Cancellation → 7. Complete
 */

const SOLO_STEPS = [
  '/onboarding/solo',             // step 1 (onboarding_step=1 after role)
  '/onboarding/solo/services',     // step 2
  '/onboarding/solo/availability', // step 3
  '/onboarding/solo/complete',     // step 4
];

const STUDIO_STEPS = [
  '/onboarding/studio',                     // step 1
  '/onboarding/studio/session-types',        // step 2
  '/onboarding/studio/booking-model',        // step 3
  '/onboarding/studio/opening-hours',        // step 4
  '/onboarding/studio/booking-protection',   // step 5
  '/onboarding/studio/cancellation',         // step 6
  '/onboarding/studio/complete',             // step 7
];

/**
 * Determines the correct onboarding redirect based on role and onboarding_step.
 * onboarding_step tracks how many steps the user has completed:
 *   0 = not started (no role selected)
 *   1 = role selected, start of flow
 *   2+ = completed that many steps in the flow
 */
export function getOnboardingRedirect(role: string, onboardingStep: number): string {
  if (onboardingStep <= 0) {
    return '/onboarding'; // Role selection
  }

  if (role === 'solo_practitioner') {
    // onboarding_step 1 = role selected → first solo step (Business)
    // onboarding_step 2 = Business done → Services
    // onboarding_step 3 = Services done → Availability
    // onboarding_step 4 = Availability done → Complete
    const stepIndex = Math.min(onboardingStep - 1, SOLO_STEPS.length - 1);
    return SOLO_STEPS[stepIndex];
  }

  if (role === 'studio_owner') {
    // onboarding_step 1 = role selected → first studio step (Structure)
    // onboarding_step 2 = Structure done → Session Types
    // ...etc
    const stepIndex = Math.min(onboardingStep - 1, STUDIO_STEPS.length - 1);
    return STUDIO_STEPS[stepIndex];
  }

  // Unknown role — fall back to role selection
  return '/onboarding';
}

export { SOLO_STEPS, STUDIO_STEPS };
