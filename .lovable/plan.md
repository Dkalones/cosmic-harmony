
# SpotUniverse — Arquitetura & Plano de Desenvolvimento

## 0. Nota sobre a stack

Você pediu **Next.js**, mas este projeto Lovable roda em **TanStack Start (React 19 + Vite 7)** com **Lovable Cloud (Supabase gerenciado)** já integrado. Proponho manter TanStack Start — o modelo mental é o mesmo (SSR, file-based routing, server functions no lugar de Route Handlers) e evita reescrever o template. Se você preferir Next.js puro, precisamos migrar o projeto fora do Lovable. **Confirme antes de eu começar a codar.**

Restante do plano assume: TanStack Start + R3F + Supabase (Lovable Cloud) + Spotify OAuth.

---

## 1. Stack técnica

**Render 3D**
- `three` + `@react-three/fiber` + `@react-three/drei`
- `@react-three/postprocessing` (Bloom, Vignette, Tone Mapping ACES)
- `leva` (debug dev-only)
- GLSL custom shaders (atmosfera, superfície de planeta, nebulosa, buraco negro)
- `three-mesh-bvh` para picking eficiente
- `simplex-noise` / `fast-simplex-noise` para terreno procedural
- `alea` para PRNG seed-based determinístico

**App / SSR**
- TanStack Start (rotas, loaders, `createServerFn`)
- TanStack Query (cache, invalidations)
- Zustand (estado da câmera / seleção / HUD — fora do React tree pesado)
- Tailwind v4 + shadcn (HUD mínimo)

**Backend**
- Lovable Cloud (Postgres + Auth + Storage + Edge)
- Spotify OAuth via `supabase.auth.signInWithOAuth('spotify')` (habilitar provider) + token refresh
- Server functions TanStack para sync Spotify → Postgres
- pg_cron para refresh incremental de "top artists / tracks / recent plays"

**Perf**
- InstancedMesh para pontos-de-luz (estrelas distantes)
- BVH + Frustum + Occlusion culling
- LOD por distância (4 níveis)
- Web Workers (`comlink`) para geração de meshes procedurais
- OffscreenCanvas quando disponível
- Texturas KTX2/Basis para skins pagas

---

## 2. Estrutura de pastas

```text
src/
  routes/
    __root.tsx
    index.tsx                 # landing (galáxia em cinemática)
    universe.tsx              # experiência 3D principal (ssr:false)
    _authenticated/
      route.tsx               # gate
      me.tsx                  # meu sistema (deep-link)
      settings.tsx
    auth.tsx
    u.$handle.tsx             # perfil público -> deep-link no universo
    api/public/
      webhooks.spotify.ts     # opcional
  three/
    core/
      Engine.tsx              # <Canvas> raiz, postFX, camera rig
      CameraRig.ts            # cinematic zoom (universe→galaxy→system→planet)
      LODManager.ts           # switching por distância + hysteresis
      Streamer.ts             # carrega/descarrega chunks
      Chunk.ts                # espaço particionado em octree
    scenes/
      DeepSpace.tsx           # skybox procedural + starfield instanced
      GalaxyView.tsx
      SystemView.tsx
      PlanetView.tsx
    entities/
      Star.tsx
      Planet.tsx
      Ring.tsx
      Moon.tsx
      BlackHole.tsx
      Nebula.tsx
    shaders/
      atmosphere.vert/frag
      planetSurface.vert/frag
      nebula.vert/frag
      blackhole.vert/frag
      starfield.vert/frag
    procedural/
      seed.ts                 # alea PRNG
      planetGen.ts            # heightmap + biome mapping
      biomes.ts               # gênero -> paleta/atmosfera
      systemLayout.ts         # órbitas a partir de playlists/músicas
      galaxyLayout.ts         # posição do user na galáxia do artista
    workers/
      planetMesh.worker.ts
      galaxyPoints.worker.ts
  lib/
    spotify/
      sync.functions.ts       # createServerFn
      mapping.ts              # dados Spotify -> atributos visuais
    universe/
      coordinates.ts          # galaxy-id/system-id -> vec3 determinístico
      lod.ts
  components/hud/             # overlays 2D mínimos
  integrations/supabase/...   # gerado
  state/
    useCamera.ts
    useSelection.ts
    useStreaming.ts
```

