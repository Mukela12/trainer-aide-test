import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { RouteParams } from '@/lib/types/api';
import {
  assignTemplateToTrainer,
  assignTemplateToClient,
  unassignTemplateFromTrainer,
  unassignTemplateFromClient,
} from '@/lib/services/template-service';

// POST /api/templates/[id]/assign - Assign template to trainer or client
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = await params;
    const body = await request.json();
    const { trainerId, clientId } = body;

    if (!trainerId && !clientId) {
      return NextResponse.json(
        { error: 'Either trainerId or clientId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has permission (studio owner, admin, or solo practitioner)
    const { data: staff } = await supabase
      .from('bs_staff')
      .select('studio_id, staff_type')
      .eq('id', user.id)
      .single();

    let hasPermission = staff && ['owner', 'admin'].includes(staff.staff_type);

    if (!hasPermission) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      hasPermission = profile && ['studio_owner', 'solo_practitioner'].includes(profile.role || '');
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Not authorized to assign templates' },
        { status: 403 }
      );
    }

    if (trainerId) {
      const { data, error } = await assignTemplateToTrainer(templateId, trainerId, user.id);

      if (error) {
        if (error.message === 'Template not found') {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        if (error.message === 'Template already assigned to this trainer') {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to assign template' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    if (clientId) {
      const { data, error } = await assignTemplateToClient(templateId, clientId, user.id);

      if (error) {
        if (error.message === 'Template not found') {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        if (error.message === 'Template already assigned to this client') {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to assign template' }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error in template assign POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/templates/[id]/assign - Remove template assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = await params;
    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!trainerId && !clientId) {
      return NextResponse.json(
        { error: 'Either trainerId or clientId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (trainerId) {
      const { error } = await unassignTemplateFromTrainer(templateId, trainerId);

      if (error) {
        console.error('Error removing trainer assignment:', error);
        return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
      }
    }

    if (clientId) {
      const { error } = await unassignTemplateFromClient(templateId, clientId);

      if (error) {
        console.error('Error removing client assignment:', error);
        return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in template assign DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
