import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BodyAttrs } from "@/lib/spotify/mapping";

// Procedural planet: fBM displacement (vertex) + biome color + atmosphere fresnel
const planetVert = /* glsl */ `
  uniform float uTime;
  uniform float uDisplacement;
  uniform float uSeed;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vWNormal;
  varying float vElevation;

  // hash & noise
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
    for(int i=0;i<5;i++){ v += a*snoise(p); p*=2.03; a*=0.5; }
    return v;
  }

  void main(){
    vec3 p = position + vec3(uSeed*0.017);
    float e = fbm(p*1.6);
    vElevation = e;
    vec3 displaced = position + normal * e * uDisplacement;
    vPos = displaced;
    vNormal = normalize(normalMatrix * normal);
    vWNormal = normalize(mat3(modelMatrix) * normal);
    vWorld = (modelMatrix * vec4(displaced, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced,1.0);
  }
`;

const planetFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColLow;
  uniform vec3 uColMid;
  uniform vec3 uColHigh;
  uniform vec3 uColOcean;
  uniform vec3 uColAtmo;
  uniform float uOcean;
  uniform float uClouds;
  uniform float uAtmo;
  uniform float uTime;
  uniform float uAurora;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vWNormal;
  varying float vElevation;

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
    for(int i=0;i<4;i++){ v += a*snoise(p); p*=2.1; a*=0.5; }
    return v;
  }

  void main(){
    // sea level cutoff
    float sea = mix(-0.1, 0.15, uOcean);
    float land = smoothstep(sea - 0.02, sea + 0.02, vElevation);

    // land tone by elevation
    float t = clamp((vElevation - sea) / 0.6, 0.0, 1.0);
    vec3 land1 = mix(uColLow, uColMid, smoothstep(0.0, 0.5, t));
    vec3 landCol = mix(land1, uColHigh, smoothstep(0.5, 1.0, t));

    // ocean tone with subtle depth
    float depth = clamp((sea - vElevation) * 3.0, 0.0, 1.0);
    vec3 oceanCol = mix(uColOcean*1.3, uColOcean*0.5, depth);

    vec3 base = mix(oceanCol, landCol, land);

    // clouds
    float c = fbm(vPos*2.4 + vec3(uTime*0.03));
    float clouds = smoothstep(0.15, 0.5, c) * uClouds;
    base = mix(base, vec3(1.0), clouds * 0.7);

    // lighting (fake sun, world space)
    vec3 N = normalize(vWNormal);
    vec3 L = normalize(vec3(0.6, 0.5, 0.8));
    float ndl = max(dot(N, L), 0.0);
    vec3 lit = base * (0.05 + ndl * 0.85);

   // atmosphere rim — world-space normal vs world-space view vector
vec3 V = normalize(cameraPosition - vWorld);
float fres = pow(1.0 - max(dot(N, V), 0.0), 3.5);
lit += uColAtmo * fres * uAtmo * 0.7;

// aurora at poles when enabled
if(uAurora > 0.5){
  float polar = pow(abs(normalize(vPos).y), 6.0);
  float wav = 0.5 + 0.5*sin(uTime*0.6 + vPos.x*4.0);
  lit += vec3(0.2, 0.9, 0.6) * polar * wav * 0.35;
}

gl_FragColor = vec4(lit, 1.0);
  }
`;

// Star shader: bright emissive with pulsing surface noise
const starFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorld;
  varying vec3 vWNormal;
  varying float vElevation;
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
  void main(){
    float n = snoise(vPos*3.0 + vec3(uTime*0.15));
    n += 0.5*snoise(vPos*6.0 - vec3(uTime*0.25));
    vec3 col = uColor * (0.55 + n*0.25);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(normalize(vWNormal), V), 0.0), 2.0);
    col += uColor * fres * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface PlanetProps {
  body: BodyAttrs;
}

export function Planet({ body }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => {
    if (body.isStar) {
      const col = body.palette.atmosphere;
      const u: Record<string, THREE.IUniform> = {
        uTime: { value: 0 },
        uSeed: { value: body.seed % 1000 },
        uDisplacement: { value: 0 },
        uColor: { value: new THREE.Color(col[0], col[1], col[2]).multiplyScalar(1.4) },
      };
      return u;
    }
    const u: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uSeed: { value: body.seed % 1000 },
      uDisplacement: { value: 0.08 + body.level * 0.015 },
      uColLow: { value: new THREE.Color(...body.palette.low) },
      uColMid: { value: new THREE.Color(...body.palette.mid) },
      uColHigh: { value: new THREE.Color(...body.palette.high) },
      uColOcean: { value: new THREE.Color(...body.palette.ocean) },
      uColAtmo: { value: new THREE.Color(...body.palette.atmosphere) },
      uOcean: { value: body.oceanCoverage },
      uClouds: { value: body.cloudDensity },
      uAtmo: { value: body.atmosphereDensity },
      uAurora: { value: body.aurora ? 1 : 0 },
    };
    return u;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body.seed, body.isStar]);

  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * (body.isStar ? 0.05 : 0.03);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[body.radius, body.isStar ? 4 : 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={planetVert}
          fragmentShader={body.isStar ? starFrag : planetFrag}
          uniforms={uniforms}
        />
      </mesh>
      {/* Atmosphere halo shell */}
      {!body.isStar && body.atmosphereDensity > 0.1 && (
        <mesh scale={1.08}>
          <icosahedronGeometry args={[body.radius, 32]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            uniforms={{
              uColor: { value: new THREE.Color(...body.palette.atmosphere) },
              uDensity: { value: body.atmosphereDensity },
            }}
            vertexShader={/* glsl */ `
              varying vec3 vNormal; varying vec3 vPos;
              void main(){
                vNormal = normalize(mat3(modelMatrix) * normal);
                vPos = (modelMatrix * vec4(position,1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }
            `}
            fragmentShader={/* glsl */ `
              uniform vec3 uColor; uniform float uDensity;
              varying vec3 vNormal; varying vec3 vPos;
              void main(){
                vec3 N = normalize(vNormal);
                if(!gl_FrontFacing) N = -N;
                vec3 V = normalize(cameraPosition - vPos);
                float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
                gl_FragColor = vec4(uColor, f * uDensity * 0.35);
              }
            `}
          />
        </mesh>
      )}
      {/* Star corona */}
      {body.isStar && (
        <mesh scale={1.6}>
          <icosahedronGeometry args={[body.radius, 16]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            side={THREE.BackSide}
            uniforms={{
              uColor: { value: new THREE.Color(...body.palette.atmosphere) },
            }}
            vertexShader={/* glsl */ `
              varying vec3 vNormal; varying vec3 vPos;
              void main(){
                vNormal = normalize(mat3(modelMatrix) * normal);
                vPos = (modelMatrix * vec4(position,1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }
            `}
            fragmentShader={/* glsl */ `
              uniform vec3 uColor;
              varying vec3 vNormal; varying vec3 vPos;
              void main(){
                vec3 N = normalize(vNormal);
                if(!gl_FrontFacing) N = -N;
                vec3 V = normalize(cameraPosition - vPos);
                float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
                gl_FragColor = vec4(uColor*0.9, f*0.35);
              }
            `}
          />
        </mesh>
      )}
    </group>
  );
}
