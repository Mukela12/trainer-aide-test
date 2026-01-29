import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]/available-templates
 *
 * Returns all templates available for the current trainer to use with this client.
 * Combines:
 * 1. Templates in the trainer's toolkit (assigned to them)
 * 2. Templates assigned specifically to this client
 * 3. Templates created by the trainer themselves
 *
 * Query params:
 * - trainerId (optional): Specify a different trainer. Defaults to current user.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow specifying a different trainer (for studio owners viewing trainer's available templates)
    const trainerId = request.nextUrl.searchParams.get('trainerId') || user.id;

    const serviceClient = createServiceRoleClient();

    // Use the database function to get all available templates
    const { data: templates, error } = await serviceClient
      .rpc('get_available_templates_for_client', {
        p_trainer_id: trainerId,
        p_client_id: clientId,
      });

    if (error) {
      console.error('Error fetching available templates:', error);

      // Fallback: manually query if function doesn't exist
      if (error.code === 'PGRST202') {
        return await getFallbackTemplates(serviceClient, trainerId, clientId);
      }

      return NextResponse.json(
        { error: 'Failed to fetch available templates' },
        { status: 500 }
      );
    }

    // Group by source for easier frontend consumption
    const grouped = {
      trainerToolkit: [] as typeof templates,
      clientSpecific: [] as typeof templates,
      ownTemplates: [] as typeof templates,
    };

    for (const template of templates || []) {
      switch (template.source) {
        case 'trainer_toolkit':
          grouped.trainerToolkit.push(template);
          break;
        case 'client_specific':
          grouped.clientSpecific.push(template);
          break;
        case 'own_template':
          grouped.ownTemplates.push(template);
          break;
      }
    }

    return NextResponse.json({
      templates: templates || [],
      grouped,
      trainerId,
      clientId,
    });
  } catch (error) {
    console.error('Error in available templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fallback implementation if the database function doesn't exist
async function getFallbackTemplates(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  trainerId: string,
  clientId: string
) {
  const results: Array<{ template_id: string; template_name: string; source: string }> = [];

  // 1. Templates assigned to the trainer (their toolkit)
  const { data: trainerAssignments } = await serviceClient
    .from('ta_trainer_template_assignments')
    .select('ta_workout_templates(id, name)')
    .eq('trainer_id', trainerId);

  for (const a of trainerAssignments || []) {
    const template = a.ta_workout_templates as { id: string; name: string } | null;
    if (template) {
      results.push({
        template_id: template.id,
        template_name: template.name,
        source: 'trainer_toolkit',
      });
    }
  }

  // 2. Templates assigned specifically to this client
  const { data: clientAssignments } = await serviceClient
    .from('ta_client_template_assignments')
    .select('ta_workout_templates(id, name)')
    .eq('client_id', clientId);

  for (const a of clientAssignments || []) {
    const template = a.ta_workout_templates as { id: string; name: string } | null;
    if (template) {
      results.push({
        template_id: template.id,
        template_name: template.name,
        source: 'client_specific',
      });
    }
  }

  // 3. Templates created by the trainer themselves
  const { data: ownTemplates } = await serviceClient
    .from('ta_workout_templates')
    .select('id, name')
    .eq('created_by', trainerId);

  for (const template of ownTemplates || []) {
    results.push({
      template_id: template.id,
      template_name: template.name,
      source: 'own_template',
    });
  }

  // Deduplicate by template_id (keep first occurrence)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.template_id)) return false;
    seen.add(r.template_id);
    return true;
  });

  // Group by source
  const grouped = {
    trainerToolkit: deduped.filter((t) => t.source === 'trainer_toolkit'),
    clientSpecific: deduped.filter((t) => t.source === 'client_specific'),
    ownTemplates: deduped.filter((t) => t.source === 'own_template'),
  };

  return NextResponse.json({
    templates: deduped,
    grouped,
    trainerId,
    clientId,
  });
}
