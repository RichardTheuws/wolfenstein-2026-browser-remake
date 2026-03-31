# MASTERPLAN: Wolfenstein 3D — The Definitive Browser Remake

**Codename**: Castle Wolfenstein
**Versie**: 0.1.0
**Datum**: 2026-03-30
**Status**: Plan der Plannen — klaar voor uitvoering

---

## Visie

Het is 1943. Castle Wolfenstein. Het spel dat in 1992 de FPS uitvond — herbouwd voor de browser met alles wat 2026 te bieden heeft. Meshy 3D-modellen, Flux textures, ElevenLabs Duitse stemacteurs, Suno orchestrale metal soundtrack. De ziel van het origineel, de kwaliteit van een AAA-productie.

**Niet** een modernisering. **Niet** een reïnterpretatie. Dit is Wolfenstein 3D zoals het in jouw herinnering leeft — maar dan echt.

---

## Kernprincipes

1. **Gameplay = 1992** — Grid-based levels, hitscan weapons, no vertical look (optioneel toggle), "Mein Leben!" bij elke kill
2. **Graphics = 2026** — Three.js 3D engine, Meshy modellen, Flux textures, dynamisch licht, post-processing
3. **Audio = Cinema** — 116 Duitse voice lines, positional audio, orchestrale metal soundtrack, reverb in kasteelgangen
4. **Narrative = Episch** — 6 episodes, 17 cinematics, environmental storytelling, B.J. Blazkowicz origin story
5. **Browser = Native** — 60fps desktop, 30fps mobile, plain HTML/JS (geen build step), <50MB totaal

---

## Het Team (AI Agents)

| Agent | Verantwoordelijkheid | Document |
|-------|---------------------|----------|
| **Game Analyzer** | Originele gameplay research, enemy stats, weapon formulas | `GAMEPLAY-ANALYSIS.md` (55KB) |
| **3D Animation Director** | Three.js engine, Meshy modellen, animaties, VFX | `3D-ARCHITECTURE.md` (63KB) |
| **Asset Generator** | Flux textures, sprites, UI/HUD, kleurenpalet | `ASSET-PIPELINE.md` (130KB) |
| **Audio Director** | ElevenLabs voices, Suno muziek, Web Audio API | `AUDIO-MASTERPLAN.md` (93KB) |
| **Scenario Writer** | Verhaal, characters, cinematics, Easter eggs | `NARRATIVE-DESIGN.md` (93KB) |
| **Technical Architect** | Engine blueprint, modules, algorithms, level format | `TECHNICAL-BLUEPRINT.md` (103KB) |

**Totale planning**: ~537KB, 6 documenten, 8000+ regels gedetailleerde specificaties.

---

## Scope: Wat We Bouwen

### Vijanden (12 types)

| Type | HP | Wapen | Uniek |
|------|----|-------|-------|
| Guard (bruin) | 25 | Pistool | "Halt!", "Achtung!" |
| Officer (wit) | 50 | Pistool (snel) | "Spion!", snelste vijand |
| SS Soldier (blauw) | 100 | MP40 | "Schutzstaffel!", zwaarste regulier |
| Dog | 1 | Beet | Snel, geen geluid tot aanval |
| Mutant | 45 | Ingebouwd wapen | Frankenstein grommen |
| **Hans Grösse** | 850 | Dual chainguns | Episode 1 boss |
| **Dr. Schabbs** | 950 | Syringes | Episode 2 boss, horror |
| **Hitler (mech)** | 800 | 4 chainguns | Episode 3 boss fase 1 |
| **Hitler (mens)** | 500 | Dual chainguns | Episode 3 boss fase 2 |
| **Otto Giftmacher** | 850 | Raketwerper | Episode 4 boss |
| **Gretel Grösse** | 850 | Dual chainguns | Episode 5 boss |
| **General Fettgesicht** | 850 | Raketwerper | Episode 6 final boss |

### Wapens (4)

| Wapen | Schade | Vuursnelheid | Ammo |
|-------|--------|-------------|------|
| Mes | 1d8 per slag | Snel | Oneindig |
| Luger Pistool | Afstandsafhankelijk | Semi-auto | 1 per schot |
| MP40 | Afstandsafhankelijk | Automatisch | 1 per schot |
| Gatling Gun | Afstandsafhankelijk | Snel auto | 1 per schot |

### Episodes (6)

| # | Titel | Setting | Boss | Toon |
|---|-------|---------|------|------|
| 1 | Escape from Castle Wolfenstein | Middeleeuws kasteel/gevangenis | Hans Grösse | Survival, ontsnapping |
| 2 | Operation Eisenfaust | Geheim laboratorium | Dr. Schabbs | Horror, body horror |
| 3 | Die, Führer, Die! | Hitler's bunker | Hitler (2 fases) | Epische climax |
| 4 | A Dark Secret | Castle Wolfenstein (prequel) | Otto Giftmacher | Spionage, chemische oorlog |
| 5 | Trail of the Madman | Kasteelcomplex | Gretel Grösse | Wraak, achtervolging |
| 6 | Confrontation | Laatste Nazi bastion | Gen. Fettgesicht | Finale stand |

