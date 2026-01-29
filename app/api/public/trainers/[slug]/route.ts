import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only for public route
          },
        },
      }
    );

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        business_name,
        bio,
        location,
        years_experience,
        specializations,
        profile_image_url
      `)
      .eq('business_slug', slug)
      .eq('is_onboarded', true)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      businessName: profile.business_name,
      bio: profile.bio,
      location: profile.location,
      yearsExperience: profile.years_experience,
      specializations: profile.specializations,
      profileImageUrl: profile.profile_image_url,
    });
  } catch (error) {
    console.error('Error fetching trainer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
