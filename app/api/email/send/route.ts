import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { sendCustomEmail } from '@/lib/notifications/email-service';

/**
 * POST /api/email/send
 * Sends a custom branded email from a trainer/studio owner to a client
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify they can send emails
    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const allowedRoles = ['studio_owner', 'studio_manager', 'trainer', 'solo_practitioner', 'super_admin'];
    if (!allowedRoles.includes(profile.role || '')) {
      return NextResponse.json({ error: 'Not authorized to send emails' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { recipientEmail, recipientName, subject, message, clientId } = body;

    // Validate required fields
    if (!recipientEmail || !recipientName || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, recipientName, subject, message' },
        { status: 400 }
      );
    }

    // Get sender name and studio name
    const senderName = profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || profile.email?.split('@')[0] || 'Your Trainer';

    // Get studio name
    let studioName = 'AllWondrous';

    if (profile.studio_id) {
      const { data: studio } = await serviceClient
        .from('ta_studios')
        .select('name')
        .eq('id', profile.studio_id)
        .single();

      if (studio?.name) {
        studioName = studio.name;
      }
    } else if (profile.role === 'solo_practitioner') {
      // For solo practitioners, use their name or business name
      studioName = senderName;
    }

    // Send the email
    const result = await sendCustomEmail({
      recipientEmail,
      recipientName,
      senderName,
      studioName,
      subject,
      message,
      clientId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error in email send API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
