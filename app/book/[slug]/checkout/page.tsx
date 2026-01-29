'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingSelection {
  serviceId: string;
  serviceName: string;
  duration: number;
  priceCents: number | null;
  trainerId: string;
  scheduledAt: string;
  slug: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load selection from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('booking_selection');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.slug === slug) {
        setSelection(data);
      } else {
        router.push(`/book/${slug}`);
      }
    } else {
      router.push(`/book/${slug}`);
    }
  }, [slug, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (!formData.email.trim()) newErrors.email = 'Required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }
    if (!agreeToTerms) newErrors.terms = 'Please agree to the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selection) return;

    setIsSubmitting(true);
    try {
      // Use API endpoint to handle booking creation server-side
      // This avoids RLS issues with fc_clients table
      const response = await fetch('/api/public/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: selection.trainerId,
          serviceId: selection.serviceId,
          scheduledAt: selection.scheduledAt,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete booking');
      }

      // Clear session storage
      sessionStorage.removeItem('booking_selection');

      // Redirect to confirmation page
      router.push(`/book/${slug}/confirm/${data.bookingId}`);
    } catch (error) {
      console.error('Checkout error:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to complete booking. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFree = !selection.priceCents || selection.priceCents === 0;
  const scheduledDate = new Date(selection.scheduledAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href={`/book/${slug}/${selection.serviceId}`}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to calendar
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Complete Your Booking
        </h1>

        <div className="grid gap-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Service</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selection.serviceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar size={14} />
                  Date
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Clock size={14} />
                  Time
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {format(scheduledDate, 'h:mm a')} ({selection.duration} min)
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Total
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {isFree ? 'Free' : `£${(selection.priceCents! / 100).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
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

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  I agree to the booking terms and cancellation policy
                </label>
              </div>
              {errors.terms && (
                <p className="text-sm text-red-500">{errors.terms}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          {errors.submit && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              'Processing...'
            ) : isFree ? (
              'Confirm Booking'
            ) : (
              <>
                <CreditCard className="mr-2" size={18} />
                Pay £{(selection.priceCents! / 100).toFixed(2)}
              </>
            )}
          </Button>

          {!isFree && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Lock size={14} />
              Secure payment powered by Stripe
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
