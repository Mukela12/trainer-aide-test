/**
 * Client Service
 *
 * Business logic for client management operations.
 * Extracted from api/clients route.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendClientInvitationEmail } from '@/lib/notifications/email-service';
import { getOrCreateStudio } from '@/lib/services/studio-service';
import crypto from 'crypto';

interface DbClient {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  studio_id: string;
  invited_by: string | null;
  is_onboarded: boolean;
  is_archived: boolean;
  self_booking_allowed: boolean;
  credits: number | null;
  notification_preferences: unknown;
  created_at: string;
}

export interface TransformedClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  studio_id: string;
  invited_by: string | null;
  is_onboarded: boolean;
  is_archived: boolean;
  credits: number | null;
  created_at: string;
  experience_level: 'intermediate';
  primary_goal: 'general_fitness';
  available_equipment: string[];
  injuries: Array<{ body_part: string; description: string; restrictions: string[] }>;
  is_active: boolean;
  invitation_status: string | null;
  invitation_expires_at?: string;
}

/**
 * Fetch clients for the authenticated user based on their role.
 */
export async function getClientsForUser(
  userId: string,
  role: string,
  studioId: string | null | undefined
): Promise<{ data: TransformedClient[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('fc_clients')
      .select('*')
      .order('last_name', { ascending: true });

    if (role === 'solo_practitioner') {
      query = query.eq('studio_id', userId);
    } else if (role === 'studio_owner' || role === 'studio_manager' || role === 'super_admin') {
      if (studioId) {
        query = query.eq('studio_id', studioId);
      } else {
        return { data: [], error: null };
      }
    } else if (role === 'trainer') {
      if (studioId) {
        query = query.eq('studio_id', studioId);
      } else {
        query = query.eq('invited_by', userId);
      }
    } else {
      return { data: [], error: null };
    }

    const { data: clients, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return { data: null, error: new Error(error.message) };
    }

    const transformedClients: TransformedClient[] = ((clients || []) as DbClient[]).map((client) => ({
      id: client.id,
      first_name: client.first_name || client.name?.split(' ')[0] || '',
      last_name: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      email: client.email,
      phone: client.phone,
      studio_id: client.studio_id,
      invited_by: client.invited_by,
      is_onboarded: client.is_onboarded,
      is_archived: client.is_archived || false,
      credits: client.credits,
      created_at: client.created_at,
      experience_level: 'intermediate' as const,
      primary_goal: 'general_fitness' as const,
      available_equipment: [] as string[],
      injuries: [] as Array<{ body_part: string; description: string; restrictions: string[] }>,
      is_active: true,
      invitation_status: null as string | null,
    }));

    // Also fetch pending invitations
    const effectiveStudioId = role === 'solo_practitioner' ? userId : studioId;

    if (effectiveStudioId) {
      const { data: pendingInvitations } = await supabase
        .from('ta_client_invitations')
        .select('*')
        .eq('studio_id', effectiveStudioId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const existingEmails = new Set(transformedClients.map(c => c.email.toLowerCase()));

      const pendingClients = ((pendingInvitations || []) as Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        studio_id: string;
        invited_by: string;
        created_at: string;
        status: string;
        expires_at: string;
      }>)
        .filter(inv => !existingEmails.has(inv.email.toLowerCase()))
        .map(inv => ({
          id: `invitation_${inv.id}`,
          first_name: inv.first_name || '',
          last_name: inv.last_name || '',
          email: inv.email,
          phone: null,
          studio_id: inv.studio_id,
          invited_by: inv.invited_by,
          is_onboarded: false,
          is_archived: false,
          credits: 0,
          created_at: inv.created_at,
          experience_level: 'intermediate' as const,
          primary_goal: 'general_fitness' as const,
          available_equipment: [] as string[],
          injuries: [] as Array<{ body_part: string; description: string; restrictions: string[] }>,
          is_active: true,
          invitation_status: inv.status,
          invitation_expires_at: inv.expires_at,
        }));

      transformedClients.push(...pendingClients);
    }

    return { data: transformedClients, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new client with optional welcome email.
 */
export async function createClient(params: {
  userId: string;
  role: string;
  studioId: string | null | undefined;
  firstName?: string;
  lastName?: string;
  body: {
    id?: string;
    email: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    name?: string;
    phone?: string;
    selfBookingAllowed?: boolean;
    credits?: number;
    sendWelcomeEmail?: boolean;
  };
  inviterFirstName?: string;
  inviterLastName?: string;
}): Promise<{
  data: { client: Record<string, unknown>; emailSent: boolean; emailError: string | null } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Get or create studio_id
    let studioId = params.studioId;

    if (!studioId) {
      const { data: studio, error: studioError } = await getOrCreateStudio(
        params.userId,
        params.role,
        params.firstName
      );

      if (studioError || !studio) {
        return { data: null, error: studioError || new Error('Failed to create studio') };
      }

      studioId = studio.id;
    }

    // Create client data
    const firstName = params.body.firstName || params.body.first_name || null;
    const lastName = params.body.lastName || params.body.last_name || null;

    const clientData: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      name: params.body.name || `${firstName || ''} ${lastName || ''}`.trim() || null,
      email: params.body.email,
      phone: params.body.phone || null,
      studio_id: studioId,
      invited_by: params.userId,
      is_onboarded: true,
      is_guest: true,
      self_booking_allowed: params.body.selfBookingAllowed || false,
      credits: params.body.credits || 0,
      source: 'manual',
    };

    // Only include id if it's a valid UUID
    if (params.body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.body.id)) {
      clientData.id = params.body.id;
    }

    const { data, error } = await supabase
      .from('fc_clients')
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      if (error.code === '23505') {
        return { data: null, error: new Error('A client with this email already exists') };
      }
      return { data: null, error: new Error(error.message) };
    }

    // Send welcome email if requested
    let emailSent = false;
    let emailError: string | null = null;

    if (params.body.sendWelcomeEmail) {
      try {
        const token = crypto.randomBytes(32).toString('base64url');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data: invitation, error: invError } = await supabase
          .from('ta_client_invitations')
          .insert({
            studio_id: studioId,
            invited_by: params.userId,
            email: params.body.email.toLowerCase(),
            first_name: firstName,
            last_name: lastName,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (invError) {
          if (invError.code === '42P01') {
            console.warn('Client invitations table not set up. Skipping welcome email.');
            emailError = 'Invitation system not configured';
          } else {
            console.error('Error creating invitation:', invError);
            emailError = invError.message;
          }
        } else if (invitation) {
          const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client-invite/${token}`;

          const inviterName = params.inviterFirstName
            ? `${params.inviterFirstName} ${params.inviterLastName || ''}`.trim()
            : 'Your trainer';

          const { data: studio } = await supabase
            .from('bs_studios')
            .select('name')
            .eq('id', studioId)
            .maybeSingle();

          const result = await sendClientInvitationEmail({
            recipientEmail: params.body.email.toLowerCase(),
            recipientName: firstName || undefined,
            inviterName,
            studioName: studio?.name || undefined,
            inviteUrl,
            invitationId: invitation.id,
          });

          emailSent = result.success;
          if (!result.success) {
            emailError = result.error || 'Unknown email error';
          }
        }
      } catch (err) {
        console.error('Error sending welcome email:', err);
        emailError = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    return { data: { client: data, emailSent, emailError }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a client by ID (full update).
 */
export async function updateClient(
  clientId: string,
  body: {
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    selfBookingAllowed?: boolean;
    credits?: number;
    isOnboarded?: boolean;
  }
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (body.firstName !== undefined || body.first_name !== undefined) {
      updateData.first_name = body.firstName || body.first_name;
    }
    if (body.lastName !== undefined || body.last_name !== undefined) {
      updateData.last_name = body.lastName || body.last_name;
    }
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.selfBookingAllowed !== undefined) updateData.self_booking_allowed = body.selfBookingAllowed;
    if (body.credits !== undefined) updateData.credits = body.credits;
    if (body.isOnboarded !== undefined) updateData.is_onboarded = body.isOnboarded;

    const { data, error } = await supabase
      .from('fc_clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Record<string, unknown>, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Partially update a client by ID with studio ownership check.
 */
export async function patchClient(
  clientId: string,
  studioId: string,
  role: string,
  updates: {
    is_archived?: boolean;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    credits?: number;
    is_onboarded?: boolean;
  }
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};
    if (updates.is_archived !== undefined) updateData.is_archived = updates.is_archived;
    if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
    if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.credits !== undefined) updateData.credits = updates.credits;
    if (updates.is_onboarded !== undefined) updateData.is_onboarded = updates.is_onboarded;

    if (Object.keys(updateData).length === 0) {
      return { data: null, error: new Error('No valid fields to update') };
    }

    // Check if client exists and belongs to user's studio
    const { data: existing } = await supabase
      .from('fc_clients')
      .select('id, studio_id')
      .eq('id', clientId)
      .maybeSingle();

    if (!existing) {
      return { data: null, error: new Error('Client not found') };
    }

    if (existing.studio_id !== studioId && role !== 'super_admin') {
      return { data: null, error: new Error('Client does not belong to your studio') };
    }

    const { data, error } = await supabase
      .from('fc_clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Record<string, unknown>, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a client by ID with studio ownership check.
 */
export async function deleteClient(
  clientId: string,
  studioId: string,
  role: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Check if client exists and belongs to user's studio
    const { data: existing } = await supabase
      .from('fc_clients')
      .select('id, studio_id')
      .eq('id', clientId)
      .maybeSingle();

    if (!existing) {
      return { error: new Error('Client not found') };
    }

    if (existing.studio_id !== studioId && role !== 'super_admin') {
      return { error: new Error('Client does not belong to your studio') };
    }

    const { error } = await supabase
      .from('fc_clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
