"use client";

import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  fetchUser: () => Promise<void>;
}

const API_BASE = "/api/v1";

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
    }
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  initialize: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      // Fetch user profile in background
      get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Login gagal. Periksa email dan password.");
    }

    const data = await res.json();
    get().setTokens(data.access_token, data.refresh_token);
    await get().fetchUser();
  },

  register: async (email, username, password, fullName) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Registrasi gagal. Coba lagi.");
    }

    const data = await res.json();
    get().setTokens(data.access_token, data.refresh_token);
    await get().fetchUser();
  },

  fetchUser: async () => {
    const { accessToken } = get();
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const user = await res.json();
        set({ user });
      } else if (res.status === 401) {
        // Token expired — try refresh
        const { refreshToken } = get();
        if (refreshToken) {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            get().setTokens(tokens.access_token, tokens.refresh_token);
            // Retry fetch user
            const retryRes = await fetch(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            if (retryRes.ok) {
              const user = await retryRes.json();
              set({ user });
            } else {
              get().logout();
            }
          } else {
            get().logout();
          }
        } else {
          get().logout();
        }
      }
    } catch {
      // Network error — keep token, user will retry later
    }
  },
}));
