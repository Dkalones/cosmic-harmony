import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDebug } from "@/state/useDebug";

interface StarProps {
  color: [number, number, number];
  radius: number;
  seed: number;
}

const vert = /* glsl */ `
  varying vec3 vNormal; varying vec3 vPos;
  void main(){
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPos = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const frag = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; uniform float uIntensity;
  varying vec3 vNormal; varying vec3 vPos;
  float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
  void main(){
    float n = hash(floor(vPos*3.0 + uTime*0.4));
    vec3 c = uColor * (1.4 + n*0.4) * uIntensity;
    vec3 V = normalize(cameraPosition - vPos);
    float f = pow(1.0 - max(dot(normalize(vNormal), V), 0.0), 2.0);
    c += uColor * f * uIntensity;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Simple procedural star: emissive body + rim glow. */
export function Star({ color, radius }: StarProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const intensity = useDebug((s) => s.starIntensity);
  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uColor: { value: new THREE.Color(color[0], color[1], color[2]) },
    uTime: { value: 0 },
    uIntensity: { value: intensity },
  }), [color, intensity]);
  useFrame((_, dt) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime.value as number) += dt;
      (matRef.current.uniforms.uIntensity.value as number) = intensity;
    }
  });
  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[radius, 3]} />
        <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
      </mesh>
      <pointLight color={new THREE.Color(color[0], color[1], color[2])}
        intensity={4 * intensity} distance={radius * 400} decay={1.5} />
    </group>
  );
}