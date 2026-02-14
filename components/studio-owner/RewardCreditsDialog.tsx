'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks/use-toast';
import { usePatchClient } from '@/lib/hooks/use-clients';
import { Gift, Plus, Minus } from 'lucide-react';
import type { ClientSummary } from './EditClientDialog';

interface RewardCreditsDialogProps {
  client: ClientSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RewardCreditsDialog({ client, open, onOpenChange, onSuccess }: RewardCreditsDialogProps) {
  const { toast } = useToast();
  const patchClient = usePatchClient();
  const [creditsToAdd, setCreditsToAdd] = useState(1);
  const [reason, setReason] = useState('');

  const currentCredits = client.credits || 0;
  const newTotal = currentCredits + creditsToAdd;

  const handleQuickAdd = (amount: number) => {
    setCreditsToAdd(Math.max(1, creditsToAdd + amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creditsToAdd < 1) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter at least 1 credit to reward.',
      });
      return;
    }

    try {
      await patchClient.mutateAsync({ clientId: client.id, updates: { credits: newTotal } });

      toast({
        title: 'Credits rewarded!',
        description: `${creditsToAdd} credit${creditsToAdd > 1 ? 's' : ''} added to ${client.first_name} ${client.last_name}. New balance: ${newTotal}`,
      });

      // Reset form
      setCreditsToAdd(1);
      setReason('');

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reward credits',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Reward Credits
          </DialogTitle>
          <DialogDescription>
            Add complimentary credits to {client.first_name} {client.last_name}&apos;s account.
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

          {/* Credits input with quick buttons */}
          <div className="space-y-2">
            <Label htmlFor="creditsToAdd">Credits to Add</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleQuickAdd(-1)}
                disabled={creditsToAdd <= 1}
              >
                <Minus size={16} />
              </Button>
              <Input
                id="creditsToAdd"
                type="number"
                min="1"
                value={creditsToAdd}
                onChange={(e) => setCreditsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center text-lg font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleQuickAdd(1)}
              >
                <Plus size={16} />
              </Button>
            </div>

            {/* Quick add buttons */}
            <div className="flex gap-2 mt-2">
              {[1, 5, 10].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditsToAdd(amount)}
                  className={creditsToAdd === amount ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''}
                >
                  +{amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Referral bonus, Birthday gift, Loyalty reward..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={patchClient.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {patchClient.isPending ? 'Rewarding...' : `Reward ${creditsToAdd} Credit${creditsToAdd > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
