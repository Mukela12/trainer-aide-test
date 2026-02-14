import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { getClientsForUser, createClient, updateClient, patchClient, deleteClient } from '@/lib/services/client-service';

/**
 * GET /api/clients
 * Fetches all clients for the authenticated user based on their role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';
    const studioId = profile.studio_id;

    const { data: clients, error } = await getClientsForUser(user.id, role, studioId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch clients', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ clients });
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create clients' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const { data, error } = await createClient({
      userId: user.id,
      role,
      studioId: profile.studio_id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      body,
      inviterFirstName: profile.firstName,
      inviterLastName: profile.lastName,
    });

    if (error) {
      const status = error.message.includes('already exists') ? 409
        : error.message.includes('No studio') ? 400
        : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json(
      { client: data?.client, emailSent: data?.emailSent, emailError: data?.emailError },
      { status: 201 }
    );
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update clients' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await updateClient(body.id, body);

    if (error) {
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
 * PATCH /api/clients
 * Partially updates a client by ID (passed as query param)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update clients' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const studioId = profile.studio_id || user.id;

    const { data, error } = await patchClient(clientId, studioId, role, body);

    if (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('does not belong') ? 403
        : error.message.includes('No valid fields') ? 400
        : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = profile.role || 'client';

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete clients' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const studioId = profile.studio_id || user.id;
    const { error } = await deleteClient(clientId, studioId, role);

    if (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('does not belong') ? 403
        : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
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
