import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

// Default availability to seed for new trainers
const DEFAULT_AVAILABILITY = [
  // Monday - Friday: 6am - 8pm
  { day_of_week: 1, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 2, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 3, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 4, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  { day_of_week: 5, start_hour: 6, start_minute: 0, end_hour: 20, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  // Saturday: 7am - 12pm
  { day_of_week: 6, start_hour: 7, start_minute: 0, end_hour: 12, end_minute: 0, block_type: 'available', recurrence: 'weekly' },
  // Lunch break Mon-Fri: 12pm - 1pm
  { day_of_week: 1, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 2, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 3, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 4, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
  { day_of_week: 5, start_hour: 12, start_minute: 0, end_hour: 13, end_minute: 0, block_type: 'blocked', recurrence: 'weekly', reason: 'break' },
];

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
    const blockType = searchParams.get('blockType'); // 'available', 'blocked', or null for all

    let query = serviceClient
      .from('ta_availability')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week', { ascending: true })
      .order('start_hour', { ascending: true });

    if (blockType) {
      query = query.eq('block_type', blockType);
    }

    const { data: availability, error } = await query;

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch availability', details: error.message },
        { status: 500 }
      );
    }

    // If no availability exists, seed default availability
    if (!availability || availability.length === 0) {
      const defaultBlocks = DEFAULT_AVAILABILITY.map(block => ({
        ...block,
        trainer_id: trainerId,
        studio_id: studioId,
      }));

      const { data: seededAvailability, error: seedError } = await serviceClient
        .from('ta_availability')
        .insert(defaultBlocks)
        .select();

      if (seedError) {
        console.error('Error seeding default availability:', seedError);
        // Return empty array instead of failing
        return NextResponse.json({ availability: [] });
      }

      return NextResponse.json({ availability: seededAvailability || [] });
    }

    return NextResponse.json({ availability });
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

    const blockData = {
      trainer_id: body.trainerId || body.trainer_id || user.id,
      studio_id: studioId,
      block_type: body.blockType || body.block_type,
      recurrence: body.recurrence || 'weekly',
      day_of_week: body.dayOfWeek ?? body.day_of_week ?? null,
      start_hour: body.startHour ?? body.start_hour ?? null,
      start_minute: body.startMinute ?? body.start_minute ?? 0,
      end_hour: body.endHour ?? body.end_hour ?? null,
      end_minute: body.endMinute ?? body.end_minute ?? 0,
      specific_date: body.specificDate || body.specific_date || null,
      end_date: body.endDate || body.end_date || null,
      reason: body.reason || null,
      notes: body.notes || null,
    };

    const { data, error } = await serviceClient
      .from('ta_availability')
      .insert(blockData)
      .select()
      .single();

    if (error) {
      console.error('Error creating availability block:', error);
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

    const serviceClient = createServiceRoleClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.blockType !== undefined || body.block_type !== undefined) {
      updateData.block_type = body.blockType || body.block_type;
    }
    if (body.recurrence !== undefined) updateData.recurrence = body.recurrence;
    if (body.dayOfWeek !== undefined || body.day_of_week !== undefined) {
      updateData.day_of_week = body.dayOfWeek ?? body.day_of_week;
    }
    if (body.startHour !== undefined || body.start_hour !== undefined) {
      updateData.start_hour = body.startHour ?? body.start_hour;
    }
    if (body.startMinute !== undefined || body.start_minute !== undefined) {
      updateData.start_minute = body.startMinute ?? body.start_minute;
    }
    if (body.endHour !== undefined || body.end_hour !== undefined) {
      updateData.end_hour = body.endHour ?? body.end_hour;
    }
    if (body.endMinute !== undefined || body.end_minute !== undefined) {
      updateData.end_minute = body.endMinute ?? body.end_minute;
    }
    if (body.specificDate !== undefined || body.specific_date !== undefined) {
      updateData.specific_date = body.specificDate || body.specific_date;
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      updateData.end_date = body.endDate || body.end_date;
    }
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await serviceClient
      .from('ta_availability')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating availability block:', error);
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

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('ta_availability')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('Error deleting availability block:', error);
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
