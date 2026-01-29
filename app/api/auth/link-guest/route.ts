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
 * Since fc_clients doesn't have user_id, we link by email and set is_guest=false
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

    // Verify the client exists and is a guest
    const { data: client, error: clientError } = await supabase
      .from('fc_clients')
      .select('id, is_guest, email')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify the email matches
    if (client.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Check if client is already converted
    if (!client.is_guest) {
      return NextResponse.json(
        { error: 'This client already has an account' },
        { status: 409 }
      );
    }

    // Update the client record to mark as not a guest
    const { error: updateError } = await supabase
      .from('fc_clients')
      .update({
        is_guest: false,
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error linking guest to account:', updateError);
      return NextResponse.json(
        { error: 'Failed to link account' },
        { status: 500 }
      );
    }

    // Create a profile record for the user if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Get client details to create profile
      const { data: clientDetails } = await supabase
        .from('fc_clients')
        .select('first_name, last_name, email')
        .eq('id', clientId)
        .single();

      if (clientDetails) {
        await supabase.from('profiles').insert({
          id: userId,
          first_name: clientDetails.first_name,
          last_name: clientDetails.last_name,
          email: clientDetails.email,
          role: 'client',
          is_onboarded: true,
        });
      }
    }

    // Create a bs_staff record with client role if it doesn't exist
    const { data: existingStaff } = await supabase
      .from('bs_staff')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingStaff) {
      // Get client email for staff record
      const { data: clientDetails } = await supabase
        .from('fc_clients')
        .select('first_name, last_name, email')
        .eq('id', clientId)
        .single();

      if (clientDetails) {
        await supabase.from('bs_staff').insert({
          id: userId,
          email: clientDetails.email,
          first_name: clientDetails.first_name,
          last_name: clientDetails.last_name,
          staff_type: 'client',
          is_onboarded: true,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in link-guest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
