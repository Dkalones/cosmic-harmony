import { create } from "zustand";

interface StreamingState {
  activeChunks: number;
  loadedObjects: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  currentGalaxyId: string | null;
  currentSystemId: string | null;
  currentLOD: string;
  set: (patch: Partial<StreamingState>) => void;
}

export const useStreaming = create<StreamingState>((set) => ({
  activeChunks: 0,
  loadedObjects: 0,
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  currentGalaxyId: null,
  currentSystemId: null,
  currentLOD: "imposter",
  set: (patch) => set(patch),
}));