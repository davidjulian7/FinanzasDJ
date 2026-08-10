"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  authed: boolean;
  setAuthed: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authed: false,
      setAuthed: (value) => set({ authed: value }),
      logout: () => set({ authed: false }),
    }),
    { name: "finanzas-auth" }
  )
);
