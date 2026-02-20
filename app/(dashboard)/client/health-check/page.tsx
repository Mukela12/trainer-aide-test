'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/lib/stores/user-store';
import HealthCheckStepper from '@/components/client/HealthCheckStepper';

export default function HealthCheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useUserStore();
  const returnTo = searchParams.get('returnTo');

  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<{
    responses?: Record<string, boolean>;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/client/health-check');
        const result = await response.json();

        if (result.healthCheck) {
          setInitialData({
            responses: result.healthCheck.responses,
            emergency_contact_name: result.healthCheck.emergency_contact_name,
            emergency_contact_phone: result.healthCheck.emergency_contact_phone,
          });
        }
      } catch (error) {
        console.error('Failed to load health check data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const handleComplete = () => {
    setIsCompleted(true);
  };

  const handleContinue = () => {
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push('/client');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-wondrous-blue mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading health check...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-300 dark:border-blue-700 p-8 md:p-12 shadow-xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-full mb-6 shadow-xl"
            >
              <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Health Check Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto text-base md:text-lg">
              Thank you for completing your health screening,{' '}
              {currentUser.firstName}! Your trainer has been notified.
            </p>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl text-left border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-lg">
                  What&apos;s next?
                </h3>
                <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                    <span>You can now book sessions with your trainer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                    <span>Your health data is shared securely with your trainer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                    <span>
                      We&apos;ll remind you to update this every 6 months
                    </span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white hover:opacity-90 font-semibold py-3 shadow-lg"
              >
                {returnTo ? 'Continue to Booking' : 'Go to Dashboard'}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <HealthCheckStepper
            clientName={currentUser.firstName || 'there'}
            initialData={initialData}
            onComplete={handleComplete}
          />

          <div className="mt-6 p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 text-lg">
              Why we ask these questions
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 leading-relaxed">
              The PAR-Q (Physical Activity Readiness Questionnaire) helps us
              ensure your safety during physical activities. Your answers are
              confidential and only shared with your trainer to provide
              appropriate guidance and modifications.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
