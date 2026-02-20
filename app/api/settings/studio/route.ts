import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS = [
  'booking_model',
  'soft_hold_length',
  'cancellation_window_hours',
  'cancellation_policy',
  'waitlist_config',
  'opening_hours',
  'session_types',
];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'solo_practitioner' && profile.role !== 'studio_owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Studio ID === user ID for solo/studio_owner
    const { data: studio, error: studioError } = await serviceClient
      .from('bs_studios')
      .select('booking_model, soft_hold_length, cancellation_window_hours, cancellation_policy, waitlist_config, opening_hours, session_types')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (studioError) {
      return NextResponse.json({ error: studioError.message }, { status: 500 });
    }

    return NextResponse.json(studio || {});
  } catch (error) {
    console.error('Error fetching studio settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'solo_practitioner' && profile.role !== 'studio_owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const { data: studio, error: studioError } = await serviceClient
      .from('bs_studios')
      .update(updates)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (studioError) {
      return NextResponse.json({ error: studioError.message }, { status: 500 });
    }

    return NextResponse.json(studio);
  } catch (error) {
    console.error('Error updating studio settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
