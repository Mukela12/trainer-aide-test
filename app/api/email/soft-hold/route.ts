import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendSoftHoldEmail } from '@/lib/notifications/email-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, clientName, sessionDatetime, serviceTypeName, creditsRequired, holdExpiry } = body;

    if (!clientId || !sessionDatetime || !holdExpiry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch client email
    const { data: client, error: clientError } = await serviceClient
      .from('fc_clients')
      .select('email, first_name, last_name')
      .eq('id', clientId)
      .single();

    if (clientError || !client?.email) {
      return NextResponse.json({ error: 'Client not found or has no email' }, { status: 404 });
    }

    // Fetch trainer name
    const { data: trainer } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const trainerName = trainer
      ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer'
      : 'Your Trainer';

    const resolvedClientName = clientName
      || `${client.first_name || ''} ${client.last_name || ''}`.trim()
      || 'Client';

    await sendSoftHoldEmail({
      clientEmail: client.email,
      clientName: resolvedClientName,
      trainerName,
      serviceName: serviceTypeName || 'Session',
      sessionDatetime,
      creditsRequired: creditsRequired || 1,
      holdExpiry,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending soft hold email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
