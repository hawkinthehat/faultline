/**
 * Core game types — re-exported for stores, data loaders, and UI.
 */

/** Stability loadout module — matches `src/data/modules.json`. */
export interface StabilityModule {
  id: string;
  name: string;
  tacticalEffect: string;
  cooldown: number;
  somaticInput: string;
  metaTag: string;
}

/**
 * Motor–cognitive dual-task cipher (heritage / meaning reconstruction).
 */
export interface HeritageCipher {
  id: string;
  name: string;
  difficulty: number;
  fragments: string[];
  meaning: string;
  /** BDNF framing / yield for progression or scoring. */
  bdnfYield: number;
}

/** Primary mission slice: Zen, skiing intensity, cognitive load, and equipped modules. */
export interface MissionState {
  zenLevel: number;
  isSkiing: boolean;
  cognitiveLoad: number;
  activeLoadout: StabilityModule[];
}

/** One line in the local metacognitive / diagnostic log. */
export interface DiagnosticLogEntry {
  id: string;
  at: number;
  message: string;
  metaTag?: string;
}
