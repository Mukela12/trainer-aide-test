import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import {
  getBookingRequests,
  createBookingRequest,
  updateBookingRequest,
  deleteBookingRequest,
} from '@/lib/services/booking-request-service';
import {
  sendBookingRequestCreatedEmail,
  sendBookingRequestAcceptedEmail,
  sendBookingRequestDeclinedEmail,
} from '@/lib/notifications/email-service';

async function authenticate() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const serviceClient = createServiceRoleClient();
  const profile = await lookupUserProfile(serviceClient, user);
  const studioId = profile?.studio_id || user.id;
  return { user, studioId, serviceClient };
}

/** GET /api/booking-requests */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = new URL(request.url).searchParams.get('status') || undefined;
    const { data, error } = await getBookingRequests(auth.user.id, auth.studioId, { status });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/booking-requests */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.clientId && !body.client_id) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }
    if (!body.preferredTimes && !body.preferred_times) {
      return NextResponse.json({ error: 'preferredTimes is required' }, { status: 400 });
    }

    const { data, error } = await createBookingRequest(auth.studioId, auth.user.id, body);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send email notification to trainer (fire-and-forget)
    const trainerId = data!.trainer_id;
    const { data: trainer } = await auth.serviceClient
      .from('fc_trainers')
      .select('email, first_name, last_name')
      .eq('id', trainerId)
      .single();

    if (trainer?.email && data?.client) {
      const clientName = `${data.client.first_name || ''} ${data.client.last_name || ''}`.trim() || 'A client';
      const trainerName = `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Trainer';

      sendBookingRequestCreatedEmail({
        trainerEmail: trainer.email,
        trainerName,
        clientName,
        serviceName: data.service?.name ?? undefined,
        preferredTimes: data.preferred_times,
        notes: data.notes || undefined,
        requestId: data.id,
      }).catch((err) => console.error('Failed to send booking request email:', err));
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT /api/booking-requests */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await updateBookingRequest(body.id, auth.studioId, auth.user.id, body);
    if (error) {
      const status = error.message === 'Booking request not found' ? 404
        : error.message.includes('required') ? 400 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const updatedRequest = data!.request;

    // Send email notification to client (fire-and-forget)
    if (updatedRequest.client?.email && (body.status === 'accepted' || body.status === 'declined')) {
      const clientName = `${updatedRequest.client.first_name || ''} ${updatedRequest.client.last_name || ''}`.trim() || 'Client';
      const trainerId = updatedRequest.trainer_id || auth.user.id;
      const { data: trainer } = await auth.serviceClient
        .from('fc_trainers')
        .select('first_name, last_name')
        .eq('id', trainerId)
        .single();
      const trainerName = trainer
        ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your trainer'
        : 'Your trainer';

      if (body.status === 'accepted') {
        sendBookingRequestAcceptedEmail({
          clientEmail: updatedRequest.client.email,
          clientName,
          trainerName,
          serviceName: updatedRequest.service?.name ?? undefined,
          acceptedTime: body.acceptedTime || body.accepted_time,
          requestId: updatedRequest.id,
        }).catch((err) => console.error('Failed to send booking accepted email:', err));
      } else {
        sendBookingRequestDeclinedEmail({
          clientEmail: updatedRequest.client.email,
          clientName,
          trainerName,
          serviceName: updatedRequest.service?.name ?? undefined,
          requestId: updatedRequest.id,
        }).catch((err) => console.error('Failed to send booking declined email:', err));
      }
    }

    return NextResponse.json({ request: updatedRequest, booking: data!.booking });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/booking-requests */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requestId = new URL(request.url).searchParams.get('id');
    if (!requestId) return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });

    const { error } = await deleteBookingRequest(requestId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
