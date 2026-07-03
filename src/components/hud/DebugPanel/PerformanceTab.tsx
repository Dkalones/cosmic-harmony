import { useStreaming } from "@/state/useStreaming";
import { useCamera } from "@/state/useCamera";
import { useDebug } from "@/state/useDebug";
import { useUniverseStore } from "@/state/useUniverseStore";

export function PerformanceTab() {
  const s = useStreaming();
  const cam = useCamera();
  const debug = useDebug();
  const universe = useUniverseStore((u) => u.universe);
  const currentGalaxy = universe?.galaxies.find((g) => g.id === s.currentGalaxyId);
  const currentSystem = currentGalaxy?.systems.find((sy) => sy.id === s.currentSystemId);
  return (
    <div className="space-y-1">
      <Row k="FPS" v={s.fps.toFixed(1)} />
      <Row k="Draw calls" v={String(s.drawCalls)} />
      <Row k="Triangles" v={s.triangles.toLocaleString()} />
      <Row k="Loaded objects" v={String(s.loadedObjects)} />
      <Row k="Active chunks" v={String(s.activeChunks)} />
      <Row k="Current LOD" v={s.currentLOD} />
      <div className="my-2 border-t border-white/10" />
      <Row k="Coord X" v={fmt(cam.absPos[0])} />
      <Row k="Coord Y" v={fmt(cam.absPos[1])} />
      <Row k="Coord Z" v={fmt(cam.absPos[2])} />
      <Row k="Speed" v={`${fmt(cam.currentSpeed)} u/s`} />
      <Row k="Fly mode" v={cam.mode} />
      <div className="my-2 border-t border-white/10" />
      <Row k="Universe seed" v={String(debug.universeSeed)} />
      <Row k="Data source" v={debug.dataSource} />
      <Row k="Galaxy" v={currentGalaxy?.name ?? "—"} />
      <Row k="Galaxy seed" v={String(currentGalaxy?.seed ?? "—")} />
      <Row k="System" v={currentSystem?.name ?? "—"} />
      <Row k="System seed" v={String(currentSystem?.seed ?? "—")} />
      <Row k="Planet seed" v={String(currentSystem?.userBody?.seed ?? "—")} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{k}</span>
      <span className="font-mono text-white/80">{v}</span>
    </div>
  );
}
function fmt(n: number) {
  if (Math.abs(n) < 1000) return n.toFixed(1);
  if (Math.abs(n) < 1e6) return (n / 1000).toFixed(2) + "k";
  return (n / 1e6).toFixed(2) + "M";
}