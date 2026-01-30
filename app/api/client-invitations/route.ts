import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import crypto from 'crypto';
import { sendClientInvitationEmail } from '@/lib/notifications/email-service';

/**
 * GET /api/client-invitations
 * List all client invitations for the studio
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get studio ID
    const studioId = profile.studio_id || user.id;

    // Fetch client invitations
    const { data: invitations, error } = await serviceClient
      .from('ta_client_invitations')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ invitations: [] });
      }
      console.error('Error fetching client invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({
      invitations: (invitations || []).map((inv: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        status: string;
        expires_at: string;
        accepted_at: string | null;
        created_at: string;
      }) => ({
        id: inv.id,
        email: inv.email,
        firstName: inv.first_name,
        lastName: inv.last_name,
        status: inv.status,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
      })),
    });
  } catch (error) {
    console.error('Error in client invitations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/client-invitations
 * Create a new client invitation and send email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, message } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only certain roles can invite clients
    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer'];
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'Not authorized to invite clients' }, { status: 403 });
    }

    // Get or create studio ID
    let studioId = profile.studio_id;
    if (!studioId && profile.role === 'solo_practitioner') {
      studioId = user.id;
    }

    if (!studioId) {
      return NextResponse.json({ error: 'No studio associated with your account' }, { status: 400 });
    }

    // Check if invitation already exists
    const { data: existing } = await serviceClient
      .from('ta_client_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('studio_id', studioId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'An invitation for this email already exists' }, { status: 409 });
    }

    // Check if client already exists
    const { data: existingClient } = await serviceClient
      .from('fc_clients')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('studio_id', studioId)
      .maybeSingle();

    if (existingClient) {
      return NextResponse.json({ error: 'A client with this email already exists' }, { status: 409 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: createError } = await serviceClient
      .from('ta_client_invitations')
      .insert({
        studio_id: studioId,
        invited_by: user.id,
        email: email.toLowerCase(),
        first_name: firstName || null,
        last_name: lastName || null,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        message: message || null,
      })
      .select()
      .single();

    if (createError) {
      // If table doesn't exist, create it
      if (createError.code === '42P01') {
        return NextResponse.json({
          error: 'Client invitations table not set up. Please run migrations.',
          details: 'Table ta_client_invitations does not exist'
        }, { status: 500 });
      }
      console.error('Error creating invitation:', createError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-invite/${token}`;
    let emailSent = false;
    let emailError: string | null = null;

    try {
      // Get inviter's name and studio info
      const inviterName = profile.firstName
        ? `${profile.firstName} ${profile.lastName || ''}`.trim()
        : 'Your trainer';

      const { data: studio } = await serviceClient
        .from('bs_studios')
        .select('name')
        .eq('id', studioId)
        .maybeSingle();

      await sendClientInvitationEmail({
        recipientEmail: email.toLowerCase(),
        recipientName: firstName || undefined,
        inviterName,
        studioName: studio?.name || undefined,
        inviteUrl,
        message: message || undefined,
        invitationId: invitation.id,
      });
      emailSent = true;
    } catch (err) {
      console.error('Error sending client invitation email:', err);
      emailError = err instanceof Error ? err.message : 'Unknown email error';
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      inviteUrl,
      emailSent,
      emailError,
    });
  } catch (error) {
    console.error('Error in client invitations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/client-invitations?id=xxx
 * Revoke a client invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const invitationId = request.nextUrl.searchParams.get('id');
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('ta_client_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('invited_by', user.id);

    if (error) {
      console.error('Error revoking invitation:', error);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in client invitations DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
