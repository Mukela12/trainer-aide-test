/**
 * Client-side Availability Service
 *
 * Uses API routes for availability CRUD operations (bypasses RLS via service role)
 */

/**
 * Availability block type definition
 */
export interface AvailabilityBlock {
  id: string;
  trainerId: string;
  studioId: string | null;
  blockType: 'available' | 'blocked';
  recurrence: 'once' | 'weekly';
  dayOfWeek: number | null; // 0=Sun, 1=Mon, ... 6=Sat
  startHour: number | null;
  startMinute: number;
  endHour: number | null;
  endMinute: number;
  specificDate: string | null;
  endDate: string | null;
  reason: 'personal' | 'admin' | 'break' | 'other' | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input type for creating an availability block
 */
export interface CreateBlockInput {
  trainerId?: string;
  blockType: 'available' | 'blocked';
  recurrence?: 'once' | 'weekly';
  dayOfWeek?: number;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  specificDate?: string;
  endDate?: string;
  reason?: 'personal' | 'admin' | 'break' | 'other';
  notes?: string;
}

/**
 * Input type for updating an availability block
 */
export interface UpdateBlockInput {
  blockType?: 'available' | 'blocked';
  recurrence?: 'once' | 'weekly';
  dayOfWeek?: number;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  specificDate?: string;
  endDate?: string;
  reason?: 'personal' | 'admin' | 'break' | 'other';
  notes?: string;
}

/**
 * Database availability shape (snake_case)
 */
interface DbAvailability {
  id: string;
  trainer_id: string;
  studio_id: string | null;
  block_type: 'available' | 'blocked';
  recurrence: 'once' | 'weekly';
  day_of_week: number | null;
  start_hour: number | null;
  start_minute: number;
  end_hour: number | null;
  end_minute: number;
  specific_date: string | null;
  end_date: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database availability to frontend format
 */
function dbToAvailability(db: DbAvailability): AvailabilityBlock {
  return {
    id: db.id,
    trainerId: db.trainer_id,
    studioId: db.studio_id,
    blockType: db.block_type,
    recurrence: db.recurrence,
    dayOfWeek: db.day_of_week,
    startHour: db.start_hour,
    startMinute: db.start_minute || 0,
    endHour: db.end_hour,
    endMinute: db.end_minute || 0,
    specificDate: db.specific_date,
    endDate: db.end_date,
    reason: db.reason as AvailabilityBlock['reason'],
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Get availability blocks for a trainer (client-side)
 * Uses API route to bypass RLS
 */
export async function getAvailabilityClient(
  trainerId?: string,
  blockType?: 'available' | 'blocked'
): Promise<AvailabilityBlock[]> {
  try {
    const params = new URLSearchParams();
    if (trainerId) {
      params.set('trainerId', trainerId);
    }
    if (blockType) {
      params.set('blockType', blockType);
    }

    const response = await fetch(`/api/availability?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching availability:', error);
      return [];
    }

    const { availability } = await response.json();
    return (availability as DbAvailability[]).map(dbToAvailability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
}

/**
 * Add a new availability block (client-side)
 * Uses API route to bypass RLS
 */
export async function addBlockClient(input: CreateBlockInput): Promise<AvailabilityBlock | null> {
  try {
    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trainerId: input.trainerId,
        blockType: input.blockType,
        recurrence: input.recurrence || 'weekly',
        dayOfWeek: input.dayOfWeek,
        startHour: input.startHour,
        startMinute: input.startMinute || 0,
        endHour: input.endHour,
        endMinute: input.endMinute || 0,
        specificDate: input.specificDate,
        endDate: input.endDate,
        reason: input.reason,
        notes: input.notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating availability block:', error);
      return null;
    }

    const { availability } = await response.json();
    return availability ? dbToAvailability(availability as DbAvailability) : null;
  } catch (error) {
    console.error('Error creating availability block:', error);
    return null;
  }
}

/**
 * Update an availability block (client-side)
 * Uses API route to bypass RLS
 */
export async function updateBlockClient(
  blockId: string,
  updates: UpdateBlockInput
): Promise<AvailabilityBlock | null> {
  try {
    const response = await fetch('/api/availability', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: blockId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating availability block:', error);
      return null;
    }

    const { availability } = await response.json();
    return availability ? dbToAvailability(availability as DbAvailability) : null;
  } catch (error) {
    console.error('Error updating availability block:', error);
    return null;
  }
}

/**
 * Delete an availability block (client-side)
 * Uses API route to bypass RLS
 */
export async function deleteBlockClient(blockId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/availability?id=${blockId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting availability block:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting availability block:', error);
    return false;
  }
}

/**
 * Get available blocks only
 */
export async function getAvailableBlocksClient(trainerId?: string): Promise<AvailabilityBlock[]> {
  return getAvailabilityClient(trainerId, 'available');
}

/**
 * Get blocked time blocks only
 */
export async function getBlockedBlocksClient(trainerId?: string): Promise<AvailabilityBlock[]> {
  return getAvailabilityClient(trainerId, 'blocked');
}

/**
 * Check if a specific time is within available hours
 */
export function isTimeAvailable(
  blocks: AvailabilityBlock[],
  date: Date,
  startHour: number,
  endHour: number
): boolean {
  const dayOfWeek = date.getDay();

  // Find available blocks for this day
  const availableBlocks = blocks.filter(
    b => b.blockType === 'available' && b.dayOfWeek === dayOfWeek
  );

  // Find blocked blocks for this day
  const blockedBlocks = blocks.filter(
    b => b.blockType === 'blocked' && b.dayOfWeek === dayOfWeek
  );

  // Check if within any available block
  const isInAvailable = availableBlocks.some(block => {
    if (block.startHour === null || block.endHour === null) return false;
    return startHour >= block.startHour && endHour <= block.endHour;
  });

  if (!isInAvailable) return false;

  // Check if overlaps with any blocked block
  const isBlocked = blockedBlocks.some(block => {
    if (block.startHour === null || block.endHour === null) return false;
    // Time overlaps if start is before block end AND end is after block start
    return startHour < block.endHour && endHour > block.startHour;
  });

  return !isBlocked;
}

/**
 * Get blocks for a specific day
 */
export function getBlocksForDay(
  blocks: AvailabilityBlock[],
  dayOfWeek: number
): AvailabilityBlock[] {
  return blocks.filter(b => b.dayOfWeek === dayOfWeek);
}
