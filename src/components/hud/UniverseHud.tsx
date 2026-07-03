import { MOCK_USERS } from "@/lib/mock/users";
import { useSelection } from "@/state/useSelection";
import type { BodyAttrs } from "@/lib/spotify/mapping";
import { useCamera } from "@/state/useCamera";
import { useUniverseStore } from "@/state/useUniverseStore";
import { useStreaming } from "@/state/useStreaming";

export function UniverseHud({ body }: { body: BodyAttrs }) {
  const { user, setUser } = useSelection();
  const setAutopilot = useCamera((s) => s.setAutopilot);
  const universe = useUniverseStore((s) => s.universe);
  const mode = useCamera((s) => s.mode);
  const setMode = useCamera((s) => s.setMode);
  const speed = useCamera((s) => s.currentSpeed);
  const nearestSystemId = useStreaming((s) => s.currentSystemId);

  const jumpTo = (userId: string) => {
    if (!universe) return;
    const galaxy = universe.galaxies[0];
    const sys = galaxy.systems.find((s) => s.id === `sys_${userId}`);
    if (sys) setAutopilot(sys.center);
  };

  return (
    <>
      {/* Top-left: identity */}
      <div className="pointer-events-none absolute left-6 top-6 select-none">
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          SpotUniverse · continuous universe
        </div>
        <div className="mt-1 text-2xl font-light text-white/90">
          {body.displayName}
          <span className="ml-2 text-sm text-white/40">@{body.handle}</span>
        </div>
        <div className="text-xs text-white/50">
          galaxy of {body.topArtist} · level {body.level}
          {body.prestige > 0 && ` · prestige ${body.prestige}`}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/30">
          near {nearestSystemId ?? "—"}
        </div>
      </div>

      {/* Bottom-left: stats */}
      <div className="pointer-events-none absolute bottom-6 left-6 space-y-1 text-xs text-white/60">
        <Stat label="minutes listened" value={Math.round(body.radius * 100000).toLocaleString()} />
        <Stat label="rings / playlists" value={String(body.rings.length)} />
        <Stat label="moons / top tracks" value={String(body.moons.length)} />
        <Stat label="biomes" value={String(body.diversity)} />
        <Stat label="atmosphere" value={`${Math.round(body.atmosphereDensity * 100)}%`} />
        <Stat label="ocean" value={`${Math.round(body.oceanCoverage * 100)}%`} />
        <Stat label="clouds" value={`${Math.round(body.cloudDensity * 100)}%`} />
        <Stat label="aurora" value={body.aurora ? "on" : "off"} />
      </div>

      {/* Bottom-right: user swap */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-1">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          autopilot to system
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {MOCK_USERS.map((u) => {
            const active = u.id === user.id;
            return (
              <button
                key={u.id}
                onClick={() => { setUser(u); jumpTo(u.id); }}
                className={
                  "rounded-full border px-3 py-1 text-xs transition " +
                  (active
                    ? "border-white/60 bg-white/10 text-white"
                    : "border-white/15 text-white/60 hover:border-white/40 hover:text-white")
                }
              >
                {u.displayName}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1">
          {(["free", "cruise", "warp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest transition " +
                (mode === m
                  ? "border-sky-300/70 bg-sky-300/10 text-sky-100"
                  : "border-white/15 text-white/50 hover:border-white/40")
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-white/40">
          {formatSpeed(speed)} · press ` for debug
        </div>
      </div>

      {/* Top-right: hint */}
      <div className="pointer-events-none absolute right-6 top-6 text-right text-[11px] text-white/40">
        click to lock · WASD + mouse · shift boost · M cycles mode
      </div>
    </>
  );
}

function formatSpeed(s: number) {
  if (s < 1000) return `${s.toFixed(0)} u/s`;
  if (s < 1e6) return `${(s / 1000).toFixed(1)} k u/s`;
  return `${(s / 1e6).toFixed(2)} M u/s`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-40 text-[10px] uppercase tracking-[0.25em] text-white/30">
        {label}
      </span>
      <span className="font-mono text-white/80">{value}</span>
    </div>
  );
}