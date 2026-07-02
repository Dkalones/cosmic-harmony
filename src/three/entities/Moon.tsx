import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MoonAttrs } from "@/lib/spotify/mapping";

export function Moon({ moon, phase }: { moon: MoonAttrs; phase: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * moon.speed;
  });
  return (
    <group ref={g} rotation={[moon.inclination, phase, 0]}>
      <mesh position={[moon.orbit, 0, 0]}>
        <icosahedronGeometry args={[moon.radius, 2]} />
        <meshStandardMaterial color={new THREE.Color(...moon.color)} roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
}