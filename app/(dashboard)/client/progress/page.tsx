"use client";

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/stores/user-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  Scale,
  Ruler,
  Heart,
  Calendar,
  ChevronRight,
  Trophy,
  Flame,
} from 'lucide-react';
import { format } from 'date-fns';

interface Goal {
  id: string;
  goal_type: string;
  description: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  start_date: string;
  target_date: string | null;
  status: 'active' | 'achieved' | 'abandoned' | 'paused';
  priority: number;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  title: string;
  target_value: number | null;
  target_date: string | null;
  status: 'pending' | 'achieved' | 'missed';
  achieved_at: string | null;
}

interface BodyMetric {
  id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
}

interface ProgressSummary {
  latest_weight: number | null;
  latest_body_fat: number | null;
  active_goals: number;
  achieved_goals: number;
  last_measurement_date: string | null;
}

const goalTypeLabels: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  strength: 'Strength',
  endurance: 'Endurance',
  flexibility: 'Flexibility',
  general_fitness: 'General Fitness',
  custom: 'Custom Goal',
};

const goalTypeIcons: Record<string, typeof Target> = {
  weight_loss: Scale,
  muscle_gain: Flame,
  strength: TrendingUp,
  endurance: Heart,
  flexibility: Ruler,
  general_fitness: Target,
  custom: Target,
};

export default function ClientProgressPage() {
  const { currentUser } = useUserStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return;

      try {
        const [goalsRes, metricsRes, progressRes] = await Promise.all([
          fetch(`/api/clients/${currentUser.id}/goals`),
          fetch(`/api/clients/${currentUser.id}/metrics?limit=10`),
          fetch(`/api/clients/${currentUser.id}/progress`),
        ]);

        if (goalsRes.ok) {
          const data = await goalsRes.json();
          setGoals(data.goals || []);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics || []);
        }

        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgress(data.progress);
        }
      } catch (err) {
        console.error('Error fetching progress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  const calculateGoalProgress = (goal: Goal): number => {
    if (!goal.target_value || goal.current_value === null) return 0;
    const progress = (goal.current_value / goal.target_value) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const achievedGoals = goals.filter((g) => g.status === 'achieved');

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 dark:text-gray-100 mb-2">My Progress</h1>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">
          Track your fitness journey and celebrate your achievements
        </p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress?.active_goals || activeGoals.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Active Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Trophy className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress?.achieved_goals || achievedGoals.length}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Achieved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Scale className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress?.latest_weight ? `${progress.latest_weight}kg` : 'N/A'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Current Weight</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress?.latest_body_fat ? `${progress.latest_body_fat}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Body Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Active Goals</h2>
        </div>

        {activeGoals.length > 0 ? (
          <div className="grid gap-4">
            {activeGoals.map((goal) => {
              const GoalIcon = goalTypeIcons[goal.goal_type] || Target;
              const progressPercent = calculateGoalProgress(goal);

              return (
                <Card
                  key={goal.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedGoal(selectedGoal?.id === goal.id ? null : goal)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <GoalIcon className="text-blue-600" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {goal.description}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {goalTypeLabels[goal.goal_type] || goal.goal_type}
                          </Badge>
                        </div>

                        {goal.target_value && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {goal.current_value || 0} / {goal.target_value} {goal.target_unit || ''}
                              </span>
                              <span className="font-medium text-blue-600">{Math.round(progressPercent)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Started {format(new Date(goal.start_date), 'MMM d, yyyy')}
                          </span>
                          {goal.target_date && (
                            <span className="flex items-center gap-1">
                              <Target size={12} />
                              Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>

                        {/* Milestones */}
                        {selectedGoal?.id === goal.id && goal.milestones && goal.milestones.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Milestones
                            </h4>
                            <div className="space-y-2">
                              {goal.milestones.map((milestone) => (
                                <div
                                  key={milestone.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                      milestone.status === 'achieved'
                                        ? 'bg-green-500'
                                        : milestone.status === 'missed'
                                        ? 'bg-red-500'
                                        : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                  >
                                    {milestone.status === 'achieved' && (
                                      <Trophy size={10} className="text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={
                                      milestone.status === 'achieved'
                                        ? 'line-through text-gray-500'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }
                                  >
                                    {milestone.title}
                                  </span>
                                  {milestone.target_value && (
                                    <span className="text-gray-500">
                                      ({milestone.target_value})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={`text-gray-400 transition-transform ${
                          selectedGoal?.id === goal.id ? 'rotate-90' : ''
                        }`}
                        size={20}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500">
              <Target className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium mb-2">No active goals</p>
              <p className="text-sm">Your trainer will set goals for you to track your progress</p>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Measurements */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-2 dark:text-gray-100">Recent Measurements</h2>
        </div>

        {metrics.length > 0 ? (
          <div className="grid gap-4">
            {metrics.slice(0, 5).map((metric) => (
              <Card key={metric.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(metric.recorded_at), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metric.weight_kg && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Weight</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {metric.weight_kg} kg
                        </p>
                      </div>
                    )}
                    {metric.body_fat_percent && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Body Fat</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {metric.body_fat_percent}%
                        </p>
                      </div>
                    )}
                    {metric.chest_cm && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Chest</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {metric.chest_cm} cm
                        </p>
                      </div>
                    )}
                    {metric.waist_cm && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Waist</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {metric.waist_cm} cm
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500">
              <Scale className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-lg font-medium mb-2">No measurements recorded</p>
              <p className="text-sm">Your trainer will record your body measurements during sessions</p>
            </div>
          </Card>
        )}
      </div>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-2 dark:text-gray-100">Achieved Goals</h2>
          </div>
          <div className="grid gap-4">
            {achievedGoals.map((goal) => {
              const GoalIcon = goalTypeIcons[goal.goal_type] || Target;

              return (
                <Card key={goal.id} className="bg-green-50/50 dark:bg-green-900/10 border-green-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="text-green-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {goal.description}
                          </h3>
                          <Badge variant="success" className="text-xs">
                            Achieved
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {goalTypeLabels[goal.goal_type] || goal.goal_type}
                          {goal.target_value && ` - ${goal.target_value} ${goal.target_unit || ''}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
