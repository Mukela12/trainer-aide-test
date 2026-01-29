import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/clients/[id]/credits - Get client's credit balance
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

    // Get all active packages for this client
    const { data: packages, error } = await supabase
      .from('ta_client_packages')
      .select(`
        id,
        sessions_total,
        sessions_used,
        sessions_remaining,
        purchased_at,
        expires_at,
        status,
        ta_packages (
          name,
          price_cents
        )
      `)
      .eq('client_id', clientId)
      .eq('trainer_id', user.id)
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('Error fetching client credits:', error);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    // Calculate totals
    const activePackages = packages.filter((p) => p.status === 'active');
    const totalCredits = activePackages.reduce((sum, p) => sum + p.sessions_remaining, 0);
    const nearestExpiry = activePackages.length > 0 ? activePackages[0].expires_at : null;

    // Determine credit status
    let creditStatus: 'none' | 'low' | 'medium' | 'good' = 'none';
    if (totalCredits > 5) creditStatus = 'good';
    else if (totalCredits > 2) creditStatus = 'medium';
    else if (totalCredits > 0) creditStatus = 'low';

    return NextResponse.json({
      totalCredits,
      creditStatus,
      nearestExpiry,
      packages: packages.map((p) => ({
        id: p.id,
        packageName: (p.ta_packages as any)?.name || 'Unknown Package',
        sessionsTotal: p.sessions_total,
        sessionsUsed: p.sessions_used,
        sessionsRemaining: p.sessions_remaining,
        purchasedAt: p.purchased_at,
        expiresAt: p.expires_at,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Error in credits GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients/[id]/credits - Manually add credits or deduct
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { action, packageId, sessions, notes } = body;

    if (!action || !['add', 'deduct'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add" or "deduct"' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'add') {
      // Add credits - requires a package selection
      if (!packageId || !sessions) {
        return NextResponse.json(
          { error: 'Package ID and sessions required for adding credits' },
          { status: 400 }
        );
      }

      // Get package details
      const { data: pkg } = await supabase
        .from('ta_packages')
        .select('validity_days')
        .eq('id', packageId)
        .single();

      const validityDays = pkg?.validity_days || 90;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      // Create client package (manual addition - no payment)
      const { data: clientPackage, error: insertError } = await supabase
        .from('ta_client_packages')
        .insert({
          client_id: clientId,
          package_id: packageId,
          trainer_id: user.id,
          sessions_total: sessions,
          sessions_used: 0,
          expires_at: expiresAt.toISOString(),
          status: 'active',
          notes: notes || 'Manual credit addition',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding credits:', insertError);
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      }

      // Log the credit addition
      await supabase.from('ta_credit_usage').insert({
        client_package_id: clientPackage.id,
        credits_used: -sessions, // Negative = addition
        balance_after: sessions,
        reason: 'manual_addition',
        notes,
        created_by: user.id,
      });

      return NextResponse.json({
        success: true,
        creditsAdded: sessions,
        expiresAt: expiresAt.toISOString(),
      });
    } else {
      // Deduct credits using FIFO
      const deductAmount = sessions || 1;

      // Call the database function
      const { data, error: deductError } = await supabase.rpc('deduct_client_credit', {
        p_client_id: clientId,
        p_trainer_id: user.id,
        p_booking_id: null,
        p_credits: deductAmount,
      });

      if (deductError) {
        console.error('Error deducting credits:', deductError);
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }

      return NextResponse.json({
        success: data,
        creditsDeducted: data ? deductAmount : 0,
      });
    }
  } catch (error) {
    console.error('Error in credits POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
