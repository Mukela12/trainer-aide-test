import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/client-invitations/[token]
 * Validate a client invitation token and return invitation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Find the invitation
    const { data: invitation, error } = await serviceClient
      .from('ta_client_invitations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        status,
        expires_at,
        message,
        studio_id,
        invited_by
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        error: invitation.status === 'accepted' ? 'Invitation already used' : 'Invitation ' + invitation.status
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await serviceClient
        .from('ta_client_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    // Get studio and inviter info
    let studioName = null;
    let inviterName = null;

    if (invitation.studio_id) {
      const { data: studio } = await serviceClient
        .from('bs_studios')
        .select('name')
        .eq('id', invitation.studio_id)
        .maybeSingle();
      studioName = studio?.name;
    }

    if (invitation.invited_by) {
      const { data: inviter } = await serviceClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', invitation.invited_by)
        .maybeSingle();
      if (inviter) {
        inviterName = `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || null;
      }
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      studioName,
      inviterName,
      message: invitation.message,
      expiresAt: invitation.expires_at,
    });
  } catch (error) {
    console.error('Error validating client invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
