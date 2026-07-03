import * as THREE from "three";

/**
 * A single luminous point representing an unresolved distant object.
 * Uses a small billboarded sprite so it stays visible across huge distances.
 */
export function DistantPoint({
  color,
  size = 4,
}: {
  color: [number, number, number];
  size?: number;
}) {
  const c = new THREE.Color(color[0], color[1], color[2]);
  return (
    <sprite scale={[size, size, size]}>
      <spriteMaterial color={c} depthWrite={false} sizeAttenuation={false} transparent opacity={0.9} />
    </sprite>
  );
}