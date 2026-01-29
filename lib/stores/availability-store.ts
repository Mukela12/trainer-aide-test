// Availability Store - Manage trainer availability and blocked time periods

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AvailabilityBlock, TrainerAvailability } from '../types/availability';
import {
  getAvailabilityClient,
  addBlockClient,
  updateBlockClient,
  deleteBlockClient,
  AvailabilityBlock as ApiAvailabilityBlock,
  CreateBlockInput,
  UpdateBlockInput,
} from '@/lib/services/availability-service-client';

interface AvailabilityStore {
  availability: TrainerAvailability;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasFetched: boolean;

  // Fetch from database
  fetchAvailability: (trainerId?: string) => Promise<void>;

  // Block management
  addBlock: (block: AvailabilityBlock | CreateBlockInput) => Promise<AvailabilityBlock | null>;
  removeBlock: (blockId: string) => Promise<boolean>;
  updateBlock: (blockId: string, updates: Partial<AvailabilityBlock> | UpdateBlockInput) => Promise<AvailabilityBlock | null>;

  // Query methods
  getBlocksForDate: (date: Date) => AvailabilityBlock[];
  getBlockById: (blockId: string) => AvailabilityBlock | undefined;
  getAllBlocks: () => AvailabilityBlock[];
  getAvailableBlocks: () => AvailabilityBlock[];
  getBlockedBlocks: () => AvailabilityBlock[];

  // Bulk operations
  replaceAllBlocks: (blocks: AvailabilityBlock[]) => void;
  resetToDefault: () => Promise<void>;

  // Error handling
  clearError: () => void;
}

// Convert API block to store block type
function apiToStoreBlock(apiBlock: ApiAvailabilityBlock): AvailabilityBlock {
  return {
    id: apiBlock.id,
    blockType: apiBlock.blockType,
    dayOfWeek: apiBlock.dayOfWeek ?? 0,
    startHour: apiBlock.startHour ?? 0,
    startMinute: apiBlock.startMinute || 0,
    endHour: apiBlock.endHour ?? 0,
    endMinute: apiBlock.endMinute || 0,
    recurrence: apiBlock.recurrence,
    specificDate: apiBlock.specificDate ?? undefined,
    endDate: apiBlock.endDate ?? undefined,
    reason: apiBlock.reason ?? undefined,
    notes: apiBlock.notes ?? undefined,
  };
}

// Convert store block to API input
function storeToApiInput(block: Partial<AvailabilityBlock>): CreateBlockInput {
  return {
    blockType: block.blockType || 'available',
    recurrence: block.recurrence,
    dayOfWeek: block.dayOfWeek,
    startHour: block.startHour,
    startMinute: block.startMinute,
    endHour: block.endHour,
    endMinute: block.endMinute,
    specificDate: block.specificDate,
    endDate: block.endDate,
    reason: block.reason,
    notes: block.notes,
  };
}

// Default empty availability
const EMPTY_AVAILABILITY: TrainerAvailability = {
  trainerId: '',
  blocks: [],
};

