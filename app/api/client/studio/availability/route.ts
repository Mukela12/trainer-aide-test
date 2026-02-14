import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientStudioAvailability } from '@/lib/services/availability-service';

/**
 * GET /api/client/studio/availability
 * Returns trainer availability for the client's studio
 * Query params:
 * - trainerId (optional): Filter by specific trainer
 * - date (optional): Filter by specific date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const date = request.nextUrl.searchParams.get('date');

    const { data, error } = await getClientStudioAvailability(
      user.email || '',
      trainerId,
      date
    );

    if (error) {
      if (error.message === 'Client not found') {
        return NextResponse.json(
          { error: 'Client not found', availability: [], existingBookings: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in client studio availability GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
