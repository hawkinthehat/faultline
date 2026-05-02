import { useCallback, useEffect, useRef, useState } from "react";

import type { HeritageCipher } from "../types";
import { useGameStore } from "../store/useGameStore";

function clampLoad(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export interface SaccadicScannerProps {
  cipher: HeritageCipher;
  onClose: () => void;
}

/**
 * Survivor search: signals pop on left/right screen margins (bilateral sweep).
 * Player taps each target before decay — rapid alternation encourages saccadic hops under load.
 */
export default function SaccadicScanner({ cipher, onClose }: SaccadicScannerProps) {
  const adjustZenLevel = useGameStore((s) => s.adjustZenLevel);
  const setCognitiveLoad = useGameStore((s) => s.setCognitiveLoad);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [target, setTarget] = useState<{ side: "left" | "right"; xPct: number; yPct: number } | null>(
    null
  );

  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundsTotal = 5 + cipher.difficulty * 2;
  /** Shorter window at higher difficulty — bilateral margins feel rapid-fire. */
  const visibilityMs = Math.max(380, 1380 - cipher.difficulty * 280);
  const zenHitBonus = 2 + Math.floor(cipher.bdnfYield / 12);

  const clearExpire = useCallback(() => {
    if (expireRef.current !== null) {
      clearTimeout(expireRef.current);
      expireRef.current = null;
    }
  }, []);

  const finishScan = useCallback(
    (finalHits: number, finalMisses: number) => {
      clearExpire();
      setPhase("done");
      setTarget(null);

      const loadAfter = useGameStore.getState().cognitiveLoad;
      const relief = 12 + finalHits * 4;
      setCognitiveLoad(clampLoad(loadAfter - relief));

      const net = finalHits - finalMisses;
      if (net > 0) {
        adjustZenLevel(Math.min(8, net + 2));
      }

      addLogEntry({
        message: `Saccadic sweep (${cipher.name}): signals ${finalHits}/${roundsTotal}, misses ${finalMisses}. Cipher yield reference ${cipher.bdnfYield}.`,
        metaTag: "saccadic_scan",
      });
    },
    [addLogEntry, adjustZenLevel, cipher.bdnfYield, cipher.name, clearExpire, roundsTotal, setCognitiveLoad]
  );

  const spawnRound = useCallback(
    (index: number, accHits: number, accMisses: number) => {
      if (index >= roundsTotal) {
        finishScan(accHits, accMisses);
        return;
      }

      const side: "left" | "right" = index % 2 === 0 ? "left" : "right";
      const xPct = side === "left" ? 6 + Math.random() * 12 : 82 + Math.random() * 12;
      const yPct = 16 + Math.random() * 68;
      setTarget({ side, xPct, yPct });
      setRoundIndex(index + 1);

      const load = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(load + 3 + cipher.difficulty));

      clearExpire();
      expireRef.current = setTimeout(() => {
        expireRef.current = null;
        setTarget(null);
        adjustZenLevel(-5);
        const m = accMisses + 1;
        setMisses(m);
        const nextLoad = useGameStore.getState().cognitiveLoad;
        setCognitiveLoad(clampLoad(nextLoad + 6));
        spawnRound(index + 1, accHits, m);
      }, visibilityMs);
    },
    [
      adjustZenLevel,
      cipher.difficulty,
      finishScan,
      roundsTotal,
      setCognitiveLoad,
      visibilityMs,
      clearExpire,
    ]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const load = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(load + 18 + cipher.difficulty * 4));
      adjustZenLevel(-2);
      setPhase("playing");
      spawnRound(0, 0, 0);
    }, 480);
    return () => {
      clearTimeout(t);
      clearExpire();
    };
    // Intentionally once per mount; parent remounts this modal via `key` for a fresh sweep.
    // Store prep runs inside the timeout so React StrictMode’s effect replay doesn’t double-charge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHit = () => {
    if (phase !== "playing" || !target) return;
    clearExpire();
    setTarget(null);
    adjustZenLevel(zenHitBonus);
    const h = hits + 1;
    setHits(h);
    const load = useGameStore.getState().cognitiveLoad;
    setCognitiveLoad(clampLoad(load + 2));
    spawnRound(roundIndex, h, misses);
  };

  const handleClose = () => {
    clearExpire();
    if (phase === "playing") {
      const load = useGameStore.getState().cognitiveLoad;
      setCognitiveLoad(clampLoad(load - 14));
      addLogEntry({
        message: `Saccadic sweep aborted mid-scan (${cipher.name}).`,
        metaTag: "saccadic_abort",
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/92 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saccadic-scanner-title"
    >
      <div className="flex w-full max-w-md flex-col border-2 border-zinc-600 bg-zinc-950 shadow-[0_0_48px_rgb(24_24_27_/_0.85)]">
        <div className="flex items-start justify-between gap-3 border-b-2 border-zinc-700 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Heritage cipher
            </p>
            <h2 id="saccadic-scanner-title" className="mt-1 text-sm font-bold uppercase tracking-tight text-zinc-100">
              {cipher.name}
            </h2>
            <p className="mt-2 text-[11px] leading-snug text-zinc-500">{cipher.fragments[0]}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 border border-zinc-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-100"
          >
            Exit
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Signals flash on the <span className="text-zinc-200">left and right margins</span> — sweep gaze bilaterally
            and tap before decay. Load rises during acquisition; confirmed sweeps offset stress.
          </p>
        </div>

        <div className="relative mx-4 mb-4 aspect-[4/3] w-auto overflow-hidden border-2 border-zinc-700 bg-zinc-900/80">
          {phase === "intro" && (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Arming visual sweep…</p>
            </div>
          )}

          {phase === "playing" && (
            <>
              <div className="pointer-events-none absolute left-3 top-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                <span>
                  Pulse {roundIndex} / {roundsTotal}
                </span>
                <span className="text-zinc-600">Margins · bilateral</span>
              </div>
              {/* Vis guide: lateral bands where signals spawn */}
              <div
                className="pointer-events-none absolute inset-y-6 left-0 w-[18%] border-r border-dashed border-zinc-700/50 bg-zinc-950/20"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-6 right-0 w-[18%] border-l border-dashed border-zinc-700/50 bg-zinc-950/20"
                aria-hidden
              />
              {target && (
                <button
                  type="button"
                  onClick={handleHit}
                  className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/90 bg-emerald-500/25 shadow-[0_0_24px_rgb(52_211_153_/_0.35)] transition-transform hover:scale-105 active:scale-95"
                  style={{ left: `${target.xPct}%`, top: `${target.yPct}%` }}
                  aria-label={`Acquire signal on ${target.side} margin`}
                />
              )}
            </>
          )}

          {phase === "done" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-300">Sweep logged</p>
              <p className="text-[11px] text-zinc-500">
                Hits {hits} · Misses {misses}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 border-2 border-zinc-100 bg-zinc-950 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-100 hover:bg-zinc-100 hover:text-zinc-950"
              >
                Return to protocol
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
            Visibility window ~{Math.round(visibilityMs)}ms · Difficulty {cipher.difficulty}
          </p>
        </div>
      </div>
    </div>
  );
}
