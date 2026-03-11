'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Gift, AlertCircle, Clock } from 'lucide-react';
import type { ClientSummary } from './EditClientDialog';

interface RewardCreditsDialogProps {
  client: ClientSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RewardCreditsDialog({ client, open, onOpenChange, onSuccess }: RewardCreditsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(false);

  const currentCredits = client.credits || 0;
  const newTotal = currentCredits + 1;

  // Check cooldown when dialog opens
  useEffect(() => {
    if (open && client.id) {
      setCheckingCooldown(true);
      fetch(`/api/clients/reward-credit?clientId=${client.id}`)
        .then((res) => res.json())
        .then((data) => {
          setCooldownMinutes(data.canReward ? null : data.minutesLeft || 1);
        })
        .catch(() => setCooldownMinutes(null))
        .finally(() => setCheckingCooldown(false));
    } else {
      setCooldownMinutes(null);
      setReason('');
      setReasonError(false);
    }
  }, [open, client.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setReasonError(true);
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Please provide a reason for the complimentary credit.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients/reward-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, reason: reason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Cannot reward credit',
          description: data.error || 'Failed to reward credit',
        });
        if (res.status === 429) {
          setCooldownMinutes(data.minutesLeft || 1);
        }
        return;
      }

      toast({
        title: 'Credit rewarded!',
        description: `1 complimentary credit added to ${client.first_name} ${client.last_name}. New balance: ${data.newTotal}`,
      });

      // Invalidate clients query to refresh data
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      setReason('');
      setReasonError(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reward credit',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Reward Complimentary Credit
          </DialogTitle>
          <DialogDescription>
            Add 1 complimentary credit to {client.first_name} {client.last_name}&apos;s account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current balance display */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Current Balance</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{currentCredits} credits</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">After Reward</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{newTotal} credits</span>
            </div>
          </div>

          {/* Cooldown warning or info */}
          {cooldownMinutes !== null ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Clock size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">
                This client was already rewarded recently. Please wait {cooldownMinutes} more minute{cooldownMinutes !== 1 ? 's' : ''} before rewarding again.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Max 1 free reward credit per customer per 30 minute period.
              </p>
            </div>
          )}

          {/* Reason (required) */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-1">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setReasonError(false);
              }}
              placeholder="e.g., Referral bonus, Birthday gift, Loyalty reward..."
              rows={2}
              className={reasonError ? 'border-red-500 focus:ring-red-500' : ''}
              disabled={cooldownMinutes !== null}
            />
            {reasonError && (
              <p className="text-xs text-red-500">A reason is required for complimentary credits</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || checkingCooldown || cooldownMinutes !== null}
              className="bg-gradient-to-r from-[#12229D] via-[#6B21A8] to-[#A71075] hover:opacity-90"
            >
              {isSubmitting ? 'Rewarding...' : checkingCooldown ? 'Checking...' : 'Reward 1 Credit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
