'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { SlugInput, getFinalSlug } from '@/components/onboarding/SlugInput';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';

export default function SoloBusinessPage() {
  const router = useRouter();
  const { currentUser, setUser } = useUserStore();

  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [businessName, setBusinessName] = useState('');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveFirstName = firstName.trim() || currentUser.firstName;
  const effectiveLastName = lastName.trim() || currentUser.lastName;
  const finalSlug = getFinalSlug(businessName, effectiveFirstName, effectiveLastName, customSlug);

  const handleContinue = async () => {
    if (!firstName.trim() || !finalSlug || slugAvailable === false) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          business_name: businessName || null,
          business_slug: finalSlug,
          business_logo_url: businessLogo || null,
          onboarding_step: 2,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update user store with the name
      setUser({ ...currentUser, firstName: firstName.trim(), lastName: lastName.trim() });

      router.push('/onboarding/solo/services');
    } catch (error) {
      console.error('Error saving business info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Your booking page"
      subtitle="Set up your booking link so clients can find and book with you."
      onNext={handleContinue}
      nextDisabled={!firstName.trim() || !finalSlug || slugAvailable === false}
      isLoading={isLoading}
      tipText="You can change your booking link at any time in Settings."
    >
      {/* Your Name */}
      <Card>
        <CardHeader>
          <CardTitle>Your Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            This is how clients and invitees will see your name
          </p>
        </CardContent>
      </Card>

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
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., FitLife Training, Smith Fitness"
            />
            <p className="text-sm text-gray-500">
              Leave blank to use your name
            </p>
          </div>

          {/* Booking Link */}
          <SlugInput
            userId={currentUser.id}
            businessName={businessName}
            firstName={effectiveFirstName}
            lastName={effectiveLastName}
            customSlug={customSlug}
            onCustomSlugChange={setCustomSlug}
            onSlugAvailableChange={setSlugAvailable}
            slugAvailable={slugAvailable}
          />
        </CardContent>
      </Card>
    </OnboardingStepWrapper>
  );
}
