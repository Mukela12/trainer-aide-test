"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/lib/hooks/use-templates';
import { useAIPrograms, useAIProgramTemplates, useDeleteAIProgram, usePatchAIProgram, useToggleAIProgramTemplate, useDuplicateAIProgram } from '@/lib/hooks/use-ai-programs';
import { useUserStore } from '@/lib/stores/user-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  FileText,
  Dumbbell,
  Sparkles,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  X,
  Wand2,
  PenTool,
  ChevronRight,
  MoreVertical,
  Archive,
  Bookmark,
} from 'lucide-react';
import type { AIProgram } from '@/lib/types/ai-program';
import ContentHeader from '@/components/shared/ContentHeader';
import { cn } from '@/lib/utils/cn';

// Unified template type
interface ManualTemplate {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'resistance_only';
  blocks: Array<{ exercises: unknown[] }>;
  assignedStudios: string[];
  source: 'manual';
  created_at?: string;
}

interface UnifiedTemplate {
  id: string;
  name: string;
  description: string;
  source: 'manual' | 'ai';
  status?: 'draft' | 'active' | 'completed' | 'archived';
  created_at?: string;
  // Manual template fields
  type?: 'standard' | 'resistance_only';
  blocks?: Array<{ exercises: unknown[] }>;
  assignedStudios?: string[];
  // AI template fields
  total_weeks?: number;
  sessions_per_week?: number;
  session_duration_minutes?: number;
  primary_goal?: string;
  experience_level?: string;
  movement_balance_summary?: Record<string, number | undefined>;
  is_template?: boolean;
}

type SourceFilter = 'all' | 'manual' | 'ai';
type StatusFilter = 'all' | 'draft' | 'active' | 'archived';

