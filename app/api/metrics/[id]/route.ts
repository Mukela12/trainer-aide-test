import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { UpdateBodyMetricInput } from '@/lib/types/body-metrics';

/**
 * GET /api/metrics/[id]
 * Get a single body metric record
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: metricId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: metric, error } = await serviceClient
      .from('ta_body_metrics')
      .select('*')
      .eq('id', metricId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
      }
      console.error('Error fetching metric:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metric', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/metrics/[id]
 * Update a body metric record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: metricId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const body: UpdateBodyMetricInput = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.recorded_at !== undefined) updateData.recorded_at = body.recorded_at;
    if (body.weight_kg !== undefined) updateData.weight_kg = body.weight_kg;
    if (body.body_fat_percent !== undefined) updateData.body_fat_percent = body.body_fat_percent;
    if (body.muscle_mass_kg !== undefined) updateData.muscle_mass_kg = body.muscle_mass_kg;
    if (body.chest_cm !== undefined) updateData.chest_cm = body.chest_cm;
    if (body.waist_cm !== undefined) updateData.waist_cm = body.waist_cm;
    if (body.hips_cm !== undefined) updateData.hips_cm = body.hips_cm;
    if (body.arm_left_cm !== undefined) updateData.arm_left_cm = body.arm_left_cm;
    if (body.arm_right_cm !== undefined) updateData.arm_right_cm = body.arm_right_cm;
    if (body.thigh_left_cm !== undefined) updateData.thigh_left_cm = body.thigh_left_cm;
    if (body.thigh_right_cm !== undefined) updateData.thigh_right_cm = body.thigh_right_cm;
    if (body.resting_heart_rate !== undefined) updateData.resting_heart_rate = body.resting_heart_rate;
    if (body.blood_pressure_systolic !== undefined) updateData.blood_pressure_systolic = body.blood_pressure_systolic;
    if (body.blood_pressure_diastolic !== undefined) updateData.blood_pressure_diastolic = body.blood_pressure_diastolic;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.photo_urls !== undefined) updateData.photo_urls = body.photo_urls;

    const { data: metric, error } = await serviceClient
      .from('ta_body_metrics')
      .update(updateData)
      .eq('id', metricId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
      }
      console.error('Error updating metric:', error);
      return NextResponse.json(
        { error: 'Failed to update metric', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/metrics/[id]
 * Delete a body metric record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: metricId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('ta_body_metrics')
      .delete()
      .eq('id', metricId);

    if (error) {
      console.error('Error deleting metric:', error);
      return NextResponse.json(
        { error: 'Failed to delete metric', details: error.message },
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
