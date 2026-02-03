import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

/**
 * Generates a unique 8-character referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/offers
 * Fetches all offers/referral links for the authenticated user's studio
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Look up user profile to get studio_id
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id;

    let query = serviceClient
      .from('referral_signup_links')
      .select('*')
      .order('created_at', { ascending: false });

    if (studioId) {
      // Studio-level access: see all offers for this studio
      query = query.eq('studio_id', studioId);
    } else {
      // Fallback: only see own offers
      query = query.eq('created_by', user.id);
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }

    return NextResponse.json({ offers: offers || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/offers
 * Creates a new offer/referral link
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

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Get studio_id from profile
    const studioId = profile.studio_id;
    if (!studioId) {
      return NextResponse.json({ error: 'User is not associated with a studio' }, { status: 400 });
    }

    const offerData = {
      title: body.title,
      description: body.description || null,
      payment_amount: body.payment_amount || 0,
      currency: body.currency || 'GBP',
      max_referrals: body.max_referrals || null,
      current_referrals: 0,
      expires_at: body.expires_at || null,
      credits: body.credits || 0,
      expiry_days: body.expiry_days || 90,
      is_gift: body.is_gift || false,
      is_active: true,
      created_by: user.id,
      studio_id: studioId,
      referral_code: generateReferralCode(),
    };

    const { data, error } = await serviceClient
      .from('referral_signup_links')
      .insert(offerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating offer:', error);
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }

    return NextResponse.json({ offer: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/offers
 * Updates an existing offer
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.payment_amount !== undefined) updateData.payment_amount = body.payment_amount;
    if (body.max_referrals !== undefined) updateData.max_referrals = body.max_referrals;
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at;
    if (body.credits !== undefined) updateData.credits = body.credits;
    if (body.expiry_days !== undefined) updateData.expiry_days = body.expiry_days;
    if (body.is_gift !== undefined) updateData.is_gift = body.is_gift;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await serviceClient
      .from('referral_signup_links')
      .update(updateData)
      .eq('id', body.id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating offer:', error);
      return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
    }

    return NextResponse.json({ offer: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/offers
 * Deletes an offer by ID
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
    const offerId = searchParams.get('id');

    if (!offerId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('referral_signup_links')
      .delete()
      .eq('id', offerId)
      .eq('created_by', user.id);

    if (error) {
      console.error('Error deleting offer:', error);
      return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
