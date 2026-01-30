"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/stores/user-store';
import { useCalendarStore } from '@/lib/stores/booking-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Dumbbell, Calendar, Users, DollarSign, Clock, Inbox } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  earningsThisWeek: number;
  sessionsThisWeek: number;
  activeClients: number;
  softHoldsCount: number;
  pendingRequests: number;
}

interface UpcomingSession {
  id: string;
  clientName: string;
  scheduledAt: Date;
  serviceName: string;
  status: string;
}

export default function TrainerDashboard() {
  const { currentUser } = useUserStore();
  const { sessions: calendarSessions } = useCalendarStore();

  const [stats, setStats] = useState<DashboardStats>({
    earningsThisWeek: 0,
    sessionsThisWeek: 0,
    activeClients: 0,
    softHoldsCount: 0,
    pendingRequests: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
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
            softHoldsCount: data.softHoldsCount || 0,
            pendingRequests: pendingRequestsCount,
          });
        }

        // Fetch upcoming sessions via API
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
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 dark:text-gray-100 mb-2">
          Hey {currentUser.firstName}! 👋
        </h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Ready to train your clients today?
        </p>
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
                    <Link href="/trainer/calendar">
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
              <Link href="/trainer/calendar">
                <Button>View Calendar</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
