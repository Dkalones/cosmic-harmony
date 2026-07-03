import type { Vec3 } from "./hierarchy";
import type { BodyAttrs } from "@/lib/spotify/mapping";

export type GalaxyType = "spiral" | "barred" | "elliptical" | "irregular";

export interface UniverseData {
  seed: number;
  name: string;
  galaxies: GalaxyData[];
}

export interface GalaxyData {
  id: string;
  seed: number;
  name: string;
  type: GalaxyType;
  center: Vec3; // absolute
  radius: number;
  arms: number;
  starCount: number;
  coreColor: [number, number, number];
  hasBlackHole: boolean;
  systems: SystemData[];
}

export interface SystemData {
  id: string;
  seed: number;
  name: string;
  center: Vec3; // absolute
  /** If defined, this system represents a user (planet or star). */
  userBody?: BodyAttrs;
  /** Procedural star color when no userBody. */
  starColor: [number, number, number];
  starRadius: number;
}