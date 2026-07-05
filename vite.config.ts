// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // R3F intrinsics (<mesh>, <group>, <shaderMaterial>, ...) forward every JSX
  // prop to the underlying THREE object. The devtools "Go to Source" transform
  // adds data-tsd-source to every JSX element, which R3F's applyProps then
  // tries to write onto the THREE instance and throws. Skip injection for the
  // three.js tree so the canvas mounts cleanly.
  devtools: {
    injectSource: {
      enabled: true,
      ignore: {
        files: ["src/three/**"],
      },
    },
  },
});
