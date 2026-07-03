import { useDebug } from "@/state/useDebug";
import { PerformanceTab } from "./PerformanceTab";
import { VisualizationTab } from "./VisualizationTab";
import { CustomizationTab } from "./CustomizationTab";

/**
 * Unified Debug panel. Toggle with backtick (`).
 * Three tabs: Performance / Visualization / Customization (all live).
 */
export function DebugPanel() {
  const open = useDebug((s) => s.panelOpen);
  const activeTab = useDebug((s) => s.activeTab);
  const set = useDebug((s) => s.setState);
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-16 z-20 w-[360px] max-h-[80vh] overflow-hidden rounded-lg border border-white/10 bg-black/70 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">Debug</div>
        <button
          onClick={() => set({ panelOpen: false })}
          className="rounded px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white"
        >×</button>
      </div>
      <div className="flex border-b border-white/10 text-xs">
        {(["performance", "visualization", "customization"] as const).map((t) => (
          <button
            key={t}
            onClick={() => set({ activeTab: t })}
            className={
              "flex-1 px-2 py-1.5 transition " +
              (activeTab === t
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white")
            }
          >{t}</button>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3 text-xs">
        {activeTab === "performance" && <PerformanceTab />}
        {activeTab === "visualization" && <VisualizationTab />}
        {activeTab === "customization" && <CustomizationTab />}
      </div>
    </div>
  );
}