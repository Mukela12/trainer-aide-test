'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

export interface TimeSlot {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export type WeekAvailability = {
  [key: number]: DayAvailability;
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
  0: { enabled: true, slots: [{ id: '0', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  1: { enabled: true, slots: [{ id: '1', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  2: { enabled: true, slots: [{ id: '2', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  3: { enabled: true, slots: [{ id: '3', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  4: { enabled: true, slots: [{ id: '4', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  5: { enabled: true, slots: [{ id: '5', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
  6: { enabled: true, slots: [{ id: '6', startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }] },
};

interface Props {
  userId: string;
  availability: WeekAvailability;
  onAvailabilityChange: (availability: WeekAvailability) => void;
  /** If true, loads existing availability from ta_availability on mount */
  loadExisting?: boolean;
}

export function AvailabilitySetupForm({
  userId,
  availability,
  onAvailabilityChange,
  loadExisting = true,
}: Props) {
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load existing availability
  useEffect(() => {
    if (!loadExisting || hasLoaded) return;

    const loadAvailability = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('ta_availability')
        .select('*')
        .eq('trainer_id', userId)
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

        onAvailabilityChange(loaded);
      }
      setHasLoaded(true);
    };
    loadAvailability();
  }, [userId, loadExisting, hasLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (dayNum: number) => {
    onAvailabilityChange({
      ...availability,
      [dayNum]: {
        ...availability[dayNum],
        enabled: !availability[dayNum].enabled,
        slots: !availability[dayNum].enabled
          ? [{ id: `new-${Date.now()}`, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }]
          : [],
      },
    });
  };

  const updateSlot = (
    dayNum: number,
    slotId: string,
    field: 'start' | 'end',
    value: number
  ) => {
    const hour = Math.floor(value / 60);
    const minute = value % 60;

    onAvailabilityChange({
      ...availability,
      [dayNum]: {
        ...availability[dayNum],
        slots: availability[dayNum].slots.map((slot) =>
          slot.id === slotId
            ? field === 'start'
              ? { ...slot, startHour: hour, startMinute: minute }
              : { ...slot, endHour: hour, endMinute: minute }
            : slot
        ),
      },
    });
  };

  const addSlot = (dayNum: number) => {
    onAvailabilityChange({
      ...availability,
      [dayNum]: {
        ...availability[dayNum],
        slots: [
          ...availability[dayNum].slots,
          { id: `new-${Date.now()}`, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
    });
  };

  const removeSlot = (dayNum: number, slotId: string) => {
    onAvailabilityChange({
      ...availability,
      [dayNum]: {
        ...availability[dayNum],
        slots: availability[dayNum].slots.filter((s) => s.id !== slotId),
      },
    });
  };

  return (
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
  );
}

export { DEFAULT_AVAILABILITY };
