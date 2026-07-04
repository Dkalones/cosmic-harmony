import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AbsoluteGroup } from "@/three/core/AbsoluteGroup";
import { Galaxy } from "@/three/entities/Galaxy";
import { Star } from "@/three/entities/Star";
import { DistantPoint } from "@/three/entities/DistantPoint";
import { Nebula } from "@/three/entities/Nebula";
import { BlackHole } from "@/three/entities/BlackHole";
import { SystemView } from "@/three/scenes/SystemView";
import { useCamera } from "@/state/useCamera";
import { useUniverseStore } from "@/state/useUniverseStore";
import { useStreaming } from "@/state/useStreaming";
import { useDebug } from "@/state/useDebug";
import { MockUniverseProvider } from "@/three/universe/MockUniverseProvider";
import { SpotifyUniverseProvider } from "@/three/universe/SpotifyUniverseProvider";
import { galaxyLOD, systemLOD } from "@/three/core/LODManager";
import { vec3Dist, SCALE } from "@/three/universe/hierarchy";

/**
 * Orchestrates the whole universe in a single scene.
 * - Rebuilds `UniverseData` when the debug seed or data source changes.
 * - Chooses per-galaxy and per-system LOD every frame from the camera.
 * - Streams only close-enough entities as real objects; the rest are points.
 */
export function UniverseScene() {
  const dataSource = useDebug((s) => s.dataSource);
  const universeSeed = useDebug((s) => s.universeSeed);
  const renderDistance = useDebug((s) => s.renderDistance);
  const setUniverse = useUniverseStore((s) => s.setUniverse);
  const universe = useUniverseStore((s) => s.universe);

  // Build universe when inputs change
  useEffect(() => {
    const provider = dataSource === "spotify"
      ? new SpotifyUniverseProvider()
      : new MockUniverseProvider();
    const u = provider.build(universeSeed);
    setUniverse(u);
    // Snap camera to the first known user system so we boot with something visible.
    const first = u.galaxies[0]?.systems.find((s) => s.userBody);
    if (first) {
      useCamera.getState().setAbsPos([
        first.center[0],
        first.center[1] + 4,
        first.center[2] + 14,
      ]);
      useCamera.getState().setYawPitch(0, -0.15);
    }
  }, [dataSource, universeSeed, setUniverse]);

  // Per-frame LOD + streaming stats update
  const { gl: renderer } = useThree();
  useFrame(({ clock }, dt) => {
    if (!universe) return;
    const cam = useCamera.getState().absPos;

    let loaded = 0;
    let nearestGalaxy: string | null = null;
    let nearestGalaxyDist = Infinity;
    let nearestSystem: string | null = null;
    let nearestSystemDist = Infinity;
    let currentLOD = "imposter";

    for (const g of universe.galaxies) {
      const dg = vec3Dist(cam, g.center);
      if (dg < nearestGalaxyDist) { nearestGalaxyDist = dg; nearestGalaxy = g.id; }
      const glod = galaxyLOD(dg / renderDistance);
      if (glod !== "imposter") loaded++;
      if (dg < g.radius * 1.5) {
        currentLOD = "galaxy:" + glod;
        for (const s of g.systems) {
          const ds = vec3Dist(cam, s.center);
          if (ds < nearestSystemDist) { nearestSystemDist = ds; nearestSystem = s.id; }
          const sl = systemLOD(ds / renderDistance);
          if (sl !== "imposter") loaded++;
          if (ds < SCALE.systemRadius * 3) currentLOD = "system:" + sl;
        }
      }
    }

    // FPS: exponential moving avg
    const inst = 1 / Math.max(dt, 1e-4);
    const prev = useStreaming.getState().fps;
    const fps = prev === 0 ? inst : prev * 0.9 + inst * 0.1;

    useStreaming.getState().set({
      loadedObjects: loaded,
      activeChunks: loaded,
      currentGalaxyId: nearestGalaxy,
      currentSystemId: nearestSystem,
      currentLOD,
      fps,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    });

    // silence unused
    void clock;
  });

  if (!universe) return null;

  return (
    <group>
      {universe.galaxies.map((g) => (
        <GalaxyRenderer key={g.id} galaxy={g} />
      ))}
    </group>
  );
}

