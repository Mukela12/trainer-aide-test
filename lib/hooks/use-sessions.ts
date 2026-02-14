"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/lib/stores/timer-store";
import type { Session, SessionBlock, SessionExercise } from "@/lib/types";

// Lazy-import session service functions to match previous store pattern
async function importService() {
  return import("@/lib/services/session-service-client");
}

// --- Query key factory ---

export const sessionKeys = {
  all: ["sessions"] as const,
  byTrainer: (trainerId?: string) => ["sessions", trainerId] as const,
};

// --- Hooks ---

export function useSessions(trainerId?: string) {
  return useQuery({
    queryKey: sessionKeys.byTrainer(trainerId),
    queryFn: async () => {
      const { getSessionsClient, getActiveSessionClient } =
        await importService();
      const [sessions, activeSession] = await Promise.all([
        getSessionsClient(trainerId!),
        getActiveSessionClient(trainerId!),
      ]);
      return { sessions, activeSessionId: activeSession?.id || null };
    },
    enabled: !!trainerId,
    select: (data) => data,
  });
}

/** Convenience accessors from useSessions data */
export function useSessionData(trainerId?: string) {
  const query = useSessions(trainerId);
  return {
    ...query,
    sessions: query.data?.sessions ?? [],
    activeSessionId: query.data?.activeSessionId ?? null,
  };
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      sessionData: Omit<
        Session,
        "id" | "startedAt" | "completed" | "trainerDeclaration"
      > & { workoutId?: string }
    ) => {
      const { createSessionClient } = await importService();
      const created = await createSessionClient({
        trainerId: sessionData.trainerId,
        clientId: sessionData.clientId,
        templateId: sessionData.templateId,
        workoutId: (sessionData as { workoutId?: string }).workoutId,
        sessionName: sessionData.sessionName,
        signOffMode: sessionData.signOffMode,
        blocks: sessionData.blocks,
        plannedDurationMinutes: sessionData.plannedDurationMinutes,
      });
      if (!created) throw new Error("Failed to persist session to database");
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useUpdateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: Partial<Session>;
    }) => {
      const { updateSessionClient } = await importService();
      await updateSessionClient(sessionId, updates);
    },
    onMutate: async ({ sessionId, updates }) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.all });
      const previousQueries = queryClient.getQueriesData<{
        sessions: Session[];
        activeSessionId: string | null;
      }>({ queryKey: sessionKeys.all });
      queryClient.setQueriesData<{
        sessions: Session[];
        activeSessionId: string | null;
      }>({ queryKey: sessionKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          sessions: old.sessions.map((s: Session) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        };
      });
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      overallRpe,
      privateNotes,
      publicNotes,
      trainerDeclaration,
      startedAt,
    }: {
      sessionId: string;
      overallRpe: number;
      privateNotes: string;
      publicNotes: string;
      trainerDeclaration: boolean;
      startedAt: string;
    }) => {
      const duration = Math.floor(
        (new Date().getTime() - new Date(startedAt).getTime()) / 1000
      );
      const { completeSessionClient } = await importService();
      await completeSessionClient(
        sessionId,
        overallRpe,
        privateNotes,
        publicNotes,
        trainerDeclaration,
        duration
      );
      // Clear the timer when session is completed
      useTimerStore.getState().clearTimer();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { deleteSessionClient } = await importService();
      await deleteSessionClient(sessionId);
    },
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: sessionKeys.all });
      const previousQueries = queryClient.getQueriesData<{
        sessions: Session[];
        activeSessionId: string | null;
      }>({ queryKey: sessionKeys.all });
      queryClient.setQueriesData<{
        sessions: Session[];
        activeSessionId: string | null;
      }>({ queryKey: sessionKeys.all }, (old) => {
        if (!old) return old;
        return {
          ...old,
          sessions: old.sessions.filter((s: Session) => s.id !== sessionId),
          activeSessionId:
            old.activeSessionId === sessionId ? null : old.activeSessionId,
        };
      });
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

// --- Block/Exercise mutation helpers ---
// These update blocks in-place then persist the whole blocks array

export function useUpdateBlock() {
  const updateSession = useUpdateSessionMutation();

  return {
    mutate: (
      sessionId: string,
      blockId: string,
      updates: Partial<SessionBlock>,
      currentSessions: Session[]
    ) => {
      const session = currentSessions.find((s) => s.id === sessionId);
      if (!session) return;
      const newBlocks = session.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      updateSession.mutate({
        sessionId,
        updates: { blocks: newBlocks },
      });
    },
  };
}

export function useCompleteBlock() {
  const updateSession = useUpdateSessionMutation();

  return {
    mutate: (
      sessionId: string,
      blockId: string,
      rpe: number,
      currentSessions: Session[]
    ) => {
      const session = currentSessions.find((s) => s.id === sessionId);
      if (!session) return;
      const newBlocks = session.blocks.map((b) =>
        b.id === blockId ? { ...b, completed: true, rpe } : b
      );
      updateSession.mutate({
        sessionId,
        updates: { blocks: newBlocks },
      });
    },
  };
}

export function useUpdateExercise() {
  const updateSession = useUpdateSessionMutation();

  return {
    mutate: (
      sessionId: string,
      blockId: string,
      exerciseId: string,
      updates: Partial<SessionExercise>,
      currentSessions: Session[]
    ) => {
      const session = currentSessions.find((s) => s.id === sessionId);
      if (!session) return;
      const newBlocks = session.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              exercises: b.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, ...updates } : ex
              ),
            }
          : b
      );
      updateSession.mutate({
        sessionId,
        updates: { blocks: newBlocks },
      });
    },
  };
}

export function useToggleExerciseComplete() {
  const updateSession = useUpdateSessionMutation();

  return {
    mutate: (
      sessionId: string,
      blockId: string,
      exerciseId: string,
      currentSessions: Session[]
    ) => {
      const session = currentSessions.find((s) => s.id === sessionId);
      if (!session) return;
      const newBlocks = session.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              exercises: b.exercises.map((ex) =>
                ex.id === exerciseId
                  ? { ...ex, completed: !ex.completed }
                  : ex
              ),
            }
          : b
      );
      updateSession.mutate({
        sessionId,
        updates: { blocks: newBlocks },
      });
    },
  };
}