---

## 3. Modelo de dados (Postgres)

Nada de geometria no banco — só atributos.

```text
profiles(id uuid PK -> auth.users, handle unique, display_name,
         spotify_id, avatar_url, created_at)

user_stats(user_id PK, minutes_listened bigint, playlists_count int,
           favorite_tracks_count int, diversity_score numeric,
           top_artist_id text, last_synced timestamptz)

user_bodies(user_id PK, body_type enum('planet','star'),
            seed bigint, level int, prestige int,
            atmosphere jsonb, ocean_coverage numeric,
            cloud_density numeric, aurora bool,
            ring_count int, moon_count int,
            biome_ids int[], evolution_stage smallint,
            is_black_hole bool default false, updated_at)

genres(id serial PK, name text unique, hue numeric, palette jsonb)
user_genres(user_id, genre_id, weight numeric, PRIMARY KEY(user_id,genre_id))

artists(id text PK /* spotify id */, name, image_url,
        fandom_size int, galaxy_seed bigint, galaxy_radius numeric)

user_galaxy(user_id PK, artist_id -> artists, orbit_radius numeric,
            orbit_angle numeric)   -- posição dentro da galáxia

playlists(id text PK, user_id, name, track_count int, hue numeric)
tracks_top(user_id, rank smallint, track_id text, name, artist_id,
           PRIMARY KEY(user_id, rank))  -- top 20 = luas candidatas

spotify_tokens(user_id PK, access_token, refresh_token, expires_at)
  -- RLS: só o próprio user; nunca exposta ao client

sync_jobs(id, user_id, kind, status, started_at, finished_at, error)
cosmetics(id, kind, name, price_cents, asset_url)
user_cosmetics(user_id, cosmetic_id, equipped bool)
prestige_events(user_id, prestige_level, occurred_at, snapshot jsonb)
```

Regras:
- RLS em tudo. `profiles`, `user_bodies`, `user_stats` legíveis por `anon` (perfis são públicos por design). `spotify_tokens` e `sync_jobs` só o dono.
- GRANT explícito por tabela (padrão do template).
- Coordenadas do universo NÃO ficam no banco — derivadas de `hash(user_id) → vec3` (determinístico).

---

## 4. Mapeamento dados → visual

| Dado | Atributo visual |
|---|---|
| Horas escutadas | `planet.radius = f(log(minutes))`, `level` |
| Playlists | `rings[]`: n=`playlists_count`, cor=hue média |
| Top tracks | `moons[]`: até 8, tamanho = popularity |
| Gêneros | `biomes[]`, paleta, atmosfera Rayleigh |
| Diversidade | nº de biomas distintos no planeta |
| Artista top | galáxia (posição no universo) |
| Tempo de conta | estágio de evolução (0..6) |
| Prestige N | pós-supernova → estrela de tipo espectral N |

Toda transformação em `lib/spotify/mapping.ts`, pura, testável.

---

## 5. Renderização procedural & LOD

**Coordenadas globais**
- Universo particionado em octree (chunks 1024³ unid.).
- `systemPos = hash3(user_id) mod chunkSize + chunkOrigin` — determinístico, sem storage.
- Galáxias: `galaxyPos = hash3(artist_id)`, usuários dentro em coordenadas polares.

**LOD (4 níveis por corpo)**
1. **Impostor** — 1 vértice em InstancedMesh, sprite billboard, aditivo + bloom. Milhões visíveis.
2. **Esfera baixa** — ico-sphere 162 verts, cor sólida + halo.
3. **Esfera média** — 2 562 verts, shader atmosfera, sem terreno.
4. **Alta** — 40k verts, displacement por simplex noise no worker, normal map procedural, nuvens, oceanos, auroras.

Switching com **histerese** (evita flicker) e fade cross-dissolve via alpha shader.

