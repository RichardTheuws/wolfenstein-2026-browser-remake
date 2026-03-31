# Wolfenstein 3D Browser Remake — Technical Audit Report

**Date**: 2026-03-30
**Auditor**: Claude Opus 4.6
**Scope**: All 29 JS modules, HTML, CSS, 100+ assets, 9 level JSONs, full integration flow

---

## PRIORITIZED ACTION LIST

### CRITICAL (game-breaking — fix immediately)
1. **HIT-MARKER element missing from HTML** — `index.html` has no `<div id="hit-marker">`, but `main.js:151` queries it and CSS styles it. Hit feedback is completely broken.
2. **Secret system field name mismatch** — `level-loader.js:161` stores `pushDirection`, but `secret-system.js:37` reads `s.pushDir` (undefined). Secret wall push direction is always undefined.
3. **Boss drop type `chaingun_ammo` not in PICKUP_TYPES** — `boss.js:26` drops `chaingun_ammo` but `pickup-system.js` PICKUP_TYPES has no such key. Boss death drop silently fails.
4. **`enemy:drop` event has no listener** — `enemy-manager.js:227` and `boss.js:642` emit `enemy:drop` but nothing listens for it. PickupSystem listens to `enemy:death` instead and handles drops there. The `enemy:drop` from enemy-manager is dead code, but the boss drop path uses ONLY `enemy:drop` and has no fallback — boss item drops never spawn.
5. **EnemyManager never disposed/reset on level advance** — `main.js:718-719` calls `enemyManager.spawnFromLevel()` on level advance but never disposes old enemies first. Dead enemies from previous levels accumulate in the scene.

### HIGH (major impact)
6. **WeaponSystem doesn't sync with GameState currentWeapon** — `WeaponSystem` tracks `_currentWeapon` independently from `GameState.currentWeapon`. Weapon switch via pickup updates GameState but WeaponSystem stays on its own index. The two can desync.
7. **PickupSystem never disposed/reset on level advance** — `main.js:720` calls `pickupSystem.spawnFromLevel()` but never disposes old pickups. Previous level's uncollected pickups remain in the scene.
8. **Minimap accesses private `_enemies` Map** — `minimap.js:169` directly reads `this._enemyManager._enemies`, violating encapsulation. Will break if EnemyManager refactors its internals.
9. **Zero-byte legacy asset files** — 12 files at 0 bytes: `ambient_01.mp3`, `gunshot_01.mp3`, `ceiling_01.png`, `floor_01.png`, `wall_01.png`, `enemy_01.png`, `item_01.png`, `weapon_01.png`, `commando.glb`, `demon_overlord.glb`. These waste loading time and may cause decode errors.
10. **93-byte placeholder PNG sprites** — 10 files at exactly 93 bytes (likely 1x1 transparent PNGs): `boss_attack.png`, `demon_attack.png`, `soldier_attack.png`, `turret_attack.png`, `machinegun_fire.png`, `machinegun_idle.png`, `pistol_fire.png`, `pistol_idle.png`, `shotgun_fire.png`, `shotgun_idle.png`. These are non-functional placeholder sprites.

### MEDIUM (noticeable)
11. **DamageIndicator `setLowHealth()` never called** — The low-health pulsing vignette is implemented but main.js never calls `damageIndicator.setLowHealth()` based on health threshold.
12. **Level JSON `items` vs `pickups` naming inconsistency** — `e1m1.json` through `e1m4.json` use `items` key, but `level-loader.js:146` correctly handles both. However, `secretItems` is present in level JSONs but never read by any system.
13. **Weapon sprite paths mismatch in WeaponHUD** — `weapon-hud.js:29-33` references `assets/sprites/weapons/knife.png` etc., but the actual files are there. However, `weapon-hud.js` is an old sprite-based system that's been replaced by `weapon-viewmodel.js` (3D models). Both exist, creating confusion. `WeaponHUD` is imported but never used in `main.js`.
14. **doom.woff2 font file is 195 bytes** — `assets/fonts/doom.woff2` is likely a corrupted/placeholder file. A real font would be 10KB+.
15. **Missing `e1_explore` track on boot** — `main.js:247` loads `e1_explore` as `e1_exploration.mp3`, but `startGame()` line 863 calls `audioManager.playMusic('e1_explore')` which uses the correct loaded name. However, `continueGame()` line 946 also correctly uses `e1_explore`. This works because `loadTrack` maps `e1_explore` to the URL.
16. **`console.warn()` called with no arguments** — `audio-manager.js:380` calls `console.warn()` with empty parens when ambient buffer is missing. Should include a useful message.

