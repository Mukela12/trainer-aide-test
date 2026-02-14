// Booking request types for instructor-led model

export interface BookingRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientColor: string;
  clientCredits: number;
  serviceTypeId: string;
  locationId?: string;
  preferredTimes: Date[]; // Array of time options client suggests
  notes?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  expiresAt: Date; // Auto-expire after 7 days
}

export interface BookingRequestFormData {
  clientId: string;
  serviceTypeId: string;
  preferredTimes: Date[];
  notes?: string;
}

export interface BookingRequestClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface BookingRequestService {
  id: string;
  name: string;
  duration: number;
}

export interface BookingRequestResponse {
  id: string;
  client: BookingRequestClient | null;
  service: BookingRequestService | null;
  preferred_times: string[];
  notes: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  clientName?: string;
}
