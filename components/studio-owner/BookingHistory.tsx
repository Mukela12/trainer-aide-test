'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, CreditCard, AlertCircle } from 'lucide-react';
import {
  BookingHistoryItem,
  BookingHistoryResponse,
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS
} from '@/lib/types/booking-history';

interface BookingHistoryProps {
  clientId: string;
  clientName: string;
}

export default function BookingHistory({ clientId, clientName }: BookingHistoryProps) {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchBookingHistory();
  }, [clientId]);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        client_id: clientId,
      });

      const response = await fetch(`/api/clients/booking-history?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch booking history');
      }

      const result: BookingHistoryResponse = await response.json();
      setBookings(result.bookings || []);
    } catch (err: unknown) {
      console.error('Error fetching booking history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const displayedBookings = showAll ? bookings : bookings.slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-wondrous-magenta" />
          Booking History
        </h4>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-wondrous-magenta" />
          Booking History
        </h4>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">Error Loading History</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">{error}</p>
              <button
                onClick={fetchBookingHistory}
                className="text-xs text-red-700 dark:text-red-400 underline mt-2 hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-wondrous-magenta" />
          Booking History
        </h4>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">No Booking History</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {clientName} hasn&apos;t booked any sessions yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
        <Calendar className="w-4 h-4 text-wondrous-magenta" />
        Booking History
        <span className="text-xs text-gray-500 font-normal">({bookings.length} total)</span>
      </h4>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedBookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h5 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                {booking.session_name || 'Unnamed Session'}
              </h5>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap flex-shrink-0 ${
                  BOOKING_STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {BOOKING_STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-wondrous-magenta" />
              <span className="font-medium">{formatDate(booking.scheduled_at)}</span>
              <Clock className="w-3.5 h-3.5 text-wondrous-blue ml-1" />
              <span>{formatTime(booking.scheduled_at)}</span>
              {booking.duration && (
                <span className="text-gray-500">
                  {formatDuration(booking.duration)}
                </span>
              )}
            </div>

            {booking.credits_used > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                <CreditCard className="w-3.5 h-3.5 text-wondrous-blue" />
                <span className="font-medium">
                  {booking.credits_used} credit{booking.credits_used !== 1 ? 's' : ''} used
                </span>
              </div>
            )}

            {booking.notes && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  <span className="font-semibold">Note:</span> {booking.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {bookings.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-wondrous-magenta/10 hover:bg-wondrous-magenta/20 text-wondrous-magenta font-semibold rounded-lg transition-colors text-sm"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View All ({bookings.length - 3} more)
            </>
          )}
        </button>
      )}
    </div>
  );
}
