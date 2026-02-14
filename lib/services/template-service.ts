/**
 * Template Service
 *
 * Business logic for workout template operations.
 * Extracted from api/templates route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOrCreateStudio } from '@/lib/services/studio-service';

/**
 * Create a new workout template.
 */
export async function createTemplate(params: {
  userId: string;
  studioId: string | null | undefined;
  role: string;
  firstName?: string;
  body: {
    name: string;
    description?: string;
    blocks?: unknown;
    jsonDefinition?: unknown;
    defaultSignOffMode?: string;
    signOffMode?: string;
    isDefault?: boolean;
  };
}): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Get or create studio_id
    let studioId = params.studioId;

    if (!studioId) {
      const { data: studio, error: studioError } = await getOrCreateStudio(
        params.userId,
        params.role,
        params.firstName
      );

      if (studioError || !studio) {
        return { data: null, error: studioError || new Error('Could not create studio') };
      }

      studioId = studio.id;
    }

    // Convert camelCase to snake_case for database
    const templateData = {
      name: params.body.name,
      title: params.body.name,
      description: params.body.description || null,
      created_by: params.userId,
      studio_id: studioId,
      trainer_id: params.userId,
      json_definition: params.body.blocks || params.body.jsonDefinition || null,
      sign_off_mode: params.body.defaultSignOffMode || params.body.signOffMode || 'full_session',
      is_default: params.body.isDefault || false,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('ta_workout_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get a template by ID.
 */
export async function getTemplateById(
  templateId: string
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('ta_workout_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching template:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a template by ID.
 */
export async function updateTemplate(
  templateId: string,
  input: {
    name?: string;
    description?: string;
    type?: string;
    blocks?: unknown;
    defaultSignOffMode?: string;
    alertIntervalMinutes?: number;
    isDefault?: boolean;
  }
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Build update object with camelCase → snake_case mapping
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.blocks !== undefined) updateData.blocks = input.blocks;
    if (input.defaultSignOffMode !== undefined) updateData.default_sign_off_mode = input.defaultSignOffMode;
    if (input.alertIntervalMinutes !== undefined) updateData.alert_interval_minutes = input.alertIntervalMinutes;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('ta_workout_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a template by ID. Only the creator may delete.
 */
export async function deleteTemplate(
  templateId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Check template exists and get created_by
    const { data: existing, error: fetchError } = await supabase
      .from('ta_workout_templates')
      .select('created_by')
      .eq('id', templateId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching template for delete:', fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    if (!existing) {
      return { data: null, error: new Error('Template not found') };
    }

    if (existing.created_by !== userId) {
      return { data: null, error: new Error('Forbidden: You can only delete templates you created') };
    }

    const { error } = await supabase
      .from('ta_workout_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Assign a template to a trainer.
 */
export async function assignTemplateToTrainer(
  templateId: string,
  trainerId: string,
  assignedBy: string
): Promise<{ data: { id: string; templateId: string; trainerId: string; assignedAt: string } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('ta_workout_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError) {
      return { data: null, error: new Error(templateError.message) };
    }

    if (!template) {
      return { data: null, error: new Error('Template not found') };
    }

    const { data: assignment, error } = await supabase
      .from('ta_trainer_template_assignments')
      .insert({
        template_id: templateId,
        trainer_id: trainerId,
        assigned_by: assignedBy,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error('Template already assigned to this trainer') };
      }
      console.error('Error assigning template to trainer:', error);
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        id: assignment.id,
        templateId: assignment.template_id,
        trainerId: assignment.trainer_id,
        assignedAt: assignment.assigned_at,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Assign a template to a client.
 */
export async function assignTemplateToClient(
  templateId: string,
  clientId: string,
  assignedBy: string
): Promise<{ data: { id: string; templateId: string; clientId: string; assignedAt: string } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('ta_workout_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError) {
      return { data: null, error: new Error(templateError.message) };
    }

    if (!template) {
      return { data: null, error: new Error('Template not found') };
    }

    const { data: assignment, error } = await supabase
      .from('ta_client_template_assignments')
      .insert({
        template_id: templateId,
        client_id: clientId,
        assigned_by: assignedBy,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error('Template already assigned to this client') };
      }
      console.error('Error assigning template to client:', error);
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        id: assignment.id,
        templateId: assignment.template_id,
        clientId: assignment.client_id,
        assignedAt: assignment.assigned_at,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Unassign a template from a trainer.
 */
export async function unassignTemplateFromTrainer(
  templateId: string,
  trainerId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_trainer_template_assignments')
      .delete()
      .eq('template_id', templateId)
      .eq('trainer_id', trainerId);

    if (error) {
      console.error('Error removing trainer template assignment:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Unassign a template from a client.
 */
export async function unassignTemplateFromClient(
  templateId: string,
  clientId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_client_template_assignments')
      .delete()
      .eq('template_id', templateId)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error removing client template assignment:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
