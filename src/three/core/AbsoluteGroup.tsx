import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCamera } from "@/state/useCamera";
import type { Vec3 } from "@/three/universe/hierarchy";

/**
 * A three.js group that stays anchored at an absolute universe coordinate.
 * Each frame it sets its local position to `absPos - cameraAbsPos`, which
 * keeps the camera at three.js origin (camera-relative rendering) and avoids
 * Float32 jitter at very large distances from the origin.
 */
export function AbsoluteGroup({
  absPos,
  children,
}: {
  absPos: Vec3;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const c = useCamera.getState().absPos;
    ref.current.position.set(
      absPos[0] - c[0],
      absPos[1] - c[1],
      absPos[2] - c[2],
    );
  });
  return <group ref={ref}>{children}</group>;
}