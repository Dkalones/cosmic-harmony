import { create } from "zustand";
import type { UniverseData } from "@/three/universe/types";

interface UniverseStore {
  universe: UniverseData | null;
  setUniverse: (u: UniverseData | null) => void;
}

export const useUniverseStore = create<UniverseStore>((set) => ({
  universe: null,
  setUniverse: (universe) => set({ universe }),
}));