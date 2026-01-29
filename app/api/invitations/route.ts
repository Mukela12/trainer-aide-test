import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/notifications/email-service';

// GET /api/invitations - List studio invitations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's studio
    const { data: staff } = await supabase
      .from('bs_staff')
      .select('studio_id, staff_type')
      .eq('id', user.id)
      .single();

    if (!staff?.studio_id || !['owner', 'admin'].includes(staff.staff_type)) {
      return NextResponse.json({ error: 'Not authorized to manage invitations' }, { status: 403 });
    }

    // Fetch invitations
    const { data: invitations, error } = await supabase
      .from('ta_invitations')
      .select('*')
      .eq('studio_id', staff.studio_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        firstName: inv.first_name,
        lastName: inv.last_name,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
      }))
    );
  } catch (error) {
    console.error('Error in invitations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invitations - Create invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, role, message, commissionPercent } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's studio
    const { data: staff } = await supabase
      .from('bs_staff')
      .select('studio_id, staff_type')
      .eq('id', user.id)
      .single();

    if (!staff?.studio_id || !['owner', 'admin'].includes(staff.staff_type)) {
      return NextResponse.json({ error: 'Not authorized to create invitations' }, { status: 403 });
    }

    // Check if invitation already exists
    const { data: existing } = await supabase
      .from('ta_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('studio_id', staff.studio_id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'An invitation for this email already exists' }, { status: 409 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('ta_invitations')
      .insert({
        studio_id: staff.studio_id,
        invited_by: user.id,
        email: email.toLowerCase(),
        first_name: firstName || null,
        last_name: lastName || null,
        role: role || 'trainer',
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        message: message || null,
        commission_percent: commissionPercent || 70,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating invitation:', createError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    try {
      // Get inviter's name and studio info
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const { data: studio } = await supabase
        .from('bs_studios')
        .select('name')
        .eq('id', staff.studio_id)
        .single();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'A team member'
        : 'A team member';

      await sendInvitationEmail({
        recipientEmail: email.toLowerCase(),
        recipientName: firstName || undefined,
        inviterName,
        studioName: studio?.name || undefined,
        role: role || 'trainer',
        inviteUrl,
        message: message || undefined,
        invitationId: invitation.id,
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the invitation creation if email fails
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`,
    });
  } catch (error) {
    console.error('Error in invitations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invitations?id=xxx - Revoke invitation
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

    // Update invitation status to revoked
    const { error } = await supabase
      .from('ta_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('invited_by', user.id);

    if (error) {
      console.error('Error revoking invitation:', error);
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in invitations DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
