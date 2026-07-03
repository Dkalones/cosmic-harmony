import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DataSource = "mock" | "spotify";

export interface DebugState {
  // Data
  dataSource: DataSource;
  universeSeed: number;
  // Visualization toggles
  showChunks: boolean;
  showOctree: boolean;
  showFrustum: boolean;
  showBBox: boolean;
  showOrbits: boolean;
  showAxes: boolean;
  showGalaxyPositions: boolean;
  showSystemPositions: boolean;
  // Universe params
  bloomIntensity: number;
  exposure: number;
  starDensity: number;
  renderDistance: number;
  cosmicHarmony: number;
  // Galaxy params
  galaxyArmTightness: number;
  galaxyThickness: number;
  galaxyCoreBrightness: number;
  // System params
  orbitalSpacing: number;
  // Planet params
  planetAtmosphere: number;
  planetClouds: number;
  planetRelief: number;
  planetAuroraOverride: boolean | null;
  // Star params
  starIntensity: number;
  // Panel UI
  panelOpen: boolean;
  activeTab: "performance" | "visualization" | "customization";
  setState: (patch: Partial<DebugState>) => void;
  reset: () => void;
}

const DEFAULTS = {
  dataSource: "mock" as DataSource,
  universeSeed: 1337,
  showChunks: false,
  showOctree: false,
  showFrustum: false,
  showBBox: false,
  showOrbits: false,
  showAxes: false,
  showGalaxyPositions: false,
  showSystemPositions: false,
  bloomIntensity: 1.2,
  exposure: 1.1,
  starDensity: 1.0,
  renderDistance: 1.0,
  cosmicHarmony: 1.0,
  galaxyArmTightness: 1.0,
  galaxyThickness: 1.0,
  galaxyCoreBrightness: 1.0,
  orbitalSpacing: 1.0,
  planetAtmosphere: 1.0,
  planetClouds: 1.0,
  planetRelief: 1.0,
  planetAuroraOverride: null,
  starIntensity: 1.0,
  panelOpen: false,
  activeTab: "performance" as const,
};

export const useDebug = create<DebugState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setState: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: "spotuniverse:debug", version: 1 },
  ),
);