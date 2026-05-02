import ProtocolDashboard from "./components/ProtocolDashboard";
import SaccadicScanner from "./components/SaccadicScanner";
import SkiingDescent from "./components/SkiingDescent";
import { SACCADIC_SWEEP_CIPHER } from "./data/ciphers";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const activeMiniGame = useGameStore((s) => s.activeMiniGame);

  return (
    <div className="min-h-dvh bg-zinc-50 font-mono text-zinc-900 antialiased">
      {activeMiniGame === "skiing" && <SkiingDescent />}
      {activeMiniGame === "saccadic_scan" && <SaccadicScanner cipher={SACCADIC_SWEEP_CIPHER} />}
      {activeMiniGame === "protocol" && <ProtocolDashboard />}
    </div>
  );
}
