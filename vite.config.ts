// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * R3F intrinsics (<mesh>, <group>, <shaderMaterial>, ...) forward every JSX
 * prop to the underlying THREE object. The tanstack devtools "Go to Source"
 * transform adds `data-tsd-source` to every JSX element, which R3F's
 * applyProps then tries to write onto the THREE instance and throws
 * ("Cannot set \"data-tsd-source\"..."), killing the Canvas with a white
 * screen. Run AFTER the injector and strip the attribute from every module
 * in the three tree.
 */
function stripTsdSourceInThreeTree(): Plugin {
  return {
    name: "lovable:strip-tsd-source-in-three",
    enforce: "post",
    transform(code, id) {
      if (!id.includes("/src/three/")) return null;
      if (!code.includes("data-tsd-source")) return null;
      return {
        code: code.replace(/\s*"data-tsd-source":\s*"[^"]*",?/g, ""),
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [stripTsdSourceInThreeTree()],
});