### LOW (minor)
17. **`restartLevel()` function exists but is never called** — `main.js:1118` defines `restartLevel()` but no button or event triggers it. There's no restart button in the pause menu.
18. **`_updatePain` unused parameter** — `enemy.js:761` `_updatePain(dt, playerPos)` never uses `playerPos`. Minor lint issue.
19. **`_chaingUnFiring` typo** — `weapon-viewmodel.js:438` uses `_chaingUnFiring` (capital U) instead of `_chaingunFiring`. Consistent within the file but unconventional.
20. **Level progression skips floors 5-9** — Levels e1m1 through e1m4 exist, then e1m10 (boss). `level:advance` event handler will try to load `e1m5` through `e1m9` which don't exist, and the catch block will show "episode complete" prematurely. This is a content gap, not a code bug.
21. **Difficulty multipliers are defined but never applied** — `game-state.js:15-19` defines `DIFFICULTY_PRESETS` and `getDifficultyMultipliers()`, but no system ever calls `getDifficultyMultipliers()`. Enemy damage, speed, and count are not affected by difficulty selection.
22. **Event listener cleanup inconsistency** — `WeaponSystem` adds `mousedown`/`mouseup`/`wheel` listeners but these are never cleaned up during level transitions. Only `dispose()` removes them. Not a leak during normal play, but would leak on system replacement.
23. **No `weapon-display` or `weapon-sprite` CSS** — `weapon-hud.js` creates DOM elements with IDs `weapon-display` and `weapon-sprite` but no CSS exists for them. Since `weapon-hud.js` is unused, this is inert.

---

## 1. CODE HEALTH

### Syntax Validation
All 29 JS files pass `node --check` with zero errors. No syntax issues.

### Module-by-Module Analysis

#### `js/main.js` (~1230 lines)
- **Boot sequence order**: Correct. Renderer -> Input -> Collision -> LevelLoader -> Player -> GameState -> DoorSystem -> WeaponSystem -> EnemyManager -> PickupSystem -> AudioManager -> SecretSystem -> LevelExit -> SaveSystem -> MenuController -> Cinematics -> UI.
- **CRITICAL**: Line 151 queries `document.getElementById('hit-marker')` which does not exist in `index.html`.
- **HIGH**: Lines 718-720: `enemyManager.spawnFromLevel()` and `pickupSystem.spawnFromLevel()` on level advance without disposing previous instances.
- **MEDIUM**: `restartLevel()` (line 1118) is dead code — never invoked.
- **MEDIUM**: `damageIndicator.setLowHealth()` is never called from the game loop or damage handler.

#### `js/engine/event-bus.js` (91 lines)
- Clean singleton pattern. No issues.

#### `js/engine/renderer.js` (207 lines)
- Clean Three.js setup. CRT shader properly wired. Resize handler properly cleaned up in `dispose()`.
- Uses `EffectComposer` from Three.js addons, compatible with r170.

#### `js/engine/input.js` (275 lines)
- Clean. Mobile and desktop input properly unified. `resetFrameState()` correctly called at end of game loop.
- `dispose()` properly removes all 4 event listeners.

#### `js/engine/collision.js` (183 lines)
- Clean grid-based collision. Axis-independent resolution is correct for wall-sliding behavior.
- `_isPositionClear` checks 4 corners of bounding box — correct approach.

#### `js/engine/level-loader.js` (585 lines)
- **CRITICAL**: Line 161 stores `pushDirection: s.pushDirection || 'north'` but `secret-system.js` reads `s.pushDir`.
- Handles both blueprint and legacy level JSON formats well.
- `_buildWalls()` uses InstancedMesh correctly for performance.
- **NOTE**: Line 474 calls `faceGeometry.dispose()` after creating InstancedMesh — this is correct because InstancedMesh internally clones the geometry.

#### `js/engine/model-loader.js` (98 lines)
- Clean GLTFLoader wrapper with caching and request deduplication.
- `loadModel()` always returns clones (correct for multiple enemies of same type).

#### `js/engine/crt-shader.js` (103 lines)
- Clean GLSL shader. All uniforms properly declared and used.

#### `js/game/player-controller.js` (215 lines)
- Clean FPS controller. Rotation is Y-axis only (authentic Wolfenstein).
- Mobile joystick input properly integrated via `getMobileMove()`.
- **NOTE**: No vertical look (intentional for Wolfenstein style).

