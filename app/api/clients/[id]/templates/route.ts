import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { RouteParams } from '@/lib/types/api';

// GET /api/clients/[id]/templates - Get templates assigned to a specific client
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch templates assigned specifically to this client
    // Actual ta_workout_templates columns: id, trainer_id, name, created_at, studio_id, created_by, title, description, is_active, json_definition, is_default, sign_off_mode
    const { data: assignments, error } = await serviceClient
      .from('ta_client_template_assignments')
      .select(`
        id,
        assigned_at,
        assigned_by,
        ta_workout_templates (
          id,
          name,
          title,
          description,
          sign_off_mode,
          is_default,
          created_at
        )
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Transform to flat template list
    const templates = (assignments || []).map((a: Record<string, unknown>) => {
      const template = a.ta_workout_templates as Record<string, unknown> | null;
      return {
        id: template?.id,
        name: template?.name || template?.title,
        description: template?.description,
        signOffMode: template?.sign_off_mode,
        isDefault: template?.is_default,
        assignedAt: a.assigned_at,
        assignedBy: a.assigned_by,
        createdAt: template?.created_at,
      };
    }).filter((t: { id: unknown }) => t.id);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in client templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
