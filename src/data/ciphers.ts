import type { HeritageCipher } from "../types";

/**
 * Heritage ciphers (difficulty 1–3): sweep → trace → recall.
 * Each bundles semantic fragments, operator-facing meaning, and BDNF yield for progression hooks.
 */
export const HERITAGE_CIPHERS: HeritageCipher[] = [
  {
    id: "cipher-saccadic-sweep",
    name: "Saccadic Sweep",
    difficulty: 1,
    fragments: [
      "VISUAL_FIELD_QUADRANT_SYNC",
      "LATENCY_MS_180_MAX",
      "FOVEAL_PRIORITY_OVERRIDE",
    ],
    meaning:
      "Rapid serial fixation maps sparse thermal spikes into a survivor likelihood hull — the protocol favors brief, decisive eye hops over lingering stare-downs.",
    bdnfYield: 14,
  },
  {
    id: "cipher-orthogonal-trace",
    name: "Orthogonal Trace",
    difficulty: 2,
    fragments: [
      "GRID_REFOLD_AXIS_Y",
      "MOTOR_GHOST_VECTOR",
      "SEMANTIC_LOCK_CHECKSUM",
    ],
    meaning:
      "Skating inertia is folded against an orthogonal cognitive lattice; meaning emerges where motion residuals intersect pinned semantic anchors.",
    bdnfYield: 22,
  },
  {
    id: "cipher-crystalline-recall",
    name: "Crystalline Recall",
    difficulty: 3,
    fragments: [
      "SHARD_ORDER_PERMUTABLE",
      "HIPPOCAMPAL_REPLAY_GATE",
      "YIELD_CURVE_NONLINEAR",
    ],
    meaning:
      "Fragments recombine under load; high difficulty trades stability for yield — the operator must hold a brittle crystal long enough to read the lattice without shattering it.",
    bdnfYield: 34,
  },
];

/** Primary scanning mini-game cipher (survivor sweep). */
export const SACCADIC_SWEEP_CIPHER = HERITAGE_CIPHERS[0];
