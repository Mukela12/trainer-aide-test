import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * POST /api/client/shop/claim
 * Claim a free package or offer
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'type and id are required' },
        { status: 400 }
      );
    }

    if (type !== 'package' && type !== 'offer') {
      return NextResponse.json(
        { error: 'type must be "package" or "offer"' },
        { status: 400 }
      );
    }

    // Find the client record for this user by email
    const { data: client } = await supabase
      .from('fc_clients')
      .select('id, studio_id, credits')
      .eq('email', user.email?.toLowerCase())
      .single();

    if (!client || !client.studio_id) {
      return NextResponse.json(
        { error: 'Client not found or not associated with a studio' },
        { status: 404 }
      );
    }

    if (type === 'package') {
      return claimPackage(supabase, client, id);
    } else {
      return claimOffer(supabase, client, id);
    }
  } catch (error) {
    console.error('Error in client shop claim POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function claimPackage(
  supabase: ReturnType<typeof createServerClient>,
  client: { id: string; studio_id: string; credits: number | null },
  packageId: string
) {
  // Get the package from credit_bundles (where studio owners create packages)
  const { data: pkg, error: pkgError } = await supabase
    .from('credit_bundles')
    .select('*')
    .eq('id', packageId)
    .single();

  if (pkgError || !pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  // Verify package belongs to client's studio
  if (pkg.studio_id !== client.studio_id) {
    return NextResponse.json(
      { error: 'Package does not belong to your studio' },
      { status: 403 }
    );
  }

  // Verify package is active
  if (!pkg.is_active) {
    return NextResponse.json(
      { error: 'Package is not available' },
      { status: 400 }
    );
  }

  // Verify package is free (total_price in credit_bundles is in decimal, not cents)
  if (pkg.total_price !== 0) {
    return NextResponse.json(
      { error: 'Only free packages can be claimed. Payment integration coming soon.' },
      { status: 400 }
    );
  }

  // Calculate expiry date using expiry_days from credit_bundles
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (pkg.expiry_days || 90));

  // Create client package record
  const { data: clientPackage, error: insertError } = await supabase
    .from('ta_client_packages')
    .insert({
      client_id: client.id,
      package_id: packageId,
      sessions_total: pkg.credit_count,
      sessions_used: 0,
      sessions_remaining: pkg.credit_count,
      purchased_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      payment_id: null, // Free package, no payment
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating client package:', insertError);
    return NextResponse.json(
      { error: 'Failed to claim package' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Successfully claimed "${pkg.name}" - ${pkg.credit_count} session${pkg.credit_count !== 1 ? 's' : ''} added!`,
    creditsGranted: pkg.credit_count,
    clientPackage: {
      id: clientPackage.id,
      packageName: pkg.name,
      sessionsTotal: clientPackage.sessions_total,
      expiresAt: clientPackage.expires_at,
    },
  });
}

async function claimOffer(
  supabase: ReturnType<typeof createServerClient>,
  client: { id: string; studio_id: string; credits: number | null },
  offerId: string
) {
  // Get the offer
  const { data: offer, error: offerError } = await supabase
    .from('referral_signup_links')
    .select('*')
    .eq('id', offerId)
    .single();

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  // Verify offer belongs to client's studio
  if (offer.studio_id !== client.studio_id) {
    return NextResponse.json(
      { error: 'Offer does not belong to your studio' },
      { status: 403 }
    );
  }

  // Verify offer is active
  if (!offer.is_active) {
    return NextResponse.json(
      { error: 'Offer is not available' },
      { status: 400 }
    );
  }

  // Check expiry
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Offer has expired' },
      { status: 400 }
    );
  }

  // Check capacity
  if (offer.max_referrals && offer.current_referrals >= offer.max_referrals) {
    return NextResponse.json(
      { error: 'Offer has reached maximum capacity' },
      { status: 400 }
    );
  }

  // Verify offer is free
  if (offer.payment_amount !== 0) {
    return NextResponse.json(
      { error: 'Only free offers can be claimed. Payment integration coming soon.' },
      { status: 400 }
    );
  }

  // Add credits to client
  const newCredits = (client.credits || 0) + (offer.credits || 0);
  const { error: updateError } = await supabase
    .from('fc_clients')
    .update({ credits: newCredits })
    .eq('id', client.id);

  if (updateError) {
    console.error('Error updating client credits:', updateError);
    return NextResponse.json(
      { error: 'Failed to grant credits' },
      { status: 500 }
    );
  }

  // Increment current_referrals count on the offer
  const { error: offerUpdateError } = await supabase
    .from('referral_signup_links')
    .update({ current_referrals: (offer.current_referrals || 0) + 1 })
    .eq('id', offerId);

  if (offerUpdateError) {
    console.error('Error updating offer referral count:', offerUpdateError);
    // Don't fail - credits already granted
  }

  return NextResponse.json({
    success: true,
    message: `Successfully claimed "${offer.title}" - ${offer.credits} credit${offer.credits !== 1 ? 's' : ''} added!`,
    creditsGranted: offer.credits,
    newTotalCredits: newCredits,
  });
}
