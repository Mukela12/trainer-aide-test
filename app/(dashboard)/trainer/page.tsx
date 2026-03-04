"use client";

import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useBookings } from '@/lib/hooks/use-bookings';
import { useAnalytics } from '@/lib/hooks/use-analytics';
import { useBookingRequests } from '@/lib/hooks/use-booking-requests';
import { useUpcomingSessions } from '@/lib/hooks/use-upcoming-sessions';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Dumbbell, Calendar, Users, DollarSign, Clock, Inbox, TrendingUp, Sparkles, Share2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import type { TrainerDashboardStats, UpcomingSession } from '@/lib/types/dashboard';

// Format today's date
const today = new Date();
const dateString = format(today, 'EEEE, MMMM d');

export default function TrainerDashboard() {
  const { currentUser } = useUserStore();
  const { sessions: calendarSessions } = useBookings(currentUser?.id);

  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(currentUser?.id);
  const { data: pendingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const { data: upcomingSessionsData = [], isLoading: sessionsLoading } = useUpcomingSessions(currentUser?.id, 5);

  const isLoading = analyticsLoading || sessionsLoading;

  const stats: TrainerDashboardStats = {
    earningsThisWeek: analyticsData?.earningsThisWeek || 0,
    sessionsThisWeek: analyticsData?.sessionsThisWeek || 0,
    activeClients: analyticsData?.activeClients || 0,
    softHoldsCount: analyticsData?.softHoldsCount || 0,
    pendingRequests: pendingRequests.length,
  };

  const upcomingSessions: UpcomingSession[] = upcomingSessionsData.map(s => ({
    id: s.id,
    clientName: s.clientName || 'Client',
    scheduledAt: new Date(s.scheduledAt),
    serviceName: s.serviceName || 'Session',
    status: s.status,
  }));

  // Also use calendar store data as fallback for soft holds
  const softHoldsFromStore = calendarSessions.filter(s => s.status === 'soft-hold').length;
  const displaySoftHolds = stats.softHoldsCount || softHoldsFromStore;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
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
              This week: <span className="text-white font-medium">{isLoading ? '...' : stats.sessionsThisWeek} sessions booked</span>
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
          title="Soft Holds (Pending)"
          value={isLoading ? '...' : displaySoftHolds}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link href="/trainer/sessions/new" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-blue-200/50 dark:border-blue-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="text-wondrous-blue dark:text-blue-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Schedule Session</span>
              </div>
            </div>
          </Link>
          <Link href="/trainer/templates" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-pink-200/50 dark:border-pink-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-pink-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="text-wondrous-magenta" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View Templates</span>
              </div>
            </div>
          </Link>
          <Link href="/trainer/sessions" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-orange-200/50 dark:border-orange-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-orange-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="text-wondrous-orange" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Recent Sessions</span>
              </div>
            </div>
          </Link>
          <Link href="/trainer/requests" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-cyan-200/50 dark:border-cyan-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Inbox className="text-cyan-600 dark:text-cyan-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Booking Requests</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Upcoming Sessions</h2>
          <Link href="/trainer/calendar">
            <Button variant="ghost" size="sm">View Calendar</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-wondrous-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : upcomingSessions.length > 0 ? (
          <>
            {/* Check if any sessions are today */}
            {(() => {
              const todaySessions = upcomingSessions.filter(
                (s) => format(s.scheduledAt, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
              );
              const futureSessions = upcomingSessions.filter(
                (s) => format(s.scheduledAt, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')
              );

              return todaySessions.length === 0 ? (
                /* No sessions today — show "Next Up" */
                <div>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">No sessions today — here&apos;s what&apos;s coming up next</p>
                  </div>
                  <div className="space-y-3">
                    {upcomingSessions.slice(0, 5).map((session) => (
                      <Card key={session.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 lg:p-5">
                          <div className="flex items-center justify-between gap-4">
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
                            <Link href="/trainer/calendar">
                              <Button size="sm" variant="ghost" className="text-xs">View</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                /* Has sessions today — show normal list */
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
                              <span className="text-gray-400">·</span>
                              <span>{session.serviceName}</span>
                            </div>
                          </div>
                          <Link href="/trainer/calendar">
                            <Button size="sm" variant="outline">Details</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </>
        ) : (
          /* No upcoming sessions at all — Growth Coach */
          <div>
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Growth Coach</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Your calendar is clear — here are some ways to grow your business</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/solo/clients">
                <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Invite Past Clients</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Re-engage clients who haven&apos;t booked recently</p>
                    </div>
                  </div>
                </Card>
              </Link>
              <Link href="/settings">
                <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-green-200 dark:hover:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Share2 size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Share Booking Link</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Let new clients book you directly</p>
                    </div>
                  </div>
                </Card>
              </Link>
              <Link href="/trainer/calendar">
                <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Users size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Create a Group Class</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Maximize your time with group sessions</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
