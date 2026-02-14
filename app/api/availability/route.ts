import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import {
  getAvailability,
  createAvailabilityBlock,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
} from '@/lib/services/availability-service';

/**
 * GET /api/availability
 * Fetches availability blocks for the authenticated trainer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId') || user.id;
    const blockType = searchParams.get('blockType');

    const { data, error } = await getAvailability(trainerId, studioId, blockType);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch availability', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability
 * Creates a new availability block
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
    const studioId = profile?.studio_id || user.id;

    const body = await request.json();

    if (!body.blockType && !body.block_type) {
      return NextResponse.json(
        { error: 'blockType is required' },
        { status: 400 }
      );
    }

    const { data, error } = await createAvailabilityBlock(user.id, studioId, body);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create availability block', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/availability
 * Updates an availability block
 */
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

    const { data, error } = await updateAvailabilityBlock(body.id, body);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update availability block', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/availability
 * Deletes an availability block
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('id');

    if (!blockId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const { error } = await deleteAvailabilityBlock(blockId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete availability block', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
