import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { makePRNG } from "@/three/procedural/seed";
import type { GalaxyData } from "@/three/universe/types";
import { useDebug } from "@/state/useDebug";
import { requestGalaxyPoints, type GalaxyBuffers } from "@/three/workers/galaxyPointsPool";

/**
 * Renders a procedural galaxy as a large point-cloud. Real user systems live
 * *inside* the same volume as separate entities — this component only draws
 * the background stars that give the galaxy its shape.
 */
export function Galaxy({ galaxy, detail = "mid" }: { galaxy: GalaxyData; detail?: "low" | "mid" | "high" }) {
  const armTight = useDebug((s) => s.galaxyArmTightness);
  const thickness = useDebug((s) => s.galaxyThickness);
  const coreBright = useDebug((s) => s.galaxyCoreBrightness);

  const count = detail === "high" ? galaxy.starCount
    : detail === "mid" ? Math.floor(galaxy.starCount * 0.35)
    : Math.floor(galaxy.starCount * 0.08);

  // Small point-clouds stay on the main thread (cheap); heavy ones go to the
  // worker so mid/high LOD swaps don't stall the frame.
  const useWorker = count > 4000;
  const [async, setAsync] = useState<GalaxyBuffers | null>(null);

  useEffect(() => {
    if (!useWorker) { setAsync(null); return; }
    let cancelled = false;
    const { promise, cancel } = requestGalaxyPoints({
      seed: galaxy.seed,
      radius: galaxy.radius,
      arms: galaxy.arms,
      type: galaxy.type,
      count,
      armTight,
      thickness,
      coreBright,
    });
    promise.then((b) => { if (!cancelled) setAsync(b); });
    return () => { cancelled = true; cancel(); };
  }, [useWorker, galaxy.seed, galaxy.radius, galaxy.arms, galaxy.type, count, armTight, thickness, coreBright]);

  const sync = useMemo(() => {
    if (useWorker) return null;
    const rng = makePRNG(galaxy.seed ^ 0x51ed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const r = galaxy.radius;
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, z = 0;
      if (galaxy.type === "spiral" || galaxy.type === "barred") {
        const arm = Math.floor(rng() * Math.max(1, galaxy.arms));
        const t = Math.pow(rng(), 0.55);
        const armAngle = (arm / galaxy.arms) * Math.PI * 2
          + t * Math.PI * 2.5 * armTight;
        const rad = t * r;
        const jitter = (1 - t) * r * 0.06;
        x = Math.cos(armAngle) * rad + (rng() - 0.5) * jitter;
        z = Math.sin(armAngle) * rad + (rng() - 0.5) * jitter;
        y = (rng() - 0.5) * r * 0.03 * thickness * (1 - t * 0.7);
      } else if (galaxy.type === "elliptical") {
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
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      // color: core = warm/bright, arms = bluish
      const dr = Math.hypot(x, y, z) / r;
      const core = 1 - Math.min(1, dr * 2);
      col[i * 3] = 0.7 + 0.3 * core * coreBright;
      col[i * 3 + 1] = 0.6 + 0.3 * core * coreBright;
      col[i * 3 + 2] = 0.9 - 0.4 * core;
      sz[i] = 1 + core * 3 * coreBright + rng() * 1.5;
    }
    return { positions: pos, colors: col, sizes: sz };
  }, [useWorker, galaxy, count, armTight, thickness, coreBright]);

  const buffers = useWorker ? async : sync;

  const geo = useMemo(() => {
    if (!buffers) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buffers.positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(buffers.colors, 3));
    g.setAttribute("size", new THREE.BufferAttribute(buffers.sizes, 1));
    return g;
  }, [buffers]);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
    vertexShader: /* glsl */ `
      attribute float size;
      varying vec3 vColor;
      varying float vFade;
      uniform float uPixelRatio;
      void main(){
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = max(-mv.z, 1.0);
        // clamp sprite size so near points never balloon into screen-filling washes
        gl_PointSize = min(size * uPixelRatio * (300.0 / dist), 42.0);
        // fade out points that get too close to the camera
        vFade = smoothstep(40.0, 600.0, dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vFade;
      void main(){
        if(vFade < 0.004) discard;
        vec2 d = gl_PointCoord - vec2(0.5);
        float a = smoothstep(0.5, 0.0, length(d));
        gl_FragColor = vec4(vColor, a * vFade);
      }
    `,
  }), []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.005;
  });

  if (!geo) return null;
  return <points ref={ref} geometry={geo} material={mat} />;
}