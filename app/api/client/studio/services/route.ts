import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/services
 * Returns bookable services for the client's studio
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the client record for this user by email to get studio_id
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client || !client.studio_id) {
      return NextResponse.json(
        { error: 'Client not found or not associated with a studio' },
        { status: 404 }
      );
    }

    // Get active, public services for this studio
    const { data: services, error } = await supabase
      .from('ta_services')
      .select(`
        id,
        name,
        description,
        duration,
        credits_required,
        type,
        color
      `)
      .eq('studio_id', client.studio_id)
      .eq('is_active', true)
      .eq('is_public', true)
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({
      services: (services || []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        creditsRequired: s.credits_required,
        type: s.type,
        color: s.color,
      })),
    });
  } catch (error) {
    console.error('Error in client studio services GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
