/**
 * Client-side Booking Request Service
 *
 * Uses API routes for booking request CRUD operations (bypasses RLS via service role)
 */

/**
 * Client info embedded in booking request
 */
export interface RequestClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  credits: number | null;
}

/**
 * Service info embedded in booking request
 */
export interface RequestService {
  id: string;
  name: string;
  duration: number;
  color: string;
  credits_required: number;
}

/**
 * Booking request type definition
 */
export interface BookingRequest {
  id: string;
  studioId: string | null;
  trainerId: string | null;
  clientId: string;
  serviceId: string | null;
  preferredTimes: string[]; // Array of ISO timestamps
  notes: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  acceptedTime: string | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  client: RequestClient | null;
  service: RequestService | null;
  clientName: string | null;
}

/**
 * Input type for creating a booking request
 */
export interface CreateBookingRequestInput {
  trainerId?: string;
  clientId: string;
  serviceId?: string;
  preferredTimes: string[];
  notes?: string;
  expiresAt?: string;
}

/**
 * Database booking request shape (snake_case)
 */
interface DbBookingRequest {
  id: string;
  studio_id: string | null;
  trainer_id: string | null;
  client_id: string;
  service_id: string | null;
  preferred_times: string[];
  notes: string | null;
  status: string;
  expires_at: string;
  accepted_time: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  client: RequestClient | null;
  service: RequestService | null;
  clientName?: string | null;
}

/**
 * Convert database booking request to frontend format
 */
function dbToBookingRequest(db: DbBookingRequest): BookingRequest {
  return {
    id: db.id,
    studioId: db.studio_id,
    trainerId: db.trainer_id,
    clientId: db.client_id,
    serviceId: db.service_id,
    preferredTimes: db.preferred_times || [],
    notes: db.notes,
    status: db.status as BookingRequest['status'],
    expiresAt: db.expires_at,
    acceptedTime: db.accepted_time,
    bookingId: db.booking_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    client: db.client,
    service: db.service,
    clientName: db.clientName || (db.client
      ? `${db.client.first_name || ''} ${db.client.last_name || ''}`.trim()
      : null),
  };
}

/**
 * Get booking requests (client-side)
 * Uses API route to bypass RLS
 */
export async function getBookingRequestsClient(
  trainerId?: string,
  status?: 'pending' | 'accepted' | 'declined' | 'expired'
): Promise<BookingRequest[]> {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }

    const response = await fetch(`/api/booking-requests?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching booking requests:', error);
      return [];
    }

    const { requests } = await response.json();
    return (requests as DbBookingRequest[]).map(dbToBookingRequest);
  } catch (error) {
    console.error('Error fetching booking requests:', error);
    return [];
  }
}

/**
 * Get pending booking requests (client-side)
 */
export async function getPendingRequestsClient(trainerId?: string): Promise<BookingRequest[]> {
  return getBookingRequestsClient(trainerId, 'pending');
}

/**
 * Create a booking request (client-side)
 * Uses API route to bypass RLS
 */
export async function createBookingRequestClient(
  input: CreateBookingRequestInput
): Promise<BookingRequest | null> {
  try {
    const response = await fetch('/api/booking-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trainerId: input.trainerId,
        clientId: input.clientId,
        serviceId: input.serviceId,
        preferredTimes: input.preferredTimes,
        notes: input.notes,
        expiresAt: input.expiresAt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating booking request:', error);
      return null;
    }

    const { request } = await response.json();
    return request ? dbToBookingRequest(request as DbBookingRequest) : null;
  } catch (error) {
    console.error('Error creating booking request:', error);
    return null;
  }
}

/**
 * Accept a booking request (client-side)
 * Creates a booking for the specified time
 * Uses API route to bypass RLS
 */
export async function acceptRequestClient(
  requestId: string,
  acceptedTime: string
): Promise<{ request: BookingRequest | null; booking: unknown | null }> {
  try {
    const response = await fetch('/api/booking-requests', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: requestId,
        status: 'accepted',
        acceptedTime,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error accepting booking request:', error);
      return { request: null, booking: null };
    }

    const result = await response.json();
    return {
      request: result.request ? dbToBookingRequest(result.request as DbBookingRequest) : null,
      booking: result.booking || null,
    };
  } catch (error) {
    console.error('Error accepting booking request:', error);
    return { request: null, booking: null };
  }
}

/**
 * Decline a booking request (client-side)
 * Uses API route to bypass RLS
 */
export async function declineRequestClient(requestId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/booking-requests', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: requestId,
        status: 'declined',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error declining booking request:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error declining booking request:', error);
    return false;
  }
}

/**
 * Delete a booking request (client-side)
 * Uses API route to bypass RLS
 */
export async function deleteBookingRequestClient(requestId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/booking-requests?id=${requestId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting booking request:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting booking request:', error);
    return false;
  }
}

/**
 * Check if any requests have expired and mark them
 * (This could be called periodically or on component mount)
 */
export function filterExpiredRequests(requests: BookingRequest[]): {
  pending: BookingRequest[];
  expired: BookingRequest[];
} {
  const now = new Date();
  const pending: BookingRequest[] = [];
  const expired: BookingRequest[] = [];

  for (const request of requests) {
    if (request.status === 'pending') {
      const expiresAt = new Date(request.expiresAt);
      if (expiresAt < now) {
        expired.push({ ...request, status: 'expired' });
      } else {
        pending.push(request);
      }
    }
  }

  return { pending, expired };
}
