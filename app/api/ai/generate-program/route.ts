/**
 * AI Workout Program Generation API
 *
 * POST /api/ai/generate-program
 *
 * Creates a program record and triggers background generation via worker endpoint.
 * Returns immediately with program_id to avoid timeout issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAIProgram } from '@/lib/services/ai-program-service';
import { getClientProfileById } from '@/lib/services/client-profile-service';
import { extractWorkoutConstraints, GoalType, ExperienceLevel, ClientProfile } from '@/lib/types/client-profile';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Result from client data lookup
 */
interface ClientDataResult {
  profile: ClientProfile;
  isFromClientProfiles: boolean; // true if from client_profiles table, false if from fc_clients
}

/**
 * Helper: Try to get client profile from client_profiles table,
 * if not found, try fc_clients table and create a minimal profile object
 */
async function getClientData(clientId: string): Promise<ClientDataResult | null> {
  // First try the client_profiles table
  const clientProfile = await getClientProfileById(clientId);
  if (clientProfile) {
    return { profile: clientProfile, isFromClientProfiles: true };
  }

  // Fallback: try fc_clients table
  const serviceClient = createServiceRoleClient();
  const { data: fcClient, error } = await serviceClient
    .from('fc_clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (error || !fcClient) {
    console.error('Client not found in either table:', clientId);
    return null;
  }

  // Create a minimal ClientProfile from fc_clients data
  const minimalProfile: ClientProfile = {
    id: fcClient.id,
    email: fcClient.email,
    first_name: fcClient.first_name || fcClient.name?.split(' ')[0] || 'Client',
    last_name: fcClient.last_name || fcClient.name?.split(' ').slice(1).join(' ') || '',
    // Default values since fc_clients doesn't have these fields
    experience_level: 'intermediate',
    current_activity_level: 'moderately_active',
    primary_goal: 'general_fitness',
    secondary_goals: [],
    preferred_training_days: ['monday', 'wednesday', 'friday'],
    preferred_training_times: ['morning'],
    available_equipment: ['dumbbells', 'barbell', 'bench', 'cables'],
    injuries: [],
    medical_conditions: [],
    medications: [],
    physical_limitations: [],
    doctor_clearance: true,
    preferred_exercise_types: [],
    exercise_aversions: [],
    preferred_movement_patterns: [],
    dietary_restrictions: [],
    dietary_preferences: [],
    is_active: true,
    created_at: fcClient.created_at,
    updated_at: fcClient.created_at,
  };

  return { profile: minimalProfile, isFromClientProfiles: false };
}

/**
 * AI Program Generation Request
 */
interface GenerateProgramAPIRequest {
  client_profile_id?: string;
  trainer_id: string;
  program_name?: string;
  total_weeks: number;
  sessions_per_week: number;
  session_duration_minutes: number;
  include_nutrition?: boolean;

  // Optional overrides (if no client profile provided)
  primary_goal?: string;
  experience_level?: string;
  available_equipment?: string[];
  injuries?: Array<{ body_part: string; restrictions: string[] }>;
  exercise_aversions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateProgramAPIRequest = await request.json();

    // Use authenticated user's ID if trainer_id not provided
    const trainerId = body.trainer_id || authUser.id;

    // Get user's role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', trainerId)
      .maybeSingle();

