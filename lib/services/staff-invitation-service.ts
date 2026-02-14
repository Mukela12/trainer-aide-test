/**
 * Staff Invitation Service
 *
 * Business logic for staff/trainer invitation operations.
 * Uses the `ta_invitations` table (NOT `ta_client_invitations` which is for clients).
 * Extracted from api/invitations and api/invitations/[token]/accept routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendInvitationEmail } from '@/lib/notifications/email-service';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StaffInvitationSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface CreateStaffInvitationInput {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  message?: string;
  commissionPercent?: number;
}

interface CreateStaffInvitationResult {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  inviteUrl: string;
  emailSent: boolean;
  emailError: string | null;
}

interface AcceptStaffInvitationResult {
  success: boolean;
  message: string;
  redirectUrl: string;
  role: string;
}

/**
 * Status hint returned alongside errors so route handlers can pick HTTP codes.
 */
export type StaffInvitationErrorStatus =
  | 'forbidden'
  | 'conflict'
  | 'not_found'
  | 'bad_request'
  | 'requires_login'
  | 'internal';

export class StaffInvitationError extends Error {
  status: StaffInvitationErrorStatus;
  extra?: Record<string, unknown>;

  constructor(
    message: string,
    status: StaffInvitationErrorStatus,
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StaffInvitationError';
    this.status = status;
    this.extra = extra;
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Resolve the studio ID for a user.
 *
 * 1. Check bs_staff for an owner/admin/manager role.
 * 2. Fallback: check profiles for studio_owner or solo_practitioner.
 *
 * Returns null when the user is not associated with any studio.
 */
async function resolveStudioId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('studio_id, staff_type')
    .eq('id', userId)
    .single();

  if (
    staff?.studio_id &&
    ['owner', 'studio_owner', 'admin', 'manager'].includes(staff.staff_type as string)
  ) {
    return staff.studio_id as string;
  }

  // Fallback: profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, studio_id')
    .eq('id', userId)
    .single();

  if (
    profile &&
    ['studio_owner', 'solo_practitioner'].includes((profile.role as string) || '')
  ) {
    return (profile.studio_id as string) || userId;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all staff invitations for the caller's studio.
 */
export async function getStaffInvitations(
  userId: string
): Promise<{ data: StaffInvitationSummary[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();
    const studioId = await resolveStudioId(supabase, userId);

    if (!studioId) {
      return {
        data: null,
        error: new StaffInvitationError(
          'Not authorized to manage invitations',
          'forbidden'
        ),
      };
    }

    const { data: invitations, error } = await supabase
      .from('ta_invitations')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff invitations:', error);
      return { data: null, error: new Error('Failed to fetch invitations') };
    }

    const mapped = (invitations || []).map(
      (inv: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        status: string;
        expires_at: string;
        accepted_at: string | null;
        created_at: string;
      }) => ({
        id: inv.id,
        email: inv.email,
        firstName: inv.first_name,
        lastName: inv.last_name,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
      })
    );

    return { data: mapped, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a staff/trainer invitation and attempt to send an email.
 */
export async function createStaffInvitation(
  userId: string,
  input: CreateStaffInvitationInput
): Promise<{ data: CreateStaffInvitationResult | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();
    const studioId = await resolveStudioId(supabase, userId);

    if (!studioId) {
      return {
        data: null,
        error: new StaffInvitationError(
          'Not authorized to create invitations',
          'forbidden'
        ),
      };
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from('ta_invitations')
      .select('id')
      .eq('email', input.email.toLowerCase())
      .eq('studio_id', studioId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return {
        data: null,
        error: new StaffInvitationError(
          'An invitation for this email already exists',
          'conflict'
        ),
      };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('base64url');

    // Expiry: 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert invitation
    const { data: invitation, error: createError } = await supabase
      .from('ta_invitations')
      .insert({
        studio_id: studioId,
        invited_by: userId,
        email: input.email.toLowerCase(),
        first_name: input.firstName || null,
        last_name: input.lastName || null,
        role: input.role || 'trainer',
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        message: input.message || null,
        commission_percent: input.commissionPercent || 70,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating staff invitation:', createError);
      return { data: null, error: new Error('Failed to create invitation') };
    }

    // Build invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    // Attempt to send email (non-fatal)
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const { data: studio } = await supabase
        .from('bs_studios')
        .select('name')
        .eq('id', studioId)
        .single();

      const inviterName = inviterProfile
        ? `${(inviterProfile.first_name as string) || ''} ${(inviterProfile.last_name as string) || ''}`.trim() ||
          'A team member'
        : 'A team member';

      await sendInvitationEmail({
        recipientEmail: input.email.toLowerCase(),
        recipientName: input.firstName || undefined,
        inviterName,
        studioName: (studio?.name as string) || undefined,
        role: input.role || 'trainer',
        inviteUrl,
        message: input.message || undefined,
        invitationId: invitation.id as string,
      });
      emailSent = true;
    } catch (err) {
      console.error('Error sending staff invitation email:', err);
      emailError =
        err instanceof Error ? err.message : 'Unknown email error';
    }

    return {
      data: {
        id: invitation.id as string,
        email: invitation.email as string,
        token: invitation.token as string,
        expiresAt: invitation.expires_at as string,
        inviteUrl,
        emailSent,
        emailError,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Revoke a staff invitation (only the inviter can revoke).
 */
export async function revokeStaffInvitation(
  invitationId: string,
  userId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('invited_by', userId);

    if (error) {
      console.error('Error revoking staff invitation:', error);
      return { data: null, error: new Error('Failed to revoke invitation') };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Accept a staff/trainer invitation.
 *
 * - Validates the token, status, and expiry.
 * - If the user already exists they must be logged in (userId must match).
 * - If the user is new, a password is required and an account is created.
 * - Upserts bs_staff and profiles records.
 * - Marks the invitation as accepted.
 */
export async function acceptStaffInvitation(
  token: string,
  userId: string | null,
  password?: string
): Promise<{ data: AcceptStaffInvitationResult | null; error: Error | null }> {
  try {
    const serviceClient = createServiceRoleClient();

    // Fetch invitation by token
    const { data: invitation, error: fetchError } = await serviceClient
      .from('ta_invitations')
      .select(
        'id, email, first_name, last_name, role, studio_id, status, expires_at, commission_percent'
      )
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      return {
        data: null,
        error: new StaffInvitationError(
          'Invalid invitation token',
          'not_found'
        ),
      };
    }

    // Validate status
    if (invitation.status === 'accepted') {
      return {
        data: null,
        error: new StaffInvitationError(
          'Invitation already accepted',
          'bad_request'
        ),
      };
    }

    if (invitation.status !== 'pending') {
      return {
        data: null,
        error: new StaffInvitationError(
          'Invitation is no longer valid',
          'bad_request'
        ),
      };
    }

    if (new Date(invitation.expires_at as string) < new Date()) {
      return {
        data: null,
        error: new StaffInvitationError(
          'Invitation has expired',
          'bad_request'
        ),
      };
    }

    // Check if a user already exists with this email
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) =>
        u.email?.toLowerCase() === (invitation.email as string).toLowerCase()
    );

    let resolvedUserId: string;

    if (existingUser) {
      // Existing user must be logged in
      if (!userId || userId !== existingUser.id) {
        return {
          data: null,
          error: new StaffInvitationError(
            'An account with this email already exists. Please sign in first.',
            'requires_login',
            { requiresLogin: true }
          ),
        };
      }
      resolvedUserId = existingUser.id;
    } else {
      // New user -- password required
      if (!password || password.length < 8) {
        return {
          data: null,
          error: new StaffInvitationError(
            'Password must be at least 8 characters',
            'bad_request'
          ),
        };
      }

      const { data: newUser, error: createError } =
        await serviceClient.auth.admin.createUser({
          email: invitation.email as string,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
          },
        });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        return {
          data: null,
          error: new StaffInvitationError(
            'Failed to create account',
            'internal'
          ),
        };
      }

      resolvedUserId = newUser.user.id;
    }

    // ---- Map invitation role to staff_type ----
    const roleToStaffType: Record<string, string> = {
      trainer: 'trainer',
      instructor: 'instructor',
      manager: 'manager',
      receptionist: 'receptionist',
      admin: 'admin',
    };
    const staffType =
      roleToStaffType[invitation.role as string] || 'trainer';

    // ---- Upsert bs_staff ----
    const { data: existingStaff } = await serviceClient
      .from('bs_staff')
      .select('id, studio_id')
      .eq('id', resolvedUserId)
      .single();

    if (existingStaff) {
      const { error: updateStaffError } = await serviceClient
        .from('bs_staff')
        .update({
          studio_id: invitation.studio_id,
          staff_type: staffType,
          ...(existingStaff.studio_id !== invitation.studio_id
            ? {
                first_name: invitation.first_name || undefined,
                last_name: invitation.last_name || undefined,
              }
            : {}),
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedUserId);

      if (updateStaffError) {
        console.error('Error updating staff record:', updateStaffError);
        return {
          data: null,
          error: new StaffInvitationError(
            'Failed to update staff record',
            'internal'
          ),
        };
      }
    } else {
      const { error: createStaffError } = await serviceClient
        .from('bs_staff')
        .insert({
          id: resolvedUserId,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          studio_id: invitation.studio_id,
          staff_type: staffType,
          is_onboarded: true,
          is_solo: false,
        });

      if (createStaffError) {
        console.error('Error creating staff record:', createStaffError);
        return {
          data: null,
          error: new StaffInvitationError(
            'Failed to create staff record',
            'internal'
          ),
        };
      }
    }

    // ---- Upsert profiles ----
    const roleToProfileRole: Record<string, string> = {
      trainer: 'trainer',
      instructor: 'trainer',
      manager: 'studio_manager',
      receptionist: 'receptionist',
      admin: 'studio_owner',
    };
    const profileRole =
      roleToProfileRole[invitation.role as string] || 'trainer';

    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', resolvedUserId)
      .single();

    if (existingProfile) {
      const { error: updateProfileError } = await serviceClient
        .from('profiles')
        .update({
          role: profileRole,
          studio_id: invitation.studio_id,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedUserId);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
        // Non-fatal: staff record is more important
      }
    } else {
      const { error: createProfileError } = await serviceClient
        .from('profiles')
        .insert({
          id: resolvedUserId,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          role: profileRole,
          studio_id: invitation.studio_id,
          is_onboarded: true,
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        // Non-fatal: staff record is more important
      }
    }

    // ---- Mark invitation as accepted ----
    const { error: updateInviteError } = await serviceClient
      .from('ta_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: resolvedUserId,
      })
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Error updating invitation:', updateInviteError);
      return {
        data: null,
        error: new StaffInvitationError(
          'Failed to update invitation status',
          'internal'
        ),
      };
    }

    // Determine redirect URL
    const roleToRedirect: Record<string, string> = {
      trainer: '/trainer',
      instructor: '/trainer',
      manager: '/studio-owner',
      admin: '/studio-owner',
      receptionist: '/studio-owner',
    };
    const redirectUrl =
      roleToRedirect[invitation.role as string] || '/trainer';

    return {
      data: {
        success: true,
        message: 'Invitation accepted successfully',
        redirectUrl,
        role: profileRole,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
