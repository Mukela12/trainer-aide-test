// Service Type - What the studio offers (PT sessions, group training, etc.)
// This is SEPARATE from Workout Templates (which are exercise programs)

export type ServiceType = '1-2-1' | 'duet' | 'group';

export type ServiceDuration = 30 | 45 | 60 | 75 | 90; // Common durations in minutes

export interface Service {
  id: string;
  name: string; // e.g., "30min PT Session", "45min PT Session"
  description: string;
  duration: number; // How long the session lasts (in minutes)
  type: ServiceType; // 1-2-1, duet, or group
  maxCapacity: number; // 1 for 1-2-1, 2 for duet, up to 5 for group
  creditsRequired: number; // How many credits this service costs
  color: string; // For visual identification
  isActive: boolean;
  requiresApproval?: boolean; // When true, clients must submit a booking request (hybrid model)
  createdBy: string; // Studio owner ID
  assignedStudios: string[]; // Which studios offer this service
  createdAt: string;
  updatedAt: string;
}
