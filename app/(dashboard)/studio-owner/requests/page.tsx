"use client";

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  User,
  Check,
  X,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingRequest {
  id: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  service: {
    id: string;
    name: string;
    duration: number;
  } | null;
  preferred_times: string[];
  notes: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  clientName?: string;
}

export default function StudioOwnerBookingRequestsPage() {
  const { currentUser } = useUserStore();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/booking-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching booking requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async () => {
    if (!selectedRequest || !selectedTime) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/booking-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: 'accepted',
          acceptedTime: selectedTime,
        }),
      });

      if (res.ok) {
        await fetchRequests();
        setSelectedRequest(null);
        setSelectedTime(null);
      }
    } catch (err) {
      console.error('Error accepting request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/booking-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: 'declined',
        }),
      });

      if (res.ok) {
        await fetchRequests();
        setSelectedRequest(null);
        setShowDeclineDialog(false);
      }
    } catch (err) {
      console.error('Error declining request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 dark:text-gray-100 mb-2">Booking Requests</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Review and respond to client booking requests across all trainers
        </p>
      </div>

      {/* Pending Requests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="default" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </h2>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card
                key={request.id}
                className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-gray-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.clientName ||
                            `${request.client?.first_name || ''} ${request.client?.last_name || ''}`.trim() ||
                            'Unknown Client'}
                        </h3>
                        {request.service && (
                          <Badge variant="outline" className="text-xs">
                            {request.service.name}
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Preferred times:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {request.preferred_times.map((time, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                            >
                              <Calendar size={12} />
                              {format(new Date(time), 'EEE, MMM d')}
                              <Clock size={12} className="ml-1" />
                              {format(new Date(time), 'h:mm a')}
                            </div>
                          ))}
                        </div>
                      </div>

                      {request.notes && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MessageSquare size={14} className="mt-0.5 flex-shrink-0" />
                          <p className="italic">&quot;{request.notes}&quot;</p>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <AlertCircle size={12} />
                        Expires {format(new Date(request.expires_at), 'MMM d, h:mm a')}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDeclineDialog(true);
                        }}
                      >
                        <X size={16} className="mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setSelectedTime(request.preferred_times[0] || null);
                        }}
                      >
                        <Check size={16} className="mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium mb-2">No pending requests</p>
              <p className="text-sm">New booking requests from clients will appear here</p>
            </div>
          </Card>
        )}
      </div>

      {/* Past Requests */}
      {processedRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-2 dark:text-gray-100">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {processedRequests.slice(0, 10).map((request) => (
              <Card key={request.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {request.clientName ||
                          `${request.client?.first_name || ''} ${request.client?.last_name || ''}`.trim()}
                      </span>
                      {request.service && (
                        <span className="text-sm text-gray-500">- {request.service.name}</span>
                      )}
                    </div>
                    <Badge
                      variant={request.status === 'accepted' ? 'success' : 'secondary'}
                    >
                      {request.status === 'accepted' ? 'Accepted' : 'Declined'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog
        open={!!selectedRequest && !showDeclineDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setSelectedTime(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Booking Request</DialogTitle>
            <DialogDescription>
              Choose a time slot to confirm the booking with{' '}
              {selectedRequest?.clientName ||
                `${selectedRequest?.client?.first_name} ${selectedRequest?.client?.last_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select a time:
            </p>
            <div className="space-y-2">
              {selectedRequest?.preferred_times.map((time, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTime(time)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedTime === time
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{format(new Date(time), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <span>{format(new Date(time), 'h:mm a')}</span>
                  </div>
                  {selectedTime === time && (
                    <Check size={20} className="text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setSelectedTime(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!selectedTime || processing}
            >
              {processing ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this request from{' '}
              {selectedRequest?.clientName ||
                `${selectedRequest?.client?.first_name} ${selectedRequest?.client?.last_name}`}
              ? They will be notified via email.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeclineDialog(false);
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={processing}
            >
              {processing ? 'Declining...' : 'Decline Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
