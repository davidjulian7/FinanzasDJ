"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeRange, type RangePreset } from "@/lib/ranges";

interface RangeState {
  preset: RangePreset | "custom";
  from: string;
  to: string;
  setPreset: (preset: RangePreset) => void;
  setCustom: (from: string, to: string) => void;
}

export const useRangeStore = create<RangeState>()(
  persist(
    (set) => ({
      preset: "mes",
      from: "",
      to: "",
      setPreset: (preset) => set({ preset, from: "", to: "" }),
      setCustom: (from, to) => set({ preset: "custom", from, to }),
    }),
    { name: "finanzas-rango" }
  )
);

export function useRangeDates() {
  const { preset, from, to } = useRangeStore();
  return computeRange(preset as RangePreset, from || undefined, to || undefined);
}
