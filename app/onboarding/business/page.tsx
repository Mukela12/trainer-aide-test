'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Globe, Check, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { LogoUpload } from '@/components/shared/LogoUpload';

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [formData, setFormData] = useState({
    businessName: '',
    customSlug: '',
  });
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [generatedSlug, setGeneratedSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate slug from business name or user name
  const generateSlug = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Check slug availability via server API to bypass RLS restrictions
  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const response = await fetch(
        `/api/onboarding/check-slug?slug=${encodeURIComponent(slug)}&userId=${currentUser.id}`
      );

      if (!response.ok) {
        // On error, assume available to not block the user
        console.error('Error checking slug availability');
        setSlugAvailable(true);
        return;
      }

      const data = await response.json();
      setSlugAvailable(data.available);
    } catch {
      // On error, assume available to not block the user
      setSlugAvailable(true);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Update slug when business name changes
  useEffect(() => {
    if (formData.businessName) {
      const slug = generateSlug(formData.businessName);
      setGeneratedSlug(slug);
      if (!formData.customSlug) {
        checkSlugAvailability(slug);
      }
    } else {
      // Use user's name if no business name
      const defaultSlug = generateSlug(
        `${currentUser.firstName}-${currentUser.lastName}`
      );
      setGeneratedSlug(defaultSlug);
      if (!formData.customSlug) {
        checkSlugAvailability(defaultSlug);
      }
    }
  }, [formData.businessName, currentUser.firstName, currentUser.lastName]);

  // Check custom slug availability
  useEffect(() => {
    if (formData.customSlug) {
      const timer = setTimeout(() => {
        checkSlugAvailability(formData.customSlug);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.customSlug]);

  const finalSlug = formData.customSlug || generatedSlug;

  const handleContinue = async () => {
    if (!finalSlug || slugAvailable === false) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.businessName || null,
          business_slug: finalSlug,
          onboarding_step: 3,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Navigate to next step
      router.push('/onboarding/services');
    } catch (error) {
      console.error('Error saving business info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Set up your booking page
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Create your unique booking link for clients
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Logo */}
          <div className="space-y-2">
            <Label>Business Logo (Optional)</Label>
            <p className="text-sm text-gray-500 mb-3">
              Add a logo to personalize your booking page and emails
            </p>
            <LogoUpload
              currentLogo={businessLogo}
              onLogoChange={setBusinessLogo}
            />
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name (Optional)</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, businessName: e.target.value }))
              }
              placeholder="e.g., FitLife Training, Smith Fitness"
            />
            <p className="text-sm text-gray-500">
              Leave blank to use your name
            </p>
          </div>

          {/* Booking Link Preview */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Booking Link</Label>
              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <Globe className="text-gray-400" size={20} />
                <span className="text-gray-500">allwondrous.com/book/</span>
                <span className="font-semibold text-wondrous-blue">
                  {finalSlug || 'your-name'}
                </span>
              </div>
            </div>

            {/* Slug Status */}
            {finalSlug && (
              <div
                className={cn(
                  'flex items-center gap-2 text-sm',
                  isCheckingSlug
                    ? 'text-gray-500'
                    : slugAvailable
                    ? 'text-green-600'
                    : 'text-red-500'
                )}
              >
                {isCheckingSlug ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : slugAvailable ? (
                  <Check size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>
                  {isCheckingSlug
                    ? 'Checking availability...'
                    : slugAvailable
                    ? 'This link is available!'
                    : 'This link is already taken'}
                </span>
              </div>
            )}

            {/* Custom Slug */}
            <div className="space-y-2">
              <Label htmlFor="customSlug">Customize Your Link (Optional)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  /book/
                </span>
                <Input
                  id="customSlug"
                  value={formData.customSlug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customSlug: generateSlug(e.target.value),
                    }))
                  }
                  placeholder={generatedSlug}
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Tip:</strong> Share this link with clients so they can book
          sessions with you directly. You can always change it later in settings.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push('/onboarding/profile')}>
          <ArrowLeft className="mr-2" size={16} />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || !finalSlug || slugAvailable === false}
          className="min-w-[140px]"
        >
          {isLoading ? 'Saving...' : 'Continue'}
          <ArrowRight className="ml-2" size={16} />
        </Button>
      </div>
    </div>
  );
}
