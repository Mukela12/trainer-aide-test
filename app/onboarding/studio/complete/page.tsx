'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ArrowRight,
  Users,
  UserPlus,
  Building2,
  Calendar,
  Shield,
  Ban,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function StudioCompletePage() {
  const router = useRouter();
  const { currentUser, setOnboarded } = useUserStore();

  const [studioConfig, setStudioConfig] = useState<{
    name?: string;
    site_structure?: string;
    session_types?: string[];
    booking_model?: string;
    opening_hours?: Record<string, unknown>;
    cancellation_window_hours?: number;
  } | null>(null);

  useEffect(() => {
    const markOnboarded = async () => {
      const supabase = getSupabaseBrowserClient();

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({
          is_onboarded: true,
          onboarding_step: 8,
        })
        .eq('id', currentUser.id);

      // Load studio config for summary
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('name, site_structure, session_types, booking_model, opening_hours, cancellation_window_hours')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (studio) {
        setStudioConfig(studio);
      }

      // Load profile for staff record
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', currentUser.id)
        .maybeSingle();

      // Create bs_staff record if not exists
      const { data: existingStaff } = await supabase
        .from('bs_staff')
        .select('id')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!existingStaff) {
        await supabase.from('bs_staff').insert({
          id: currentUser.id,
          email: profile?.email || '',
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          studio_id: currentUser.id,
          staff_type: 'owner',
          is_solo: false,
          is_onboarded: true,
        });
      }

      setOnboarded(true);
    };
    markOnboarded();
  }, [currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const bookingModelLabel = (model?: string) => {
    switch (model) {
      case 'trainer-led': return 'Trainer-Led';
      case 'client-self-book': return 'Client Self-Book';
      case 'hybrid': return 'Hybrid';
      default: return 'Trainer-Led';
    }
  };

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={48} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Your studio is ready!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Here&apos;s a summary of what you configured.
        </p>
      </div>

      {/* Configuration Summary */}
      {studioConfig && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="text-gray-400" size={18} />
              <div>
                <p className="text-sm text-gray-500">Studio</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {studioConfig.name} ({studioConfig.site_structure === 'multi-site' ? 'Multi-Site' : 'Single Site'})
                </p>
              </div>
            </div>

            {studioConfig.session_types && studioConfig.session_types.length > 0 && (
              <div className="flex items-center gap-3">
                <Users className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Session Types</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {(studioConfig.session_types as string[]).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="text-gray-400" size={18} />
              <div>
                <p className="text-sm text-gray-500">Booking Model</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {bookingModelLabel(studioConfig.booking_model)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="text-gray-400" size={18} />
              <div>
                <p className="text-sm text-gray-500">Opening Hours</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Configured
                </p>
              </div>
            </div>

            {studioConfig.cancellation_window_hours && (
              <div className="flex items-center gap-3">
                <Ban className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Cancellation Window</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {studioConfig.cancellation_window_hours} hours
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          What&apos;s Next?
        </h2>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserPlus className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Invite Your First Trainer
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add trainers to your team so they can start managing their schedules.
                </p>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Add Clients
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Import your existing clients or invite them to join your studio.
                </p>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Go to Dashboard */}
      <div className="pt-4">
        <Button
          size="lg"
          onClick={() => router.push('/studio-owner')}
          className="w-full"
        >
          Go to Dashboard
          <ArrowRight className="ml-2" size={18} />
        </Button>
      </div>
    </div>
  );
}
