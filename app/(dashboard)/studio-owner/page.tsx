"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBookingRequests } from '@/lib/hooks/use-booking-requests';
import { useClients } from '@/lib/hooks/use-clients';
import { useUserStore } from '@/lib/stores/user-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar, Clock, Users, UserPlus, Plus, AlertCircle,
  ChevronRight, TrendingUp, DollarSign, Copy, ExternalLink,
  CheckCircle2, Megaphone, Lock,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import type { OperatorDashboardStats, OperatorUpcomingSession, RecentClient } from '@/lib/types/dashboard';

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
  const { currentUser, businessSlug, businessName } = useUserStore();
  const { data: pendingRequests = [] } = useBookingRequests(currentUser?.id, 'pending');
  const { data: clients = [], isLoading: clientsLoading } = useClients(currentUser?.id);
  const [copied, setCopied] = useState(false);

  const { data: operatorData, isLoading: operatorLoading } = useQuery({
    queryKey: ['analytics', 'operator', currentUser.id],
    queryFn: fetchOperatorAnalytics,
    enabled: !!currentUser.id,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = operatorLoading || clientsLoading;
  const stats = operatorData?.stats;
  const upcomingSessions = operatorData?.upcomingSessions || [];

  // Filter to today's sessions
  const todaySessions = upcomingSessions.filter(s => isToday(new Date(s.scheduledAt)));

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

  // Greeting
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
          {greeting}{businessName || currentUser.firstName ? `, ${businessName || currentUser.firstName}` : ''}
        </h1>
      </div>

      {/* Pending Actions Banner */}
      {(stats?.pendingActions || pendingRequests.length) > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {stats?.pendingActions || pendingRequests.length} Pending Action{(stats?.pendingActions || pendingRequests.length) !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Booking requests awaiting your response
                </p>
              </div>
            </div>
            <Link href="/studio-owner/requests">
              <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                Review <ChevronRight size={14} />
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
                  {isLoading ? '...' : (stats?.todaySessions || 0)}
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
                <Users className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : (stats?.activeTrainers || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Trainers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <UserPlus className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? '...' : (stats?.activeClients || clients.length)}
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
                  {isLoading ? '...' : (stats?.pendingActions || pendingRequests.length)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/studio-owner/clients" className="group">
            <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="text-blue-600 dark:text-blue-400" size={22} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Add Client</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/studio-owner/services" className="group">
            <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="text-pink-600 dark:text-pink-400" size={22} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Add Service</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/studio-owner/staff" className="group">
            <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="text-orange-600 dark:text-orange-400" size={22} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Invite Trainer</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/studio-owner/calendar" className="group">
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

      {/* Two-column: Today's Sessions + Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Today&apos;s Sessions</h2>
            <Link href="/studio-owner/calendar">
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
                        {format(new Date(session.scheduledAt), 'h:mm a')} - {session.clientName}
                      </p>
                      {session.status === 'soft-hold' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full shrink-0">
                          Hold
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.serviceName}
                      {session.trainerName && ` · ${session.trainerName}`}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Calendar className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
                <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">No sessions today</p>
                <p className="text-xs">Sessions will appear here once booked</p>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Clients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Clients</h2>
            <Link href="/studio-owner/clients">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All ({clients.length}) <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          {clientsLoading ? (
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {client.email}
                    </p>
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
                <p className="text-xs mb-3">Add or invite clients to get started</p>
                <Link href="/studio-owner/clients">
                  <Button size="sm">Add Client</Button>
                </Link>
              </div>
            </Card>
          )}
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
    </div>
  );
}
