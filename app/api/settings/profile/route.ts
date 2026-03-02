import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'bio',
  'brand_color',
  'business_name',
];

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('first_name, last_name, phone, bio, brand_color, business_name, business_slug, role, business_logo_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json(profile || {});
  } catch (error) {
    console.error('Error fetching profile settings:', error);
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

    const body = await request.json();

    // Handle email change via auth admin API
    let emailChangeInitiated = false;
    if (body.email && body.email !== user.email) {
      const serviceClient = createServiceRoleClient();
      const { error: emailError } = await serviceClient.auth.admin.updateUserById(user.id, {
        email: body.email,
      });
      if (emailError) {
        return NextResponse.json({ error: `Email update failed: ${emailError.message}` }, { status: 500 });
      }
      emailChangeInitiated = true;
    }

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0 && !emailChangeInitiated) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    let profile = null;
    if (Object.keys(updates).length > 0) {
      const serviceClient = createServiceRoleClient();
      const { data, error: profileError } = await serviceClient
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      profile = data;
    }

    return NextResponse.json({ ...profile, emailChangeInitiated });
  } catch (error) {
    console.error('Error updating profile settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
