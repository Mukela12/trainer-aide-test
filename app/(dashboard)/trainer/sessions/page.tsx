"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/lib/stores/session-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDuration } from '@/lib/utils/generators';
import { Dumbbell, Play, Trash2, Calendar, Clock, TrendingUp, Plus, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';

type TabType = 'in_progress' | 'upcoming' | 'completed';

export default function MySessions() {
  const { sessions, deleteSession } = useSessionStore();
  const { sessions: calendarSessions } = useCalendarStore();
  const [activeTab, setActiveTab] = useState<TabType>('in_progress');

  const inProgressSessions = sessions.filter((s) => !s.completed);

  // Upcoming sessions from calendar (future dates only)
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
    });

  const completedSessions = sessions
    .filter((s) => s.completed)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const displaySessions = activeTab === 'in_progress' ? inProgressSessions :
                          activeTab === 'upcoming' ? upcomingSessions :
                          completedSessions;

  const handleDelete = (sessionId: string, sessionName: string, isCompleted: boolean) => {
    if (isCompleted) {
      alert('Cannot delete completed sessions. Completed sessions are historic records.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      deleteSession(sessionId);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-heading-1 mb-2 dark:text-gray-100">My Sessions</h1>
            <p className="text-body-sm text-gray-600 dark:text-gray-400">View and manage your training sessions</p>
          </div>
          <Link href="/trainer/sessions/new">
            <Button className="gap-2">
              <Plus size={20} />
              <span className="hidden sm:inline">New Session</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('in_progress')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors relative',
            activeTab === 'in_progress'
              ? 'text-wondrous-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          In Progress
          {inProgressSessions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-wondrous-primary text-white text-xs rounded-full">
              {inProgressSessions.length}
            </span>
          )}
          {activeTab === 'in_progress' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-wondrous-primary"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors relative',
            activeTab === 'upcoming'
              ? 'text-wondrous-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          Upcoming
          {upcomingSessions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              {upcomingSessions.length}
            </span>
          )}
          {activeTab === 'upcoming' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-wondrous-primary"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            'px-4 py-3 font-medium text-sm transition-colors relative',
            activeTab === 'completed'
              ? 'text-wondrous-primary'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          Completed
          {completedSessions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-full">
              {completedSessions.length}
            </span>
          )}
          {activeTab === 'completed' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-wondrous-primary"></div>
          )}
        </button>
      </div>

      {/* Sessions List */}
      {displaySessions.length > 0 ? (
        <div className="space-y-4">
          {displaySessions.map((session: any) => {
            // Check if this is a calendar session (upcoming) or regular session
            const isCalendarSession = 'datetime' in session;
            const isCompleted = !isCalendarSession && session.completed;

            // For regular sessions, calculate progress
            const completedExercises = !isCalendarSession ? session.blocks.reduce(
              (sum: number, block: any) => sum + block.exercises.filter((ex: any) => ex.completed).length,
              0
            ) : 0;
            const totalExercises = !isCalendarSession ? session.blocks.reduce(
              (sum: number, block: any) => sum + block.exercises.length,
              0
            ) : 0;
            const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 lg:p-6">
                  <div className="flex items-start gap-3 lg:gap-4">
                    {/* Icon - Now visible on mobile with smaller size */}
                    <div className={cn(
                      'flex w-10 h-10 lg:w-12 lg:h-12 rounded-lg items-center justify-center flex-shrink-0',
                      isCompleted ? 'bg-green-100 dark:bg-green-900/30' :
                      isCalendarSession ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-wondrous-blue-light dark:bg-wondrous-blue/20'
                    )}>
                      <Dumbbell
                        className={isCompleted ? 'text-green-600 dark:text-green-400' :
                                  isCalendarSession ? 'text-orange-600 dark:text-orange-400' : 'text-wondrous-dark-blue dark:text-wondrous-blue'}
                        size={20}
                        strokeWidth={2.5}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Simplified Display: Client Name + Date/Time */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {isCalendarSession ? session.clientName :
                              (session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Walk-in Client')}
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {isCalendarSession ? (
                              format(session.datetime instanceof Date ? session.datetime : new Date(session.datetime), 'EEE, MMM d \'at\' h:mm a')
                            ) : (
                              <>
                                {format(new Date(session.startedAt), 'EEE, MMM d \'at\' h:mm a')}
                                {isCompleted && session.completedAt &&
                                  ` - Completed ${format(new Date(session.completedAt), 'h:mm a')}`
                                }
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant={isCompleted ? 'success' : isCalendarSession ? 'default' : 'default'}>
                          {isCompleted ? 'Completed' : isCalendarSession ? 'Scheduled' : 'In Progress'}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {isCalendarSession ? (
                        <Link href="/trainer/calendar">
                          <Button size="sm" variant="outline" className="whitespace-nowrap">
                            Details
                          </Button>
                        </Link>
                      ) : (
                        <>
                          {!session.completed ? (
                            <Link href={`/trainer/sessions/${session.id}`}>
                              <Button size="sm" className="whitespace-nowrap gap-2">
                                <Play size={16} />
                                Resume
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/trainer/sessions/${session.id}/view`}>
                              <Button size="sm" variant="outline" className="whitespace-nowrap">
                                Details
                              </Button>
                            </Link>
                          )}
                          {!session.completed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(session.id, session.sessionName || 'Session', session.completed)}
                              className="text-red-600 hover:text-red-700 whitespace-nowrap gap-2"
                            >
                              <Trash2 size={16} />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title={
            activeTab === 'in_progress' ? 'No sessions in progress' :
            activeTab === 'upcoming' ? 'No upcoming sessions' :
            'No completed sessions'
          }
          description={
            activeTab === 'in_progress' ? 'Start a new training session to get going' :
            activeTab === 'upcoming' ? 'Schedule sessions in your calendar' :
            'Completed sessions will appear here'
          }
          action={
            activeTab === 'in_progress' ? (
              <Link href="/trainer/sessions/new">
                <Button>
                  <Plus size={20} className="mr-2" />
                  Start New Session
                </Button>
              </Link>
            ) : activeTab === 'upcoming' ? (
              <Link href="/trainer/calendar">
                <Button>
                  <Calendar size={20} className="mr-2" />
                  View Calendar
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
