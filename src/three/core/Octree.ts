import type { Vec3 } from "@/three/universe/hierarchy";
import { vec3Dist } from "@/three/universe/hierarchy";

export interface OctreeItem<T> {
  pos: Vec3;
  radius: number;
  data: T;
}

/**
 * Minimal octree for spatial queries. Phase 1 uses linear scan under the hood
 * but exposes the octree API so streaming/culling code can be swapped without
 * touching call sites in later phases.
 */
export class Octree<T> {
  private items: OctreeItem<T>[] = [];
  insert(item: OctreeItem<T>) {
    this.items.push(item);
  }
  clear() {
    this.items.length = 0;
  }
  /** Items whose bounding sphere is within `range` of `center`. */
  queryRadius(center: Vec3, range: number): OctreeItem<T>[] {
    const out: OctreeItem<T>[] = [];
    for (const it of this.items) {
      if (vec3Dist(center, it.pos) - it.radius <= range) out.push(it);
    }
    return out;
  }
  size() {
    return this.items.length;
  }
}