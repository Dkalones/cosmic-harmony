import { SCALE } from "@/three/universe/hierarchy";

export type LOD = "imposter" | "low" | "mid" | "high";

/** Pick a LOD level based on distance and characteristic radius. */
export function pickLOD(distance: number, radius: number): LOD {
  const rel = distance / Math.max(radius, 1);
  if (rel < 6) return "high";
  if (rel < 40) return "mid";
  if (rel < 400) return "low";
  return "imposter";
}

export function galaxyLOD(distance: number): LOD {
  if (distance < SCALE.galaxyRadius * 1.5) return "high"; // resolve stars
  if (distance < SCALE.galaxyRadius * 8) return "mid"; // shape + arms
  if (distance < SCALE.galaxySpacing * 3) return "low"; // point sprite
  return "imposter";
}

export function systemLOD(distance: number): LOD {
  if (distance < SCALE.systemRadius * 3) return "high"; // full planet detail
  if (distance < SCALE.systemRadius * 30) return "mid"; // planet + star
  if (distance < SCALE.systemSpacing * 3) return "low"; // just the star
  return "imposter";
}