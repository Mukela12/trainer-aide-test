import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import {
  getCreditBundles,
  createCreditBundle,
  updateCreditBundle,
  deleteCreditBundle,
} from '@/lib/services/credit-bundle-service';

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
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const studioId = profile.studio_id || user.id;
    const { data: bundles, error } = await getCreditBundles(user.id, studioId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch credit bundles' }, { status: 500 });
    }

    return NextResponse.json({ bundles: bundles || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'super_admin'];
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name || !body.credit_count || !body.total_price) {
      return NextResponse.json({ error: 'name, credit_count, and total_price are required' }, { status: 400 });
    }

    const studioId = profile.studio_id || user.id;
    const { data, error } = await createCreditBundle({
      userId: user.id,
      studioId,
      name: body.name,
      creditCount: body.credit_count,
      totalPrice: body.total_price,
      expiryDays: body.expiry_days,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ bundle: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await updateCreditBundle(body.id, user.id, {
      name: body.name,
      credit_count: body.credit_count,
      total_price: body.total_price,
      expiry_days: body.expiry_days,
      is_active: body.is_active,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to update credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ bundle: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('id');

    if (!bundleId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const { error } = await deleteCreditBundle(bundleId, user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
