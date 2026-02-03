'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  CreditCard,
} from 'lucide-react';
import ContentHeader from '@/components/shared/ContentHeader';
import { ServiceSelector } from '@/components/client/booking/ServiceSelector';
import { TrainerSelector } from '@/components/client/booking/TrainerSelector';
import { TimeSlotPicker } from '@/components/client/booking/TimeSlotPicker';
import { BookingConfirmation } from '@/components/client/booking/BookingConfirmation';
import type {
  ClientService,
  StudioTrainer,
  BookingStep,
} from '@/lib/types/client-booking';
import { cn } from '@/lib/utils/cn';

const STEPS: { id: BookingStep; label: string; icon: React.ReactNode }[] = [
  { id: 'service', label: 'Service', icon: <Clock size={16} /> },
  { id: 'trainer', label: 'Trainer', icon: <User size={16} /> },
  { id: 'datetime', label: 'Date & Time', icon: <Calendar size={16} /> },
  { id: 'confirm', label: 'Confirm', icon: <CheckCircle2 size={16} /> },
];

export default function ClientBookPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [services, setServices] = useState<ClientService[]>([]);
  const [trainers, setTrainers] = useState<StudioTrainer[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected values
  const [selectedService, setSelectedService] = useState<ClientService | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<StudioTrainer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [selectedTrainerName, setSelectedTrainerName] = useState<string>('');

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch services
        const servicesRes = await fetch('/api/client/studio/services');
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(data.services || []);
        }
        setIsLoadingServices(false);

        // Fetch trainers
        const trainersRes = await fetch('/api/client/studio/trainers');
        if (trainersRes.ok) {
          const data = await trainersRes.json();
          setTrainers(data.trainers || []);
        }
        setIsLoadingTrainers(false);

        // Fetch credits
        const creditsRes = await fetch('/api/client/packages');
        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCredits(data.totalCredits || 0);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setIsLoadingServices(false);
        setIsLoadingTrainers(false);
      }
    };

    fetchData();
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'service':
        return selectedService !== null;
      case 'trainer':
        return true; // Can proceed with "any trainer" or a specific trainer
      case 'datetime':
        return selectedDate !== null && selectedTime !== null && selectedTrainerId !== null;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleTimeSlotSelect = (date: Date, time: string, trainerId: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedTrainerId(trainerId);

    // Find trainer name
    const trainer = trainers.find((t) => t.id === trainerId);
    setSelectedTrainerName(trainer?.fullName || 'Trainer');
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTrainerId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledAt = selectedDate.toISOString();

      const res = await fetch('/api/client/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          trainerId: selectedTrainerId,
          scheduledAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create booking');
        return;
      }

      // Success - redirect to bookings page
      router.push('/client/bookings?booked=true');
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <ContentHeader
        context="Book a session with your trainer"
        stats={[
          { label: 'credits', value: credits, color: 'primary' },
        ]}
      />

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-wondrous-blue text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-2 font-medium',
                      isActive
                        ? 'text-wondrous-blue'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      index < currentStepIndex
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Summary (when not on confirm step) */}
      {currentStep !== 'confirm' && (selectedService || selectedTrainer || selectedDate) && (
        <Card className="mb-6 bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {selectedService && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock size={12} />
                  {selectedService.name}
                </Badge>
              )}
              {selectedTrainer && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User size={12} />
                  {selectedTrainer.fullName}
                </Badge>
              )}
              {!selectedTrainer && currentStepIndex > 1 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User size={12} />
                  Any Available Trainer
                </Badge>
              )}
              {selectedDate && selectedTime && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar size={12} />
                  {selectedDate.toLocaleDateString()} at {selectedTime}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 'service' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select a Service
            </h2>
            <ServiceSelector
              services={services}
              selectedService={selectedService}
              onSelect={setSelectedService}
              isLoading={isLoadingServices}
            />
          </div>
        )}

        {currentStep === 'trainer' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Choose Your Trainer
            </h2>
            <TrainerSelector
              trainers={trainers}
              selectedTrainer={selectedTrainer}
              onSelect={setSelectedTrainer}
              isLoading={isLoadingTrainers}
              showAnyOption={true}
            />
          </div>
        )}

        {currentStep === 'datetime' && selectedService && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Pick a Date & Time
            </h2>
            <TimeSlotPicker
              selectedTrainer={selectedTrainer}
              serviceDuration={selectedService.duration}
              onSelectSlot={handleTimeSlotSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          </div>
        )}

        {currentStep === 'confirm' && selectedService && selectedDate && (
          <BookingConfirmation
            service={selectedService}
            trainer={selectedTrainer}
            trainerName={selectedTrainerName}
            scheduledAt={selectedDate}
            currentCredits={credits}
            onConfirm={handleConfirmBooking}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}
      </div>

      {/* Navigation Buttons (except on confirm step) */}
      {currentStep !== 'confirm' && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-wondrous-blue hover:bg-wondrous-blue/90"
          >
            Next
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
