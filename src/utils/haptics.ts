/**
 * Faultline haptics: buffered `navigator.vibrate` with safe fallbacks for iOS / restricted browsers.
 *
 * - Use {@link supportsHaptics} to drive UI (e.g. “Haptics unavailable on this device”).
 * - Use {@link isHapticReady} to know if the tab can show feedback (visible + DOM available).
 */

export type ZenPulseHapticType = "stable" | "jittery";

const PATTERN_STABLE: number[] = [18, 120, 22];
const PATTERN_JITTERY_MS = 50;

const MIN_GAP_MS: Record<ZenPulseHapticType, number> = {
  stable: 1250,
  jittery: 380,
};

/** Body classes for subtle visual substitute when `vibrate` is missing (see `index.css`). */
export const HAPTIC_FALLBACK_CLASS = {
  stable: "faultline-haptic-fallback--stable",
  jittery: "faultline-haptic-fallback--jittery",
} as const;

const FLASH_MS: Record<ZenPulseHapticType, number> = {
  stable: 130,
  jittery: 85,
};

const queue: ZenPulseHapticType[] = [];
let lastStableAt = 0;
let lastJitteryAt = 0;
let drainScheduled = false;

function isDev(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

function logHapticFallback(type: ZenPulseHapticType, reason: string): void {
  if (isDev()) {
    console.debug(`[Faultline haptics] ${type}: ${reason}`);
  }
}

/**
 * True when the Web Vibration API is present (often **false** on iOS Safari).
 * Use this to update UI status (e.g. show “visual-only” feedback).
 */
export function supportsHaptics(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** @deprecated Use {@link supportsHaptics} — same behavior. */
export const isVibrateSupported = supportsHaptics;

/**
 * True when the document is visible and DOM feedback can run (hardware or visual fallback).
 */
export function isHapticReady(): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return false;
  return typeof document.body !== "undefined";
}

function lastFireAt(type: ZenPulseHapticType): number {
  return type === "stable" ? lastStableAt : lastJitteryAt;
}

function setLastFireAt(type: ZenPulseHapticType, t: number): void {
  if (type === "stable") lastStableAt = t;
  else lastJitteryAt = t;
}

/**
 * Momentary class on `<body>` for a zinc / tactical “flash” when vibration is unavailable.
 */
function domFallbackPulse(type: ZenPulseHapticType): void {
  try {
    if (typeof document === "undefined" || !document.body) return;
    const cls = HAPTIC_FALLBACK_CLASS[type];
    document.body.classList.add(cls);
    window.setTimeout(() => {
      try {
        document.body?.classList.remove(cls);
      } catch {
        /* ignore */
      }
    }, FLASH_MS[type]);
  } catch {
    /* ignore */
  }
}

function runVibrate(type: ZenPulseHapticType): void {
  try {
    if (supportsHaptics()) {
      const pattern = type === "stable" ? PATTERN_STABLE : PATTERN_JITTERY_MS;
      const ok = navigator.vibrate!(pattern);
      if (ok !== false) return;
      logHapticFallback(type, "navigator.vibrate returned false; using DOM fallback");
      domFallbackPulse(type);
      return;
    }

    logHapticFallback(type, "Vibration API not supported; using DOM fallback");
    domFallbackPulse(type);
  } catch (err) {
    logHapticFallback(type, `vibrate threw: ${err instanceof Error ? err.message : String(err)}`);
    domFallbackPulse(type);
  }
}

function scheduleDrain(delayMs: number): void {
  if (drainScheduled) return;
  drainScheduled = true;
  window.setTimeout(() => {
    drainScheduled = false;
    drainQueue();
  }, delayMs);
}

function drainQueue(): void {
  if (queue.length === 0) return;

  const now = performance.now();
  const next = queue[0];
  const gap = MIN_GAP_MS[next];
  const elapsed = now - lastFireAt(next);

  if (elapsed < gap) {
    scheduleDrain(gap - elapsed);
    return;
  }

  queue.shift();
  runVibrate(next);
  setLastFireAt(next, performance.now());

  if (queue.length > 0) {
    scheduleDrain(0);
  }
}

/**
 * Buffered zen haptic. Coalesces rapid `jittery` calls; spaces pulses per type.
 * Safe on iOS: vibrate is try/catch wrapped; missing API uses DOM flash + dev log.
 */
export function triggerZenPulse(type: ZenPulseHapticType): void {
  if (typeof document !== "undefined" && document.hidden) return;

  if (type === "jittery") {
    const tail = queue[queue.length - 1];
    if (tail === "jittery") return;
  }

  queue.push(type);

  if (!drainScheduled) {
    const now = performance.now();
    const head = queue[0];
    const wait = Math.max(0, MIN_GAP_MS[head] - (now - lastFireAt(head)));
    scheduleDrain(wait);
  }
}
