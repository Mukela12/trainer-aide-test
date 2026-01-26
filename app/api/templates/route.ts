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

    // For solo practitioners, user_id acts as studio_id
    const studioId = profile?.studio_id || user.id;

    // Convert camelCase to snake_case for database
    const templateData = {
      id: body.id || `template_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: body.name,
      description: body.description || null,
      type: body.type || 'standard',
      created_by: user.id,
      studio_id: studioId,
      blocks: body.blocks || [],
      default_sign_off_mode: body.defaultSignOffMode || null,
      alert_interval_minutes: body.alertIntervalMinutes || null,
      is_default: body.isDefault || false,
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
