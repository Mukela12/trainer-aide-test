'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface Props {
  userId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  customSlug: string;
  onCustomSlugChange: (slug: string) => void;
  onSlugAvailableChange: (available: boolean | null) => void;
  slugAvailable: boolean | null;
}

export function SlugInput({
  userId,
  businessName,
  firstName,
  lastName,
  customSlug,
  onCustomSlugChange,
  onSlugAvailableChange,
  slugAvailable,
}: Props) {
  const [generatedSlug, setGeneratedSlug] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      onSlugAvailableChange(null);
      return;
    }

    setIsCheckingSlug(true);
    try {
      const response = await fetch(
        `/api/onboarding/check-slug?slug=${encodeURIComponent(slug)}&userId=${userId}`
      );

      if (!response.ok) {
        onSlugAvailableChange(true);
        return;
      }

      const data = await response.json();
      onSlugAvailableChange(data.available);
    } catch {
      onSlugAvailableChange(true);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // Update slug when business name changes
  useEffect(() => {
    if (businessName) {
      const slug = generateSlug(businessName);
      setGeneratedSlug(slug);
      if (!customSlug) {
        checkSlugAvailability(slug);
      }
    } else {
      const defaultSlug = generateSlug(`${firstName}-${lastName}`);
      setGeneratedSlug(defaultSlug);
      if (!customSlug) {
        checkSlugAvailability(defaultSlug);
      }
    }
  }, [businessName, firstName, lastName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check custom slug availability
  useEffect(() => {
    if (customSlug) {
      const timer = setTimeout(() => {
        checkSlugAvailability(customSlug);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [customSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalSlug = customSlug || generatedSlug;

  return (
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
            value={customSlug}
            onChange={(e) => onCustomSlugChange(generateSlug(e.target.value))}
            placeholder={generatedSlug}
            className="rounded-l-none"
          />
        </div>
      </div>
    </div>
  );
}

export function getFinalSlug(
  businessName: string,
  firstName: string,
  lastName: string,
  customSlug: string
): string {
  if (customSlug) return customSlug;
  if (businessName) return generateSlug(businessName);
  return generateSlug(`${firstName}-${lastName}`);
}
