import { createServiceRoleClient } from '@/lib/supabase/server';

// =============================================
// Types
// =============================================

interface GetSessionsOptions {
  completed?: boolean;
  limit?: number;
}

interface CreateSessionInput {
  trainerId: string;
  clientId?: string | null;
  templateId: string;
  workoutId?: string | null;
  sessionName?: string;
  blocks?: unknown[];
  signOffMode?: string;
  plannedDurationMinutes?: number | null;
  privateNotes?: string | null;
  publicNotes?: string | null;
  recommendations?: string | null;
  startedAt?: string;
  completedAt?: string | null;
  overallRpe?: number | null;
  trainerDeclaration?: boolean;
  completed?: boolean;
}

interface UpdateSessionInput {
  blocks?: unknown[];
  signOffMode?: string;
  privateNotes?: string | null;
  publicNotes?: string | null;
  recommendations?: string | null;
  completedAt?: string | null;
  overallRpe?: number | null;
  trainerDeclaration?: boolean;
  completed?: boolean;
  sessionName?: string;
  clientId?: string | null;
}

// =============================================
// Read operations
// =============================================

/** Fetch sessions for a trainer with optional filters. */
export async function getSessions(trainerId: string, options: GetSessionsOptions = {}) {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('ta_sessions')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('started_at', { ascending: false });

  if (options.completed !== undefined) {
    query = query.eq('completed', options.completed);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data || [], error: null };
}

/** Fetch a single session by ID. */
export async function getSessionById(sessionId: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('ta_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/** Fetch the active (in-progress) session for a trainer. */
export async function getActiveSession(trainerId: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('ta_sessions')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('completed', false)
    .order('started_at', { ascending: false })
    .limit(1);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data?.[0] || null, error: null };
}

/** Fetch upcoming bookings for a trainer. */
export async function getUpcomingSessions(trainerId: string, limit = 5) {
  const supabase = createServiceRoleClient();
  const now = new Date();

  const { data: bookings, error } = await supabase
    .from('ta_bookings')
    .select(`
      id,
      scheduled_at,
      status,
      fc_clients (id, first_name, last_name, name),
      ta_services (name)
    `)
    .eq('trainer_id', trainerId)
    .gte('scheduled_at', now.toISOString())
    .in('status', ['confirmed', 'soft-hold'])
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const sessions = (bookings || []).map((booking: Record<string, unknown>) => {
    const client = booking.fc_clients as { name?: string; first_name?: string; last_name?: string } | null;
    const service = booking.ta_services as { name?: string } | null;

    return {
      id: booking.id,
      clientName: client?.name ||
        (client?.first_name && client?.last_name
          ? `${client.first_name} ${client.last_name}`.trim()
          : 'Client'),
      scheduledAt: booking.scheduled_at,
      serviceName: service?.name || 'Session',
      status: booking.status,
    };
  });

  return { data: sessions, error: null };
}

// =============================================
// Write operations
// =============================================

/** Create a new training session. */
export async function createSession(input: CreateSessionInput) {
  const supabase = createServiceRoleClient();

  const isAIWorkout = !!input.workoutId;

  const sessionData = {
    trainer_id: input.trainerId,
    client_id: input.clientId || null,
    template_id: isAIWorkout ? null : input.templateId,
    workout_id: isAIWorkout ? null : input.templateId,
    ai_workout_id: isAIWorkout ? input.workoutId : null,
    session_name: input.sessionName || 'Training Session',
    json_definition: {
      blocks: input.blocks || [],
      sign_off_mode: input.signOffMode || 'full_session',
      planned_duration_minutes: input.plannedDurationMinutes || null,
      private_notes: input.privateNotes || null,
      public_notes: input.publicNotes || null,
      recommendations: input.recommendations || null,
      is_ai_workout: isAIWorkout,
    },
    started_at: input.startedAt || new Date().toISOString(),
    completed_at: input.completedAt || null,
    overall_rpe: input.overallRpe || null,
    notes: input.privateNotes || null,
    trainer_declaration: input.trainerDeclaration || false,
    completed: input.completed || false,
  };

  const { data, error } = await supabase
    .from('ta_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/** Update a session by ID. Merges json_definition fields with existing data. */
export async function updateSession(sessionId: string, input: UpdateSessionInput) {
  const supabase = createServiceRoleClient();

  // Fetch existing session to merge json_definition
  const { data: existingSession } = await supabase
    .from('ta_sessions')
    .select('json_definition')
    .eq('id', sessionId)
    .single();

  const existingJsonDef = (existingSession?.json_definition as Record<string, unknown>) || {};

  // Build updated json_definition by merging with existing
  const jsonDefinition: Record<string, unknown> = { ...existingJsonDef };
  if (input.blocks !== undefined) jsonDefinition.blocks = input.blocks;
  if (input.signOffMode !== undefined) jsonDefinition.sign_off_mode = input.signOffMode;
  if (input.privateNotes !== undefined) jsonDefinition.private_notes = input.privateNotes;
  if (input.publicNotes !== undefined) jsonDefinition.public_notes = input.publicNotes;
  if (input.recommendations !== undefined) jsonDefinition.recommendations = input.recommendations;

  const updateData: Record<string, unknown> = {};

  // Set json_definition if any nested fields were updated
  if (input.blocks !== undefined || input.signOffMode !== undefined ||
      input.privateNotes !== undefined || input.publicNotes !== undefined ||
      input.recommendations !== undefined) {
    updateData.json_definition = jsonDefinition;
  }

  // Direct column updates
  if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;
  if (input.overallRpe !== undefined) updateData.overall_rpe = input.overallRpe;
  if (input.privateNotes !== undefined) updateData.notes = input.privateNotes;
  if (input.trainerDeclaration !== undefined) updateData.trainer_declaration = input.trainerDeclaration;
  if (input.completed !== undefined) updateData.completed = input.completed;
  if (input.sessionName !== undefined) updateData.session_name = input.sessionName;
  if (input.clientId !== undefined) updateData.client_id = input.clientId;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('ta_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/** Delete a session by ID. Checks ownership before deleting. */
export async function deleteSession(sessionId: string, userId: string) {
  const supabase = createServiceRoleClient();

  // Check ownership
  const { data: existing } = await supabase
    .from('ta_sessions')
    .select('trainer_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (!existing) {
    return { data: null, error: new Error('Session not found') };
  }

  if (existing.trainer_id !== userId) {
    return { data: null, error: new Error('Forbidden: You can only delete your own sessions') };
  }

  const { error } = await supabase
    .from('ta_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: { success: true }, error: null };
}
