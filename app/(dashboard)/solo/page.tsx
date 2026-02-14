"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useBookings } from '@/lib/hooks/use-bookings';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { useBookingRequests } from '@/lib/hooks/use-booking-requests';
import { useUpcomingSessions } from '@/lib/hooks/use-upcoming-sessions';
import { useClients } from '@/lib/hooks/use-clients';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Calendar, Plus, Users, DollarSign, Clock, TrendingUp, Package, Inbox, FileText, UserPlus, Sparkles, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { PublicBookingLink } from '@/components/shared/PublicBookingLink';
import type { SoloDashboardStats, UpcomingSession, RecentClient } from '@/lib/types/dashboard';

// Format today's date
const today = new Date();
const dateString = format(today, 'EEEE, MMMM d');

// Tier 2 collapsible actions component
function TierTwoActions() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span className="font-medium">Build & Setup</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          <Link href="/solo/packages" className="group">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <Package className="text-gray-400" size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Packages</span>
              </div>
            </div>
          </Link>
          <Link href="/solo/templates" className="group">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <FileText className="text-gray-400" size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Templates</span>
              </div>
            </div>
          </Link>
          <Link href="/settings" className="group">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <Settings className="text-gray-400" size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SoloPractitionerDashboard() {
  const { currentUser, businessSlug } = useUserStore();
  const { sessions: calendarSessions } = useBookings(currentUser.id);

  // React Query hooks
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(currentUser?.id);
  const { data: pendingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const { data: upcomingSessionsData = [], isLoading: sessionsLoading } = useUpcomingSessions(currentUser?.id, 5);
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

  const recentClients: RecentClient[] = [...clients]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      email: c.email,
      credits: c.credits || 0,
      createdAt: new Date(c.created_at),
    }));

  // Also use calendar store data as fallback for soft holds
  const softHoldsFromStore = calendarSessions.filter(s => s.status === 'soft-hold').length;
  const displaySoftHolds = stats.softHoldsCount || softHoldsFromStore;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A71075] via-[#8a0d60] to-[#0A1466] p-6 md:p-8 mb-8">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#A71075]/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">{dateString}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welcome back, {currentUser.firstName}
            </h1>
            <p className="text-white/70">
              This week: <span className="text-white font-medium">£{isLoading ? '...' : (stats.earningsThisWeek / 100).toFixed(0)} earned</span>
            </p>
          </div>

          {/* Quick Stat Display */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white/70 text-sm">Active Clients</p>
              <p className="text-3xl font-bold text-white">{isLoading ? '...' : stats.activeClients}</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        <StatCard
          title="Sessions (This Week)"
          value={isLoading ? '...' : stats.sessionsThisWeek}
          icon={Dumbbell}
          color="blue"
        />
        <StatCard
          title="Earnings (This Week)"
          value={isLoading ? '...' : `£${(stats.earningsThisWeek / 100).toFixed(0)}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Active Clients"
          value={isLoading ? '...' : stats.activeClients}
          icon={Users}
          color="magenta"
        />
        <StatCard
          title="Utilization"
          value={isLoading ? '...' : `${stats.utilizationPercent}%`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Secondary Stats Row */}
      {(stats.outstandingCredits > 0 || displaySoftHolds > 0 || stats.pendingRequests > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-8">
          {stats.pendingRequests > 0 && (
            <Link href="/solo/requests">
              <Card className="border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Inbox className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                      {stats.pendingRequests} Booking Request{stats.pendingRequests !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">
                      Awaiting your response
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {displaySoftHolds > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="text-yellow-600 dark:text-yellow-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    {displaySoftHolds} Soft Hold{displaySoftHolds !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    Awaiting payment
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.outstandingCredits > 0 && (
            <Card className="border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Package className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-medium">
                    {stats.outstandingCredits} Credits Outstanding
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500">
                    {stats.lowCreditClients} client{stats.lowCreditClients !== 1 ? 's' : ''} low on credits
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions - Tiered Structure */}
      <div className="mb-8">
        {/* TIER 1: Core Daily Actions (Always visible, prominent) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-2 dark:text-gray-100">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Link href="/solo/sessions/new" className="group">
              <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-slate-500/5 to-transparent opacity-50" />
                <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="text-purple-600 dark:text-purple-400" size={22} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Start Session</span>
                </div>
              </div>
            </Link>
            <Link href="/solo/calendar" className="group">
              <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-slate-500/5 to-transparent opacity-50" />
                <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="text-slate-600 dark:text-slate-300" size={22} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View Calendar</span>
                </div>
              </div>
            </Link>
            <Link href="/solo/clients" className="group">
              <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-slate-500/5 to-transparent opacity-50" />
                <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="text-slate-600 dark:text-slate-300" size={22} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Add Client</span>
                </div>
              </div>
            </Link>
            <Link href="/solo/packages" className="group">
              <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-slate-500/5 to-transparent opacity-50" />
                <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                  <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="text-slate-600 dark:text-slate-300" size={22} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Sell Package</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* TIER 2: Build & Setup (Collapsible) */}
        <TierTwoActions />

        {/* Public Booking Link */}
        {businessSlug && (
          <div className="mt-6">
            <PublicBookingLink
              businessSlug={businessSlug}
              businessName={`${currentUser.firstName} ${currentUser.lastName}`}
            />
          </div>
        )}

        {/* TIER 3: AI Enhancements */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-500" size={16} />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Enhance your workflow</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/solo/programs" className="group">
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/30 dark:border-purple-700/30 rounded-xl p-4 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="text-purple-600 dark:text-purple-400" size={18} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Programs</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Generate training plans</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/solo/templates/builder" className="group">
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/30 dark:border-purple-700/30 rounded-xl p-4 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="text-purple-600 dark:text-purple-400" size={18} />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Templates</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Create workout templates</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Upcoming Sessions</h2>
          <Link href="/solo/calendar">
            <Button variant="ghost" size="sm">View Calendar</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {session.clientName}
                        </h3>
                        {session.status === 'soft-hold' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                            Soft Hold
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          {format(session.scheduledAt, 'EEE, MMM d')} at {format(session.scheduledAt, 'h:mm a')}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{session.serviceName}</span>
                      </div>
                    </div>
                    <Link href="/solo/calendar">
                      <Button size="sm" variant="outline">Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
              <p className="text-lg font-medium mb-2 dark:text-gray-300">No upcoming sessions</p>
              <p className="text-sm mb-4 dark:text-gray-400">Schedule your next session to get started</p>
              <Link href="/solo/calendar">
                <Button>View Calendar</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Clients */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Recent Clients</h2>
          <Link href="/solo/clients">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentClients.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-wondrous-dark-blue">
                        {client.firstName?.[0]}{client.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {client.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.credits}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">credits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Users className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
              <p className="text-lg font-medium mb-2 dark:text-gray-300">No clients yet</p>
              <p className="text-sm mb-4 dark:text-gray-400">Add or invite clients to get started</p>
              <Link href="/solo/clients">
                <Button>Add Client</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
