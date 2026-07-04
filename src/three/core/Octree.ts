import type { Vec3 } from "@/three/universe/hierarchy";

export interface OctreeItem<T> {
  pos: Vec3;
  radius: number;
  data: T;
}

/**
 * Real octree with 8-way subdivision. Bulk-insert once, query many.
 * Items whose radius exceeds the target node size stay at that parent level
 * so a big galaxy is still visited by any child-node query that overlaps it.
 */
interface Node<T> {
  cx: number; cy: number; cz: number;
  half: number;
  items: OctreeItem<T>[];
  children: Node<T>[] | null;
}

function makeNode<T>(cx: number, cy: number, cz: number, half: number): Node<T> {
  return { cx, cy, cz, half, items: [], children: null };
}

export class Octree<T> {
  private root: Node<T>;
  private maxDepth: number;
  private threshold: number;
  private count = 0;

  constructor(center: Vec3 = [0, 0, 0], half = 5_000_000, maxDepth = 6, threshold = 16) {
    this.root = makeNode(center[0], center[1], center[2], half);
    this.maxDepth = maxDepth;
    this.threshold = threshold;
  }

  clear() {
    this.root = makeNode(this.root.cx, this.root.cy, this.root.cz, this.root.half);
    this.count = 0;
  }

  size() { return this.count; }

  insert(item: OctreeItem<T>) {
    this.count++;
    this.insertInto(this.root, item, 0);
  }

  private insertInto(node: Node<T>, item: OctreeItem<T>, depth: number) {
    // If the item's radius is larger than a child would be, keep it at this level.
    if (depth >= this.maxDepth || item.radius >= node.half * 0.5) {
      node.items.push(item);
      return;
    }
    if (!node.children && node.items.length < this.threshold) {
      node.items.push(item);
      return;
    }
    if (!node.children) {
      node.children = this.subdivide(node);
      // redistribute leaf items that fit in a child
      const kept: OctreeItem<T>[] = [];
      for (const it of node.items) {
        if (it.radius >= node.half * 0.5) { kept.push(it); continue; }
        const child = this.childFor(node, it.pos);
        if (child) this.insertInto(child, it, depth + 1);
        else kept.push(it);
      }
      node.items = kept;
    }
    const child = this.childFor(node, item.pos);
    if (child) this.insertInto(child, item, depth + 1);
    else node.items.push(item);
  }

  private subdivide(node: Node<T>): Node<T>[] {
    const h = node.half * 0.5;
    const out: Node<T>[] = [];
    for (let i = 0; i < 8; i++) {
      const ox = (i & 1) ? h : -h;
      const oy = (i & 2) ? h : -h;
      const oz = (i & 4) ? h : -h;
      out.push(makeNode(node.cx + ox, node.cy + oy, node.cz + oz, h));
    }
    return out;
  }

  private childFor(node: Node<T>, p: Vec3): Node<T> | null {
    if (!node.children) return null;
    const idx =
      (p[0] >= node.cx ? 1 : 0) |
      (p[1] >= node.cy ? 2 : 0) |
      (p[2] >= node.cz ? 4 : 0);
    const c = node.children[idx];
    // reject if point is outside root bounds
    if (Math.abs(p[0] - node.cx) > node.half ||
        Math.abs(p[1] - node.cy) > node.half ||
        Math.abs(p[2] - node.cz) > node.half) return null;
    return c;
  }

  /** Items whose bounding sphere is within `range` of `center`. */
  queryRadius(center: Vec3, range: number): OctreeItem<T>[] {
    const out: OctreeItem<T>[] = [];
    this.queryNode(this.root, center, range, out);
    return out;
  }

  private queryNode(node: Node<T>, c: Vec3, range: number, out: OctreeItem<T>[]) {
    // AABB-sphere reject
    const dx = Math.max(0, Math.abs(c[0] - node.cx) - node.half);
    const dy = Math.max(0, Math.abs(c[1] - node.cy) - node.half);
    const dz = Math.max(0, Math.abs(c[2] - node.cz) - node.half);
    if (dx * dx + dy * dy + dz * dz > range * range) return;

    for (const it of node.items) {
      const ex = c[0] - it.pos[0], ey = c[1] - it.pos[1], ez = c[2] - it.pos[2];
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez) - it.radius;
      if (d <= range) out.push(it);
    }
    if (node.children) {
      for (const child of node.children) this.queryNode(child, c, range, out);
    }
  }
}