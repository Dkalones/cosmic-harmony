import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cinematic black hole: camera-facing quad with a single-pass shader.
 * - Gravitational lens distortion of a procedural starfield
 * - Event horizon + photon ring
 * - Doppler-shifted accretion disk with turbulent flow
 * Fake-2D approach (Interstellar-style billboard) keeps it to one cheap draw.
 */
const bhVert = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bhFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;

  float hash21(vec2 p){
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm2(vec2 p){
    float v = 0.0; float a = 0.5;
    for(int i = 0; i < 4; i++){ v += a * noise2(p); p *= 2.13; a *= 0.5; }
    return v;
  }

  // sparse procedural starfield
  float stars(vec2 p){
    vec2 g = floor(p); vec2 f = fract(p);
    float h = hash21(g + uSeed);
    vec2 o = vec2(fract(h * 7.77), fract(h * 17.3));
    float d = length(f - o);
    return smoothstep(0.08, 0.0, d) * step(0.82, h);
  }

  void main(){
    vec2 uv = (vUv - 0.5) * 2.0;   // -1..1 across the quad
    float r = length(uv);
    float rs = 0.14;               // event horizon radius (quad space)

    // ---- gravitational lens distortion ----
    float bend = (rs * rs) / max(r * r - rs * rs * 0.55, 1e-4);
    vec2 lensUv = uv * (1.0 + bend * 1.6);
    float mag = clamp(bend * 2.5, 0.0, 1.5);

    // lensed background starfield (two layers, streaked by magnification)
    float s = stars(lensUv * 22.0) + stars(lensUv * 41.0 + 7.3) * 0.6;
    vec3 col = vec3(0.75, 0.82, 1.0) * s * (0.35 + mag);

    // ---- accretion disk (thin, inclined via anisotropic squash) ----
    vec2 dp = vec2(uv.x, uv.y * 3.4);
    float dr = length(dp);
    float ang = atan(dp.y, dp.x);
    float diskMask = smoothstep(rs * 1.15, rs * 1.5, dr) * smoothstep(0.95, 0.42, dr);
    float flow = fbm2(vec2(dr * 9.0 - uTime * 0.55, ang * 2.5 + uTime * 0.35 + dr * 7.0));
    // relativistic doppler beaming: approaching side much brighter
    float doppler = 1.0 + 0.95 * (-dp.x / max(dr, 1e-3));
    vec3 hot = vec3(1.0, 0.93, 0.78);
    vec3 warm = vec3(1.0, 0.52, 0.14);
    vec3 disk = mix(warm, hot, flow) * diskMask * (0.5 + flow * 1.2) * doppler;
    // inner edge glows hotter
    disk += hot * diskMask * exp(-(dr - rs * 1.3) * 9.0) * 0.8;
    col += disk;

    // ---- photon ring ----
    float ring = exp(-pow((r - rs * 1.32) * 34.0, 2.0));
    col += vec3(1.0, 0.85, 0.6) * ring * 2.2;

    // ---- event horizon: pure black, fully opaque ----
    float hole = 1.0 - smoothstep(rs * 0.99, rs * 1.10, r);
    col *= (1.0 - hole);

    float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
    alpha = max(alpha, hole);
    // soft fade at quad edges so the billboard never shows a seam
    alpha *= smoothstep(1.0, 0.72, r);

    gl_FragColor = vec4(col, alpha);
  }
`;

interface BlackHoleProps {
  radius: number; // event-horizon world radius
  seed: number;
}

export function BlackHole({ radius, seed }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const quadSize = radius / 0.14; // horizon occupies rs=0.14 of the quad

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: (seed % 1000) * 0.37 },
    }),
    [seed],
  );

  useFrame(({ camera }, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
    }
    // billboard toward the camera
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} scale={quadSize}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bhVert}
        fragmentShader={bhFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}