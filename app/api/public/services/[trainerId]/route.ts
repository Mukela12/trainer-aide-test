import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> }
) {
  try {
    const { trainerId } = await params;
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

    const { data: services, error } = await supabase
      .from('ta_services')
      .select(`
        id,
        name,
        description,
        duration,
        type,
        max_capacity,
        price_cents,
        is_intro_session
      `)
      .eq('created_by', trainerId)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('is_intro_session', { ascending: false })
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        type: s.type,
        maxCapacity: s.max_capacity,
        priceCents: s.price_cents,
        isIntro: s.is_intro_session || false,
      }))
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
