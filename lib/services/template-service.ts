/**
 * Template Service
 *
 * CRUD operations for ta_workout_templates table in Wondrous database.
 */

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { WorkoutTemplate, WorkoutBlock } from '@/lib/types'

/**
 * Database template shape (snake_case)
 */
interface DbTemplate {
  id: string
  name: string
  description: string | null
  type: 'standard' | 'resistance_only'
  created_by: string
  studio_id: string | null
  blocks: WorkoutBlock[]
  default_sign_off_mode: 'full_session' | 'per_block' | 'per_exercise' | null
  alert_interval_minutes: number | null
  is_default: boolean
  created_at: string
  updated_at: string
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
  }
}

/**
 * Convert frontend template to database format
 */
function templateToDb(template: Partial<WorkoutTemplate>): Partial<DbTemplate> {
  const db: Partial<DbTemplate> = {}

  if (template.name !== undefined) db.name = template.name
  if (template.description !== undefined) db.description = template.description
  if (template.type !== undefined) db.type = template.type
  if (template.createdBy !== undefined) db.created_by = template.createdBy
  if (template.assignedStudios !== undefined) db.studio_id = template.assignedStudios[0] || null
  if (template.blocks !== undefined) db.blocks = template.blocks
  if (template.defaultSignOffMode !== undefined) db.default_sign_off_mode = template.defaultSignOffMode
  if (template.alertIntervalMinutes !== undefined) db.alert_interval_minutes = template.alertIntervalMinutes
  if (template.isDefault !== undefined) db.is_default = template.isDefault

  return db
}

/**
 * Get all templates for a user (based on their studio or user ID)
 */
export async function getTemplates(userId: string, studioId?: string | null): Promise<WorkoutTemplate[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('ta_workout_templates')
    .select('*')
    .order('created_at', { ascending: false })

  // For solo practitioners, their user_id acts as studio_id
  if (studioId) {
    query = query.eq('studio_id', studioId)
  } else {
    // Fallback: get templates created by the user
    query = query.eq('created_by', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return (data as DbTemplate[]).map(dbToTemplate)
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(templateId: string): Promise<WorkoutTemplate | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_workout_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }

  return dbToTemplate(data as DbTemplate)
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkoutTemplate | null> {
  const supabase = createServiceRoleClient()

  const dbData = templateToDb(template)

  const { data, error } = await supabase
    .from('ta_workout_templates')
    .insert(dbData)
    .select()
    .single()

  if (error) {
    console.error('Error creating template:', error)
    return null
  }

  return dbToTemplate(data as DbTemplate)
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<WorkoutTemplate>
): Promise<WorkoutTemplate | null> {
  const supabase = createServiceRoleClient()

  const dbData = {
    ...templateToDb(updates),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ta_workout_templates')
    .update(dbData)
    .eq('id', templateId)
    .select()
    .single()

  if (error) {
    console.error('Error updating template:', error)
    return null
  }

  return dbToTemplate(data as DbTemplate)
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('ta_workout_templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    console.error('Error deleting template:', error)
    return false
  }

  return true
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  newName?: string
): Promise<WorkoutTemplate | null> {
  const template = await getTemplateById(templateId)
  if (!template) return null

  const duplicated = {
    ...template,
    name: newName || `${template.name} (Copy)`,
  }

  // Remove id, createdAt, updatedAt for new insert
  const { id, createdAt, updatedAt, ...templateData } = duplicated

  return createTemplate(templateData)
}

/**
 * Get templates for a specific studio
 */
export async function getTemplatesByStudio(studioId: string): Promise<WorkoutTemplate[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_workout_templates')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching studio templates:', error)
    return []
  }

  return (data as DbTemplate[]).map(dbToTemplate)
}

/**
 * Get the default template for a studio
 */
export async function getDefaultTemplate(studioId: string): Promise<WorkoutTemplate | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_workout_templates')
    .select('*')
    .eq('studio_id', studioId)
    .eq('is_default', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No default template found
      return null
    }
    console.error('Error fetching default template:', error)
    return null
  }

  return dbToTemplate(data as DbTemplate)
}

/**
 * Set a template as the default for a studio
 */
export async function setDefaultTemplate(templateId: string, studioId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // First, unset any existing default
  await supabase
    .from('ta_workout_templates')
    .update({ is_default: false })
    .eq('studio_id', studioId)
    .eq('is_default', true)

  // Then set the new default
  const { error } = await supabase
    .from('ta_workout_templates')
    .update({ is_default: true })
    .eq('id', templateId)

  if (error) {
    console.error('Error setting default template:', error)
    return false
  }

  return true
}
