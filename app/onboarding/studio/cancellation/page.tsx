'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info, Check } from 'lucide-react';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { cn } from '@/lib/utils/cn';

interface RefundTier {
  id: string;
  hoursBeforeSession: number;
  refundPercent: number;
}

const NO_SHOW_OPTIONS = [
  { id: 'charge_full', label: 'Charge full amount' },
  { id: 'charge_partial', label: 'Charge 50%' },
  { id: 'no_charge', label: 'No charge' },
];

export default function StudioCancellationPage() {
  const router = useRouter();

  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [refundTiers, setRefundTiers] = useState<RefundTier[]>([]);
  const [noShowAction, setNoShowAction] = useState('charge_full');
  const [isLoading, setIsLoading] = useState(false);

  const addRefundTier = () => {
    setRefundTiers((prev) => [
      ...prev,
      { id: `tier-${Date.now()}`, hoursBeforeSession: 12, refundPercent: 50 },
    ]);
  };

  const removeRefundTier = (id: string) => {
    setRefundTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const updateRefundTier = (id: string, field: keyof Omit<RefundTier, 'id'>, value: number) => {
    setRefundTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            cancellation_window_hours: cancellationWindowHours,
            cancellation_policy: {
              no_show_action: noShowAction,
              refund_tiers: refundTiers.map((t: RefundTier) => ({
                hours_before_session: t.hoursBeforeSession,
                refund_percent: t.refundPercent,
              })),
            },
          },
          onboardingStep: 7,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/complete');
    } catch (error) {
      console.error('Error saving cancellation policy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Set your cancellation rules"
      subtitle="Define your cancellation window and how refunds are handled."
      onBack={() => router.push('/onboarding/studio/booking-protection')}
      onNext={handleContinue}
      isLoading={isLoading}
    >
      {/* Cancellation Window */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            How many hours before a session must clients cancel to receive a full refund?
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              max="168"
              value={cancellationWindowHours}
              onChange={(e) => setCancellationWindowHours(parseInt(e.target.value) || 24)}
              className="w-24"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">hours before session</span>
          </div>
        </CardContent>
      </Card>

      {/* Tiered Refunds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tiered Refunds (Optional)</span>
            <Button variant="outline" size="sm" onClick={addRefundTier}>
              <Plus size={14} className="mr-1" />
              Add Tier
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Add custom refund tiers for late cancellations within the cancellation window.
          </p>

          {refundTiers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No tiers added. Full refund applies outside the cancellation window.
            </p>
          ) : (
            <div className="space-y-3">
              {refundTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Within
                    </span>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={tier.hoursBeforeSession}
                      onChange={(e) =>
                        updateRefundTier(tier.id, 'hoursBeforeSession', parseInt(e.target.value) || 12)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      hrs →
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={tier.refundPercent}
                      onChange={(e) =>
                        updateRefundTier(tier.id, 'refundPercent', parseInt(e.target.value) || 0)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">% refund</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRefundTier(tier.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* No-Show Action */}
      <Card>
        <CardHeader>
          <CardTitle>No-Show Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            What happens when a client doesn&apos;t show up?
          </p>
          <div className="space-y-2">
            {NO_SHOW_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setNoShowAction(option.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  noShowAction === option.id
                    ? 'border-wondrous-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    noShowAction === option.id
                      ? 'border-wondrous-blue bg-wondrous-blue'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {noShowAction === option.id && (
                    <Check className="text-white" size={12} />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Enforcement applies once Stripe is connected.
            </p>
          </div>
        </CardContent>
      </Card>
    </OnboardingStepWrapper>
  );
}
