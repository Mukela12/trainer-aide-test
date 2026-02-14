import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPackages, createPackage, deletePackage } from '@/lib/services/package-service';

// GET /api/packages - List trainer's packages
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId') || user.id;
    const publicOnly = request.nextUrl.searchParams.get('public') === 'true';
    const format = request.nextUrl.searchParams.get('format') || undefined;

    const { data, error } = await getPackages(trainerId, { publicOnly, format });

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    // Wrapped format returns { packages, clientPackages }
    if (format === 'wrapped') {
      return NextResponse.json(data);
    }

    // Flat array for backwards compatibility (solo pages)
    return NextResponse.json(data!.packages);
  } catch (error) {
    console.error('Error in packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/packages - Create a new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sessionCount, priceCents } = body;

    if (!name || !sessionCount || !priceCents) {
      return NextResponse.json(
        { error: 'Name, session count, and price are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await createPackage(user.id, {
      name: body.name,
      description: body.description,
      sessionCount: body.sessionCount,
      priceCents: body.priceCents,
      validityDays: body.validityDays,
      isPublic: body.isPublic,
    });

    if (error) {
      console.error('Error creating package:', error);
      return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in packages POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/packages - Delete a package
export async function DELETE(request: NextRequest) {
  try {
    const packageId = request.nextUrl.searchParams.get('id');
    if (!packageId) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await deletePackage(packageId, user.id);

    if (error) {
      console.error('Error deleting package:', error);
      return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in packages DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
