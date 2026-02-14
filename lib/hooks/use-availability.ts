"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAvailabilityClient,
  addBlockClient,
  updateBlockClient,
  deleteBlockClient,
  type AvailabilityBlock as ApiAvailabilityBlock,
  type CreateBlockInput,
  type UpdateBlockInput,
} from "@/lib/services/availability-service-client";
import type {
  AvailabilityBlock,
  TrainerAvailability,
} from "@/lib/types/availability";

// --- Type converters ---

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

function storeToApiInput(block: Partial<AvailabilityBlock>): CreateBlockInput {
  return {
    blockType: block.blockType || "available",
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

// --- Query key factory ---

export const availabilityKeys = {
  all: ["availability"] as const,
  byTrainer: (trainerId: string | undefined) =>
    ["availability", trainerId] as const,
};

// --- Hooks ---

export function useAvailability(trainerId: string | undefined) {
  return useQuery({
    queryKey: availabilityKeys.byTrainer(trainerId),
    queryFn: async (): Promise<TrainerAvailability> => {
      const apiBlocks = await getAvailabilityClient(trainerId);
      const blocks = apiBlocks.map(apiToStoreBlock);
      return { trainerId: trainerId || "", blocks };
    },
    enabled: !!trainerId,
  });
}

export function useAddBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: AvailabilityBlock | CreateBlockInput
    ): Promise<AvailabilityBlock | null> => {
      const apiInput = "id" in input ? storeToApiInput(input) : input;
      const apiBlock = await addBlockClient(apiInput as CreateBlockInput);
      return apiBlock ? apiToStoreBlock(apiBlock) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockId,
      updates,
    }: {
      blockId: string;
      updates: Partial<AvailabilityBlock> | UpdateBlockInput;
    }): Promise<AvailabilityBlock | null> => {
      const apiBlock = await updateBlockClient(
        blockId,
        updates as UpdateBlockInput
      );
      return apiBlock ? apiToStoreBlock(apiBlock) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string): Promise<boolean> => {
      return deleteBlockClient(blockId);
    },
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: availabilityKeys.all });
      const previousQueries = queryClient.getQueriesData<TrainerAvailability>({
        queryKey: availabilityKeys.all,
      });
      queryClient.setQueriesData<TrainerAvailability>(
        { queryKey: availabilityKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            blocks: old.blocks.filter((b: AvailabilityBlock) => b.id !== blockId),
          };
        }
      );
      return { previousQueries };
    },
    onError: (_err, _blockId, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

// --- Derived utility functions ---

export function getBlocksForDate(
  availability: TrainerAvailability | undefined,
  date: Date
): AvailabilityBlock[] {
  if (!availability) return [];
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split("T")[0];

  return availability.blocks.filter((block: AvailabilityBlock) => {
    if (block.recurrence === "weekly") {
      return block.dayOfWeek === dayOfWeek;
    }
    if (block.recurrence === "once" && block.specificDate) {
      if (!block.endDate || block.endDate === block.specificDate) {
        return block.specificDate === dateStr;
      }
      return dateStr >= block.specificDate && dateStr <= block.endDate;
    }
    return false;
  });
}

export function getAvailableBlocks(
  availability: TrainerAvailability | undefined
): AvailabilityBlock[] {
  if (!availability) return [];
  return availability.blocks.filter(
    (b: AvailabilityBlock) => b.blockType === "available"
  );
}

export function getBlockedBlocks(
  availability: TrainerAvailability | undefined
): AvailabilityBlock[] {
  if (!availability) return [];
  return availability.blocks.filter(
    (b: AvailabilityBlock) => b.blockType === "blocked"
  );
}
