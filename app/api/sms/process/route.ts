import { NextRequest, NextResponse } from 'next/server';
import { processSMSQueue } from '@/lib/notifications/sms-service';

export async function POST(request: NextRequest) {
  try {
    // Auth via shared API key
    const authHeader = request.headers.get('x-notification-api-key');
    const expectedKey = process.env.NOTIFICATION_API_KEY;

    if (!expectedKey || authHeader !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = (body as { batchSize?: number }).batchSize || 10;

    const result = await processSMSQueue(batchSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing SMS queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
