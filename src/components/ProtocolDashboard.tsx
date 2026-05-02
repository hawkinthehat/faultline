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
  const cognitiveLoad = useGameStore((s) => s.cognitiveLoad);
  const activeLoadout = useGameStore((s) => s.activeLoadout);
  const setZenLevel = useGameStore((s) => s.setZenLevel);
  const setActiveLoadout = useGameStore((s) => s.setActiveLoadout);
  const clearDiagnosticLogs = useGameStore((s) => s.clearDiagnosticLogs);
  const addLogEntry = useGameStore((s) => s.addLogEntry);
  const setActiveMiniGame = useGameStore((s) => s.setActiveMiniGame);

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
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6 font-mono">
        <header className="border-b-2 border-zinc-800 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-600">
            Faultline
          </p>
          <h1 className="mt-1 text-xl font-bold uppercase tracking-tight text-zinc-900">
            Protocol
          </h1>
        </header>

        <section className="mt-8 border-2 border-zinc-800 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0 border-r border-zinc-300 pr-3">
              <div className="flex items-end justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-600">
                  Zen level
                </span>
                <span
                  className="tabular-nums text-sm font-bold text-orange-600 transition-opacity duration-300"
                  style={{ opacity: 0.72 + (pulse - PULSE_CENTER) * READOUT_OPACITY_K }}
                >
                  {zenLevel}
                </span>
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full border-2 border-orange-500 bg-zinc-100 transition-opacity duration-300"
                role="progressbar"
                aria-valuenow={zenLevel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Zen level"
                style={{
                  opacity: 0.88 + (pulse - PULSE_CENTER) * TRACK_OPACITY_K,
                  boxShadow: `inset 0 0 ${pulse * 8}px rgb(254 215 170 / 0.65)`,
                }}
              >
                <div
                  className="h-full origin-left rounded-full bg-orange-600 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${zenLevel}%`,
                    opacity: pulse,
                    boxShadow: `0 0 ${pulse * 14}px rgb(234 88 12 / ${0.2 + (pulse - PULSE_CENTER) * 0.35})`,
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 pl-1">
              <div className="flex items-end justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-700">
                  Cognitive load
                </span>
                <span className="tabular-nums text-sm font-bold text-zinc-900">{cognitiveLoad}</span>
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full border border-zinc-300 bg-zinc-100"
                role="progressbar"
                aria-valuenow={cognitiveLoad}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Cognitive load"
              >
                <div
                  className="h-full origin-left rounded-full bg-zinc-800 transition-[width] duration-300 ease-out"
                  style={{ width: `${cognitiveLoad}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-1 flex-col border-2 border-zinc-800 bg-white p-4 shadow-sm">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-900">
            Active modules
          </h2>
          {activeLoadout.length === 0 ? (
            <p className="mt-4 border border-dashed border-zinc-300 px-3 py-6 text-center text-xs uppercase tracking-wide text-zinc-600">
              No modules slotted
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {activeLoadout.map((m) => (
                <li
                  key={m.id}
                  className="border-2 border-zinc-300 bg-white px-3 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold uppercase tracking-tight text-zinc-900">
                      {m.name}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase text-zinc-600">{m.id}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-700">
                    {m.tacticalEffect.replace(/_/g, " ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-zinc-600">
                    <span>CD {m.cooldown}s</span>
                    <span>{m.somaticInput}</span>
                    <span>{m.metaTag}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 border-2 border-zinc-800 bg-white p-4 shadow-sm">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-900">
            Field operations
          </h2>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            Launch alpine descent or a 15s bilateral survivor sweep — both write to mission state and diagnostics.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setActiveMiniGame("skiing")}
              className="w-full border-2 border-orange-500 bg-white px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-orange-800 transition-colors hover:bg-orange-50 active:bg-orange-100"
            >
              Initiate Descent
            </button>
            <button
              type="button"
              onClick={() => setActiveMiniGame("saccadic_scan")}
              className="w-full border-2 border-orange-500 bg-white px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-orange-800 transition-colors hover:bg-orange-50 active:bg-orange-100"
            >
              Scan for Survivors
            </button>
          </div>
        </section>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={handleEmergencyDump}
            className="w-full border-2 border-orange-500 bg-white px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-orange-700 transition-colors hover:bg-orange-600 hover:text-white active:bg-orange-700"
          >
            Emergency dump
          </button>
        </div>
      </div>
    </div>
  );
}
