import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id:        number;
  email:     string;
  full_name: string;
  role:      "COUPLE" | "VENDOR" | "ADMIN";
  avatar_url?: string;
  subscription_plan: string;
}

interface AuthState {
  user:          User | null;
  access_token:  string | null;
  refresh_token: string | null;
  setAuth:       (user: User, access: string, refresh: string) => void;
  clearAuth:     () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:           null,
      access_token:   null,
      refresh_token:  null,
      isAuthenticated: false,

      setAuth: (user, access_token, refresh_token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token",  access_token);
          localStorage.setItem("refresh_token", refresh_token);
        }
        set({ user, access_token, refresh_token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
        set({ user: null, access_token: null, refresh_token: null, isAuthenticated: false });
      },
    }),
    {
      name: "snapshare-auth",
      // Persist ALL auth fields so page refresh doesn't kill the session
      partialize: (s) => ({
        user:            s.user,
        access_token:    s.access_token,
        refresh_token:   s.refresh_token,
        isAuthenticated: s.isAuthenticated,
      }),
      // Re-sync tokens to localStorage after rehydration from storage
      onRehydrateStorage: () => (state) => {
        if (state?.access_token && typeof window !== "undefined") {
          localStorage.setItem("access_token",  state.access_token);
          if (state.refresh_token) {
            localStorage.setItem("refresh_token", state.refresh_token);
          }
        }
      },
    }
  )
);
