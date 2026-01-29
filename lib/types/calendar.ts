// Calendar-specific types for Trainer Aide

import { SignOffMode } from './index';

export interface ServiceType {
  id: string;
  name: string;
  duration: number; // in minutes (30, 60, 45, 75, 90)
  color: string; // Hex color for visual identification
  creditsRequired: number;
}

export type SessionStatus =
  | 'upcoming'
  | 'confirmed'
  | 'checked-in'
  | 'soft-hold'
  | 'no-show'
  | 'late'
  | 'cancelled'
  | 'completed';

export interface CalendarSession {
  id: string;
  datetime: Date;
  clientId: string | null; // Can be null for soft-holds
  clientName: string | null; // Can be null for soft-holds
  clientAvatar?: string;
  clientColor?: string;
  clientCredits?: number;
  status: SessionStatus;
  serviceTypeId: string | null; // Can be null for soft-holds
  workoutId?: string | null; // Legacy field for simple workout reference
  templateId?: string | null; // Full workout template with blocks/exercises
  signOffMode?: SignOffMode; // How to complete session: per_exercise, per_block, full_session
  notes?: string;
  holdExpiry?: Date | null; // For soft-hold sessions
}

export interface TimeSlot {
  datetime: Date;
  hour: number;
  minute: number; // 0, 15, 30, 45
  available: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: string[];
}

export interface BookingFormData {
  clientId: string;
  serviceTypeId: string;
  datetime: Date;
  isSoftHold: boolean;
  workoutId?: string;
  templateId?: string;
  signOffMode?: SignOffMode;
  notes?: string;
}
