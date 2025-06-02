import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark';
  defaultViewMode: 'grid' | 'list';
  notificationsEnabled: boolean;
  autoRefresh: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setDefaultViewMode: (mode: 'grid' | 'list') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      theme: 'light',
      defaultViewMode: 'grid',
      notificationsEnabled: true,
      autoRefresh: true,
      setTheme: (theme) => set({ theme }),
      setDefaultViewMode: (mode) => set({ defaultViewMode: mode }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
    }),
    {
      name: 'user-preferences',
    }
  )
);