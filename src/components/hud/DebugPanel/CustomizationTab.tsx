import { useDebug, type DataSource } from "@/state/useDebug";

export function CustomizationTab() {
  const state = useDebug();
  const set = useDebug((s) => s.setState);
  return (
    <div className="space-y-4">
      <Section title="Data">
        <label className="flex items-center justify-between gap-2">
          <span className="text-white/70">Source</span>
          <select
            value={state.dataSource}
            onChange={(e) => set({ dataSource: e.target.value as DataSource })}
            className="rounded bg-white/10 px-2 py-1 text-white"
          >
            <option value="mock">Mock</option>
            <option value="spotify">Spotify (soon)</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          <span className="text-white/70">Universe seed</span>
          <input
            type="number"
            value={state.universeSeed}
            onChange={(e) => set({ universeSeed: Number(e.target.value) })}
            className="w-24 rounded bg-white/10 px-2 py-1 text-white"
          />
        </label>
      </Section>

      <Section title="Universe">
        <Slider label="Bloom" min={0} max={3} step={0.05} value={state.bloomIntensity} onChange={(v) => set({ bloomIntensity: v })} />
        <Slider label="Exposure" min={0.2} max={3} step={0.05} value={state.exposure} onChange={(v) => set({ exposure: v })} />
        <Slider label="Render distance" min={0.2} max={4} step={0.05} value={state.renderDistance} onChange={(v) => set({ renderDistance: v })} />
        <Slider label="Cosmic harmony" min={0} max={2} step={0.05} value={state.cosmicHarmony} onChange={(v) => set({ cosmicHarmony: v })} />
        <Slider label="Star density" min={0.2} max={3} step={0.05} value={state.starDensity} onChange={(v) => set({ starDensity: v })} />
      </Section>

      <Section title="Galaxies">
        <Slider label="Arm tightness" min={0.2} max={3} step={0.05} value={state.galaxyArmTightness} onChange={(v) => set({ galaxyArmTightness: v })} />
        <Slider label="Thickness" min={0.2} max={3} step={0.05} value={state.galaxyThickness} onChange={(v) => set({ galaxyThickness: v })} />
        <Slider label="Core brightness" min={0.2} max={3} step={0.05} value={state.galaxyCoreBrightness} onChange={(v) => set({ galaxyCoreBrightness: v })} />
      </Section>

      <Section title="Systems">
        <Slider label="Orbital spacing" min={0.5} max={3} step={0.05} value={state.orbitalSpacing} onChange={(v) => set({ orbitalSpacing: v })} />
      </Section>

      <Section title="Planets">
        <Slider label="Atmosphere" min={0} max={2} step={0.05} value={state.planetAtmosphere} onChange={(v) => set({ planetAtmosphere: v })} />
        <Slider label="Clouds" min={0} max={2} step={0.05} value={state.planetClouds} onChange={(v) => set({ planetClouds: v })} />
        <Slider label="Relief" min={0} max={3} step={0.05} value={state.planetRelief} onChange={(v) => set({ planetRelief: v })} />
      </Section>

      <Section title="Stars">
        <Slider label="Intensity" min={0.1} max={4} step={0.05} value={state.starIntensity} onChange={(v) => set({ starIntensity: v })} />
      </Section>

      <button
        onClick={() => useDebug.getState().reset()}
        className="w-full rounded border border-white/15 py-1 text-white/60 hover:border-white/40 hover:text-white"
      >
        Reset defaults
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Slider({
  label, min, max, step, value, onChange,
}: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
        <span className="text-white/60">{label}</span>
        <span className="font-mono text-white/80">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-400"
      />
    </label>
  );
}