    // Role-based access control: Solo practitioners and studio owners can create AI programs
    const userRole = profile?.role || 'solo_practitioner';
    const allowedRoles = ['solo_practitioner', 'studio_owner', 'super_admin'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Unauthorized: AI Programs are only available to solo practitioners and studio owners' },
        { status: 403 }
      );
    }

    if (!body.total_weeks || body.total_weeks < 1 || body.total_weeks > 52) {
      return NextResponse.json(
        { error: 'total_weeks must be between 1 and 52' },
        { status: 400 }
      );
    }

    if (!body.sessions_per_week || body.sessions_per_week < 1 || body.sessions_per_week > 7) {
      return NextResponse.json(
        { error: 'sessions_per_week must be between 1 and 7' },
        { status: 400 }
      );
    }

    // Get generation parameters
    let programName: string;
    let primaryGoal: string;
    let experienceLevel: string;
    let availableEquipment: string[] = body.available_equipment || [];
    let actualClientProfileId: string | null = null; // Only set if client is from client_profiles table

    if (body.client_profile_id) {
      // Fetch client profile from database (tries client_profiles first, then fc_clients)
      const clientData = await getClientData(body.client_profile_id);
      if (!clientData) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }

      const { profile: clientProfile, isFromClientProfiles } = clientData;

      // Only set client_profile_id if the client is from client_profiles table
      // (due to foreign key constraint on ai_programs table)
      if (isFromClientProfiles) {
        actualClientProfileId = body.client_profile_id;
      }

      // Extract workout constraints from profile
      const constraints = extractWorkoutConstraints(clientProfile);
      programName = body.program_name || `${clientProfile.first_name}'s Training Program`;
      primaryGoal = constraints.primaryGoal;
      experienceLevel = constraints.experienceLevel;
      availableEquipment = constraints.availableEquipment;
    } else {
      // Use provided parameters (manual mode)
      if (!body.primary_goal || !body.experience_level || !body.available_equipment) {
        return NextResponse.json(
          { error: 'If client_profile_id not provided, must include primary_goal, experience_level, and available_equipment' },
          { status: 400 }
        );
      }

      programName = body.program_name || 'AI-Generated Training Program';
      primaryGoal = body.primary_goal;
      experienceLevel = body.experience_level;
    }

    // Debug logging for Netlify deployment
    console.log('🔍 DEBUG - Environment check:');
    console.log(`   SUPABASE_URL exists: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`   SUPABASE_URL length: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0}`);
    console.log(`   SERVICE_ROLE_KEY exists: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
    console.log(`   SERVICE_ROLE_KEY length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0}`);
    console.log(`   ANTHROPIC_KEY exists: ${!!process.env.ANTHROPIC_API_KEY}`);

    console.log('🤖 Creating program record...');
    console.log(`   Duration: ${body.total_weeks} weeks x ${body.sessions_per_week} sessions/week`);
    console.log(`   Trainer ID: ${body.trainer_id}`);
    console.log(`   Client Profile ID: ${body.client_profile_id || 'none'}`);
    console.log(`   Primary Goal: ${primaryGoal}`);
    console.log(`   Experience Level: ${experienceLevel}`);

    // Create master program record with "generating" status
    // Note: client_profile_id is only set if client exists in client_profiles table (FK constraint)
    const programData = {
      client_profile_id: actualClientProfileId,
      trainer_id: body.trainer_id,
      created_by: body.trainer_id,
      program_name: programName,
      description: 'Generating AI workout program...',
      total_weeks: body.total_weeks,
      sessions_per_week: body.sessions_per_week,
      session_duration_minutes: body.session_duration_minutes,
      primary_goal: primaryGoal,
      secondary_goals: [],
      experience_level: experienceLevel,
      ai_model: 'claude-sonnet-4-5-20250929',
      ai_rationale: null,
      movement_balance_summary: null,
      status: 'draft' as const,
      is_template: false,
      is_published: false,
      allow_client_modifications: false,
      generation_status: 'generating' as const, // Set to generating
      generation_error: null,
    };

    console.log('🔍 DEBUG - Program data to insert:', JSON.stringify(programData, null, 2));

    let savedProgram, programError;
    try {
      const result = await createAIProgram(programData);
      savedProgram = result.data;
      programError = result.error;
      console.log('🔍 DEBUG - createAIProgram result:', {
        hasData: !!savedProgram,
        hasError: !!programError,
        errorDetails: programError ? JSON.stringify(programError, null, 2) : null
      });
    } catch (err) {
      console.error('🔍 DEBUG - createAIProgram threw exception:', err);
      programError = err;
    }

    if (programError || !savedProgram) {
      console.error('❌ Failed to create program - full error object:', JSON.stringify(programError, null, 2));
      console.error('❌ Error type:', (programError as any)?.constructor?.name);
      console.error('❌ Error message:', (programError as any)?.message);
      console.error('❌ Error code:', (programError as any)?.code);
      console.error('❌ Error details:', (programError as any)?.details);
      console.error('❌ Error hint:', (programError as any)?.hint);

      return NextResponse.json(
        {
          error: 'Failed to create program record',
          details: (programError as any)?.message,
          errorCode: (programError as any)?.code,
          errorHint: (programError as any)?.hint,
          fullError: JSON.stringify(programError)
        },
        { status: 500 }
      );
    }

    console.log(`✅ Program created: ${savedProgram.id}`);
    console.log('🚀 Triggering background worker...');

    // Trigger background worker (fire-and-forget)
    const workerUrl = new URL('/api/ai/generate-program/worker', request.url);

    fetch(workerUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        program_id: savedProgram.id,
        // Only pass client_profile_id if client exists in client_profiles table
        // If null, worker will use the params directly (for fc_clients)
        client_profile_id: actualClientProfileId,
        trainer_id: body.trainer_id,
        total_weeks: body.total_weeks,
        sessions_per_week: body.sessions_per_week,
        session_duration_minutes: body.session_duration_minutes,
        include_nutrition: body.include_nutrition,
        primary_goal: primaryGoal,
        experience_level: experienceLevel,
        available_equipment: availableEquipment,
        injuries: body.injuries || [],
        exercise_aversions: body.exercise_aversions || [],
      }),
    }).catch((error) => {
      console.error('❌ Failed to trigger worker:', error);
      // Don't fail the request - worker will try anyway
    });

    // Return immediately with program ID
    return NextResponse.json({
      success: true,
      program_id: savedProgram.id,
      program: savedProgram,
      message: 'Program generation started. Poll /api/ai-programs/{id} to check status.',
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
