import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCamera } from "@/state/useCamera";
import { useDebug } from "@/state/useDebug";
import { useUniverseStore } from "@/state/useUniverseStore";
import { vec3Dist, type Vec3 } from "@/three/universe/hierarchy";

/**
 * Free-flight camera controller.
 * - Camera is kept at three.js origin (0,0,0); the world moves around it
 *   (camera-relative rendering). `useCamera.absPos` is the *logical* position
 *   in universe coordinates.
 * - Pointer-lock mouse look, WASD + space/ctrl movement.
 * - Auto-speed scales with the distance to the nearest known object.
 * - Modes: free (fixed base speed), cruise (auto-speed), warp (10x).
 */
export function CameraRig() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const locked = useRef(false);

  useEffect(() => {
    camera.position.set(0, 0, 0);
    const el = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "KeyM") {
        const s = useCamera.getState();
        const next: Record<string, "free" | "cruise" | "warp"> = {
          free: "cruise", cruise: "warp", warp: "free",
        };
        s.setMode(next[s.mode]);
      }
      if (e.code === "Backquote") {
        useDebug.setState({ panelOpen: !useDebug.getState().panelOpen });
      }
      if (e.code === "Escape" && document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onClick = () => {
      if (!locked.current) el.requestPointerLock();
    };
    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return;
      const s = useCamera.getState();
      const sens = 0.0025;
      const yaw = s.yaw - e.movementX * sens;
      const pitch = Math.max(-Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, s.pitch - e.movementY * sens));
      s.setYawPitch(yaw, pitch);
      // any user look cancels autopilot
      if (s.autopilot) s.setAutopilot(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    el.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    const state = useCamera.getState();
    const { yaw, pitch, mode, absPos, autopilot } = state;

    // Orientation
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    camera.quaternion.copy(q);

    // Auto-speed: distance to nearest system, clamped
    const universe = useUniverseStore.getState().universe;
    let nearest = Infinity;
    if (universe) {
      for (const g of universe.galaxies) {
        const dg = vec3Dist(absPos, g.center);
        if (dg < nearest) nearest = Math.max(1, dg - g.radius);
        // if we're inside/near the galaxy, also check systems
        if (dg < g.radius * 3) {
          for (const s of g.systems) {
            const ds = vec3Dist(absPos, s.center);
            if (ds < nearest) nearest = Math.max(1, ds);
          }
        }
      }
    }
    // base speed grows with distance so far travel is bearable
    const baseCruise = Math.min(nearest * 0.6, 500_000);
    const baseFree = Math.min(50 + nearest * 0.02, 5_000);
    const modeSpeed = mode === "warp" ? baseCruise * 8 :
                       mode === "cruise" ? baseCruise :
                       baseFree;
    const boost = keys.current["ShiftLeft"] || keys.current["ShiftRight"] ? 3 : 1;
    const speed = modeSpeed * boost;

    // Movement vectors from orientation
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0);

    let dx = 0, dy = 0, dz = 0;
    const step = speed * dt;
    if (keys.current["KeyW"]) { dx += fwd.x * step; dy += fwd.y * step; dz += fwd.z * step; }
    if (keys.current["KeyS"]) { dx -= fwd.x * step; dy -= fwd.y * step; dz -= fwd.z * step; }
    if (keys.current["KeyD"]) { dx += right.x * step; dy += right.y * step; dz += right.z * step; }
    if (keys.current["KeyA"]) { dx -= right.x * step; dy -= right.y * step; dz -= right.z * step; }
    if (keys.current["Space"]) { dx += up.x * step; dy += up.y * step; dz += up.z * step; }
    if (keys.current["ControlLeft"]) { dx -= up.x * step; dy -= up.y * step; dz -= up.z * step; }

    let newAbs: Vec3 = [absPos[0] + dx, absPos[1] + dy, absPos[2] + dz];
    let effectiveSpeed = Math.hypot(dx, dy, dz) / Math.max(dt, 1e-4);

    // Autopilot: interpolate toward target and orient camera
    if (autopilot) {
      const to = autopilot;
      const dist = vec3Dist(absPos, to);
      const arriveAt = 8; // stop this far away from the target
      if (dist < arriveAt) {
        state.setAutopilot(null);
      } else {
        // ease: move a fraction of remaining distance per second, capped
        const rate = Math.min(1, dt * 1.2);
        const step2 = Math.min(dist - arriveAt, dist * rate);
        const dir: Vec3 = [
          (to[0] - absPos[0]) / dist,
          (to[1] - absPos[1]) / dist,
          (to[2] - absPos[2]) / dist,
        ];
        newAbs = [
          absPos[0] + dir[0] * step2,
          absPos[1] + dir[1] * step2,
          absPos[2] + dir[2] * step2,
        ];
        effectiveSpeed = step2 / Math.max(dt, 1e-4);
        // orient toward target smoothly
        const targetYaw = Math.atan2(-dir[0], -dir[2]);
        const targetPitch = Math.asin(Math.max(-1, Math.min(1, dir[1])));
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const t = Math.min(1, dt * 3);
        state.setYawPitch(lerp(yaw, targetYaw, t), lerp(pitch, targetPitch, t));
      }
    }

    state.setAbsPos(newAbs);
    state.setSpeed(effectiveSpeed);
  });

  return null;
}