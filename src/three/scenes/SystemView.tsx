import { useMemo } from "react";
import * as THREE from "three";
import type { BodyAttrs } from "@/lib/spotify/mapping";
import { Planet } from "@/three/entities/Planet";
import { Ring } from "@/three/entities/Ring";
import { Moon } from "@/three/entities/Moon";

export function SystemView({ body }: { body: BodyAttrs }) {
  const moonPhases = useMemo(
    () => body.moons.map((_, i) => (i / body.moons.length) * Math.PI * 2),
    [body.moons],
  );
  return (
    <group>
      <Planet body={body} />
      {body.rings.map((r, i) => (
        <Ring key={i} ring={r} />
      ))}
      {body.moons.map((m, i) => (
        <Moon key={i} moon={m} phase={moonPhases[i]} />
      ))}
      {/* Ambient sun light for moons */}
      <directionalLight position={[8, 5, 6]} intensity={1.6} />
      {/* Fill light (bounced/space light) so shadowed hemispheres of moons/planet
          don't render as pure black holes. */}
      <directionalLight
        position={[-6, -3, -4]}
        intensity={0.35}
        color={new THREE.Color(0.55, 0.65, 0.9)}
      />
      <ambientLight intensity={0.22} />
    </group>
  );
}