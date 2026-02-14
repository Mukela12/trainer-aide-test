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
  isOnboarded?: boolean;
  businessSlug?: string;
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
  isOnboarded: boolean;
  studioId: string | null;
  businessSlug: string | null;
  setUser: (user: User) => void;
  setRole: (role: UserRole) => void;
  setUserFromProfile: (profile: ProfileData) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  setBusinessSlug: (slug: string) => void;
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
      isOnboarded: false,
      studioId: null,
      businessSlug: null,

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
        isOnboarded: profile.isOnboarded || false,
        studioId: profile.studioId || null,
        businessSlug: profile.businessSlug || null,
      }),

      setOnboarded: (isOnboarded: boolean) => set({ isOnboarded }),

      setBusinessSlug: (slug: string) => set({ businessSlug: slug }),

      // Logout - clears user data and timer (React Query cache auto-clears on unmount)
      logout: () => {
        const { useTimerStore } = require('./timer-store');

        // Clear timer
        useTimerStore.getState().clearTimer();

        // Clear user data
        set({
          currentUser: EMPTY_USER,
          currentRole: 'solo_practitioner',
          isAuthenticated: false,
          isOnboarded: false,
          studioId: null,
          businessSlug: null,
        });
      },

      reset: () => set({
        currentUser: EMPTY_USER,
        currentRole: 'solo_practitioner',
        isAuthenticated: false,
        isOnboarded: false,
        studioId: null,
        businessSlug: null,
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
