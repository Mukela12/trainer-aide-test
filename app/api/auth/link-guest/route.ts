import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for this operation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auth/link-guest
 * Links a guest client record to a newly created auth account
 * Updates fc_clients.id to match the auth user's ID for proper API access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, userId, email } = body;

    if (!clientId || !userId || !email) {
      return NextResponse.json(
        { error: 'clientId, userId, and email are required' },
        { status: 400 }
      );
    }

    // Get full client details
    const { data: clientDetails, error: clientError } = await supabase
      .from('fc_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !clientDetails) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify the email matches
    if (clientDetails.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Check if client is already converted
    if (!clientDetails.is_guest) {
      return NextResponse.json(
        { error: 'This client already has an account' },
        { status: 409 }
      );
    }

    // Delete the old guest record
    const { error: deleteError } = await supabase
      .from('fc_clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Error removing old client record:', deleteError);
      // Continue anyway - the upsert below might still work
    }

    // Create new client record with user's ID
    // This ensures fc_clients.id matches auth.users.id for proper API access
    const { error: insertError } = await supabase
      .from('fc_clients')
      .upsert({
        id: userId, // Use the auth user's ID
        name: clientDetails.name,
        email: clientDetails.email,
        phone: clientDetails.phone,
        first_name: clientDetails.first_name,
        last_name: clientDetails.last_name,
        studio_id: clientDetails.studio_id,
        invited_by: clientDetails.invited_by,
        is_onboarded: true,
        is_guest: false, // No longer a guest
        self_booking_allowed: clientDetails.self_booking_allowed ?? true,
        credits: clientDetails.credits ?? 0,
        source: clientDetails.source || 'public_booking',
        notification_preferences: clientDetails.notification_preferences || {},
      }, { onConflict: 'id' });

    if (insertError) {
      console.error('Error creating linked client record:', insertError);
      return NextResponse.json(
        { error: 'Failed to link account' },
        { status: 500 }
      );
    }

    // Update any bookings to point to the new client ID
    const { error: bookingError } = await supabase
      .from('ta_bookings')
      .update({ client_id: userId })
      .eq('client_id', clientId);

    if (bookingError) {
      console.error('Error updating bookings:', bookingError);
      // Non-fatal, continue
    }

    // Create a profile record for the user if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: userId,
        first_name: clientDetails.first_name,
        last_name: clientDetails.last_name,
        email: clientDetails.email,
        role: 'client',
        is_onboarded: true,
      });
    }

    // Note: We do NOT create bs_staff record for clients
    // bs_staff is for trainers, managers, and studio staff - not clients

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in link-guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
