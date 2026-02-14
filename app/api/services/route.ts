import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { getServices, createService, updateService, deleteService } from '@/lib/services/service-service';

async function authenticate() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const serviceClient = createServiceRoleClient();
  const profile = await lookupUserProfile(serviceClient, user);
  const studioId = profile?.studio_id || user.id;
  return { user, studioId };
}

export async function GET(request: NextRequest) {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeOnly = new URL(request.url).searchParams.get('activeOnly') === 'true';
  const { data, error } = await getServices(auth.studioId, auth.user.id, { activeOnly });

  if (error) return NextResponse.json({ error: 'Failed to fetch services', details: error.message }, { status: 500 });
  return NextResponse.json({ services: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name || !body.duration) {
    return NextResponse.json({ error: 'name and duration are required' }, { status: 400 });
  }

  const { data, error } = await createService(auth.studioId, auth.user.id, body);

  if (error) return NextResponse.json({ error: 'Failed to create service', details: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await updateService(body.id, body);

  if (error) return NextResponse.json({ error: 'Failed to update service', details: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticate();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceId = new URL(request.url).searchParams.get('id');
  if (!serviceId) return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });

  const { data, error } = await deleteService(serviceId);

  if (error) return NextResponse.json({ error: 'Failed to delete service', details: error.message }, { status: 500 });
  return NextResponse.json({ service: data, success: true });
}
