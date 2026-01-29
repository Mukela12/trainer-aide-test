'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  CreditCard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ROLE_DASHBOARDS, UserRole } from '@/lib/permissions';
import { cn } from '@/lib/utils/cn';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { currentUser, currentRole } = useUserStore();

  const [businessSlug, setBusinessSlug] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('business_slug')
        .eq('id', currentUser.id)
        .single();

      if (data?.business_slug) {
        setBusinessSlug(data.business_slug);
      }
    };
    loadProfile();
  }, [currentUser.id]);

  const bookingUrl = businessSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${businessSlug}`
    : '';

  const copyLink = async () => {
    if (bookingUrl) {
      await navigator.clipboard.writeText(bookingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Mark onboarding as complete
      const { error } = await supabase
        .from('profiles')
        .update({
          is_onboarded: true,
          onboarding_step: 6,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Navigate to appropriate dashboard
      const dashboard = ROLE_DASHBOARDS[currentRole as UserRole] || '/solo';
      router.push(dashboard);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsCompleting(false);
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
          You&apos;re all set!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Your account is ready. Here&apos;s what you can do next.
        </p>
      </div>

      {/* Booking Link */}
      {businessSlug && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExternalLink className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Your Booking Page is Live!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Share this link with clients so they can book sessions with you
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono truncate">
                    {bookingUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    className={cn(
                      'min-w-[100px]',
                      copiedLink && 'text-green-600 border-green-600'
                    )}
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle2 size={14} className="mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommended Next Steps
        </h2>

        {/* Connect Stripe */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Connect Stripe
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Accept payments directly from clients. Only takes a few minutes to set up.
                </p>
                <Button variant="outline" size="sm" disabled>
                  <CreditCard size={14} className="mr-2" />
                  Connect Stripe (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Package */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Create a Session Package
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Offer bundles of sessions at a discount. Clients love bulk savings and
                  you get committed clients.
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
          onClick={handleComplete}
          disabled={isCompleting}
          className="w-full"
        >
          {isCompleting ? 'Setting up...' : 'Go to Dashboard'}
          <ArrowRight className="ml-2" size={18} />
        </Button>
      </div>
    </div>
  );
}
