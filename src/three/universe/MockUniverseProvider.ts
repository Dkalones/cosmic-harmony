import { MOCK_USERS } from "@/lib/mock/users";
import { mapUserToBody } from "@/lib/spotify/mapping";
import { makePRNG, randRange, pick } from "@/three/procedural/seed";
import { branchSeed, SCALE, type Vec3 } from "./hierarchy";
import type {
  GalaxyData,
  GalaxyType,
  SystemData,
  UniverseData,
} from "./types";
import type { UniverseProvider } from "./UniverseProvider";

const GALAXY_TYPES: GalaxyType[] = ["spiral", "barred", "elliptical", "irregular"];
const GALAXY_NAMES = [
  "Andromeda", "Orionis", "Vela", "Lyra Prime", "Cygnus X", "Draconis",
  "Perseus", "Centauri", "Sirius Loop", "Helios",
];

/** Deterministic procedural universe. Injects the MOCK_USERS as real systems. */
export class MockUniverseProvider implements UniverseProvider {
  readonly source = "mock" as const;

  build(seed: number): UniverseData {
    const rng = makePRNG(seed);
    const galaxyCount = 8;
    const galaxies: GalaxyData[] = [];

    for (let i = 0; i < galaxyCount; i++) {
      const gSeed = branchSeed(seed, i);
      const gRng = makePRNG(gSeed);
      const type = pick(gRng, GALAXY_TYPES);
      const arms = type === "spiral" || type === "barred"
        ? Math.floor(randRange(gRng, 2, 6))
        : 0;
      const radius = randRange(gRng, SCALE.galaxyRadius * 0.5, SCALE.galaxyRadius);

      // spread galaxies across the universe
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * rng());
      const r = randRange(rng, SCALE.galaxySpacing, SCALE.galaxySpacing * 4);
      const center: Vec3 = i === 0
        ? [0, 0, 0]
        : [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta) * 0.3, // flattened
            r * Math.cos(phi),
          ];

      const coreHue = randRange(gRng, 0, 1);
      const coreColor: [number, number, number] = [
        0.6 + 0.4 * Math.abs(Math.sin(coreHue * 6.28)),
        0.5 + 0.3 * Math.abs(Math.cos(coreHue * 6.28 + 1)),
        0.7 + 0.3 * Math.abs(Math.sin(coreHue * 6.28 + 2)),
      ];

      const systems = buildSystems(gSeed, i, center, radius, arms, type);

      galaxies.push({
        id: `g_${i}`,
        seed: gSeed,
        name: GALAXY_NAMES[i % GALAXY_NAMES.length],
        type,
        center,
        radius,
        arms,
        starCount: type === "elliptical" ? 8000 : 12000,
        coreColor,
        hasBlackHole: gRng() > 0.3,
        systems,
      });
    }

    return { seed, name: "SpotUniverse", galaxies };
  }
}

function buildSystems(
  gSeed: number,
  gIndex: number,
  center: Vec3,
  radius: number,
  arms: number,
  type: GalaxyType,
): SystemData[] {
  const systems: SystemData[] = [];

  // First galaxy hosts the mock users as real systems near the core.
  if (gIndex === 0) {
    MOCK_USERS.forEach((u, idx) => {
      const uSeed = branchSeed(gSeed, u.id);
      const uRng = makePRNG(uSeed);
      const angle = (idx / MOCK_USERS.length) * Math.PI * 2;
      const dist = SCALE.systemSpacing * (2 + idx * 0.8);
      const centerAbs: Vec3 = [
        center[0] + Math.cos(angle) * dist,
        center[1] + (uRng() - 0.5) * SCALE.systemSpacing * 0.2,
        center[2] + Math.sin(angle) * dist,
      ];
      const body = mapUserToBody(u);
      systems.push({
        id: `sys_${u.id}`,
        seed: uSeed,
        name: u.displayName,
        center: centerAbs,
        userBody: body,
        starColor: body.palette.atmosphere,
        starRadius: body.isStar ? body.radius * 2 : 1.2,
      });
    });
  }

  // Procedural filler systems along the arms.
  const fillerCount = 40;
  const rng = makePRNG(branchSeed(gSeed, "fillers"));
  for (let i = 0; i < fillerCount; i++) {
    const sSeed = branchSeed(gSeed, `s${i}`);
    const sRng = makePRNG(sSeed);
    let x: number, z: number;
    if (type === "spiral" || type === "barred") {
      const arm = Math.floor(rng() * arms);
      const t = Math.pow(rng(), 0.6);
      const armAngle = (arm / arms) * Math.PI * 2 + t * Math.PI * 2.5;
      const r = t * radius;
      x = Math.cos(armAngle) * r + (rng() - 0.5) * radius * 0.05;
      z = Math.sin(armAngle) * r + (rng() - 0.5) * radius * 0.05;
    } else if (type === "elliptical") {
      const t = Math.pow(rng(), 0.4);
      const a = rng() * Math.PI * 2;
      x = Math.cos(a) * t * radius;
      z = Math.sin(a) * t * radius * 0.7;
    } else {
      x = (rng() - 0.5) * radius * 1.5;
      z = (rng() - 0.5) * radius * 1.5;
    }
    const y = (rng() - 0.5) * radius * 0.05;
    const centerAbs: Vec3 = [center[0] + x, center[1] + y, center[2] + z];
    const temp = randRange(sRng, 0.3, 1.4);
    systems.push({
      id: `sys_g${gIndex}_${i}`,
      seed: sSeed,
      name: `HD-${(sSeed % 100000).toString().padStart(5, "0")}`,
      center: centerAbs,
      starColor: [
        Math.min(1, 0.6 + temp * 0.4),
        Math.min(1, 0.55 + temp * 0.2),
        Math.min(1, 1.2 - temp * 0.6),
      ],
      starRadius: randRange(sRng, 0.6, 2.4),
    });
  }

  return systems;
}