#### `js/game/door-system.js` (255 lines)
- Clean door state machine (CLOSED -> OPENING -> OPEN -> CLOSING).
- Collision grid properly updated on door state changes.
- `dispose()` properly removes `player:interact` listener.

#### `js/game/game-state.js` (308 lines)
- **LOW**: `getDifficultyMultipliers()` exists but is never called by any system. Difficulty selection is cosmetic.
- Clean state management otherwise. All stats properly tracked.

#### `js/game/weapon-system.js` (441 lines)
- **HIGH**: `_currentWeapon` can desync from `gameState.currentWeapon`. The weapon system tracks its own index independently.
- `_findEnemyId()` correctly walks parent chain for GLB model child meshes.
- Raycaster properly configured for hitscan.
- `dispose()` properly cleans up mouse/wheel listeners.

#### `js/game/enemy-manager.js` (340 lines)
- Clean enemy lifecycle management.
- Sound propagation via DDA LOS check is well-implemented.
- Dead enemy cleanup queue works correctly.
- `dispose()` properly cleans up all 4 event listeners.

#### `js/game/enemy.js` (962 lines)
- 5 enemy types well-defined with distinct stats.
- AI state machine (IDLE/PATROL/ALERT/CHASE/ATTACK/PAIN/DEAD) is complete and correct.
- DDA line-of-sight implementation is solid.
- `_applyModel()` correctly scales GLB models to enemy dimensions.
- Voice line system properly randomizes from category arrays.

#### `js/game/pickup-system.js` (311 lines)
- **CRITICAL**: No `chaingun_ammo` in PICKUP_TYPES (boss drop type). Only `pistol_ammo` and `weapon_chaingun` exist.
- Listens to `enemy:death` for spawning drops (correct for regular enemies).
- Does NOT listen to `enemy:drop` event (so boss drops via that event path are lost).
- Billboard sprites with bob animation — correct implementation.

#### `js/game/secret-system.js` (119 lines)
- **CRITICAL**: Line 37 reads `s.pushDir` but `level-loader.js` stores it as `s.pushDirection`. The property `pushDir` will always be `undefined`.
- Facing-direction check (`dot > 0.3`) is a good UX touch.
- Collision clearing works correctly via direct grid access.

#### `js/game/level-exit.js` (341 lines)
- Clean level completion flow with stats overlay.
- Tally animation is well-implemented.
- Auto-advance timer (15s) prevents softlock.
- Properly cleans up keydown listener and timeout.

#### `js/game/boss.js` (821 lines)
- **CRITICAL**: Boss drops `chaingun_ammo` (line 26) which doesn't exist in PICKUP_TYPES.
- **CRITICAL**: Boss emits `enemy:drop` (line 642) which no system listens to.
- Boss AI state machine is well-designed (DORMANT -> ENCOUNTER -> STRAFE/CHARGE cycle -> DEATH).
- Health bar UI properly created and animated.
- Trigger zone detection works correctly.
- Enrage mechanic at 30% HP increases speed and fire rate.

#### `js/game/save-system.js` (106 lines)
- Clean localStorage wrapper with version checking.
- Properly handles missing/corrupted saves.

#### `js/ui/menu-controller.js` (200 lines)
- Clean DOM-based menu flow. All handlers tracked for cleanup.
- Episode locking/unlocking works via CSS classes.

#### `js/ui/cinematics.js` (302 lines)
- Clean promise-based cinematic system with AbortController for skip.
- Handles fade, text, and pause beat types.
- Creates its own DOM elements (not in HTML).

#### `js/ui/weapon-viewmodel.js` (823 lines)
- Impressive 3D weapon models built from primitives (knife, pistol, MP40, chaingun).
- Separate scene/camera render pipeline — correct "overlay" approach.
- Animations: idle sway, walk bob, fire recoil, weapon switch, muzzle flash — all present.
- `render()` correctly uses `clearDepth()` trick for weapon-on-top rendering.

#### `js/ui/weapon-hud.js` (162 lines)
- **NOTE**: This is the OLD sprite-based weapon display. It's imported in `main.js` but `main.js` uses `WeaponViewmodel` instead. The import line `import { WeaponHUD } from './ui/weapon-hud.js'` is never actually in main.js — `WeaponViewmodel` is imported as `weaponHUD`. This file is unused.

#### `js/ui/damage-indicator.js` (255 lines)
- Red vignette, pickup flash, low-health pulse, death screen — all properly implemented.
- CSS class toggling approach is clean.
- **MEDIUM**: `setLowHealth()` exists but is never called.

