'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Mail,
  CalendarPlus,
  User,
  ArrowRight,
  ClockIcon,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface BookingDetails {
  id: string;
  scheduledAt: Date;
  duration: number;
  serviceName: string;
  trainerName: string;
  trainerEmail: string | null;
  clientEmail: string;
  isGuest: boolean;
}

interface RequestDetails {
  id: string;
  preferredTimes: string[];
  serviceName: string;
  trainerName: string;
  trainerEmail: string | null;
  clientEmail: string;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;
  const slug = params.slug as string;
  const isRequest = searchParams.get('type') === 'request';

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      if (isRequest) {
        // Load booking request with related data
        const { data } = await supabase
          .from('ta_booking_requests')
          .select(`
            id,
            preferred_times,
            service_id,
            ta_services(name),
            fc_clients(email),
            trainer_id
          `)
          .eq('id', bookingId)
          .single();

        if (data) {
          const { data: trainer } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', data.trainer_id)
            .single();

          const client = data.fc_clients as { email?: string } | null;

          setRequest({
            id: data.id,
            preferredTimes: (data.preferred_times as string[]) || [],
            serviceName: (data.ta_services as any)?.name || 'Session',
            trainerName: trainer ? `${trainer.first_name} ${trainer.last_name}` : 'Your Trainer',
            trainerEmail: trainer?.email || null,
            clientEmail: client?.email || '',
          });
        }
      } else {
        // Load booking with related data
        const { data } = await supabase
          .from('ta_bookings')
          .select(`
            id,
            scheduled_at,
            duration,
            ta_services(name),
            fc_clients(email, is_guest),
            trainer_id
          `)
          .eq('id', bookingId)
          .single();

        if (data) {
          const { data: trainer } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', data.trainer_id)
            .single();

          const client = data.fc_clients as { email?: string; is_guest?: boolean } | null;

          setBooking({
            id: data.id,
            scheduledAt: new Date(data.scheduled_at),
            duration: data.duration,
            serviceName: (data.ta_services as any)?.name || 'Session',
            trainerName: trainer ? `${trainer.first_name} ${trainer.last_name}` : 'Your Trainer',
            trainerEmail: trainer?.email || null,
            clientEmail: client?.email || '',
            isGuest: client?.is_guest === true,
          });
        }
      }

      setIsLoading(false);
    };

    if (bookingId) {
      loadData();
    }
  }, [bookingId, isRequest]);

  const addToCalendar = () => {
    if (!booking) return;

    const startTime = booking.scheduledAt;
    const endTime = new Date(startTime.getTime() + booking.duration * 60 * 1000);

    const formatDate = (date: Date) =>
      date.toISOString().replace(/-|:|\.\d{3}/g, '');

    const event = {
      title: `${booking.serviceName} with ${booking.trainerName}`,
      start: formatDate(startTime),
      end: formatDate(endTime),
      description: `Training session booked via allwondrous`,
    };

    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.description)}`;

    window.open(googleUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Request Submitted State ──
  if (isRequest && request) {
    const preferredTime = request.preferredTimes[0]
      ? new Date(request.preferredTimes[0])
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-lg mx-auto px-4 py-12">
          {/* Request Submitted */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClockIcon className="text-amber-600 dark:text-amber-400" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Request Submitted!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your booking request has been sent to{' '}
              <span className="font-medium">{request.trainerName}</span>.
              They will review and confirm your booking.
            </p>
          </div>

          {/* Request Details */}
          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {request.serviceName}
              </h2>

              <div className="space-y-3">
                {preferredTime && (
                  <>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <Calendar size={18} className="flex-shrink-0" />
                      <span>{format(preferredTime, 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                      <Clock size={18} className="flex-shrink-0" />
                      <span>{format(preferredTime, 'h:mm a')} (requested time)</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <MapPin size={18} className="flex-shrink-0" />
                  <span>With {request.trainerName}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your trainer will review this request and either confirm or suggest an alternative time.
                    You&apos;ll receive an email notification once they respond.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Link href={`/book/${slug}`} className="block">
              <Button variant="outline" className="w-full">
                Book Another Session
              </Button>
            </Link>
          </div>

          {/* Contact Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p className="mb-2">Have questions?</p>
            {request.trainerEmail && (
              <a
                href={`mailto:${request.trainerEmail}`}
                className="inline-flex items-center gap-1 text-wondrous-blue hover:underline"
              >
                <Mail size={14} />
                Contact {request.trainerName}
              </a>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-400">
            Powered by <span className="font-semibold">allwondrous</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found State ──
  if (!booking && !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Booking Not Found
            </h1>
            <Link href={`/book/${slug}`}>
              <Button>Back to Booking Page</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Booking Confirmed State ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Success */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A confirmation email has been sent to{' '}
            <span className="font-medium">{booking!.clientEmail}</span>
          </p>
        </div>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {booking!.serviceName}
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Calendar size={18} className="flex-shrink-0" />
                <span>{format(booking!.scheduledAt, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Clock size={18} className="flex-shrink-0" />
                <span>
                  {format(booking!.scheduledAt, 'h:mm a')} - {booking!.duration} minutes
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <MapPin size={18} className="flex-shrink-0" />
                <span>With {booking!.trainerName}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={addToCalendar}
              >
                <CalendarPlus className="mr-2" size={16} />
                Add to Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Account CTA for Guests */}
        {booking!.isGuest && (
          <Card className="mb-6 border-2 border-wondrous-primary/30 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-wondrous-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-wondrous-primary" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Create Your Account
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create an account to manage your bookings, view session history, and track your credits.
                  </p>
                  <Link href={`/book/${slug}/confirm/${bookingId}/create-account`}>
                    <Button className="gap-2">
                      Create Account
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/book/${slug}`} className="block">
            <Button variant="outline" className="w-full">
              Book Another Session
            </Button>
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2">Need to make changes?</p>
          {booking!.trainerEmail && (
            <a
              href={`mailto:${booking!.trainerEmail}`}
              className="inline-flex items-center gap-1 text-wondrous-blue hover:underline"
            >
              <Mail size={14} />
              Contact {booking!.trainerName}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-400">
          Powered by <span className="font-semibold">allwondrous</span>
        </div>
      </div>
    </div>
  );
}
