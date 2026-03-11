import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try the images database first (has full exercise library)
    const imagesUrl = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_URL;
    const imagesKey = process.env.IMAGES_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_IMAGES_SUPABASE_KEY;

    if (imagesUrl && imagesKey) {
      try {
        const imagesClient = createClient(imagesUrl, imagesKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await imagesClient
          .from('ta_exercise_library_original')
          .select('*')
          .order('name');

        if (!error && data && data.length > 0) {
          return NextResponse.json({ exercises: data, source: 'images' });
        }

        if (error) {
          console.warn('Images DB exercise fetch failed:', error.message);
        }
      } catch (err) {
        console.warn('Images DB connection failed, falling back to main DB');
      }
    }

    // Fallback: try the main database
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('ta_exercise_library_original')
      .select('*')
      .order('name');

    if (error) {
      console.error('Main DB exercise fetch failed:', error.message);
      return NextResponse.json({ exercises: [], source: 'none', error: error.message });
    }

    return NextResponse.json({ exercises: data || [], source: 'main' });
  } catch (err) {
    console.error('Exercise API error:', err);
    return NextResponse.json({ exercises: [], error: 'Failed to fetch exercises' }, { status: 500 });
  }
}
