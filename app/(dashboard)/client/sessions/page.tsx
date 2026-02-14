"use client";

import { useState } from 'react';
import { useSessionData } from '@/lib/hooks/use-sessions';
import { useUserStore } from '@/lib/stores/user-store';
import { useExerciseLookup } from '@/lib/hooks/use-exercise';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import ContentHeader from '@/components/shared/ContentHeader';
import { formatDuration } from '@/lib/utils/generators';
import { Dumbbell, Calendar, Clock, TrendingUp, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientSessionHistory() {
  const { currentUser } = useUserStore();
  const { sessions } = useSessionData(currentUser.id);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const { getExercise, isLoading: isLoadingExercises } = useExerciseLookup();

  // Use the authenticated user's ID to filter sessions
  const clientId = currentUser.id;

  // Filter completed sessions for this client
  const clientSessions = sessions
    .filter((s) => s.clientId === clientId && s.completed)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Content Header */}
      <ContentHeader
        context="View all your completed training sessions"
        stats={[
          { label: 'completed', value: clientSessions.length, color: 'success' },
        ]}
      />

      {/* Sessions List */}
      {clientSessions.length > 0 ? (
        <div className="space-y-4">
          {clientSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;

            return (
              <Card key={session.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{session.sessionName}</CardTitle>
                        <Badge variant="success">Completed</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{session.template?.name || 'Custom Session'}</p>

                      {/* Session Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {session.completedAt && format(new Date(session.completedAt), 'MMM d, yyyy')}
                        </span>
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDuration(session.duration)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <TrendingUp size={14} />
                          Overall RPE: {session.overallRpe}/10
                        </span>
                        <span className="capitalize text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {session.signOffMode.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpanded(session.id)}
                      className="whitespace-nowrap"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={16} className="mr-2" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} className="mr-2" />
                          View Details
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    {/* Trainer Notes */}
                    {session.publicNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 mt-4">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                          <FileText size={16} />
                          Trainer Notes
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">&quot;{session.publicNotes}&quot;</p>
                      </div>
                    )}

                    {/* Workout Details */}
                    <div className="space-y-4 mt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Workout Details</h4>

                      {session.blocks.map((block) => (
                        <div key={block.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100">{block.name}</h5>
                            {block.completed && (
                              <Badge variant="success" className="text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-3">
                            {block.exercises.map((exercise) => {
                              const exerciseData = getExercise(exercise.exerciseId);
                              if (!exerciseData) return null;

                              return (
                                <div
                                  key={exercise.id}
                                  className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-wondrous-blue-light flex items-center justify-center flex-shrink-0">
                                      <span className="text-sm font-semibold text-wondrous-dark-blue">
                                        {exercise.position}
                                      </span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{exerciseData.name}</span>
                                        <Badge variant="outline" className="capitalize text-xs">
                                          {exercise.muscleGroup}
                                        </Badge>
                                      </div>

                                      {/* Target vs Actual */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target</p>
                                          <p className="text-gray-700 dark:text-gray-300">
                                            {exercise.muscleGroup === 'cardio' ? (
                                              <>
                                                {Math.floor((exercise.cardioDuration || 0) / 60)} min •
                                                Intensity {exercise.cardioIntensity}/10
                                              </>
                                            ) : exercise.muscleGroup === 'stretch' ? (
                                              <>{exercise.cardioDuration}s hold</>
                                            ) : (
                                              <>
                                                {exercise.resistanceValue}kg •
                                                {exercise.repsMin}-{exercise.repsMax} reps •
                                                {exercise.sets} sets
                                              </>
                                            )}
                                          </p>
                                        </div>

                                        {exercise.completed && exercise.muscleGroup !== 'cardio' && exercise.muscleGroup !== 'stretch' && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Actual Performance</p>
                                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                                              {exercise.actualResistance || exercise.resistanceValue}kg •
                                              {exercise.actualReps} reps
                                              {exercise.rpe && (
                                                <>
                                                  {' '}
                                                  • <span className="text-wondrous-primary">RPE {exercise.rpe}/10</span>
                                                </>
                                              )}
                                            </p>
                                          </div>
                                        )}

                                        {exercise.completed && (exercise.muscleGroup === 'cardio' || exercise.muscleGroup === 'stretch') && exercise.rpe && (
                                          <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Intensity</p>
                                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                                              <span className="text-wondrous-primary">RPE {exercise.rpe}/10</span>
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

                    {/* Overall Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Session Summary</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Total Blocks</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{session.blocks.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Total Exercises</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {session.blocks.reduce((sum, b) => sum + b.exercises.length, 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Duration</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {session.duration ? formatDuration(session.duration) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Overall RPE</p>
                          <p className="font-semibold text-wondrous-primary">{session.overallRpe}/10</p>
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
