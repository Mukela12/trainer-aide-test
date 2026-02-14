import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getClientCredits,
  addClientCredits,
  deductClientCredits,
} from '@/lib/services/client-credits-service';

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

    const { data, error } = await getClientCredits(clientId, user.id);
    if (error) {
      console.error('Error fetching client credits:', error);
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in credits GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients/[id]/credits - Manually add or deduct credits
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
      if (!packageId || !sessions) {
        return NextResponse.json(
          { error: 'Package ID and sessions required for adding credits' },
          { status: 400 }
        );
      }

      const { data, error } = await addClientCredits(clientId, user.id, {
        packageId,
        sessions,
        notes,
      });
      if (error) {
        console.error('Error adding credits:', error);
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      }

      return NextResponse.json(data);
    } else {
      const deductAmount = sessions || 1;

      const { data, error } = await deductClientCredits(clientId, user.id, deductAmount);
      if (error) {
        console.error('Error deducting credits:', error);
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error in credits POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