function GalaxyRenderer({ galaxy }: { galaxy: import("@/three/universe/types").GalaxyData }) {
  const renderDistance = useDebug((s) => s.renderDistance);
  const showSysDots = useDebug((s) => s.showSystemPositions);
  const cameraAbs = useCamera((s) => s.absPos);

  const dg = useMemo(() => vec3Dist(cameraAbs, galaxy.center), [cameraAbs, galaxy]);
  const lod = galaxyLOD(dg / renderDistance);

  // Very far: just a bright dot at the galaxy center
  if (lod === "imposter" || lod === "low") {
    return (
      <AbsoluteGroup absPos={galaxy.center}>
        <DistantPoint color={galaxy.coreColor} size={lod === "imposter" ? 3 : 6} />
      </AbsoluteGroup>
    );
  }

  // Mid: show galaxy point cloud + volumetrics, systems only as dots
  if (lod === "mid") {
    return (
      <>
        <AbsoluteGroup absPos={galaxy.center}>
          <Galaxy galaxy={galaxy} detail="low" />
        </AbsoluteGroup>
        {false && <GalaxyVolumetrics galaxy={galaxy} />}
      </>
    );
  }

  // High (we're inside the galaxy): full stars, resolve systems
  return (
    <>
      <AbsoluteGroup absPos={galaxy.center}>
        <Galaxy galaxy={galaxy} detail="mid" />
      </AbsoluteGroup>
      {false && <GalaxyVolumetrics galaxy={galaxy} />}
      {galaxy.systems.map((s) => (
        <SystemRenderer key={s.id} system={s} showDot={showSysDots} />
      ))}
    </>
  );
}

/** Nebulae + central black hole shared by mid/high galaxy LOD. */
function GalaxyVolumetrics({ galaxy }: { galaxy: import("@/three/universe/types").GalaxyData }) {
  return (
    <>
      {galaxy.nebulae.map((n) => (
        <AbsoluteGroup key={n.id} absPos={n.center}>
          <Nebula nebula={n} />
        </AbsoluteGroup>
      ))}
      {galaxy.hasBlackHole && (
        <AbsoluteGroup absPos={galaxy.center}>
          <BlackHole radius={galaxy.radius * 0.02} seed={galaxy.seed} />
        </AbsoluteGroup>
      )}
    </>
  );
}

function SystemRenderer({
  system,
  showDot,
}: {
  system: import("@/three/universe/types").SystemData;
  showDot: boolean;
}) {
  const renderDistance = useDebug((s) => s.renderDistance);
  const cameraAbs = useCamera((s) => s.absPos);
  const ds = vec3Dist(cameraAbs, system.center);
  const lod = systemLOD(ds / renderDistance);

  if (lod === "imposter") {
    if (!showDot) return null;
    return (
      <AbsoluteGroup absPos={system.center}>
        <DistantPoint color={system.starColor} size={2} />
      </AbsoluteGroup>
    );
  }

  if (lod === "low") {
    return (
      <AbsoluteGroup absPos={system.center}>
        <DistantPoint color={system.starColor} size={5} />
      </AbsoluteGroup>
    );
  }

  if (lod === "mid") {
    return (
      <AbsoluteGroup absPos={system.center}>
        <Star color={system.starColor} radius={system.starRadius} seed={system.seed} />
      </AbsoluteGroup>
    );
  }

  // High: full system (star + planet from userBody if present)
  return (
    <AbsoluteGroup absPos={system.center}>
      {system.userBody ? (
        <SystemView body={system.userBody} />
      ) : (
        <Star color={system.starColor} radius={system.starRadius} seed={system.seed} />
      )}
    </AbsoluteGroup>
  );
}