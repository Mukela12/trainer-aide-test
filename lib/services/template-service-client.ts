/**
 * Client-side Template Service
 *
 * Uses API routes for template CRUD operations (bypasses RLS via service role)
 */

import { WorkoutTemplate, WorkoutBlock, SignOffMode, TemplateType } from '@/lib/types';

/**
 * Input type for creating a template
 */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  type?: TemplateType;
  blocks: WorkoutBlock[];
  defaultSignOffMode?: SignOffMode;
  alertIntervalMinutes?: number;
  isDefault?: boolean;
}

/**
 * Input type for updating a template
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  type?: TemplateType;
  blocks?: WorkoutBlock[];
  defaultSignOffMode?: SignOffMode;
  alertIntervalMinutes?: number;
  isDefault?: boolean;
}

/**
 * Database template shape (snake_case)
 */
interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  type: 'standard' | 'resistance_only';
  created_by: string;
  studio_id: string | null;
  blocks: WorkoutBlock[];
  default_sign_off_mode: 'full_session' | 'per_block' | 'per_exercise' | null;
  alert_interval_minutes: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database template to frontend format
 */
function dbToTemplate(db: DbTemplate): WorkoutTemplate {
  return {
    id: db.id,
    name: db.name,
    description: db.description || '',
    type: db.type,
    createdBy: db.created_by,
    assignedStudios: db.studio_id ? [db.studio_id] : [],
    blocks: db.blocks || [],
    defaultSignOffMode: db.default_sign_off_mode || undefined,
    alertIntervalMinutes: db.alert_interval_minutes || undefined,
    isDefault: db.is_default,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Get all templates for a user (client-side)
 * Uses API route to bypass RLS
 */
export async function getTemplatesClient(userId: string, studioId?: string | null): Promise<WorkoutTemplate[]> {
  try {
    const params = new URLSearchParams();
    if (studioId) {
      params.set('studioId', studioId);
    }

    const response = await fetch(`/api/templates?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching templates:', error);
      return [];
    }

    const { templates } = await response.json();
    return (templates as DbTemplate[]).map(dbToTemplate);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

/**
 * Get a single template by ID (client-side)
 * Uses API route to bypass RLS
 */
export async function getTemplateByIdClient(templateId: string): Promise<WorkoutTemplate | null> {
  try {
    const response = await fetch(`/api/templates/${templateId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      console.error('Error fetching template:', error);
      return null;
    }

    const { template } = await response.json();
    return template ? dbToTemplate(template as DbTemplate) : null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Create a new template (client-side)
 * Uses API route to bypass RLS
 */
export async function createTemplateClient(input: CreateTemplateInput): Promise<WorkoutTemplate | null> {
  try {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description || '',
        type: input.type || 'standard',
        blocks: input.blocks,
        defaultSignOffMode: input.defaultSignOffMode,
        alertIntervalMinutes: input.alertIntervalMinutes,
        isDefault: input.isDefault || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating template:', error);
      return null;
    }

    const { template } = await response.json();
    return template ? dbToTemplate(template as DbTemplate) : null;
  } catch (error) {
    console.error('Error creating template:', error);
    return null;
  }
}

/**
 * Update a template (client-side)
 * Uses API route to bypass RLS
 */
export async function updateTemplateClient(
  templateId: string,
  updates: UpdateTemplateInput
): Promise<WorkoutTemplate | null> {
  try {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating template:', error);
      return null;
    }

    const { template } = await response.json();
    return template ? dbToTemplate(template as DbTemplate) : null;
  } catch (error) {
    console.error('Error updating template:', error);
    return null;
  }
}

/**
 * Delete a template (client-side)
 * Uses API route to bypass RLS
 */
export async function deleteTemplateClient(templateId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting template:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
}

/**
 * Duplicate a template (client-side)
 * Creates a copy of an existing template with a new name
 */
export async function duplicateTemplateClient(templateId: string): Promise<WorkoutTemplate | null> {
  try {
    // First fetch the existing template
    const existing = await getTemplateByIdClient(templateId);
    if (!existing) {
      console.error('Template not found for duplication');
      return null;
    }

    // Create a new template with copied data
    return createTemplateClient({
      name: `${existing.name} (Copy)`,
      description: existing.description,
      type: existing.type,
      blocks: existing.blocks,
      defaultSignOffMode: existing.defaultSignOffMode,
      alertIntervalMinutes: existing.alertIntervalMinutes,
      isDefault: false, // Never duplicate as default
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    return null;
  }
}
