import { Canvas } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { ReactNode } from "react";

export function Engine({ children }: { children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ position: [0, 1.2, 6], fov: 55, near: 0.01, far: 5000 }}
      style={{ background: "#02030a" }}
    >
      <color attach="background" args={["#02030a"]} />
      <fog attach="fog" args={["#02030a", 40, 200]} />
      <Stars
        radius={300}
        depth={80}
        count={12000}
        factor={4}
        saturation={0}
        fade
        speed={0.4}
      />
      {children}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={40}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}