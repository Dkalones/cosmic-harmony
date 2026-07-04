/**
 * Shared worker pool + job dispatcher for galaxy point-cloud generation.
 * A single worker handles all galaxies; jobs are keyed by a monotonic id so
 * stale results (e.g. after a param change) are discarded.
 */
let worker: Worker | null = null;
let nextJobId = 1;
const pending = new Map<number, (r: GalaxyBuffers) => void>();

export interface GalaxyBuffers {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

export interface GalaxyJob {
  seed: number;
  radius: number;
  arms: number;
  type: "spiral" | "barred" | "elliptical" | "irregular";
  count: number;
  armTight: number;
  thickness: number;
  coreBright: number;
}

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./galaxyPoints.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<{ jobId: number } & GalaxyBuffers>) => {
    const cb = pending.get(ev.data.jobId);
    if (!cb) return;
    pending.delete(ev.data.jobId);
    cb({ positions: ev.data.positions, colors: ev.data.colors, sizes: ev.data.sizes });
  };
  return worker;
}

export function requestGalaxyPoints(job: GalaxyJob): { promise: Promise<GalaxyBuffers>; cancel: () => void } {
  const w = ensureWorker();
  const jobId = nextJobId++;
  const promise = new Promise<GalaxyBuffers>((resolve) => {
    pending.set(jobId, resolve);
  });
  w.postMessage({ ...job, jobId });
  return { promise, cancel: () => pending.delete(jobId) };
}