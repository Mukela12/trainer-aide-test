import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

/**
 * GET /api/templates
 * Fetches templates for the authenticated user
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('ta_workout_templates')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by studio_id or created_by
    if (studioId) {
      query = query.eq('studio_id', studioId);
    } else {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Creates a new template in the database
 * Uses service role to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for studio_id
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Get or create studio_id for the user
    let studioId = profile?.studio_id;

    // For solo practitioners without a studio, create one on-the-fly
    if (!studioId) {
      // Check if a studio already exists for this user
      const { data: existingStudio } = await serviceClient
        .from('bs_studios')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existingStudio) {
        studioId = existingStudio.id;
      } else {
        // Create a new studio for the solo practitioner
        const { data: newStudio, error: studioError } = await serviceClient
          .from('bs_studios')
          .insert({
            name: profile?.firstName ? `${profile.firstName}'s Studio` : 'My Studio',
            owner_id: user.id,
            plan: 'free',
            license_level: 'single-site',
            studio_type: 'personal_training',
            studio_mode: 'single-site',
            platform_version: 'v2',
          })
          .select()
          .single();

        if (studioError) {
          console.error('Error creating studio for solo practitioner:', studioError);
          return NextResponse.json(
            { error: 'Failed to create template', details: 'Could not create studio for solo practitioner' },
            { status: 500 }
          );
        }

        studioId = newStudio.id;
      }
    }

    // Convert camelCase to snake_case for database
    // Actual columns: id, trainer_id, name, created_at, studio_id, created_by, title, description, is_active, json_definition, is_default, sign_off_mode
    const templateData = {
      name: body.name,
      title: body.name, // title is required, use name as default
      description: body.description || null,
      created_by: user.id,
      studio_id: studioId,
      trainer_id: user.id,
      json_definition: body.blocks || body.jsonDefinition || null,
      sign_off_mode: body.defaultSignOffMode || body.signOffMode || 'full_session',
      is_default: body.isDefault || false,
      is_active: true,
    };

    const { data, error } = await serviceClient
      .from('ta_workout_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
