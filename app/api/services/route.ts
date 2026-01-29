import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

// Default services to seed for new studios/practitioners
const DEFAULT_SERVICES = [
  { name: '30min PT Session', duration: 30, credits_required: 1, color: '#12229D', type: '1-2-1' },
  { name: '45min PT Session', duration: 45, credits_required: 1.5, color: '#A71075', type: '1-2-1' },
  { name: '60min PT Session', duration: 60, credits_required: 2, color: '#AB1D79', type: '1-2-1' },
  { name: '75min PT Session', duration: 75, credits_required: 2.5, color: '#F4B324', type: '1-2-1' },
  { name: '90min PT Session', duration: 90, credits_required: 3, color: '#12229D', type: '1-2-1' },
];

/**
 * GET /api/services
 * Fetches services for the authenticated user's studio
 * Seeds default services if none exist
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

    // For solo practitioners, user_id acts as studio_id
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = serviceClient
      .from('ta_services')
      .select('*')
      .or(`studio_id.eq.${studioId},created_by.eq.${user.id}`)
      .order('duration', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: services, error } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services', details: error.message },
        { status: 500 }
      );
    }

    // If no services exist, seed default services
    if (!services || services.length === 0) {
      const defaultServicesData = DEFAULT_SERVICES.map(service => ({
        ...service,
        studio_id: studioId,
        created_by: user.id,
        is_active: true,
        max_capacity: 1,
      }));

      const { data: seededServices, error: seedError } = await serviceClient
        .from('ta_services')
        .insert(defaultServicesData)
        .select();

      if (seedError) {
        console.error('Error seeding default services:', seedError);
        // Return empty array instead of failing
        return NextResponse.json({ services: [] });
      }

      return NextResponse.json({ services: seededServices || [] });
    }

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Creates a new service
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

    if (!body.name || !body.duration) {
      return NextResponse.json(
        { error: 'name and duration are required' },
        { status: 400 }
      );
    }

    const serviceData = {
      studio_id: studioId,
      name: body.name,
      description: body.description || null,
      duration: body.duration,
      type: body.type || '1-2-1',
      max_capacity: body.maxCapacity || body.max_capacity || 1,
      credits_required: body.creditsRequired || body.credits_required || 1,
      color: body.color || '#12229D',
      is_active: body.isActive !== undefined ? body.isActive : true,
      created_by: user.id,
    };

    const { data, error } = await serviceClient
      .from('ta_services')
      .insert(serviceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      return NextResponse.json(
        { error: 'Failed to create service', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services
 * Updates a service
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
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.maxCapacity !== undefined || body.max_capacity !== undefined) {
      updateData.max_capacity = body.maxCapacity || body.max_capacity;
    }
    if (body.creditsRequired !== undefined || body.credits_required !== undefined) {
      updateData.credits_required = body.creditsRequired || body.credits_required;
    }
    if (body.color !== undefined) updateData.color = body.color;
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updateData.is_active = body.isActive !== undefined ? body.isActive : body.is_active;
    }

    const { data, error } = await serviceClient
      .from('ta_services')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      return NextResponse.json(
        { error: 'Failed to update service', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ service: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services
 * Soft deletes a service (sets is_active = false)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('id');

    if (!serviceId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Soft delete by setting is_active = false
    const { data, error } = await serviceClient
      .from('ta_services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting service:', error);
      return NextResponse.json(
        { error: 'Failed to delete service', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ service: data, success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
