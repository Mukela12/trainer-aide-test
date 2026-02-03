import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/check-client?email=xxx
 * Checks if an email belongs to an existing client in fc_clients
 * Used during auth callback to properly route clients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ isClient: false });
    }

    const serviceClient = createServiceRoleClient();

    // Check if email exists in fc_clients
    const { data: client, error } = await serviceClient
      .from('fc_clients')
      .select('id, first_name, last_name, email, studio_id, is_guest')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking client:', error);
      return NextResponse.json({ isClient: false });
    }

    if (client) {
      return NextResponse.json({
        isClient: true,
        clientId: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        studioId: client.studio_id,
        isGuest: client.is_guest,
      });
    }

    return NextResponse.json({ isClient: false });
  } catch (error) {
    console.error('Error in check-client:', error);
    return NextResponse.json({ isClient: false });
  }
}
