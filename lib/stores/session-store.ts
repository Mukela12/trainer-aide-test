import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, SessionBlock, SessionExercise } from '@/lib/types';
import { useTimerStore } from './timer-store';
import { useUserStore } from './user-store';

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;

  // Fetch sessions from Supabase
  fetchSessions: (trainerId: string) => Promise<void>;

  // Session management (with database persistence)
  startSession: (session: Omit<Session, 'id' | 'startedAt' | 'completed' | 'trainerDeclaration'> & { workoutId?: string }) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<Session>) => Promise<void>;
  completeSession: (sessionId: string, overallRpe: number, privateNotes: string, publicNotes: string, trainerDeclaration: boolean) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearAllSessions: () => void;
  setSessions: (sessions: Session[]) => void;

  // Block management (with database persistence)
  updateBlock: (sessionId: string, blockId: string, updates: Partial<SessionBlock>) => Promise<void>;
  completeBlock: (sessionId: string, blockId: string, rpe: number) => Promise<void>;

  // Exercise management (with database persistence)
  updateExercise: (sessionId: string, blockId: string, exerciseId: string, updates: Partial<SessionExercise>) => Promise<void>;
  toggleExerciseComplete: (sessionId: string, blockId: string, exerciseId: string) => Promise<void>;

  // Getters
  getSessionById: (sessionId: string) => Session | undefined;
  getActiveSession: () => Session | undefined;
  getCompletedSessions: () => Session[];
  getInProgressSessions: () => Session[];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      error: null,
      isSaving: false,

      fetchSessions: async (trainerId: string) => {
        set({ isLoading: true, error: null });

        try {
          // Use client-side service (browser Supabase client)
          const { getSessionsClient, getActiveSessionClient } = await import('@/lib/services/session-service-client');

          const [sessions, activeSession] = await Promise.all([
            getSessionsClient(trainerId),
            getActiveSessionClient(trainerId),
          ]);

          set({
            sessions,
            activeSessionId: activeSession?.id || null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error fetching sessions:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch sessions',
            isLoading: false,
          });
        }
      },

      setSessions: (sessions) => set({ sessions }),

      startSession: async (sessionData) => {
        const state = get();

        // Check if there's already an active session
        const activeSession = state.sessions.find(s => s.id === state.activeSessionId && !s.completed);
        if (activeSession) {
          throw new Error('Cannot start a new session. Please complete or cancel the current active session first.');
        }

        // Generate session ID using proper UUID format
        const sessionId = crypto.randomUUID();
        const startedAt = new Date().toISOString();

        const newSession: Session = {
          ...sessionData,
          id: sessionId,
          startedAt,
          completed: false,
          trainerDeclaration: false,
        };

        // Optimistic update: add to local state immediately
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: newSession.id,
          isSaving: true,
        }));

        // Persist to database in background
        try {
          const { createSessionClient } = await import('@/lib/services/session-service-client');
          const created = await createSessionClient({
            trainerId: sessionData.trainerId,
            clientId: sessionData.clientId,
            templateId: sessionData.templateId,
            workoutId: (sessionData as { workoutId?: string }).workoutId, // AI workout ID
            sessionName: sessionData.sessionName,
            signOffMode: sessionData.signOffMode,
            blocks: sessionData.blocks,
            plannedDurationMinutes: sessionData.plannedDurationMinutes,
          });

          if (created) {
            // Update with the server-assigned ID if different
            set((state) => ({
              sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, id: created.id } : s
              ),
              activeSessionId: created.id,
              isSaving: false,
            }));
            return created.id;
          } else {
            // Remove the optimistically added session on failure
            set((state) => ({
              sessions: state.sessions.filter(s => s.id !== sessionId),
              activeSessionId: null,
              isSaving: false,
              error: 'Failed to create session in database',
            }));
            throw new Error('Failed to persist session to database');
          }
        } catch (error) {
          console.error('Error persisting session:', error);
          // Remove the optimistically added session on error
          set((state) => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
            activeSessionId: null,
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to create session',
          }));
          throw error;
        }
      },

      updateSession: async (sessionId, updates) => {
        // Optimistic update
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }));

        // Persist to database
        try {
          const { updateSessionClient } = await import('@/lib/services/session-service-client');
          await updateSessionClient(sessionId, updates);
        } catch (error) {
          console.error('Error persisting session update:', error);
        }
      },

      completeSession: async (sessionId, overallRpe, privateNotes, publicNotes, trainerDeclaration) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session) return;

        const duration = Math.floor((new Date().getTime() - new Date(session.startedAt).getTime()) / 1000);
        const completedAt = new Date().toISOString();

        // Optimistic update
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  completed: true,
                  completedAt,
                  duration,
                  overallRpe,
                  privateNotes,
                  publicNotes,
                  trainerDeclaration,
                }
              : s
          ),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
          isSaving: true,
        }));

        // Clear the timer when session is completed
        useTimerStore.getState().clearTimer();

        // Persist to database
        try {
          const { completeSessionClient } = await import('@/lib/services/session-service-client');
          await completeSessionClient(
            sessionId,
            overallRpe,
            privateNotes,
            publicNotes,
            trainerDeclaration,
            duration
          );
          set({ isSaving: false });
        } catch (error) {
          console.error('Error persisting session completion:', error);
          set({ isSaving: false });
        }
      },

      deleteSession: async (sessionId) => {
        // Optimistic update
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        }));

        // Persist to database
        try {
          const { deleteSessionClient } = await import('@/lib/services/session-service-client');
          await deleteSessionClient(sessionId);
        } catch (error) {
          console.error('Error deleting session from database:', error);
        }
      },

      clearAllSessions: () => set({
        sessions: [],
        activeSessionId: null,
      }),

      updateBlock: async (sessionId, blockId, updates) => {
        // Update local state
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  blocks: s.blocks.map(b =>
                    b.id === blockId ? { ...b, ...updates } : b
                  ),
                }
              : s
          ),
        }));

        // Persist updated blocks to database
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          try {
            const { updateSessionClient } = await import('@/lib/services/session-service-client');
            await updateSessionClient(sessionId, { blocks: session.blocks });
          } catch (error) {
            console.error('Error persisting block update:', error);
          }
        }
      },

      completeBlock: async (sessionId, blockId, rpe) => {
        // Update local state
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  blocks: s.blocks.map(b =>
                    b.id === blockId
                      ? { ...b, completed: true, rpe }
                      : b
                  ),
                }
              : s
          ),
        }));

        // Persist updated blocks to database
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          try {
            const { updateSessionClient } = await import('@/lib/services/session-service-client');
            await updateSessionClient(sessionId, { blocks: session.blocks });
          } catch (error) {
            console.error('Error persisting block completion:', error);
          }
        }
      },

      updateExercise: async (sessionId, blockId, exerciseId, updates) => {
        // Update local state
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  blocks: s.blocks.map(b =>
                    b.id === blockId
                      ? {
                          ...b,
                          exercises: b.exercises.map(ex =>
                            ex.id === exerciseId ? { ...ex, ...updates } : ex
                          ),
                        }
                      : b
                  ),
                }
              : s
          ),
        }));

        // Persist updated blocks to database
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          try {
            const { updateSessionClient } = await import('@/lib/services/session-service-client');
            await updateSessionClient(sessionId, { blocks: session.blocks });
          } catch (error) {
            console.error('Error persisting exercise update:', error);
          }
        }
      },

      toggleExerciseComplete: async (sessionId, blockId, exerciseId) => {
        // Update local state
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  blocks: s.blocks.map(b =>
                    b.id === blockId
                      ? {
                          ...b,
                          exercises: b.exercises.map(ex =>
                            ex.id === exerciseId
                              ? { ...ex, completed: !ex.completed }
                              : ex
                          ),
                        }
                      : b
                  ),
                }
              : s
          ),
        }));

        // Persist updated blocks to database
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          try {
            const { updateSessionClient } = await import('@/lib/services/session-service-client');
            await updateSessionClient(sessionId, { blocks: session.blocks });
          } catch (error) {
            console.error('Error persisting exercise toggle:', error);
          }
        }
      },

      getSessionById: (sessionId) => {
        const currentUserId = useUserStore.getState().currentUser.id;
        return get().sessions.find(s => s.id === sessionId && s.trainerId === currentUserId);
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        const currentUserId = useUserStore.getState().currentUser.id;
        return sessions.find(s => s.id === activeSessionId && s.trainerId === currentUserId);
      },

      getCompletedSessions: () => {
        const currentUserId = useUserStore.getState().currentUser.id;
        return get().sessions.filter(s => s.completed && s.trainerId === currentUserId);
      },

      getInProgressSessions: () => {
        const currentUserId = useUserStore.getState().currentUser.id;
        return get().sessions.filter(s => !s.completed && s.trainerId === currentUserId);
      },
    }),
    {
      name: 'trainer-aide-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
