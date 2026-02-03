import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/onboarding/studio
 * Creates or updates the bs_studios record for a user during onboarding.
 * Uses service role client to bypass RLS restrictions.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, name, studioType, role } = await request.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify user is authenticated and matches the userId
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized: userId mismatch' }, { status: 401 });
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Check if studio already exists
    const { data: existingStudio } = await serviceClient
      .from('bs_studios')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingStudio) {
      // Update existing studio - only update the name, don't change studio_type
      // to avoid constraint violations
      const { data, error } = await serviceClient
        .from('bs_studios')
        .update({
          name: name || 'My Studio',
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating studio:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ studio: data, action: 'updated' });
    }

    // Create new studio
    // Note: Use 'fitness' studio_type which doesn't require studio_mode constraint
    // The studio_mode is omitted to use the database default value
    const { data, error } = await serviceClient
      .from('bs_studios')
      .insert({
        id: userId,
        owner_id: userId,
        name: name || 'My Studio',
        studio_type: 'fitness',
        plan: 'free',
        license_level: role === 'solo_practitioner' ? 'single-site' : 'starter',
        platform_version: 'v2',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating studio:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also ensure bs_staff record exists and is linked to the studio
    const { data: existingStaff } = await serviceClient
      .from('bs_staff')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingStaff) {
      // Update staff record to link to studio
      await serviceClient
        .from('bs_staff')
        .update({ studio_id: userId })
        .eq('id', userId);
    }

    return NextResponse.json({ studio: data, action: 'created' }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in studio creation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