### Assets Totaal

| Categorie | Aantal | Tool | Geschatte kosten |
|-----------|--------|------|-----------------|
| Wall/floor/ceiling textures | 24 | Flux (fal.ai) | ~$1.50 |
| Door textures | 6 | Flux | ~$0.40 |
| UI/HUD sprites | 26 | Flux | ~$1.60 |
| Billboard sprites | 24 | Flux | ~$1.50 |
| Marketing/cinematic art | 12 | Flux | ~$0.75 |
| **3D modellen (enemies)** | 12 | Meshy v6 | ~$5-10 |
| **3D modellen (weapons)** | 4 | Meshy v6 | ~$2-4 |
| **3D modellen (props)** | 20+ | Meshy v6 | ~$5-10 |
| **Voice lines** | 116 | ElevenLabs | ~$15-25 |
| **Sound effects** | 76 | ElevenLabs SFX | ~$10-15 |
| **Muziek tracks** | 11 | Suno | ~$10-15 |
| **Totaal** | **~330 assets** | | **~$50-80** |

---

## Technische Architectuur

### Engine Stack

```
Three.js WebGL 2.0
├── Renderer (EffectComposer: bloom, CRT, vignette)
├── Level Loader (64x64 JSON grid maps, InstancedMesh walls)
├── Player Controller (Pointer Lock, WASD, mobile joystick)
├── Enemy AI (State machine: IDLE→ALERT→CHASE→ATTACK→PAIN→DEAD)
├── Weapon System (Hitscan raycasting, 4 weapons)
├── Collision (Grid-based AABB, wall sliding)
├── Audio Engine (Web Audio API, positional, reverb, crossfade)
├── HUD (HTML/CSS overlay, BJ face, health/ammo/score)
├── Cinematic System (scripted camera, narration, fades)
└── Menu System (main, episodes, difficulty, options)
```

### Projectstructuur

```
3d-shooter/
├── index.html              # Entry point
├── js/
│   ├── engine/             # renderer, level-loader, collision, input
│   ├── game/               # player, enemies, weapons, doors, pickups, state
│   ├── ui/                 # hud, menus, cinematics
│   ├── audio/              # sound-manager, music, voice-manager
│   └── main.js             # Boot sequence
├── assets/
│   ├── models/             # Meshy .glb files
│   ├── textures/           # Flux wall/floor/ceiling
│   ├── sprites/            # 2D billboards
│   ├── audio/
│   │   ├── music/          # Suno tracks (.ogg)
│   │   ├── sfx/            # Sound effects (.ogg)
│   │   └── voices/         # ElevenLabs lines (.ogg)
│   ├── levels/             # JSON level data
│   └── ui/                 # HUD assets
└── docs/                   # Planning (deze documenten)
```

### Performance Targets

| Metric | Target |
|--------|--------|
| FPS (desktop) | 60fps |
| FPS (mobile) | 30fps |
| Draw calls | <100 per frame |
| Triangles | <250K per frame |
| Total asset size | <50MB |
| First paint | <3 seconden |
| Audio latency | <50ms |

---

## Implementatie Roadmap

### Fase 1: Core Engine (Week 1-2)
> Doel: Een speler loopt door een 3D kasteel

- Three.js renderer met post-processing pipeline
- Level loader (JSON → 3D geometry)
- Player controller (WASD, muis, Pointer Lock)
- Grid-based collision met wall sliding
- Eerste level ontwerp (Episode 1, Floor 1)
- Placeholder textures (grijs, blauw)

**Verificatie**: Speler kan door een kasteel lopen, tegen muren botsen, deuren openen.

### Fase 2: Combat System (Week 3-4)
> Doel: Schieten op vijanden die terugschieten

- Weapon system (4 wapens, hitscan)
- Enemy AI state machine (idle → alert → chase → attack → dead)
- Hit detection en damage system
- Health, ammo, score tracking
- Pickup system (health, ammo, keys, treasure)
- Dood-animaties en ragdoll
- Eerste vijand: Guard (placeholder model)

**Verificatie**: Volledig speelbare combat loop met guards.

### Fase 3: Game Loop (Week 5-6)
> Doel: Complete speelervaring van start tot finish

- Menu systeem (main, episode select, difficulty)
- Level progressie (6 episodes × 10 floors)
- End-of-level statistics (kills%, secrets%, treasure%, time)
- Lives systeem
- Save/load (localStorage)
- Difficulty settings (4 niveaus)
- Secret walls (push walls)
- Locked doors (gold/silver keys)

**Verificatie**: Speel Episode 1 van begin tot eind met scoring.

### Fase 4: Asset Generatie (Week 7-9)
> Doel: Placeholder → cinema-quality visuals