export const useAvailabilityStore = create<AvailabilityStore>()(
  persist(
    (set, get) => ({
      availability: EMPTY_AVAILABILITY,
      isLoading: false,
      isSaving: false,
      error: null,
      hasFetched: false,

      fetchAvailability: async (trainerId?: string) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const apiBlocks = await getAvailabilityClient(trainerId);
          const blocks = apiBlocks.map(apiToStoreBlock);
          set({
            availability: {
              trainerId: trainerId || '',
              blocks,
            },
            isLoading: false,
            hasFetched: true,
          });
        } catch (error) {
          console.error('Error fetching availability:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch availability',
            isLoading: false,
          });
        }
      },

      // Add a new availability or blocked block
      addBlock: async (block: AvailabilityBlock | CreateBlockInput) => {
        set({ isSaving: true, error: null });

        // If it has an id, it's a full block; otherwise it's input
        const input = 'id' in block ? storeToApiInput(block) : block;

        try {
          const apiBlock = await addBlockClient(input as CreateBlockInput);
          if (apiBlock) {
            const storeBlock = apiToStoreBlock(apiBlock);
            set((state) => ({
              availability: {
                ...state.availability,
                blocks: [...state.availability.blocks, storeBlock],
              },
              isSaving: false,
            }));
            return storeBlock;
          }
          set({ isSaving: false, error: 'Failed to add block' });
          return null;
        } catch (error) {
          console.error('Error adding block:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to add block',
            isSaving: false,
          });
          return null;
        }
      },

      // Remove a block by ID
      removeBlock: async (blockId: string) => {
        set({ isSaving: true, error: null });

        const previousBlocks = get().availability.blocks;
        // Optimistic update
        set((state) => ({
          availability: {
            ...state.availability,
            blocks: state.availability.blocks.filter((b) => b.id !== blockId),
          },
        }));

        try {
          const success = await deleteBlockClient(blockId);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          // Revert on failure
          set((state) => ({
            availability: { ...state.availability, blocks: previousBlocks },
            isSaving: false,
            error: 'Failed to remove block',
          }));
          return false;
        } catch (error) {
          console.error('Error removing block:', error);
          set((state) => ({
            availability: { ...state.availability, blocks: previousBlocks },
            error: error instanceof Error ? error.message : 'Failed to remove block',
            isSaving: false,
          }));
          return false;
        }
      },

      // Update an existing block
      updateBlock: async (blockId: string, updates: Partial<AvailabilityBlock> | UpdateBlockInput) => {
        set({ isSaving: true, error: null });

        const previousBlocks = get().availability.blocks;
        // Optimistic update
        set((state) => ({
          availability: {
            ...state.availability,
            blocks: state.availability.blocks.map((block) =>
              block.id === blockId ? { ...block, ...updates } : block
            ),
          },
        }));

        try {
          const apiBlock = await updateBlockClient(blockId, updates as UpdateBlockInput);
          if (apiBlock) {
            const storeBlock = apiToStoreBlock(apiBlock);
            set((state) => ({
              availability: {
                ...state.availability,
                blocks: state.availability.blocks.map((b) =>
                  b.id === blockId ? storeBlock : b
                ),
              },
              isSaving: false,
            }));
            return storeBlock;
          }
          // Revert on failure
          set((state) => ({
            availability: { ...state.availability, blocks: previousBlocks },
            isSaving: false,
            error: 'Failed to update block',
          }));
          return null;
        } catch (error) {
          console.error('Error updating block:', error);
          set((state) => ({
            availability: { ...state.availability, blocks: previousBlocks },
            error: error instanceof Error ? error.message : 'Failed to update block',
            isSaving: false,
          }));
          return null;
        }
      },

      // Get all blocks that apply to a specific date
      getBlocksForDate: (date: Date) => {
        const state = get();
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        return state.availability.blocks.filter((block) => {
          // Weekly recurring blocks
          if (block.recurrence === 'weekly') {
            return block.dayOfWeek === dayOfWeek;
          }

          // One-time blocks
          if (block.recurrence === 'once' && block.specificDate) {
            // Single-day block
            if (!block.endDate || block.endDate === block.specificDate) {
              return block.specificDate === dateStr;
            }

            // Multi-day block
            return dateStr >= block.specificDate && dateStr <= block.endDate;
          }

          return false;
        });
      },

      // Get a specific block by ID
      getBlockById: (blockId: string) => {
        const state = get();
        return state.availability.blocks.find((b) => b.id === blockId);
      },

      // Get all blocks
      getAllBlocks: () => {
        const state = get();
        return state.availability.blocks;
      },

      // Get only available blocks
      getAvailableBlocks: () => {
        const state = get();
        return state.availability.blocks.filter((b) => b.blockType === 'available');
      },

      // Get only blocked blocks
      getBlockedBlocks: () => {
        const state = get();
        return state.availability.blocks.filter((b) => b.blockType === 'blocked');
      },

      // Replace all blocks (for bulk updates)
      replaceAllBlocks: (blocks: AvailabilityBlock[]) => {
        set((state) => ({
          availability: {
            ...state.availability,
            blocks,
          },
        }));
      },

      // Reset to default availability (re-fetches from server which seeds defaults)
      resetToDefault: async () => {
        set({ hasFetched: false });
        await get().fetchAvailability(get().availability.trainerId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'availability-storage',
      partialize: (state) => ({
        availability: state.availability,
        hasFetched: state.hasFetched,
      }),
    }
  )
);
