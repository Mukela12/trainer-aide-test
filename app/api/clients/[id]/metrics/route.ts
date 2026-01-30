import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { CreateBodyMetricInput } from '@/lib/types/body-metrics';

/**
 * GET /api/clients/[id]/metrics
 * List body metrics for a client with pagination and date range support
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = serviceClient
      .from('ta_body_metrics')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('recorded_at', startDate);
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate);
    }

    const { data: metrics, error, count } = await query;

    if (error) {
      console.error('Error fetching body metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      metrics,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients/[id]/metrics
 * Record new body metrics for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const body: CreateBodyMetricInput = await request.json();

    // Validate that at least one metric is provided
    const metricFields = [
      'weight_kg', 'body_fat_percent', 'muscle_mass_kg',
      'chest_cm', 'waist_cm', 'hips_cm',
      'arm_left_cm', 'arm_right_cm', 'thigh_left_cm', 'thigh_right_cm',
      'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    ];

    const hasMetric = metricFields.some(
      (field) => body[field as keyof CreateBodyMetricInput] !== undefined
    );

    if (!hasMetric) {
      return NextResponse.json(
        { error: 'At least one metric value is required' },
        { status: 400 }
      );
    }

    const metricData = {
      client_id: clientId,
      trainer_id: user.id,
      recorded_by: user.id,
      recorded_at: body.recorded_at || new Date().toISOString(),
      weight_kg: body.weight_kg ?? null,
      body_fat_percent: body.body_fat_percent ?? null,
      muscle_mass_kg: body.muscle_mass_kg ?? null,
      chest_cm: body.chest_cm ?? null,
      waist_cm: body.waist_cm ?? null,
      hips_cm: body.hips_cm ?? null,
      arm_left_cm: body.arm_left_cm ?? null,
      arm_right_cm: body.arm_right_cm ?? null,
      thigh_left_cm: body.thigh_left_cm ?? null,
      thigh_right_cm: body.thigh_right_cm ?? null,
      resting_heart_rate: body.resting_heart_rate ?? null,
      blood_pressure_systolic: body.blood_pressure_systolic ?? null,
      blood_pressure_diastolic: body.blood_pressure_diastolic ?? null,
      notes: body.notes ?? null,
      photo_urls: body.photo_urls || [],
    };

    const { data: metric, error } = await serviceClient
      .from('ta_body_metrics')
      .insert(metricData)
      .select()
      .single();

    if (error) {
      console.error('Error creating body metric:', error);
      return NextResponse.json(
        { error: 'Failed to create metric', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
