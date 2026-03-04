"use client";

import Link from 'next/link';
import { useSessionData } from '@/lib/hooks/use-sessions';
import { useUserStore } from '@/lib/stores/user-store';
import { useClientBookings, useClientPackages } from '@/lib/hooks/use-client-bookings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dumbbell, TrendingUp, Calendar, Clock, CreditCard, CalendarPlus,
  ChevronRight, ShoppingBag, Flame,
} from 'lucide-react';
import { format, isThisMonth } from 'date-fns';
import { formatDuration } from '@/lib/utils/generators';

// Helper function to get time-based greeting
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Welcome back';
}

export default function ClientDashboard() {
  const { currentUser } = useUserStore();
  const { sessions } = useSessionData(currentUser.id);
  const greeting = getTimeBasedGreeting();

  const { data: packageData } = useClientPackages(currentUser?.id);
  const { data: bookings = [] } = useClientBookings(currentUser?.id);

  const credits = packageData?.totalCredits ?? null;
  const upcomingBookings = bookings
    .filter((b) => new Date(b.scheduledAt) > new Date() && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const nextBooking = upcomingBookings[0];

  // Filter sessions for this client
  const clientId = currentUser.id;
  const clientSessions = sessions.filter((s) => s.clientId === clientId);
  const completedSessions = clientSessions.filter((s) => s.completed);

  // Calculate stats
  const totalSessions = completedSessions.length;
  const sessionsThisMonth = completedSessions.filter(
    (s) => s.completedAt && isThisMonth(new Date(s.completedAt))
  ).length;
  const averageRpe =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + (s.overallRpe || 0), 0) / completedSessions.length
        )
      : 0;

  // Week streak calculation (simplified: consecutive weeks with at least 1 session)
  const weekStreak = (() => {
    if (completedSessions.length === 0) return 0;
    let streak = 0;
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * oneWeek);
      const weekEnd = new Date(now.getTime() - i * oneWeek);
      const hasSession = completedSessions.some((s) => {
        const d = new Date(s.completedAt || 0);
        return d >= weekStart && d < weekEnd;
      });
      if (hasSession) streak++;
      else break;
    }
    return streak;
  })();

  // Consistency percentage (sessions this month / 5 target)
  const consistencyTarget = 5;
  const consistencyPercent = Math.min(100, Math.round((sessionsThisMonth / consistencyTarget) * 100));

  // Low credit detection
  const isLowCredits = credits !== null && credits <= 2;

  // Recent completed sessions
  const recentSessions = completedSessions
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 3);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6B21A8] via-[#A71075] to-[#F97316] p-6 md:p-8 mb-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

        <div className="relative">
          <p className="text-white/70 text-sm mb-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {greeting}, {currentUser.firstName}
          </h1>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
              <Flame size={16} className="text-orange-300" />
              <span className="text-white text-sm font-medium">{weekStreak} week streak</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
              <Dumbbell size={16} className="text-white/70" />
              <span className="text-white text-sm font-medium">{totalSessions} total sessions</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
              <Calendar size={16} className="text-white/70" />
              <span className="text-white text-sm font-medium">{sessionsThisMonth} this month</span>
            </div>
          </div>

          {/* Credit Pill */}
          <div className="absolute top-0 right-0">
            <Link href="/client/shop">
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:scale-105 ${
                isLowCredits
                  ? 'bg-red-500/90 text-white'
                  : 'bg-white/20 text-white backdrop-blur-sm'
              }`}>
                <CreditCard size={14} />
                <span>{credits ?? '-'} credits</span>
                {isLowCredits && <ChevronRight size={14} />}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Low Credit Upsell Banner */}
      {isLowCredits && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                You&apos;re down to {credits} credit{credits !== 1 ? 's' : ''}
                {weekStreak > 0 && ` — Don't break your ${weekStreak}-week streak!`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Top up now to keep training
              </p>
            </div>
            <Link href="/client/shop">
              <Button size="sm" className="bg-gradient-to-r from-[#12229D] via-[#6B21A8] to-[#A71075] text-white hover:opacity-90 gap-1">
                <ShoppingBag size={14} />
                View Packages
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Two Cards: Next Session + Book CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* YOUR NEXT SESSION */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Your Next Session
            </p>
            {nextBooking ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {format(new Date(nextBooking.scheduledAt), 'EEEE, MMM d')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {nextBooking.serviceName || 'Session'} · {format(new Date(nextBooking.scheduledAt), 'h:mm a')}
                    </p>
                  </div>
                  {nextBooking.status === 'soft-hold' && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href="/client/bookings" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming sessions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* READY TO TRAIN? */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400 mb-3">
                Ready to Train?
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                Book your next session
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {credits !== null && credits > 0
                  ? `You have ${credits} credit${credits !== 1 ? 's' : ''} available`
                  : 'Purchase credits to get started'
                }
              </p>
            </div>
            <Link href="/client/book">
              <Button className="w-full bg-gradient-to-r from-[#12229D] via-[#6B21A8] to-[#A71075] text-white hover:opacity-90 gap-2">
                <CalendarPlus size={16} />
                Book a Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Your Progress */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Your Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Consistency */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Consistency</p>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{consistencyPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${consistencyPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sessions This Month */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sessions This Month</p>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{sessionsThisMonth}/{consistencyTarget}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sessionsThisMonth / consistencyTarget) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Credits Remaining */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Credits Remaining</p>
                <span className={`text-sm font-bold ${isLowCredits ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {credits ?? '-'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLowCredits ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
                  style={{ width: credits !== null ? `${Math.min(100, (credits / 10) * 100)}%` : '0%' }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Sessions</h2>
          <Link href="/client/sessions">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View All <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <Card className="dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {recentSessions.map((session) => (
              <div key={session.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Dumbbell size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session.sessionName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {session.completedAt && (
                      <span>{format(new Date(session.completedAt), 'MMM d')}</span>
                    )}
                    {session.publicNotes && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="truncate">{session.publicNotes}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {(session.overallRpe ?? 0) > 0 && (
                    <span className={`text-sm font-bold ${
                      (session.overallRpe ?? 0) >= 8 ? 'text-red-500' :
                      (session.overallRpe ?? 0) >= 6 ? 'text-orange-500' :
                      (session.overallRpe ?? 0) >= 4 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {session.overallRpe}/10
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Dumbbell className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={36} />
              <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">No sessions yet</p>
              <p className="text-xs">Your completed sessions will appear here</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
