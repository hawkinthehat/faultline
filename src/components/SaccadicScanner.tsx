import { useCallback, useEffect, useRef, useState } from "react";

import type { HeritageCipher } from "../types";
import { useGameStore } from "../store/useGameStore";

function clampLoad(n: number): number {
  return Math.min(100, Math.max(0, n));
}

const SESSION_MS = 15_000;
const TARGET_VISIBLE_MS = 450;

export interface SaccadicScannerProps {
  cipher: HeritageCipher;
  onClose?: () => void;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 15s bilateral sweep: alternating margin targets; hits → zen↑, misses → cognitive load↑.
 * Alpine Whiteout: slate-50 panel, zinc-800 borders, orange accents.
 */
export default function SaccadicScanner({ cipher, onClose }: SaccadicScannerProps) {
  const adjustZenLevel = useGameStore((s) => s.adjustZenLevel);
  const setCognitiveLoad = useGameStore((s) => s.setCognitiveLoad);
  const addLogEntry = useGameStore((s) => s.addLogEntry);
  const setActiveMiniGame = useGameStore((s) => s.setActiveMiniGame);

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [displayHits, setDisplayHits] = useState(0);
  const [displayMisses, setDisplayMisses] = useState(0);
  const [remainingSec, setRemainingSec] = useState(15);
  const [target, setTarget] = useState<{ side: "left" | "right"; xPct: number; yPct: number } | null>(null);

  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionEndRef = useRef(0);
  const pulseIndexRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const playingRef = useRef(false);
  const spawnNextRef = useRef<() => void>(() => {});

  const clearExpire = useCallback(() => {
    if (expireRef.current !== null) {
      clearTimeout(expireRef.current);
      expireRef.current = null;
    }
  }, []);

  const finishSession = useCallback(() => {
    playingRef.current = false;
    clearExpire();
    setPhase("done");
    setTarget(null);
    const h = hitsRef.current;
    const m = missesRef.current;
    setDisplayHits(h);
    setDisplayMisses(m);
    addLogEntry({
      message: `Saccadic sweep (${cipher.name}, 15s): hits ${h}, misses ${m}. Yield ref ${cipher.bdnfYield}.`,
      metaTag: "saccadic_scan",
    });
  }, [addLogEntry, cipher.bdnfYield, cipher.name, clearExpire]);

  const spawnNextTarget = useCallback(() => {
    if (!playingRef.current) return;
    if (Date.now() >= sessionEndRef.current) {
      finishSession();
      return;
    }

    const side: "left" | "right" = pulseIndexRef.current % 2 === 0 ? "left" : "right";
    pulseIndexRef.current += 1;
    const xPct = side === "left" ? 7 + rand(0, 11) : 82 + rand(0, 11);
    const yPct = 16 + rand(0, 68);
    setTarget({ side, xPct, yPct });

    clearExpire();
    expireRef.current = setTimeout(() => {
      expireRef.current = null;
      setTarget(null);
      missesRef.current += 1;
      setDisplayMisses(missesRef.current);
      const loadNow = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(loadNow + 7));
      adjustZenLevel(-2);

      if (!playingRef.current) return;
      spawnNextRef.current();
    }, TARGET_VISIBLE_MS);
  }, [adjustZenLevel, clearExpire, finishSession, setCognitiveLoad]);

  spawnNextRef.current = spawnNextTarget;

  useEffect(() => {
    const t = window.setTimeout(() => {
      const load = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(load + 10 + cipher.difficulty * 3));
      adjustZenLevel(-2);
      sessionEndRef.current = Date.now() + SESSION_MS;
      pulseIndexRef.current = 0;
      hitsRef.current = 0;
      missesRef.current = 0;
      setDisplayHits(0);
      setDisplayMisses(0);
      playingRef.current = true;
      setPhase("playing");
      spawnNextRef.current();
    }, 400);

    return () => {
      clearTimeout(t);
      playingRef.current = false;
      clearExpire();
    };
    // Single session on mount; ref always points at latest spawn chain. Prep runs in timeout (StrictMode-safe).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const ms = Math.max(0, sessionEndRef.current - Date.now());
      setRemainingSec(Math.ceil(ms / 1000));
      if (ms <= 0 && playingRef.current) {
        finishSession();
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, finishSession]);

  const handleHit = () => {
    if (phase !== "playing" || !target || !playingRef.current) return;
    clearExpire();
    setTarget(null);
    hitsRef.current += 1;
    setDisplayHits(hitsRef.current);
    adjustZenLevel(5);
    spawnNextTarget();
  };

  const returnToProtocol = () => {
    playingRef.current = false;
    clearExpire();
    setActiveMiniGame("protocol");
    onClose?.();
  };

  const handleExit = () => {
    if (phase === "playing") {
      playingRef.current = false;
      clearExpire();
      const load = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(load - 8));
      addLogEntry({
        message: `Saccadic sweep aborted (${cipher.name}).`,
        metaTag: "saccadic_abort",
      });
    }
    returnToProtocol();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saccadic-scanner-title"
    >
      <div className="flex w-full max-w-md flex-col border-2 border-zinc-800 bg-slate-50 shadow-[0_0_48px_rgb(24_24_27_/_0.1)]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-zinc-800 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-600">Heritage cipher</p>
            <h2 id="saccadic-scanner-title" className="mt-1 text-sm font-bold uppercase tracking-tight text-zinc-900">
              {cipher.name}
            </h2>
            <p className="mt-2 text-[11px] leading-snug text-orange-600">{cipher.fragments[0]}</p>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="shrink-0 border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-800 transition-colors hover:bg-white"
          >
            Exit
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-[11px] leading-relaxed text-zinc-800">
            <span className="font-semibold text-orange-600">15s sweep.</span> Targets alternate on the left and right
            edges — tap each orange signal before it expires. Hits restore zen; misses spike cognitive load.
          </p>
        </div>

        <div className="relative mx-4 mb-4 aspect-[4/3] w-auto overflow-hidden border-2 border-zinc-800 bg-slate-50">
          {phase === "intro" && (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-600">Arming 15-second sweep…</p>
            </div>
          )}

          {phase === "playing" && (
            <>
              <div className="pointer-events-none absolute left-3 top-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                <span>{remainingSec}s</span>
                <span className="text-zinc-700">Hits {displayHits}</span>
                <span className="text-zinc-600">Miss {displayMisses}</span>
              </div>
              <div
                className="pointer-events-none absolute inset-y-6 left-0 w-[18%] border-r border-dashed border-zinc-800/40 bg-white/70"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-6 right-0 w-[18%] border-l border-dashed border-zinc-800/40 bg-white/70"
                aria-hidden
              />
              {target && (
                <button
                  type="button"
                  onClick={handleHit}
                  className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-orange-100 shadow-[0_0_20px_rgb(234_88_12_/_0.45)] transition-transform hover:scale-105 active:scale-95"
                  style={{ left: `${target.xPct}%`, top: `${target.yPct}%` }}
                  aria-label={`Acquire signal on ${target.side} margin`}
                />
              )}
            </>
          )}

          {phase === "done" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Sweep complete</p>
              <p className="text-[11px] text-zinc-800">
                Hits {displayHits} · Misses {displayMisses}
              </p>
              <button
                type="button"
                onClick={returnToProtocol}
                className="mt-2 border-2 border-orange-500 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-700 hover:bg-orange-50"
              >
                Return to protocol
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-700">
            Window {TARGET_VISIBLE_MS}ms · Session {SESSION_MS / 1000}s · Difficulty {cipher.difficulty}
          </p>
        </div>
      </div>
    </div>
  );
}
