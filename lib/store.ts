import { create } from 'zustand';
import { User, PokerSession } from '@/types';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

interface LoadingState {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 = no auto-close
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));
    
    // Auto-remove after duration if specified
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      }, notification.duration || 5000);
    }
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  clearNotifications: () => set({ notifications: [] }),
}));

// Poker Session Store
interface PokerState {
  sessions: PokerSession[];
  setSessions: (sessions: PokerSession[]) => void;
  addSession: (session: PokerSession) => void;
  updateSession: (sessionId: string, updates: Partial<PokerSession>) => void;
  removeSession: (sessionId: string) => void;
  loadSessionsFromStorage: () => void;
}

export const usePokerStore = create<PokerState>((set, get) => ({
  sessions: [],
  
  setSessions: (sessions) => {
    set({ sessions });
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_sessions', JSON.stringify(sessions));
    }
  },
  
  addSession: (session) => {
    const newSessions = [...get().sessions, session];
    set({ sessions: newSessions });
    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_sessions', JSON.stringify(newSessions));
    }
  },
  
  updateSession: (sessionId, updates) => {
    const newSessions = get().sessions.map(s =>
      s.id === sessionId ? { ...s, ...updates } : s
    );
    set({ sessions: newSessions });
    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_sessions', JSON.stringify(newSessions));
    }
  },
  
  removeSession: (sessionId) => {
    const newSessions = get().sessions.filter(s => s.id !== sessionId);
    set({ sessions: newSessions });
    if (typeof window !== 'undefined') {
      localStorage.setItem('poker_sessions', JSON.stringify(newSessions));
    }
  },
  
  loadSessionsFromStorage: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('poker_sessions');
      if (stored) {
        try {
          set({ sessions: JSON.parse(stored) });
        } catch (error) {
          console.error('Failed to load poker sessions from storage:', error);
        }
      }
    }
  },
}));

