import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

interface CreditBundle {
  id: string;
  name: string;
  credit_count: number;
  total_price: number;
  price_per_credit: number;
  expiry_days: number | null;
  is_active: boolean;
  owner_id: string;
  studio_id: string | null;
  created_at: string;
}

/**
 * GET /api/credit-bundles
 * Fetches all credit bundles for the authenticated user's studio
 */
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

    const { data: bundles, error } = await serviceClient
      .from('credit_bundles')
      .select('*')
      .or(`owner_id.eq.${user.id},studio_id.eq.${studioId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit bundles:', error);
      return NextResponse.json({ error: 'Failed to fetch credit bundles' }, { status: 500 });
    }

    return NextResponse.json({ bundles: bundles || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/credit-bundles
 * Creates a new credit bundle
 */
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
    const pricePerCredit = body.total_price / body.credit_count;

    const bundleData = {
      name: body.name,
      credit_count: body.credit_count,
      total_price: body.total_price,
      price_per_credit: pricePerCredit,
      expiry_days: body.expiry_days || 90,
      is_active: true,
      owner_id: user.id,
      studio_id: studioId,
    };

    const { data, error } = await serviceClient
      .from('credit_bundles')
      .insert(bundleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating credit bundle:', error);
      return NextResponse.json({ error: 'Failed to create credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ bundle: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/credit-bundles
 * Updates an existing credit bundle
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.credit_count !== undefined) updateData.credit_count = body.credit_count;
    if (body.total_price !== undefined) updateData.total_price = body.total_price;
    if (body.expiry_days !== undefined) updateData.expiry_days = body.expiry_days;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (body.credit_count && body.total_price) {
      updateData.price_per_credit = body.total_price / body.credit_count;
    }

    const { data, error } = await serviceClient
      .from('credit_bundles')
      .update(updateData)
      .eq('id', body.id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating credit bundle:', error);
      return NextResponse.json({ error: 'Failed to update credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ bundle: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/credit-bundles
 * Deletes a credit bundle by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('id');

    if (!bundleId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('credit_bundles')
      .delete()
      .eq('id', bundleId)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error deleting credit bundle:', error);
      return NextResponse.json({ error: 'Failed to delete credit bundle' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
