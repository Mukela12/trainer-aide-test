'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import type { StudioTrainer, AvailabilitySlot, ExistingBooking } from '@/lib/types/client-booking';

interface TimeSlotPickerProps {
  selectedTrainer: StudioTrainer | null;
  serviceDuration: number;
  onSelectSlot: (date: Date, time: string, trainerId: string) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  trainerId: string;
  trainerName: string;
  available: boolean;
}

export function TimeSlotPicker({
  selectedTrainer,
  serviceDuration,
  onSelectSlot,
  selectedDate,
  selectedTime,
}: TimeSlotPickerProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfDay(new Date()));
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDate, setActiveDate] = useState<Date | null>(selectedDate);

  // Generate dates for the week view
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch availability when trainer or week changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const trainerId = selectedTrainer?.id;
        const params = new URLSearchParams();
        if (trainerId && trainerId !== 'any') {
          params.set('trainerId', trainerId);
        }

        const res = await fetch(`/api/client/studio/availability?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data.availability || []);
          setExistingBookings(data.existingBookings || []);
        }
      } catch (err) {
        console.error('Error fetching availability:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedTrainer, weekStart]);

  // Generate time slots for a given date
  const getTimeSlotsForDate = (date: Date): TimeSlot[] => {
    const dayOfWeek = date.getDay();
    const slots: TimeSlot[] = [];
    const now = new Date();

    // Filter availability for this day
    const dayAvailability = availability.filter((a) => a.dayOfWeek === dayOfWeek);

    if (dayAvailability.length === 0) {
      return [];
    }

    // Generate slots for each availability block
    for (const avail of dayAvailability) {
      let currentHour = avail.startHour;
      let currentMinute = avail.startMinute;

      while (
        currentHour < avail.endHour ||
        (currentHour === avail.endHour && currentMinute < avail.endMinute)
      ) {
        // Check if this slot would extend past the availability block
        const slotEndMinutes = currentHour * 60 + currentMinute + serviceDuration;
        const availEndMinutes = avail.endHour * 60 + avail.endMinute;

        if (slotEndMinutes > availEndMinutes) {
          break;
        }

        const slotTime = new Date(date);
        slotTime.setHours(currentHour, currentMinute, 0, 0);

        // Skip past times for today
        if (isToday(date) && isBefore(slotTime, now)) {
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
          continue;
        }

        // Check for booking conflicts
        const slotEnd = new Date(slotTime.getTime() + serviceDuration * 60 * 1000);
        const hasConflict = existingBookings.some((booking) => {
          if (selectedTrainer && selectedTrainer.id !== 'any' && booking.trainerId !== selectedTrainer.id) {
            return false;
          }
          if (avail.trainerId !== booking.trainerId) {
            return false;
          }
          const bookingStart = new Date(booking.scheduledAt);
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);
          return slotTime < bookingEnd && slotEnd > bookingStart;
        });

        slots.push({
          time: format(slotTime, 'HH:mm'),
          hour: currentHour,
          minute: currentMinute,
          trainerId: avail.trainerId,
          trainerName: avail.trainerName,
          available: !hasConflict,
        });

        // Increment by 30 minutes
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentHour += 1;
          currentMinute = 0;
        }
      }
    }

    // Sort by time
    slots.sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    // Remove duplicates (same time, keep first available)
    const uniqueSlots = new Map<string, TimeSlot>();
    for (const slot of slots) {
      const key = `${slot.time}`;
      if (!uniqueSlots.has(key) || (slot.available && !uniqueSlots.get(key)?.available)) {
        uniqueSlots.set(key, slot);
      }
    }

    return Array.from(uniqueSlots.values());
  };

  const handlePrevWeek = () => {
    const newStart = addDays(weekStart, -7);
    if (!isBefore(newStart, startOfDay(new Date()))) {
      setWeekStart(newStart);
    }
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(startOfDay(date), startOfDay(new Date()))) {
      return;
    }
    setActiveDate(date);
  };

  const handleSlotClick = (slot: TimeSlot, date: Date) => {
    if (!slot.available) return;
    const dateTime = new Date(date);
    dateTime.setHours(slot.hour, slot.minute, 0, 0);
    onSelectSlot(dateTime, slot.time, slot.trainerId);
  };

  const activeSlots = activeDate ? getTimeSlotsForDate(activeDate) : [];
  const availableSlots = activeSlots.filter((s) => s.available);

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevWeek}
          disabled={isBefore(addDays(weekStart, -1), startOfDay(new Date()))}
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextWeek}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Date Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
          const isActive = activeDate && isSameDay(date, activeDate);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const daySlots = getTimeSlotsForDate(date);
          const hasAvailability = daySlots.some((s) => s.available);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={isPast || !hasAvailability}
              className={cn(
                'p-3 rounded-lg text-center transition-all',
                isPast
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : !hasAvailability
                  ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed'
                  : isActive || isSelected
                  ? 'bg-wondrous-blue text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-wondrous-blue cursor-pointer'
              )}
            >
              <div className="text-xs font-medium mb-1">
                {format(date, 'EEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(date, 'd')}
              </div>
              {!isPast && hasAvailability && (
                <div className="text-xs mt-1 text-green-600 dark:text-green-400">
                  {daySlots.filter((s) => s.available).length} slots
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {isLoading ? (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : activeDate ? (
        availableSlots.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Available times for {format(activeDate, 'EEEE, MMMM d')}
            </h4>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {availableSlots.map((slot, index) => {
                const isSelected =
                  selectedDate &&
                  selectedTime === slot.time &&
                  isSameDay(selectedDate, activeDate);

                return (
                  <button
                    key={`${slot.time}-${index}`}
                    onClick={() => handleSlotClick(slot, activeDate)}
                    className={cn(
                      'p-3 rounded-lg text-center transition-all border',
                      isSelected
                        ? 'bg-wondrous-blue text-white border-wondrous-blue'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-wondrous-blue'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} />
                      <span className="text-sm font-medium">
                        {format(
                          new Date().setHours(slot.hour, slot.minute),
                          'h:mm a'
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Clock className="mx-auto mb-2" size={32} />
              <p>No available time slots for this date.</p>
              <p className="text-sm mt-1">Please select another date.</p>
            </div>
          </Card>
        )
      ) : (
        <Card className="p-6">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Select a date above to see available times.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
