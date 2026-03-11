import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

const COOLDOWN_MINUTES = 30;

/**
 * GET /api/clients/reward-credit?clientId=xxx
 * Check if a reward credit can be given (30-minute cooldown)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();

    const { data: recentReward } = await serviceClient
      .from('ta_credit_rewards')
      .select('id, created_at')
      .eq('client_id', clientId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentReward) {
      const nextAllowed = new Date(new Date(recentReward.created_at).getTime() + COOLDOWN_MINUTES * 60 * 1000);
      const minutesLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / 60000);
      return NextResponse.json({ canReward: false, minutesLeft, nextAllowedAt: nextAllowed.toISOString() });
    }

    return NextResponse.json({ canReward: true, minutesLeft: 0 });
  } catch (error) {
    console.error('Error checking reward cooldown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/clients/reward-credit
 * Award 1 credit to a client with 30-minute cooldown enforcement
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
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const allowedRoles = ['solo_practitioner', 'studio_owner', 'studio_manager', 'trainer', 'super_admin'];
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, reason } = body;

    if (!clientId || !reason?.trim()) {
      return NextResponse.json({ error: 'clientId and reason are required' }, { status: 400 });
    }

    // Enforce 30-minute cooldown
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentReward } = await serviceClient
      .from('ta_credit_rewards')
      .select('id, created_at')
      .eq('client_id', clientId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentReward) {
      const nextAllowed = new Date(new Date(recentReward.created_at).getTime() + COOLDOWN_MINUTES * 60 * 1000);
      const minutesLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `This client was already rewarded recently. Please wait ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}.` },
        { status: 429 }
      );
    }

    // Get current credits
    const { data: client, error: clientError } = await serviceClient
      .from('fc_clients')
      .select('credits')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const currentCredits = client.credits || 0;
    const newTotal = currentCredits + 1;

    // Update credits
    const { error: updateError } = await serviceClient
      .from('fc_clients')
      .update({ credits: newTotal })
      .eq('id', clientId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    // Record the reward
    const studioId = profile.studio_id || user.id;
    await serviceClient
      .from('ta_credit_rewards')
      .insert({
        client_id: clientId,
        studio_id: studioId,
        awarded_by: user.id,
        reason: reason.trim(),
        credits_awarded: 1,
      });

    return NextResponse.json({ success: true, newTotal });
  } catch (error) {
    console.error('Error awarding reward credit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
