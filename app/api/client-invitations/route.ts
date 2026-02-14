import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import {
  getInvitationsForStudio,
  createInvitation,
  revokeInvitation,
} from '@/lib/services/invitation-service';

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

    const studioId = profile.studio_id || user.id;

    const { data: invitations, error } = await getInvitationsForStudio(studioId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations });
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
    if (!studioId) {
      const rolesWithFallback = ['solo_practitioner', 'studio_owner', 'studio_manager'];
      if (rolesWithFallback.includes(profile.role || '')) {
        studioId = user.id;
      }
    }

    if (!studioId) {
      return NextResponse.json({ error: 'No studio associated with your account' }, { status: 400 });
    }

    const inviterName = profile.firstName
      ? `${profile.firstName} ${profile.lastName || ''}`.trim()
      : 'Your trainer';

    const { data, error } = await createInvitation({
      studioId,
      invitedBy: user.id,
      email,
      firstName,
      lastName,
      message,
      inviterName,
    });

    if (error) {
      const status = error.message.includes('already exists') ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
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

    const { data, error } = await revokeInvitation(invitationId, user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in client invitations DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
