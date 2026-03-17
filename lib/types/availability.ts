// Trainer availability types

export type BlockType = 'available' | 'blocked';
export type RecurrenceType = 'once' | 'weekly';
export type BlockReasonType = 'personal' | 'admin' | 'break' | 'other';

export interface AvailabilityBlock {
  id: string;
  blockType: BlockType; // 'available' = can book, 'blocked' = cannot book
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  recurrence: RecurrenceType; // 'once' = one-time, 'weekly' = repeats weekly
  specificDate?: string; // For one-time blocks (YYYY-MM-DD format)
  endDate?: string; // For multi-day blocks (YYYY-MM-DD format)
  reason?: BlockReasonType; // Why the time is blocked
  notes?: string; // Optional additional notes
  isRecurring?: boolean; // DEPRECATED: Use recurrence instead (kept for backwards compatibility)
}

export interface OpeningHoursSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface OpeningHoursDay {
  enabled: boolean;
  slots: OpeningHoursSlot[];
}

export type OpeningHours = Record<string, OpeningHoursDay>;

export interface TrainerAvailability {
  trainerId: string;
  blocks: AvailabilityBlock[];
  openingHours: OpeningHours;
}
