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
import type { SoloDashboardStats, UpcomingSession, RecentClient } from '@/lib/types/dashboard';

export default function SoloPractitionerDashboard() {
  const { currentUser, businessSlug, businessName } = useUserStore();
  const { sessions: calendarSessions } = useBookings(currentUser.id);
  const [copied, setCopied] = useState(false);

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

  // Soft holds from calendar data
  const softHoldsFromStore = calendarSessions.filter(s => s.status === 'soft-hold');
  const displaySoftHolds = stats.softHoldsCount || softHoldsFromStore.length;
  const firstSoftHold = softHoldsFromStore[0];

  // Low credit clients (credits <= 1)
  const lowCreditClientsList = clients.filter(c => (c.credits || 0) <= 1 && (c.credits || 0) >= 0);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const bookingUrl = businessSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${businessSlug}` : '';

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          {greeting}{currentUser.firstName ? `, ${currentUser.firstName}` : ''} <span className="inline-block">👋</span>
        </h1>
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
                    {firstSoftHold.clientName} · {format(firstSoftHold.datetime, 'h:mm a')}
                  </p>
                )}
              </div>
            </div>
            <Link href="/solo/calendar">
              <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                Chase Payment <ChevronRight size={14} />
              </Button>
            </Link>
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

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <Clock className="text-orange-600 dark:text-orange-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : stats.pendingRequests}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          ) : (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Calendar className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
                <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">No sessions today</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enjoy your free time or book new sessions</p>
              </div>
            </Card>
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
            <Link href="/solo/clients" className="group">
              <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="text-blue-600 dark:text-blue-400" size={22} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Add Client</span>
                </CardContent>
              </Card>
            </Link>
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
                  {copied ? 'Copied!' : 'Copy Link'}
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
    </div>
  );
}
