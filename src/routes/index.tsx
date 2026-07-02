import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#02030a] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(1200px 800px at 30% 20%, rgba(80,120,255,0.25), transparent 60%), radial-gradient(900px 600px at 75% 80%, rgba(255,90,180,0.18), transparent 60%), radial-gradient(600px 600px at 50% 50%, rgba(255,220,130,0.08), transparent 60%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.4em] text-white/40">
          SpotUniverse · prototype
        </div>
        <h1 className="mt-4 text-5xl font-light leading-tight md:text-6xl">
          Your music, as a{" "}
          <span className="bg-gradient-to-r from-sky-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
            living universe
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/60">
          Every listener is a planet. Playlists become rings, top tracks become
          moons, genres paint the atmosphere. Explore a system generated from
          mock listening data — real Spotify sync comes next.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/universe"
            className="rounded-full border border-white/70 bg-white/10 px-6 py-2.5 text-sm text-white backdrop-blur transition hover:bg-white/20"
          >
            Enter the universe →
          </Link>
        </div>
      </div>
    </div>
  );
}
