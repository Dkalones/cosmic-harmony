export type MockGenre =
  | "rock"
  | "pop"
  | "electronic"
  | "hiphop"
  | "jazz"
  | "classical"
  | "metal"
  | "indie"
  | "reggae"
  | "folk";

export interface MockUser {
  id: string;
  handle: string;
  displayName: string;
  minutesListened: number;
  playlistsCount: number;
  topArtist: string;
  genres: { name: MockGenre; weight: number }[];
  topTracks: { name: string; popularity: number }[];
  accountAgeDays: number;
  prestige: number;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "u_nova",
    handle: "nova",
    displayName: "Nova",
    minutesListened: 184_320,
    playlistsCount: 7,
    topArtist: "Tame Impala",
    genres: [
      { name: "indie", weight: 0.5 },
      { name: "electronic", weight: 0.3 },
      { name: "rock", weight: 0.2 },
    ],
    topTracks: [
      { name: "Let It Happen", popularity: 92 },
      { name: "The Less I Know", popularity: 95 },
      { name: "Borderline", popularity: 78 },
      { name: "Elephant", popularity: 84 },
    ],
    accountAgeDays: 1420,
    prestige: 0,
  },
  {
    id: "u_orion",
    handle: "orion",
    displayName: "Orion",
    minutesListened: 42_100,
    playlistsCount: 3,
    topArtist: "Miles Davis",
    genres: [
      { name: "jazz", weight: 0.7 },
      { name: "classical", weight: 0.3 },
    ],
    topTracks: [
      { name: "So What", popularity: 88 },
      { name: "Blue in Green", popularity: 74 },
    ],
    accountAgeDays: 320,
    prestige: 0,
  },
  {
    id: "u_vega",
    handle: "vega",
    displayName: "Vega",
    minutesListened: 612_800,
    playlistsCount: 14,
    topArtist: "Aphex Twin",
    genres: [
      { name: "electronic", weight: 0.6 },
      { name: "metal", weight: 0.2 },
      { name: "indie", weight: 0.2 },
    ],
    topTracks: [
      { name: "Windowlicker", popularity: 90 },
      { name: "Xtal", popularity: 82 },
      { name: "Avril 14th", popularity: 88 },
      { name: "Rhubarb", popularity: 76 },
      { name: "Flim", popularity: 71 },
      { name: "Girl/Boy Song", popularity: 68 },
    ],
    accountAgeDays: 3200,
    prestige: 1,
  },
  {
    id: "u_lyra",
    handle: "lyra",
    displayName: "Lyra",
    minutesListened: 88_400,
    playlistsCount: 5,
    topArtist: "Bad Bunny",
    genres: [
      { name: "hiphop", weight: 0.55 },
      { name: "pop", weight: 0.3 },
      { name: "reggae", weight: 0.15 },
    ],
    topTracks: [
      { name: "Titi Me Preguntó", popularity: 96 },
      { name: "Me Porto Bonito", popularity: 94 },
      { name: "Ojitos Lindos", popularity: 90 },
    ],
    accountAgeDays: 640,
    prestige: 0,
  },
];