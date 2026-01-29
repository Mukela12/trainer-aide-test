'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useUserStore } from '@/lib/stores/user-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface TimeSlot {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeekAvailability = {
  [key: number]: DayAvailability; // 0 = Sunday, 1 = Monday, etc.
};

const DAYS = [
  { num: 1, name: 'Monday', short: 'Mon' },
  { num: 2, name: 'Tuesday', short: 'Tue' },
  { num: 3, name: 'Wednesday', short: 'Wed' },
  { num: 4, name: 'Thursday', short: 'Thu' },
  { num: 5, name: 'Friday', short: 'Fri' },
  { num: 6, name: 'Saturday', short: 'Sat' },
  { num: 0, name: 'Sunday', short: 'Sun' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => i).flatMap((hour) =>
  [0, 30].map((minute) => ({
    value: hour * 60 + minute,
    label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    hour,
    minute,
  }))
);

const DEFAULT_AVAILABILITY: WeekAvailability = {
  0: { enabled: false, slots: [] },
  1: {
    enabled: true,
    slots: [{ id: '1', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
  },
  2: {
    enabled: true,
    slots: [{ id: '2', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
  },
  3: {
    enabled: true,
    slots: [{ id: '3', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
  },
  4: {
    enabled: true,
    slots: [{ id: '4', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
  },
  5: {
    enabled: true,
    slots: [{ id: '5', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
  },
  6: { enabled: false, slots: [] },
};

export default function OnboardingAvailabilityPage() {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [availability, setAvailability] = useState<WeekAvailability>(DEFAULT_AVAILABILITY);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing availability
  useEffect(() => {
    const loadAvailability = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('ta_availability')
        .select('*')
        .eq('trainer_id', currentUser.id)
        .eq('block_type', 'available')
        .eq('recurrence', 'weekly');

      if (data && data.length > 0) {
        const loaded: WeekAvailability = {
          0: { enabled: false, slots: [] },
          1: { enabled: false, slots: [] },
          2: { enabled: false, slots: [] },
          3: { enabled: false, slots: [] },
          4: { enabled: false, slots: [] },
          5: { enabled: false, slots: [] },
          6: { enabled: false, slots: [] },
        };

        data.forEach((slot: {
          id: string;
          day_of_week: number | null;
          start_hour: number;
          start_minute: number | null;
          end_hour: number;
          end_minute: number | null;
        }) => {
          if (slot.day_of_week !== null) {
            loaded[slot.day_of_week].enabled = true;
            loaded[slot.day_of_week].slots.push({
              id: slot.id,
              startHour: slot.start_hour,
              startMinute: slot.start_minute || 0,
              endHour: slot.end_hour,
              endMinute: slot.end_minute || 0,
            });
          }
        });

        setAvailability(loaded);
      }
    };
    loadAvailability();
  }, [currentUser.id]);

  const toggleDay = (dayNum: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        enabled: !prev[dayNum].enabled,
        slots: !prev[dayNum].enabled
          ? [{ id: `new-${Date.now()}`, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }]
          : [],
      },
    }));
  };

  const updateSlot = (
    dayNum: number,
    slotId: string,
    field: 'start' | 'end',
    value: number
  ) => {
    const hour = Math.floor(value / 60);
    const minute = value % 60;

    setAvailability((prev) => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        slots: prev[dayNum].slots.map((slot) =>
          slot.id === slotId
            ? field === 'start'
              ? { ...slot, startHour: hour, startMinute: minute }
              : { ...slot, endHour: hour, endMinute: minute }
            : slot
        ),
      },
    }));
  };

  const addSlot = (dayNum: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        slots: [
          ...prev[dayNum].slots,
          { id: `new-${Date.now()}`, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
    }));
  };

  const removeSlot = (dayNum: number, slotId: string) => {
    setAvailability((prev) => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        slots: prev[dayNum].slots.filter((s) => s.id !== slotId),
      },
    }));
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // Delete existing weekly availability
      await supabase
        .from('ta_availability')
        .delete()
        .eq('trainer_id', currentUser.id)
        .eq('recurrence', 'weekly');

      // Insert new availability slots
      const slotsToInsert = Object.entries(availability).flatMap(
        ([dayNum, day]) =>
          day.enabled
            ? day.slots.map((slot) => ({
                trainer_id: currentUser.id,
                block_type: 'available',
                recurrence: 'weekly',
                day_of_week: parseInt(dayNum),
                start_hour: slot.startHour,
                start_minute: slot.startMinute,
                end_hour: slot.endHour,
                end_minute: slot.endMinute,
              }))
            : []
      );

      if (slotsToInsert.length > 0) {
        const { error } = await supabase.from('ta_availability').insert(slotsToInsert);
        if (error) throw error;
      }

      // Update onboarding step
      await supabase
        .from('profiles')
        .update({ onboarding_step: 5 })
        .eq('id', currentUser.id);

      router.push('/onboarding/complete');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Set your availability
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Define when clients can book sessions with you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day) => {
            const dayAvail = availability[day.num];

            return (
              <div
                key={day.num}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  dayAvail.enabled
                    ? 'border-wondrous-blue/30 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Day Toggle */}
                  <button
                    onClick={() => toggleDay(day.num)}
                    className={cn(
                      'w-20 py-2 rounded-lg font-medium text-sm transition-colors',
                      dayAvail.enabled
                        ? 'bg-wondrous-blue text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {day.short}
                  </button>

                  {/* Time Slots */}
                  <div className="flex-1">
                    {dayAvail.enabled ? (
                      <div className="space-y-2">
                        {dayAvail.slots.map((slot, idx) => (
                          <div key={slot.id} className="flex items-center gap-2">
                            <select
                              value={slot.startHour * 60 + slot.startMinute}
                              onChange={(e) =>
                                updateSlot(day.num, slot.id, 'start', parseInt(e.target.value))
                              }
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-gray-500">to</span>
                            <select
                              value={slot.endHour * 60 + slot.endMinute}
                              onChange={(e) =>
                                updateSlot(day.num, slot.id, 'end', parseInt(e.target.value))
                              }
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            {dayAvail.slots.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSlot(day.num, slot.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                            {idx === dayAvail.slots.length - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addSlot(day.num)}
                                className="text-wondrous-blue"
                              >
                                <Plus size={14} />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-1.5">Unavailable</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Tip:</strong> You can add multiple time slots per day (e.g., morning
          and evening availability). You can also block specific dates later from
          your calendar.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push('/onboarding/services')}>
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
