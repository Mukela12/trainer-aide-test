'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ClientService, StudioTrainer } from '@/lib/types/client-booking';

interface BookingConfirmationProps {
  service: ClientService;
  trainer: StudioTrainer | null;
  trainerName: string;
  scheduledAt: Date;
  currentCredits: number;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function BookingConfirmation({
  service,
  trainer,
  trainerName,
  scheduledAt,
  currentCredits,
  onConfirm,
  onBack,
  isSubmitting,
  error,
}: BookingConfirmationProps) {
  const creditsAfterBooking = currentCredits - service.creditsRequired;
  const hasEnoughCredits = creditsAfterBooking >= 0;

  return (
    <div className="space-y-6">
      {/* Booking Summary Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 size={24} />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Service */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Service</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {service.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {service.duration} minutes
              </p>
            </div>
          </div>

          {/* Trainer */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <User className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trainer</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {trainerName}
              </p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Calendar className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {format(scheduledAt, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(scheduledAt, 'h:mm a')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="text-wondrous-magenta" size={20} />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Credit Summary
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Current balance</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {currentCredits} credits
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">This booking</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                -{service.creditsRequired} credit{service.creditsRequired !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Balance after booking
                </span>
                <span
                  className={`font-semibold ${
                    hasEnoughCredits
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {creditsAfterBooking} credits
                </span>
              </div>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={16} />
              <div className="text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Insufficient credits</p>
                <p>
                  You need {service.creditsRequired - currentCredits} more credit
                  {service.creditsRequired - currentCredits !== 1 ? 's' : ''} to book
                  this session.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={16} />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Cancellation Policy */}
      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <p className="font-medium mb-1">Cancellation Policy</p>
        <p>
          You can cancel this booking up to 24 hours before the scheduled time
          to receive a credit refund.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting || !hasEnoughCredits}
          className="flex-1 bg-wondrous-blue hover:bg-wondrous-blue/90"
        >
          {isSubmitting ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
