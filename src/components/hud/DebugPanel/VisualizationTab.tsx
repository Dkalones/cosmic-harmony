import { useDebug } from "@/state/useDebug";

const TOGGLES = [
  ["showChunks", "Chunks"],
  ["showOctree", "Octree"],
  ["showFrustum", "Frustum"],
  ["showBBox", "Bounding boxes"],
  ["showOrbits", "Orbits"],
  ["showAxes", "Axes"],
  ["showGalaxyPositions", "Galaxy positions"],
  ["showSystemPositions", "System positions"],
] as const;

export function VisualizationTab() {
  const state = useDebug();
  const set = useDebug((s) => s.setState);
  return (
    <div className="space-y-1.5">
      {TOGGLES.map(([key, label]) => (
        <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-white/70">{label}</span>
          <input
            type="checkbox"
            checked={state[key] as boolean}
            onChange={(e) => set({ [key]: e.target.checked } as never)}
          />
        </label>
      ))}
      <p className="mt-3 text-[10px] text-white/40">
        Some overlays are Phase 2 (octree + occlusion). System positions is live.
      </p>
    </div>
  );
}