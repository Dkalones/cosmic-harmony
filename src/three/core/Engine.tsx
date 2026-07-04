import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { ReactNode } from "react";
import { CameraRig } from "./CameraRig";
import { useDebug } from "@/state/useDebug";

function EngineInner({ children }: { children: ReactNode }) {
  const bloom = useDebug((s) => s.bloomIntensity);
  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <ambientLight intensity={0.04} />
      <CameraRig />
      {children}
      <EffectComposer>
        <Bloom
          intensity={bloom * 0.6}
          luminanceThreshold={0.75}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export function Engine({ children }: { children: ReactNode }) {
  const exposure = useDebug((s) => s.exposure);
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: exposure,
        logarithmicDepthBuffer: true,
      }}
      camera={{ position: [0, 0, 0], fov: 60, near: 0.01, far: 5e8 }}
      style={{ background: "#02030a" }}
    >
      <EngineInner>{children}</EngineInner>
    </Canvas>
  );
}