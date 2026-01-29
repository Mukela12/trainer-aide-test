'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type RoleOption = 'solo_practitioner' | 'studio_owner';

export default function OnboardingRolePage() {
  const router = useRouter();
  const { currentUser, setRole } = useUserStore();
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Update profile with selected role
      const { error } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          onboarding_step: 1,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local store
      setRole(selectedRole);

      // Navigate to next step
      router.push('/onboarding/profile');
    } catch (error) {
      console.error('Error saving role:', error);
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
      title: 'Solo Personal Trainer',
      description: 'I work independently with my own clients',
      icon: User,
      features: [
        'Manage your own calendar & bookings',
        'Create workout templates',
        'Track client progress',
        'Accept payments directly',
      ],
    },
    {
      id: 'studio_owner',
      title: 'Studio Owner',
      description: 'I run a gym or studio with trainers',
      icon: Building2,
      features: [
        'Everything in Solo, plus:',
        'Invite and manage team members',
        'Set trainer commissions',
        'View studio-wide analytics',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Welcome to allwondrous!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Let&apos;s get you set up. First, tell us how you work.
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
