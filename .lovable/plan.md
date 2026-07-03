
# SpotUniverse — Universo Procedural Contínuo (expansão)

Objetivo: transformar o MVP atual (uma cena "SystemView" com um planeta) em um **universo contínuo** com coordenadas absolutas, LOD hierárquico, streaming por octree e navegação sem cortes. Sem remover nada do que existe.

## Princípios de arquitetura

- **Uma única cena, coordenadas absolutas em `Float64` lógicas.** Three.js usa `Float32`, então mantemos coordenadas absolutas em JS (`Vector3` de doubles em um wrapper) e renderizamos com **camera-relative rendering**: a cada frame subtraímos a posição da câmera antes de enviar para a GPU. Isso resolve jitter a distâncias planetárias/galácticas.
- **Escalas logarítmicas por camada** (universo→galáxia→sistema→planeta→superfície). O `CameraRig` decide qual "shell" está ativo e ajusta `near/far` dinamicamente, mas nunca troca de cena.
- **Geração 100% procedural determinística por seed hierárquico.** `seed(universe) → seed(galaxy_i) → seed(system_j) → seed(planet_k) → seed(chunk_l)`. Nada persistido; tudo recalculável.
- **Abstração de dados**: `UniverseProvider` interface. `MockUniverseProvider` (procedural + mock users atuais) hoje, `SpotifyUniverseProvider` depois.
- **Streaming**: Octree espacial + chunk pool + workers. Só as regiões próximas são materializadas em objetos R3F; o resto vive como dados numéricos ou pontos instanciados.

## Estrutura de pastas (adições, nada removido)

```text
src/
  three/
    core/
      Engine.tsx                 (mantido — vai receber CameraRig novo)
      CameraRig.tsx              (novo — modos Free/Cruise/Warp + auto-speed)
      SceneRoot.tsx              (novo — origem flutuante / camera-relative)
      LODManager.ts              (novo — decide nível por distância)
      Streamer.tsx               (novo — pilota octree + pool)
      Octree.ts                  (novo — nós, query por frustum+raio)
      ObjectPool.ts              (novo)
      FrustumCuller.ts           (novo)
    universe/
      types.ts                   (Body, Galaxy, System, Star, Planet, Moon, Nebula, BlackHole)
      UniverseProvider.ts        (interface)
      MockUniverseProvider.ts    (procedural + integra MOCK_USERS existentes)
      SpotifyUniverseProvider.ts (stub)
      hierarchy.ts               (seed hierárquico, coords absolutas)
    procedural/
      seed.ts                    (mantido, expandido: split/branch)
      biomes.ts                  (mantido)
      galaxyGen.ts               (novo — espiral/barrada/elíptica/irregular)
      systemGen.ts               (novo)
      planetGen.ts               (novo — usa Planet.tsx atual)
      nebulaGen.ts               (novo)
      blackHoleGen.ts            (novo)
      asteroidBelt.ts            (novo)
    entities/
      Planet.tsx                 (mantido)
      Ring.tsx                   (mantido)
      Moon.tsx                   (mantido)
      Star.tsx                   (novo — extraído do Planet.isStar)
      Galaxy.tsx                 (novo — InstancedMesh de estrelas + shader núcleo)
      Nebula.tsx                 (novo — volumétrico simples)
      BlackHole.tsx              (novo — lente + disco)
      AsteroidBelt.tsx           (novo — instanced)
      DistantPoint.tsx           (novo — imposter de 1 vertex)
    shaders/
      galaxyPoints.glsl.ts
      nebula.glsl.ts
      blackhole.glsl.ts
      atmosphere.glsl.ts
    scenes/
      SystemView.tsx             (mantido — vira "vista inicial" mas dentro do universo)
      UniverseScene.tsx          (novo — orquestra tudo)
    workers/
      galaxyPoints.worker.ts     (novo — gera buffers instanced offline)
      planetMesh.worker.ts       (novo — mesh LOD alto)
  state/
    useSelection.ts              (mantido)
    useCamera.ts                 (novo — posição absoluta + modo de voo)
    useStreaming.ts              (novo — chunks ativos, stats)
    useDebug.ts                  (novo — toda customização vive aqui)
  components/
    hud/
      UniverseHud.tsx            (mantido)
      DebugPanel/                (novo — abas Performance / Visualização / Customização)
        index.tsx
        PerformanceTab.tsx
        VisualizationTab.tsx
        CustomizationTab.tsx
```