**Streaming**
- `Streamer` observa a câmera, calcula chunks visíveis + anel de pré-carga.
- Fetch em batch: `getSystemsInChunks([...])` server fn → só atributos.
- Descarrega meshes fora do raio; instâncias voltam pro pool.

**Câmera cinematográfica**
- Rig com 4 "modos" (universo / galáxia / sistema / planeta).
- Zoom contínuo com easing exponencial; ajusta near/far dinamicamente pra evitar z-fighting (log-depth buffer).

**Shaders principais**
- Atmosfera: aproximação de Bruneton simplificada, Rayleigh + Mie.
- Superfície: triplanar + biome blend por altitude/latitude.
- Buraco negro: gravitational lensing via ray-marched disk + accretion.
- Nebulosa: raymarch de fBM 3D em volume box, low-res + upscale.
- Starfield: geometry shader-like via instancing, cor por temperatura (blackbody).

**Pós-processamento**
- ACES tone mapping, Bloom seletivo (emissive threshold), Vignette leve, TAA se disponível.

---

## 6. Sync Spotify

1. `signInWithOAuth('spotify', { scopes: 'user-top-read user-read-recently-played playlist-read-private' })`.
2. Trigger `on_auth_user_created` → cria `profiles` + `user_bodies` (seed = `hashtext(id)`).
3. Server fn `syncSpotify()` (autenticada): busca top artists/tracks/playlists, upserta, recalcula `user_bodies` via `mapping.ts`.
4. `pg_cron` diário chama endpoint `/api/public/cron/refresh?token=…` que enfileira `sync_jobs`.
5. Cache: nunca chamar Spotify no render path; UI lê Postgres.

---

## 7. HUD / UX

- Zero menus fixos. Apenas:
  - Crosshair contextual (nome do sistema ao mirar).
  - Painel deslizante ao "pousar" num planeta (dados musicais).
  - Barra de busca `⌘K` → viaja com cinemática até o usuário/artista.
- Compartilhamento: URL `spot.universe/u/handle` faz deep-link com câmera pré-posicionada + og:image gerada server-side (screenshot do planeta em baixa res).

---

## 8. Roadmap

### MVP (2–3 semanas)
- Auth Spotify + criação de perfil.
- Sync mínimo (top artists, top tracks, minutos estimados).
- Cena única: **um sistema por vez**, câmera orbital.
- Planeta procedural com LOD 3 e 4, anéis, luas, atmosfera básica.
- Página `/u/:handle` pública.
- Sem galáxia ainda, sem streaming.

### Beta (4–6 semanas após MVP)
- Universo com streaming + octree + InstancedMesh de estrelas.
- Galáxias por artista, navegação livre entre sistemas.
- Busca `⌘K`, deep-links, og:image.
- Evolução (level up ao sincronizar), auroras, oceanos, nuvens.
- Workers para geração de mesh.
- Perf target: 60 FPS desktop médio, 30 FPS mobile.

### 1.0
- Buraco negro + supernova + prestige.
- Nebulosas volumétricas.
- Loja de cosméticos (skins, partículas, atmosferas).
- Time-lapse de evolução (server-side render de vídeo — provavelmente via serviço externo, workerd não roda ffmpeg nativo).
- PWA + otimizações mobile agressivas (KTX2, meshopt).
- Realtime "presença": ver quem está visitando seu sistema (Supabase Realtime).

---

## 9. Riscos & decisões pendentes
- **Next.js vs TanStack Start** (ver §0).
- **Spotify em produção**: precisa aprovação do app pra sair do dev mode (25 users). Planejar cedo.
- **Vídeos automáticos (time-lapse)**: não roda em Cloudflare Workers → precisará de serviço externo (Modal, Fly, Render).
- **Mobile GPU**: buraco negro raymarched pode ser inviável — fallback shader necessário.
- **Custo Spotify API**: rate-limit por app, não por user → cache agressivo obrigatório.

---

**Próximo passo:** confirme (a) manter TanStack Start ou migrar para Next.js, e (b) se posso começar pelo MVP (auth Spotify + um sistema procedural navegável). Assim que aprovar, ativo Lovable Cloud, configuro o provider Spotify e começo pelo `Engine` + `PlanetView`.