#### `js/ui/settings.js` (413 lines)
- Full settings panel with persistence to localStorage.
- All settings properly applied: brightness, crosshair, CRT filter, volumes, sensitivity.
- DOM properly synced on load.

#### `js/ui/minimap.js` (306 lines)
- Canvas-based minimap with fog of war.
- Shows walls, doors, keys, exit, enemies, and player with direction indicator.
- **HIGH**: Line 169 accesses `this._enemyManager._enemies` (private field).

#### `js/ui/mobile-controls.js` (421 lines)
- Full virtual joystick with dead zone handling.
- Touch-look on right side of screen.
- Fire, weapon switch, and interact buttons.
- Proper touch identifier tracking prevents multi-touch conflicts.

#### `js/audio/audio-manager.js` (623 lines)
- Web Audio API with master/music/SFX/voice gain buses.
- iOS AudioContext unlock via click/touchstart handlers.
- Crossfade, positional audio falloff, ambient loops — all present.
- **LOW**: Line 380 `console.warn()` with no message string.

#### `js/data/episode-intros.js` (62 lines)
- All 6 episode intros defined with cinematic beats. Clean data file.

### Event Bus Consistency

#### Events emitted but never listened to:
| Event | Emitter | Status |
|-------|---------|--------|
| `enemy:drop` | `enemy-manager.js:227`, `boss.js:642` | **No listener** — PickupSystem handles drops via `enemy:death` instead |
| `weapon:miss` | `weapon-system.js:362,400` | **No listener** — no miss feedback implemented |
| `boss:enrage` | `boss.js:334` | **No listener** — could trigger visual/audio effects |
| `boss:death_complete` | `boss.js:550` | **No listener** — animation end not used |
| `enemy:alert` | `enemy.js:391,581,601` | Listened in `main.js` for combat music switch |

#### Events listened but emission checked:
All listeners in the codebase have matching emitters. No orphan listeners found.

---

## 2. ASSET INTEGRITY

### Textures (`assets/textures/`)
| File | Size | Status |
|------|------|--------|
| `wall_grey_stone.jpg` | 137KB | Valid |
| `wall_grey_eagle.jpg` | 135KB | Valid |
| `wall_blue_brick.jpg` | 135KB | Valid |
| `wall_blue_cell.jpg` | 124KB | Valid |
| `wall_wood.jpg` | 76KB | Valid |
| `wall_wood_portrait.jpg` | 71KB | Valid |
| `wall_metal.jpg` | 100KB | Valid |
| `wall_doorframe.jpg` | 129KB | Valid |
| `wall_elevator.jpg` | 75KB | Valid |
| `floor.jpg` | 137KB | Valid |
| `ceiling.jpg` | 102KB | Valid |
| `door_wood.jpg` | 107KB | Valid |
| `door_gold.jpg` | 117KB | Valid |
| `door_metal.jpg` | 88KB | Valid |
| `door_elevator.jpg` | 68KB | Valid |
| `wall1.jpg` - `wall4.jpg` | 458KB-2MB | Legacy textures (not used by code) |
| `ceiling_old.jpg`, `floor_old.jpg` | 969KB-1MB | Legacy textures (not used by code) |
| `soldier_finished.png` | 972KB | Legacy texture (not used by code) |
| `ceiling_01.png` | **0 bytes** | Empty placeholder |
| `floor_01.png` | **0 bytes** | Empty placeholder |
| `wall_01.png` | **0 bytes** | Empty placeholder |

**Result**: All 15 actively-used textures are valid. 3 zero-byte legacy placeholders and 6 unused legacy textures should be cleaned up.

### Pickup Sprites (`assets/sprites/pickups/`)
| File | Size | Status |
|------|------|--------|
| `ammo.png` | 128KB | Valid |
| `health_small.png` | 111KB | Valid |
| `health_large.png` | 198KB | Valid |
| `gold_key.png` | 113KB | Valid |
| `silver_key.png` | 68KB | Valid |
| `treasure_cross.png` | 177KB | Valid |
| `treasure_goblet.png` | 101KB | Valid |
| `treasure_chest.png` | 253KB | Valid |
| `treasure_crown.png` | 273KB | Valid |

**Result**: All 9 pickup sprites valid. Sizes 68-273KB suggest full-quality PNGs with transparency.