export default function UnifiedTemplatesPage() {
  const router = useRouter();
  const deleteTemplateMutation = useDeleteTemplate();
  const duplicateTemplateMutation = useDuplicateTemplate();
  const { currentUser, currentRole } = useUserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  // Determine base path based on role
  const basePath = currentRole === 'studio_owner' ? '/studio-owner' : '/solo';

  // Data fetching via React Query
  const { data: rawManualTemplates = [], isLoading: templatesLoading } = useTemplates(currentUser?.id);
  const { data: aiTemplatesList = [] } = useAIProgramTemplates();
  const { data: aiProgramsList = [] } = useAIPrograms();

  const isLoading = templatesLoading;

  // Compute manualTemplates from rawManualTemplates
  const manualTemplates: ManualTemplate[] = rawManualTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    type: (t.type || 'standard') as 'standard' | 'resistance_only',
    blocks: t.blocks || [],
    assignedStudios: t.assignedStudios || [],
    source: 'manual' as const,
    created_at: t.createdAt,
  }));

  // Compute aiTemplates by merging templates + programs (deduped)
  const aiTemplates = useMemo(() => {
    const templateIds = new Set(aiTemplatesList.map((t) => t.id));
    const uniquePrograms = aiProgramsList.filter((p) => !templateIds.has(p.id));
    return [...aiTemplatesList, ...uniquePrograms];
  }, [aiTemplatesList, aiProgramsList]);

  // Mutation hooks
  const deleteAIMutation = useDeleteAIProgram();
  const patchAIMutation = usePatchAIProgram();
  const toggleTemplateMutation = useToggleAIProgramTemplate();
  const duplicateAIMutation = useDuplicateAIProgram();

  // Combine and filter templates
  const unifiedTemplates = useMemo(() => {
    const manual: UnifiedTemplate[] = manualTemplates.map(t => ({
      ...t,
      source: 'manual' as const,
      status: 'active' as const,
    }));

    const ai: UnifiedTemplate[] = aiTemplates.map(t => ({
      id: t.id,
      name: t.program_name,
      description: t.description || '',
      source: 'ai' as const,
      status: t.status as 'draft' | 'active' | 'completed' | 'archived',
      created_at: t.created_at,
      total_weeks: t.total_weeks,
      sessions_per_week: t.sessions_per_week,
      session_duration_minutes: t.session_duration_minutes ?? undefined,
      primary_goal: t.primary_goal,
      experience_level: t.experience_level,
      movement_balance_summary: t.movement_balance_summary ?? undefined,
      is_template: t.is_template,
    }));

    let combined = [...manual, ...ai];

    // Apply source filter
    if (sourceFilter !== 'all') {
      combined = combined.filter(t => t.source === sourceFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      combined = combined.filter(t => t.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      combined = combined.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    // Sort by created_at descending
    combined.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return combined;
  }, [manualTemplates, aiTemplates, sourceFilter, statusFilter, searchQuery]);

  // Counts for filters
  const counts = useMemo(() => ({
    all: manualTemplates.length + aiTemplates.length,
    manual: manualTemplates.length,
    ai: aiTemplates.length,
    draft: aiTemplates.filter(t => t.status === 'draft').length,
    active: manualTemplates.length + aiTemplates.filter(t => t.status === 'active').length,
    archived: aiTemplates.filter(t => t.status === 'archived').length,
  }), [manualTemplates, aiTemplates]);

  // Handlers
  const handleDeleteManual = async (templateId: string, templateName: string) => {
    if (confirm(`Are you sure you want to delete "${templateName}"? This action cannot be undone.`)) {
      await deleteTemplateMutation.mutateAsync(templateId);
    }
  };

  const handleDuplicateManual = async (templateId: string) => {
    await duplicateTemplateMutation.mutateAsync(templateId);
  };

  const handleDeleteAI = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this AI program? This action cannot be undone.')) {
      return;
    }

    setProcessingId(programId);
    try {
      await deleteAIMutation.mutateAsync(programId);
    } catch {
      alert('Failed to delete program');
    } finally {
      setProcessingId(null);
    }
  };

  const handleArchiveAI = async (program: AIProgram) => {
    setProcessingId(program.id);
    try {
      await patchAIMutation.mutateAsync({
        programId: program.id,
        updates: { status: program.status === 'archived' ? 'draft' : 'archived' },
      });
    } catch {
      alert('Failed to archive program');
    } finally {
      setProcessingId(null);
      setShowMenuId(null);
    }
  };

  const handleToggleTemplate = async (program: AIProgram) => {
    setProcessingId(program.id);
    try {
      await toggleTemplateMutation.mutateAsync({
        programId: program.id,
        isTemplate: !program.is_template,
      });
    } catch {
      alert('Failed to update template status');
    } finally {
      setProcessingId(null);
      setShowMenuId(null);
    }
  };

  const handleDuplicateAI = async (programId: string) => {
    setProcessingId(programId);
    try {
      await duplicateAIMutation.mutateAsync(programId);
    } catch {
      alert('Failed to duplicate program');
    } finally {
      setProcessingId(null);
      setShowMenuId(null);
    }
  };

  // Helper functions
  const getGoalLabel = (goal?: string) => {
    const labels: Record<string, string> = {
      strength: 'Strength',
      hypertrophy: 'Muscle Gain',
      endurance: 'Endurance',
      fat_loss: 'Fat Loss',
      general_fitness: 'General Fitness',
    };
    return goal ? labels[goal] || goal : '';
  };

  const getExperienceLabel = (level?: string) => {
    const labels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return level ? labels[level] || level : '';
  };

  const getStatusBadge = (status?: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return status ? (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    ) : null;
  };

  // Render template card
  const renderTemplateCard = (template: UnifiedTemplate) => {
    if (template.source === 'manual') {
      const totalExercises = template.blocks?.reduce(
        (total, block) => total + block.exercises.length,
        0
      ) || 0;

      return (
        <Card key={template.id} className="flex flex-col dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <CardTitle className="text-base lg:text-lg flex-1 dark:text-gray-100">
                {template.name}
              </CardTitle>
              <Badge
                variant={template.type === 'standard' ? 'default' : 'secondary'}
                className="flex-shrink-0 text-xs"
              >
                {template.type === 'standard' ? '3-Block' : 'Resistance'}
              </Badge>
            </div>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {template.description}
            </p>
          </CardHeader>

          <CardContent className="flex-1 py-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                <FileText size={14} className="flex-shrink-0" />
                <span>{template.blocks?.length || 0} blocks</span>
              </div>
              <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                <Dumbbell size={14} className="flex-shrink-0" />
                <span>{totalExercises} exercises</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 border-t dark:border-gray-700 pt-3">
            <Link href={`${basePath}/templates/builder?id=${template.id}`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs lg:text-sm dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Edit size={14} />
                <span>Edit</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicateManual(template.id)}
              className="gap-1.5 px-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Duplicate"
            >
              <Copy size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteManual(template.id, template.name)}
              className="gap-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          </CardFooter>
        </Card>
      );
    }

    // AI Template Card
    const aiProgram = aiTemplates.find(t => t.id === template.id);
    const totalWorkouts = (template.total_weeks || 0) * (template.sessions_per_week || 0);

    return (
      <Card
        key={template.id}
        className="flex flex-col dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        onClick={() => router.push(`/trainer/programs/${template.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-base lg:text-lg flex-1 dark:text-gray-100 truncate">
              {template.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-wondrous-magenta dark:text-purple-300 text-xs font-medium rounded-full">
                <Sparkles size={12} />
                AI
              </span>
              {getStatusBadge(template.status)}
            </div>
          </div>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {template.description}
          </p>
        </CardHeader>

        <CardContent className="flex-1 py-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Calendar size={14} className="text-gray-400" />
              <span>{template.total_weeks} {template.total_weeks === 1 ? 'week' : 'weeks'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Dumbbell size={14} className="text-gray-400" />
              <span>{template.sessions_per_week}x/week</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Clock size={14} className="text-gray-400" />
              <span>{template.session_duration_minutes || 60} min</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Target size={14} className="text-gray-400" />
              <span>{totalWorkouts} workouts</span>
            </div>
          </div>

          {/* Goal & Experience */}
          <div className="flex flex-wrap gap-1.5">
            {template.primary_goal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                <Target size={12} />
                {getGoalLabel(template.primary_goal)}
              </span>
            )}
            {template.experience_level && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                <TrendingUp size={12} />
                {getExperienceLabel(template.experience_level)}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 border-t dark:border-gray-700 pt-3 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/trainer/programs/${template.id}`);
            }}
            className="flex-1 text-xs lg:text-sm dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateAI(template.id);
            }}
            disabled={processingId === template.id}
            className="gap-1.5 px-3 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Duplicate"
          >
            <Copy size={14} />
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenuId(showMenuId === template.id ? null : template.id);
              }}
              className="px-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <MoreVertical size={14} />
            </Button>

            {showMenuId === template.id && aiProgram && (
              <div
                className="absolute right-0 bottom-full mb-1 z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleToggleTemplate(aiProgram)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  disabled={processingId === template.id}
                >
                  <Bookmark size={14} />
                  {template.is_template ? 'Unmark as Template' : 'Mark as Template'}
                </button>
                <button
                  onClick={() => handleArchiveAI(aiProgram)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  disabled={processingId === template.id}
                >
                  <Archive size={14} />
                  {template.status === 'archived' ? 'Unarchive' : 'Archive'}
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => handleDeleteAI(template.id)}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  disabled={processingId === template.id}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Content Header */}
      <ContentHeader
        context="Create and manage workout templates"
        stats={[
          { label: 'total', value: counts.all, color: 'primary' },
          { label: 'manual', value: counts.manual, color: 'slate' },
          { label: 'AI generated', value: counts.ai, color: 'magenta' },
        ]}
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Template</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 lg:mb-8 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Source Filters */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <Button
              variant={sourceFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSourceFilter('all')}
              className={cn(
                "text-xs",
                sourceFilter === 'all' && "bg-white dark:bg-gray-700 shadow-sm"
              )}
            >
              All ({counts.all})
            </Button>
            <Button
              variant={sourceFilter === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSourceFilter('manual')}
              className={cn(
                "text-xs",
                sourceFilter === 'manual' && "bg-white dark:bg-gray-700 shadow-sm"
              )}
            >
              <PenTool size={14} className="mr-1" />
              Manual ({counts.manual})
            </Button>
            <Button
              variant={sourceFilter === 'ai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSourceFilter('ai')}
              className={cn(
                "text-xs",
                sourceFilter === 'ai' && "bg-white dark:bg-gray-700 shadow-sm"
              )}
            >
              <Sparkles size={14} className="mr-1" />
              AI ({counts.ai})
            </Button>
          </div>

          {/* Status Filters (only show when viewing AI templates) */}
          {(sourceFilter === 'all' || sourceFilter === 'ai') && counts.ai > 0 && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "text-xs",
                  statusFilter === 'all' && "bg-white dark:bg-gray-700 shadow-sm"
                )}
              >
                All Status
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className={cn(
                  "text-xs",
                  statusFilter === 'draft' && "bg-white dark:bg-gray-700 shadow-sm"
                )}
              >
                Draft ({counts.draft})
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  "text-xs",
                  statusFilter === 'active' && "bg-white dark:bg-gray-700 shadow-sm"
                )}
              >
                Active ({counts.active})
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
                className={cn(
                  "text-xs",
                  statusFilter === 'archived' && "bg-white dark:bg-gray-700 shadow-sm"
                )}
              >
                Archived ({counts.archived})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wondrous-magenta border-t-transparent rounded-full animate-spin" />
        </div>
      ) : unifiedTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {unifiedTemplates.map(renderTemplateCard)}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery || sourceFilter !== 'all' || statusFilter !== 'all'
            ? 'No templates found'
            : 'No templates yet'}
          description={
            searchQuery || sourceFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first workout template to get started. You can build one manually or let AI generate one for you.'
          }
          actionLabel={!searchQuery && sourceFilter === 'all' && statusFilter === 'all' ? 'Create Template' : undefined}
          onAction={!searchQuery && sourceFilter === 'all' && statusFilter === 'all' ? () => setShowCreateModal(true) : undefined}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2">
                Create Template
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose how you want to create your workout template
              </p>
            </div>

            <div className="space-y-3">
              {/* Manual Option */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  router.push(`${basePath}/templates/builder`);
                }}
                className="w-full p-4 flex items-start gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  <PenTool size={24} className="text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Build Manually
                    </h3>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use the template builder to create custom workout blocks and exercises
                  </p>
                </div>
              </button>

              {/* AI Option */}
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  router.push('/trainer/programs/new');
                }}
                className="w-full p-4 flex items-start gap-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-600 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Wand2 size={24} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Generate with AI
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      Recommended
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Let AI create a complete program based on client goals and experience level
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              Both options create templates you can use for client sessions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
