import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    // Use service role client for insert to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Verify template exists
    const { data: template, error: templateError } = await serviceClient
      .from('ta_workout_templates')
      .select('id')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (trainerId) {
      // Assign to trainer
      const { data: assignment, error } = await serviceClient
        .from('ta_trainer_template_assignments')
        .insert({
          template_id: templateId,
          trainer_id: trainerId,
          assigned_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Template already assigned to this trainer' },
            { status: 409 }
          );
        }
        console.error('Error assigning template to trainer:', error);
        return NextResponse.json(
          { error: 'Failed to assign template' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: assignment.id,
        templateId: assignment.template_id,
        trainerId: assignment.trainer_id,
        assignedAt: assignment.assigned_at,
      });
    }

    if (clientId) {
      // Assign to client
      const { data: assignment, error } = await serviceClient
        .from('ta_client_template_assignments')
        .insert({
          template_id: templateId,
          client_id: clientId,
          assigned_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Template already assigned to this client' },
            { status: 409 }
          );
        }
        console.error('Error assigning template to client:', error);
        return NextResponse.json(
          { error: 'Failed to assign template' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: assignment.id,
        templateId: assignment.template_id,
        clientId: assignment.client_id,
        assignedAt: assignment.assigned_at,
      });
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

    // Use service role client for delete
    const serviceClient = createServiceRoleClient();

    if (trainerId) {
      const { error } = await serviceClient
        .from('ta_trainer_template_assignments')
        .delete()
        .eq('template_id', templateId)
        .eq('trainer_id', trainerId);

      if (error) {
        console.error('Error removing trainer assignment:', error);
        return NextResponse.json(
          { error: 'Failed to remove assignment' },
          { status: 500 }
        );
      }
    }

    if (clientId) {
      const { error } = await serviceClient
        .from('ta_client_template_assignments')
        .delete()
        .eq('template_id', templateId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error removing client assignment:', error);
        return NextResponse.json(
          { error: 'Failed to remove assignment' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in template assign DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
