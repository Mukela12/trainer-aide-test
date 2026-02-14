'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type RoleOption = 'solo_practitioner' | 'studio_owner';

export default function OnboardingRolePage() {
  const router = useRouter();
  const { currentUser, setRole } = useUserStore();
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();

      // Update profile with selected role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          onboarding_step: 1,
        })
        .eq('id', currentUser.id);

      if (profileError) throw profileError;

      // Create bs_studios record via server API to bypass RLS restrictions
      // This prevents FK constraint errors when seeding services and availability
      const displayName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || 'My Studio';

      const studioResponse = await fetch('/api/onboarding/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: displayName,
          studioType: selectedRole === 'solo_practitioner' ? 'solo' : 'studio',
          role: selectedRole,
        }),
      });

      if (!studioResponse.ok) {
        const errorData = await studioResponse.json();
        console.error('Error creating studio:', errorData);
        // Show error to user instead of silently continuing
        setError('Failed to set up your studio. Please try again.');
        setIsLoading(false);
        return; // Block navigation
      }

      // Update local store
      setRole(selectedRole);

      // Navigate to role-specific flow
      if (selectedRole === 'solo_practitioner') {
        router.push('/onboarding/solo');
      } else {
        router.push('/onboarding/studio');
      }
    } catch (err) {
      console.error('Error saving role:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles: Array<{
    id: RoleOption;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    features: string[];
  }> = [
    {
      id: 'solo_practitioner',
      title: 'Independent Trainer',
      description: 'You train clients directly and manage your own schedule',
      icon: User,
      features: [
        'Your calendar, your way',
        'Professional workout templates',
        'Client progress tracking',
        'Direct payments & packages',
      ],
    },
    {
      id: 'studio_owner',
      title: 'Studio Operator',
      description: 'You run a studio with one or more trainers',
      icon: Building2,
      features: [
        'Multi-trainer scheduling',
        'Team management & permissions',
        'Studio-wide analytics',
        'Centralised client management',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          What best describes you?
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          This helps us configure the right tools for how you operate.
        </p>
      </div>

      {/* Role Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <Card
              key={role.id}
              className={cn(
                'relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                isSelected
                  ? 'border-2 border-wondrous-blue ring-2 ring-wondrous-blue/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
              onClick={() => setSelectedRole(role.id)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-wondrous-blue rounded-full flex items-center justify-center">
                  <Check className="text-white" size={14} />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      isSelected
                        ? 'bg-wondrous-blue text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {role.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {role.description}
                    </p>
                    <ul className="space-y-2">
                      {role.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <Check
                            className={cn(
                              'flex-shrink-0',
                              isSelected
                                ? 'text-wondrous-blue'
                                : 'text-gray-400'
                            )}
                            size={16}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedRole || isLoading}
          className="min-w-[140px]"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
