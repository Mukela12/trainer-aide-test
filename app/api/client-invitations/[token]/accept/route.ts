import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/client-invitations/[token]/accept
 * Accept a client invitation and create account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Find and validate the invitation
    const { data: invitation, error: invError } = await serviceClient
      .from('ta_client_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already used or revoked' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await serviceClient
        .from('ta_client_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User already exists - link them as a client
      userId = existingUser.id;
    } else {
      // Create new user account
      const { data: newUser, error: signUpError } = await serviceClient.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Auto-confirm since they came through invitation
        user_metadata: {
          first_name: invitation.first_name,
          last_name: invitation.last_name,
        },
      });

      if (signUpError || !newUser.user) {
        console.error('Error creating user:', signUpError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    // Create or update profile for the user (profiles table doesn't have studio_id)
    const { error: profileError } = await serviceClient
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
    const { error: clientError } = await serviceClient
      .from('fc_clients')
      .upsert({
        id: userId,
        name: clientName, // Required NOT NULL column
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
    await serviceClient
      .from('ta_client_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitation.id);

    // Sign the user in
    const { data: session, error: signInError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
    });

    if (signInError) {
      console.error('Error generating sign-in link:', signInError);
    }

    return NextResponse.json({
      success: true,
      userId,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Error accepting client invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
