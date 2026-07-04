import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
    }
  });

  return (
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
  );
}