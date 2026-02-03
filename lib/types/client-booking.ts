// Client Booking Types - For clients booking sessions with trainers

export interface ClientService {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  creditsRequired: number;
  type: string;
}

export interface StudioTrainer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface TrainerTimeSlot {
  trainerId: string;
  trainerName: string;
  time: string; // ISO string
  available: boolean;
}

export interface AvailabilitySlot {
  trainerId: string;
  trainerName: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface ExistingBooking {
  id: string;
  trainerId: string;
  scheduledAt: string;
  duration: number;
  status: string;
}

export interface CreateClientBookingInput {
  serviceId: string;
  trainerId: string;
  scheduledAt: string;
}

export interface CreateClientBookingResponse {
  booking: {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    serviceName: string;
    trainerName: string;
  };
  remainingCredits: number;
}

export type BookingStep = 'service' | 'trainer' | 'datetime' | 'confirm';
