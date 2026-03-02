import { NextResponse } from 'next/server';
import { isSMSEnabled } from '@/lib/notifications/sms-service';

export async function GET() {
  return NextResponse.json({ enabled: isSMSEnabled() });
}
