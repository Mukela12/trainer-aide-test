"use client";

import Link from 'next/link';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useSessionStore } from '@/lib/stores/session-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useCalendarStore } from '@/lib/stores/booking-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Dumbbell, TrendingUp, Calendar, Plus, Users, DollarSign, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function TrainerDashboard() {
  const templates = useTemplateStore((state) => state.templates);
  const { sessions } = useSessionStore();
  const { currentUser } = useUserStore();
  const { sessions: calendarSessions } = useCalendarStore();

  // Calculate stats
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  // Sessions Delivered (This Week) - from completed sessions
  const sessionsThisWeek = sessions.filter(s =>
    s.completed && new Date(s.startedAt) >= thisWeekStart
  ).length;

  // Earnings (This Week) - £30 per session
  const earningsThisWeek = sessionsThisWeek * 30;

  // Active Clients - unique clients with sessions
  const uniqueClientIds = new Set(sessions.map(s => s.client?.id).filter(Boolean));
  const activeClients = uniqueClientIds.size;

  // Soft Holds (Pending) - from calendar store
  const softHolds = calendarSessions.filter(s => s.status === 'soft-hold').length;

  // Get upcoming sessions from calendar (future dates, not past)
  const now = new Date();
  const upcomingSessions = calendarSessions
    .filter(s => {
      const sessionDate = s.datetime instanceof Date ? s.datetime : new Date(s.datetime);
      return sessionDate > now;
    })
    .sort((a, b) => {
      const dateA = a.datetime instanceof Date ? a.datetime : new Date(a.datetime);
      const dateB = b.datetime instanceof Date ? b.datetime : new Date(b.datetime);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

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
          value={sessionsThisWeek}
          icon={Dumbbell}
          color="blue"
        />
        <StatCard
          title="Earnings (This Week)"
          value={`£${earningsThisWeek}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Active Clients"
          value={activeClients}
          icon={Users}
          color="magenta"
        />
        <StatCard
          title="Soft Holds (Pending)"
          value={softHolds}
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

        {upcomingSessions.length > 0 ? (
          <div className="space-y-4">
            {upcomingSessions.map((session) => {
              const sessionDate = session.datetime instanceof Date ? session.datetime : new Date(session.datetime);
              return (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 lg:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {session.clientName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {format(sessionDate, 'EEE, MMM d')} at {format(sessionDate, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      <Link href="/trainer/calendar">
                        <Button size="sm" variant="outline">Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
