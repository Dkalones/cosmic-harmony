/**
 * Off-main-thread generation of the galaxy point-cloud buffers.
 * Returns transferable Float32Array positions/colors/sizes so the main thread
 * never blocks on the loop when a galaxy switches to a higher LOD.
 */
/* eslint-disable no-restricted-globals */

type Msg = {
  seed: number;
  radius: number;
  arms: number;
  type: "spiral" | "barred" | "elliptical" | "irregular";
  count: number;
  armTight: number;
  thickness: number;
  coreBright: number;
  jobId: number;
};

function makePRNG(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s & 0xffffffff) / 0x100000000;
  };
}

self.onmessage = (ev: MessageEvent<Msg>) => {
  const { seed, radius: r, arms, type, count, armTight, thickness, coreBright, jobId } = ev.data;
  const rng = makePRNG(seed ^ 0x51ed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    if (type === "spiral" || type === "barred") {
      const arm = Math.floor(rng() * Math.max(1, arms));
      const t = Math.pow(rng(), 0.55);
      const armAngle = (arm / arms) * Math.PI * 2 + t * Math.PI * 2.5 * armTight;
      const rad = t * r;
      const jitter = (1 - t) * r * 0.06;
      x = Math.cos(armAngle) * rad + (rng() - 0.5) * jitter;
      z = Math.sin(armAngle) * rad + (rng() - 0.5) * jitter;
      y = (rng() - 0.5) * r * 0.03 * thickness * (1 - t * 0.7);
    } else if (type === "elliptical") {
      const t = Math.pow(rng(), 0.4);
      const a = rng() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * rng());
      x = Math.sin(phi) * Math.cos(a) * t * r;
      y = Math.cos(phi) * t * r * 0.6;
      z = Math.sin(phi) * Math.sin(a) * t * r;
    } else {
      x = (rng() - 0.5) * r * 1.5;
      y = (rng() - 0.5) * r * 0.4;
      z = (rng() - 0.5) * r * 1.5;
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const dr = Math.hypot(x, y, z) / r;
    const core = 1 - Math.min(1, dr * 2);
    col[i * 3] = 0.7 + 0.3 * core * coreBright;
    col[i * 3 + 1] = 0.6 + 0.3 * core * coreBright;
    col[i * 3 + 2] = 0.9 - 0.4 * core;
    sz[i] = 1 + core * 3 * coreBright + rng() * 1.5;
  }
  (self as unknown as Worker).postMessage(
    { jobId, positions: pos, colors: col, sizes: sz },
    [pos.buffer, col.buffer, sz.buffer],
  );
};
export {};