**Wave 1 — Textures (Flux)**:
- 24 wall/floor/ceiling textures
- 6 door textures
- 26 UI/HUD assets
- 24 billboard sprites

**Wave 2 — 3D Models (Meshy)**:
- 12 enemy modellen met animaties
- 4 first-person weapon modellen
- 20+ environment props

**Wave 3 — Audio (ElevenLabs + Suno)**:
- 116 Duitse voice lines
- 76 sound effects
- 11 muziek tracks

**Verificatie**: Alle placeholder assets vervangen door gegenereerde assets.

### Fase 5: Cinematics & Polish (Week 10-11)
> Doel: Van game naar cinematische ervaring

- Episode intro cinematics (6 stuks)
- Boss introductie sequences
- Boss defeat cinematics
- BJ face system (7 health states + reacties)
- Environmental storytelling (propaganda, documenten, bloedspatten)
- Post-processing tuning (bloom, CRT toggle, vignette)
- Screen shake, muzzle flash, particle effects
- Tutorial flow (Episode 1, Floor 1 als organic tutorial)

**Verificatie**: Speel Episode 1-3 met volledige cinematic ervaring.

### Fase 6: All Enemies & Bosses (Week 12-13)
> Doel: Alle 12 vijandtypes met unieke AI en voice

- Alle 5 reguliere vijanden met unieke stats/AI/voices
- Alle 7 bosses met multi-fase gevechten
- Hitler mech suit → breakdown → fase 2 sequence
- Boss health bars
- Unieke death animations per type
- Boss arena level designs

**Verificatie**: Alle bosses verslagen op "Bring 'em on!" difficulty.

### Fase 7: Mobile & Polish (Week 14)
> Doel: Speelbaar op elk apparaat

- Touch controls (virtual joystick + fire button)
- Responsive HUD
- Performance optimalisatie (LOD, culling, texture atlassen)
- Cross-browser testing (Chrome, Firefox, Safari)
- iOS audio unlock workaround
- Loading screen met progress bar
- Easter eggs implementeren

**Verificatie**: Speelbaar op iPhone 12+ en Android mid-range.

### Fase 8: Deployment & Launch (Week 15)
> Doel: LIVE op theuws.com/games/3d-shooter/

- Final playtesting
- Performance profiling
- `bash deploy-ftp.sh 3d-shooter`
- Landing page update
- OG image en social sharing
- INVENTORY.md en GAME-ANALYSIS.md update

---

## Budget Samenvatting

| Categorie | Geschat |
|-----------|---------|
| Flux textures/sprites (~92 assets) | $3-6 |
| Meshy 3D modellen (~36 assets) | $12-24 |
| ElevenLabs voices + SFX (~192 assets) | $25-40 |
| Suno muziek (11 tracks) | $10-15 |
| **Totaal** | **~$50-85** |

---

## Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|----------|
| Meshy model kwaliteit | Hoog | Meerdere iteraties, LOD voor detail |
| Browser performance 60fps | Hoog | Agressieve culling, LOD, instanced meshes |
| ElevenLabs Duits accent kwaliteit | Medium | Voice selection + post-processing |
| Suno muziek loop-kwaliteit | Medium | Handmatig loop points editen |
| Mobile touch controls feel | Medium | Uitgebreid playtesten, haptic feedback |
| Level design (60 floors) | Hoog | Procedureel + handmatig hybrid, fases |

---

## Referentiedocumenten

| Document | Inhoud | Grootte |
|----------|--------|---------|
| [`GAMEPLAY-ANALYSIS.md`](GAMEPLAY-ANALYSIS.md) | Originele game specs, enemy stats (uit source code), weapon formulas, level patterns | 55KB |
| [`3D-ARCHITECTURE.md`](3D-ARCHITECTURE.md) | Three.js engine design, Meshy prompts voor alle modellen, animatie systeem, performance budget | 63KB |
| [`ASSET-PIPELINE.md`](ASSET-PIPELINE.md) | Alle Flux prompts, kleurenpalet, batch scripts, 75 asset specs | 130KB |
| [`AUDIO-MASTERPLAN.md`](AUDIO-MASTERPLAN.md) | 116 voice lines, 76 SFX, 11 muziek tracks, Web Audio architectuur | 93KB |
| [`NARRATIVE-DESIGN.md`](NARRATIVE-DESIGN.md) | 6 episode verhalen, character profiles, 17 cinematics, Easter eggs, tone bible | 93KB |
| [`TECHNICAL-BLUEPRINT.md`](TECHNICAL-BLUEPRINT.md) | Complete engine blueprint, 13 secties, module architectuur, key algorithms, boot sequence | 103KB |

---

## De Belofte

> *"Mein Leben!"*

Dit wordt niet zomaar een browser game. Dit wordt de definitieve Wolfenstein 3D ervaring — trouw aan het origineel uit 1992, maar met graphics, audio en cinematics die je adem benemen. Castle Wolfenstein wacht. B.J. Blazkowicz is klaar.

**Laten we bouwen.**
