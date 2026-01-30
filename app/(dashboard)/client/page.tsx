"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/lib/stores/session-store';
import { useUserStore } from '@/lib/stores/user-store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, TrendingUp, Calendar, Clock, History, FileText, CreditCard, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { formatDuration } from '@/lib/utils/generators';

// Helper function to get time-based greeting
function getTimeBasedGreeting(): { greeting: string; title: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good Morning', title: 'Early Riser' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good Afternoon', title: 'Day Warrior' };
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Good Evening', title: 'Evening Champion' };
  } else {
    return { greeting: 'Hey Night Owl', title: 'Night Grinder' };
  }
}

export default function ClientDashboard() {
  const { sessions } = useSessionStore();
  const { currentUser } = useUserStore();
  const { greeting, title } = getTimeBasedGreeting();
  const [credits, setCredits] = useState<number | null>(null);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState<number>(0);

  // Fetch credits and bookings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch credits
        const creditsRes = await fetch('/api/client/packages');
        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCredits(data.totalCredits || 0);
        }

        // Fetch upcoming bookings count
        const bookingsRes = await fetch('/api/client/bookings');
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          const upcoming = (data.bookings || []).filter(
            (b: { scheduledAt: string; status: string }) =>
              new Date(b.scheduledAt) > new Date() && b.status !== 'cancelled'
          );
          setUpcomingBookingsCount(upcoming.length);
        }
      } catch (err) {
        console.error('Error fetching client data:', err);
      }
    };

    fetchData();
  }, []);

  // Use the authenticated user's ID to filter sessions
  // The client sees sessions where they are the client
  const clientId = currentUser.id;

  // Filter sessions for this client
  const clientSessions = sessions.filter((s) => s.clientId === clientId);
  const completedSessions = clientSessions.filter((s) => s.completed);

  // Calculate stats
  const totalSessions = completedSessions.length;
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const sessionsThisWeek = completedSessions.filter(
    (s) => new Date(s.completedAt || 0) >= thisWeekStart
  ).length;

  const averageRpe =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + (s.overallRpe || 0), 0) / completedSessions.length
        )
      : 0;

  const totalDuration = completedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const averageDuration = completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;

  // Get next session (in-progress sessions)
  const inProgressSession = clientSessions.find((s) => !s.completed);

  // Get recent completed sessions
  const recentSessions = completedSessions
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 dark:text-gray-100 mb-2">
          {greeting}, {currentUser.firstName}! 💪
        </h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Welcome back, <span className="font-semibold text-wondrous-magenta">{title}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
        <StatCard
          title="Credits"
          value={credits !== null ? credits : '-'}
          icon={CreditCard}
          color="magenta"
        />
        <StatCard
          title="Upcoming"
          value={upcomingBookingsCount}
          icon={CalendarCheck}
          color="green"
        />
        <StatCard
          title="Total"
          value={totalSessions}
          icon={Dumbbell}
          color="blue"
        />
        <StatCard
          title="This Week"
          value={sessionsThisWeek}
          icon={Calendar}
          color="orange"
        />
        <StatCard
          title="Avg RPE"
          value={averageRpe > 0 ? `${averageRpe}/10` : 'N/A'}
          icon={TrendingUp}
          color="orange"
        />
        <StatCard
          title="Duration"
          value={averageDuration > 0 ? formatDuration(averageDuration) : 'N/A'}
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Next Session / In Progress */}
      {inProgressSession && (
        <Card className="mb-8 border-2 border-wondrous-primary bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Session in Progress</CardTitle>
              <Badge variant="default">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{inProgressSession.sessionName}</h3>
                <p className="text-sm text-gray-600">{inProgressSession.template?.name || 'Custom Session'}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {format(new Date(inProgressSession.startedAt), 'MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {format(new Date(inProgressSession.startedAt), 'h:mm a')}
                </span>
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-700 mb-2">
                  Your trainer has started this session and is tracking your progress.
                </p>
                <p className="text-xs text-gray-500 italic">
                  You&apos;ll be able to view the full details once the session is completed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link href="/client/bookings" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-green-200/50 dark:border-green-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-green-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarCheck className="text-green-600 dark:text-green-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">My Bookings</span>
              </div>
            </div>
          </Link>
          <Link href="/client/packages" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-magenta-200/50 dark:border-magenta-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-pink-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="text-wondrous-magenta dark:text-pink-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">My Credits</span>
              </div>
            </div>
          </Link>
          <Link href="/client/sessions" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-blue-200/50 dark:border-blue-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="text-wondrous-blue dark:text-blue-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">Session History</span>
              </div>
            </div>
          </Link>
          <Link href="/client/progress" className="group">
            <div className="relative overflow-hidden backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-bl from-purple-500/10 to-transparent opacity-50" />
              <div className="relative flex flex-col items-center gap-2 lg:gap-3 text-center">
                <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-purple-600 dark:text-purple-400" size={22} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm lg:text-base">My Progress</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Recent Sessions</h2>
          <Link href="/client/sessions">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{session.sessionName}</h3>
                      <p className="text-sm text-gray-600 mb-2">{session.template?.name || 'Custom Session'}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {session.completedAt && format(new Date(session.completedAt), 'MMM d, yyyy')}
                        </span>
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(session.duration)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          RPE {session.overallRpe}/10
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Completed</Badge>
                    </div>
                  </div>
                  {session.publicNotes && (
                    <div className="mt-3 pt-3 border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Trainer Notes:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{session.publicNotes}&quot;</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500">
              <Dumbbell className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium mb-2">No sessions yet</p>
              <p className="text-sm">Your completed training sessions will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
