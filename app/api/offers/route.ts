import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from '@/lib/services/offer-service';

const ALLOWED_ROLES = ['solo_practitioner', 'studio_owner', 'studio_manager', 'super_admin'];

/**
 * GET /api/offers
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await lookupUserProfile(createServiceRoleClient(), user);
    const { data, error } = await getOffers(profile?.studio_id ?? null, user.id);

    if (error) return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    return NextResponse.json({ offers: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/offers
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await lookupUserProfile(createServiceRoleClient(), user);
    if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    if (!ALLOWED_ROLES.includes(profile.role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const studioId = profile.studio_id;
    if (!studioId) return NextResponse.json({ error: 'User is not associated with a studio' }, { status: 400 });

    const body = await request.json();
    if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const { data, error } = await createOffer(studioId, user.id, body);
    if (error) return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    return NextResponse.json({ offer: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/offers
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await updateOffer(body.id, user.id, body);
    if (error) return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
    return NextResponse.json({ offer: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/offers
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');
    if (!offerId) return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });

    const { error } = await deleteOffer(offerId, user.id);
    if (error) return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
