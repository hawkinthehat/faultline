import { useCallback } from "react";

import { useZenPulse } from "../hooks/useZenPulse";
import { useGameStore } from "../store/useGameStore";

/** Pulse oscillates ~0.8–1.2; these tune subtle opacity linked to `pulse`. */
const PULSE_CENTER = 1;
const READOUT_OPACITY_K = 0.55;
const TRACK_OPACITY_K = 0.2;

export default function ProtocolDashboard() {
  const { pulse } = useZenPulse();
  const zenLevel = useGameStore((s) => s.zenLevel);
  const activeLoadout = useGameStore((s) => s.activeLoadout);
  const setZenLevel = useGameStore((s) => s.setZenLevel);
  const setActiveLoadout = useGameStore((s) => s.setActiveLoadout);
  const clearDiagnosticLogs = useGameStore((s) => s.clearDiagnosticLogs);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const handleEmergencyDump = useCallback(() => {
    setZenLevel(0);
    setActiveLoadout([]);
    clearDiagnosticLogs();
    addLogEntry({
      message: "Emergency dump: buffers flushed. Zen vented. Loadout cleared.",
      metaTag: "emergency_dump",
    });
  }, [addLogEntry, clearDiagnosticLogs, setActiveLoadout, setZenLevel]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6 font-mono">
        <header className="border-b-2 border-zinc-700 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">
            Faultline
          </p>
          <h1 className="mt-1 text-xl font-bold uppercase tracking-tight text-zinc-100">
            Protocol
          </h1>
        </header>

        <section className="mt-8 border-2 border-zinc-700 bg-zinc-950 p-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
              Zen level
            </span>
            <span
              className="tabular-nums text-sm font-bold text-zinc-100 transition-opacity duration-300"
              style={{ opacity: 0.7 + (pulse - PULSE_CENTER) * READOUT_OPACITY_K }}
            >
              {zenLevel}
            </span>
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full border border-zinc-600 bg-zinc-900 transition-opacity duration-300"
            role="progressbar"
            aria-valuenow={zenLevel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Zen level"
            style={{
              opacity: 0.88 + (pulse - PULSE_CENTER) * TRACK_OPACITY_K,
              boxShadow: `inset 0 0 ${pulse * 8}px rgb(24 24 27)`,
            }}
          >
            <div
              className="h-full origin-left rounded-full bg-zinc-100 transition-[width] duration-300 ease-out"
              style={{
                width: `${zenLevel}%`,
                opacity: pulse,
                boxShadow: `0 0 ${pulse * 14}px rgb(161 161 170 / ${0.12 + (pulse - PULSE_CENTER) * 0.35})`,
              }}
            />
          </div>
        </section>

        <section className="mt-6 flex flex-1 flex-col border-2 border-zinc-700 bg-zinc-950 p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
            Active modules
          </h2>
          {activeLoadout.length === 0 ? (
            <p className="mt-4 border border-dashed border-zinc-700 px-3 py-6 text-center text-xs uppercase tracking-wide text-zinc-500">
              No modules slotted
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {activeLoadout.map((m) => (
                <li
                  key={m.id}
                  className="border-2 border-zinc-600 bg-zinc-900/50 px-3 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold uppercase tracking-tight text-zinc-100">
                      {m.name}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase text-zinc-500">{m.id}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                    {m.tacticalEffect.replace(/_/g, " ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    <span>CD {m.cooldown}s</span>
                    <span>{m.somaticInput}</span>
                    <span>{m.metaTag}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={handleEmergencyDump}
            className="w-full border-2 border-zinc-100 bg-zinc-950 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200"
          >
            Emergency dump
          </button>
        </div>
      </div>
    </div>
  );
}
