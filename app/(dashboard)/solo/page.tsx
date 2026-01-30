"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useCalendarStore } from '@/lib/stores/booking-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Calendar, Plus, Users, DollarSign, Clock, TrendingUp, Package, Inbox, FileText, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

// Format today's date
const today = new Date();
const dateString = format(today, 'EEEE, MMMM d');

interface DashboardStats {
  earningsThisWeek: number;
  sessionsThisWeek: number;
  activeClients: number;
  utilizationPercent: number;
  softHoldsCount: number;
  outstandingCredits: number;
  lowCreditClients: number;
  pendingRequests: number;
}

interface UpcomingSession {
  id: string;
  clientName: string;
  scheduledAt: Date;
  serviceName: string;
  status: string;
}

interface RecentClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  credits: number;
  createdAt: Date;
}

export default function SoloPractitionerDashboard() {
  const { currentUser } = useUserStore();
  const { sessions: calendarSessions } = useCalendarStore();

  const [stats, setStats] = useState<DashboardStats>({
    earningsThisWeek: 0,
    sessionsThisWeek: 0,
    activeClients: 0,
    utilizationPercent: 0,
    softHoldsCount: 0,
    outstandingCredits: 0,
    lowCreditClients: 0,
    pendingRequests: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);

      try {
        // Fetch analytics from API
        const analyticsResponse = await fetch('/api/analytics/dashboard');
        let pendingRequestsCount = 0;

        // Fetch pending booking requests count
        try {
          const requestsRes = await fetch('/api/booking-requests');
          if (requestsRes.ok) {
            const requestsData = await requestsRes.json();
            pendingRequestsCount = (requestsData.requests || []).filter(
              (r: { status: string }) => r.status === 'pending'
            ).length;
          }
        } catch {
          // Ignore errors fetching requests
        }

        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json();
          setStats({
            earningsThisWeek: data.earningsThisWeek || 0,
            sessionsThisWeek: data.sessionsThisWeek || 0,
            activeClients: data.activeClients || 0,
            utilizationPercent: data.utilizationPercent || 0,
            softHoldsCount: data.softHoldsCount || 0,
            outstandingCredits: data.outstandingCredits || 0,
            lowCreditClients: data.lowCreditClients || 0,
            pendingRequests: pendingRequestsCount,
          });
        }

        // Fetch upcoming sessions via API to avoid RLS issues
        const sessionsResponse = await fetch('/api/sessions/upcoming?limit=5');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setUpcomingSessions(
            (sessionsData.sessions || []).map((s: { id: string; scheduledAt: string; status: string; clientName: string; serviceName: string }) => ({
              id: s.id,
              clientName: s.clientName || 'Client',
              scheduledAt: new Date(s.scheduledAt),
              serviceName: s.serviceName || 'Session',
              status: s.status,
            }))
          );
        }

        // Fetch recent clients
        const clientsResponse = await fetch('/api/clients');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          const sortedClients = (clientsData.clients || [])
            .sort((a: { created_at: string }, b: { created_at: string }) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, 5)
            .map((c: { id: string; first_name: string; last_name: string; email: string; credits: number; created_at: string }) => ({
              id: c.id,
              firstName: c.first_name || '',
              lastName: c.last_name || '',
              email: c.email,
              credits: c.credits || 0,
              createdAt: new Date(c.created_at),
            }));
          setRecentClients(sortedClients);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser.id) {
      loadDashboardData();
    }
  }, [currentUser.id]);

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

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link href="/solo/sessions/new" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-blue-200/50 dark:border-blue-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="text-wondrous-blue dark:text-blue-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Start Session</span>
              </div>
            </div>
          </Link>
          <Link href="/solo/calendar" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-purple-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="text-purple-600 dark:text-purple-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View Calendar</span>
              </div>
            </div>
          </Link>
          <Link href="/solo/packages" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-green-200/50 dark:border-green-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-green-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="text-green-600 dark:text-green-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Sell Package</span>
              </div>
            </div>
          </Link>
          <Link href="/solo/templates/builder" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-pink-200/50 dark:border-pink-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-pink-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="text-wondrous-magenta" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Build Template</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Additional Quick Actions Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
          <Link href="/solo/clients" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-cyan-200/50 dark:border-cyan-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="text-cyan-600 dark:text-cyan-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Manage Clients</span>
              </div>
            </div>
          </Link>
          <Link href="/solo/requests" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-indigo-200/50 dark:border-indigo-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Inbox className="text-indigo-600 dark:text-indigo-400" size={22} strokeWidth={2.5} />
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
