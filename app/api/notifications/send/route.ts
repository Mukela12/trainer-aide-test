import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  processNotificationQueue,
  getNotificationQueueStatus,
} from '@/lib/services/notification-service';

/**
 * POST /api/notifications/send
 * Process pending notifications from the queue
 * Can be called by a cron job (with API key) or an authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Check API key first (for cron jobs)
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.NOTIFICATION_API_KEY;

    let authorized = false;

    if (apiKey && authHeader === `Bearer ${apiKey}`) {
      authorized = true;
    }

    // If no API key match, check user auth
    if (!authorized) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const type = body.type;

    const { data: results, error } = await processNotificationQueue(batchSize, type);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (results && results.processed === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending notifications' });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Unexpected error in notification processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/send
 * Get notification queue status
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: counts, error } = await getNotificationQueueStatus();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queue: counts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
