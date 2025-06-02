import { create } from 'zustand';
import type { HealthResponse } from '../types/api';

interface AppStore {
  isLoading: boolean;
  systemHealth: HealthResponse | null;
  sidebarOpen: boolean;
  setLoading: (loading: boolean) => void;
  setSystemHealth: (health: HealthResponse | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isLoading: false,
  systemHealth: null,
  sidebarOpen: false,

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setSystemHealth: (health: HealthResponse | null) => {
    set({ systemHealth: health });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
}));