### Weapon Sprites (`assets/sprites/weapons/`)
| File | Size | Status |
|------|------|--------|
| `knife.png` | 321KB | Valid |
| `pistol.png` | 308KB | Valid |
| `mp40.png` | 372KB | Valid |
| `chaingun.png` | 552KB | Valid |
| `machinegun_idle.png` | **93 bytes** | Placeholder |
| `machinegun_fire.png` | **93 bytes** | Placeholder |
| `pistol_idle.png` | **93 bytes** | Placeholder |
| `pistol_fire.png` | **93 bytes** | Placeholder |
| `shotgun_idle.png` | **93 bytes** | Placeholder |
| `shotgun_fire.png` | **93 bytes** | Placeholder |

**Result**: 4 valid weapon sprites (used by WeaponHUD, which is unused since WeaponViewmodel renders 3D models). 6 placeholder sprites from legacy system.

### Music (`assets/audio/music/`)
| File | Size | Status |
|------|------|--------|
| `menu_theme.mp3` | 4.4MB | Valid |
| `e1_combat.mp3` | 4.3MB | Valid |
| `e1_exploration.mp3` | 4.3MB | Valid |
| `boss_battle.mp3` | 4.6MB | Valid |
| `e2_theme.mp3` | 4.7MB | Valid |
| `e3_theme.mp3` | 4.9MB | Valid |
| `exploration.mp3` | 3.1MB | Valid |
| `victory.mp3` | 306KB | Valid |
| `gameover.mp3` | 196KB | Valid |
| `secret.mp3` | 1.9MB | Valid |
| `credits.mp3` | 5.2MB | Valid |
| `boss.mp3` | 5.7MB | Legacy (not loaded) |
| `boss1.mp3` | 2.4MB | Legacy (not loaded) |
| `level1.mp3` | 5.7MB | Legacy (not loaded) |
| `level2.mp3` | 3.5MB | Legacy (not loaded) |

**Result**: 11 actively-loaded tracks are valid. 4 legacy tracks not referenced by code.

### Voice Lines (`assets/audio/voices/`)
All 12 files present and valid (15-79KB each):
`guard_halt`, `guard_achtung`, `guard_mein_leben`, `guard_alert`, `guard_attack`, `ss_schutzstaffel`, `ss_alarm`, `ss_death`, `officer_spion`, `officer_alarm`, `officer_death`, `hans_guten_tag`.

### SFX (`assets/audio/sfx/`)
All 14 files present (8-33KB each):
`pistol_fire`, `mp40_fire`, `chaingun_fire`, `knife_slash`, `empty_click`, `door_open`, `pickup_ammo`, `pickup_health`, `pickup_key`, `pickup_treasure`, `player_pain`, `secret_found`, `footstep`, `ambient_drip`.

**NOTE**: Some legacy SFX exist in `assets/audio/` root (not `sfx/` subfolder): `pistol_fire.mp3` (8.7KB), `shotgun_fire.mp3`, `machinegun_fire.mp3`, etc. These are from an older layout and not loaded by the current AudioManager.

### Enemy Models (`assets/models/enemies/`)
| File | Size | Status |
|------|------|--------|
| `guard.glb` | 3.9MB | Valid |
| `ss_soldier.glb` | 3.9MB | Valid |
| `officer.glb` | 4.1MB | Valid |
| `dog.glb` | 5.0MB | Valid |
| `mutant.glb` | 4.5MB | Valid |

**Result**: All 5 enemy models present and valid.

**NOTE**: Legacy models `commando.glb` (0 bytes) and `demon_overlord.glb` (0 bytes) in `assets/models/` root are empty placeholders.

### Level JSONs (`assets/levels/`)
| File | Valid JSON | Has walls | Has playerStart | Has exit | Has entities |
|------|-----------|-----------|-----------------|----------|--------------|
| `e1m1.json` | Yes | Yes | Yes | Yes (26,19) | 10 |
| `e1m2.json` | Yes | Yes | Yes | Yes (20,26) | 15 |
| `e1m3.json` | Yes | Yes | Yes | Yes (26,26) | 20 |
| `e1m4.json` | Yes | Yes | Yes | Yes (19,26) | 25 |
| `e1m10.json` | Yes | Yes | Yes | Yes (10,18) | 0 (boss only) |
| `level1.json` | Yes | Yes | Yes | No | 0 |
| `level_01.json` | Yes | No | No | No | 0 |
| `test_map.json` | Yes | Yes | Yes | No | 0 |
| `3d_enemy_test.json` | Yes | Yes | Yes | No | 0 |

**Result**: 5 campaign levels (e1m1-e1m4, e1m10) are complete with walls, spawn, exit, entities. 4 legacy/test maps have incomplete data.

