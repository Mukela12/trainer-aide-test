'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  isSameDay,
  isAfter,
  isBefore,
  setHours,
  setMinutes,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils/cn';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  priceCents: number | null;
  trainerId: string;
}

interface AvailabilitySlot {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface ExistingBooking {
  scheduledAt: Date;
  duration: number;
}

interface TimeSlot {
  time: Date;
  available: boolean;
}

export default function ServiceBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const serviceId = params.serviceId as string;

  const [service, setService] = useState<Service | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  // Load service and availability
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      // Get trainer ID from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('business_slug', slug)
        .single();

      if (!profile) {
        setIsLoading(false);
        return;
      }

      // Load service
      const { data: serviceData } = await supabase
        .from('ta_services')
        .select('id, name, description, duration, price_cents, created_by')
        .eq('id', serviceId)
        .eq('is_public', true)
        .eq('is_active', true)
        .single();

      if (serviceData) {
        setService({
          id: serviceData.id,
          name: serviceData.name,
          description: serviceData.description,
          duration: serviceData.duration,
          priceCents: serviceData.price_cents,
          trainerId: serviceData.created_by,
        });

        // Load trainer availability
        const { data: availData } = await supabase
          .from('ta_availability')
          .select('day_of_week, start_hour, start_minute, end_hour, end_minute')
          .eq('trainer_id', serviceData.created_by)
          .eq('block_type', 'available')
          .eq('recurrence', 'weekly');

        if (availData) {
          setAvailability(
            availData.map((a: { day_of_week: number; start_hour: number; start_minute?: number; end_hour: number; end_minute?: number }) => ({
              dayOfWeek: a.day_of_week,
              startHour: a.start_hour,
              startMinute: a.start_minute || 0,
              endHour: a.end_hour,
              endMinute: a.end_minute || 0,
            }))
          );
        }

        // Load existing bookings for next 4 weeks
        const fourWeeksFromNow = addWeeks(new Date(), 4);
        const { data: bookingsData } = await supabase
          .from('ta_bookings')
          .select('scheduled_at, duration')
          .eq('trainer_id', serviceData.created_by)
          .gte('scheduled_at', new Date().toISOString())
          .lte('scheduled_at', fourWeeksFromNow.toISOString())
          .in('status', ['confirmed', 'soft-hold', 'checked-in']);

        if (bookingsData) {
          setExistingBookings(
            bookingsData.map((b: { scheduled_at: string; duration: number }) => ({
              scheduledAt: new Date(b.scheduled_at),
              duration: b.duration,
            }))
          );
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [slug, serviceId]);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Check if a day has availability
  const dayHasAvailability = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.some((a) => a.dayOfWeek === dayOfWeek);
  };

  // Generate time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate || !service) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter((a) => a.dayOfWeek === dayOfWeek);

    if (dayAvailability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);

    dayAvailability.forEach((avail) => {
      let currentTime = setMinutes(
        setHours(startOfDay(selectedDate), avail.startHour),
        avail.startMinute
      );
      const endTime = setMinutes(
        setHours(startOfDay(selectedDate), avail.endHour),
        avail.endMinute
      );

      // Generate slots at 30-minute intervals
      while (isBefore(currentTime, endTime)) {
        const slotEnd = addDays(currentTime, 0);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);

        // Check if slot would extend past availability
        if (isAfter(slotEnd, endTime)) break;

        // Check if slot is in the past
        if (isToday && isBefore(currentTime, now)) {
          currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
          continue;
        }

        // Check if slot conflicts with existing booking
        const hasConflict = existingBookings.some((booking) => {
          const bookingEnd = new Date(
            booking.scheduledAt.getTime() + booking.duration * 60 * 1000
          );
          return (
            (currentTime >= booking.scheduledAt && currentTime < bookingEnd) ||
            (slotEnd > booking.scheduledAt && slotEnd <= bookingEnd) ||
            (currentTime <= booking.scheduledAt && slotEnd >= bookingEnd)
          );
        });

        slots.push({
          time: new Date(currentTime),
          available: !hasConflict,
        });

        // Move to next slot
        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
      }
    });

    return slots;
  }, [selectedDate, availability, existingBookings, service]);

  const handleContinue = () => {
    if (!selectedTime || !service) return;

    // Store selection in sessionStorage and proceed to checkout
    sessionStorage.setItem(
      'booking_selection',
      JSON.stringify({
        serviceId: service.id,
        serviceName: service.name,
        duration: service.duration,
        priceCents: service.priceCents,
        trainerId: service.trainerId,
        scheduledAt: selectedTime.toISOString(),
        slug,
      })
    );

    router.push(`/book/${slug}/checkout`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Service Not Found
            </h1>
            <Link href={`/book/${slug}`}>
              <Button>Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/book/${slug}`}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to services
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Service Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {service.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {service.duration} min
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {service.priceCents === null || service.priceCents === 0
                ? 'Free'
                : `£${(service.priceCents / 100).toFixed(0)}`}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon size={20} />
                  Select a Date
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
                    disabled={isBefore(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const hasAvail = dayHasAvailability(day);
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        if (hasAvail && !isPast) {
                          setSelectedDate(day);
                          setSelectedTime(null);
                        }
                      }}
                      disabled={!hasAvail || isPast}
                      className={cn(
                        'p-3 rounded-lg text-center transition-all',
                        isSelected
                          ? 'bg-wondrous-blue text-white'
                          : hasAvail && !isPast
                          ? 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <div className="text-xs font-medium mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-lg font-semibold">{format(day, 'd')}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                {format(currentWeekStart, 'MMMM yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Select a Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-center text-gray-500 py-8">
                  Please select a date first
                </p>
              ) : timeSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No available slots on this date
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time.toISOString()}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        selectedTime && isSameDay(slot.time, selectedTime) && slot.time.getTime() === selectedTime.getTime()
                          ? 'bg-wondrous-blue text-white'
                          : slot.available
                          ? 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed line-through'
                      )}
                    >
                      {format(slot.time, 'HH:mm')}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selection Summary & Continue */}
        {selectedTime && (
          <Card className="mt-6 border-wondrous-blue/50 bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your selection
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {format(selectedTime, 'EEEE, MMMM d')} at{' '}
                    {format(selectedTime, 'h:mm a')}
                  </p>
                </div>
                <Button onClick={handleContinue} size="lg">
                  Continue
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
