import { create } from "zustand";

import type { DiagnosticLogEntry, MissionState, StabilityModule } from "../types";
import { triggerZenPulse } from "../utils/haptics";

/** Zen below this line after a delta adjustment triggers a low-zen haptic pulse. */
export const ZEN_HAPTIC_LOW_THRESHOLD = 20;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp0to100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export interface GameStoreState extends MissionState {
  diagnosticLogs: DiagnosticLogEntry[];

  setZenLevel: (value: number) => void;
  adjustZenLevel: (amount: number) => void;
  setCognitiveLoad: (value: number) => void;
  setSkiing: (value: boolean) => void;
  setActiveLoadout: (modules: StabilityModule[]) => void;
  addLogEntry: (
    entry: Omit<DiagnosticLogEntry, "id" | "at"> & Partial<Pick<DiagnosticLogEntry, "id" | "at">>
  ) => void;
  clearDiagnosticLogs: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  zenLevel: 100,
  cognitiveLoad: 0,
  isSkiing: false,
  activeLoadout: [],
  diagnosticLogs: [],

  setZenLevel: (value) => set({ zenLevel: clamp0to100(value) }),

  adjustZenLevel: (amount) =>
    set((s) => {
      const prev = s.zenLevel;
      const next = clamp0to100(prev + amount);
      if (prev >= ZEN_HAPTIC_LOW_THRESHOLD && next < ZEN_HAPTIC_LOW_THRESHOLD) {
        triggerZenPulse("jittery");
      }
      return { zenLevel: next };
    }),

  setCognitiveLoad: (value) => set({ cognitiveLoad: clamp0to100(value) }),

  setSkiing: (value) => set({ isSkiing: value }),

  setActiveLoadout: (modules) => set({ activeLoadout: modules }),

  addLogEntry: (entry) =>
    set((s) => ({
      diagnosticLogs: [
        ...s.diagnosticLogs,
        {
          id: entry.id ?? randomId(),
          at: entry.at ?? Date.now(),
          message: entry.message,
          metaTag: entry.metaTag,
        },
      ],
    })),

  clearDiagnosticLogs: () => set({ diagnosticLogs: [] }),
}));
