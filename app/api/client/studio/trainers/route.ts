import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/client/studio/trainers
 * Returns trainers at the client's studio
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

    // Get trainers (and owners/instructors) for this studio from bs_staff
    // bs_staff has first_name and last_name directly on it
    const { data: staff, error: staffError } = await supabase
      .from('bs_staff')
      .select('id, first_name, last_name, staff_type')
      .eq('studio_id', client.studio_id)
      .in('staff_type', ['trainer', 'owner', 'instructor']);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 });
    }

    if (!staff || staff.length === 0) {
      return NextResponse.json({ trainers: [] });
    }

    const trainers = staff.map((s) => ({
      id: s.id,
      firstName: s.first_name || '',
      lastName: s.last_name || '',
      fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Trainer',
    }));

    return NextResponse.json({ trainers });
  } catch (error) {
    console.error('Error in client studio trainers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
