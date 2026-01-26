import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkoutTemplate } from '@/lib/types';

interface TemplateState {
  templates: WorkoutTemplate[];
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;

  // Fetch templates from Supabase
  fetchTemplates: (userId: string, studioId?: string | null) => Promise<void>;

  // Template management (with database persistence)
  addTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<WorkoutTemplate | null>;
  updateTemplate: (templateId: string, updates: Partial<WorkoutTemplate>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  setTemplates: (templates: WorkoutTemplate[]) => void;
  clearTemplates: () => void;

  // Getters
  getTemplateById: (templateId: string) => WorkoutTemplate | undefined;
  getTemplatesByStudio: (studioId: string) => WorkoutTemplate[];
  getActiveTemplates: () => WorkoutTemplate[];
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      isLoading: false,
      error: null,
      isSaving: false,

      fetchTemplates: async (userId: string, studioId?: string | null) => {
        set({ isLoading: true, error: null });

        try {
          // Use client-side service (browser Supabase client)
          const { getTemplatesClient } = await import('@/lib/services/template-service-client');
          const templates = await getTemplatesClient(userId, studioId);

          set({
            templates,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error fetching templates:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch templates',
            isLoading: false,
          });
        }
      },

      setTemplates: (templates) => set({ templates }),

      clearTemplates: () => set({ templates: [], error: null }),

      addTemplate: async (templateData) => {
        set({ isSaving: true });

        try {
          const { createTemplateClient } = await import('@/lib/services/template-service-client');
          const created = await createTemplateClient({
            name: templateData.name,
            description: templateData.description,
            type: templateData.type,
            blocks: templateData.blocks,
            defaultSignOffMode: templateData.defaultSignOffMode,
            alertIntervalMinutes: templateData.alertIntervalMinutes,
            isDefault: templateData.isDefault,
          });

          if (created) {
            set((state) => ({
              templates: [...state.templates, created],
              isSaving: false,
            }));
            return created;
          } else {
            set({ isSaving: false, error: 'Failed to create template' });
            return null;
          }
        } catch (error) {
          console.error('Error creating template:', error);
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to create template',
          });
          return null;
        }
      },

      updateTemplate: async (templateId, updates) => {
        // Optimistic update
        set((state) => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));

        // Persist to database
        try {
          const { updateTemplateClient } = await import('@/lib/services/template-service-client');
          await updateTemplateClient(templateId, updates);
        } catch (error) {
          console.error('Error persisting template update:', error);
        }
      },

      deleteTemplate: async (templateId) => {
        // Optimistic update
        set((state) => ({
          templates: state.templates.filter(t => t.id !== templateId),
        }));

        // Persist to database
        try {
          const { deleteTemplateClient } = await import('@/lib/services/template-service-client');
          await deleteTemplateClient(templateId);
        } catch (error) {
          console.error('Error deleting template from database:', error);
        }
      },

      duplicateTemplate: async (templateId) => {
        set({ isSaving: true });

        try {
          const { duplicateTemplateClient } = await import('@/lib/services/template-service-client');
          const duplicated = await duplicateTemplateClient(templateId);

          if (duplicated) {
            set((state) => ({
              templates: [...state.templates, duplicated],
              isSaving: false,
            }));
            return duplicated;
          } else {
            set({ isSaving: false, error: 'Failed to duplicate template' });
            return null;
          }
        } catch (error) {
          console.error('Error duplicating template:', error);
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to duplicate template',
          });
          return null;
        }
      },

      getTemplateById: (templateId) => {
        return get().templates.find(t => t.id === templateId);
      },

      getTemplatesByStudio: (studioId) => {
        return get().templates.filter(t => t.assignedStudios.includes(studioId));
      },

      getActiveTemplates: () => {
        return get().templates;
      },
    }),
    {
      name: 'trainer-aide-templates',
      partialize: (state) => ({
        templates: state.templates,
      }),
    }
  )
);
