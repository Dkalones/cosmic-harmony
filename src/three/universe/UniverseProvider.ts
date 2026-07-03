import type { UniverseData } from "./types";

/**
 * Abstraction over the source of universe data.
 * Implementations: MockUniverseProvider, SpotifyUniverseProvider (future).
 */
export interface UniverseProvider {
  readonly source: "mock" | "spotify";
  build(seed: number): UniverseData;
}