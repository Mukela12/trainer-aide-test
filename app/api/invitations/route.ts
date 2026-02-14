import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getStaffInvitations,
  createStaffInvitation,
  revokeStaffInvitation,
  StaffInvitationError,
} from '@/lib/services/staff-invitation-service';

function errorStatus(err: Error): number {
  if (err instanceof StaffInvitationError) {
    switch (err.status) {
      case 'forbidden':
        return 403;
      case 'conflict':
        return 409;
      case 'not_found':
        return 404;
      case 'bad_request':
        return 400;
      case 'requires_login':
        return 401;
      case 'internal':
      default:
        return 500;
    }
  }
  return 500;
}

// GET /api/invitations - List studio invitations
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getStaffInvitations(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json(data);
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

    const { data, error } = await createStaffInvitation(user.id, {
      email,
      firstName,
      lastName,
      role,
      message,
      commissionPercent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json(data);
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

    const { data, error } = await revokeStaffInvitation(invitationId, user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in invitations DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
