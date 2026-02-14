'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Dumbbell, MoreVertical, Target, TrendingUp, Edit, Copy, Bookmark, Archive, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssignClientModal } from './AssignClientModal';
import { useDuplicateAIProgram, useToggleAIProgramTemplate, usePatchAIProgram, useDeleteAIProgram } from '@/lib/hooks/use-ai-programs';
import type { AIProgram } from '@/lib/types/ai-program';

interface ProgramCardProps {
  program: AIProgram;
  onUpdate?: () => void;
}

export function ProgramCard({ program, onUpdate }: ProgramCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const duplicateMutation = useDuplicateAIProgram();
  const toggleTemplateMutation = useToggleAIProgramTemplate();
  const patchMutation = usePatchAIProgram();
  const deleteMutation = useDeleteAIProgram();

  const isProcessing = duplicateMutation.isPending || toggleTemplateMutation.isPending || patchMutation.isPending || deleteMutation.isPending;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleViewProgram = () => {
    router.push(`/trainer/programs/${program.id}`);
  };

  const handleEdit = () => {
    setShowMenu(false);
    router.push(`/trainer/programs/${program.id}/edit`);
  };

  const handleDuplicate = async () => {
    setShowMenu(false);
    try {
      const duplicated = await duplicateMutation.mutateAsync(program.id);
      onUpdate?.();
      router.push(`/trainer/programs/${duplicated.id}`);
    } catch {
      alert('Failed to duplicate program');
    }
  };

  const handleToggleTemplate = async () => {
    setShowMenu(false);
    try {
      await toggleTemplateMutation.mutateAsync({ programId: program.id, isTemplate: !program.is_template });
      onUpdate?.();
    } catch {
      alert('Failed to update template status');
    }
  };

  const handleArchive = async () => {
    setShowMenu(false);
    try {
      await patchMutation.mutateAsync({ programId: program.id, updates: { status: program.status === 'archived' ? 'draft' : 'archived' } });
      onUpdate?.();
    } catch {
      alert('Failed to archive program');
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync(program.id);
      onUpdate?.();
    } catch {
      alert('Failed to delete program');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getGoalLabel = (goal?: string) => {
    const labels: Record<string, string> = {
      strength: 'Strength',
      hypertrophy: 'Muscle Gain',
      endurance: 'Endurance',
      fat_loss: 'Fat Loss',
      general_fitness: 'General Fitness',
    };
    return goal ? labels[goal] || goal : 'Not set';
  };

  const getExperienceLabel = (level?: string) => {
    const labels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return level ? labels[level] || level : 'Not set';
  };

  const totalWorkouts = program.total_weeks * program.sessions_per_week;

  const getMovementPatternCount = () => {
    if (!program.movement_balance_summary) return 0;
    return Object.keys(program.movement_balance_summary).length;
  };

  const getTotalExercises = () => {
    if (!program.movement_balance_summary) return 0;
    return Object.values(program.movement_balance_summary)
      .filter((count): count is number => typeof count === 'number')
      .reduce((sum, count) => sum + count, 0);
  };

  return (
    <>
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={handleViewProgram}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 truncate">
                {program.program_name}
              </h3>
              {getStatusBadge(program.status)}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar size={16} />
                <span>
                  {program.total_weeks} {program.total_weeks === 1 ? 'week' : 'weeks'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Dumbbell size={16} />
                <span>{program.sessions_per_week}x/week</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={16} />
                <span>{totalWorkouts} workouts</span>
              </div>
            </div>

            {/* Description */}
            {program.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {program.description}
              </p>
            )}

            {/* Goal & Experience */}
            <div className="flex flex-wrap gap-2 mb-3">
              {program.primary_goal && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                  <Target size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    {getGoalLabel(program.primary_goal)}
                  </span>
                </div>
              )}
              {program.experience_level && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                  <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {getExperienceLabel(program.experience_level)}
                  </span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {getTotalExercises()}
                </span>{' '}
                exercises
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {getMovementPatternCount()}
                </span>{' '}
                movement patterns
              </div>
            </div>

            {/* Created Date */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created {new Date(program.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })} • AI Generated
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 relative" ref={menuRef}>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={16} />
            </Button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <Edit size={16} />
                  Edit Program
                </button>
                <button
                  onClick={handleDuplicate}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  disabled={isProcessing}
                >
                  <Copy size={16} />
                  Duplicate
                </button>
                <button
                  onClick={handleToggleTemplate}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  disabled={isProcessing}
                >
                  <Bookmark size={16} />
                  {program.is_template ? 'Remove from Templates' : 'Save as Template'}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700"></div>
                <button
                  onClick={handleArchive}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  disabled={isProcessing}
                >
                  <Archive size={16} />
                  {program.status === 'archived' ? 'Unarchive' : 'Archive'}
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  disabled={isProcessing}
                >
                  <Trash2 size={16} />
                  Delete Program
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewProgram();
            }}
            className="flex-1"
          >
            View Program
          </Button>
          {program.status === 'draft' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignModal(true);
              }}
              className="flex-1 bg-wondrous-primary hover:bg-purple-700 text-white"
            >
              Assign to Client
            </Button>
          )}
          {program.status === 'active' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: View progress
              }}
              className="flex-1 bg-wondrous-primary hover:bg-purple-700 text-white"
            >
              View Progress
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Assign Client Modal */}
    {showAssignModal && (
      <AssignClientModal
        programId={program.id}
        programName={program.program_name}
        onClose={() => setShowAssignModal(false)}
        onAssigned={() => {
          setShowAssignModal(false);
          if (onUpdate) onUpdate();
        }}
      />
    )}
    </>
  );
}
