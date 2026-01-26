import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/lib/types';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  studioId?: string;
}

// Default empty user (unauthenticated state)
const EMPTY_USER: User = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'solo_practitioner',
};

interface UserState {
  currentUser: User;
  currentRole: UserRole;
  isAuthenticated: boolean;
  studioId: string | null;
  setUser: (user: User) => void;
  setRole: (role: UserRole) => void;
  setUserFromProfile: (profile: ProfileData) => void;
  logout: () => void;
  reset: () => void;
  // Permission methods
  canBuildTemplates: () => boolean;
  canPushToClients: () => boolean;
  canViewStudioOwnerFeatures: () => boolean;
  canViewTrainerFeatures: () => boolean;
  canCreateAIPrograms: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: EMPTY_USER,
      currentRole: 'solo_practitioner',
      isAuthenticated: false,
      studioId: null,

      setUser: (user) => set({ currentUser: user, currentRole: user.role, isAuthenticated: true }),

      setRole: (role) => set((state) => ({
        currentRole: role,
        currentUser: { ...state.currentUser, role },
      })),

      // Set user from Supabase profile data
      setUserFromProfile: (profile: ProfileData) => set({
        currentUser: {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          role: profile.role as UserRole,
        },
        currentRole: profile.role as UserRole,
        isAuthenticated: true,
        studioId: profile.studioId || null,
      }),

      // Logout - clears user data, sessions, and timer
      logout: () => {
        // Import stores here to avoid circular dependencies
        const { useSessionStore } = require('./session-store');
        const { useTimerStore } = require('./timer-store');

        // Clear sessions and timer
        useSessionStore.getState().clearAllSessions();
        useTimerStore.getState().clearTimer();

        // Clear user data
        set({
          currentUser: EMPTY_USER,
          currentRole: 'solo_practitioner',
          isAuthenticated: false,
          studioId: null,
        });
      },

      reset: () => set({
        currentUser: EMPTY_USER,
        currentRole: 'solo_practitioner',
        isAuthenticated: false,
        studioId: null,
      }),

      // Permission methods
      canBuildTemplates: (): boolean => {
        const state = useUserStore.getState();
        return state.currentRole === 'studio_owner' || state.currentRole === 'solo_practitioner';
      },

      canPushToClients: (): boolean => {
        const state = useUserStore.getState();
        return state.currentRole === 'solo_practitioner';
      },

      canViewStudioOwnerFeatures: (): boolean => {
        const state = useUserStore.getState();
        return state.currentRole === 'studio_owner' || state.currentRole === 'solo_practitioner';
      },

      canViewTrainerFeatures: (): boolean => {
        const state = useUserStore.getState();
        return state.currentRole === 'trainer' || state.currentRole === 'solo_practitioner';
      },

      canCreateAIPrograms: (): boolean => {
        const state = useUserStore.getState();
        return state.currentRole === 'solo_practitioner' ||
               state.currentRole === 'studio_owner' ||
               state.currentRole === 'super_admin';
      },
    }),
    {
      name: 'trainer-aide-user',
    }
  )
);
