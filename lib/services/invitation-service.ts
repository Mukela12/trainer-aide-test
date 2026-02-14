/**
 * Invitation Service
 *
 * Business logic for client invitation operations.
 * Extracted from api/client-invitations and api/client-invitations/[token]/accept routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendClientInvitationEmail } from '@/lib/notifications/email-service';
import crypto from 'crypto';

/**
 * Get all invitations for a studio.
 */
export async function getInvitationsForStudio(
  studioId: string
): Promise<{
  data: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
  }> | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data: invitations, error } = await supabase
      .from('ta_client_invitations')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return { data: [], error: null };
      }
      console.error('Error fetching client invitations:', error);
      return { data: null, error: new Error(error.message) };
    }

    const mapped = (invitations || []).map((inv: {
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
    }));

    return { data: mapped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new client invitation and send email.
 */
export async function createInvitation(params: {
  studioId: string;
  invitedBy: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  message?: string | null;
  inviterName?: string;
}): Promise<{
  data: {
    id: string;
    email: string;
    token: string;
    expiresAt: string;
    inviteUrl: string;
    emailSent: boolean;
    emailError: string | null;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from('ta_client_invitations')
      .select('id')
      .eq('email', params.email.toLowerCase())
      .eq('studio_id', params.studioId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return { data: null, error: new Error('An invitation for this email already exists') };
    }

    // Check if client already exists
    const { data: existingClient } = await supabase
      .from('fc_clients')
      .select('id')
      .eq('email', params.email.toLowerCase())
      .eq('studio_id', params.studioId)
      .maybeSingle();

    if (existingClient) {
      return { data: null, error: new Error('A client with this email already exists') };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('ta_client_invitations')
      .insert({
        studio_id: params.studioId,
        invited_by: params.invitedBy,
        email: params.email.toLowerCase(),
        first_name: params.firstName || null,
        last_name: params.lastName || null,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        message: params.message || null,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '42P01') {
        return {
          data: null,
          error: new Error('Client invitations table not set up. Please run migrations.'),
        };
      }
      console.error('Error creating invitation:', createError);
      return { data: null, error: new Error('Failed to create invitation') };
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-invite/${token}`;
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const { data: studio } = await supabase
        .from('bs_studios')
        .select('name')
        .eq('id', params.studioId)
        .maybeSingle();

      await sendClientInvitationEmail({
        recipientEmail: params.email.toLowerCase(),
        recipientName: params.firstName || undefined,
        inviterName: params.inviterName || 'Your trainer',
        studioName: studio?.name || undefined,
        inviteUrl,
        message: params.message || undefined,
        invitationId: invitation.id,
      });
      emailSent = true;
    } catch (err) {
      console.error('Error sending client invitation email:', err);
      emailError = err instanceof Error ? err.message : 'Unknown email error';
    }

    return {
      data: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        expiresAt: invitation.expires_at,
        inviteUrl,
        emailSent,
        emailError,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Revoke a client invitation.
 */
export async function revokeInvitation(
  invitationId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_client_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('invited_by', userId);

    if (error) {
      console.error('Error revoking invitation:', error);
      return { data: null, error: new Error('Failed to revoke invitation') };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Accept a client invitation: validate token/expiry, create user, upsert profile + fc_clients, mark accepted.
 */
export async function acceptInvitation(
  token: string,
  password: string
): Promise<{
  data: { success: boolean; userId: string; message: string } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Find and validate the invitation
    const { data: invitation, error: invError } = await supabase
      .from('ta_client_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invError || !invitation) {
      return { data: null, error: new Error('Invitation not found') };
    }

    if (invitation.status !== 'pending') {
      return { data: null, error: new Error('Invitation already used or revoked') };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('ta_client_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return { data: null, error: new Error('Invitation expired') };
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.first_name,
          last_name: invitation.last_name,
        },
      });

      if (signUpError || !newUser.user) {
        console.error('Error creating user:', signUpError);
        return { data: null, error: new Error('Failed to create account') };
      }

      userId = newUser.user.id;
    }

    // Create or update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: invitation.email,
        first_name: invitation.first_name || null,
        last_name: invitation.last_name || null,
        role: 'client',
        is_onboarded: true,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Create client record in fc_clients
    const clientName = [invitation.first_name, invitation.last_name].filter(Boolean).join(' ') || invitation.email;
    const { error: clientError } = await supabase
      .from('fc_clients')
      .upsert({
        id: userId,
        name: clientName,
        studio_id: invitation.studio_id,
        email: invitation.email,
        first_name: invitation.first_name || null,
        last_name: invitation.last_name || null,
        is_onboarded: true,
        self_booking_allowed: true,
        credits: 0,
        invited_by: invitation.invited_by,
        source: 'invitation',
      }, { onConflict: 'id' });

    if (clientError) {
      console.error('Error creating client record:', clientError);
    }

    // Mark invitation as accepted
    await supabase
      .from('ta_client_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitation.id);

    // Generate sign-in link
    const { error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
    });

    if (signInError) {
      console.error('Error generating sign-in link:', signInError);
    }

    return {
      data: {
        success: true,
        userId,
        message: 'Account created successfully',
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
