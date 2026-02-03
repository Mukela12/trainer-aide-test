import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/onboarding/check-slug
 * Checks if a business_slug is available.
 * Uses service role client to bypass RLS restrictions on reading other users' profiles.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const userId = searchParams.get('userId');

    // Validate required fields
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User must be checking for themselves
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized: userId mismatch' }, { status: 401 });
    }

    // Use service role client to bypass RLS for checking other profiles
    const serviceClient = createServiceRoleClient();

    // Check if slug is taken by another user
    const { data, error } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('business_slug', slug)
      .neq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking slug:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If data exists, the slug is taken
    const exists = !!data;

    return NextResponse.json({
      slug,
      exists,
      available: !exists
    });
  } catch (error) {
    console.error('Unexpected error in slug check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
