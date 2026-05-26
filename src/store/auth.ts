import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { DEMO_USER } from '@/utils/mock';

interface AuthState {
  user: User | null;
  onboarded: boolean;
  login: (email: string, _password: string, name?: string) => Promise<User>;
  register: (email: string, _password: string, name: string) => Promise<User>;
  logout: () => void;
  setOnboarded: (v: boolean) => void;
  updateProfile: (patch: Partial<User>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      onboarded: false,
      login: async (email, _password, name) => {
        const user: User = {
          ...DEMO_USER,
          id: `usr_${Date.now().toString(36)}`,
          email,
          name: name ?? email.split('@')[0] ?? 'Пользователь',
        };
        set({ user });
        return user;
      },
      register: async (email, _password, name) => {
        const user: User = {
          ...DEMO_USER,
          id: `usr_${Date.now().toString(36)}`,
          email,
          name,
          createdAt: new Date().toISOString(),
        };
        set({ user, onboarded: false });
        return user;
      },
      logout: () => set({ user: null, onboarded: false }),
      setOnboarded: (v) => set({ onboarded: v }),
      updateProfile: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
    }),
    { name: 'avb_auth' }
  )
);
