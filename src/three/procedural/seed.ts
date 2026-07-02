import alea from "alea";

export type PRNG = () => number;

export function makePRNG(seed: string | number): PRNG {
  return alea(String(seed));
}

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randRange(rng: PRNG, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: PRNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}