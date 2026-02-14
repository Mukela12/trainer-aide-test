'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Check } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { LogoUpload } from '@/components/shared/LogoUpload';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { cn } from '@/lib/utils/cn';

const STRUCTURES = [
  {
    id: 'single-site',
    title: 'Single Site',
    description: 'One studio location',
    icon: Building2,
  },
  {
    id: 'multi-site',
    title: 'Multi-Site',
    description: 'Multiple studio locations',
    icon: MapPin,
  },
];

export default function StudioStructurePage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [siteStructure, setSiteStructure] = useState('single-site');
  const [studioName, setStudioName] = useState('');
  const [studioLogo, setStudioLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/onboarding/studio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            site_structure: siteStructure,
            license_level: siteStructure === 'multi-site' ? 'multi-site' : 'single-site',
            name: studioName || 'My Studio',
            logo_url: studioLogo || null,
          },
          onboardingStep: 2,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      router.push('/onboarding/studio/session-types');
    } catch (error) {
      console.error('Error saving studio structure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OnboardingStepWrapper
      title="Studio setup"
      subtitle="A few details about your studio to tailor the experience."
      onNext={handleContinue}
      isLoading={isLoading}
    >
      {/* Structure Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        {STRUCTURES.map((structure) => {
          const Icon = structure.icon;
          const isSelected = siteStructure === structure.id;

          return (
            <Card
              key={structure.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                isSelected
                  ? 'border-2 border-wondrous-blue ring-2 ring-wondrous-blue/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
              onClick={() => setSiteStructure(structure.id)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-wondrous-blue rounded-full flex items-center justify-center">
                  <Check className="text-white" size={14} />
                </div>
              )}
              <CardContent className="p-6 text-center">
                <div
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3',
                    isSelected
                      ? 'bg-wondrous-blue text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {structure.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {structure.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Studio Details */}
      <Card>
        <CardHeader>
          <CardTitle>Studio Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Studio Logo (Optional)</Label>
            <LogoUpload
              currentLogo={studioLogo}
              onLogoChange={setStudioLogo}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studioName">Studio Name</Label>
            <Input
              id="studioName"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="e.g., Iron Works Fitness, The Pilates Studio"
            />
          </div>
        </CardContent>
      </Card>
    </OnboardingStepWrapper>
  );
}
