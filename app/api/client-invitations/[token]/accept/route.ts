import { NextRequest, NextResponse } from 'next/server';
import { acceptInvitation } from '@/lib/services/invitation-service';

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

    const { data, error } = await acceptInvitation(token, password);

    if (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('expired') || error.message.includes('already used') ? 400
        : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error accepting client invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
