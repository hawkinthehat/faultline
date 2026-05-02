import ProtocolDashboard from "./components/ProtocolDashboard";
import SkiingDescent from "./components/SkiingDescent";
import { useGameStore } from "./store/useGameStore";

export default function App() {
  const isSkiing = useGameStore((s) => s.isSkiing);

  return (
    <div className="min-h-dvh bg-zinc-50 font-mono text-zinc-900 antialiased">
      {isSkiing ? <SkiingDescent /> : <ProtocolDashboard />}
    </div>
  );
}
