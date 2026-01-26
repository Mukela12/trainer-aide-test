import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

interface DbStaff {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  staff_type: string;
  studio_id: string;
  is_onboarded: boolean;
  created_at: string;
}

/**
 * GET /api/trainers
 * Fetches all trainers for the authenticated studio owner's studio
 * Only accessible by studio owners and studio managers
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role and studio_id
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      console.error('No profile found for user:', user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';
    const studioId = profile.studio_id;

    // Only studio owners and managers can view trainers
    if (!['studio_owner', 'studio_manager', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Only studio owners can view trainers' }, { status: 403 });
    }

    if (!studioId) {
      console.warn('Studio owner/manager has no studio_id:', user.id);
      return NextResponse.json({ trainers: [], message: 'No studio associated with your account.' });
    }

    // Fetch trainers for the studio
    const { data: trainers, error } = await serviceClient
      .from('bs_staff')
      .select('*')
      .eq('studio_id', studioId)
      .in('staff_type', ['trainer', 'instructor'])
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching trainers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trainers', details: error.message },
        { status: 500 }
      );
    }

    // Transform trainers for frontend
    const transformedTrainers = ((trainers || []) as DbStaff[]).map((trainer) => ({
      id: trainer.id,
      first_name: trainer.first_name || '',
      last_name: trainer.last_name || '',
      email: trainer.email,
      staff_type: trainer.staff_type,
      studio_id: trainer.studio_id,
      is_onboarded: trainer.is_onboarded,
      created_at: trainer.created_at,
    }));

    return NextResponse.json({ trainers: transformedTrainers });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