### BJ Faces (`assets/ui/faces/`)
All 9 faces present and valid (78-113KB each):
`bj_100`, `bj_75`, `bj_50`, `bj_25`, `bj_dead`, `bj_baby`, `bj_easy`, `bj_medium`, `bj_hard`.

---

## 3. INTEGRATION AUDIT

### Boot Flow (main.js `boot()`)
1. Renderer created with canvas
2. InputManager created with canvas
3. CollisionSystem created
4. LevelLoader created, loads `e1m1`
5. Collision grid set from level data
6. PlayerController created at spawn point (disabled)
7. GameState created, level stats initialized
8. DoorSystem created with level/collision/gameState
9. WeaponSystem created with input/camera/gameState
10. EnemyManager created, enemies spawned from level data
11. Enemy models preloaded (guard blocking, others non-blocking)
12. PickupSystem created, pickups spawned from level data
13. AudioManager created, all tracks/SFX/voices loaded
14. SecretSystem, LevelExit, SaveSystem created
15. MenuController, Cinematics created
16. WeaponViewmodel, DamageIndicator created
17. Settings panel, Minimap, MobileControls created
18. Events wired
19. Loading screen transitions to main menu

**Verdict**: Boot sequence is correct and comprehensive. All 18+ systems initialize in proper dependency order.

### Menu Flow
Main Menu -> (NEW GAME) -> Episode Select -> Difficulty Select -> `startGame()` callback
- Episode select shows 6 episodes, 5 locked
- Difficulty select shows 4 options with BJ face images
- OPTIONS button correctly opens Settings panel with back navigation
- CONTINUE button shows/hides based on localStorage save

**Verdict**: Menu flow is complete and correct.

### Game Loop
```
gameLoop(timestamp):
  dt calculation with MAX_DELTA cap (33ms)
  if not paused:
    mobileControls.update() (if mobile)
    player.update(dt)
    weaponSystem.update(dt)
    enemyManager.update(dt)
    boss.update(dt) (if boss exists)
    doorSystem.update(dt)
    pickupSystem.update(dt)
    levelExit.update(dt)
    damageIndicator.update(dt)
    hit marker timer
    weapon bobbing
    footstep sounds
    weaponHUD.update(dt)
    minimap.update(dt)
    tab key minimap toggle
    updateHUD()
  renderer.render(dt)
  weaponHUD.render() (3D weapon overlay)
  input.resetFrameState()
```

**Verdict**: Game loop is well-structured. Update order is correct (input first, then game logic, then render). Input reset is properly at the end.

### Level Progression
- `level:complete` event triggers auto-save and stats overlay
- `level:advance` event loads next level JSON (`e{episode}m{floor}`)
- Level advance properly: disposes doors/secrets, resets exit, spawns enemies/pickups, spawns player
- **GAP**: Floors 5-9 don't exist. The catch block on level load failure shows "episode complete", which is acceptable but skips 5 levels of content.
- Boss level (e1m10) properly detected via `isBossLevel` flag in JSON

### Save/Continue
- Save triggers on `level:complete` with next floor number
- Continue loads save, applies state, loads level, starts gameplay
- Weapon switch event emitted to sync HUD
- Save deleted on episode completion

**Verdict**: Save/continue flow is correct.

### Boss Fight Flow
1. Boss spawns in DORMANT state when boss level loads
2. Player enters trigger zone -> ENCOUNTER state (2s cinematic delay, voice line, health bar appears)
3. `boss:door_lock` event closes the door behind player
4. Boss cycles STRAFE_FIRE and CHARGE patterns with PAUSE between
5. Enrage at 30% HP increases speed/fire rate
6. Death: 3-phase animation (stumble -> kneel -> collapse), score awarded, `boss:death` event
7. `boss:death` handler opens the exit and plays victory music

**CRITICAL ISSUE**: Boss drops `chaingun_ammo` which doesn't exist in PICKUP_TYPES. Boss item drop is silently lost.

---

## 4. MISSING FEATURES / GAPS

### HUD Elements
- **Floor**: Functional (updates via `gameState.currentFloor`)
- **Score**: Functional (updates via `gameState.score`)
- **BJ Face**: Functional (switches image based on health thresholds)
- **Lives**: Functional (updates via `gameState.lives`)
- **Health**: Functional (bar + number)
- **Ammo**: Functional
- **Keys**: Functional (gold/silver toggle via `active` class)
- **Weapon**: Functional (name shown via `weapon:switch` event)
- **Hit Marker**: **BROKEN** (DOM element missing from HTML)

