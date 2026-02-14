import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking } from '@/lib/services/booking-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trainerId,
      serviceId,
      scheduledAt,
      firstName,
      lastName,
      email,
      phone,
    } = body;

    // Validate required fields
    if (!trainerId || !serviceId || !scheduledAt || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await createPublicBooking({
      trainerId,
      serviceId,
      scheduledAt,
      firstName,
      lastName,
      email,
      phone,
    });

    if (error) {
      const status = error.message.includes('not found') || error.message.includes('not available')
        ? 404
        : error.message.includes('no longer available')
        ? 409
        : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
