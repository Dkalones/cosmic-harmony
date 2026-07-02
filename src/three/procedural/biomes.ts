import type { MockGenre } from "@/lib/mock/users";

export interface BiomePalette {
  low: [number, number, number];
  mid: [number, number, number];
  high: [number, number, number];
  ocean: [number, number, number];
  atmosphere: [number, number, number];
}

const PALETTES: Record<MockGenre, BiomePalette> = {
  rock:       { low: [0.35,0.22,0.16], mid: [0.55,0.42,0.30], high: [0.85,0.82,0.78], ocean: [0.08,0.10,0.14], atmosphere: [0.9,0.55,0.35] },
  pop:        { low: [0.95,0.55,0.75], mid: [0.98,0.75,0.85], high: [1.00,0.95,0.98], ocean: [0.20,0.55,0.85], atmosphere: [1.0,0.7,0.9] },
  electronic: { low: [0.05,0.15,0.35], mid: [0.15,0.55,0.85], high: [0.75,0.95,1.00], ocean: [0.02,0.08,0.20], atmosphere: [0.3,0.6,1.0] },
  hiphop:     { low: [0.25,0.12,0.05], mid: [0.65,0.40,0.15], high: [0.98,0.85,0.35], ocean: [0.10,0.05,0.02], atmosphere: [1.0,0.75,0.25] },
  jazz:       { low: [0.25,0.15,0.30], mid: [0.55,0.35,0.55], high: [0.85,0.75,0.60], ocean: [0.10,0.05,0.15], atmosphere: [0.75,0.55,0.85] },
  classical:  { low: [0.50,0.45,0.40], mid: [0.75,0.72,0.68], high: [0.98,0.96,0.92], ocean: [0.35,0.45,0.55], atmosphere: [0.9,0.9,0.85] },
  metal:      { low: [0.08,0.08,0.10], mid: [0.25,0.22,0.25], high: [0.55,0.15,0.15], ocean: [0.15,0.02,0.02], atmosphere: [0.9,0.25,0.15] },
  indie:      { low: [0.30,0.35,0.25], mid: [0.55,0.65,0.45], high: [0.90,0.85,0.70], ocean: [0.15,0.30,0.35], atmosphere: [0.85,0.75,0.55] },
  reggae:     { low: [0.12,0.35,0.15], mid: [0.35,0.65,0.25], high: [0.95,0.90,0.35], ocean: [0.05,0.35,0.25], atmosphere: [0.5,0.9,0.4] },
  folk:       { low: [0.35,0.25,0.15], mid: [0.65,0.55,0.35], high: [0.90,0.80,0.60], ocean: [0.20,0.30,0.25], atmosphere: [0.85,0.70,0.45] },
};

export function paletteForGenre(g: MockGenre): BiomePalette {
  return PALETTES[g];
}

export function blendPalettes(
  weighted: { name: MockGenre; weight: number }[],
): BiomePalette {
  const total = weighted.reduce((s, g) => s + g.weight, 0) || 1;
  const acc: BiomePalette = {
    low: [0,0,0], mid: [0,0,0], high: [0,0,0], ocean: [0,0,0], atmosphere: [0,0,0],
  };
  for (const { name, weight } of weighted) {
    const p = PALETTES[name];
    const w = weight / total;
    (["low","mid","high","ocean","atmosphere"] as const).forEach((k) => {
      acc[k][0] += p[k][0] * w;
      acc[k][1] += p[k][1] * w;
      acc[k][2] += p[k][2] * w;
    });
  }
  return acc;
}