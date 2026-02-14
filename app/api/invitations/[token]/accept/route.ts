import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  acceptStaffInvitation,
  StaffInvitationError,
} from '@/lib/services/staff-invitation-service';

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

    // Parse request body for password (for new users)
    let password: string | undefined;
    try {
      const body = await request.json();
      password = body.password;
    } catch {
      // No body or invalid JSON - that's okay for authenticated users
    }

    // Try to get authenticated user (may be null for new signups)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await acceptStaffInvitation(
      token,
      user?.id ?? null,
      password
    );

    if (error) {
      const status = mapErrorToStatus(error);
      const body: Record<string, unknown> = { error: error.message };

      // Include extra fields (e.g. requiresLogin) for the client
      if (error instanceof StaffInvitationError && error.extra) {
        Object.assign(body, error.extra);
      }

      return NextResponse.json(body, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapErrorToStatus(err: Error): number {
  if (err instanceof StaffInvitationError) {
    switch (err.status) {
      case 'not_found':
        return 404;
      case 'bad_request':
        return 400;
      case 'requires_login':
        return 401;
      case 'forbidden':
        return 403;
      case 'conflict':
        return 409;
      case 'internal':
      default:
        return 500;
    }
  }
  return 500;
}
