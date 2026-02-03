import { NextRequest, NextResponse } from 'next/server';
import { updateAIProgram } from '@/lib/services/ai-program-service';
import {
  getClientProfileByEmail,
  createClientProfile,
} from '@/lib/services/client-profile-service';
import { supabaseServer } from '@/lib/supabase-server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/ai-programs/[id]/assign
 * Assign a program to a client OR a trainer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { client_id, trainer_id } = body;

    if (!client_id && !trainer_id) {
      return NextResponse.json(
        { error: 'client_id or trainer_id is required' },
        { status: 400 }
      );
    }

    // Handle trainer assignment
    if (trainer_id) {
      // Verify authentication
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Insert into ai_program_trainer_assignments
      const serviceClient = createServiceRoleClient();
      const { error: assignError } = await serviceClient
        .from('ai_program_trainer_assignments')
        .upsert({
          ai_program_id: id,
          trainer_id,
          assigned_by: user.id,
        }, {
          onConflict: 'ai_program_id,trainer_id'
        });

      if (assignError) {
        console.error('Error assigning to trainer:', assignError);
        return NextResponse.json(
          { error: 'Failed to assign to trainer', details: assignError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'AI program assigned to trainer',
        assignedTo: 'trainer',
        trainerId: trainer_id,
      });
    }

    // Handle client assignment (existing logic)

    // 1. Get the fc_clients record
    const { data: fcClient, error: fcError } = await supabaseServer
      .from('fc_clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (fcError || !fcClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // 2. Find or create client_profile by email (client_id column doesn't exist in DB)
    let clientProfile = await getClientProfileByEmail(fcClient.email);

    if (!clientProfile) {
      // Create minimal client profile from fc_clients data
      const { data: newProfile, error: createError } = await createClientProfile({
        email: fcClient.email,
        first_name: fcClient.first_name || fcClient.name?.split(' ')[0] || 'Unknown',
        last_name: fcClient.last_name || fcClient.name?.split(' ').slice(1).join(' ') || '',
        experience_level: 'intermediate',
        primary_goal: 'general_fitness',
        current_activity_level: 'moderately_active',
        secondary_goals: [],
        preferred_training_days: [],
        preferred_training_times: [],
        available_equipment: [],
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
      });

      if (createError || !newProfile) {
        return NextResponse.json(
          { error: 'Failed to create client profile', details: createError?.message },
          { status: 500 }
        );
      }
      clientProfile = newProfile;
    }

    // 3. Assign program using client_profile.id
    const { data: updatedProgram, error } = await updateAIProgram(id, {
      client_profile_id: clientProfile.id,
      status: 'active',
    });

    if (error || !updatedProgram) {
      console.error('Error assigning program:', error);
      return NextResponse.json(
        { error: 'Failed to assign program', details: error?.message },
        { status: 500 }
      );
    }

    // TODO: Send email notification to client

    return NextResponse.json({
      program: updatedProgram,
      message: 'Program assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning program:', error);
    return NextResponse.json(
      { error: 'Failed to assign program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-programs/[id]/assign?trainer_id=xxx
 * Unassign a program from a trainer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const trainer_id = searchParams.get('trainer_id');

    if (!trainer_id) {
      return NextResponse.json(
        { error: 'trainer_id is required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete from ai_program_trainer_assignments
    const serviceClient = createServiceRoleClient();
    const { error: deleteError } = await serviceClient
      .from('ai_program_trainer_assignments')
      .delete()
      .eq('ai_program_id', id)
      .eq('trainer_id', trainer_id);

    if (deleteError) {
      console.error('Error unassigning from trainer:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unassign from trainer', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI program unassigned from trainer',
    });
  } catch (error) {
    console.error('Error unassigning program:', error);
    return NextResponse.json(
      { error: 'Failed to unassign program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
