import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  getHealthCheck,
  createHealthCheck,
  isHealthCheckValid,
} from '@/lib/services/health-check-service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up client record by email
    const serviceClient = createServiceRoleClient();
    const { data: client } = await serviceClient
      .from('fc_clients')
      .select('id, studio_id, health_check_completed_at')
      .ilike('email', user.email!)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check validity
    const { valid } = await isHealthCheckValid(client.id);

    // If valid, also fetch the full health check for pre-filling
    let healthCheck = null;
    if (client.health_check_completed_at) {
      const { data } = await getHealthCheck(client.id);
      healthCheck = data;
    }

    return NextResponse.json({
      completed: !!client.health_check_completed_at,
      valid,
      completedAt: client.health_check_completed_at,
      healthCheck,
    });
  } catch (error) {
    console.error('Error in health-check GET:', error);
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

    const body = await request.json();
    const { responses, emergency_contact_name, emergency_contact_phone } = body;

    if (!responses || !emergency_contact_name || !emergency_contact_phone) {
      return NextResponse.json(
        { error: 'responses, emergency_contact_name, and emergency_contact_phone are required' },
        { status: 400 }
      );
    }

    // Look up client record by email
    const serviceClient = createServiceRoleClient();
    const { data: client } = await serviceClient
      .from('fc_clients')
      .select('id, studio_id')
      .ilike('email', user.email!)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const hasConditions = Object.values(responses as Record<string, boolean>).some(
      (v: boolean) => v === true
    );

    const { data, error } = await createHealthCheck(client.id, client.studio_id, {
      responses,
      emergency_contact_name: emergency_contact_name.trim(),
      emergency_contact_phone: emergency_contact_phone.trim(),
      has_conditions: hasConditions,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to save health check' }, { status: 500 });
    }

    return NextResponse.json({ success: true, healthCheck: data });
  } catch (error) {
    console.error('Error in health-check POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
