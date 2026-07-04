import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { NebulaData } from "@/three/universe/types";

/**
 * Volumetric nebula: raymarched fBM density inside a bounding sphere.
 * Cinematic-optimized: 20 steps, dithered start, early transmittance exit,
 * cost scales with screen coverage (tiny when far away).
 */
const nebulaVert = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vCenter;
  void main(){
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform float uRadius;
  uniform float uDensity;
  uniform float uSeed;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vCenter;

  vec3 hash3(vec3 p){
    p = vec3(dot(p,vec3(127.1,311.7, 74.7)),
             dot(p,vec3(269.5,183.3,246.1)),
             dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }
  float snoise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),
                       dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),
                       dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),
                       dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),
                       dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
  }
  float fbm(vec3 p){
    float v = 0.0; float a = 0.5;
    for(int i=0;i<4;i++){ v += a*snoise(p); p*=2.07; a*=0.5; }
    return v;
  }

  // ray-sphere intersection: returns (tNear, tFar), tFar < 0 = miss
  vec2 sphereHit(vec3 ro, vec3 rd, vec3 c, float r){
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float cc = dot(oc, oc) - r*r;
    float h = b*b - cc;
    if(h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  void main(){
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - ro);
    vec2 t = sphereHit(ro, rd, vCenter, uRadius);
    if(t.y < 0.0) discard;
    t.x = max(t.x, 0.0);

    const int STEPS = 20;
    float stepLen = (t.y - t.x) / float(STEPS);
    // screen-space dither hides banding at low step counts
    float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float tt = t.x + stepLen * dith;

    vec3 acc = vec3(0.0);
    float trans = 1.0;
    vec3 seedOff = vec3(uSeed * 0.013, uSeed * 0.007, uSeed * 0.019);

    for(int i = 0; i < STEPS; i++){
      vec3 p = ro + rd * tt;
      vec3 lp = (p - vCenter) / uRadius; // normalized volume coords
      float fall = 1.0 - clamp(length(lp), 0.0, 1.0);
      float n = fbm(lp * 3.0 + seedOff + vec3(0.0, uTime * 0.008, 0.0));
      float d = smoothstep(0.02, 0.55, n + 0.15) * fall * fall * uDensity;
      if(d > 0.003){
        float a = clamp(d * 0.30, 0.0, 1.0);
        // inner core hotter -> colB, wispy edges -> colA
        vec3 col = mix(uColA, uColB, clamp(fall * 1.4 - 0.2 + n * 0.4, 0.0, 1.0));
        acc += col * a * trans * (0.8 + n * 0.6);
        trans *= (1.0 - a);
        if(trans < 0.03) break;
      }
      tt += stepLen;
    }

    float alpha = 1.0 - trans;
    if(alpha < 0.01) discard;
    gl_FragColor = vec4(acc, alpha);
  }
`;

export function Nebula({ nebula }: { nebula: NebulaData }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [lod, setLod] = useState<"imposter" | "billboard" | "volume">("billboard");

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uColA: { value: new THREE.Color(...nebula.colorA) },
      uColB: { value: new THREE.Color(...nebula.colorB) },
      uRadius: { value: nebula.radius },
      uDensity: { value: nebula.density },
      uSeed: { value: nebula.seed % 1000 },
      uTime: { value: 0 },
    }),
    [nebula],
  );

  const billboardUniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uColA: { value: new THREE.Color(...nebula.colorA) },
      uColB: { value: new THREE.Color(...nebula.colorB) },
      uDensity: { value: nebula.density },
    }),
    [nebula],
  );

  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
    }
    if (groupRef.current) {
      // distance from camera to nebula center (world space)
      const wp = groupRef.current.getWorldPosition(_scratch);
      const d = camera.position.distanceTo(wp);
      const rel = d / Math.max(nebula.radius, 1);
      const next: typeof lod =
        rel > 40 ? "imposter" : rel > 6 ? "billboard" : "volume";
      if (next !== lod) setLod(next);
    }
  });

  if (lod === "imposter") {
    // Too far to matter: don't render at all; the galaxy point cloud already
    // covers the volume. Keeps draw calls low across dozens of galaxies.
    return <group ref={groupRef} />;
  }

  if (lod === "billboard") {
    return (
      <group ref={groupRef}>
        <sprite scale={[nebula.radius * 2.2, nebula.radius * 2.2, 1]}>
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={billboardUniforms}
            vertexShader={`
              varying vec2 vUv;
              void main(){
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              uniform vec3 uColA;
              uniform vec3 uColB;
              uniform float uDensity;
              void main(){
                vec2 p = vUv - 0.5;
                float r = length(p) * 2.0;
                if(r > 1.0) discard;
                float core = pow(1.0 - r, 3.0);
                float halo = pow(1.0 - r, 1.3) * 0.4;
                vec3 col = mix(uColA, uColB, core);
                gl_FragColor = vec4(col, (core + halo) * uDensity * 0.55);
              }
            `}
          />
        </sprite>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <mesh frustumCulled={false}>
        {/* BackSide shell so the volume still renders when the camera is inside */}
        <icosahedronGeometry args={[nebula.radius, 3]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={nebulaVert}
          fragmentShader={nebulaFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

const _scratch = new THREE.Vector3();