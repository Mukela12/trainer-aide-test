import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/onboarding/studio-config
 * Generic endpoint to save studio configuration during onboarding.
 * Accepts partial updates to bs_studios columns.
 */
export async function POST(request: NextRequest) {
  try {
    const { updates, onboardingStep } = await request.json();

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a studio owner
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'studio_owner') {
      return NextResponse.json({ error: 'Only studio owners can use this endpoint' }, { status: 403 });
    }

    // Update bs_studios — studio id = user id during onboarding
    const { data, error } = await serviceClient
      .from('bs_studios')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating studio config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update onboarding step if provided
    if (typeof onboardingStep === 'number') {
      await serviceClient
        .from('profiles')
        .update({ onboarding_step: onboardingStep })
        .eq('id', user.id);
    }

    return NextResponse.json({ studio: data });
  } catch (error) {
    console.error('Unexpected error in studio-config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
