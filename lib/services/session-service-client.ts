/**
 * Client-side Session Service
 *
 * Uses API routes for session CRUD operations (bypasses RLS via service role)
 */

import { Session, SessionBlock, Client, SignOffMode } from '@/lib/types';

/**
 * Input type for creating a session
 */
export interface CreateSessionInput {
  trainerId: string;
  clientId?: string;
  templateId: string;
  workoutId?: string; // AI workout ID - when provided, template_id should be NULL
  sessionName?: string;
  signOffMode?: SignOffMode;
  blocks: SessionBlock[];
  plannedDurationMinutes?: number;
}

/**
 * Input type for updating a session
 */
export interface UpdateSessionInput {
  blocks?: SessionBlock[];
  completedAt?: string;
  duration?: number;
  overallRpe?: number;
  privateNotes?: string;
  publicNotes?: string;
  recommendations?: string;
  trainerDeclaration?: boolean;
  completed?: boolean;
  signOffMode?: SignOffMode;
  sessionName?: string;
  clientId?: string;
}

/**
 * Database session shape (snake_case)
 */
interface DbSession {
  id: string;
  trainer_id: string;
  client_id: string | null;
  template_id: string;
  session_name: string;
  sign_off_mode: 'full_session' | 'per_block' | 'per_exercise';
  blocks: SessionBlock[];
  started_at: string;
  completed_at: string | null;
  duration: number | null;
  planned_duration_minutes: number | null;
  overall_rpe: number | null;
  private_notes: string | null;
  public_notes: string | null;
  recommendations: string | null;
  trainer_declaration: boolean;
  completed: boolean;
  studio_id: string | null;
  created_at: string;
  updated_at: string;
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
  };
}

/**
 * Get all sessions for a trainer (client-side)
 * Uses API route to bypass RLS
 */
export async function getSessionsClient(
  trainerId: string,
  options?: {
    completed?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<Session[]> {
  try {
    const params = new URLSearchParams();
    params.set('trainerId', trainerId);

    if (options?.completed !== undefined) {
      params.set('completed', String(options.completed));
    }

    if (options?.limit) {
      params.set('limit', String(options.limit));
    }

    const response = await fetch(`/api/sessions?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching sessions:', error);
      return [];
    }

    const { sessions } = await response.json();
    return (sessions as DbSession[]).map(db => dbToSession(db));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

/**
 * Get active (in-progress) session for a trainer (client-side)
 * Uses API route to bypass RLS
 */
export async function getActiveSessionClient(trainerId: string): Promise<Session | null> {
  try {
    const params = new URLSearchParams();
    params.set('trainerId', trainerId);

    const response = await fetch(`/api/sessions/active?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching active session:', error);
      return null;
    }

    const { session } = await response.json();
    return session ? dbToSession(session as DbSession) : null;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

/**
 * Get a single session by ID (client-side)
 * Uses API route to bypass RLS
 */
export async function getSessionByIdClient(sessionId: string): Promise<Session | null> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      console.error('Error fetching session:', error);
      return null;
    }

    const { session } = await response.json();
    return session ? dbToSession(session as DbSession) : null;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Create a new session (client-side)
 * Uses API route to bypass RLS
 */
export async function createSessionClient(input: CreateSessionInput): Promise<Session | null> {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trainerId: input.trainerId,
        clientId: input.clientId,
        templateId: input.templateId,
        workoutId: input.workoutId, // AI workout ID
        sessionName: input.sessionName || 'Training Session',
        signOffMode: input.signOffMode || 'full_session',
        blocks: input.blocks,
        plannedDurationMinutes: input.plannedDurationMinutes,
        startedAt: new Date().toISOString(),
        completed: false,
        trainerDeclaration: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating session:', error);
      return null;
    }

    const { session } = await response.json();
    return session ? dbToSession(session as DbSession) : null;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Update a session (client-side)
 * Uses API route to bypass RLS
 */
export async function updateSessionClient(
  sessionId: string,
  updates: UpdateSessionInput
): Promise<Session | null> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating session:', error);
      return null;
    }

    const { session } = await response.json();
    return session ? dbToSession(session as DbSession) : null;
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
}

/**
 * Delete a session (client-side)
 * Uses API route to bypass RLS
 */
export async function deleteSessionClient(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Complete a session (client-side)
 * Convenience wrapper for updating a session to completed state
 */
export async function completeSessionClient(
  sessionId: string,
  overallRpe: number,
  privateNotes: string,
  publicNotes: string,
  trainerDeclaration: boolean,
  duration: number
): Promise<Session | null> {
  return updateSessionClient(sessionId, {
    completed: true,
    completedAt: new Date().toISOString(),
    duration,
    overallRpe,
    privateNotes,
    publicNotes,
    trainerDeclaration,
  });
}
