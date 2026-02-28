"use client";

import { useState } from 'react';
import { useSessionData } from '@/lib/hooks/use-sessions';
import { useUserStore } from '@/lib/stores/user-store';
import { useExerciseLookup } from '@/lib/hooks/use-exercise';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDuration } from '@/lib/utils/generators';
import { Dumbbell, Calendar, Clock, TrendingUp, ChevronDown, ChevronUp, FileText, Flame } from 'lucide-react';
import { format, isThisMonth } from 'date-fns';

export default function ClientSessionHistory() {
  const { currentUser } = useUserStore();
  const { sessions } = useSessionData(currentUser.id);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const { getExercise } = useExerciseLookup();

  const clientId = currentUser.id;

  // Filter completed sessions for this client
  const clientSessions = sessions
    .filter((s) => s.clientId === clientId && s.completed)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  // Stats
  const totalSessions = clientSessions.length;
  const averageRpe =
    totalSessions > 0
      ? Math.round(clientSessions.reduce((acc, s) => acc + (s.overallRpe || 0), 0) / totalSessions)
      : 0;
  const sessionsThisMonth = clientSessions.filter(
    (s) => s.completedAt && isThisMonth(new Date(s.completedAt))
  ).length;

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  // RPE color helper
  const getRpeColor = (rpe: number) => {
    if (rpe >= 8) return 'text-red-500';
    if (rpe >= 6) return 'text-orange-500';
    if (rpe >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Session History</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">View all your completed training sessions</p>

      {/* 3-Stat Header */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
              <Dumbbell size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalSessions}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Sessions</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
              <Flame size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className={`text-2xl font-bold ${averageRpe > 0 ? getRpeColor(averageRpe) : 'text-gray-900 dark:text-gray-100'}`}>
              {averageRpe > 0 ? `${averageRpe}/10` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Intensity</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sessionsThisMonth}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      {clientSessions.length > 0 ? (
        <div className="space-y-3">
          {clientSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;

            return (
              <Card key={session.id} className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                {/* Session Summary Row */}
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleExpanded(session.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Dumbbell size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.sessionName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {session.completedAt && (
                        <span>{format(new Date(session.completedAt), 'MMM d, yyyy')}</span>
                      )}
                      {session.publicNotes && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="truncate max-w-[200px]">{session.publicNotes}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(session.overallRpe ?? 0) > 0 && (
                      <span className={`text-sm font-bold ${getRpeColor(session.overallRpe ?? 0)}`}>
                        {session.overallRpe}/10
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t dark:border-gray-700">
                    {/* Session Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap py-3">
                      {session.completedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(session.completedAt), 'MMM d, yyyy')}
                        </span>
                      )}
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

                    {/* Trainer Notes */}
                    {session.publicNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2 text-sm">
                          <FileText size={14} />
                          Trainer Notes
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{session.publicNotes}&quot;</p>
                      </div>
                    )}

                    {/* Workout Details */}
                    <div className="space-y-3">
                      {session.blocks.map((block) => (
                        <div key={block.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{block.name}</h5>
                            {block.completed && (
                              <Badge variant="success" className="text-xs">Done</Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            {block.exercises.map((exercise) => {
                              const exerciseData = getExercise(exercise.exerciseId);
                              if (!exerciseData) return null;

                              return (
                                <div
                                  key={exercise.id}
                                  className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                        {exercise.position}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{exerciseData.name}</span>
                                        <Badge variant="outline" className="capitalize text-[10px]">
                                          {exercise.muscleGroup}
                                        </Badge>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400">
                                            {exercise.muscleGroup === 'cardio' ? (
                                              <>
                                                {Math.floor((exercise.cardioDuration || 0) / 60)} min ·
                                                Intensity {exercise.cardioIntensity}/10
                                              </>
                                            ) : exercise.muscleGroup === 'stretch' ? (
                                              <>{exercise.cardioDuration}s hold</>
                                            ) : (
                                              <>
                                                {exercise.resistanceValue}kg ·
                                                {exercise.repsMin}-{exercise.repsMax} reps ·
                                                {exercise.sets} sets
                                              </>
                                            )}
                                          </p>
                                        </div>

                                        {exercise.completed && exercise.muscleGroup !== 'cardio' && exercise.muscleGroup !== 'stretch' && (
                                          <div>
                                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                                              {exercise.actualResistance || exercise.resistanceValue}kg ·
                                              {exercise.actualReps} reps
                                              {exercise.rpe && (
                                                <span className={` ${getRpeColor(exercise.rpe)}`}> · RPE {exercise.rpe}</span>
                                              )}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Session Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Blocks</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{session.blocks.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Exercises</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {session.blocks.reduce((sum: number, b) => sum + b.exercises.length, 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {session.duration ? formatDuration(session.duration) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">RPE</p>
                          <p className={`font-semibold ${getRpeColor(session.overallRpe ?? 0)}`}>{session.overallRpe ?? 0}/10</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="No sessions yet"
          description="Your completed training sessions will appear here"
        />
      )}
    </div>
  );
}
