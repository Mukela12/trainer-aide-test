/**
 * Session Service
 *
 * CRUD operations for ta_sessions table in Wondrous database.
 */

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Session, SessionBlock, Client } from '@/lib/types'

/**
 * Database session shape (snake_case)
 */
interface DbSession {
  id: string
  trainer_id: string
  client_id: string | null
  template_id: string
  session_name: string
  sign_off_mode: 'full_session' | 'per_block' | 'per_exercise'
  blocks: SessionBlock[]
  started_at: string
  completed_at: string | null
  duration: number | null
  planned_duration_minutes: number | null
  overall_rpe: number | null
  private_notes: string | null
  public_notes: string | null
  recommendations: string | null
  trainer_declaration: boolean
  completed: boolean
  studio_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Convert database session to frontend format
 */
function dbToSession(db: DbSession, client?: Client | null): Session {
  return {
    id: db.id,
    trainerId: db.trainer_id,
    clientId: db.client_id || undefined,
    client: client || undefined,
    templateId: db.template_id,
    sessionName: db.session_name,
    signOffMode: db.sign_off_mode,
    blocks: db.blocks || [],
    startedAt: db.started_at,
    completedAt: db.completed_at || undefined,
    duration: db.duration || undefined,
    plannedDurationMinutes: db.planned_duration_minutes || undefined,
    overallRpe: db.overall_rpe || undefined,
    privateNotes: db.private_notes || undefined,
    publicNotes: db.public_notes || undefined,
    recommendations: db.recommendations || undefined,
    trainerDeclaration: db.trainer_declaration,
    completed: db.completed,
  }
}

/**
 * Convert frontend session to database format
 */
function sessionToDb(session: Partial<Session>, studioId?: string | null): Partial<DbSession> {
  const db: Partial<DbSession> = {}

  if (session.trainerId !== undefined) db.trainer_id = session.trainerId
  if (session.clientId !== undefined) db.client_id = session.clientId || null
  if (session.templateId !== undefined) db.template_id = session.templateId
  if (session.sessionName !== undefined) db.session_name = session.sessionName
  if (session.signOffMode !== undefined) db.sign_off_mode = session.signOffMode
  if (session.blocks !== undefined) db.blocks = session.blocks
  if (session.startedAt !== undefined) db.started_at = session.startedAt
  if (session.completedAt !== undefined) db.completed_at = session.completedAt || null
  if (session.duration !== undefined) db.duration = session.duration || null
  if (session.plannedDurationMinutes !== undefined) db.planned_duration_minutes = session.plannedDurationMinutes || null
  if (session.overallRpe !== undefined) db.overall_rpe = session.overallRpe || null
  if (session.privateNotes !== undefined) db.private_notes = session.privateNotes || null
  if (session.publicNotes !== undefined) db.public_notes = session.publicNotes || null
  if (session.recommendations !== undefined) db.recommendations = session.recommendations || null
  if (session.trainerDeclaration !== undefined) db.trainer_declaration = session.trainerDeclaration
  if (session.completed !== undefined) db.completed = session.completed
  if (studioId !== undefined) db.studio_id = studioId

  return db
}

/**
 * Get all sessions for a trainer
 */
export async function getSessions(
  trainerId: string,
  options?: {
    completed?: boolean
    limit?: number
    offset?: number
  }
): Promise<Session[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('ta_sessions')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('started_at', { ascending: false })

  if (options?.completed !== undefined) {
    query = query.eq('completed', options.completed)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching sessions:', error)
    return []
  }

  return (data as DbSession[]).map(db => dbToSession(db))
}

/**
 * Get sessions for a client (to show in client dashboard)
 */
export async function getClientSessions(clientId: string): Promise<Session[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_sessions')
    .select('*')
    .eq('client_id', clientId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching client sessions:', error)
    return []
  }

  return (data as DbSession[]).map(db => dbToSession(db))
}

/**
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Error fetching session:', error)
    return null
  }

  return dbToSession(data as DbSession)
}

/**
 * Start a new session
 */
export async function startSession(
  session: Omit<Session, 'id' | 'startedAt' | 'completed' | 'trainerDeclaration'>,
  studioId?: string | null
): Promise<Session | null> {
  const supabase = createServiceRoleClient()

  const dbData = {
    ...sessionToDb(session, studioId),
    started_at: new Date().toISOString(),
    completed: false,
    trainer_declaration: false,
  }

  const { data, error } = await supabase
    .from('ta_sessions')
    .insert(dbData)
    .select()
    .single()

  if (error) {
    console.error('Error starting session:', error)
    return null
  }

  return dbToSession(data as DbSession)
}

/**
 * Update a session (e.g., update blocks during session)
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Session>
): Promise<Session | null> {
  const supabase = createServiceRoleClient()

  const dbData = {
    ...sessionToDb(updates),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ta_sessions')
    .update(dbData)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating session:', error)
    return null
  }

  return dbToSession(data as DbSession)
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  completionData: {
    overallRpe: number
    privateNotes?: string
    publicNotes?: string
    recommendations?: string
    trainerDeclaration: boolean
  }
): Promise<Session | null> {
  const supabase = createServiceRoleClient()

  // First get the session to calculate duration
  const { data: existingSession } = await supabase
    .from('ta_sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single()

  const startedAt = existingSession?.started_at
    ? new Date(existingSession.started_at)
    : new Date()
  const completedAt = new Date()
  const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)

  const { data, error } = await supabase
    .from('ta_sessions')
    .update({
      completed: true,
      completed_at: completedAt.toISOString(),
      duration,
      overall_rpe: completionData.overallRpe,
      private_notes: completionData.privateNotes || null,
      public_notes: completionData.publicNotes || null,
      recommendations: completionData.recommendations || null,
      trainer_declaration: completionData.trainerDeclaration,
      updated_at: completedAt.toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error completing session:', error)
    return null
  }

  return dbToSession(data as DbSession)
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('ta_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting session:', error)
    return false
  }

  return true
}

/**
 * Get active (in-progress) session for a trainer
 */
export async function getActiveSession(trainerId: string): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ta_sessions')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('completed', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No active session found
      return null
    }
    console.error('Error fetching active session:', error)
    return null
  }

  return dbToSession(data as DbSession)
}

/**
 * Get session statistics for a trainer
 */
export async function getSessionStats(trainerId: string): Promise<{
  totalSessions: number
  sessionsToday: number
  sessionsThisWeek: number
  sessionsThisMonth: number
  averageRpe: number | null
}> {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Get total count
  const { count: totalCount } = await supabase
    .from('ta_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('completed', true)

  // Get today's sessions
  const { count: todayCount } = await supabase
    .from('ta_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('completed', true)
    .gte('completed_at', startOfDay)

  // Get this week's sessions
  const { count: weekCount } = await supabase
    .from('ta_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('completed', true)
    .gte('completed_at', startOfWeek)

  // Get this month's sessions
  const { count: monthCount } = await supabase
    .from('ta_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('completed', true)
    .gte('completed_at', startOfMonth)

  // Get average RPE
  const { data: rpeData } = await supabase
    .from('ta_sessions')
    .select('overall_rpe')
    .eq('trainer_id', trainerId)
    .eq('completed', true)
    .not('overall_rpe', 'is', null)

  const rpeValues = rpeData?.map(s => s.overall_rpe).filter(Boolean) || []
  const averageRpe = rpeValues.length > 0
    ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
    : null

  return {
    totalSessions: totalCount || 0,
    sessionsToday: todayCount || 0,
    sessionsThisWeek: weekCount || 0,
    sessionsThisMonth: monthCount || 0,
    averageRpe,
  }
}
