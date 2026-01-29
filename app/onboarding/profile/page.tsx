'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const SPECIALIZATIONS = [
  'Weight Loss',
  'Muscle Building',
  'Strength Training',
  'HIIT',
  'Functional Fitness',
  'Sports Performance',
  'Injury Rehabilitation',
  'Senior Fitness',
  'Pre/Post Natal',
  'Yoga',
  'Pilates',
  'Boxing/MMA',
  'CrossFit',
  'Bodybuilding',
  'Endurance',
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { currentUser, setUser } = useUserStore();

  const [formData, setFormData] = useState({
    firstName: currentUser.firstName || '',
    lastName: currentUser.lastName || '',
    phone: '',
    location: '',
    yearsExperience: '',
    bio: '',
    specializations: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSpecialization = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          location: formData.location || null,
          years_experience: formData.yearsExperience
            ? parseInt(formData.yearsExperience)
            : null,
          bio: formData.bio || null,
          specializations: formData.specializations.length > 0 ? formData.specializations : null,
          onboarding_step: 2,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update local store
      setUser({
        ...currentUser,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Navigate to next step
      router.push('/onboarding/business');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Tell us about yourself
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          This information will be shown on your public booking page
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                }
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder="Smith"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+44 7700 900000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location / City</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="London"
              />
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of Experience</Label>
            <Input
              id="yearsExperience"
              type="number"
              min="0"
              max="50"
              value={formData.yearsExperience}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  yearsExperience: e.target.value,
                }))
              }
              placeholder="5"
              className="w-32"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell clients about your training philosophy, qualifications, and what makes you unique..."
              rows={4}
            />
            <p className="text-sm text-gray-500">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Specializations */}
          <div className="space-y-3">
            <Label>Specializations</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select all that apply
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.specializations.includes(spec)
                      ? 'bg-wondrous-blue text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/onboarding')}
        >
          <ArrowLeft className="mr-2" size={16} />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          className="min-w-[140px]"
        >
          {isLoading ? 'Saving...' : 'Continue'}
          <ArrowRight className="ml-2" size={16} />
        </Button>
      </div>
    </div>
  );
}
