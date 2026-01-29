/**
 * Client-side Service Service
 *
 * Uses API routes for service CRUD operations (bypasses RLS via service role)
 */

/**
 * Service type definition
 */
export interface Service {
  id: string;
  studioId: string | null;
  name: string;
  description: string | null;
  duration: number;
  type: '1-2-1' | 'duet' | 'group';
  maxCapacity: number;
  creditsRequired: number;
  color: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input type for creating a service
 */
export interface CreateServiceInput {
  name: string;
  description?: string;
  duration: number;
  type?: '1-2-1' | 'duet' | 'group';
  maxCapacity?: number;
  creditsRequired?: number;
  color?: string;
  isActive?: boolean;
}

/**
 * Input type for updating a service
 */
export interface UpdateServiceInput {
  name?: string;
  description?: string;
  duration?: number;
  type?: '1-2-1' | 'duet' | 'group';
  maxCapacity?: number;
  creditsRequired?: number;
  color?: string;
  isActive?: boolean;
}

/**
 * Database service shape (snake_case)
 */
interface DbService {
  id: string;
  studio_id: string | null;
  name: string;
  description: string | null;
  duration: number;
  type: '1-2-1' | 'duet' | 'group';
  max_capacity: number;
  credits_required: number;
  color: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database service to frontend format
 */
function dbToService(db: DbService): Service {
  return {
    id: db.id,
    studioId: db.studio_id,
    name: db.name,
    description: db.description,
    duration: db.duration,
    type: db.type,
    maxCapacity: db.max_capacity,
    creditsRequired: db.credits_required,
    color: db.color,
    isActive: db.is_active,
    createdBy: db.created_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Get all services (client-side)
 * Uses API route to bypass RLS
 */
export async function getServicesClient(studioId?: string, activeOnly = true): Promise<Service[]> {
  try {
    const params = new URLSearchParams();
    if (studioId) {
      params.set('studioId', studioId);
    }
    if (activeOnly) {
      params.set('activeOnly', 'true');
    }

    const response = await fetch(`/api/services?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching services:', error);
      return [];
    }

    const { services } = await response.json();
    return (services as DbService[]).map(dbToService);
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

/**
 * Create a new service (client-side)
 * Uses API route to bypass RLS
 */
export async function createServiceClient(input: CreateServiceInput): Promise<Service | null> {
  try {
    const response = await fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        description: input.description || null,
        duration: input.duration,
        type: input.type || '1-2-1',
        maxCapacity: input.maxCapacity || 1,
        creditsRequired: input.creditsRequired || 1,
        color: input.color || '#12229D',
        isActive: input.isActive !== undefined ? input.isActive : true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating service:', error);
      return null;
    }

    const { service } = await response.json();
    return service ? dbToService(service as DbService) : null;
  } catch (error) {
    console.error('Error creating service:', error);
    return null;
  }
}

/**
 * Update a service (client-side)
 * Uses API route to bypass RLS
 */
export async function updateServiceClient(
  serviceId: string,
  updates: UpdateServiceInput
): Promise<Service | null> {
  try {
    const response = await fetch('/api/services', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: serviceId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating service:', error);
      return null;
    }

    const { service } = await response.json();
    return service ? dbToService(service as DbService) : null;
  } catch (error) {
    console.error('Error updating service:', error);
    return null;
  }
}

/**
 * Delete a service (client-side)
 * Soft deletes by setting is_active = false
 * Uses API route to bypass RLS
 */
export async function deleteServiceClient(serviceId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/services?id=${serviceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting service:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting service:', error);
    return false;
  }
}

/**
 * Get a service by ID
 */
export async function getServiceByIdClient(serviceId: string): Promise<Service | null> {
  try {
    const services = await getServicesClient(undefined, false);
    return services.find(s => s.id === serviceId) || null;
  } catch (error) {
    console.error('Error fetching service:', error);
    return null;
  }
}
