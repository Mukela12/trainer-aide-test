'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { FileText, Check, Loader2, User, Users, Sparkles } from 'lucide-react';
import { useTemplates } from '@/lib/hooks/use-templates';
import { useAIProgramTemplates, useAssignAIProgram } from '@/lib/hooks/use-ai-programs';
import { useUserStore } from '@/lib/stores/user-store';

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: string;
}

interface AIProgram {
  id: string;
  program_name: string;
  description: string | null;
  primary_goal: string;
  experience_level: string;
  total_weeks: number;
  sessions_per_week: number;
}

type AssignmentMode = 'trainer' | 'client';

interface AssignTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // For trainer assignment
  trainerId?: string;
  trainerName?: string;
  // For client assignment
  clientId?: string;
  clientName?: string;
  // Callback
  onSuccess?: () => void;
}

export function AssignTemplateDialog({
  open,
  onOpenChange,
  trainerId,
  trainerName,
  clientId,
  clientName,
  onSuccess,
}: AssignTemplateDialogProps) {
  // Determine mode based on props
  const mode: AssignmentMode = clientId ? 'client' : 'trainer';
  const targetId = clientId || trainerId;
  const targetName = clientName || trainerName;

  const queryClient = useQueryClient();
  const currentUser = useUserStore((s) => s.currentUser);
  const assignAIProgram = useAssignAIProgram();

  // --- React Query: all templates ---
  const { data: allTemplatesRaw = [], isLoading: templatesLoading } = useTemplates(currentUser?.id);

  // Cast WorkoutTemplate[] to the local Template interface
  const templates = useMemo<Template[]>(
    () => allTemplatesRaw.map((t) => ({ id: t.id, name: t.name, description: t.description || null, type: t.type })),
    [allTemplatesRaw],
  );

  // --- React Query: AI program templates ---
  const { data: aiProgramTemplatesRaw = [], isLoading: aiTemplatesLoading } = useAIProgramTemplates();

  // Only show AI programs in trainer mode
  const aiPrograms = useMemo<AIProgram[]>(
    () =>
      mode === 'trainer'
        ? aiProgramTemplatesRaw.map((p) => ({
            id: p.id,
            program_name: p.program_name,
            description: p.description ?? null,
            primary_goal: p.primary_goal,
            experience_level: p.experience_level,
            total_weeks: p.total_weeks,
            sessions_per_week: p.sessions_per_week,
          }))
        : [],
    [aiProgramTemplatesRaw, mode],
  );

  // --- React Query: assigned regular templates ---
  const assignedEndpoint =
    mode === 'trainer'
      ? `/api/trainers/${targetId}/templates`
      : `/api/clients/${targetId}/templates`;

  const { data: assignedTemplateData } = useQuery({
    queryKey: ['assigned-templates', mode, targetId],
    queryFn: async () => {
      const res = await fetch(assignedEndpoint);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.templates || []) as Array<{ id: string }>;
    },
    enabled: open && !!targetId,
  });

  // --- React Query: assigned AI programs (trainer mode only) ---
  const { data: assignedAIProgramData } = useQuery({
    queryKey: ['assigned-ai-programs', targetId],
    queryFn: async () => {
      const res = await fetch(`/api/trainers/${targetId}/ai-programs`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.aiPrograms || []) as Array<{ id: string }>;
    },
    enabled: open && !!targetId && mode === 'trainer',
  });

  // --- Derived sets ---
  const assignedTemplateIds = useMemo(
    () => new Set(assignedTemplateData?.map((t) => t.id) || []),
    [assignedTemplateData],
  );

  const assignedAIProgramIds = useMemo(
    () => new Set(assignedAIProgramData?.map((p) => p.id) || []),
    [assignedAIProgramData],
  );

  // --- Selection state ---
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [selectedAIPrograms, setSelectedAIPrograms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selection state when assigned data loads
  useEffect(() => {
    setSelectedTemplates(new Set(assignedTemplateIds));
  }, [assignedTemplateIds]);

  useEffect(() => {
    setSelectedAIPrograms(new Set(assignedAIProgramIds));
  }, [assignedAIProgramIds]);

  // Derive loading from query states
  const loading = templatesLoading || aiTemplatesLoading;

  const toggleTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const toggleAIProgram = (programId: string) => {
    const newSelected = new Set(selectedAIPrograms);
    if (newSelected.has(programId)) {
      newSelected.delete(programId);
    } else {
      newSelected.add(programId);
    }
    setSelectedAIPrograms(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Find regular templates to assign/unassign
      const toAssign = [...selectedTemplates].filter(id => !assignedTemplateIds.has(id));
      const toUnassign = [...assignedTemplateIds].filter(id => !selectedTemplates.has(id));

      // Build the body based on mode
      const bodyKey = mode === 'trainer' ? 'trainerId' : 'clientId';

      // Assign new regular templates
      for (const templateId of toAssign) {
        const response = await fetch(`/api/templates/${templateId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [bodyKey]: targetId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to assign template');
        }
      }

      // Unassign removed regular templates
      for (const templateId of toUnassign) {
        const response = await fetch(`/api/templates/${templateId}/assign?${bodyKey}=${targetId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to unassign template');
        }
      }

      // Handle AI program assignments (only for trainer mode)
      if (mode === 'trainer') {
        const aiToAssign = [...selectedAIPrograms].filter(id => !assignedAIProgramIds.has(id));
        const aiToUnassign = [...assignedAIProgramIds].filter(id => !selectedAIPrograms.has(id));

        // Assign new AI programs via useAssignAIProgram hook
        for (const programId of aiToAssign) {
          await assignAIProgram.mutateAsync({ programId, trainerId: targetId });
        }

        // Unassign removed AI programs
        for (const programId of aiToUnassign) {
          const response = await fetch(`/api/ai-programs/${programId}/assign?trainer_id=${targetId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to unassign AI program');
          }
        }
      }

      // Invalidate the assigned queries so they refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['assigned-templates', mode, targetId] });
      if (mode === 'trainer') {
        await queryClient.invalidateQueries({ queryKey: ['assigned-ai-programs', targetId] });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    // Check regular template changes
    if (selectedTemplates.size !== assignedTemplateIds.size) return true;
    for (const id of selectedTemplates) {
      if (!assignedTemplateIds.has(id)) return true;
    }

    // Check AI program changes (only in trainer mode)
    if (mode === 'trainer') {
      if (selectedAIPrograms.size !== assignedAIProgramIds.size) return true;
      for (const id of selectedAIPrograms) {
        if (!assignedAIProgramIds.has(id)) return true;
      }
    }

    return false;
  };

  const totalSelected = selectedTemplates.size + selectedAIPrograms.size;

  const getModeInfo = () => {
    if (mode === 'trainer') {
      return {
        icon: User,
        title: 'Assign Templates to Trainer',
        description: `Select templates to add to ${targetName}'s toolkit. They can use these on any of their clients.`,
        badge: 'Trainer Toolkit',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      };
    }
    return {
      icon: Users,
      title: 'Assign Templates to Client',
      description: `Select templates for ${targetName}. All studio staff can use these when working with this client.`,
      badge: 'Client-Specific',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    };
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              mode === 'trainer' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
            )}>
              <ModeIcon className={cn(
                'w-5 h-5',
                mode === 'trainer' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
              )} />
            </div>
            <div>
              <DialogTitle className="dark:text-gray-100">{modeInfo.title}</DialogTitle>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', modeInfo.badgeColor)}>
                {modeInfo.badge}
              </span>
            </div>
          </div>
          <DialogDescription className="dark:text-gray-400 mt-2">
            {modeInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 && aiPrograms.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No templates available. Create templates first.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {/* AI Programs Section (only for trainer mode) */}
              {mode === 'trainer' && aiPrograms.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-wondrous-magenta" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      AI Programs ({aiPrograms.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {aiPrograms.map((program) => (
                      <button
                        key={program.id}
                        onClick={() => toggleAIProgram(program.id)}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-colors',
                          selectedAIPrograms.has(program.id)
                            ? 'border-wondrous-magenta bg-wondrous-magenta/10 dark:bg-wondrous-magenta/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {program.program_name}
                              </p>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-wondrous-magenta text-xs rounded-full">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </span>
                            </div>
                            {program.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {program.description}
                              </p>
                            )}
                            <span className="inline-block text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {program.total_weeks} weeks • {program.sessions_per_week}x/week • {program.experience_level}
                            </span>
                          </div>
                          {selectedAIPrograms.has(program.id) && (
                            <Check className="w-5 h-5 text-wondrous-magenta flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Templates Section */}
              {templates.length > 0 && (
                <div>
                  {mode === 'trainer' && aiPrograms.length > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Manual Templates ({templates.length})
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => toggleTemplate(template.id)}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-colors',
                          selectedTemplates.has(template.id)
                            ? 'border-wondrous-magenta bg-wondrous-magenta/10 dark:bg-wondrous-magenta/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {template.name}
                            </p>
                            {template.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <span className="inline-block text-xs text-gray-400 dark:text-gray-500 mt-1 capitalize">
                              {template.type}
                            </span>
                          </div>
                          {selectedTemplates.has(template.id) && (
                            <Check className="w-5 h-5 text-wondrous-magenta flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="dark:border-gray-600 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="bg-wondrous-magenta hover:bg-wondrous-magenta-dark"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              `Save (${totalSelected} selected)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
