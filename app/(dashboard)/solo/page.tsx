"use client";

import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useBookings } from '@/lib/hooks/use-bookings';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { useBookingRequests } from '@/lib/hooks/use-booking-requests';
import { useUpcomingSessions } from '@/lib/hooks/use-upcoming-sessions';
import { useClients } from '@/lib/hooks/use-clients';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar, Plus, Users, DollarSign, Clock, TrendingUp,
  Zap, UserPlus, ChevronRight, AlertCircle, Megaphone, Lock,
  Copy, ExternalLink, CheckCircle2,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/hooks/use-toast';
import type { SoloDashboardStats, UpcomingSession, RecentClient } from '@/lib/types/dashboard';

export default function SoloPractitionerDashboard() {
  const { toast } = useToast();
  const { currentUser, businessSlug, businessName } = useUserStore();
  const { sessions: calendarSessions } = useBookings(currentUser.id);
  const [copied, setCopied] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientForm, setAddClientForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [addingClient, setAddingClient] = useState(false);
  const [chasingPayment, setChasingPayment] = useState(false);
  const queryClient = useQueryClient();

  // React Query hooks
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(currentUser?.id);
  const { data: pendingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const { data: upcomingSessionsData = [], isLoading: sessionsLoading } = useUpcomingSessions(currentUser?.id, 10);
  const { data: clients = [], isLoading: clientsLoading } = useClients(currentUser?.id);

  const isLoading = analyticsLoading || sessionsLoading || clientsLoading;

  const stats: SoloDashboardStats = {
    earningsThisWeek: analyticsData?.earningsThisWeek || 0,
    sessionsThisWeek: analyticsData?.sessionsThisWeek || 0,
    activeClients: analyticsData?.activeClients || 0,
    utilizationPercent: analyticsData?.utilizationPercent || 0,
    softHoldsCount: analyticsData?.softHoldsCount || 0,
    outstandingCredits: analyticsData?.outstandingCredits || 0,
    lowCreditClients: analyticsData?.lowCreditClients || 0,
    pendingRequests: pendingRequests.length,
  };

  const upcomingSessions: UpcomingSession[] = upcomingSessionsData.map(s => ({
    id: s.id,
    clientName: s.clientName || 'Client',
    scheduledAt: new Date(s.scheduledAt),
    serviceName: s.serviceName || 'Session',
    status: s.status,
  }));

  // Filter to today's sessions
  const todaySessions = upcomingSessions.filter(s => isToday(s.scheduledAt));

  const recentClients: RecentClient[] = [...clients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map(c => ({
      id: c.id,
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      email: c.email,
      credits: c.credits || 0,
      createdAt: new Date(c.created_at),
    }));

  // Soft holds from calendar data — filter out expired ones
  const softHoldsFromStore = calendarSessions.filter(s => {
    if (s.status !== 'soft-hold') return false;
    // If there's a holdExpiry, only show if not yet expired
    if (s.holdExpiry && s.holdExpiry <= new Date()) return false;
    return true;
  });
  const displaySoftHolds = softHoldsFromStore.length || stats.softHoldsCount;
  const firstSoftHold = softHoldsFromStore[0];

  // Low credit clients (credits <= 1)
  const lowCreditClientsList = clients.filter(c => (c.credits || 0) <= 1 && (c.credits || 0) >= 0);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Motivational messages that rotate daily
  const motivationalMessages = [
    "You're going to have a great day — keep pushing!",
    "Keep up the great work, your clients are lucky to have you!",
    "You're ready to smash it today!",
    "The early bird catches the worm — let's go!",
    "Every session you run changes someone's life.",
    "Stay focused, stay strong — you've got this!",
    "Today is another chance to make a difference.",
    "Your energy is contagious — bring it today!",
    "Champions are made one session at a time.",
    "Believe in the work you do — your clients already do!",
  ];
  const dailyMessage = motivationalMessages[new Date().getDate() % motivationalMessages.length];

  const bookingUrl = businessSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${businessSlug}` : '';

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChasePayment = async () => {
    if (!firstSoftHold || chasingPayment) return;
    setChasingPayment(true);
    try {
      const res = await fetch('/api/notifications/chase-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: firstSoftHold.id, clientName: firstSoftHold.clientName }),
      });
      if (res.ok) {
        toast({ title: 'Chase payment email sent!' });
      } else {
        toast({ title: 'Failed to send chase email', description: 'Please try again.' });
      }
    } catch {
      toast({ title: 'Failed to send chase email', description: 'Please try again.' });
    } finally {
      setChasingPayment(false);
    }
  };

  const handleAddClient = async () => {
    if (!addClientForm.email || !addClientForm.firstName || addingClient) return;
    setAddingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: addClientForm.firstName,
          last_name: addClientForm.lastName,
          email: addClientForm.email,
          phone: addClientForm.phone,
        }),
      });
      if (res.ok) {
        toast({ title: 'Client added successfully!' });
        setShowAddClient(false);
        setAddClientForm({ firstName: '', lastName: '', email: '', phone: '' });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || 'Failed to add client' });
      }
    } catch {
      toast({ title: 'Failed to add client' });
    } finally {
      setAddingClient(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Top Bar: Date + Greeting */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {greeting}{currentUser.firstName ? `, ${currentUser.firstName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
          {dailyMessage}
        </p>
      </div>

      {/* Soft Hold Action Banner */}
      {displaySoftHolds > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {displaySoftHolds} Soft Hold{displaySoftHolds !== 1 ? 's' : ''} — Action Required
                </p>
                {firstSoftHold && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {firstSoftHold.clientName} · {format(firstSoftHold.datetime, "h:mm a EEEE do MMMM")}
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleChasePayment}
              disabled={chasingPayment}
              className="border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/60 hover:text-amber-900 dark:hover:text-amber-100"
            >
              {chasingPayment ? 'Sending...' : 'Chase Payment'} <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : todaySessions.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sessions Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <DollarSign className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : `£${(stats.earningsThisWeek / 100).toFixed(0)}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Revenue This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Users className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : stats.activeClients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/solo/requests">
          <Card className={`dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow ${stats.pendingRequests > 0 ? 'border-red-400 dark:border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stats.pendingRequests > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  <Clock className={stats.pendingRequests > 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'} size={20} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stats.pendingRequests > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {isLoading ? '...' : stats.pendingRequests}
                  </p>
                  <p className={`text-xs ${stats.pendingRequests > 0 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Two-column layout: Today's Sessions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Today&apos;s Sessions</h2>
            <Link href="/solo/calendar">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View Calendar <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
              </div>
            </Card>
          ) : todaySessions.length > 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {todaySessions.map((session) => (
                <div key={session.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      {session.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {format(session.scheduledAt, 'h:mm a')} - {session.clientName}
                      </p>
                      {session.status === 'soft-hold' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full shrink-0">
                          Hold
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.serviceName}
                    </p>
                  </div>
                  <Link href="/solo/calendar">
                    <Button size="sm" variant="ghost" className="text-xs text-gray-500">
                      Details
                    </Button>
                  </Link>
                </div>
              ))}
            </Card>
          ) : upcomingSessions.length > 0 ? (
            /* No sessions today but have upcoming — show Next Up */
            <div>
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">No sessions today — here&apos;s what&apos;s next</p>
              </div>
              <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {upcomingSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">{format(session.scheduledAt, 'EEE')}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{format(session.scheduledAt, 'HH:mm')}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {session.clientName}
                          </h3>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {session.serviceName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(session.scheduledAt, 'MMM d')}
                          </span>
                          {session.status === 'soft-hold' ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">Pending</span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Confirmed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href="/solo/calendar">
                      <Button size="sm" variant="ghost" className="text-xs">View</Button>
                    </Link>
                  </div>
                ))}
              </Card>
            </div>
          ) : (
            /* No upcoming sessions at all — Growth Coach */
            <div>
              <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 mb-0.5">
                  <Zap size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Growth Coach</span>
                </div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400">Your calendar is clear — grow your business</p>
              </div>
              <div className="space-y-2">
                <Link href="/solo/clients">
                  <Card className="p-4 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Invite Past Clients</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Re-engage clients who haven&apos;t booked recently</p>
                      </div>
                    </div>
                  </Card>
                </Link>
                {businessSlug && (
                  <Card className="p-4 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer" onClick={handleCopyLink}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <ExternalLink size={18} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Share Booking Link</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Let new clients book you directly</p>
                      </div>
                    </div>
                  </Card>
                )}
                <Link href="/solo/calendar">
                  <Card className="p-4 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Create a Group Class</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Maximize your time with group sessions</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/solo/sessions/new" className="group">
              <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="text-purple-600 dark:text-purple-400" size={22} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">New Booking</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/solo/sessions/quick" className="group">
              <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="text-amber-600 dark:text-amber-400" size={22} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Quick Session</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Log an unplanned session</p>
                </CardContent>
              </Card>
            </Link>
            <div className="group cursor-pointer" onClick={() => setShowAddClient(true)}>
              <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="text-blue-600 dark:text-blue-400" size={22} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Add Client</span>
                </CardContent>
              </Card>
            </div>
            <Link href="/solo/calendar" className="group">
              <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="text-green-600 dark:text-green-400" size={22} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">View Calendar</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>

      {/* Two-column: Clients + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Clients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Clients</h2>
            <Link href="/solo/clients">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
              </div>
            </Card>
          ) : recentClients.length > 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {recentClients.map((client) => (
                <div key={client.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.credits <= 1 && (
                        <span className="text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                          Low credits
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold ${client.credits <= 1 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {client.credits}
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">credits</p>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Users className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
                <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">No clients yet</p>
                <p className="text-xs mb-3">Add your first client to get started</p>
                <Link href="/solo/clients">
                  <Button size="sm">Add Client</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Revenue This Week */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Revenue This Week</h2>
            <Link href="/solo/revenue">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View Full Revenue <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoading ? '...' : `£${(stats.earningsThisWeek / 100).toFixed(0)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.sessionsThisWeek} sessions this week</p>
                </div>
              </div>
              {/* Simple bar visualization */}
              <div className="flex items-end gap-1 h-16">
                {[40, 65, 50, 80, 55, 70, 30].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-green-500 to-green-400 dark:from-green-600 dark:to-green-500 opacity-60"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Public Booking Link */}
      {businessSlug && (
        <div className="mb-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <ExternalLink className="text-purple-600 dark:text-purple-400" size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Public Booking Link</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{bookingUrl}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="gap-2 shrink-0"
                >
                  {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Share Booking Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unlock Growth Tools CTA */}
      <Card className="bg-gradient-to-r from-[#12229D] via-[#6B21A8] to-[#A71075] border-0">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Megaphone className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Unlock Growth Tools</h3>
                <p className="text-xs text-white/70">Launch automated campaigns to grow your client base and increase retention.</p>
              </div>
            </div>
            <Button size="sm" className="bg-white text-purple-700 hover:bg-white/90 gap-1 shrink-0">
              <Lock size={14} /> Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddClient(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add New Client</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add a client to your roster. They will receive an email to set up their account.</p>
              </div>
              <button onClick={() => setShowAddClient(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={addClientForm.firstName}
                    onChange={(e) => setAddClientForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={addClientForm.lastName}
                    onChange={(e) => setAddClientForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={addClientForm.email}
                  onChange={(e) => setAddClientForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+44 7777 000000"
                  value={addClientForm.phone}
                  onChange={(e) => setAddClientForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">A welcome email will be sent so the client can set up their account.</p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddClient(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAddClient}
                  disabled={!addClientForm.email || !addClientForm.firstName || addingClient}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {addingClient ? 'Adding...' : 'Add Client'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
