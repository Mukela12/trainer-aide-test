import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { sendClientInvitationEmail } from '@/lib/notifications/email-service';
import crypto from 'crypto';

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
  is_archived: boolean;
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
      is_archived: client.is_archived || false,
      credits: client.credits,
      created_at: client.created_at,
      // Default values for profile fields (fc_clients doesn't have these)
      // These would come from client_profiles table if it existed
      experience_level: 'intermediate' as const,
      primary_goal: 'general_fitness' as const,
      available_equipment: [] as string[],
      injuries: [] as Array<{ body_part: string; description: string; restrictions: string[] }>,
      is_active: true,
      invitation_status: null as string | null, // Not from invitation
    }));

    // Also fetch pending invitations that haven't been accepted yet
    // These show up as "pending" clients in the UI
    const effectiveStudioId = role === 'solo_practitioner' ? user.id : studioId;

    if (effectiveStudioId) {
      const { data: pendingInvitations } = await serviceClient
        .from('ta_client_invitations')
        .select('*')
        .eq('studio_id', effectiveStudioId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Add pending invitations as "virtual" clients with is_onboarded = false
      // Only add if not already in clients list (by email)
      const existingEmails = new Set(transformedClients.map(c => c.email.toLowerCase()));

      const pendingClients = ((pendingInvitations || []) as Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        studio_id: string;
        invited_by: string;
        created_at: string;
        status: string;
        expires_at: string;
      }>)
        .filter(inv => !existingEmails.has(inv.email.toLowerCase()))
        .map(inv => ({
          id: `invitation_${inv.id}`, // Prefix to distinguish from real clients
          first_name: inv.first_name || '',
          last_name: inv.last_name || '',
          email: inv.email,
          phone: null,
          studio_id: inv.studio_id,
          invited_by: inv.invited_by,
          is_onboarded: false, // Not yet onboarded - shows as "Pending"
          is_archived: false,
          credits: 0,
          created_at: inv.created_at,
          experience_level: 'intermediate' as const,
          primary_goal: 'general_fitness' as const,
          available_equipment: [] as string[],
          injuries: [] as Array<{ body_part: string; description: string; restrictions: string[] }>,
          is_active: true,
          invitation_status: inv.status, // Track invitation status
          invitation_expires_at: inv.expires_at,
        }));

      transformedClients.push(...pendingClients);
    }

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

    // For users without a studio, create one on-the-fly
    if (!studioId) {
      // Check if a studio already exists for this user
      const { data: existingStudio } = await serviceClient
        .from('bs_studios')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existingStudio) {
        studioId = existingStudio.id;

        // Also update bs_staff to link to this studio if not already linked
        await serviceClient
          .from('bs_staff')
          .update({ studio_id: existingStudio.id })
          .eq('id', user.id)
          .is('studio_id', null);
      } else if (role === 'solo_practitioner' || role === 'studio_owner') {
        // Create a new studio for solo practitioners or studio owners missing a studio
        // Note: Use 'fitness' studio_type which doesn't require studio_mode constraint
        const studioConfig = {
          name: profile?.firstName ? `${profile.firstName}'s Studio` : 'My Studio',
          studio_type: 'fitness',
          license_level: role === 'solo_practitioner' ? 'single-site' : 'starter',
        };

        const { data: newStudio, error: studioError } = await serviceClient
          .from('bs_studios')
          .insert({
            ...studioConfig,
            owner_id: user.id,
            plan: 'free',
            platform_version: 'v2',
          })
          .select()
          .single();

        if (studioError) {
          console.error(`Error creating studio for ${role}:`, studioError);
          return NextResponse.json(
            { error: 'Failed to create client', details: `Could not create studio for ${role}` },
            { status: 500 }
          );
        }

        studioId = newStudio.id;

        // Update bs_staff to link to the new studio
        await serviceClient
          .from('bs_staff')
          .update({ studio_id: newStudio.id })
          .eq('id', user.id)
          .is('studio_id', null);
      } else {
        // Other roles (trainers, managers) need to have a studio_id assigned
        return NextResponse.json(
          { error: 'Failed to create client', details: 'No studio associated with your account' },
          { status: 400 }
        );
      }
    }

    // Create client data - let database generate UUID if not provided
    // Note: is_onboarded should be TRUE for clients because the onboarding flow
    // is only for solo practitioners and studio owners, not for clients.
    // Clients don't need to go through onboarding - they can access the dashboard immediately.
    const clientData: Record<string, unknown> = {
      first_name: body.firstName || body.first_name || null,
      last_name: body.lastName || body.last_name || null,
      name: body.name || `${body.firstName || ''} ${body.lastName || ''}`.trim() || null,
      email: body.email,
      phone: body.phone || null,
      studio_id: studioId,
      invited_by: user.id,
      is_onboarded: true, // Clients are considered "onboarded" - they don't need to go through onboarding
      is_guest: true, // Mark as guest until they accept invitation and create auth account
      self_booking_allowed: body.selfBookingAllowed || false,
      credits: body.credits || 0,
      source: 'manual',
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

    // Send welcome email if requested
    let emailSent = false;
    let emailError: string | null = null;

    if (body.sendWelcomeEmail) {
      try {
        // Generate secure token for invitation
        const token = crypto.randomBytes(32).toString('base64url');

        // Set expiry (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation record
        const { data: invitation, error: invError } = await serviceClient
          .from('ta_client_invitations')
          .insert({
            studio_id: studioId,
            invited_by: user.id,
            email: body.email.toLowerCase(),
            first_name: body.firstName || body.first_name || null,
            last_name: body.lastName || body.last_name || null,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (invError) {
          // If table doesn't exist, continue without email
          if (invError.code === '42P01') {
            console.warn('Client invitations table not set up. Skipping welcome email.');
            emailError = 'Invitation system not configured';
          } else {
            console.error('Error creating invitation:', invError);
            emailError = invError.message;
          }
        } else if (invitation) {
          // Send the welcome email
          const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-invite/${token}`;

          // Get inviter's name and studio info
          const inviterName = profile.firstName
            ? `${profile.firstName} ${profile.lastName || ''}`.trim()
            : 'Your trainer';

          const { data: studio } = await serviceClient
            .from('bs_studios')
            .select('name')
            .eq('id', studioId)
            .maybeSingle();

          const result = await sendClientInvitationEmail({
            recipientEmail: body.email.toLowerCase(),
            recipientName: body.firstName || body.first_name || undefined,
            inviterName,
            studioName: studio?.name || undefined,
            inviteUrl,
            invitationId: invitation.id,
          });

          emailSent = result.success;
          if (!result.success) {
            emailError = result.error || 'Unknown email error';
          }
        }
      } catch (err) {
        console.error('Error sending welcome email:', err);
        emailError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    return NextResponse.json({ client: data, emailSent, emailError }, { status: 201 });
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
 * PATCH /api/clients
 * Partially updates a client by ID (passed as query param)
 * Supports archiving/restoring clients
 */
export async function PATCH(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const body = await request.json();

    // Build update data - only include allowed fields
    const updateData: Record<string, unknown> = {};

    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.credits !== undefined) updateData.credits = body.credits;
    if (body.is_onboarded !== undefined) updateData.is_onboarded = body.is_onboarded;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Check if client exists and belongs to user's studio
    const studioId = profile.studio_id || user.id;
    const { data: existing } = await serviceClient
      .from('fc_clients')
      .select('id, studio_id')
      .eq('id', clientId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (existing.studio_id !== studioId && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Client does not belong to your studio' }, { status: 403 });
    }

    const { data, error } = await serviceClient
      .from('fc_clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'Failed to update client', details: error.message },
        { status: 500 }
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
