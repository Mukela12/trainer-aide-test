import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientMetrics, createBodyMetric } from '@/lib/services/metric-service';
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    const { data, error } = await getClientMetrics(clientId, { limit, offset, startDate, endDate });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch metrics', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      metrics: data!.metrics,
      pagination: data!.pagination,
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

    const body: CreateBodyMetricInput = await request.json();

    // Validate that at least one metric is provided
    const metricFields = [
      'weight_kg', 'body_fat_percent', 'muscle_mass_kg',
      'chest_cm', 'waist_cm', 'hips_cm',
      'arm_left_cm', 'arm_right_cm', 'thigh_left_cm', 'thigh_right_cm',
      'resting_heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    ];

    const hasMetric = metricFields.some(
      (field: string) => body[field as keyof CreateBodyMetricInput] !== undefined
    );

    if (!hasMetric) {
      return NextResponse.json(
        { error: 'At least one metric value is required' },
        { status: 400 }
      );
    }

    const { data: metric, error } = await createBodyMetric(clientId, user.id, body);

    if (error) {
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
