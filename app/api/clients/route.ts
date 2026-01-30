import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

interface DbClient {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  studio_id: string;
  invited_by: string | null;
  is_onboarded: boolean;
  self_booking_allowed: boolean;
  credits: number | null;
  notification_preferences: unknown;
  created_at: string;
}

/**
 * GET /api/clients
 * Fetches all clients for the authenticated user based on their role
 * - Studio owners: All clients for their studio
 * - Trainers: Clients assigned to them
 * - Solo practitioners: All clients where studio_id = user_id
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

    // Build query based on role
    // Note: fc_clients has studio_id and invited_by, but no trainer_id column
    let query = serviceClient
      .from('fc_clients')
      .select('*')
      .order('last_name', { ascending: true });

    if (role === 'solo_practitioner') {
      // Solo practitioners use their user_id as studio_id
      query = query.eq('studio_id', user.id);
    } else if (role === 'studio_owner' || role === 'studio_manager' || role === 'super_admin') {
      // Studio owners/managers see all clients for their studio
      if (studioId) {
        query = query.eq('studio_id', studioId);
      } else {
        // No studio_id - for now, return empty list
        // TODO: Create a studio for this user or associate them with one
        console.warn('Studio owner/manager has no studio_id:', user.id);
        return NextResponse.json({ clients: [], message: 'No studio associated with your account. Please contact support.' });
      }
    } else if (role === 'trainer') {
      // Trainers see clients they invited (or all clients in their studio if they have studio_id)
      if (studioId) {
        query = query.eq('studio_id', studioId);
      } else {
        // Fall back to clients they invited
        query = query.eq('invited_by', user.id);
      }
    } else {
      // Other roles (client, receptionist, finance_manager) don't see client lists
      return NextResponse.json({ clients: [] });
    }

    const { data: clients, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: error.message },
        { status: 500 }
      );
    }

    // Transform clients - keep snake_case for ClientProfile compatibility
    // The ClientSelection component expects snake_case field names
    const transformedClients = ((clients || []) as DbClient[]).map((client) => ({
      id: client.id,
      // snake_case for ClientSelection component compatibility
      first_name: client.first_name || client.name?.split(' ')[0] || '',
      last_name: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      email: client.email,
      phone: client.phone,
      studio_id: client.studio_id,
      invited_by: client.invited_by,
      is_onboarded: client.is_onboarded,
      credits: client.credits,
      created_at: client.created_at,
      // Default values for profile fields (fc_clients doesn't have these)
      // These would come from client_profiles table if it existed
      experience_level: 'intermediate' as const,
      primary_goal: 'general_fitness' as const,
      available_equipment: [] as string[],
      injuries: [] as Array<{ body_part: string; description: string; restrictions: string[] }>,
      is_active: true,
    }));

    return NextResponse.json({ clients: transformedClients });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Creates a new client in the fc_clients table
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role and studio_id
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    // Only certain roles can create clients
    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create clients' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Get or create studio_id for the user
    let studioId = profile.studio_id;

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
      } else if (role === 'solo_practitioner') {
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
            { error: 'Failed to create client', details: 'Could not create studio for solo practitioner' },
            { status: 500 }
          );
        }

        studioId = newStudio.id;
      } else {
        // Non-solo practitioners need to have a studio_id
        return NextResponse.json(
          { error: 'Failed to create client', details: 'No studio associated with your account' },
          { status: 400 }
        );
      }
    }

    // Create client data - let database generate UUID if not provided
    const clientData: Record<string, unknown> = {
      first_name: body.firstName || body.first_name || null,
      last_name: body.lastName || body.last_name || null,
      name: body.name || `${body.firstName || ''} ${body.lastName || ''}`.trim() || null,
      email: body.email,
      phone: body.phone || null,
      studio_id: studioId,
      invited_by: user.id,
      is_onboarded: false,
      self_booking_allowed: body.selfBookingAllowed || false,
      credits: body.credits || 0,
    };

    // Only include id if it's a valid UUID
    if (body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
      clientData.id = body.id;
    }

    const { data, error } = await serviceClient
      .from('fc_clients')
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A client with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create client', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ client: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients
 * Updates a client by ID (passed in body)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    // Only certain roles can update clients
    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update clients' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.firstName !== undefined || body.first_name !== undefined) {
      updateData.first_name = body.firstName || body.first_name;
    }
    if (body.lastName !== undefined || body.last_name !== undefined) {
      updateData.last_name = body.lastName || body.last_name;
    }
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.selfBookingAllowed !== undefined) updateData.self_booking_allowed = body.selfBookingAllowed;
    if (body.credits !== undefined) updateData.credits = body.credits;
    if (body.isOnboarded !== undefined) updateData.is_onboarded = body.isOnboarded;

    const { data, error } = await serviceClient
      .from('fc_clients')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'Failed to update client', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients
 * Deletes a client by ID (passed as query param)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    // Only certain roles can delete clients
    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete clients' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    // Check if client exists
    const { data: existing } = await serviceClient
      .from('fc_clients')
      .select('id, studio_id')
      .eq('id', clientId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Verify the client belongs to the user's studio
    const studioId = profile.studio_id || user.id;
    if (existing.studio_id !== studioId && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Client does not belong to your studio' }, { status: 403 });
    }

    const { error } = await serviceClient
      .from('fc_clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      return NextResponse.json(
        { error: 'Failed to delete client', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
