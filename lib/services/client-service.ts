/**
 * Client Service
 *
 * CRUD operations for fc_clients table in Wondrous database.
 */

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Client } from '@/lib/types'

/**
 * Database client shape (snake_case)
 */
interface DbClient {
  id: string
  user_id: string | null
  email: string
  first_name: string
  last_name: string
  phone: string | null
  studio_id: string
  trainer_id: string | null
  status: 'active' | 'inactive' | 'archived'
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Extended client interface for service operations
 */
export interface ClientWithDetails extends Client {
  phone?: string | null
  studioId: string
  trainerId?: string | null
  status: 'active' | 'inactive' | 'archived'
  notes?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Convert database client to frontend format
 */
function dbToClient(db: DbClient): Client {
  return {
    id: db.id,
    firstName: db.first_name,
    lastName: db.last_name,
    email: db.email,
    joinedAt: db.created_at,
  }
}

/**
 * Convert database client to extended format
 */
function dbToClientWithDetails(db: DbClient): ClientWithDetails {
  return {
    id: db.id,
    firstName: db.first_name,
    lastName: db.last_name,
    email: db.email,
    phone: db.phone,
    studioId: db.studio_id,
    trainerId: db.trainer_id,
    status: db.status,
    notes: db.notes,
    joinedAt: db.created_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

/**
 * Get all clients for a studio
 */
export async function getClients(studioId: string): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return (data as DbClient[]).map(dbToClient)
}

/**
 * Get all clients for a specific trainer
 */
export async function getClientsByTrainer(trainerId: string): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Error fetching trainer clients:', error)
    return []
  }

  return (data as DbClient[]).map(dbToClient)
}

/**
 * Get a single client by ID
 */
export async function getClientById(clientId: string): Promise<ClientWithDetails | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error) {
    console.error('Error fetching client:', error)
    return null
  }

  return dbToClientWithDetails(data as DbClient)
}

/**
 * Create a new client
 */
export async function createClient(
  clientData: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    studioId: string
    trainerId?: string
    notes?: string
  }
): Promise<ClientWithDetails | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('fc_clients')
    .insert({
      email: clientData.email,
      first_name: clientData.firstName,
      last_name: clientData.lastName,
      phone: clientData.phone || null,
      studio_id: clientData.studioId,
      trainer_id: clientData.trainerId || null,
      status: 'active',
      notes: clientData.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating client:', error)
    return null
  }

  return dbToClientWithDetails(data as DbClient)
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  updates: Partial<{
    email: string
    firstName: string
    lastName: string
    phone: string
    trainerId: string
    status: 'active' | 'inactive' | 'archived'
    notes: string
  }>
): Promise<ClientWithDetails | null> {
  const supabase = createServiceRoleClient()

  const dbUpdates: Partial<DbClient> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.email !== undefined) dbUpdates.email = updates.email
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone
  if (updates.trainerId !== undefined) dbUpdates.trainer_id = updates.trainerId
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes

  const { data, error } = await supabase
    .from('fc_clients')
    .update(dbUpdates)
    .eq('id', clientId)
    .select()
    .single()

  if (error) {
    console.error('Error updating client:', error)
    return null
  }

  return dbToClientWithDetails(data as DbClient)
}

/**
 * Archive a client (soft delete)
 */
export async function archiveClient(clientId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('fc_clients')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) {
    console.error('Error archiving client:', error)
    return false
  }

  return true
}

/**
 * Delete a client (hard delete - use with caution)
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('fc_clients')
    .delete()
    .eq('id', clientId)

  if (error) {
    console.error('Error deleting client:', error)
    return false
  }

  return true
}

/**
 * Search clients by name or email
 */
export async function searchClients(
  studioId: string,
  query: string
): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('studio_id', studioId)
    .eq('status', 'active')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error searching clients:', error)
    return []
  }

  return (data as DbClient[]).map(dbToClient)
}

/**
 * Get client count for a studio
 */
export async function getClientCount(studioId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from('fc_clients')
    .select('*', { count: 'exact', head: true })
    .eq('studio_id', studioId)
    .eq('status', 'active')

  if (error) {
    console.error('Error counting clients:', error)
    return 0
  }

  return count || 0
}

/**
 * Assign a client to a trainer
 */
export async function assignClientToTrainer(
  clientId: string,
  trainerId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('fc_clients')
    .update({
      trainer_id: trainerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) {
    console.error('Error assigning client to trainer:', error)
    return false
  }

  return true
}

/**
 * Get clients for a solo practitioner (user_id acts as studio_id)
 */
export async function getClientsForSoloPractitioner(userId: string): Promise<Client[]> {
  const supabase = await createServerSupabaseClient()

  // For solo practitioners, their user_id is used as the studio_id
  const { data, error } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('studio_id', userId)
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Error fetching solo practitioner clients:', error)
    return []
  }

  return (data as DbClient[]).map(dbToClient)
}
