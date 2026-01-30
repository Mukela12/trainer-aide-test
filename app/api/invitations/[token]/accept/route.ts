import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/invitations/[token]/accept - Accept an invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Get the authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 });
    }

    // Use service role client for database operations (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    // Fetch the invitation by token
    const { data: invitation, error: fetchError } = await serviceClient
      .from('ta_invitations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        studio_id,
        status,
        expires_at,
        commission_percent
      `)
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    // Check if expired or revoked
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation is no longer valid' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Map invitation role to staff_type
    const roleToStaffType: Record<string, string> = {
      'trainer': 'trainer',
      'instructor': 'instructor',
      'manager': 'manager',
      'receptionist': 'receptionist',
      'admin': 'admin',
    };
    const staffType = roleToStaffType[invitation.role] || 'trainer';

    // Check if user already has a staff record
    const { data: existingStaff } = await serviceClient
      .from('bs_staff')
      .select('id, studio_id')
      .eq('id', user.id)
      .single();

    if (existingStaff) {
      // User already has a staff record - check if it's for a different studio
      if (existingStaff.studio_id && existingStaff.studio_id !== invitation.studio_id) {
        // Update to the new studio (or you could reject this - depends on business logic)
        const { error: updateStaffError } = await serviceClient
          .from('bs_staff')
          .update({
            studio_id: invitation.studio_id,
            staff_type: staffType,
            first_name: invitation.first_name || undefined,
            last_name: invitation.last_name || undefined,
            is_onboarded: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateStaffError) {
          console.error('Error updating staff record:', updateStaffError);
          return NextResponse.json({ error: 'Failed to update staff record' }, { status: 500 });
        }
      } else {
        // Same studio or no studio - just update the staff type
        const { error: updateStaffError } = await serviceClient
          .from('bs_staff')
          .update({
            studio_id: invitation.studio_id,
            staff_type: staffType,
            is_onboarded: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateStaffError) {
          console.error('Error updating staff record:', updateStaffError);
          return NextResponse.json({ error: 'Failed to update staff record' }, { status: 500 });
        }
      }
    } else {
      // Create new staff record
      const { error: createStaffError } = await serviceClient
        .from('bs_staff')
        .insert({
          id: user.id,
          email: invitation.email || user.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          studio_id: invitation.studio_id,
          staff_type: staffType,
          is_onboarded: true,
          is_solo: false,
        });

      if (createStaffError) {
        console.error('Error creating staff record:', createStaffError);
        return NextResponse.json({ error: 'Failed to create staff record' }, { status: 500 });
      }
    }

    // Update the user's profile to reflect the new role
    const roleToProfileRole: Record<string, string> = {
      'trainer': 'trainer',
      'instructor': 'trainer',
      'manager': 'studio_manager',
      'receptionist': 'receptionist',
      'admin': 'studio_owner',
    };
    const profileRole = roleToProfileRole[invitation.role] || 'trainer';

    // Check if profile exists
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateProfileError } = await serviceClient
        .from('profiles')
        .update({
          role: profileRole,
          studio_id: invitation.studio_id,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
        // Don't fail - staff record is more important
      }
    } else {
      // Create profile
      const { error: createProfileError } = await serviceClient
        .from('profiles')
        .insert({
          id: user.id,
          email: invitation.email || user.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          role: profileRole,
          studio_id: invitation.studio_id,
          is_onboarded: true,
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        // Don't fail - staff record is more important
      }
    }

    // Update invitation status to accepted
    const { error: updateInviteError } = await serviceClient
      .from('ta_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Error updating invitation:', updateInviteError);
      return NextResponse.json({ error: 'Failed to update invitation status' }, { status: 500 });
    }

    // Determine redirect URL based on role
    const roleToRedirect: Record<string, string> = {
      'trainer': '/trainer',
      'instructor': '/trainer',
      'manager': '/studio-owner',
      'admin': '/studio-owner',
      'receptionist': '/studio-owner',
    };
    const redirectUrl = roleToRedirect[invitation.role] || '/trainer';

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      redirectUrl,
      role: profileRole,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
