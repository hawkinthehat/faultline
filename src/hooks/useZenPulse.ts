import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { triggerZenPulse } from "../utils/haptics";
import { useGameStore } from "../store/useGameStore";

/** Sine oscillation amplitude so pulse stays in [PULSE_MIN, PULSE_MAX]. */
const PULSE_MIN = 0.8;
const PULSE_MAX = 1.2;
const PULSE_MID = 1;
const PULSE_AMP = 0.2;

/** Angular velocity (rad/s): low zen → faster; high zen → slow/steady. */
const OMEGA_AT_ZEN_0 = 11;
const OMEGA_AT_ZEN_100 = 1.1;

const PEAK_THRESHOLD = 0.96;

function clampPulse(n: number): number {
  return Math.min(PULSE_MAX, Math.max(PULSE_MIN, n));
}

export interface ZenPulseResult {
  /** Current pulse multiplier (~0.8–1.2), updated each animation frame. */
  pulse: number;
  /** Same value as a ref (no re-renders); useful for imperative reads / canvas. */
  pulseRef: MutableRefObject<number>;
}

/**
 * Drives a zen-linked sine pulse from store `zenLevel` (0–100) via `requestAnimationFrame`.
 * Includes optional `navigator.vibrate` feedback (low zen: sparse jitter; stable zen: heartbeat).
 */
export function useZenPulse(): ZenPulseResult {
  const zenLevel = useGameStore((s) => s.zenLevel);
  const zenRef = useRef(zenLevel);
  zenRef.current = zenLevel;

  const [pulse, setPulse] = useState(1);
  const pulseRef = useRef(1);

  const phaseRef = useRef(0);
  const prevSinRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId = 0;

    const loop = (now: number) => {
      const zen = zenRef.current;
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      const dt = last != null ? Math.min((now - last) / 1000, 0.064) : 0;

      const t = zen / 100;
      const omega = OMEGA_AT_ZEN_0 * (1 - t) + OMEGA_AT_ZEN_100 * t;

      phaseRef.current += omega * dt;
      const phase = phaseRef.current;

      let value = PULSE_MID + PULSE_AMP * Math.sin(phase);
      if (zen < 20) {
        value += 0.05 * Math.sin(phase * 4.3);
      }
      const pulseVal = clampPulse(value);
      pulseRef.current = pulseVal;
      setPulse(pulseVal);

      const prevWave = prevSinRef.current;
      const wave = Math.sin(phase);
      prevSinRef.current = wave;

      if (typeof document === "undefined" || !document.hidden) {
        if (zen < 20) {
          if (Math.random() > 0.9) {
            triggerZenPulse("jittery");
          }
        } else {
          const crossedPeak = prevWave < PEAK_THRESHOLD && wave >= PEAK_THRESHOLD;
          if (crossedPeak) {
            triggerZenPulse("stable");
          }
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return { pulse, pulseRef };
}
