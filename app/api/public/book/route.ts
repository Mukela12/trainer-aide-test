import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('ta_services')
      .select('duration, price_cents, is_intro_session')
      .eq('id', serviceId)
      .eq('is_public', true)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found or not available' },
        { status: 404 }
      );
    }

    // Get trainer's studio_id
    const { data: trainerStaff } = await supabase
      .from('bs_staff')
      .select('studio_id')
      .eq('id', trainerId)
      .single();

    const studioId = trainerStaff?.studio_id || null;

    // Check for conflicts
    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + service.duration * 60 * 1000);

    const { data: conflicts } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', trainerId)
      .in('status', ['confirmed', 'soft-hold', 'checked-in'])
      .gte('scheduled_at', new Date(scheduledDate.getTime() - service.duration * 60 * 1000).toISOString())
      .lte('scheduled_at', scheduledAt);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Check if client exists with this specific studio
    // Multi-studio support: A client can have multiple fc_clients records (one per studio)
    let clientId: string;
    let isExistingAuthUser = false;

    // First check if there's an existing client for THIS studio
    const { data: existingClientForStudio } = await supabase
      .from('fc_clients')
      .select('id, is_guest')
      .eq('email', email.toLowerCase())
      .eq('studio_id', studioId)
      .maybeSingle();

    if (existingClientForStudio) {
      // Client already exists for this studio - use them
      clientId = existingClientForStudio.id;
      isExistingAuthUser = !existingClientForStudio.is_guest;
    } else {
      // Check if client exists with any other studio (might have an auth account)
      const { data: existingClientOtherStudio } = await supabase
        .from('fc_clients')
        .select('id, is_guest, first_name, last_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingClientOtherStudio && !existingClientOtherStudio.is_guest) {
        // Client has an account with another studio - create new fc_clients for this studio
        // but linked to the same auth user (same ID)
        isExistingAuthUser = true;

        const { data: newClient, error: clientError } = await supabase
          .from('fc_clients')
          .insert({
            id: existingClientOtherStudio.id, // Use same ID as existing auth-linked record
            first_name: existingClientOtherStudio.first_name || firstName,
            last_name: existingClientOtherStudio.last_name || lastName,
            name: `${existingClientOtherStudio.first_name || firstName} ${existingClientOtherStudio.last_name || lastName}`,
            email: email.toLowerCase(),
            phone: phone || null,
            is_guest: false, // Not a guest since they have an account
            is_onboarded: true,
            source: 'public_booking',
            invited_by: trainerId,
            studio_id: studioId,
          })
          .select()
          .single();

        if (clientError) {
          // Might fail due to unique constraint - that's OK, use existing ID
          console.warn('Could not create multi-studio client record:', clientError);
          clientId = existingClientOtherStudio.id;
        } else {
          clientId = newClient?.id || existingClientOtherStudio.id;
        }
      } else {
        // Create new guest client for this studio
        const { data: newClient, error: clientError } = await supabase
          .from('fc_clients')
          .insert({
            first_name: firstName,
            last_name: lastName,
            name: `${firstName} ${lastName}`,
            email: email.toLowerCase(),
            phone: phone || null,
            is_guest: true,
            is_onboarded: true, // Clients don't need onboarding
            source: 'public_booking',
            invited_by: trainerId,
            studio_id: studioId,
          })
          .select()
          .single();

        if (clientError || !newClient) {
          console.error('Error creating client:', clientError);
          return NextResponse.json(
            { error: 'Failed to create booking' },
            { status: 500 }
          );
        }
        clientId = newClient.id;
      }
    }

    // Create booking
    const isFree = !service.price_cents || service.price_cents === 0 || service.is_intro_session;
    const bookingStatus = isFree ? 'confirmed' : 'soft-hold';
    const holdExpiry = isFree
      ? null
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .insert({
        trainer_id: trainerId,
        client_id: clientId,
        service_id: serviceId,
        studio_id: studioId,
        scheduled_at: scheduledAt,
        duration: service.duration,
        status: bookingStatus,
        hold_expiry: holdExpiry,
        notes: `Booked via public page. Guest: ${firstName} ${lastName} (${email})`,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookingId: booking.id,
      status: bookingStatus,
      requiresPayment: !isFree,
      priceCents: service.price_cents,
      hasExistingAccount: isExistingAuthUser, // If true, client should login instead of creating account
      clientId: clientId,
    });
  } catch (error) {
    console.error('Error processing booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