### Weapons (4 types)
- **Knife** (melee, no ammo): Raycasting at 1.5 range. Works.
- **Pistol** (hitscan, 1 ammo): Raycasting with distance falloff. Works.
- **Machine Gun** (hitscan, auto-fire): Works.
- **Chain Gun** (hitscan, auto-fire): Works.
- Number keys 1-4 switch. Scroll wheel cycles. Auto-switch to knife when out of ammo.

### Enemy Types (5 types)
- **Guard**: HP 25, fires pistol, drops 4 ammo. Works.
- **Officer**: HP 50, faster fire rate. Works.
- **SS**: HP 100, high damage. Works.
- **Dog**: HP 1, melee only, fast. Works.
- **Mutant**: HP 45, medium stats. Works.
- All spawn from level JSON entity data.

### Secret System
- Push walls defined in level data. Player must face wall and press E.
- **CRITICAL**: Push direction field name mismatch (`pushDirection` vs `pushDir`).
- Secret discovery: collision cleared, score +500, `secret:found` emitted.
- SFX plays on discovery.

### Door System
- Normal, gold-locked, silver-locked, and elevator doors.
- Slide animation (0.5s open), auto-close after 3s.
- Collision grid updated on open/close.
- Key check against `gameState.keys`.

### Minimap
- Canvas-based, top-right corner, 150x150px.
- Fog of war (3-cell exploration radius).
- Shows walls, doors (colored by key type), keys, exit (blinking green), enemies (red dots within 15 units), player with direction.
- Toggle with Tab key.

### Mobile Controls
- Virtual joystick (left side) with dead zone.
- Touch-look (right side) for rotation.
- Fire, weapon switch, and interact buttons.
- Only activated on touch devices with screen < 1024px.
- Properly integrated into all systems via InputManager.

### Missing/Incomplete Features
1. **Difficulty has no gameplay effect** — multipliers defined but never applied to enemy stats.
2. **No restart level option** — function exists but no UI to trigger it.
3. **No credits screen** — button exists, handler logs placeholder message.
4. **No episode unlock persistence** — episodes unlock in-session but not saved to localStorage.
5. **`secretItems` in level JSON never processed** — items hidden behind secrets not spawned.
6. **No decoration rendering** — `level-loader.js` parses decorations but no system renders them (no barrels, tables, suits of armor, etc.).
7. **No patrol routes assigned** — `enemy.js` supports patrol state but no level data assigns patrol routes.

---

## 5. VISUAL / UX ISSUES

### Z-Index Hierarchy
| Layer | Z-Index | Element |
|-------|---------|---------|
| Game canvas | 1 | `#game-canvas` |
| Crosshair | 15 | `#crosshair` |
| Hit marker | 16 | `#hit-marker` (MISSING) |
| Mobile controls | 40 | `#mobile-controls` |
| Game HUD | 50 | `#game-hud` |
| Minimap | 50 | `#minimap-canvas` |
| Main Menu | 200 | `#main-menu` |
| Pause Menu | 300 | `#pause-menu` |
| Boss health bar | 1000 | `#boss-health-bar` |
| Level stats overlay | 9999 | `#level-stats-overlay` |
| Loading screen | 1000 | `#loading-screen` |

**Potential conflict**: Minimap and Game HUD share z-index 50. In practice this works because they don't overlap (minimap is top-right, HUD is bottom). Boss health bar at 1000 could visually conflict with loading screen (also 1000) during edge cases.

### CSS Issues
- All dynamically-created DOM elements (`#cinematic-overlay`, `#damage-overlay`, `#pickup-flash`, `#settings-screen`, `#boss-health-bar`, `#level-stats-overlay`) have CSS defined either in wolf3d.css or inline styles. No missing styles found.
- The `#hit-marker` CSS is properly defined in wolf3d.css (lines 629-660) but the HTML element is missing.
- Difficulty face images have proper CSS (`difficulty-face img` rules exist).

### Crosshair
- Properly shown during gameplay, hidden during menus/pause.
- Settings panel controls crosshair style (dot/cross/off).
- Cross style properly implemented with CSS pseudo-elements.

### Overlays
- Stats overlay, episode complete overlay, and game over text are created dynamically and properly removed when dismissed.
- No overlay stacking issues found — each overlay cleans up before creating a new one.

---

## 6. PERFORMANCE CONCERNS

