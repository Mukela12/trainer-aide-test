import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/packages - List trainer's packages
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requesting for a specific trainer (public view)
    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const publicOnly = request.nextUrl.searchParams.get('public') === 'true';

    let query = supabase
      .from('ta_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
      if (publicOnly) {
        query = query.eq('is_public', true).eq('is_active', true);
      }
    } else {
      query = query.eq('trainer_id', user.id);
    }

    const { data: packages, error } = await query;

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    return NextResponse.json(
      packages.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sessionCount: p.session_count,
        priceCents: p.price_cents,
        validityDays: p.validity_days,
        perSessionPriceCents: p.per_session_price_cents,
        savingsPercent: p.savings_percent,
        isActive: p.is_active,
        isPublic: p.is_public,
        createdAt: p.created_at,
      }))
    );
  } catch (error) {
    console.error('Error in packages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/packages - Create a new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, sessionCount, priceCents, validityDays, isPublic } = body;

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

    // Calculate per-session price
    const perSessionPriceCents = Math.round(priceCents / sessionCount);

    const { data: newPackage, error } = await supabase
      .from('ta_packages')
      .insert({
        trainer_id: user.id,
        name,
        description: description || null,
        session_count: sessionCount,
        price_cents: priceCents,
        validity_days: validityDays || 90,
        per_session_price_cents: perSessionPriceCents,
        is_active: true,
        is_public: isPublic !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating package:', error);
      return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
    }

    return NextResponse.json({
      id: newPackage.id,
      name: newPackage.name,
      description: newPackage.description,
      sessionCount: newPackage.session_count,
      priceCents: newPackage.price_cents,
      validityDays: newPackage.validity_days,
    });
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

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from('ta_packages')
      .update({ is_active: false })
      .eq('id', packageId)
      .eq('trainer_id', user.id);

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
