'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { cn } from '@/lib/utils/cn';

const HOLD_DURATIONS = [15, 30, 60];

export default function StudioBookingProtectionPage() {
  const router = useRouter();

  const [softHoldEnabled, setSoftHoldEnabled] = useState(false);
  const [softHoldLength, setSoftHoldLength] = useState(30);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [waitlistMaxSize, setWaitlistMaxSize] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            soft_hold_length: softHoldEnabled ? softHoldLength : null,
            waitlist_config: {
              enabled: waitlistEnabled,
              max_size: waitlistEnabled ? waitlistMaxSize : null,
            },
          },
          onboardingStep: 6,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/cancellation');
    } catch (error) {
      console.error('Error saving booking protection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Booking safeguards"
      subtitle="Optional tools for managing holds and waitlists."
      onBack={() => router.push('/onboarding/studio/opening-hours')}
      onNext={handleContinue}
      isLoading={isLoading}
    >
      {/* Soft Holds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Soft Holds</span>
            <button
              onClick={() => setSoftHoldEnabled(!softHoldEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                softHoldEnabled ? 'bg-wondrous-blue' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  softHoldEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            When enabled, new bookings are held for a limited time before being confirmed.
            This gives trainers time to review before slots are locked in.
          </p>

          {softHoldEnabled && (
            <div className="space-y-2">
              <Label>Hold Duration</Label>
              <div className="flex gap-2">
                {HOLD_DURATIONS.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSoftHoldLength(dur)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      softHoldLength === dur
                        ? 'bg-wondrous-blue text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    )}
                  >
                    {dur} min
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waitlists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Waitlists</span>
            <button
              onClick={() => setWaitlistEnabled(!waitlistEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                waitlistEnabled ? 'bg-wondrous-blue' : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  waitlistEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Allow clients to join a waitlist when slots are full.
          </p>

          {waitlistEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxSize">Maximum Waitlist Size</Label>
                <Input
                  id="maxSize"
                  type="number"
                  min="1"
                  max="50"
                  value={waitlistMaxSize}
                  onChange={(e) => setWaitlistMaxSize(parseInt(e.target.value) || 5)}
                  className="w-32"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Waitlist notifications available in a future update.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </OnboardingStepWrapper>
  );
}