## Camadas hierárquicas & LOD

| Camada | Escala típica | LOD |
|---|---|---|
| Universo | 10^6+ unidades | pontos instanciados por galáxia |
| Galáxia | 10^4 | InstancedMesh de estrelas + shader de núcleo/braços |
| Sistema | 10^2 | Estrela real + planetas como esferas simples |
| Planeta | 1–10 | shader atual (fBM), 4 LODs de subdivisão |
| Superfície | <1 | patches com displacement alto (fase futura) |

`LODManager` recebe `cameraAbsPos` e para cada entidade retorna `imposter | low | mid | high`.

## Streaming

- **Octree global** dividido por potências de escala (uma octree por camada). Query por frustum + raio de preload.
- **ObjectPool** por tipo (Planet, Star, Galaxy, Nebula) para evitar realocação.
- **Workers** geram meshes/buffers pesados fora da main thread; resultado transferível.
- **Sem tela de loading**: quando um chunk ainda não chegou, mostramos imposter (ponto luminoso) que "explode" no objeto real quando pronto.

## Navegação (CameraRig)

- Modos `free`, `cruise`, `warp`. Velocidade cresce log-linearmente com a distância ao objeto mais próximo (`v = clamp(distToNearest * k, vmin, vmax)`), reduz suavemente ao aproximar.
- Sem teleporte. Botão "jump to system" existente (HUD atual) vira **auto-pilot animado** que interpola a câmera absoluta.

## Painel Debug (única UI de customização)

Aba única `Debug` com 3 sub-abas:
- **Performance**: FPS, drawCalls, tris, chunks ativos, coords universais, seeds atuais, LOD.
- **Visualização**: toggles para chunks/octree/frustum/BBox/órbitas/eixos/posições.
- **Customização**: sliders zustand-driven que atualizam uniforms/params em tempo real — universo, galáxias, sistemas, planetas, estrelas, nebulosas, buracos negros. Também o **seletor Mock/Spotify**.

Tudo persiste em `useDebug` (zustand + localStorage).

## Integração com o que já existe

- `MOCK_USERS` continua sendo a fonte dos "planetas de usuários"; `MockUniverseProvider` os injeta como sistemas reais dentro da galáxia inicial.
- `SystemView.tsx` continua funcionando como componente reutilizável — o `UniverseScene` o instancia para o sistema em que a câmera está.
- Rota `/universe` mantida; ganha o `DebugPanel` opcional (tecla `~`).
- `mapping.ts`, `Planet.tsx`, `Ring.tsx`, `Moon.tsx`, `biomes.ts`, `seed.ts` — todos preservados.

## Roadmap de entrega (incremental, sempre buildável)

**Fase 1 — Fundação contínua** (esta entrega)
1. `hierarchy.ts` + coords absolutas + `SceneRoot` camera-relative.
2. `UniverseProvider` + `MockUniverseProvider` procedural (gera 1 universo → N galáxias → M sistemas → planetas, incluindo os `MOCK_USERS`).
3. `UniverseScene` substituindo o interior do Canvas; `SystemView` continua sendo usado dentro dela.
4. `CameraRig` com modos Free/Cruise/Warp + auto-speed.
5. `Galaxy.tsx` (InstancedMesh espiral) + `Star.tsx` + `DistantPoint.tsx`.
6. `DebugPanel` (Performance + Customização básica + toggle Mock/Spotify).
7. `LODManager` simples (imposter/real) e `Octree` mínima.

**Fase 2 — Streaming & fidelidade**
- Workers, ObjectPool completo, Frustum/Occlusion culling, BVH em planetas.
- Nebulosas volumétricas, buracos negros com lente, cinturões de asteroides.
- LOD de galáxia (núcleo→braços→estrelas individuais).

**Fase 3 — Superfície & polish**
- Patches de terreno com displacement alto, mobile tuning, cache procedural em IndexedDB.

## Riscos / decisões técnicas

- **Float32 jitter**: mitigado por camera-relative rendering (obrigatório).
- **Lente gravitacional** (buraco negro) custa caro no mobile → shader com fallback low-quality no `useDebug.qualityTier`.
- **Occlusion culling real** no Three.js é limitado; começamos com frustum + distance culling e adicionamos hi-Z depois se necessário.
- Sem persistência nesta fase (nada em Supabase); tudo é regenerável por seed. Spotify Cloud fica para depois, como planejado.

Confirma para eu começar pela **Fase 1**?
