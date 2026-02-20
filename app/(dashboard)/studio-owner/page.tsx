"use client";

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTemplates } from '@/lib/hooks/use-templates';
import { useBookingRequests } from '@/lib/hooks/use-booking-requests';
import { useClients } from '@/lib/hooks/use-clients';
import { useUserStore } from '@/lib/stores/user-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Calendar, Clock, Users, UserPlus, Plus, Inbox, AlertTriangle,
  Dumbbell, ChevronRight, CalendarPlus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PublicBookingLink } from '@/components/shared/PublicBookingLink';
import type { OperatorDashboardStats, OperatorUpcomingSession, RecentClient } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils/cn';

// Format today's date
const today = new Date();
const dateString = format(today, 'EEEE, MMMM d');

// Fetch operator analytics
async function fetchOperatorAnalytics(): Promise<{
  stats: OperatorDashboardStats;
  upcomingSessions: OperatorUpcomingSession[];
}> {
  const res = await fetch('/api/analytics/operator');
  if (!res.ok) throw new Error('Failed to fetch operator analytics');
  return res.json();
}

export default function StudioOwnerDashboard() {
  const { currentUser, businessSlug } = useUserStore();
  const { data: templates = [] } = useTemplates(currentUser.id);
  const { data: pendingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const { data: clients = [], isLoading: clientsLoading } = useClients(currentUser?.id);

  const { data: operatorData, isLoading: operatorLoading } = useQuery({
    queryKey: ['analytics', 'operator', currentUser.id],
    queryFn: fetchOperatorAnalytics,
    enabled: !!currentUser.id,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = operatorLoading || clientsLoading;
  const stats = operatorData?.stats;
  const upcomingSessions = operatorData?.upcomingSessions || [];

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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A71075] via-[#8a0d60] to-[#0A1466] p-6 md:p-8 mb-6 lg:mb-8">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#A71075]/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">{dateString}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Welcome back, {currentUser.firstName}
            </h1>
            <p className="text-white/70">
              {isLoading ? 'Loading...' : (
                <>
                  Today: <span className="text-white font-medium">{stats?.todaySessions || 0} sessions</span>
                  {(stats?.pendingActions || 0) > 0 && (
                    <span className="ml-3 text-wondrous-orange font-medium">
                      {stats?.pendingActions} pending action{stats?.pendingActions !== 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white/70 text-sm">Active Clients</p>
              <p className="text-3xl font-bold text-white">{isLoading ? '...' : (stats?.activeClients || clients.length)}</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          title="Today's Sessions"
          value={isLoading ? '...' : (stats?.todaySessions || 0)}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Active Trainers"
          value={isLoading ? '...' : (stats?.activeTrainers || 0)}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Active Clients"
          value={isLoading ? '...' : (stats?.activeClients || clients.length)}
          icon={UserPlus}
          color="magenta"
        />
        <StatCard
          title="Pending Actions"
          value={isLoading ? '...' : (stats?.pendingActions || pendingRequests.length)}
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 lg:mb-8">
        <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link href="/studio-owner/clients" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-blue-200/50 dark:border-blue-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="text-wondrous-blue dark:text-blue-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Add Client</span>
              </div>
            </div>
          </Link>
          <Link href="/studio-owner/services" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-pink-200/50 dark:border-pink-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-pink-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="text-wondrous-magenta" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Add Service</span>
              </div>
            </div>
          </Link>
          <Link href="/studio-owner/staff" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-orange-200/50 dark:border-orange-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-orange-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="text-wondrous-orange" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Invite Trainer</span>
              </div>
            </div>
          </Link>
          <Link href="/studio-owner/calendar" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-cyan-200/50 dark:border-cyan-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="text-cyan-600 dark:text-cyan-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">View Calendar</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Public Booking Link */}
        {businessSlug && (
          <div className="mt-4">
            <PublicBookingLink
              businessSlug={businessSlug}
              businessName={`${currentUser.firstName} ${currentUser.lastName}`}
            />
          </div>
        )}
      </div>

      {/* Two-column: Upcoming Sessions + Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100">
              Upcoming Sessions
            </h2>
            <Link href="/studio-owner/sessions">
              <Button variant="ghost" size="sm" className="text-xs lg:text-sm gap-1">
                View All <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-wondrous-magenta rounded-full animate-spin" />
              </div>
            </Card>
          ) : upcomingSessions.length > 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-wondrous-blue-light flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-wondrous-dark-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.clientName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.serviceName}
                      {session.trainerName && ` · ${session.trainerName}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {format(new Date(session.scheduledAt), 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(session.scheduledAt), 'dd MMM')}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-6 lg:p-8 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center text-gray-500">
                <Calendar className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
                <p className="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">No upcoming sessions</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sessions will appear here once booked</p>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Clients */}
        <div>
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-heading-2 font-bold text-gray-900 dark:text-gray-100">
              Recent Clients
            </h2>
            <Link href="/studio-owner/clients">
              <Button variant="ghost" size="sm" className="text-xs lg:text-sm gap-1">
                View All ({clients.length}) <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          {clientsLoading ? (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-wondrous-magenta rounded-full animate-spin" />
              </div>
            </Card>
          ) : recentClients.length > 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {recentClients.map((client) => (
                <div key={client.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-wondrous-blue-light flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-wondrous-dark-blue">
                      {client.firstName?.[0]}{client.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {client.email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {client.credits}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">credits</p>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-6 lg:p-8 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center text-gray-500">
                <Users className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
                <p className="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">No clients yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Add or invite clients to get started</p>
                <Link href="/studio-owner/clients">
                  <Button className="bg-wondrous-magenta hover:bg-wondrous-magenta-alt text-sm">Add Client</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
