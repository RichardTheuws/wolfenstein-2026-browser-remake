# 3D Architecture Plan: Wolfenstein 3D Browser Remake

**Version**: 0.1.0
**Project**: Castle Wolfenstein 3D (Browser Remake)
**Author**: 3D Animation Director Agent
**Date**: 2026-03-30
**Engine**: Three.js (WebGL 2.0)
**Target**: 60fps on mid-range hardware (integrated GPU, 8GB RAM)

---

## Table of Contents

1. [Engine Architecture](#1-engine-architecture)
2. [3D Models via Meshy v6](#2-3d-models-via-meshy-v6)
3. [Animation System](#3-animation-system)
4. [Level Rendering](#4-level-rendering)
5. [Performance Budget](#5-performance-budget)
6. [Post-Processing Effects](#6-post-processing-effects)
7. [File Structure](#7-file-structure)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Engine Architecture

### 1.1 Rendering Approach: Full Three.js with Classic Constraints

**Decision**: Full 3D Three.js engine with camera constraints that recreate the Wolfenstein 3D feel.

Rationale: Pure raycasting would limit visual quality and make it harder to add modern touches (dynamic lighting, 3D models, particle effects). Instead, we use Three.js's full 3D pipeline but constrain the camera and movement to *feel* like the original.

**Classic feel constraints:**
- Camera pitch locked to horizontal (no looking up/down) -- togglable for purists
- Movement snaps to 90-degree turns in "classic mode", smooth in "modern mode"
- Grid-aligned level geometry (64x64 unit maps)
- Weapon sprites rendered as screen-space quads (first-person overlay), not world-space 3D
- HUD at bottom of screen replicating the original status bar

### 1.2 WebGL Renderer Configuration

```javascript
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: false,                // Crisp pixel edges, retro aesthetic
    powerPreference: 'high-performance',
    stencil: false,                  // Not needed, saves memory
    depth: true,
    alpha: false                     // Opaque background, no transparency overhead
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x383838);    // Wolfenstein grey ceiling/floor
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

// WebGL 2 features
renderer.capabilities.isWebGL2; // Verify, fallback gracefully
```

**Render resolution strategy:**
- Internal render at 640x400 (original Wolfenstein resolution), upscaled to screen
- Optional "HD mode" renders at native resolution
- Toggle via settings menu -- retro purists get authentic resolution, modern players get crisp

### 1.3 Camera Setup

```javascript
const camera = new THREE.PerspectiveCamera(
    75,                                          // FOV: wider than original (~66) for modern screens
    window.innerWidth / window.innerHeight,      // Aspect ratio
    0.1,                                         // Near clip
    100                                          // Far clip (maze corridors rarely exceed this)
);

// Classic Wolfenstein: camera at player eye height, no vertical rotation
camera.position.y = 1.6;  // Eye height (player is ~1.8m, eye level at 1.6m)
camera.rotation.order = 'YXZ';

// Lock vertical rotation in classic mode
function updateCamera(yaw, pitch) {
    camera.rotation.y = yaw;
    if (gameSettings.modernControls) {
        camera.rotation.x = THREE.MathUtils.clamp(pitch, -Math.PI / 6, Math.PI / 6);
    } else {
        camera.rotation.x = 0; // Locked horizontal -- classic Wolf3D
    }
}
```

**FOV considerations:**
- Original Wolfenstein used roughly 66 degrees horizontal FOV on a 320x200 screen
- For modern widescreen, 75 degrees feels equivalent
- Player-adjustable between 60-100 in settings

### 1.4 Lighting System

The original Wolfenstein 3D had no dynamic lighting -- flat shading only. We add atmospheric lighting while keeping the option for "flat" authentic mode.

**Light hierarchy:**

```javascript
// 1. Global ambient -- base visibility (replaces Wolf3D's flat lighting)
const ambient = new THREE.AmbientLight(0x606060, 0.4);

// 2. Ceiling lights -- per-room point lights, warm tone
// Placed at ceiling_height - 0.1 in rooms that have ceiling lamps
const ceilingLight = new THREE.PointLight(0xffcc88, 1.0, 12);
ceilingLight.castShadow = true;
ceilingLight.shadow.mapSize.set(512, 512);
ceilingLight.shadow.bias = -0.002;

// 3. Torch lights -- orange flicker, attached to wall sconces
const torchLight = new THREE.PointLight(0xff6622, 0.8, 8);
// Animate intensity for flicker: 0.6 + Math.sin(time * 8) * 0.2

// 4. Muzzle flash -- instantaneous white-yellow burst
const muzzleFlash = new THREE.PointLight(0xffff88, 3.0, 6);
muzzleFlash.visible = false; // Enable for 2-3 frames on fire

// 5. Directional fill -- subtle, prevents pure-black shadows
const fill = new THREE.DirectionalLight(0x404060, 0.15);
fill.position.set(0, 1, 0);
```

**Shadow mapping approach:**
- Only ceiling lights and torches cast shadows (max 4-6 shadow-casting lights per view)
- Shadow map resolution: 512x512 per light (balanced quality/performance)
- Use `PCFSoftShadowMap` for soft edges
- Disable shadows on decorative items (barrels, tables) -- they receive but don't cast
- Boss rooms: 1-2 dedicated spotlights with 1024x1024 shadows for dramatic effect

**Flat lighting mode (purist toggle):**
- Disable all point/directional lights
- Set ambient to 1.0
- Disable shadow maps
- Apply flat `MeshBasicMaterial` to walls (texture only, no shading)

---

## 2. 3D Models via Meshy v6

### 2.1 General Configuration

All Meshy v6 calls use:
```json
{
    "art_style": "realistic",
    "target_polycount": <varies>,
    "enable_rigging": <true for characters>,
    "topology": "quad"
}
```

**Polygon budget overview:**
| Category | Per-model budget | Max on screen | Total budget |
|----------|-----------------|---------------|-------------|
| Regular enemies | 8,000 polys | 8 | 64,000 |
| Boss enemies | 20,000 polys | 1 | 20,000 |
| Weapons (FPS) | 5,000 polys | 1 | 5,000 |
| Environment props | 1,000-3,000 polys | 30 | 60,000 |
| Level geometry | Instanced | -- | 50,000 |
| **TOTAL SCENE MAX** | | | **~200,000** |

### 2.2 Enemy Models

#### Guard (Basic Enemy)
```json
{
    "prompt": "WW2 German infantry soldier standing at attention, brown wool uniform with belt and holster, peaked cap, holding a Luger pistol at his side, leather boots, full body character model, game-ready low-poly, neutral T-pose for rigging, clean topology",
    "art_style": "realistic",
    "target_polycount": 8000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_stand, walk_patrol, aim_pistol, fire_pistol, pain_flinch, death_collapse, death_spin
- **Texture**: 1024x1024 diffuse, 512x512 normal map
- **Notes**: Most common enemy. Keep polycount low for instancing.

#### SS Soldier (Medium Enemy)
```json
{
    "prompt": "WW2 elite German SS soldier in dark blue-black uniform, SS cap with insignia, holding MP40 submachine gun across chest, tall leather boots, ammunition pouches on belt, muscular build, full body T-pose character model, game-ready",
    "art_style": "realistic",
    "target_polycount": 8000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_alert, walk_aggressive, aim_mp40, fire_burst (3-round), pain_stumble, death_forward, death_backward
- **Texture**: 1024x1024 diffuse, 512x512 normal map

#### Officer (Fast Enemy)
```json
{
    "prompt": "WW2 German officer in white dress uniform with medals and decorations, officer cap with eagle emblem, holding two Luger pistols one in each hand, polished boots, stern expression, lean athletic build, full body T-pose, game-ready character",
    "art_style": "realistic",
    "target_polycount": 8000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_pace, run_fast, aim_dual_pistol, fire_alternating, pain_dodge, death_dramatic, death_crumple
- **Texture**: 1024x1024 diffuse, 512x512 normal map
- **Notes**: 1.5x movement speed of guards. Fires rapidly.

#### German Shepherd (Attack Dog)
```json
{
    "prompt": "Aggressive German Shepherd dog in attack stance, mouth open showing teeth, muscular body, dark sable coat, pointed ears forward, leather collar with metal studs, full body side profile T-pose, game-ready animal model",
    "art_style": "realistic",
    "target_polycount": 6000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_growl, run_charge, leap_attack, bite, pain_yelp, death_collapse
- **Texture**: 1024x1024 diffuse, 512x512 normal map
- **Notes**: No ranged attack. Fast movement, low health. Quadruped rigging.

#### Mutant
```json
{
    "prompt": "Horrifying mutant soldier, shirtless muscular torso covered in stitched scars and surgical staples, one arm replaced with a large mounted machine gun barrel, torn military pants, pale grey-green skin, Frankenstein-style flat head with metal bolts, dead eyes, full body T-pose, game-ready horror character",
    "art_style": "realistic",
    "target_polycount": 10000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_twitch, walk_lumbering, aim_gunarm, fire_gunarm, pain_roar, death_explode, death_collapse_heavy
- **Texture**: 2048x2048 diffuse (extra detail for scars), 1024x1024 normal map
- **Notes**: Higher polycount for grotesque detail. Slower but tanky.

#### Hans Grosse (Episode 1 Boss)
```json
{
    "prompt": "Massive imposing WW2 German super soldier, 2.5 meters tall, heavy body armor plating over grey-green uniform, two large rotating chain guns one in each hand, ammunition belts draped across chest, heavy steel boots, scarred brutal face with crew cut, intimidating stance, full body T-pose, game-ready boss character model",
    "art_style": "realistic",
    "target_polycount": 20000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_menacing, walk_heavy (screen shake), aim_dual_chainguns, fire_sustained, fire_sweep, pain_absorb, death_kneel_then_collapse
- **Texture**: 2048x2048 diffuse, 1024x1024 normal map
- **Special**: Screen shake on footsteps. Chaingun barrels rotate during fire.

#### Dr. Schabbs (Episode 2 Boss)
```json
{
    "prompt": "Mad WW2 scientist in bloody white lab coat, balding head with wild grey hair on sides, round spectacles, holding a massive oversized hypodermic syringe in one hand, rubber gloves covered in blood stains, unhinged grin, heavy set body, full body T-pose, game-ready character",
    "art_style": "realistic",
    "target_polycount": 15000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_examine_syringe, walk_waddle, throw_syringe, laugh_taunt, pain_stagger, death_fall_forward
- **Texture**: 2048x2048 diffuse, 1024x1024 normal map
- **Special**: Thrown syringes are separate projectile models. Spawns mutants from bodies.

#### Hitler in Mech Suit (Episode 3 Boss -- Phase 1)
```json
{
    "prompt": "Dieselpunk mechanical battle suit, 3 meters tall, grey-green armored exoskeleton with Nazi eagle emblems, four large mounted chain guns two on each arm, armored glass cockpit showing a small man inside, hydraulic legs, heavy industrial design with rivets and pipes, steam vents, full body T-pose, game-ready mech model",
    "art_style": "realistic",
    "target_polycount": 25000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_hum, walk_stomp (heavy screen shake), fire_all_four_guns, fire_alternating_pairs, damage_sparks, armor_break_apart (transition to phase 2)
- **Texture**: 2048x2048 diffuse, 1024x1024 normal/metallic
- **Special**: Mech suit breaks apart in pieces when destroyed, revealing Hitler inside. Armor pieces use physics ragdoll on destruction. **Use separate breakable mesh groups** for arms, torso plate, leg armor.

#### Hitler Without Mech (Episode 3 Boss -- Phase 2)
```json
{
    "prompt": "WW2 dictator caricature in brown military uniform with medals, small mustache, holding two large chain guns one in each hand, furious expression, disheveled from battle, torn uniform, sweat on face, medium build, full body T-pose, game-ready character",
    "art_style": "realistic",
    "target_polycount": 12000,
    "enable_rigging": true
}
```
- **Animations needed**: emerge_from_wreckage, idle_rage, run_aggressive, fire_dual_chainguns, fire_sweep, pain_furious, death_dramatic_long
- **Texture**: 1024x1024 diffuse, 512x512 normal map
- **Notes**: Appears when mech suit is destroyed. Faster and more erratic than phase 1.

#### Otto Giftmacher (Episode 4 Boss)
```json
{
    "prompt": "WW2 German weapons specialist, stocky muscular build in olive military uniform with ammunition bandolier, holding a large Panzerschreck rocket launcher on shoulder, steel helmet, thick leather gloves, determined grimace, combat boots, full body T-pose, game-ready character",
    "art_style": "realistic",
    "target_polycount": 15000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_ready, walk_steady, aim_rocket, fire_rocket (recoil), reload_rocket, pain_brace, death_explosion (rockets on body detonate)
- **Texture**: 2048x2048 diffuse, 1024x1024 normal map
- **Special**: Rockets are separate projectile models with smoke trails.

#### Gretel Grosse (Episode 5 Boss)
```json
{
    "prompt": "Tall imposing female WW2 German super soldier, 2.2 meters tall, body armor over dark grey uniform, two rotating chain guns one in each hand, ammunition belts across chest, short blonde hair in military style, fierce determined expression, heavy combat boots, athletic muscular build, full body T-pose, game-ready boss character",
    "art_style": "realistic",
    "target_polycount": 20000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_confident, walk_powerful, aim_dual_chainguns, fire_sustained, fire_strafe, pain_grunt, death_defiant
- **Texture**: 2048x2048 diffuse, 1024x1024 normal map
- **Notes**: Sister of Hans Grosse. Same attack pattern but faster.

#### General Fettgesicht (Episode 6 Boss)
```json
{
    "prompt": "Obese WW2 German general in decorated olive uniform straining at buttons, multiple medals and iron crosses, holding a large Panzerschreck rocket launcher, piggy eyes, double chin, monocle, officers cap with skull emblem, polished boots, arrogant posture despite heavy build, full body T-pose, game-ready boss character",
    "art_style": "realistic",
    "target_polycount": 18000,
    "enable_rigging": true
}
```
- **Animations needed**: idle_sneer, walk_waddle, aim_rocket, fire_rocket, taunt, pain_wheeze, death_topple
- **Texture**: 2048x2048 diffuse, 1024x1024 normal map
- **Special**: Rockets faster than Otto's. Occasional taunt animation.

### 2.3 Weapon Models (First-Person View)

First-person weapons are rendered as screen-space overlays on a separate orthographic scene, composited on top of the 3D world. This means they don't need world-space accuracy -- they're essentially animated sprites with depth.

**Approach**: Render weapon models to a `THREE.WebGLRenderTarget` from a fixed close-up camera, then composite as a full-screen quad. This avoids z-fighting and clipping issues.

#### Combat Knife
```json
{
    "prompt": "WW2 German combat knife, sharp steel blade with blood groove, dark wooden handle with metal pommel, leather-wrapped grip, crossguard, military issue fighting knife, side view, game-ready weapon model",
    "art_style": "realistic",
    "target_polycount": 3000,
    "enable_rigging": false
}
```
- **Animations**: idle_hold, slash_right, slash_left, stab
- **Screen position**: Lower-right, hand visible holding knife

#### Luger Pistol
```json
{
    "prompt": "WW2 Luger P08 pistol, dark blued steel, wooden grip panels, toggle-lock action, 8-round magazine, detailed mechanical parts, side view showing full profile, game-ready weapon model",
    "art_style": "realistic",
    "target_polycount": 4000,
    "enable_rigging": false
}
```
- **Animations**: idle_hold, fire (recoil + slide), reload (magazine swap)
- **Screen position**: Center-right, slight bob when walking

#### MP40 Submachine Gun
```json
{
    "prompt": "WW2 German MP40 submachine gun, dark metal with folding stock extended, Bakelite grip, 32-round magazine inserted, perforated barrel shroud, detailed receiver and bolt, three-quarter view, game-ready weapon model",
    "art_style": "realistic",
    "target_polycount": 5000,
    "enable_rigging": false
}
```
- **Animations**: idle_hold, fire_burst (3-round recoil), fire_auto (sustained), reload (magazine swap)
- **Screen position**: Center, both hands visible, more weapon bob

#### Gatling Gun / Chain Gun
```json
{
    "prompt": "Handheld rotary chain gun with six rotating barrels, large drum ammunition container attached below, dual pistol grips, heavy industrial military weapon, dark gunmetal finish, brass ammunition belt feeding into the weapon, three-quarter view, game-ready weapon model",
    "art_style": "realistic",
    "target_polycount": 6000,
    "enable_rigging": false
}
```
- **Animations**: idle_hold (heavy sway), spin_up (barrels start rotating), fire (barrels at full speed, muzzle flash), spin_down
- **Screen position**: Center-bottom, takes up more screen. Heavy bob.

### 2.4 Environment Props

All props use `enable_rigging: false`. Sorted by polygon budget.

#### Furniture

| Prop | Meshy Prompt | Polycount | Texture |
|------|-------------|-----------|---------|
| **Wooden Table** | "Simple rectangular wooden table, dark oak, four sturdy legs, WW2 era military mess hall furniture, plain design, game-ready prop" | 1,500 | 512x512 |
| **Wooden Chair** | "Simple wooden chair, dark oak, straight back, WW2 military barracks furniture, no cushion, game-ready prop" | 1,000 | 512x512 |
| **Suit of Armor** | "Medieval knight suit of armor on display stand, full plate armor, helmet with visor, standing with arms at sides, museum display piece, dark steel, game-ready prop" | 3,000 | 1024x1024 |

#### Lighting Props

| Prop | Meshy Prompt | Polycount | Texture |
|------|-------------|-----------|---------|
| **Ceiling Lamp** | "WW2 era hanging ceiling lamp, single bare incandescent bulb, dark metal conical shade, chain mount, simple industrial design, game-ready prop" | 800 | 256x256 |
| **Floor Lamp** | "WW2 era standing floor lamp, tall metal pole, conical shade on top, round base, industrial military design, game-ready prop" | 600 | 256x256 |
| **Chandelier** | "Gothic castle chandelier, wrought iron frame, six candle holders with melted candles, hanging chains, dark medieval design, game-ready prop" | 2,000 | 512x512 |
| **Wall Torch** | "Medieval wall torch sconce, wrought iron bracket, burning flame torch, mounted on stone wall bracket, castle dungeon lighting, game-ready prop" | 500 | 256x256 |

#### Dungeon Props

| Prop | Meshy Prompt | Polycount | Texture |
|------|-------------|-----------|---------|
| **Skeleton/Bones** | "Human skeleton slumped against wall, medieval dungeon prisoner remains, tattered cloth scraps, rusty shackle on wrist, scattered bones, game-ready prop" | 2,000 | 512x512 |
| **Wooden Barrel** | "Old wooden barrel with metal bands, slightly damaged, dark aged wood, medieval storage barrel, game-ready prop" | 800 | 512x512 |
| **Flag Stand** | "Eagle emblem flag on tall wooden pole with ornate metal eagle finial on top, red banner with black eagle symbol, decorative tassels, floor-standing flag display, game-ready prop" | 1,500 | 512x512 |

**Note on faction symbols**: All Nazi imagery is replaced with a fictional "Eisenreich" faction -- a black eagle on red/white. This applies to all flag textures, wall banners, and uniform insignia. The eagle design will be generated via fal.ai Flux Dev and applied as texture overlays.

#### Pickup Items

These are small and rendered as billboard sprites OR low-poly 3D with a slow rotation animation.

| Item | Meshy Prompt | Polycount | Notes |
|------|-------------|-----------|-------|
| **Medical Kit** | "WW2 military first aid kit, white box with red cross symbol, metal clasps, canvas strap, game-ready pickup item" | 500 | Hover + rotate |
| **Turkey / Food** | "Roasted whole turkey on a metal plate, golden brown skin, steaming hot, game-ready food item" | 600 | Hover + rotate |
| **Dog Food** | "Metal dog food bowl filled with brown kibble, simple steel bowl, game-ready item" | 300 | Hover + rotate |
| **Gold Cross** | "Ornate golden cross with gemstones, treasure item, shining metallic gold surface, game-ready collectible" | 400 | Hover + rotate + sparkle particles |
| **Gold Chalice** | "Golden chalice goblet with gemstones around rim, treasure item, polished metallic gold, game-ready collectible" | 500 | Hover + rotate + sparkle particles |
| **Treasure Chest** | "Small wooden treasure chest overflowing with gold coins and jewels, open lid, game-ready collectible" | 800 | Hover + rotate + sparkle particles |
| **Crown** | "Ornate golden crown with large gemstones, royal treasure item, game-ready collectible" | 600 | Hover + rotate + sparkle particles |
| **Gold Key** | "Ornate golden skeleton key with decorative bow, large old-fashioned key, shining gold metal, game-ready item" | 300 | Hover + rotate + glow |
| **Silver Key** | "Silver skeleton key with decorative bow, large old-fashioned key, polished silver metal, game-ready item" | 300 | Hover + rotate + glow |

### 2.5 Model Processing Pipeline

After Meshy generation, every model goes through:

1. **Download** GLB file from Meshy API response
2. **Verify** polygon count (reject if > 120% of budget)
3. **Optimize** with `gltf-transform` CLI:
   ```bash
   gltf-transform optimize input.glb output.glb --compress meshopt
   gltf-transform dedup output.glb output.glb
   gltf-transform prune output.glb output.glb
   ```
4. **Generate LODs** (for enemies and large props):
   - LOD0: Original (close range, < 5 units)
   - LOD1: 50% polys (medium range, 5-15 units)
   - LOD2: 25% polys (far range, > 15 units)
5. **Store** in `/assets/models/<category>/<name>/`:
   ```
   assets/models/enemies/guard/
     guard-lod0.glb
     guard-lod1.glb
     guard-lod2.glb
     guard-thumbnail.png
   ```
6. **Register** in `asset-manifest.json` with metadata

---

## 3. Animation System

### 3.1 Architecture

```
AnimationManager
  +-- AnimationMixer (per entity, Three.js built-in)
  |     +-- AnimationClip[]  (from Meshy rigging or manually created)
  |     +-- AnimationAction[] (active/queued actions)
  +-- AnimationStateMachine (per entity type)
  |     +-- States: idle, walk, attack, pain, death
  |     +-- Transitions: weighted crossfades
  +-- ProceduralAnimations
        +-- WeaponBob (sin wave based on move speed)
        +-- ItemRotation (constant Y-axis rotation)
        +-- FlickerLights (noise-based intensity)
```

### 3.2 Enemy Animation States

Each enemy type has a finite state machine with these core states:

```
                 +--------+
                 |  IDLE  |<--------+
                 +--------+         |
                   |    |           |
            see    |    | patrol    | no target
            player |    v           |
                   |  +-------+    |
                   |  | WALK  |----+
                   |  +-------+
                   |    |
                   v    v
                 +---------+
                 | ATTACK  |
                 +---------+
                   |    |
            hit    |    | kill player
                   v    |
                 +------+     +-------+
                 | PAIN |     | DEATH |
                 +------+     +-------+
                   |
                   v
                 (back to IDLE or ATTACK based on aggro)
```

**Crossfade timing per transition:**

| Transition | Duration | Easing |
|-----------|----------|--------|
| idle -> walk | 0.3s | ease-in-out |
| walk -> attack | 0.15s | ease-in (fast reaction) |
| attack -> pain | 0.05s | immediate (interrupt) |
| pain -> idle | 0.3s | ease-out |
| any -> death | 0.1s | immediate |

### 3.3 Death Animations (Multiple Per Type)

Each enemy has 2-3 death variants, selected randomly for visual variety:

| Enemy | Death Variant 1 | Death Variant 2 | Death Variant 3 |
|-------|----------------|-----------------|-----------------|
| **Guard** | Collapse forward, crumple | Spin clockwise, fall on back | Stumble backward, slide down wall |
| **SS Soldier** | Fall to knees, then face | Thrown backward by impact | Spin and collapse sideways |
| **Officer** | Dramatic stagger back, fall | Quick drop (headshot feel) | Spin with pistols flying out |
| **Dog** | Roll sideways, legs up | Slide forward on belly | Yelp, flip, lie still |
| **Mutant** | Explode (particle giblets) | Slow crumble to knees, then fall | Lurch forward, collapse heavy |

**Death animation implementation:**
- Meshy rigging gives us walk/run clips. Death animations must be **hand-keyed in Three.js** using `KeyframeTrack`:
```javascript
const deathCollapse = new THREE.AnimationClip('death_collapse', 1.2, [
    new THREE.VectorKeyframeTrack('.position',
        [0, 0.3, 0.8, 1.2],
        [0,0,0, 0,-0.3,0.1, 0,-0.8,0.2, 0,-1.6,0.3]
    ),
    new THREE.QuaternionKeyframeTrack('.quaternion',
        [0, 0.3, 0.8, 1.2],
        [/* rotation keyframes for forward tumble */]
    )
]);
```
- After death animation completes, body remains on ground for 10 seconds, then fades out (alpha fade over 2 seconds)
- Bodies are converted to static objects (no animation mixer, no collision) to save performance

### 3.4 Weapon Animations

Weapon animations are procedural (no skeleton rigging), using position/rotation tweening:

```javascript
class WeaponAnimator {
    constructor() {
        this.bobAmplitude = 0.015;    // Vertical bob amount
        this.bobFrequency = 8;         // Cycles per second while walking
        this.swayAmplitude = 0.008;    // Horizontal sway
        this.kickback = 0;             // Recoil offset (0 to 1)
    }

    update(deltaTime, isMoving, isFiring) {
        // Walking bob (sinusoidal)
        if (isMoving) {
            this.bobPhase += deltaTime * this.bobFrequency;
            weapon.position.y = baseY + Math.sin(this.bobPhase) * this.bobAmplitude;
            weapon.position.x = baseX + Math.cos(this.bobPhase * 0.5) * this.swayAmplitude;
        }

        // Fire recoil (sharp kick back, smooth return)
        if (isFiring) {
            this.kickback = 1.0;
        }
        this.kickback *= 0.85; // Exponential decay
        weapon.position.z = baseZ - this.kickback * 0.15;
        weapon.rotation.x = -this.kickback * 0.1;
    }
}
```

**Per-weapon fire behavior:**

| Weapon | Fire Rate | Recoil Intensity | Bob Amount | Screen Flash |
|--------|-----------|-----------------|------------|-------------|
| Knife | 2/sec (melee) | 0.3 (slash arc) | Minimal | None |
| Luger | 3/sec | 0.6 | Light | Short flash |
| MP40 | 7/sec | 0.4 (lighter per shot) | Medium | Rapid flashes |
| Chain Gun | 10/sec | 0.3 (sustained) | Heavy (large weapon) | Continuous glow |

### 3.5 Door Animations

```javascript
class DoorAnimator {
    // Wolfenstein doors slide sideways into the wall
    animate(door, direction = 'open') {
        const targetX = direction === 'open'
            ? door.position.x + TILE_SIZE  // Slide one full tile width
            : door.originalX;              // Return to original position

        // Tween over 0.5 seconds with ease-out
        new TWEEN.Tween(door.position)
            .to({ x: targetX }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}
```

- Doors play a mechanical "clunk-slide" sound effect on open
- Locked doors play a "rattle" sound and display "Locked - need [gold/silver] key" message
- Boss doors have a slower, more dramatic open animation (1.5 seconds)

### 3.6 Secret Wall (Push Wall) Animations

```javascript
class PushWallAnimator {
    // Secret walls push backward two tiles into the void behind them
    animate(wall) {
        // Phase 1: Initial push (slow start, player holds use key)
        new TWEEN.Tween(wall.position)
            .to({
                [wall.pushDirection]: wall.position[wall.pushDirection] + TILE_SIZE * 2
            }, 2000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onStart(() => {
                this.playSound('stone_scrape');
                // Reveal secret area behind wall
            })
            .start();
    }
}
```

### 3.7 Boss-Specific Animations

#### Hitler Mech Suit Destruction Sequence
1. Mech health reaches 0
2. Camera shakes violently (0.5s)
3. Mech suit parts detach in sequence:
   - Left arm armor falls (0.2s)
   - Right arm armor falls (0.3s)
   - Chest plate explodes outward (0.4s)
   - Leg armor crumbles (0.5s)
4. Explosion particle effect (fire, sparks, smoke)
5. Brief pause (0.3s)
6. Hitler steps out of wreckage (emerge animation 1.0s)
7. Phase 2 begins -- Hitler at full health, faster, angrier

**Implementation**: Mech suit is modeled with **separate mesh groups** per armor piece. Each piece has its own physics body for the destruction sequence. Use `THREE.InstancedMesh` particles for debris.

#### Dr. Schabbs Syringe Throw
- Wind-up animation (0.3s): pulls arm back
- Release (0.1s): fast forward throw
- Syringe projectile spawns at release point
- Syringe model: 500 polys, flies in an arc (`gravity = -2.0`)
- On impact with player: green damage flash + "poisoned" debuff (slow movement 3s)
- On impact with corpse: corpse reanimates as mutant (1.5s transformation)

---

## 4. Level Rendering

### 4.1 Grid-Based Level System

Faithful to the original: 64x64 tile grid maps.

**Tile size**: 2.0 world units (1 tile = 1 wall segment)
**Wall height**: 2.0 world units (equal to tile width, maintaining original proportions)
**Player height**: 1.6 world units (eye level within 2.0 wall)

**Map data format** (JSON):
```json
{
    "name": "Episode 1 - Floor 1",
    "width": 64,
    "height": 64,
    "tiles": [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 2, 2, 0, 0, 1],
        [1, 0, 2, 0, 0, 2, 0, 1]
    ],
    "tileTypes": {
        "0": "empty",
        "1": "wall_stone_grey",
        "2": "wall_stone_blue",
        "3": "wall_wood_panel",
        "10": "door_standard",
        "11": "door_locked_gold",
        "12": "door_locked_silver",
        "13": "door_elevator",
        "20": "pushwall_stone"
    },
    "entities": [
        { "type": "guard", "x": 5, "y": 3, "facing": "south", "patrol": [[5,3],[5,7]] },
        { "type": "item_medkit", "x": 10, "y": 8 },
        { "type": "player_start", "x": 2, "y": 2, "facing": "east" }
    ],
    "metadata": {
        "par_time": 90,
        "music_track": "e1m1_theme",
        "ceiling_color": "#383838",
        "floor_color": "#707070"
    }
}
```

### 4.2 Wall Rendering

**Approach**: Generate wall geometry at level load time from the tile map. Each wall face is a `THREE.PlaneGeometry` with a texture from the wall atlas.

```javascript
class LevelBuilder {
    buildWalls(tileMap) {
        const wallGeometries = new Map(); // Group by texture for batching

        for (let z = 0; z < tileMap.height; z++) {
            for (let x = 0; x < tileMap.width; x++) {
                const tile = tileMap.tiles[z][x];
                if (tile === 0) continue; // Empty space

                const textureName = tileMap.tileTypes[tile];

                // Only create faces that border empty space (optimization)
                if (this.isEmpty(x, z - 1)) this.addFace(wallGeometries, textureName, x, z, 'north');
                if (this.isEmpty(x, z + 1)) this.addFace(wallGeometries, textureName, x, z, 'south');
                if (this.isEmpty(x - 1, z)) this.addFace(wallGeometries, textureName, x, z, 'west');
                if (this.isEmpty(x + 1, z)) this.addFace(wallGeometries, textureName, x, z, 'east');
            }
        }

        // Merge geometries per texture into single BufferGeometry (massive draw call reduction)
        for (const [texture, faces] of wallGeometries) {
            const merged = BufferGeometryUtils.mergeGeometries(faces);
            const material = this.getMaterial(texture);
            const mesh = new THREE.Mesh(merged, material);
            this.scene.add(mesh);
        }
    }
}
```

**Key optimizations:**
- Only generate wall faces that border empty tiles (interior faces invisible, never rendered)
- Merge all faces sharing a texture into ONE draw call
- A typical 64x64 map with 10 texture types = ~10 draw calls for ALL walls

### 4.3 Wall Textures

Generate high-resolution wall textures via fal.ai, then pack into texture atlases.

**Texture types needed** (matching original Wolfenstein):

| Texture ID | Description | fal.ai Prompt |
|------------|-------------|---------------|
| `wall_stone_grey` | Grey stone blocks | "Seamless tileable grey stone block wall texture, castle dungeon, mortar between blocks, 512x512, game texture" |
| `wall_stone_blue` | Blue-grey stone | "Seamless tileable blue-grey stone wall texture, medieval castle, cold tones, 512x512, game texture" |
| `wall_wood_panel` | Dark wood paneling | "Seamless tileable dark wood wall paneling texture, WW2 office interior, rich brown oak, 512x512, game texture" |
| `wall_brick_red` | Red brick | "Seamless tileable red brick wall texture, old European building, white mortar lines, 512x512, game texture" |
| `wall_metal_plate` | Metal plating | "Seamless tileable riveted metal plate wall texture, industrial bunker, dark grey steel, 512x512, game texture" |
| `wall_purple_stone` | Purple stone (Episode 2) | "Seamless tileable dark purple stone wall texture, haunted castle, ominous, 512x512, game texture" |
| `wall_eagle_banner` | Wall with eagle banner | "Stone wall with large red banner hanging, black eagle emblem on red fabric, castle interior, 512x512, game texture" |
| `wall_cell_bars` | Prison cell bars | "Prison cell iron bars in stone wall frame, dungeon jail, dark rusty metal, visible dark cell behind, 512x512, game texture" |
| `door_wood` | Wooden door | "Heavy medieval wooden door with iron bands and lock, dark oak, arched top, castle interior, 512x512, game texture" |
| `door_elevator` | Elevator door | "Metal elevator doors with up/down indicator, industrial military bunker style, grey steel, 512x512, game texture" |

All textures rendered at 512x512, packed into 2048x2048 atlases (16 textures per atlas).

### 4.4 Floor and Ceiling Rendering

**Original approach**: Wolfenstein 3D used flat-colored floors and ceilings (no textures).

**Our approach**: Flat color by default (authentic) with optional textured mode.

```javascript
// Floor plane: single large plane covering the entire map
const floorGeo = new THREE.PlaneGeometry(mapWidth * TILE_SIZE, mapHeight * TILE_SIZE);
floorGeo.rotateX(-Math.PI / 2);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x707070,          // Original grey
    roughness: 0.9,
    metalness: 0.0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.y = 0;
floor.receiveShadow = true;

// Ceiling plane
const ceilGeo = new THREE.PlaneGeometry(mapWidth * TILE_SIZE, mapHeight * TILE_SIZE);
ceilGeo.rotateX(Math.PI / 2);
const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x383838,          // Original dark grey
    roughness: 1.0,
    metalness: 0.0
});
const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
ceiling.position.y = WALL_HEIGHT;
```

**Textured floor/ceiling mode (toggle):**
- Use a repeating stone/concrete texture
- UV mapping: 1 texture repeat per tile
- Adds visual quality but costs ~2 extra draw calls

### 4.5 Door Mechanics

Doors occupy a single tile and slide sideways when activated.

```javascript
class Door {
    constructor(x, z, type, orientation) {
        this.gridX = x;
        this.gridZ = z;
        this.type = type;              // 'standard', 'locked_gold', 'locked_silver', 'elevator'
        this.orientation = orientation; // 'ns' or 'ew' (north-south or east-west)
        this.state = 'closed';         // closed, opening, open, closing
        this.openTimer = 0;
        this.autoCloseDelay = 5.0;     // Seconds before auto-close
        this.slideProgress = 0;        // 0 = closed, 1 = fully open

        // Door mesh: thin box with door texture on both sides
        this.mesh = this.createMesh();
    }

    update(deltaTime) {
        switch (this.state) {
            case 'opening':
                this.slideProgress = Math.min(1, this.slideProgress + deltaTime * 2); // 0.5s open
                if (this.slideProgress >= 1) {
                    this.state = 'open';
                    this.openTimer = this.autoCloseDelay;
                }
                break;
            case 'open':
                this.openTimer -= deltaTime;
                if (this.openTimer <= 0 && !this.isPlayerInDoorway()) {
                    this.state = 'closing';
                }
                break;
            case 'closing':
                this.slideProgress = Math.max(0, this.slideProgress - deltaTime * 2);
                if (this.slideProgress <= 0) {
                    this.state = 'closed';
                }
                break;
        }
        this.updateMeshPosition();
    }
}
```

### 4.6 Push Walls (Secret Passages)

Secret walls look identical to adjacent walls. When the player presses "use" against them, they push backward 2 tiles, revealing a hidden passage.

```javascript
class PushWall {
    constructor(x, z, pushDirection) {
        this.gridX = x;
        this.gridZ = z;
        this.pushDirection = pushDirection; // 'north', 'south', 'east', 'west'
        this.activated = false;
        this.pushProgress = 0;  // 0 to 2 (tiles moved)
        this.targetDistance = 2 * TILE_SIZE;
    }

    activate() {
        if (this.activated) return;
        this.activated = true;
        // Update collision map: clear tiles behind pushwall
        this.game.collisionMap.clearTile(this.getTargetTile(1));
        this.game.collisionMap.clearTile(this.getTargetTile(2));
        // Play stone scraping sound
        this.game.audio.play('secret_wall', { volume: 0.8 });
        // Increment secret counter
        this.game.stats.secretsFound++;
    }

    update(deltaTime) {
        if (!this.activated || this.pushProgress >= this.targetDistance) return;
        const speed = TILE_SIZE * 0.8; // Takes ~2.5 seconds to fully open
        this.pushProgress = Math.min(this.targetDistance, this.pushProgress + speed * deltaTime);
        this.updateMeshPosition();

        // Update collision: original tile becomes passable when wall moves away
        if (this.pushProgress >= TILE_SIZE * 0.5) {
            this.game.collisionMap.clearTile(this.gridX, this.gridZ);
        }
    }
}
```

### 4.7 Hybrid Rendering: 3D Models vs Billboard Sprites

**Decision matrix:**

| Object | Rendering | Reason |
|--------|-----------|--------|
| Enemies | Full 3D models | Need animations, directional facing |
| Bosses | Full 3D models | Complex animations, destruction |
| Weapons (FPS) | 3D models on overlay | Need rotation/recoil animation |
| Tables, chairs | Full 3D models | Player walks around them, visible from angles |
| Barrels | Full 3D models | Physics interaction (exploding barrels) |
| Suit of armor | Full 3D model | Large, visible from all sides |
| Ceiling lamps | 3D model | Attach point light |
| Chandeliers | 3D model | Attach point light, visible from below |
| Skeletons | 3D model | Visible from multiple angles in corridors |
| Pickup items | 3D model with rotation | Small, 300-800 polys, rotation gives visual feedback |
| Wall torches | Billboard sprite + light | Flame is always camera-facing anyway |
| Blood pools | Decal (projected texture) | Flat on floor, no 3D needed |
| Bullet holes | Decal | Flat on walls |
| Explosion effects | Particle billboard | Classic billboard particle system |

---

## 5. Performance Budget

### 5.1 Frame Budget at 60fps

Total budget per frame: **16.67ms**

| Phase | Budget | Notes |
|-------|--------|-------|
| JavaScript game logic | 2ms | AI, physics, input, state |
| Scene graph updates | 1ms | Transform updates, animation mixers |
| Culling | 0.5ms | Frustum culling, occlusion |
| Draw calls | 4ms | Target < 100 draw calls |
| GPU rendering | 7ms | Geometry, textures, shading |
| Post-processing | 1.5ms | CRT filter, vignette |
| Buffer swap | 0.67ms | Present to screen |

### 5.2 LOD (Level of Detail) Strategy

```javascript
class LODManager {
    constructor() {
        this.thresholds = {
            high:   5,    // < 5 units: LOD0 (full detail)
            medium: 15,   // 5-15 units: LOD1 (50% polys)
            low:    30,   // 15-30 units: LOD2 (25% polys)
            cull:   40    // > 40 units: don't render (fog hides it)
        };
    }

    update(camera, entities) {
        for (const entity of entities) {
            const dist = camera.position.distanceTo(entity.position);
            if (dist > this.thresholds.cull) {
                entity.visible = false;
            } else if (dist > this.thresholds.low) {
                entity.setLOD(2);
                entity.visible = true;
            } else if (dist > this.thresholds.medium) {
                entity.setLOD(1);
                entity.visible = true;
            } else {
                entity.setLOD(0);
                entity.visible = true;
            }
        }
    }
}
```

Enemies beyond 40 units are completely hidden by fog and not rendered. In a maze environment, most enemies are within 15 units, so LOD2 is rarely used.

### 5.3 Texture Atlas Approach

```
textures/
  wall-atlas-0.png    (2048x2048, 16x 512x512 wall textures)
  wall-atlas-1.png    (2048x2048, 16x 512x512 wall textures)
  prop-atlas.png      (2048x2048, mixed prop textures)
  enemy-guard.png     (1024x1024, guard diffuse)
  enemy-ss.png        (1024x1024, SS soldier diffuse)
  ... (individual textures for enemies since they use unique UVs)
```

**Wall textures** are packed into atlases. UV coordinates for each wall face reference sub-rectangles within the atlas. This allows all walls of the same atlas to share a single material and be drawn in one call.

**Enemy textures** stay individual (each enemy has unique UV layout from Meshy).

**Texture compression:**
- Use KTX2 format with Basis Universal compression
- ~75% smaller than PNG/JPEG
- Hardware-decoded on GPU (no CPU overhead)
- Three.js `KTX2Loader` with `MeshoptDecoder`

### 5.4 Instance Rendering

For repeated objects (barrels, lamps, chairs), use `THREE.InstancedMesh`:

```javascript
// Example: 30 barrels in a level, all share one draw call
const barrelGeo = barrelModel.geometry;
const barrelMat = barrelModel.material;
const barrelInstances = new THREE.InstancedMesh(barrelGeo, barrelMat, 30);

for (let i = 0; i < barrelPositions.length; i++) {
    const matrix = new THREE.Matrix4();
    matrix.setPosition(barrelPositions[i]);
    // Optional: random Y rotation for variety
    matrix.multiply(new THREE.Matrix4().makeRotationY(Math.random() * Math.PI * 2));
    barrelInstances.setMatrixAt(i, matrix);
}

barrelInstances.instanceMatrix.needsUpdate = true;
scene.add(barrelInstances); // 1 draw call for all 30 barrels
```

**Instance candidates:**
| Object | Typical count per level | Draw calls saved |
|--------|------------------------|-----------------|
| Barrels | 10-30 | 9-29 |
| Ceiling lamps | 15-40 | 14-39 |
| Chairs | 5-20 | 4-19 |
| Tables | 3-10 | 2-9 |
| Wall torches | 10-25 | 9-24 |

### 5.5 Occlusion Culling for Maze Corridors

Wolfenstein's maze structure means most of the level is hidden behind walls at any given time. We exploit this aggressively.

**Strategy: Portal-based occlusion with frustum culling**

```javascript
class OcclusionSystem {
    constructor(levelData) {
        // Pre-compute room graph at level load
        this.rooms = this.identifyRooms(levelData);    // Flood-fill empty spaces
        this.portals = this.identifyPortals(levelData); // Doors/openings between rooms
        this.visibleRooms = new Set();
    }

    update(camera) {
        this.visibleRooms.clear();
        const playerRoom = this.getRoomAt(camera.position);
        this.visibleRooms.add(playerRoom);

        // BFS through portal graph -- only add rooms visible through portals
        const queue = [playerRoom];
        while (queue.length > 0) {
            const room = queue.shift();
            for (const portal of room.portals) {
                if (this.isPortalVisible(camera, portal)) {
                    const neighbor = portal.getOtherRoom(room);
                    if (!this.visibleRooms.has(neighbor)) {
                        this.visibleRooms.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
        }

        // Hide entities in non-visible rooms
        for (const entity of this.allEntities) {
            const entityRoom = this.getRoomAt(entity.position);
            entity.visible = this.visibleRooms.has(entityRoom);
        }
    }
}
```

**Expected performance gain**: In a typical Wolfenstein level, the player can only see 2-4 rooms at a time out of 20-40 total rooms. This culls 80-90% of entities from the render loop.

Additionally, Three.js built-in frustum culling handles the remaining visible objects that are outside the camera cone.

### 5.6 Performance Monitoring

Built-in performance overlay (toggle with F3):

```javascript
class PerformanceMonitor {
    constructor() {
        this.stats = {
            fps: 0,
            drawCalls: 0,
            triangles: 0,
            textures: 0,
            geometries: 0,
            visibleEntities: 0,
            totalEntities: 0,
            frameTime: 0
        };
    }

    update(renderer) {
        this.stats.drawCalls = renderer.info.render.calls;
        this.stats.triangles = renderer.info.render.triangles;
        this.stats.textures = renderer.info.memory.textures;
        this.stats.geometries = renderer.info.memory.geometries;
    }
}
```

**Performance targets:**

| Metric | Target | Red Flag |
|--------|--------|----------|
| FPS | 60 | < 45 |
| Draw calls | < 100 | > 200 |
| Triangles | < 250,000 | > 500,000 |
| Texture memory | < 256MB | > 512MB |
| JS heap | < 128MB | > 256MB |
| Frame time | < 16.67ms | > 22ms |

---

## 6. Post-Processing Effects

### 6.1 Effect Pipeline

Using Three.js `EffectComposer` with selective passes:

```javascript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);

// 1. Base render
composer.addPass(new RenderPass(scene, camera));

// 2. Bloom (muzzle flash glow, torch glow)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,   // Bloom strength (subtle)
    0.4,   // Radius
    0.85   // Threshold (only bright things bloom)
);
composer.addPass(bloomPass);

// 3. Damage vignette (conditional)
composer.addPass(damageVignettePass);

// 4. CRT filter (optional, toggle in settings)
if (settings.crtFilter) {
    composer.addPass(crtPass);
}
```

### 6.2 CRT / Retro Filter (Optional Toggle)

Custom shader that simulates a CRT monitor:

```glsl
// CRT Fragment Shader
uniform sampler2D tDiffuse;
uniform float time;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // 1. Barrel distortion (CRT curvature)
    vec2 center = uv - 0.5;
    float dist = dot(center, center);
    uv = uv + center * dist * 0.05;  // Subtle curvature

    // 2. Scanlines
    float scanline = sin(uv.y * resolution.y * 1.5) * 0.04;

    // 3. RGB offset (chromatic aberration at edges)
    float aberration = dist * 0.003;
    float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

    // 4. Slight vignette (darker corners)
    float vignette = 1.0 - dist * 0.5;

    // 5. Phosphor glow (subtle bloom on bright pixels)
    vec3 color = vec3(r, g, b);
    color -= scanline;
    color *= vignette;

    // 6. Film grain (very subtle noise)
    float grain = (fract(sin(dot(uv * time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
}
```

**Performance cost**: ~0.5ms per frame. Acceptable.

### 6.3 Damage Vignette

Red pulsing vignette when player takes damage:

```glsl
uniform float damageIntensity; // 0.0 to 1.0, decays over time

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Red vignette from edges
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float vignette = smoothstep(0.2, 0.7, dist);

    // Mix blood red into edges based on damage intensity
    vec3 bloodRed = vec3(0.8, 0.0, 0.0);
    color.rgb = mix(color.rgb, bloodRed, vignette * damageIntensity * 0.6);

    gl_FragColor = color;
}
```

- `damageIntensity` set to 1.0 on hit, decays via `intensity *= 0.92` per frame (~0.5s to fade)
- Multiple hits stack (capped at 1.0)

### 6.4 Muzzle Flash Lighting

Not a post-process -- this is a dynamic point light attached to the weapon:

```javascript
class MuzzleFlashEffect {
    constructor() {
        this.light = new THREE.PointLight(0xffaa44, 0, 8);
        this.light.castShadow = false; // Too expensive for a 2-frame effect
        this.flashDuration = 0.05;     // 50ms (3 frames at 60fps)
        this.timer = 0;
    }

    fire() {
        this.light.intensity = 3.0;
        this.timer = this.flashDuration;
        // Also spawn a small particle burst (8-12 spark particles)
        this.spawnSparks();
    }

    update(deltaTime) {
        if (this.timer > 0) {
            this.timer -= deltaTime;
            this.light.intensity = 3.0 * (this.timer / this.flashDuration);
        } else {
            this.light.intensity = 0;
        }
    }
}
```

Combined with the bloom pass, muzzle flashes create a satisfying bright glow that illuminates nearby walls.

### 6.5 Screen Shake

```javascript
class ScreenShake {
    constructor(camera) {
        this.camera = camera;
        this.trauma = 0;         // 0 to 1
        this.maxAngle = 0.05;    // Max rotation in radians
        this.maxOffset = 0.1;    // Max position offset
        this.decayRate = 0.9;    // Per-frame multiplier
    }

    addTrauma(amount) {
        this.trauma = Math.min(1, this.trauma + amount);
    }

    update() {
        if (this.trauma <= 0.001) {
            this.trauma = 0;
            return;
        }

        const shake = this.trauma * this.trauma; // Quadratic falloff feels better
        const offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
        const offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
        const angle   = (Math.random() * 2 - 1) * this.maxAngle * shake;

        this.camera.position.x += offsetX;
        this.camera.position.y += offsetY;
        this.camera.rotation.z = angle;

        this.trauma *= this.decayRate;
    }
}
```

**Shake triggers:**
| Event | Trauma Amount | Notes |
|-------|-------------|-------|
| Player fires chaingun | 0.05 | Subtle, continuous |
| Player takes hit | 0.15 | Noticeable |
| Explosion nearby | 0.4 | Strong |
| Boss footstep | 0.1 | Rhythmic |
| Boss death | 0.6 | Dramatic |
| Mech suit destruction | 0.8 | Maximum chaos |

### 6.6 Boss Death Cinematic Camera

When a boss dies, the game enters a brief cinematic mode:

```javascript
class BossDeathCinematic {
    play(boss) {
        // 1. Freeze player input
        this.game.inputEnabled = false;

        // 2. Slow motion (0.3x speed for 2 seconds)
        this.game.timeScale = 0.3;

        // 3. Camera orbits the dying boss
        const orbitCenter = boss.position.clone();
        const orbitRadius = 5;
        let orbitAngle = Math.atan2(
            this.camera.position.z - boss.position.z,
            this.camera.position.x - boss.position.x
        );

        const cinematic = {
            duration: 3.0,  // Real-time seconds
            elapsed: 0,
            update: (dt) => {
                cinematic.elapsed += dt;
                const t = cinematic.elapsed / cinematic.duration;

                // Orbit camera around boss
                orbitAngle += dt * 0.5;
                this.camera.position.x = orbitCenter.x + Math.cos(orbitAngle) * orbitRadius;
                this.camera.position.z = orbitCenter.z + Math.sin(orbitAngle) * orbitRadius;
                this.camera.position.y = 1.6 + t * 0.5; // Slight upward drift
                this.camera.lookAt(orbitCenter);

                // Zoom bloom intensity during death
                this.bloomPass.strength = 0.3 + t * 0.7;

                if (t >= 1.0) {
                    // Return to normal
                    this.game.timeScale = 1.0;
                    this.game.inputEnabled = true;
                    this.bloomPass.strength = 0.3;
                }
            }
        };

        this.game.addCinematic(cinematic);
    }
}
```

---

## 7. File Structure

```
wolfenstein-3d/
  index.html                    # Entry point
  package.json                  # Vite + Three.js dependencies
  vite.config.js                # Build configuration

  src/
    main.js                     # Bootstrap, game loop

    engine/
      Renderer.js               # Three.js WebGL setup, render loop
      Camera.js                 # Camera controls, classic/modern modes
      InputManager.js           # Keyboard, mouse, pointer lock
      AudioManager.js           # Web Audio API, spatial audio
      AssetLoader.js            # GLTF/KTX2/audio loading + caching
      Physics.js                # Grid-based collision, raycasting

    game/
      Game.js                   # Main game state machine
      Player.js                 # Player entity (health, ammo, weapons, keys)
      Enemy.js                  # Base enemy class
      EnemyTypes.js             # Guard, SS, Officer, Dog, Mutant definitions
      BossTypes.js              # All 6 boss definitions with phase logic
      Weapon.js                 # Weapon base class
      WeaponTypes.js            # Knife, Luger, MP40, Chaingun
      Item.js                   # Pickup items (health, ammo, treasure, keys)
      Door.js                   # Door mechanics (standard, locked, elevator)
      PushWall.js               # Secret wall mechanics

    level/
      LevelBuilder.js           # Construct 3D scene from tile map
      LevelData.js              # Level definitions (64x64 maps)
      CollisionMap.js           # 2D grid collision for movement
      OcclusionSystem.js        # Room/portal visibility culling

    animation/
      AnimationManager.js       # Central animation coordinator
      AnimationStateMachine.js  # FSM for entity animation states
      WeaponAnimator.js         # FPS weapon bob, recoil, sway
      DoorAnimator.js           # Door slide animations
      ProceduralAnimations.js   # Item rotation, torch flicker, etc.

    effects/
      PostProcessing.js         # EffectComposer setup
      CRTShader.js              # CRT filter shader
      DamageVignette.js         # Red damage overlay
      MuzzleFlash.js            # Muzzle flash light + particles
      ScreenShake.js            # Camera shake system
      ParticleSystem.js         # Blood, sparks, debris, explosions
      BossDeathCinematic.js     # Boss death camera sequence

    ui/
      HUD.js                    # Health, ammo, face, score, keys, weapon
      MenuSystem.js             # Main menu, pause, settings
      MessageSystem.js          # In-game messages (level name, secrets)

    data/
      episodes/
        e1m1.json               # Episode 1, Map 1
        e1m2.json
        ...
        e6m9.json               # Episode 6, Map 9 (+ secret levels)
      config.json               # Default game settings

  assets/
    models/
      enemies/
        guard/                  # guard-lod0.glb, guard-lod1.glb, guard-lod2.glb
        ss-soldier/
        officer/
        dog/
        mutant/
      bosses/
        hans-grosse/
        dr-schabbs/
        hitler-mech/
        hitler/
        otto-giftmacher/
        gretel-grosse/
        general-fettgesicht/
      weapons/
        knife.glb
        luger.glb
        mp40.glb
        chaingun.glb
      props/
        table.glb
        chair.glb
        barrel.glb
        armor-suit.glb
        skeleton.glb
        chandelier.glb
        ceiling-lamp.glb
        floor-lamp.glb
        wall-torch.glb
        flag-stand.glb
      pickups/
        medkit.glb
        turkey.glb
        dogfood.glb
        cross.glb
        chalice.glb
        chest.glb
        crown.glb
        key-gold.glb
        key-silver.glb

    textures/
      walls/
        wall-atlas-0.ktx2
        wall-atlas-1.ktx2
      floors/
        floor-concrete.ktx2
      props/
        prop-atlas.ktx2
      ui/
        hud-face-sprites.png    # BJ face at different health levels
        hud-weapon-icons.png

    audio/
      sfx/
        pistol-fire.mp3
        mp40-fire.mp3
        chaingun-fire.mp3
        knife-slash.mp3
        door-open.mp3
        door-close.mp3
        secret-wall.mp3
        item-pickup.mp3
        treasure-pickup.mp3
        enemy-pain.mp3
        enemy-death.mp3
        dog-bark.mp3
        dog-yelp.mp3
        boss-taunt-hans.mp3
        player-pain.mp3
        player-death.mp3
        elevator.mp3
        explosion.mp3
      music/
        e1m1-theme.mp3
        e1m2-theme.mp3
        ...
        boss-theme.mp3
        victory-theme.mp3
        menu-theme.mp3

  scripts/
    generate-assets.sh          # Batch Meshy + fal.ai asset generation
    optimize-models.sh          # gltf-transform optimization pipeline
    build-texture-atlas.sh      # Pack wall textures into atlases

  asset-manifest.json           # Registry of all generated assets + metadata
```

---

## 8. Implementation Phases

### Phase 1: Core Engine (Week 1-2)
- Three.js renderer with WebGL 2.0 setup
- Camera system (classic + modern mode toggle)
- Input manager with pointer lock
- Grid-based level builder (walls, floor, ceiling from JSON)
- Basic collision detection (grid-based, player only)
- Placeholder textures (solid colors matching original)
- **Deliverable**: Walk through a test level with textured walls

### Phase 2: Doors and Secrets (Week 2-3)
- Door system (standard, locked, elevator)
- Push wall secrets
- Collision map updates for doors/push walls
- Door/push wall animations
- **Deliverable**: Fully navigable level with doors and secrets

### Phase 3: Weapons and Combat (Week 3-4)
- FPS weapon rendering (overlay scene)
- Weapon animator (bob, recoil, sway)
- Weapon types (knife, luger, mp40, chaingun)
- Hitscan raycasting for bullet hits
- Muzzle flash effects
- Ammo/weapon pickup system
- **Deliverable**: Shoot walls with visual/audio feedback

### Phase 4: Enemies (Week 4-6)
- Enemy base class with state machine
- Guard, SS, Officer, Dog, Mutant types
- Enemy AI (patrol, detect, attack, flee)
- Enemy pathfinding (A* on grid)
- Enemy animations (idle, walk, attack, pain, death)
- Meshy v6 model generation for all 5 enemy types
- LOD system
- **Deliverable**: Combat encounters with multiple enemy types

### Phase 5: Bosses (Week 6-7)
- Boss base class (multi-phase)
- All 6 bosses with unique behavior
- Hitler mech suit destruction sequence
- Boss death cinematic camera
- Boss-specific arenas and triggers
- **Deliverable**: All boss fights playable

### Phase 6: Level Design (Week 7-9)
- Port original Wolfenstein 3D map data (public domain map layouts)
- All 60 levels (6 episodes x 10 levels each)
- Place enemies, items, secrets per original design
- Elevator transitions between levels
- Episode progression and scoring
- **Deliverable**: Full game playable start to finish

### Phase 7: Polish (Week 9-10)
- Post-processing pipeline (CRT, bloom, vignette)
- Screen shake system
- Particle effects (blood, sparks, explosions)
- Lighting pass (torches, ceiling lamps, dynamic lights)
- Wall textures via fal.ai (all texture types)
- Prop models via Meshy (tables, barrels, etc.)
- Occlusion culling system
- Performance optimization pass
- **Deliverable**: Visually polished, performant game

### Phase 8: Audio and UI (Week 10-11)
- Sound effects (ElevenLabs for voices, library SFX for weapons)
- Music system (background tracks per level)
- HUD (health, ammo, face, score, keys, weapon)
- Menu system (main menu, pause, settings)
- Settings (resolution, CRT filter, classic/modern controls, volume)
- **Deliverable**: Complete audiovisual experience

### Phase 9: Testing and Deployment (Week 11-12)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile touch controls (optional stretch goal)
- Performance profiling on low-end hardware
- Deploy to theuws.com/games/wolfenstein-3d/
- Update landing page, INVENTORY.md
- **Deliverable**: LIVE on production

---

## Appendix A: Original Wolfenstein 3D Reference Data

| Property | Original Value | Our Implementation |
|----------|---------------|-------------------|
| Resolution | 320x200 | 640x400 (2x) upscaled, or native |
| Tile size | 64x64 pixels | 2.0 world units |
| Map size | 64x64 tiles | 64x64 tiles (identical) |
| Wall height | Equal to tile width | 2.0 world units |
| Player speed | ~70 map units/sec | 5.0 world units/sec |
| Door open time | ~4 seconds | 5.0 seconds auto-close |
| Episodes | 6 (+ 3 Nocturnal Missions) | 6 episodes |
| Levels per episode | 10 (8 + 2 secret) | 10 per episode |
| Enemy types | 12 | 12 (all faithful) |
| Weapons | 4 | 4 (knife, pistol, mp40, chaingun) |
| Max enemies per level | ~100 | ~80 (3D model budget) |
| Framerate | ~70fps on 386 | 60fps target |

## Appendix B: Meshy v6 API Reference

**Endpoint**: `https://api.meshy.ai/openapi/v2/text-to-3d`

**Authentication**: Bearer token from `.env` as `MESHY_API_KEY`

**Sync call** (recommended):
```bash
source ~/Documents/games/.env
curl -X POST "https://api.meshy.ai/openapi/v2/text-to-3d" \
  -H "Authorization: Bearer $MESHY_API_KEY" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

**Standard payload template:**
```json
{
    "mode": "preview",
    "prompt": "<detailed prompt>",
    "art_style": "realistic",
    "should_remesh": true,
    "target_polycount": 8000,
    "topology": "quad",
    "enable_rigging": true
}
```

**Important Meshy v6 gotchas** (from project experience):
- ALWAYS use `art_style: "realistic"` -- it is the only style that produces usable output
- Use synchronous endpoint `fal.run` (not `queue.fal.run`) for reliable results
- Write large payloads to a temp file and use `-d @file` to avoid shell escaping issues
- Save thumbnails for asset preview/review before committing to full generation
- `target_polycount` is approximate; actual output may vary +/- 20%

---

**Document Status**: Complete, ready for implementation.
**Next Step**: Create project folder, initialize Vite + Three.js, begin Phase 1 (Core Engine).
