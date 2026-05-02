import { useCallback, useEffect, useRef, useState } from "react";

import { HERITAGE_CIPHERS } from "../data/ciphers";
import { useGameStore } from "../store/useGameStore";

const ALL_FRAGMENTS = HERITAGE_CIPHERS.flatMap((c) => c.fragments);
const ACK_KEYS = ["Y", "N", "G", "R", "V", "K"] as const;

type Obstacle = { id: string; x: number; y: number; w: number; h: number; vy: number };

type DualPrompt = {
  id: string;
  fragment: string;
  ackKey: string;
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function clampLoad(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export default function SkiingDescent() {
  const setSkiing = useGameStore((s) => s.setSkiing);
  const adjustZenLevel = useGameStore((s) => s.adjustZenLevel);
  const setCognitiveLoad = useGameStore((s) => s.setCognitiveLoad);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const wrapRef = useRef<HTMLDivElement>(null);
  const keysDown = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const spawnAccRef = useRef(0);
  const playerXRef = useRef(0.5);
  const livesRef = useRef(3);
  const scoreTimeRef = useRef(0);
  const dualPromptRef = useRef<DualPrompt | null>(null);
  const dualFailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playerX, setPlayerX] = useState(0.5);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [lives, setLives] = useState(3);
  const [dualPrompt, setDualPrompt] = useState<DualPrompt | null>(null);
  const [hitFlash, setHitFlash] = useState(false);

  const clearDualFailureTimer = useCallback(() => {
    if (dualFailTimerRef.current !== null) {
      clearTimeout(dualFailTimerRef.current);
      dualFailTimerRef.current = null;
    }
  }, []);

  const scheduleDualFailure = useCallback(
    (promptId: string) => {
      clearDualFailureTimer();
      dualFailTimerRef.current = setTimeout(() => {
        if (dualPromptRef.current?.id !== promptId) return;
        dualPromptRef.current = null;
        setDualPrompt(null);
        adjustZenLevel(-4);
        setCognitiveLoad(clampLoad(useGameStore.getState().cognitiveLoad + 10));
      }, 5200);
    },
    [adjustZenLevel, clearDualFailureTimer, setCognitiveLoad]
  );

  const spawnDualPrompt = useCallback(() => {
    if (dualPromptRef.current) return;
    const fragment = pick(ALL_FRAGMENTS);
    const ackKey = pick(ACK_KEYS);
    const prompt: DualPrompt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fragment,
      ackKey,
    };
    dualPromptRef.current = prompt;
    setDualPrompt(prompt);
    scheduleDualFailure(prompt.id);
  }, [scheduleDualFailure]);

  const resolveDualSuccess = useCallback(() => {
    if (!dualPromptRef.current) return;
    clearDualFailureTimer();
    dualPromptRef.current = null;
    setDualPrompt(null);
    adjustZenLevel(3);
    setCognitiveLoad(clampLoad(useGameStore.getState().cognitiveLoad - 6));
  }, [adjustZenLevel, clearDualFailureTimer, setCognitiveLoad]);

  const endDescent = useCallback(
    (reason: string) => {
      cancelAnimationFrame(rafRef.current);
      clearDualFailureTimer();
      addLogEntry({ message: `Descent ended: ${reason}`, metaTag: "skiing_descent" });
      setSkiing(false);
    },
    [addLogEntry, clearDualFailureTimer, setSkiing]
  );

  const damagePlayer = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    setHitFlash(true);
    window.setTimeout(() => setHitFlash(false), 120);
    adjustZenLevel(-8);
    setCognitiveLoad(clampLoad(useGameStore.getState().cognitiveLoad + 15));
    obstaclesRef.current = [];
    setObstacles([]);
    if (livesRef.current <= 0) {
      endDescent("hull breach — lives exhausted");
    }
  }, [adjustZenLevel, endDescent, setCognitiveLoad]);

  /** Steering + dual-task letter keys */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase();
      keysDown.current.add(k);

      const prompt = dualPromptRef.current;
      if (prompt) {
        if (k === prompt.ackKey.toLowerCase()) {
          e.preventDefault();
          resolveDualSuccess();
        }
        return;
      }

      if (["arrowleft", "arrowright", "a", "d"].includes(k)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase();
      keysDown.current.delete(k);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [resolveDualSuccess]);

  /** Spawn cipher fragments on an interval (only when none active) */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (dualPromptRef.current) return;
      spawnDualPrompt();
    }, 4500);
    return () => clearInterval(id);
  }, [spawnDualPrompt]);

  const onTouchPointer = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    playerXRef.current = Math.min(0.92, Math.max(0.08, x));
    setPlayerX(playerXRef.current);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0) return;
      onTouchPointer(e.touches[0].clientX);
    },
    [onTouchPointer]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      onTouchPointer(e.touches[0].clientX);
    },
    [onTouchPointer]
  );

  /** Physics + debris */
  useEffect(() => {
    lastTRef.current = performance.now();
    const STEP_SPAWN = 1.05;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTRef.current) / 1000);
      lastTRef.current = now;

      const steer = keysDown.current;
      let dx = 0;
      if (steer.has("arrowleft") || steer.has("a")) dx -= 1;
      if (steer.has("arrowright") || steer.has("d")) dx += 1;
      const speed = 1.35;
      playerXRef.current = Math.min(0.92, Math.max(0.08, playerXRef.current + dx * speed * dt));
      setPlayerX(playerXRef.current);

      spawnAccRef.current += dt;
      if (spawnAccRef.current >= STEP_SPAWN) {
        spawnAccRef.current = 0;
        const w = rand(0.1, 0.22);
        const obs: Obstacle = {
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          x: rand(0.05, 0.95 - w),
          y: -0.08,
          w,
          h: rand(0.035, 0.055),
          vy: rand(0.35, 0.55) + scoreTimeRef.current * 0.00015,
        };
        obstaclesRef.current = [...obstaclesRef.current, obs];
      }

      scoreTimeRef.current += dt;
      const px = playerXRef.current;
      const playerW = 0.09;
      const playerH = 0.06;
      const playerY = 0.88;

      let damaged = false;
      const moved = obstaclesRef.current.map((o) => ({ ...o, y: o.y + o.vy * dt }));
      const kept: Obstacle[] = [];

      for (const o of moved) {
        if (o.y > 1.15) continue;
        const ox0 = o.x;
        const ox1 = o.x + o.w;
        const oy0 = o.y;
        const oy1 = o.y + o.h;
        const px0 = px - playerW / 2;
        const px1 = px + playerW / 2;
        const py0 = playerY;
        const py1 = playerY + playerH;
        const overlap = ox0 < px1 && ox1 > px0 && oy0 < py1 && oy1 > py0;
        if (overlap && !damaged) {
          damaged = true;
          damagePlayer();
          continue;
        }
        if (overlap && damaged) continue;
        if (!overlap) kept.push(o);
      }

      if (!damaged) {
        obstaclesRef.current = kept;
        setObstacles(kept);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [damagePlayer]);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 font-mono text-zinc-900">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-800 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">Faultline</p>
          <p className="text-xs font-bold uppercase tracking-tight text-zinc-900">Skiing descent</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
          <span aria-live="polite">Lives {lives}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            clearDualFailureTimer();
            addLogEntry({ message: "Descent aborted by operator.", metaTag: "skiing_abort" });
            setSkiing(false);
          }}
          className="border-2 border-orange-500 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-orange-700 hover:bg-orange-50"
        >
          Exit descent
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col p-3">
        <p className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          ← → or A / D · swipe playfield to steer
        </p>

        <div
          ref={wrapRef}
          className="relative mx-auto w-full max-w-lg flex-1 overflow-hidden rounded-lg border-2 border-zinc-800 bg-gradient-to-b from-sky-100 via-zinc-100 to-zinc-200 shadow-inner touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          role="application"
          aria-label="Skiing descent playfield"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: `repeating-linear-gradient(
                105deg,
                transparent,
                transparent 12px,
                rgb(255 255 255 / 0.35) 12px,
                rgb(255 255 255 / 0.35) 13px
              )`,
            }}
          />

          {hitFlash && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-orange-500/25" aria-hidden />
          )}

          {obstacles.map((o) => (
            <div
              key={o.id}
              className="absolute rounded-sm border-2 border-zinc-800 bg-zinc-700 shadow-md"
              style={{
                left: `${o.x * 100}%`,
                top: `${o.y * 100}%`,
                width: `${o.w * 100}%`,
                height: `${o.h * 100}%`,
              }}
            />
          ))}

          <div
            className="absolute z-[5] h-[6%] min-h-[28px] w-[9%] min-w-[32px] -translate-x-1/2 rounded-full border-2 border-zinc-900 bg-orange-600 shadow-lg"
            style={{
              left: `${playerX * 100}%`,
              top: `${88}%`,
            }}
            aria-hidden
          />

          {dualPrompt && (
            <div className="absolute right-2 top-8 z-20 w-[min(42%,180px)] border-2 border-orange-500 bg-white p-3 shadow-lg sm:right-4 sm:top-12 sm:w-44">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-600">Cipher fragment</p>
              <p className="mt-2 break-words text-[10px] font-bold leading-tight text-zinc-900">{dualPrompt.fragment}</p>
              <p className="mt-3 text-[10px] text-zinc-700">
                Tap <span className="font-bold text-orange-600">VERIFY</span> or press{" "}
                <kbd className="rounded border border-zinc-400 bg-zinc-100 px-1 font-mono text-orange-700">
                  {dualPrompt.ackKey}
                </kbd>
              </p>
              <button
                type="button"
                className="mt-3 w-full border-2 border-orange-500 bg-orange-50 py-2 text-[10px] font-bold uppercase tracking-wider text-orange-800 active:bg-orange-100"
                onClick={() => resolveDualSuccess()}
              >
                Verify
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
