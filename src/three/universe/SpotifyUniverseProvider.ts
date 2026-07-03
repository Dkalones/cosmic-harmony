import type { UniverseData } from "./types";
import type { UniverseProvider } from "./UniverseProvider";
import { MockUniverseProvider } from "./MockUniverseProvider";

/**
 * Placeholder. When Spotify OAuth is wired up, this provider will fetch
 * top artists, tracks, playlists, and translate them into UniverseData
 * using the same hierarchical seed scheme.
 * For now it falls back to the mock provider so the switch is functional.
 */
export class SpotifyUniverseProvider implements UniverseProvider {
  readonly source = "spotify" as const;
  private fallback = new MockUniverseProvider();
  build(seed: number): UniverseData {
    // TODO: replace with real Spotify-derived data.
    return this.fallback.build(seed);
  }
}