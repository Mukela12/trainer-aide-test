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
import { cn } from '@/lib/utils/cn';

export default function SoloCompletePage() {
  const router = useRouter();
  const { currentUser, setOnboarded, setBusinessSlug } = useUserStore();

  const [businessSlug, setBusinessSlugLocal] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const markOnboarded = async () => {
      const supabase = getSupabaseBrowserClient();

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({
          is_onboarded: true,
          onboarding_step: 5,
        })
        .eq('id', currentUser.id);

      // Load profile for slug
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_slug, role, first_name, last_name, email')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profile?.business_slug) {
        setBusinessSlugLocal(profile.business_slug);
        setBusinessSlug(profile.business_slug);
      }

      // Upsert bs_studios record
      const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'My Studio';
      await supabase.from('bs_studios').upsert({
        id: currentUser.id,
        owner_id: currentUser.id,
        name: displayName,
        studio_type: 'solo',
        studio_mode: 'trainer-led',
        plan: 'free',
        license_level: 'single-site',
        platform_version: 'v2',
      }, { onConflict: 'id' });

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
          is_solo: true,
          is_onboarded: true,
        });
      }

      setOnboarded(true);
    };
    markOnboarded();
  }, [currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-600 dark:text-green-400" size={48} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          You&apos;re ready
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Your account is set up. Here are some suggested next steps.
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
                  Your booking page is live
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

        <Card className="hover:shadow-md transition-shadow">
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

        <Card className="hover:shadow-md transition-shadow">
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
          onClick={() => router.push('/solo')}
          className="w-full"
        >
          Go to Dashboard
          <ArrowRight className="ml-2" size={18} />
        </Button>
      </div>
    </div>
  );
}
