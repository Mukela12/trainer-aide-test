'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Booking {
  id: string;
  scheduledAt: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'soft-hold';
  serviceName: string;
  trainerName: string;
}

export default function ClientBookingsPage() {
  const { currentUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/client/bookings');
      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Unable to load your bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/client/bookings?id=${selectedBooking.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Refresh bookings
      await fetchBookings();
      setCancelDialogOpen(false);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 size={12} className="mr-1" />
            Confirmed
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle2 size={12} className="mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle size={12} className="mr-1" />
            Cancelled
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  // Filter and sort bookings
  const upcomingBookings = bookings
    .filter((b) => !isPast(new Date(b.scheduledAt)) && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const pastBookings = bookings
    .filter((b) => isPast(new Date(b.scheduledAt)) || b.status === 'cancelled')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 10); // Show last 10 only

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchBookings}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 dark:text-gray-100 mb-2">My Bookings</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          View and manage your upcoming sessions
        </p>
      </div>

      {/* Upcoming Bookings */}
      <div className="mb-8">
        <h2 className="text-heading-2 dark:text-gray-100 mb-4">
          Upcoming Sessions ({upcomingBookings.length})
        </h2>

        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => {
              const scheduledDate = new Date(booking.scheduledAt);
              const canCancel = !isPast(new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000));

              return (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {booking.serviceName}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar size={16} />
                            <span className="font-medium">
                              {getDateLabel(scheduledDate)}
                            </span>
                            <span>-</span>
                            <span>
                              {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Clock size={16} />
                            <span>
                              {format(scheduledDate, 'h:mm a')} ({booking.duration} min)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin size={16} />
                            <span>With {booking.trainerName}</span>
                          </div>
                        </div>
                      </div>

                      {canCancel && booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancelClick(booking)}
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Upcoming Bookings
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You don&apos;t have any upcoming sessions scheduled.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-heading-2 dark:text-gray-100 mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {pastBookings.map((booking) => {
              const scheduledDate = new Date(booking.scheduledAt);

              return (
                <Card key={booking.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {booking.serviceName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(scheduledDate, 'MMM d, yyyy')} at{' '}
                            {format(scheduledDate, 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this session?
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="py-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedBooking.serviceName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {format(new Date(selectedBooking.scheduledAt), 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(new Date(selectedBooking.scheduledAt), 'h:mm a')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  With {selectedBooking.trainerName}
                </p>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Note: Cancellation policies may apply. Credits may or may not be refunded
                depending on your trainer&apos;s policy.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
