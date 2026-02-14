"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RPEPicker } from './RPEPicker';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/lib/utils/generators';
import { useToast } from '@/lib/hooks/use-toast';

interface SessionCompletionModalProps {
  open: boolean;
  onComplete: (data: { overallRpe: number; privateNotes: string; publicNotes: string; trainerDeclaration: boolean }) => void;
  sessionName: string;
  duration: number;
  clientName?: string;
}

export function SessionCompletionModal({
  open,
  onComplete,
  sessionName,
  duration,
  clientName,
}: SessionCompletionModalProps) {
  const { toast } = useToast();
  const [overallRpe, setOverallRpe] = useState<number | undefined>(undefined);
  const [privateNotes, setPrivateNotes] = useState('');
  const [publicNotes, setPublicNotes] = useState('');
  const [trainerDeclaration, setTrainerDeclaration] = useState(false);

  const handleComplete = () => {
    if (!overallRpe) {
      toast({
        variant: "warning",
        title: "RPE Required",
        description: "Please provide an overall RPE rating for the session.",
      });
      return;
    }

    if (!trainerDeclaration) {
      toast({
        variant: "warning",
        title: "Declaration Required",
        description: "Please confirm the trainer declaration to complete the session.",
      });
      return;
    }

    onComplete({
      overallRpe,
      privateNotes,
      publicNotes,
      trainerDeclaration,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-green-600" size={28} />
            <DialogTitle className="text-2xl">Complete Session</DialogTitle>
          </div>
          <DialogDescription>
            Review your session and provide final feedback
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Session Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Session Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Workout:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{sessionName}</span>
            </div>
            {clientName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Client:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{clientName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Overall RPE */}
          <div>
            <RPEPicker
              value={overallRpe}
              onChange={setOverallRpe}
              label="Overall Session Intensity (RPE)"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Rate the overall intensity of the entire session
            </p>
          </div>

          {/* Private Notes */}
          <div>
            <Label htmlFor="privateNotes" className="dark:text-gray-200 flex items-center gap-2">
              Private Notes (Optional)
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">• Only you can see this</span>
            </Label>
            <Textarea
              id="privateNotes"
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="e.g., Jane's left knee injury has improved. Don't let Jane do more than 20kg farmers walk..."
              rows={3}
              className="mt-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Public Notes */}
          <div>
            <Label htmlFor="publicNotes" className="dark:text-gray-200 flex items-center gap-2">
              Public Notes (Optional)
              <span className="text-xs text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1">
                <AlertCircle size={12} />
                Visible to client
              </span>
            </Label>
            <Textarea
              id="publicNotes"
              value={publicNotes}
              onChange={(e) => setPublicNotes(e.target.value)}
              placeholder="e.g., Great work today! You smashed it. Let's keep working on those pull ups..."
              rows={3}
              className="mt-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border-amber-200 dark:border-amber-700 focus:border-amber-400 dark:focus:border-amber-500"
            />
            {publicNotes && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                This note will be shared with the client in their dashboard
              </p>
            )}
          </div>

          {/* Trainer Declaration */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={trainerDeclaration}
                onChange={(e) => setTrainerDeclaration(e.target.checked)}
                className="w-5 h-5 text-wondrous-primary mt-0.5 flex-shrink-0 rounded border-gray-300 focus:ring-wondrous-primary"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Trainer Declaration *</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  I confirm that this session was conducted in accordance with studio standards and safety
                  protocols. All exercises were performed with proper form and supervision.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 pb-20 lg:pb-0 mt-auto border-t">
          <Button
            onClick={handleComplete}
            disabled={!overallRpe || !trainerDeclaration}
            className="flex-1"
          >
            <CheckCircle2 size={20} className="mr-2" />
            Complete Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
