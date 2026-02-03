export interface BookingHistoryItem {
  id: string;
  session_name: string;
  scheduled_at: string;
  status: string;
  duration: number | null;
  credits_used: number;
  notes: string | null;
  session_description?: string;
  session_location?: string;
  instructor_name?: string;
  price_paid?: number;
  session_duration?: number;
}

export interface BookingHistoryResponse {
  bookings: BookingHistoryItem[];
}

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};
