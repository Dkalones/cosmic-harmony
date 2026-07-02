import type { MockUser } from "@/lib/mock/users";
import { blendPalettes, type BiomePalette } from "@/three/procedural/biomes";
import { hashStringToSeed } from "@/three/procedural/seed";

export interface BodyAttrs {
  seed: number;
  radius: number;
  level: number;
  prestige: number;
  isStar: boolean;
  atmosphereDensity: number;
  oceanCoverage: number;
  cloudDensity: number;
  aurora: boolean;
  rings: RingAttrs[];
  moons: MoonAttrs[];
  palette: BiomePalette;
  diversity: number;
  topArtist: string;
  displayName: string;
  handle: string;
}

export interface RingAttrs {
  inner: number;
  outer: number;
  hue: number;
  tilt: number;
  opacity: number;
}

export interface MoonAttrs {
  seed: number;
  radius: number;
  orbit: number;
  speed: number;
  inclination: number;
  color: [number, number, number];
  name: string;
}

export function mapUserToBody(user: MockUser): BodyAttrs {
  const seed = hashStringToSeed(user.id);
  const minutes = user.minutesListened;
  // radius: log-scale between 0.6 and 2.4
  const radius = Math.min(2.4, 0.6 + Math.log10(Math.max(60, minutes)) * 0.28);
  const level = Math.min(6, Math.floor(Math.log10(Math.max(60, minutes)) - 1));
  const palette = blendPalettes(user.genres);

  const rings: RingAttrs[] = Array.from({ length: user.playlistsCount }).map((_, i) => {
    const t = (i + 1) / (user.playlistsCount + 1);
    return {
      inner: radius * (1.35 + t * 0.9),
      outer: radius * (1.45 + t * 0.95),
      hue: (i * 47 + seed) % 360,
      tilt: (seed % 30) / 100 + i * 0.02,
      opacity: 0.35 + (1 - t) * 0.4,
    };
  });

  const moons: MoonAttrs[] = user.topTracks.slice(0, 8).map((t, i) => ({
    seed: seed + i * 977,
    radius: 0.08 + (t.popularity / 100) * 0.22,
    orbit: radius * (2.6 + i * 0.55),
    speed: 0.15 + (1 / (i + 1)) * 0.35,
    inclination: ((seed + i * 53) % 40) / 100,
    color: [0.9, 0.9, 0.95],
    name: t.name,
  }));

  const diversity = user.genres.length;
  const atmosphereDensity = Math.min(1, 0.2 + level * 0.15);
  const oceanCoverage = Math.min(0.8, 0.1 + level * 0.12);
  const cloudDensity = Math.min(1, level * 0.18);
  const aurora = level >= 4;

  return {
    seed,
    radius,
    level,
    prestige: user.prestige,
    isStar: user.prestige > 0,
    atmosphereDensity,
    oceanCoverage,
    cloudDensity,
    aurora,
    rings,
    moons,
    palette,
    diversity,
    topArtist: user.topArtist,
    displayName: user.displayName,
    handle: user.handle,
  };
}