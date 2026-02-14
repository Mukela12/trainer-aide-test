/**
 * Available Template Service
 *
 * Business logic for fetching templates available for a trainer to use with a client.
 * Combines trainer toolkit templates, client-specific templates, own templates,
 * and completed AI programs.
 *
 * Extracted from api/clients/[id]/available-templates route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailableTemplate {
  template_id: string;
  template_name: string;
  source: string;
}

export interface GroupedTemplates {
  trainerToolkit: AvailableTemplate[];
  clientSpecific: AvailableTemplate[];
  ownTemplates: AvailableTemplate[];
}

export interface AIProgram {
  id: string;
  program_name: string;
  description?: string | null;
  primary_goal: string;
  experience_level: string;
  total_weeks: number;
  sessions_per_week: number;
  status: string;
  generation_status: string;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Get all templates available for a trainer to use with a specific client.
 *
 * 1. Tries the `get_available_templates_for_client` RPC first.
 * 2. Falls back to manual queries if the RPC function does not exist (PGRST202).
 * 3. Fetches completed AI programs assigned to the trainer.
 */
export async function getAvailableTemplatesForClient(
  trainerId: string,
  clientId: string
): Promise<{
  data: {
    templates: AvailableTemplate[];
    grouped: GroupedTemplates;
    aiPrograms: AIProgram[];
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // -----------------------------------------------------------------------
    // 1. Try the RPC call
    // -----------------------------------------------------------------------
    const { data: rpcTemplates, error: rpcError } = await supabase.rpc(
      'get_available_templates_for_client',
      { p_trainer_id: trainerId, p_client_id: clientId }
    );

    let templates: AvailableTemplate[];

    if (rpcError) {
      console.error('Error fetching available templates via RPC:', rpcError);

      if (rpcError.code !== 'PGRST202') {
        return { data: null, error: new Error(rpcError.message) };
      }

      // -----------------------------------------------------------------
      // 2. Fallback: manual queries
      // -----------------------------------------------------------------
      templates = await fetchTemplatesFallback(supabase, trainerId, clientId);
    } else {
      templates = (rpcTemplates ?? []) as AvailableTemplate[];
    }

    // -----------------------------------------------------------------------
    // 3. Group templates by source
    // -----------------------------------------------------------------------
    const grouped: GroupedTemplates = {
      trainerToolkit: [],
      clientSpecific: [],
      ownTemplates: [],
    };

    for (const template of templates) {
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

    // -----------------------------------------------------------------------
    // 4. Fetch AI programs assigned to the trainer
    // -----------------------------------------------------------------------
    const aiPrograms = await fetchAIPrograms(supabase, trainerId);

    return {
      data: { templates, grouped, aiPrograms },
      error: null,
    };
  } catch (err) {
    console.error('Error in getAvailableTemplatesForClient:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fallback when the RPC function does not exist.
 * Manually queries trainer assignments, client assignments, and own templates,
 * then deduplicates by template_id.
 */
async function fetchTemplatesFallback(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trainerId: string,
  clientId: string
): Promise<AvailableTemplate[]> {
  const results: AvailableTemplate[] = [];

  // 1. Templates assigned to the trainer (their toolkit)
  const { data: trainerAssignments } = await supabase
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
  const { data: clientAssignments } = await supabase
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
  const { data: ownTemplates } = await supabase
    .from('ta_workout_templates')
    .select('id, name')
    .eq('created_by', trainerId);

  for (const template of ownTemplates || []) {
    results.push({
      template_id: (template as { id: string; name: string }).id,
      template_name: (template as { id: string; name: string }).name,
      source: 'own_template',
    });
  }

  // Deduplicate by template_id (keep first occurrence)
  const seen = new Set<string>();
  return results.filter((r: AvailableTemplate) => {
    if (seen.has(r.template_id)) return false;
    seen.add(r.template_id);
    return true;
  });
}

/**
 * Fetch AI programs assigned to the trainer that have finished generating.
 */
async function fetchAIPrograms(
  supabase: ReturnType<typeof createServiceRoleClient>,
  trainerId: string
): Promise<AIProgram[]> {
  const { data: aiAssignments, error: aiError } = await supabase
    .from('ai_program_trainer_assignments')
    .select(`
      ai_programs (
        id,
        program_name,
        description,
        primary_goal,
        experience_level,
        total_weeks,
        sessions_per_week,
        status,
        generation_status
      )
    `)
    .eq('trainer_id', trainerId);

  if (aiError) {
    console.error('Error fetching AI program assignments:', aiError);
  }

  // Filter to only include AI programs that have finished generating
  return (aiAssignments || [])
    .map((a: { ai_programs: AIProgram | null }) => a.ai_programs)
    .filter(
      (p: AIProgram | null): p is AIProgram =>
        p != null && p.generation_status === 'completed'
    );
}