### Potential Bottlenecks
1. **InstancedMesh for walls**: Used correctly — this is the right approach for batching wall faces by texture type. No issue.
2. **Per-frame minimap canvas redraw**: Redraws the entire minimap every frame. For a 150x150 canvas this is acceptable.
3. **Pickup bob animation**: Iterates all pickups every frame. Acceptable for typical pickup counts (<50 per level).
4. **Raycaster intersection**: Tests against all alive enemy meshes every frame a weapon fires. With 20-25 enemies this is fine.

### Memory Concerns
1. **Enemy mesh accumulation on level advance**: Old enemies are never disposed before spawning new ones. Each level transition adds ~20 meshes that are never cleaned up. After 5 levels, ~100 orphan meshes in the scene.
2. **Pickup mesh accumulation on level advance**: Same issue — old pickups stay in scene.
3. **Texture cache in LevelLoader**: Textures are cached in `_textures` Map. On `unloadLevel()`, meshes are disposed but the texture cache persists (intentional — textures reused between levels).
4. **AudioBuffer cache**: Buffers are cached permanently in AudioManager. This is correct — audio data should be loaded once.

### DOM Manipulation in Game Loop
- `updateHUD()` runs every frame and updates 8+ DOM elements. Uses `textContent` and `style` properties (not `innerHTML` per frame). This is acceptable.
- BJ face image only updates when health bracket changes (conditional check prevents unnecessary DOM writes). Good optimization.
- Health bar color gradient updates every frame via `style.background`. Could be optimized to only update on health change, but impact is negligible.

---

## 7. BROWSER COMPATIBILITY

### Three.js r170 API Compatibility
- All Three.js APIs used are compatible with r170:
  - `THREE.WebGLRenderer`, `PerspectiveCamera`, `Scene`, `Fog` - stable APIs
  - `THREE.InstancedMesh` - available since r109
  - `THREE.CanvasTexture` - stable
  - `EffectComposer`, `RenderPass`, `ShaderPass` - from addons, stable
  - `GLTFLoader` - from addons, stable
  - `THREE.SRGBColorSpace` - available since r152 (replaces deprecated `sRGBEncoding`)
  - `THREE.MathUtils.degToRad` - stable utility
- Import map pointing to CDN `https://cdn.jsdelivr.net/npm/three@0.170.0/` is correct.

### Safari-Specific Issues
1. **AudioContext**: Uses `window.AudioContext || window.webkitAudioContext` (line 526). Correct Safari fallback.
2. **AudioContext resume on user interaction**: Properly handles suspended state on click/touchstart. Correct for iOS.
3. **Pointer Lock**: Uses standard `document.pointerLockElement` and `canvas.requestPointerLock()`. Safari supports this since Safari 10.1.
4. **backdrop-filter**: Pause menu uses `backdrop-filter: blur(4px)` with `-webkit-backdrop-filter` prefix. Correct for Safari.
5. **`inset` property**: Used in several places. Supported in Safari 14.1+.

### ES6 Module Imports Without Build Step
- Uses native ES6 modules via `<script type="module">` and `type="importmap"`.
- Import maps supported in Chrome 89+, Firefox 108+, Safari 16.4+.
- **Risk**: Safari <16.4 (iOS 16.3 and earlier) does not support import maps. This would break the game entirely on older iOS devices.
- **Mitigation**: Could add a polyfill like `es-module-shims` for broader compatibility.

### Other Compatibility Notes
- `performance.now()` - universally supported.
- `localStorage` - universally supported (with possible privacy mode restrictions).
- `AbortController` - supported in all modern browsers.
- `Touch events` - properly feature-detected via `'ontouchstart' in window`.
- `ResizeObserver` - not used (uses `window.addEventListener('resize')` instead, which is universal).
- `structuredClone` - not used (uses manual object spreading, which is correct).

---

## SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 7 |

### Quick Fixes (< 30 minutes each)
1. Add `<div id="hit-marker" class="hidden"></div>` after the crosshair div in `index.html`
2. Fix `secret-system.js:37`: change `pushDir: s.pushDir` to `pushDir: s.pushDirection`
3. Add `chaingun_ammo` to PICKUP_TYPES in `pickup-system.js`
4. Make PickupSystem listen to `enemy:drop` event (for boss drops)
5. Add `enemyManager.dispose()` and `pickupSystem.dispose()` before respawning on level advance
6. Call `damageIndicator.setLowHealth(gameState.health <= 25)` in `updateHUD()`

### Content Gaps (need generation/creation)
1. Levels e1m5 through e1m9 (floors 5-9 of episode 1)
2. Difficulty multiplier application to enemy spawning/stats
3. Decoration rendering system (barrels, tables, etc.)
4. Credits screen content
5. Episode unlock persistence (save to localStorage)
