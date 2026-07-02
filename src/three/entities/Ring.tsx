import { useMemo } from "react";
import * as THREE from "three";
import type { RingAttrs } from "@/lib/spotify/mapping";

export function Ring({ ring }: { ring: RingAttrs }) {
  const color = useMemo(() => new THREE.Color(`hsl(${ring.hue}, 70%, 65%)`), [ring.hue]);
  return (
    <mesh rotation={[Math.PI / 2 + ring.tilt, 0, 0]}>
      <ringGeometry args={[ring.inner, ring.outer, 128]} />
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent
        opacity={ring.opacity}
        depthWrite={false}
      />
    </mesh>
  );
}