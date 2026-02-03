import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/client/studios
 * Returns all studios the client is associated with
 * A client can be associated with multiple studios (one fc_clients record per studio)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get all fc_clients records for this user's email
    // In multi-studio model, a client can have multiple records (one per studio)
    const { data: clientRecords, error: clientError } = await serviceClient
      .from('fc_clients')
      .select(`
        id,
        studio_id,
        credits,
        is_onboarded,
        created_at,
        bs_studios (
          id,
          name,
          owner_id,
          profiles:owner_id (
            first_name,
            last_name,
            business_name,
            profile_image_url
          )
        )
      `)
      .eq('email', user.email?.toLowerCase())
      .eq('is_guest', false);

    if (clientError) {
      console.error('Error fetching client studios:', clientError);
      return NextResponse.json({ error: 'Failed to fetch studios' }, { status: 500 });
    }

    // Define the type for client records
    interface ClientRecord {
      id: string;
      studio_id: string | null;
      credits: number | null;
      is_onboarded: boolean;
      created_at: string;
      bs_studios: {
        id: string;
        name: string;
        owner_id: string;
        profiles?: {
          first_name: string | null;
          last_name: string | null;
          business_name: string | null;
          profile_image_url: string | null;
        };
      } | null;
    }

    // Transform the data
    const studios = (clientRecords as ClientRecord[] || [])
      .filter((record: ClientRecord) => record.studio_id && record.bs_studios)
      .map((record: ClientRecord) => {
        const studio = record.bs_studios!;
        const profile = studio?.profiles;

        return {
          id: studio.id,
          name: studio.name || profile?.business_name || 'Studio',
          ownerName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null,
          ownerAvatar: profile?.profile_image_url,
          credits: record.credits || 0,
          clientId: record.id,
          joinedAt: record.created_at,
        };
      });

    return NextResponse.json({ studios });
  } catch (error) {
    console.error('Error in client studios:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
