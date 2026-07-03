import { create } from "zustand";
import type { Vec3 } from "@/three/universe/hierarchy";

export type FlyMode = "free" | "cruise" | "warp";

interface CameraState {
  /** Absolute position in universe coordinates (JS doubles). */
  absPos: Vec3;
  /** Yaw / pitch in radians. */
  yaw: number;
  pitch: number;
  mode: FlyMode;
  /** Effective speed for HUD readouts. */
  currentSpeed: number;
  /** Auto-pilot target (null = free flight). */
  autopilot: Vec3 | null;
  setAbsPos: (p: Vec3) => void;
  setYawPitch: (y: number, p: number) => void;
  setMode: (m: FlyMode) => void;
  setSpeed: (s: number) => void;
  setAutopilot: (t: Vec3 | null) => void;
}

export const useCamera = create<CameraState>((set) => ({
  absPos: [0, 20, 200],
  yaw: 0,
  pitch: -0.05,
  mode: "cruise",
  currentSpeed: 0,
  autopilot: null,
  setAbsPos: (p) => set({ absPos: p }),
  setYawPitch: (yaw, pitch) => set({ yaw, pitch }),
  setMode: (mode) => set({ mode }),
  setSpeed: (currentSpeed) => set({ currentSpeed }),
  setAutopilot: (autopilot) => set({ autopilot }),
}));