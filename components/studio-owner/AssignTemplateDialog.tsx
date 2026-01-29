'use client';

import { useState, useEffect } from 'react';
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
import { FileText, Check, Loader2, User, Users } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: string;
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

  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignedTemplateIds, setAssignedTemplateIds] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && targetId) {
      loadData();
    }
  }, [open, targetId, mode]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch available templates
      const templatesResponse = await fetch('/api/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }

      // Fetch already assigned templates based on mode
      const endpoint = mode === 'trainer'
        ? `/api/trainers/${targetId}/templates`
        : `/api/clients/${targetId}/templates`;

      const assignedResponse = await fetch(endpoint);
      if (assignedResponse.ok) {
        const assignedData = await assignedResponse.json();
        const assignedIds = new Set<string>((assignedData.templates || []).map((t: { id: string }) => t.id));
        setAssignedTemplateIds(assignedIds);
        setSelectedTemplates(new Set(assignedIds));
      } else {
        // If endpoint doesn't exist yet, start with empty
        setAssignedTemplateIds(new Set());
        setSelectedTemplates(new Set());
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Find templates to assign (selected but not already assigned)
      const toAssign = [...selectedTemplates].filter(id => !assignedTemplateIds.has(id));

      // Find templates to unassign (was assigned but not selected)
      const toUnassign = [...assignedTemplateIds].filter(id => !selectedTemplates.has(id));

      // Build the body based on mode
      const bodyKey = mode === 'trainer' ? 'trainerId' : 'clientId';

      // Assign new templates
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

      // Unassign removed templates
      for (const templateId of toUnassign) {
        const response = await fetch(`/api/templates/${templateId}/assign?${bodyKey}=${targetId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to unassign template');
        }
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
    if (selectedTemplates.size !== assignedTemplateIds.size) return true;
    for (const id of selectedTemplates) {
      if (!assignedTemplateIds.has(id)) return true;
    }
    return false;
  };

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
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No templates available. Create templates first.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
              `Save (${selectedTemplates.size} selected)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
