/**
 * Hierarchical seed derivation and absolute-coordinate helpers.
 * A single deterministic universe seed branches into galaxy → system → planet
 * seeds so the same input always regenerates the exact same content.
 */
import { hashStringToSeed } from "@/three/procedural/seed";

export type Vec3 = [number, number, number];

/** Combine two 32-bit seeds into a new deterministic seed. */
export function branchSeed(parent: number, child: number | string): number {
  const c = typeof child === "string" ? hashStringToSeed(child) : child >>> 0;
  // xorshift-mix
  let h = (parent ^ c) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
export function vec3Len(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
export function vec3Dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Scale conventions (arbitrary game units). */
export const SCALE = {
  planetRadius: 1, // ~1 unit
  systemRadius: 80, // planets orbit within
  systemSpacing: 6000, // between systems in a galaxy
  galaxyRadius: 40000,
  galaxySpacing: 800000,
  universeRadius: 5_000_000,
} as const;