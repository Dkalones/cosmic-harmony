import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Engine } from "@/three/core/Engine";
import { SystemView } from "@/three/scenes/SystemView";
import { UniverseHud } from "@/components/hud/UniverseHud";
import { useSelection } from "@/state/useSelection";
import { mapUserToBody } from "@/lib/spotify/mapping";

export const Route = createFileRoute("/universe")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SpotUniverse — explore your music as a universe" },
      {
        name: "description",
        content:
          "A living 3D universe generated from your listening data. Planets, rings, moons and galaxies mapped from music.",
      },
      { property: "og:title", content: "SpotUniverse" },
      {
        property: "og:description",
        content: "Your music, rendered as a living universe.",
      },
    ],
  }),
  component: UniverseRoute,
});

function UniverseRoute() {
  const user = useSelection((s) => s.user);
  const body = useMemo(() => mapUserToBody(user), [user]);
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#02030a] text-white">
      <Engine>
        <SystemView body={body} />
      </Engine>
      <UniverseHud body={body} />
    </div>
  );
}