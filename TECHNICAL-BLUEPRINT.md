# Wolfenstein 3D Remake -- Technical Blueprint

**Version**: 0.1.0
**Engine**: Three.js (WebGL)
**Platform**: Browser (Desktop + Mobile)
**Author**: Game Master (Claude) + Richard Theuws
**Date**: 2026-03-30

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Core Engine Modules](#3-core-engine-modules)
4. [Game Logic Modules](#4-game-logic-modules)
5. [UI System](#5-ui-system)
6. [Audio System](#6-audio-system)
7. [Level Format Specification](#7-level-format-specification)
8. [Asset Pipeline](#8-asset-pipeline)
9. [Module Dependency Graph](#9-module-dependency-graph)
10. [Key Algorithms](#10-key-algorithms)
11. [Performance Strategy](#11-performance-strategy)
12. [Development Phases](#12-development-phases)
13. [Technical Constraints & Decisions](#13-technical-constraints--decisions)

---

## 1. Architecture Overview

### Design Philosophy

The engine follows the original Wolfenstein 3D's design constraints as creative guardrails, then
selectively breaks them where modern web tech provides clear wins:

| Aspect | Original (1992) | Our Remake |
|--------|-----------------|------------|
| Rendering | Software raycaster | Three.js WebGL |
| Grid | 64x64 tile map | Same -- JSON-based |
| Vertical look | None (horizontal only) | Optional toggle |
| Floor/ceiling | Flat color fills | Textured planes |
| Sprites | 2D billboards | 2D billboards (authentic) + optional 3D models for bosses |
| Lighting | None (uniform) | Per-tile ambient + dynamic muzzle flash + fog |
| Audio | AdLib/SoundBlaster | Web Audio API + ElevenLabs voices + Suno music |
| Resolution | 320x200 | Responsive, with optional CRT post-processing |

### Module Architecture

The codebase uses ES6 modules with no build step required (plain HTML/JS, matching the portfolio
convention for 26 of 29 games). Three.js is loaded from CDN via import maps.

```
                    +-----------+
                    |  main.js  |  Entry point, boot sequence
                    +-----+-----+
                          |
          +---------------+---------------+
          |               |               |
    +-----v-----+  +-----v-----+  +------v------+
    |   engine/  |  |   game/   |  |    ui/      |
    | renderer   |  | state     |  | hud         |
    | level      |  | player    |  | menu        |
    | collision  |  | enemies   |  | cinematics  |
    | input      |  | weapons   |  | loading     |
    +-----+------+  | scoring   |  +-------------+
          |         | doors     |
    +-----v-----+  +-----+-----+
    |  audio/   |        |
    | manager   |  +-----v-----+
    | sfx       |  |  utils/   |
    | music     |  | math      |
    | voice     |  | pool      |
    +-----------+  | constants |
                   | events    |
                   +-----------+
```

---

## 2. Project Structure

```
wolfenstein3d/
├── index.html                  # Entry point -- loads main.js via import map
├── css/
│   └── styles.css              # HUD, menus, loading screen, CRT overlay
├── js/
│   ├── main.js                 # Boot sequence, game loop orchestration
│   ├── engine/
│   │   ├── renderer.js         # Three.js scene, camera, post-processing
│   │   ├── level-loader.js     # Parse level JSON, build geometry
│   │   ├── collision.js        # Grid-based AABB collision
│   │   └── input.js            # Keyboard, mouse, pointer lock, touch
│   ├── game/
│   │   ├── player-controller.js# FPS movement, interaction, health
│   │   ├── enemy-ai.js         # State machine, pathfinding, sight
│   │   ├── enemy-types.js      # Guard, SS, Officer, Dog, Mutant, Boss stats
│   │   ├── weapon-system.js    # Weapon class, hitscan, ammo, switching
│   │   ├── door-system.js      # Door types, animations, keys
│   │   ├── pickup-system.js    # Health, ammo, treasure, keys, extra lives
│   │   ├── game-state.js       # Player stats, level state, save/load
│   │   ├── scoring.js          # Kill/secret/treasure %, time, high scores
│   │   └── difficulty.js       # 4 difficulty presets with multipliers
│   ├── ui/
│   │   ├── hud.js              # Bottom status bar, BJ face, weapon display
│   │   ├── menu.js             # Main menu, pause, options, episode select
│   │   ├── cinematics.js       # Level transitions, boss intros, death cam
│   │   └── loading.js          # Asset loading progress bar
│   ├── audio/
│   │   ├── audio-manager.js    # Web Audio API context, master bus
│   │   ├── sfx-player.js       # Positional SFX, pooling
│   │   ├── music-player.js     # Background music with crossfade
│   │   └── voice-player.js     # ElevenLabs voice line queuing
│   └── utils/
│       ├── math.js             # Grid conversions, angle helpers, lerp
│       ├── object-pool.js      # Reusable object pools (bullets, particles)
│       ├── constants.js        # Game-wide constants (tile size, speeds)
│       ├── event-bus.js        # Pub/sub event system
│       └── save-manager.js     # localStorage save/load with versioning
├── assets/
│   ├── models/                 # Meshy 3D models (.glb) -- bosses, decorations
│   ├── textures/
│   │   ├── walls/              # Flux-generated wall textures (stone, brick, metal, flag)
│   │   ├── floors/             # Floor textures
│   │   ├── ceilings/           # Ceiling textures
│   │   ├── doors/              # Door textures (normal, gold, silver, elevator)
│   │   └── decorations/        # Barrels, tables, lights, etc.
│   ├── sprites/
│   │   ├── enemies/            # Enemy billboard sheets (8 angles x states)
│   │   ├── weapons/            # First-person weapon frames
│   │   ├── pickups/            # Health, ammo, treasure items
│   │   └── props/              # Billboarded decorations (plants, armor, etc.)
│   ├── audio/
│   │   ├── music/              # Suno-generated tracks per episode
│   │   ├── sfx/                # Gunshots, doors, pickups, pain, death
│   │   └── voices/             # ElevenLabs -- boss taunts, BJ lines, narrator
│   ├── levels/                 # Level JSON files (e1m1.json, e1m2.json, ...)
│   └── ui/
│       ├── hud/                # BJ face sprites (health states), weapon HUD
│       ├── fonts/              # Retro pixel font (bitmap or WOFF2)
│       └── menus/              # Menu backgrounds, button styles
├── scripts/
│   ├── generate-textures.sh    # Batch Flux texture generation
│   ├── generate-sprites.sh     # Batch Flux sprite generation
│   ├── generate-models.sh      # Batch Meshy 3D model generation
│   └── generate-audio.sh       # Batch ElevenLabs/Suno generation
└── docs/
    ├── TECHNICAL-BLUEPRINT.md  # This file
    ├── LEVEL-DESIGN-GUIDE.md   # How to author level JSON files
    └── ASSET-MANIFEST.md       # Required assets checklist
```

### Import Map (in index.html)

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/"
  }
}
</script>
<script type="module" src="js/main.js"></script>
```

This approach requires zero build tooling -- files are directly deployable via FTP, matching the
portfolio convention.

---

## 3. Core Engine Modules

### 3.1 renderer.js -- Three.js Rendering Engine

**Responsibilities**: Scene setup, camera, lighting, post-processing, render loop.

```javascript
// Key exports
export class Renderer {
    constructor(canvas)
    setupScene()           // Scene, fog, ambient light
    setupCamera()          // PerspectiveCamera, FOV 75, aspect auto
    setupPostProcessing()  // EffectComposer pipeline
    createMuzzleFlash()    // Point light at camera position
    render(deltaTime)      // Called every frame
    resize()               // Handle viewport changes
    dispose()              // Clean up GPU resources
}
```

**Implementation Notes**:

```javascript
// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.08); // Exponential fog for dungeon atmosphere
scene.background = new THREE.Color(0x1a1a2e);   // Dark blue-gray

// Camera -- classic FPS feel
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
camera.position.y = PLAYER_EYE_HEIGHT; // 0.6 (of 1.0 tile height) -- Wolfenstein scale

// Renderer config
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,          // Crisp pixels, retro feel
    powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for perf
renderer.shadowMap.enabled = false;  // No shadows in Wolfenstein (flat lighting)
renderer.outputColorSpace = THREE.SRGBColorSpace;
```

**Post-Processing Pipeline** (optional, togglable):

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Pipeline: Render -> Bloom (subtle) -> Vignette -> CRT (optional)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Subtle bloom for muzzle flash and glowing items
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.3,   // strength -- subtle
    0.4,   // radius
    0.85   // threshold -- only bright things bloom
);
composer.addPass(bloomPass);

// Custom vignette shader
const vignettePass = new ShaderPass(VignetteShader);
composer.addPass(vignettePass);

// Optional CRT scanline shader (user toggle)
const crtPass = new ShaderPass(CRTShader);
crtPass.enabled = false; // Off by default
composer.addPass(crtPass);
```

**CRT Shader** (custom):

```glsl
// Fragment shader for CRT effect
uniform sampler2D tDiffuse;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Scanlines
    float scanline = sin(uv.y * resolution.y * 1.5) * 0.04;

    // Slight barrel distortion
    vec2 center = uv - 0.5;
    float dist = dot(center, center);
    uv += center * dist * 0.05;

    vec4 color = texture2D(tDiffuse, uv);
    color.rgb -= scanline;

    // Vignette
    float vignette = 1.0 - dist * 1.5;
    color.rgb *= vignette;

    gl_FragColor = color;
}
```

**Lighting Strategy**:

Unlike modern shooters, Wolfenstein used uniform lighting. We enhance slightly:

- **AmbientLight** (0x606060, intensity 0.8) -- base illumination, every tile visible
- **Muzzle flash** -- PointLight at camera pos, intensity 2.0, decay 2, range 8 tiles, duration 50ms
- **Fog** -- FogExp2 for depth perception (not darkness, just atmospheric)
- No shadows (authentic + massive performance win)

### 3.2 level-loader.js -- Level System

**Responsibilities**: Parse JSON level data, generate Three.js geometry, manage level lifecycle.

```javascript
export class LevelLoader {
    constructor(renderer)
    async loadLevel(levelId)       // e.g., 'e1m1' -> fetch assets/levels/e1m1.json
    buildGeometry(levelData)       // Generate all walls, floors, ceilings
    buildWalls(wallGrid)           // Instanced mesh for walls
    buildFloorCeiling(width, height) // Two large planes with UV tiling
    placeDoors(doors)              // Interactive door objects
    placeEntities(entities)        // Spawn enemies at positions
    placePickups(pickups)          // Place collectible items
    placeSecrets(secrets)          // Mark pushable wall segments
    placeDecorations(decorations)  // Static props (barrels, tables, etc.)
    unloadLevel()                  // Dispose all geometry, free memory
    getTileAt(gridX, gridZ)        // Query wall data at grid position
    isWalkable(gridX, gridZ)       // Can player/enemy walk here?
}
```

**Wall Generation Strategy -- Instanced Meshes**:

The key performance optimization. Instead of creating individual Box meshes for each wall tile
(which could be 4000+ tiles), we use InstancedMesh grouped by texture:

```javascript
buildWalls(wallGrid) {
    // Group walls by texture type for instancing
    const wallsByTexture = new Map(); // textureId -> [{x, z, faces}]

    for (let z = 0; z < this.height; z++) {
        for (let x = 0; x < this.width; x++) {
            const wallType = wallGrid[z][x];
            if (wallType === 0) continue; // Empty space

            // Only create faces adjacent to empty spaces (culling)
            const faces = this.getExposedFaces(wallGrid, x, z);
            if (faces.length === 0) continue;

            if (!wallsByTexture.has(wallType)) {
                wallsByTexture.set(wallType, []);
            }
            wallsByTexture.set(wallType, { x, z, faces });
        }
    }

    // Create one InstancedMesh per texture type
    for (const [textureId, positions] of wallsByTexture) {
        const geometry = new THREE.PlaneGeometry(TILE_SIZE, WALL_HEIGHT);
        const material = new THREE.MeshLambertMaterial({
            map: this.textures.get(textureId)
        });

        // Count total faces needed
        const totalFaces = positions.reduce((sum, p) => sum + p.faces.length, 0);
        const mesh = new THREE.InstancedMesh(geometry, material, totalFaces);

        let instanceIndex = 0;
        const dummy = new THREE.Object3D();

        for (const { x, z, faces } of positions) {
            for (const face of faces) {
                // Position and rotate the face plane
                dummy.position.set(
                    x * TILE_SIZE + TILE_SIZE / 2,
                    WALL_HEIGHT / 2,
                    z * TILE_SIZE + TILE_SIZE / 2
                );
                // Offset and rotate based on face direction (N/S/E/W)
                this.orientFace(dummy, face);
                dummy.updateMatrix();
                mesh.setMatrixAt(instanceIndex++, dummy.matrix);
            }
        }

        mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(mesh);
        this.wallMeshes.push(mesh);
    }
}
```

**Face Culling**: Only generate wall faces that border empty space. A wall tile surrounded by 4
other walls on all sides generates zero faces. This typically reduces face count by 60-80%.

**Floor and Ceiling**: Two large PlaneGeometry instances with repeated textures:

```javascript
buildFloorCeiling(width, height) {
    const planeGeo = new THREE.PlaneGeometry(
        width * TILE_SIZE,
        height * TILE_SIZE
    );

    // Floor
    const floorMat = new THREE.MeshLambertMaterial({
        map: this.textures.get('floor'),
        side: THREE.FrontSide
    });
    floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping;
    floorMat.map.repeat.set(width, height);

    const floor = new THREE.Mesh(planeGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(width * TILE_SIZE / 2, 0, height * TILE_SIZE / 2);
    this.scene.add(floor);

    // Ceiling (same but flipped and at wall height)
    const ceilMat = new THREE.MeshLambertMaterial({
        map: this.textures.get('ceiling'),
        side: THREE.FrontSide
    });
    ceilMat.map.wrapS = ceilMat.map.wrapT = THREE.RepeatWrapping;
    ceilMat.map.repeat.set(width, height);

    const ceiling = new THREE.Mesh(planeGeo.clone(), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(width * TILE_SIZE / 2, WALL_HEIGHT, height * TILE_SIZE / 2);
    this.scene.add(ceiling);
}
```

### 3.3 collision.js -- Grid-Based Physics

**Responsibilities**: Player-wall collision, hitscan raycasting, pickup detection, door zones.

```javascript
export class CollisionSystem {
    constructor(levelLoader)
    setLevel(levelData)                         // Cache wall grid reference
    checkPlayerMovement(position, velocity)     // Returns adjusted velocity
    slideAlongWall(position, velocity, normal)  // Wall sliding
    hitscanRay(origin, direction, maxDist)      // Weapon raycasting
    checkPickupRadius(position, radius)         // Nearby pickups
    checkDoorInteraction(position, direction)   // Door in front of player?
    checkEnemyCollision(position, radius)       // Player touching enemy?
    isPositionWalkable(worldX, worldZ)          // World coords -> grid check
    worldToGrid(worldX, worldZ)                 // Convert world -> grid coords
    gridToWorld(gridX, gridZ)                   // Convert grid -> world center
}
```

**Grid-Based Collision Algorithm**:

The original Wolfenstein used grid-based collision, which is vastly simpler and faster than general
3D physics. We replicate this:

```javascript
checkPlayerMovement(position, desiredVelocity) {
    const PLAYER_RADIUS = 0.25; // In tile units (1 tile = 1.0)
    const newX = position.x + desiredVelocity.x;
    const newZ = position.z + desiredVelocity.z;

    // Resolve X and Z independently for wall sliding
    let finalVelX = desiredVelocity.x;
    let finalVelZ = desiredVelocity.z;

    // Check X movement
    if (desiredVelocity.x !== 0) {
        const checkX = newX + Math.sign(desiredVelocity.x) * PLAYER_RADIUS;
        const gridX = Math.floor(checkX / TILE_SIZE);
        const gridZMin = Math.floor((position.z - PLAYER_RADIUS) / TILE_SIZE);
        const gridZMax = Math.floor((position.z + PLAYER_RADIUS) / TILE_SIZE);

        for (let gz = gridZMin; gz <= gridZMax; gz++) {
            if (!this.isWalkable(gridX, gz)) {
                finalVelX = 0; // Block X movement, allow Z (wall sliding)
                break;
            }
        }
    }

    // Check Z movement (same pattern, independent axis)
    if (desiredVelocity.z !== 0) {
        const adjustedX = position.x + finalVelX;
        const checkZ = newZ + Math.sign(desiredVelocity.z) * PLAYER_RADIUS;
        const gridZ = Math.floor(checkZ / TILE_SIZE);
        const gridXMin = Math.floor((adjustedX - PLAYER_RADIUS) / TILE_SIZE);
        const gridXMax = Math.floor((adjustedX + PLAYER_RADIUS) / TILE_SIZE);

        for (let gx = gridXMin; gx <= gridXMax; gx++) {
            if (!this.isWalkable(gx, gridZ)) {
                finalVelZ = 0;
                break;
            }
        }
    }

    return { x: finalVelX, z: finalVelZ };
}
```

**Hitscan Raycasting** (for weapons):

```javascript
hitscanRay(origin, direction, maxDistance = 64) {
    // DDA (Digital Differential Analyzer) on the tile grid
    // Same algorithm as the original Wolfenstein raycaster, but used for hit detection

    const gridX = Math.floor(origin.x / TILE_SIZE);
    const gridZ = Math.floor(origin.z / TILE_SIZE);

    const stepX = direction.x > 0 ? 1 : -1;
    const stepZ = direction.z > 0 ? 1 : -1;

    // Distance to next grid line
    const tDeltaX = Math.abs(TILE_SIZE / direction.x);
    const tDeltaZ = Math.abs(TILE_SIZE / direction.z);

    let tMaxX = /* distance to first X grid line */;
    let tMaxZ = /* distance to first Z grid line */;

    let currentGridX = gridX;
    let currentGridZ = gridZ;
    let distance = 0;

    while (distance < maxDistance) {
        // Check for enemy at current grid cell
        const enemy = this.getEnemyAtGrid(currentGridX, currentGridZ);
        if (enemy && this.rayIntersectsEnemy(origin, direction, enemy)) {
            return { hit: true, type: 'enemy', target: enemy, distance };
        }

        // Step to next grid cell (DDA)
        if (tMaxX < tMaxZ) {
            tMaxX += tDeltaX;
            currentGridX += stepX;
            distance = tMaxX - tDeltaX;
        } else {
            tMaxZ += tDeltaZ;
            currentGridZ += stepZ;
            distance = tMaxZ - tDeltaZ;
        }

        // Check wall
        if (!this.isWalkable(currentGridX, currentGridZ)) {
            return { hit: true, type: 'wall', gridX: currentGridX, gridZ: currentGridZ, distance };
        }
    }

    return { hit: false };
}
```

### 3.4 input.js -- Input Management

**Responsibilities**: Keyboard state, mouse movement, pointer lock, touch controls.

```javascript
export class InputManager {
    constructor()
    init(canvas)                    // Attach event listeners
    requestPointerLock()            // Enter FPS mouse mode
    isKeyDown(key)                  // Poll key state (for movement)
    wasKeyPressed(key)              // Single-press detection (for actions)
    getMouseDelta()                 // Mouse movement since last frame
    resetMouseDelta()               // Called after processing
    getMovementVector()             // WASD -> normalized {x, z} vector
    isSprinting()                   // Shift held?
    initTouchControls(container)    // Create virtual joystick + buttons
    dispose()                       // Remove all listeners
}
```

**Keyboard State Map**:

```javascript
// Uses a Set for O(1) lookup, not individual booleans
this.keysDown = new Set();
this.keysPressed = new Set(); // Cleared each frame

document.addEventListener('keydown', (e) => {
    if (!this.keysDown.has(e.code)) {
        this.keysPressed.add(e.code); // First press only
    }
    this.keysDown.add(e.code);
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    this.keysDown.delete(e.code);
});
```

**Pointer Lock**:

```javascript
requestPointerLock() {
    this.canvas.requestPointerLock();
}

// Mouse movement (raw, no smoothing -- crisp FPS feel)
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== this.canvas) return;
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY; // Only used if vertical look enabled
});
```

**Mobile Virtual Joystick** (implementation outline):

```javascript
initTouchControls(container) {
    // Left side: movement joystick (thumb drag)
    this.joystick = new VirtualJoystick(container, {
        zone: 'left',   // Left 40% of screen
        mode: 'dynamic'  // Appears where thumb touches
    });

    // Right side: look (swipe to aim)
    this.lookZone = container.querySelector('.look-zone');
    this.lookZone.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        this.mouseDeltaX += touch.clientX - this.lastTouchX;
        this.lastTouchX = touch.clientX;
    });

    // Tap right side = shoot
    this.lookZone.addEventListener('touchstart', () => {
        this.firePressed = true;
    });

    // Buttons: interact, weapon switch
    this.createButton('interact-btn', 'E', { right: '20px', bottom: '120px' });
    this.createButton('weapon-btn', '>', { right: '20px', bottom: '60px' });
}
```

---

## 4. Game Logic Modules

### 4.1 player-controller.js -- FPS Player

**Responsibilities**: Movement, looking, interaction, health/damage, weapon switching.

```javascript
export class PlayerController {
    constructor(camera, inputManager, collisionSystem)

    // Movement
    update(deltaTime)               // Main update: move, look, bob
    applyMovement(deltaTime)        // WASD -> velocity -> collision check -> position
    applyMouseLook(deltaTime)       // Horizontal rotation (+ optional vertical)
    applyWeaponBob(deltaTime)       // Sin-wave camera bob while moving

    // Actions
    interact()                      // Open door / push secret wall
    fire()                          // Delegate to weapon system

    // Damage
    takeDamage(amount, source)      // Reduce health, flash screen, face reaction
    heal(amount)                    // Cap at 100 (or 200 with medkit stacking off)
    addArmor(amount)                // Damage reduction
    die()                           // Trigger death sequence
    respawn(position, angle)        // Reset for new life / level start

    // State queries
    getPosition()                   // World position
    getGridPosition()               // Tile coordinates
    getForwardDirection()           // Facing direction vector
    isAlive()
}
```

**Movement Implementation**:

```javascript
applyMovement(deltaTime) {
    const input = this.inputManager.getMovementVector(); // {x, z} normalized
    if (input.x === 0 && input.z === 0) {
        this.isMoving = false;
        return;
    }
    this.isMoving = true;

    // Transform input to world direction based on camera rotation
    const speed = this.inputManager.isSprinting() ? SPRINT_SPEED : WALK_SPEED;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    const velocity = new THREE.Vector3();
    velocity.addScaledVector(forward, -input.z * speed * deltaTime);
    velocity.addScaledVector(right, input.x * speed * deltaTime);

    // Apply collision
    const adjusted = this.collision.checkPlayerMovement(
        this.camera.position,
        { x: velocity.x, z: velocity.z }
    );

    this.camera.position.x += adjusted.x;
    this.camera.position.z += adjusted.z;
}
```

**Weapon Bob** (classic FPS head bob):

```javascript
applyWeaponBob(deltaTime) {
    if (!this.isMoving) {
        // Smoothly return to center
        this.bobOffset = lerp(this.bobOffset, 0, 8 * deltaTime);
        this.bobPhase = 0;
        return;
    }

    this.bobPhase += deltaTime * (this.inputManager.isSprinting() ? 14 : 10);
    const bobX = Math.sin(this.bobPhase) * BOB_AMOUNT_X;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * BOB_AMOUNT_Y;

    this.camera.position.y = PLAYER_EYE_HEIGHT + bobY;
    // bobX applied to weapon sprite offset in HUD, not camera
}
```

### 4.2 enemy-ai.js -- Enemy Behavior System

**Responsibilities**: State machine, sight checks, pathfinding, sound propagation.

```javascript
export class EnemyAI {
    constructor(levelLoader, collisionSystem, eventBus)

    // Lifecycle
    spawnEnemy(type, gridX, gridZ, angle)   // Create enemy instance
    update(deltaTime, playerPosition)        // Update all active enemies
    removeEnemy(enemy)                       // Death cleanup

    // Per-enemy logic (called internally)
    updateEnemy(enemy, deltaTime, playerPos)
    checkSightLine(enemy, playerPos)         // Raycast through grid
    moveToward(enemy, targetPos, deltaTime)  // A* or direct movement
    attack(enemy, playerPos)                 // Fire at player
    alertNearbyEnemies(enemy)                // Sound propagation
    applyDamage(enemy, damage)               // Hit reaction

    // Queries
    getEnemyAtGrid(gridX, gridZ)             // For hitscan collision
    getActiveEnemyCount()                    // For scoring
    getAllEnemies()                           // Iterator
}
```

**State Machine**:

Each enemy has a `state` property. Transitions:

```
                         ┌──────────────┐
                         │    IDLE       │  Standing, facing initial angle
                         │  (patrolling) │  Optional: walk patrol route
                         └──────┬───────┘
                                │ sees player OR hears gunshot
                                v
                         ┌──────────────┐
                         │    ALERT     │  Play alert sound ("Achtung!")
                         │  (0.5s)      │  Turn toward player
                         └──────┬───────┘
                                │ alert timer done
                                v
                    ┌───────────────────────┐
                    │        CHASE          │  Move toward player
                    │  (pathfinding active) │  Re-check sight each tick
                    └───────┬───────┬───────┘
                            │       │
              in range ─────┘       └───── lost sight
              & has LOS              (return to last known pos)
                            │               │
                            v               v
                    ┌──────────────┐ ┌──────────────┐
                    │    ATTACK    │ │    SEARCH    │  Go to last known pos
                    │  (fire at    │ │  (5s timer)  │  then back to IDLE
                    │   player)    │ └──────────────┘
                    └──────┬───────┘
                           │
              hit by player (pain chance check)
                           │
                           v
                    ┌──────────────┐
                    │     PAIN     │  Flinch animation (0.3s)
                    │  (stunned)   │  Cannot act
                    └──────┬───────┘
                           │ timer done
                           v
                       back to CHASE
                           │
              health <= 0
                           │
                           v
                    ┌──────────────┐
                    │     DEAD     │  Death animation
                    │              │  Drop item (ammo clip)
                    └──────────────┘
```

**Sight Detection** (grid raycast):

```javascript
checkSightLine(enemy, playerPos) {
    // Raytrace on the grid from enemy to player
    // If no wall tiles between them, enemy can see player

    const ex = Math.floor(enemy.position.x / TILE_SIZE);
    const ez = Math.floor(enemy.position.z / TILE_SIZE);
    const px = Math.floor(playerPos.x / TILE_SIZE);
    const pz = Math.floor(playerPos.z / TILE_SIZE);

    // Check facing angle (enemies have a ~120 degree FOV)
    const toPlayer = Math.atan2(playerPos.z - enemy.position.z, playerPos.x - enemy.position.x);
    const angleDiff = normalizeAngle(toPlayer - enemy.angle);
    if (Math.abs(angleDiff) > ENEMY_FOV / 2) return false;

    // Check distance
    const dist = enemy.position.distanceTo(playerPos);
    if (dist > enemy.alertRange * TILE_SIZE) return false;

    // Grid-based line of sight (Bresenham's line through tiles)
    return this.lineOfSight(ex, ez, px, pz);
}
```

**Sound Propagation** (how gunshots alert enemies through open doors):

```javascript
alertNearbyEnemies(sourcePos, radius) {
    // Flood-fill from source tile through open tiles (not through closed doors or walls)
    const sourceGrid = this.worldToGrid(sourcePos);
    const visited = new Set();
    const queue = [{ ...sourceGrid, dist: 0 }];

    while (queue.length > 0) {
        const { x, z, dist } = queue.shift();
        const key = `${x},${z}`;
        if (visited.has(key) || dist > radius) continue;
        visited.add(key);

        // Alert any enemy at this tile
        const enemy = this.getEnemyAtGrid(x, z);
        if (enemy && enemy.state === 'IDLE') {
            enemy.state = 'ALERT';
            enemy.lastKnownPlayerPos = sourcePos.clone();
        }

        // Spread to adjacent walkable tiles
        for (const [dx, dz] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            if (this.levelLoader.isWalkable(x + dx, z + dz)) {
                queue.push({ x: x + dx, z: z + dz, dist: dist + 1 });
            }
        }
    }
}
```

### 4.3 enemy-types.js -- Enemy Data Definitions

```javascript
export const ENEMY_TYPES = {
    guard: {
        name: 'Guard',
        health: 25,
        speed: 2.0,          // Tiles per second
        damage: 8,            // Per hit
        attackRate: 1.5,      // Seconds between shots
        alertRange: 12,       // Tiles
        painChance: 0.5,      // 50% chance to flinch when hit
        score: 100,
        dropItem: 'clip',
        spriteSheet: 'enemies/guard.png',
        alertSound: 'sfx/guard-alert.mp3',
        attackSound: 'sfx/pistol-enemy.mp3',
        painSound: 'sfx/guard-pain.mp3',
        deathSound: 'sfx/guard-death.mp3',
        frames: { idle: 0, walk: [1,2,3,4], attack: 5, pain: 6, death: [7,8,9,10] }
    },

    ss: {
        name: 'SS Soldier',
        health: 50,
        speed: 2.5,
        damage: 12,
        attackRate: 0.8,      // Faster fire rate
        alertRange: 16,
        painChance: 0.3,
        score: 500,
        dropItem: 'machinegun_ammo',
        spriteSheet: 'enemies/ss.png',
        // ... sounds, frames
    },

    officer: {
        name: 'Officer',
        health: 50,
        speed: 3.0,           // Fastest regular enemy
        damage: 15,
        attackRate: 1.0,
        alertRange: 16,
        painChance: 0.3,
        score: 400,
        dropItem: 'clip',
        spriteSheet: 'enemies/officer.png',
        // ... sounds, frames
    },

    dog: {
        name: 'Attack Dog',
        health: 1,            // One shot kill
        speed: 4.0,           // Very fast
        damage: 10,
        attackRate: 0.5,      // Rapid biting
        alertRange: 10,
        painChance: 0.0,      // Dogs don't flinch
        score: 200,
        dropItem: null,       // Dogs drop nothing
        meleeOnly: true,      // No ranged attack
        spriteSheet: 'enemies/dog.png',
        // ... sounds, frames
    },

    mutant: {
        name: 'Mutant',
        health: 55,
        speed: 2.0,
        damage: 15,
        attackRate: 1.0,
        alertRange: 14,
        painChance: 0.2,
        score: 700,
        dropItem: 'clip',
        startAlert: true,     // Always alert -- never idle
        spriteSheet: 'enemies/mutant.png',
        // ... sounds, frames
    },

    // Bosses
    hans_grosse: {
        name: 'Hans Grosse',
        health: 850,
        speed: 1.5,
        damage: 20,
        attackRate: 0.5,      // Dual chainguns
        alertRange: 32,
        painChance: 0.0,      // Bosses don't flinch
        score: 5000,
        dropItem: 'gold_key',
        isBoss: true,
        phases: [
            { healthThreshold: 0.5, speedMultiplier: 1.3, attackRateMultiplier: 0.7 }
        ],
        spriteSheet: 'enemies/hans.png',
        voiceLine: 'voices/hans-taunt.mp3',
        // ... sounds, frames
    },

    // Additional bosses follow same pattern:
    // dr_schabbs, hitler_mech, hitler, otto_giftmacher, gretel_grosse, general_fettgesicht
};
```

### 4.4 weapon-system.js -- Weapons

**Responsibilities**: Weapon state, firing, ammo, switching, animation.

```javascript
export class WeaponSystem {
    constructor(playerController, collisionSystem, eventBus)

    // Actions
    fire()                          // Fire current weapon
    switchWeapon(index)             // 1-4 or scroll wheel
    switchToNext()                  // Next weapon in order
    switchToPrevious()              // Previous weapon
    autoSwitchOnPickup(weaponId)    // Auto-switch to better weapon

    // Update
    update(deltaTime)               // Animation, cooldown timers

    // State
    getCurrentWeapon()              // Current weapon data
    hasWeapon(weaponId)             // Inventory check
    addWeapon(weaponId)             // Pickup weapon
    addAmmo(ammoType, amount)       // Pickup ammo
    getAmmo(ammoType)               // Current ammo count

    // Rendering
    getWeaponFrame()                // Current sprite frame for HUD display
    getMuzzleFlashActive()          // Is muzzle flash showing?
}
```

**Weapon Definitions**:

```javascript
export const WEAPONS = {
    knife: {
        id: 0,
        name: 'Knife',
        ammoType: null,       // Infinite
        damage: 20,           // Per stab (random 1-20, critical at melee range)
        fireRate: 0.4,        // Seconds between attacks
        spread: 0,
        range: 1.5,           // Melee range in tiles
        hitscan: false,       // Melee, not hitscan
        autoFire: false,
        frames: { idle: 0, fire: [1,2,3,4], switchTo: [5,6] },
        sound: 'sfx/knife-swing.mp3'
    },

    pistol: {
        id: 1,
        name: 'Pistol',
        ammoType: 'bullets',
        ammoPerShot: 1,
        damage: 20,           // Random 1-4 * multiplier, averages ~20
        fireRate: 0.35,
        spread: 0.02,         // Slight inaccuracy
        range: 64,
        hitscan: true,
        autoFire: false,      // Semi-automatic
        frames: { idle: 0, fire: [1,2,3,4,0], switchTo: [5,6,0] },
        sound: 'sfx/pistol-fire.mp3'
    },

    machinegun: {
        id: 2,
        name: 'Machine Gun',
        ammoType: 'bullets',
        ammoPerShot: 1,
        damage: 20,
        fireRate: 0.14,       // Fast automatic fire
        spread: 0.04,         // More spread
        range: 64,
        hitscan: true,
        autoFire: true,       // Hold to fire
        frames: { idle: 0, fire: [1,2,3,4,0], switchTo: [5,6,0] },
        sound: 'sfx/machinegun-fire.mp3'
    },

    chaingun: {
        id: 3,
        name: 'Chaingun',
        ammoType: 'bullets',
        ammoPerShot: 1,
        damage: 20,
        fireRate: 0.07,       // Extremely fast
        spread: 0.06,         // Most spread
        range: 64,
        hitscan: true,
        autoFire: true,
        frames: { idle: 0, fire: [1,2,1,2], switchTo: [3,4,0] },
        sound: 'sfx/chaingun-fire.mp3'
    }
};
```

**Hitscan Firing**:

```javascript
fire() {
    const weapon = this.getCurrentWeapon();
    if (this.cooldownTimer > 0) return;
    if (weapon.ammoType && this.ammo[weapon.ammoType] <= 0) return;

    // Consume ammo
    if (weapon.ammoType) {
        this.ammo[weapon.ammoType] -= weapon.ammoPerShot;
    }

    // Start cooldown and animation
    this.cooldownTimer = weapon.fireRate;
    this.animationState = 'fire';
    this.animationFrame = 0;

    // Play sound
    this.eventBus.emit('sfx:play', weapon.sound);

    // Muzzle flash
    this.eventBus.emit('renderer:muzzleFlash');

    if (weapon.hitscan) {
        // Calculate ray direction with spread
        const direction = this.playerController.getForwardDirection();
        if (weapon.spread > 0) {
            direction.x += (Math.random() - 0.5) * weapon.spread;
            direction.z += (Math.random() - 0.5) * weapon.spread;
            direction.normalize();
        }

        const result = this.collision.hitscanRay(
            this.playerController.getPosition(),
            direction,
            weapon.range
        );

        if (result.hit && result.type === 'enemy') {
            // Wolfenstein damage formula: random 1-4 * base damage / 4
            const rolls = 1 + Math.floor(Math.random() * 4);
            const damage = Math.floor(rolls * weapon.damage / 4);
            this.eventBus.emit('enemy:damage', { enemy: result.target, damage });
        }

        if (result.hit && result.type === 'wall') {
            this.eventBus.emit('vfx:bulletHit', result.point);
        }
    } else {
        // Melee attack (knife)
        this.performMeleeAttack(weapon);
    }

    // Alert nearby enemies
    this.eventBus.emit('sound:propagate', {
        position: this.playerController.getPosition(),
        radius: 10 // Tiles
    });
}
```

### 4.5 door-system.js -- Doors

**Responsibilities**: Door types, open/close animations, key requirements.

```javascript
export class DoorSystem {
    constructor(levelLoader, eventBus)

    // Management
    createDoor(doorData)            // From level JSON
    update(deltaTime)               // Animate all active doors
    interact(gridX, gridZ, keys)    // Player tries to open door

    // States per door: CLOSED -> OPENING -> OPEN -> CLOSING -> CLOSED
    // Open doors auto-close after 4 seconds (like original)
}
```

**Door Types**:

| Type | Key Required | Texture | Behavior |
|------|-------------|---------|----------|
| `normal` | None | Wood/metal | Standard push to open |
| `gold` | Gold key | Gold trim | Requires gold key (consumed) |
| `silver` | Silver key | Silver trim | Requires silver key (consumed) |
| `elevator` | None | Elevator | Triggers level completion |

**Door Animation** (slides into wall, like original):

```javascript
updateDoor(door, deltaTime) {
    switch (door.state) {
        case 'OPENING':
            door.slideOffset += DOOR_SPEED * deltaTime;
            if (door.slideOffset >= TILE_SIZE) {
                door.slideOffset = TILE_SIZE;
                door.state = 'OPEN';
                door.openTimer = DOOR_OPEN_DURATION; // 4 seconds
                // Update collision grid -- tile is now walkable
                this.levelLoader.setWalkable(door.gridX, door.gridZ, true);
            }
            // Move door mesh
            door.mesh.position[door.slideAxis] = door.basePosition + door.slideOffset;
            break;

        case 'OPEN':
            door.openTimer -= deltaTime;
            if (door.openTimer <= 0) {
                // Check if player or enemy is in doorway
                if (!this.collision.isOccupied(door.gridX, door.gridZ)) {
                    door.state = 'CLOSING';
                }
            }
            break;

        case 'CLOSING':
            door.slideOffset -= DOOR_SPEED * deltaTime;
            if (door.slideOffset <= 0) {
                door.slideOffset = 0;
                door.state = 'CLOSED';
                this.levelLoader.setWalkable(door.gridX, door.gridZ, false);
            }
            door.mesh.position[door.slideAxis] = door.basePosition + door.slideOffset;
            break;
    }
}
```

### 4.6 pickup-system.js -- Collectibles

```javascript
export const PICKUP_TYPES = {
    // Health
    dog_food:       { type: 'health', amount: 4,   score: 0,    sprite: 'pickups/dog-food.png' },
    food:           { type: 'health', amount: 10,  score: 0,    sprite: 'pickups/food.png' },
    medkit:         { type: 'health', amount: 25,  score: 0,    sprite: 'pickups/medkit.png' },

    // Ammo
    clip:           { type: 'ammo', ammoType: 'bullets', amount: 8,   sprite: 'pickups/clip.png' },
    machinegun:     { type: 'weapon', weaponId: 'machinegun', ammo: 6, sprite: 'pickups/machinegun.png' },
    chaingun:       { type: 'weapon', weaponId: 'chaingun', ammo: 6,  sprite: 'pickups/chaingun.png' },

    // Treasure (score only)
    cross:          { type: 'treasure', score: 100,  sprite: 'pickups/cross.png' },
    chalice:        { type: 'treasure', score: 500,  sprite: 'pickups/chalice.png' },
    chest:          { type: 'treasure', score: 1000, sprite: 'pickups/chest.png' },
    crown:          { type: 'treasure', score: 5000, sprite: 'pickups/crown.png' },

    // Keys
    gold_key:       { type: 'key', keyType: 'gold',   sprite: 'pickups/gold-key.png' },
    silver_key:     { type: 'key', keyType: 'silver', sprite: 'pickups/silver-key.png' },

    // Special
    extra_life:     { type: 'life', amount: 1,  score: 0,  sprite: 'pickups/extra-life.png' },
    blood:          { type: 'health', amount: 1, score: 0,  sprite: 'pickups/blood.png' } // Minimal heal
};
```

**Billboard Rendering** (pickups and decorations face camera):

```javascript
createBillboardSprite(textureUrl, worldX, worldZ) {
    const texture = this.textureLoader.load(textureUrl);
    texture.magFilter = THREE.NearestFilter;  // Pixel-perfect, no blur
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(
        worldX,
        SPRITE_HEIGHT / 2,  // Center vertically
        worldZ
    );
    sprite.scale.set(SPRITE_WIDTH, SPRITE_HEIGHT, 1);
    this.scene.add(sprite);
    return sprite;
}
```

### 4.7 game-state.js -- State Management

```javascript
export class GameState {
    constructor(eventBus)

    // Player state
    health         // 0-100 (can exceed 100 temporarily with some pickups)
    armor          // 0-100
    lives          // Starts at 3
    score          // Running total
    ammo           // { bullets: 8 }  -- start with 8 pistol rounds
    keys           // { gold: false, silver: false }
    weapons        // Set of owned weapon IDs
    currentWeapon  // Active weapon ID

    // Level state
    currentEpisode // 1-6
    currentLevel   // 1-10 (9 regular + 1 secret per episode)
    enemiesTotal   // Total enemies in level
    enemiesKilled  // Killed count
    secretsTotal   // Total secrets
    secretsFound   // Found count
    treasureTotal  // Total treasure items
    treasureFound  // Collected count
    levelStartTime // For par time tracking

    // Methods
    resetForNewLevel()      // Keep weapons/score, reset keys
    resetForNewLife()       // Reset health/ammo to defaults, keep score
    resetForNewGame()       // Full reset
    save()                  // -> localStorage
    load()                  // <- localStorage
    getDifficultyMultipliers() // Based on selected difficulty
}
```

**Save/Load System**:

```javascript
save() {
    const saveData = {
        version: SAVE_VERSION,  // For migration if format changes
        timestamp: Date.now(),
        player: {
            health: this.health,
            armor: this.armor,
            lives: this.lives,
            score: this.score,
            ammo: { ...this.ammo },
            keys: { ...this.keys },
            weapons: [...this.weapons],
            currentWeapon: this.currentWeapon
        },
        level: {
            episode: this.currentEpisode,
            level: this.currentLevel
        },
        difficulty: this.difficulty,
        highScores: this.highScores
    };
    localStorage.setItem('wolf3d_save', JSON.stringify(saveData));
}

load() {
    const raw = localStorage.getItem('wolf3d_save');
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
        return this.migrateSave(data); // Handle version differences
    }
    // ... restore state
    return true;
}
```

### 4.8 scoring.js -- Scoring & Stats

```javascript
export class ScoringSystem {
    constructor(gameState, eventBus)

    // Per-level tracking
    addKill()
    addSecret()
    addTreasure()
    addScore(points)

    // End-of-level calculations
    getKillPercentage()        // enemiesKilled / enemiesTotal * 100
    getSecretPercentage()      // secretsFound / secretsTotal * 100
    getTreasurePercentage()    // treasureFound / treasureTotal * 100
    getLevelTime()             // Seconds since level start
    getParTime(episode, level) // Look up par time from data table

    // Bonuses (like original)
    calculateEndOfLevelBonus() // 10000 for 100% kills, secrets, or treasure each

    // High scores
    isHighScore(score)
    addHighScore(name, score, episode, level)
    getHighScores()            // Top 10, persisted in localStorage
}
```

### 4.9 difficulty.js -- Difficulty Presets

```javascript
export const DIFFICULTIES = {
    baby: {
        id: 0,
        name: 'Can I Play, Daddy?',
        enemyCountMultiplier: 0.5,    // Half the enemies
        enemyDamageMultiplier: 0.5,   // Enemies deal half damage
        enemyHealthMultiplier: 0.75,  // Enemies have less health
        ammoMultiplier: 2.0,          // Double ammo from pickups
        healthMultiplier: 2.0,        // Double health from pickups
        description: 'For beginners',
        bjFace: 'baby'               // Specific BJ face for menu
    },

    easy: {
        id: 1,
        name: "Don't Hurt Me",
        enemyCountMultiplier: 0.75,
        enemyDamageMultiplier: 0.75,
        enemyHealthMultiplier: 1.0,
        ammoMultiplier: 1.5,
        healthMultiplier: 1.5,
        description: 'A fair challenge',
        bjFace: 'easy'
    },

    medium: {
        id: 2,
        name: 'Bring \'Em On!',
        enemyCountMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
        enemyHealthMultiplier: 1.0,
        ammoMultiplier: 1.0,
        healthMultiplier: 1.0,
        description: 'The real deal',
        bjFace: 'medium'
    },

    hard: {
        id: 3,
        name: 'I Am Death Incarnate!',
        enemyCountMultiplier: 1.25,   // Extra enemies
        enemyDamageMultiplier: 1.5,
        enemyHealthMultiplier: 1.25,
        ammoMultiplier: 0.75,
        healthMultiplier: 0.75,
        description: 'Maximum pain',
        bjFace: 'hard'
    }
};
```

---

## 5. UI System

### 5.1 hud.js -- Heads-Up Display

**Responsibilities**: Status bar, BJ face, weapon display, damage indicators.

The HUD is rendered as HTML/CSS overlaid on the canvas (not in Three.js). This makes it resolution-
independent, accessible, and easy to style.

```javascript
export class HUD {
    constructor(gameState, eventBus)

    // Setup
    createElement()              // Build DOM structure
    preloadFaceSprites()         // Cache all BJ face states

    // Updates (called when state changes, not every frame)
    updateHealth(value)
    updateArmor(value)
    updateAmmo(value)
    updateScore(value)
    updateLives(value)
    updateKeys(gold, silver)
    updateWeaponDisplay(weaponId)
    updateFace(state)            // health-based + reactions
    showDamageIndicator(direction) // Red flash from damage direction
    showPickupFlash(color)       // Brief gold/white flash for pickups

    // BJ Face Logic
    getFaceState()               // Based on health:
                                 //   100-80: confident grin
                                 //   79-60: slightly worried
                                 //   59-40: beaten up
                                 //   39-20: bloodied
                                 //   19-1: near death
                                 //   On kill: evil grin (1s)
                                 //   On damage: look toward source (0.5s)
                                 //   On god mode: golden eyes
}
```

**HUD Layout** (HTML structure):

```html
<div id="hud" class="hud">
    <!-- Main status bar (bottom of screen) -->
    <div class="hud-bar">
        <div class="hud-section hud-floor">
            <span class="hud-label">FLOOR</span>
            <span class="hud-value" id="hud-floor">1</span>
        </div>
        <div class="hud-section hud-score">
            <span class="hud-label">SCORE</span>
            <span class="hud-value" id="hud-score">0</span>
        </div>
        <div class="hud-section hud-lives">
            <span class="hud-label">LIVES</span>
            <span class="hud-value" id="hud-lives">3</span>
        </div>
        <div class="hud-face">
            <img id="hud-bj-face" src="" alt="BJ">
        </div>
        <div class="hud-section hud-health">
            <span class="hud-label">HEALTH</span>
            <span class="hud-value" id="hud-health">100%</span>
        </div>
        <div class="hud-section hud-ammo">
            <span class="hud-label">AMMO</span>
            <span class="hud-value" id="hud-ammo">8</span>
        </div>
        <div class="hud-section hud-keys">
            <img id="hud-key-gold" class="hud-key hidden" src="" alt="Gold Key">
            <img id="hud-key-silver" class="hud-key hidden" src="" alt="Silver Key">
        </div>
    </div>

    <!-- Weapon display (centered, above status bar) -->
    <div class="hud-weapon">
        <img id="hud-weapon-sprite" src="" alt="Weapon">
    </div>

    <!-- Damage indicators (red flashes at screen edges) -->
    <div class="damage-indicator damage-left"></div>
    <div class="damage-indicator damage-right"></div>
    <div class="damage-indicator damage-front"></div>
    <div class="damage-indicator damage-back"></div>

    <!-- Pickup flash overlay -->
    <div id="pickup-flash" class="pickup-flash"></div>
</div>
```

**HUD CSS** (key parts):

```css
.hud-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #3a3a3a;
    border-top: 2px solid #666;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    font-family: 'WolfensteinFont', monospace;
    color: #ffcc00;
    z-index: 100;
    image-rendering: pixelated;
}

.hud-weapon {
    position: fixed;
    bottom: 64px;        /* Above status bar */
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    image-rendering: pixelated;
    pointer-events: none;
}

.hud-weapon img {
    width: 256px;        /* Weapon sprite size */
    height: 256px;
    image-rendering: pixelated;
}

.damage-indicator {
    position: fixed;
    opacity: 0;
    background: radial-gradient(ellipse, rgba(255,0,0,0.4), transparent);
    pointer-events: none;
    transition: opacity 0.1s ease-out;
    z-index: 98;
}

.damage-indicator.active {
    opacity: 1;
    animation: damage-fade 0.3s ease-out forwards;
}
```

### 5.2 menu.js -- Menu System

**Responsibilities**: Main menu, pause, options, episode/difficulty selection.

```javascript
export class MenuSystem {
    constructor(eventBus)

    // Screens
    showMainMenu()          // New Game, Continue, Options, Credits
    showEpisodeSelect()     // 6 episodes with thumbnails
    showDifficultySelect()  // 4 difficulties with BJ faces
    showPauseMenu()         // Resume, Options, Quit to Menu
    showOptionsMenu()       // Volume sliders, controls, graphics
    showCreditsScreen()     // Scrolling credits
    showDeathScreen()       // "You are dead" + retry options

    // Navigation
    navigateUp()            // Keyboard/gamepad
    navigateDown()
    select()                // Enter/Space
    back()                  // Escape

    // State
    isMenuActive()
    getCurrentScreen()
    closeAll()
}
```

**Options Screen**:

| Setting | Type | Default | Range |
|---------|------|---------|-------|
| Master Volume | Slider | 80% | 0-100 |
| Music Volume | Slider | 60% | 0-100 |
| SFX Volume | Slider | 80% | 0-100 |
| Voice Volume | Slider | 90% | 0-100 |
| Mouse Sensitivity | Slider | 50% | 10-100 |
| Vertical Look | Toggle | Off | On/Off |
| CRT Filter | Toggle | Off | On/Off |
| Minimap | Toggle | Off | On/Off |
| Show FPS | Toggle | Off | On/Off |
| Fullscreen | Toggle | Off | On/Off |

### 5.3 cinematics.js -- Cinematic System

```javascript
export class CinematicSystem {
    constructor(renderer, audioManager, eventBus)

    // Sequences
    playLevelIntro(episode, level)  // Fade in, show level name
    playLevelComplete(stats)        // Stats screen with tallying animation
    playBossIntro(bossType)         // Camera zoom, boss taunt voice line
    playDeathSequence()             // Camera fall, red screen, death sound
    playVictorySequence(episode)    // Episode-specific victory text + animation
    playEpisodeIntro(episode)       // Narrated intro screen

    // Control
    skip()                          // Player pressed key during cinematic
    isPlaying()
    update(deltaTime)
}
```

**Level Complete Stats Screen** (the classic tallying):

```javascript
async playLevelComplete(stats) {
    this.isActive = true;

    // Show stats panel
    this.showPanel('level-complete');

    // Tally kills with clicking sound
    await this.tallyValue('kills', stats.killPercent, 'sfx/tally-tick.mp3');
    if (stats.killPercent === 100) {
        await this.showBonus(10000, 'sfx/bonus.mp3');
    }

    // Tally secrets
    await this.tallyValue('secrets', stats.secretPercent, 'sfx/tally-tick.mp3');
    if (stats.secretPercent === 100) {
        await this.showBonus(10000, 'sfx/bonus.mp3');
    }

    // Tally treasure
    await this.tallyValue('treasure', stats.treasurePercent, 'sfx/tally-tick.mp3');
    if (stats.treasurePercent === 100) {
        await this.showBonus(10000, 'sfx/bonus.mp3');
    }

    // Show time
    this.showTime(stats.levelTime, stats.parTime);

    // Wait for keypress
    await this.waitForInput();
    this.isActive = false;
}

// Tally animation: counts from 0% to target with sound
tallyValue(field, target, sound) {
    return new Promise((resolve) => {
        let current = 0;
        const interval = setInterval(() => {
            current += 2; // Increment 2% per tick
            if (current >= target) {
                current = target;
                clearInterval(interval);
                resolve();
            }
            this.updateDisplay(field, current);
            this.audioManager.playSFX(sound);
        }, 30); // ~33 ticks/sec
    });
}
```

### 5.4 loading.js -- Loading Screen

```javascript
export class LoadingScreen {
    constructor()

    show(levelName)                 // "Loading E1M1: Escape from Wolfenstein"
    updateProgress(percent, label)  // Progress bar + current asset name
    hide()                          // Fade out to gameplay
}
```

---

## 6. Audio System

### 6.1 audio-manager.js -- Master Audio

```javascript
export class AudioManager {
    constructor()

    // Initialization (must be called after user interaction -- browser policy)
    init()                              // Create AudioContext
    resume()                            // Resume if suspended (iOS)

    // Volume control
    setMasterVolume(value)              // 0.0 - 1.0
    setMusicVolume(value)
    setSFXVolume(value)
    setVoiceVolume(value)

    // Bus architecture
    //   masterGain
    //   ├── musicGain -> MusicPlayer
    //   ├── sfxGain   -> SFXPlayer (pooled)
    //   └── voiceGain -> VoicePlayer

    dispose()
}
```

**Audio Context Initialization** (handling browser autoplay policy):

```javascript
init() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    // Bus gains
    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.masterGain);

    this.voiceGain = this.context.createGain();
    this.voiceGain.connect(this.masterGain);

    // iOS workaround: resume on first touch
    if (this.context.state === 'suspended') {
        const resume = () => {
            this.context.resume();
            document.removeEventListener('touchstart', resume);
            document.removeEventListener('click', resume);
        };
        document.addEventListener('touchstart', resume);
        document.addEventListener('click', resume);
    }
}
```

### 6.2 sfx-player.js -- Sound Effects

```javascript
export class SFXPlayer {
    constructor(audioManager)

    // Playback
    play(sfxId, options)            // { volume, playbackRate, loop }
    playPositional(sfxId, worldPos) // 3D positioned sound (attenuation with distance)
    stop(handle)                    // Stop a specific playing sound
    stopAll()                       // Stop all SFX

    // Preloading
    preload(sfxList)                // Fetch and decode audio buffers
    isLoaded(sfxId)
}
```

**Object Pool for SFX** (prevent creating new Audio nodes every frame):

```javascript
// Pre-create a pool of AudioBufferSourceNodes
// Gunfire can produce dozens of sounds per second in heavy combat
const SFX_POOL_SIZE = 16;

class SFXPool {
    constructor(context, destination) {
        this.pool = [];
        this.context = context;
        this.destination = destination;
    }

    play(buffer, options = {}) {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = options.playbackRate || 1.0;
        source.loop = options.loop || false;

        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume || 1.0;
        source.connect(gainNode).connect(this.destination);

        source.start(0);
        source.onended = () => source.disconnect();

        return { source, gainNode };
    }
}
```

### 6.3 music-player.js -- Background Music

```javascript
export class MusicPlayer {
    constructor(audioManager)

    play(trackId)               // Load and play track (Suno-generated)
    stop()                      // Fade out and stop
    pause()
    resume()
    crossfadeTo(trackId, duration) // Smooth transition between tracks

    // Track mapping
    // Each episode has: menu theme, gameplay track, boss track, victory jingle
}
```

**Crossfade Implementation**:

```javascript
crossfadeTo(newTrackId, duration = 2.0) {
    const newAudio = new Audio(`assets/audio/music/${newTrackId}.mp3`);
    const newSource = this.context.createMediaElementSource(newAudio);
    const newGain = this.context.createGain();
    newGain.gain.value = 0;
    newSource.connect(newGain).connect(this.musicGain);

    // Fade out current
    if (this.currentGain) {
        this.currentGain.gain.linearRampToValueAtTime(
            0, this.context.currentTime + duration
        );
    }

    // Fade in new
    newAudio.play();
    newGain.gain.linearRampToValueAtTime(
        1.0, this.context.currentTime + duration
    );

    // Cleanup old after fade
    setTimeout(() => {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }, duration * 1000);

    this.currentAudio = newAudio;
    this.currentGain = newGain;
}
```

### 6.4 voice-player.js -- Voice Lines

```javascript
export class VoicePlayer {
    constructor(audioManager)

    play(voiceId)               // Play ElevenLabs voice line
    queue(voiceId)              // Add to queue (don't overlap)
    isPlaying()
    cancelQueue()               // Skip remaining queued lines

    // Voice lines:
    // Boss taunts: "Die, Allied schweinehund!" (Hans), etc.
    // BJ reactions: Pain grunts, death cry, pickup acknowledgment
    // Narrator: Episode intro/outro text
    // Environment: "Achtung!" from guards, dog barks
}
```

---

## 7. Level Format Specification

### JSON Schema

```json
{
    "$schema": "wolfenstein-level-v1",
    "meta": {
        "id": "e1m1",
        "name": "Escape from Wolfenstein",
        "episode": 1,
        "level": 1,
        "parTime": 90,
        "music": "e1m1-theme",
        "ceilingColor": "#383838",
        "floorTexture": "floors/stone-grey.png"
    },

    "dimensions": {
        "width": 64,
        "height": 64
    },

    "walls": [
        "comment: 2D array [height][width] of wall type IDs. 0 = empty space.",
        [1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    ],

    "wallTextures": {
        "1": "walls/grey-stone.png",
        "2": "walls/grey-stone-banner.png",
        "3": "walls/blue-brick.png",
        "4": "walls/blue-brick-sign.png",
        "5": "walls/wood-panel.png",
        "6": "walls/metal-door-frame.png"
    },

    "playerStart": {
        "x": 2,
        "z": 3,
        "angle": 90
    },

    "doors": [
        {
            "x": 5,
            "z": 3,
            "type": "normal",
            "orientation": "horizontal",
            "texture": "doors/wood-door.png"
        },
        {
            "x": 10,
            "z": 7,
            "type": "gold",
            "orientation": "vertical",
            "texture": "doors/gold-door.png"
        },
        {
            "x": 30,
            "z": 30,
            "type": "elevator",
            "orientation": "horizontal",
            "texture": "doors/elevator-door.png"
        }
    ],

    "secrets": [
        {
            "x": 3,
            "z": 7,
            "pushDirection": "north",
            "revealPickups": ["chest_at_3_8"]
        }
    ],

    "entities": [
        { "id": "guard_1",   "type": "guard",   "x": 10, "z": 5,  "angle": 180 },
        { "id": "guard_2",   "type": "guard",   "x": 12, "z": 5,  "angle": 270 },
        { "id": "ss_1",      "type": "ss",      "x": 20, "z": 15, "angle": 90  },
        { "id": "dog_1",     "type": "dog",      "x": 8,  "z": 22, "angle": 0   },
        { "id": "hans",      "type": "hans_grosse", "x": 32, "z": 32, "angle": 180 }
    ],

    "pickups": [
        { "id": "clip_1",          "type": "clip",       "x": 5,  "z": 2  },
        { "id": "medkit_1",        "type": "medkit",     "x": 15, "z": 10 },
        { "id": "gold_key_1",      "type": "gold_key",   "x": 25, "z": 20 },
        { "id": "cross_1",         "type": "cross",      "x": 8,  "z": 8  },
        { "id": "crown_1",         "type": "crown",      "x": 3,  "z": 8  },
        { "id": "chaingun_1",      "type": "chaingun",   "x": 18, "z": 5  },
        { "id": "extra_life_1",    "type": "extra_life", "x": 3,  "z": 60 },
        { "id": "chest_at_3_8",    "type": "chest",      "x": 3,  "z": 8,  "hidden": true }
    ],

    "decorations": [
        { "type": "barrel",     "x": 6,  "z": 3,  "blocking": true  },
        { "type": "table",      "x": 11, "z": 8,  "blocking": true  },
        { "type": "ceiling_light", "x": 10, "z": 5, "blocking": false },
        { "type": "armor",      "x": 7,  "z": 12, "blocking": true  },
        { "type": "plant",      "x": 2,  "z": 15, "blocking": true  },
        { "type": "flag",       "x": 30, "z": 1,  "blocking": false },
        { "type": "skeleton",   "x": 22, "z": 18, "blocking": false }
    ]
}
```

### Wall Type Convention

| ID Range | Category |
|----------|----------|
| 0 | Empty (walkable) |
| 1-20 | Stone walls (various textures) |
| 21-40 | Brick walls |
| 41-60 | Wood panels |
| 61-80 | Metal/industrial |
| 81-100 | Decorative (banners, signs, portraits) |
| 200+ | Special (secret pushable walls) |

### Episode Structure

| Episode | Name | Levels | Boss |
|---------|------|--------|------|
| 1 | Escape from Wolfenstein | E1M1-E1M10 (M10 = secret) | Hans Grosse |
| 2 | Operation: Eisenfaust | E2M1-E2M10 | Dr. Schabbs |
| 3 | Die, Fuhrer, Die! | E3M1-E3M10 | Hitler (mech + human) |
| 4 | A Dark Secret | E4M1-E4M10 | Otto Giftmacher |
| 5 | Trail of the Madman | E5M1-E5M10 | Gretel Grosse |
| 6 | Confrontation | E6M1-E6M10 | General Fettgesicht |

---

## 8. Asset Pipeline

### 8.1 Textures (Flux via fal.ai)

**Wall Textures** (seamless tiling, 128x128 or 256x256):

```bash
# Grey stone wall
./scripts/generate-asset.sh --type background \
    --prompt "seamless tileable grey castle stone wall texture, medieval dungeon, dark mortar lines, uniform lighting, game texture, top-down photograph style" \
    --output wolfenstein3d/assets/textures/walls/ \
    --filename grey-stone.png

# Blue brick wall
./scripts/generate-asset.sh --type background \
    --prompt "seamless tileable blue-grey brick wall texture, nazi bunker style, clean geometric bricks, uniform lighting, game texture" \
    --output wolfenstein3d/assets/textures/walls/ \
    --filename blue-brick.png

# Wood panel
./scripts/generate-asset.sh --type background \
    --prompt "seamless tileable dark wood panel wall texture, military office style, vertical grain, warm brown, game texture" \
    --output wolfenstein3d/assets/textures/walls/ \
    --filename wood-panel.png
```

**Generation checklist**: 8-12 wall textures, 2-3 floor textures, 1-2 ceiling textures, 4 door
textures. Each must be seamless/tileable.

### 8.2 Sprites (Flux via fal.ai)

**Enemy Sprites** (8 directional angles, multiple states):

For authentic Wolfenstein feel, enemies are 2D billboard sprites with directional frames. Each
enemy needs:

| State | Frames | Description |
|-------|--------|-------------|
| Idle (8 dirs) | 8 | Standing, facing each 45-degree angle |
| Walk (8 dirs x 4 frames) | 32 | Walking animation cycle |
| Attack | 2-3 | Raising weapon, firing |
| Pain | 1 | Flinching |
| Death | 4-5 | Falling death sequence |

**Sprite Sheet Layout**: All frames in a single PNG sprite sheet, referenced by frame indices.

```bash
# Guard sprite (standing, facing camera)
./scripts/generate-asset.sh --type sprite \
    --prompt "pixel art WW2 german guard soldier, grey uniform, MP40 submachine gun, front-facing, retro game sprite, transparent background, 64x64 pixel style, Wolfenstein 3D inspired" \
    --output wolfenstein3d/assets/sprites/enemies/ \
    --filename guard-front.png
```

**Note**: Generating a full 8-directional sprite sheet from AI is challenging. Recommended approach:
1. Generate front-facing reference with Flux
2. Use that as reference for side/back views (image-to-image)
3. Assemble into sprite sheet manually or with script
4. Alternative: Use 3D models (Meshy) rendered from 8 angles as pre-rendered sprites

**Weapon Sprites** (first-person view):

```bash
# Pistol (first-person, hand holding gun)
./scripts/generate-asset.sh --type sprite \
    --prompt "pixel art first person view hand holding pistol, retro FPS game, centered at bottom of frame, Wolfenstein 3D style, transparent background, 128x128" \
    --output wolfenstein3d/assets/sprites/weapons/ \
    --filename pistol-idle.png
```

### 8.3 3D Models (Meshy v6 via fal.ai)

Used selectively for boss characters and key decorations (optional enhancement over pure sprites):

```bash
# Hans Grosse boss model
./scripts/generate-model.sh \
    --prompt "WW2 German super soldier, heavy armor, dual chainguns, menacing stance, low poly game character" \
    --style realistic \
    --output wolfenstein3d/assets/models/ \
    --filename hans-grosse.glb
```

**Model Budget**: Keep under 5000 triangles per model. Bosses only -- regular enemies stay as
sprites for authenticity and performance.

### 8.4 Audio (ElevenLabs + Suno)

**SFX** (ElevenLabs Sound Effects):

| Sound | Description | Duration |
|-------|-------------|----------|
| pistol-fire.mp3 | Single gunshot, crisp | 0.3s |
| machinegun-fire.mp3 | Rapid fire burst | 0.2s |
| chaingun-fire.mp3 | Heavy chaingun burst | 0.15s |
| knife-swing.mp3 | Knife slash whoosh | 0.2s |
| door-open.mp3 | Heavy door sliding | 1.0s |
| door-close.mp3 | Door sliding shut | 0.8s |
| pickup-health.mp3 | Healing chime | 0.3s |
| pickup-ammo.mp3 | Ammo click | 0.2s |
| pickup-treasure.mp3 | Treasure bling | 0.4s |
| pickup-key.mp3 | Key jingle | 0.3s |
| pickup-weapon.mp3 | Weapon rack sound | 0.4s |
| secret-wall.mp3 | Stone grinding | 1.5s |
| guard-alert.mp3 | "Achtung!" shout | 0.6s |
| guard-pain.mp3 | Pain grunt | 0.3s |
| guard-death.mp3 | Death cry | 0.5s |
| dog-bark.mp3 | Attack dog bark | 0.4s |
| dog-whimper.mp3 | Dog death | 0.5s |
| player-pain.mp3 | BJ pain grunt | 0.3s |
| player-death.mp3 | BJ death cry | 0.8s |
| elevator-ding.mp3 | Level complete chime | 0.5s |

**Music** (Suno -- generated by Richard):

| Track | Style | Use |
|-------|-------|-----|
| menu-theme | Orchestral, ominous, military march | Main menu |
| e1-gameplay | Fast-paced midi-style, urgent | Episode 1 levels |
| e1-boss | Heavy, intense, dramatic | Hans Grosse fight |
| victory-jingle | Triumphant brass fanfare | Level complete |
| death-sting | Dark, descending | Player death |
| suspense-loop | Ambient, creepy, low drone | Quiet exploration |

**Voice Lines** (ElevenLabs TTS):

| Character | Lines | Voice Style |
|-----------|-------|-------------|
| BJ Blazkowicz | Pain grunts, death cry, "Yeah!" on kills | Gruff American male |
| Guards | "Achtung!", "Halt!", pain/death | German-accented male |
| SS Soldiers | "Schutzstaffel!", pain/death | Deeper German voice |
| Hans Grosse | "Guten Tag!" (intro), "Die, Allied schweinehund!" | Deep, booming, menacing |
| Narrator | Episode intros, level names | Dramatic English male |

---

## 9. Module Dependency Graph

### Initialization Order

The game boots in this exact sequence:

```
1. main.js
   │
   ├── 2. EventBus (utils/event-bus.js)          -- No dependencies
   ├── 3. Constants (utils/constants.js)          -- No dependencies
   │
   ├── 4. AudioManager (audio/audio-manager.js)   -- EventBus
   │   ├── SFXPlayer                               -- AudioManager
   │   ├── MusicPlayer                             -- AudioManager
   │   └── VoicePlayer                             -- AudioManager
   │
   ├── 5. Renderer (engine/renderer.js)            -- Constants
   │   └── Post-processing setup
   │
   ├── 6. InputManager (engine/input.js)           -- Renderer.canvas
   │
   ├── 7. LevelLoader (engine/level-loader.js)     -- Renderer
   │
   ├── 8. CollisionSystem (engine/collision.js)     -- LevelLoader
   │
   ├── 9. GameState (game/game-state.js)           -- EventBus
   │   └── ScoringSystem                           -- GameState, EventBus
   │
   ├── 10. PlayerController (game/player-controller.js) -- Camera, Input, Collision, EventBus
   │
   ├── 11. WeaponSystem (game/weapon-system.js)    -- PlayerController, Collision, EventBus
   │
   ├── 12. EnemyAI (game/enemy-ai.js)             -- LevelLoader, Collision, EventBus
   │
   ├── 13. DoorSystem (game/door-system.js)        -- LevelLoader, EventBus
   │
   ├── 14. PickupSystem (game/pickup-system.js)    -- LevelLoader, GameState, EventBus
   │
   ├── 15. HUD (ui/hud.js)                        -- GameState, EventBus
   │
   ├── 16. MenuSystem (ui/menu.js)                 -- EventBus
   │
   ├── 17. CinematicSystem (ui/cinematics.js)      -- Renderer, AudioManager, EventBus
   │
   └── 18. Game Loop starts
```

### Dependency Matrix

```
Module              | Depends On
--------------------|-------------------------------------------
EventBus            | (none)
Constants           | (none)
MathUtils           | (none)
ObjectPool          | (none)
SaveManager         | (none)
AudioManager        | EventBus
SFXPlayer           | AudioManager
MusicPlayer         | AudioManager
VoicePlayer         | AudioManager
Renderer            | Constants
InputManager        | (canvas element)
LevelLoader         | Renderer
CollisionSystem     | LevelLoader
GameState           | EventBus
ScoringSystem       | GameState, EventBus
Difficulty          | (data only, no deps)
PlayerController    | Renderer.camera, InputManager, CollisionSystem, EventBus
WeaponSystem        | PlayerController, CollisionSystem, EventBus, AudioManager
EnemyAI             | LevelLoader, CollisionSystem, EventBus, AudioManager
EnemyTypes          | (data only, no deps)
DoorSystem          | LevelLoader, CollisionSystem, EventBus, AudioManager
PickupSystem        | LevelLoader, GameState, EventBus, AudioManager
PickupTypes         | (data only, no deps)
HUD                 | GameState, EventBus
MenuSystem          | EventBus, AudioManager
CinematicSystem     | Renderer, AudioManager, EventBus
LoadingScreen       | (DOM only)
```

### Event Bus Messages

The EventBus decouples modules. Key events:

```javascript
// Player events
'player:damage'         // { amount, sourcePosition }
'player:heal'           // { amount }
'player:death'          // {}
'player:pickup'         // { pickupType, pickupData }
'player:fire'           // { weaponId }

// Enemy events
'enemy:damage'          // { enemy, damage }
'enemy:death'           // { enemy, position }
'enemy:alert'           // { enemy }
'enemy:attack'          // { enemy, targetPosition }

// Level events
'level:load'            // { levelId }
'level:complete'        // { stats }
'level:secretFound'     // { secretData }
'level:doorOpen'        // { doorData }

// Audio events
'sfx:play'              // { sfxId, options }
'sfx:playPositional'    // { sfxId, position }
'music:play'            // { trackId }
'music:stop'            // {}
'voice:play'            // { voiceId }

// Rendering events
'renderer:muzzleFlash'  // {}
'vfx:bulletHit'         // { position }

// Sound propagation
'sound:propagate'       // { position, radius }

// UI events
'ui:showMenu'           // { menuId }
'ui:hideMenu'           // {}
'ui:updateHUD'          // { field, value }

// Game flow
'game:start'            // { episode, level, difficulty }
'game:pause'            // {}
'game:resume'           // {}
'game:over'             // {}
```

---

## 10. Key Algorithms

### 10.1 A* Pathfinding (for enemy navigation)

Used when enemy has lost line-of-sight and needs to navigate around walls to reach player's last
known position:

```javascript
findPath(startGrid, goalGrid) {
    const openSet = new MinHeap(); // Priority queue by f-score
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startGrid.x},${startGrid.z}`;
    const goalKey = `${goalGrid.x},${goalGrid.z}`;

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(startGrid, goalGrid));
    openSet.insert({ key: startKey, ...startGrid }, fScore.get(startKey));

    while (!openSet.isEmpty()) {
        const current = openSet.extractMin();

        if (current.key === goalKey) {
            return this.reconstructPath(cameFrom, current.key);
        }

        // Check 4 cardinal neighbors (no diagonal movement, like original)
        for (const [dx, dz] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = current.x + dx;
            const nz = current.z + dz;
            const neighborKey = `${nx},${nz}`;

            if (!this.levelLoader.isWalkable(nx, nz)) continue;

            const tentativeG = gScore.get(current.key) + 1;

            if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
                cameFrom.set(neighborKey, current.key);
                gScore.set(neighborKey, tentativeG);
                fScore.set(neighborKey, tentativeG + this.heuristic({ x: nx, z: nz }, goalGrid));
                openSet.insert({ key: neighborKey, x: nx, z: nz }, fScore.get(neighborKey));
            }
        }
    }

    return null; // No path found
}

heuristic(a, b) {
    // Manhattan distance (no diagonal movement)
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}
```

**Performance note**: A* on a 64x64 grid is extremely fast (microseconds). No optimization needed
beyond basic implementation. Cache paths and recalculate only when doors open/close.

### 10.2 DDA Raycasting (for sight lines and hitscan)

The Digital Differential Analyzer steps through the grid tile-by-tile along a ray. This is the
same fundamental algorithm the original Wolfenstein used for rendering:

```javascript
castRay(originX, originZ, dirX, dirZ, maxDist = 64) {
    // Current grid position
    let mapX = Math.floor(originX / TILE_SIZE);
    let mapZ = Math.floor(originZ / TILE_SIZE);

    // Direction of step (+1 or -1)
    const stepX = dirX >= 0 ? 1 : -1;
    const stepZ = dirZ >= 0 ? 1 : -1;

    // Distance between grid line intersections
    const tDeltaX = dirX !== 0 ? Math.abs(TILE_SIZE / dirX) : Infinity;
    const tDeltaZ = dirZ !== 0 ? Math.abs(TILE_SIZE / dirZ) : Infinity;

    // Distance to first grid line in each axis
    let tMaxX, tMaxZ;
    if (dirX >= 0) {
        tMaxX = ((mapX + 1) * TILE_SIZE - originX) / dirX;
    } else {
        tMaxX = (mapX * TILE_SIZE - originX) / dirX;
    }
    if (dirZ >= 0) {
        tMaxZ = ((mapZ + 1) * TILE_SIZE - originZ) / dirZ;
    } else {
        tMaxZ = (mapZ * TILE_SIZE - originZ) / dirZ;
    }

    let side; // 0 = hit X wall, 1 = hit Z wall
    let distance = 0;

    while (distance < maxDist) {
        if (tMaxX < tMaxZ) {
            tMaxX += tDeltaX;
            mapX += stepX;
            side = 0;
            distance = tMaxX - tDeltaX;
        } else {
            tMaxZ += tDeltaZ;
            mapZ += stepZ;
            side = 1;
            distance = tMaxZ - tDeltaZ;
        }

        // Check what we hit
        const tile = this.getTileAt(mapX, mapZ);
        if (tile > 0) {
            return {
                hit: true,
                distance,
                gridX: mapX,
                gridZ: mapZ,
                side,
                wallType: tile,
                // Exact hit point for texture mapping
                hitX: originX + dirX * distance,
                hitZ: originZ + dirZ * distance
            };
        }
    }

    return { hit: false, distance: maxDist };
}
```

### 10.3 Bresenham's Line (for line-of-sight checks)

Faster than DDA when you only need to know "can enemy see player" (boolean, no distance):

```javascript
lineOfSight(x0, z0, x1, z1) {
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (true) {
        if (x0 === x1 && z0 === z1) return true; // Reached target

        // Check current tile (skip start tile -- that's the enemy's own tile)
        if (!(x0 === startX && z0 === startZ)) {
            if (!this.levelLoader.isWalkable(x0, z0)) return false; // Blocked by wall
        }

        const e2 = 2 * err;
        if (e2 > -dz) { err -= dz; x0 += sx; }
        if (e2 < dx)  { err += dx; z0 += sz; }
    }
}
```

### 10.4 Billboard Sprite Direction Selection

Enemies are 2D sprites but must face the correct direction relative to the camera. Given the
enemy's facing angle and the camera's position, select the correct sprite frame:

```javascript
getDirectionalFrame(enemy, cameraPosition) {
    // Angle from enemy to camera
    const toCamera = Math.atan2(
        cameraPosition.z - enemy.position.z,
        cameraPosition.x - enemy.position.x
    );

    // Relative angle (enemy's facing vs direction to camera)
    let relativeAngle = normalizeAngle(toCamera - enemy.angle);

    // Map to 8 directions (0 = facing camera, 4 = facing away)
    // Each direction covers 45 degrees
    const direction = Math.round(relativeAngle / (Math.PI / 4)) & 7;

    // Return frame index: base_frame + direction
    return enemy.frames[enemy.animState] + direction;
}

function normalizeAngle(angle) {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
}
```

### 10.5 Weapon Damage Formula (matching original)

```javascript
calculateDamage(weapon, distance) {
    // Original Wolfenstein formula:
    // Roll 1-4 dice, each die gives 1 to (base_damage/4)
    // Result diminishes with distance

    const baseDamage = weapon.damage;
    const diceCount = 1 + Math.floor(Math.random() * 4); // 1-4 dice
    let totalDamage = 0;

    for (let i = 0; i < diceCount; i++) {
        totalDamage += 1 + Math.floor(Math.random() * (baseDamage / 4));
    }

    // Distance falloff (not in original, but adds tactical depth)
    // Full damage within 4 tiles, linear falloff to 50% at 16 tiles
    const distanceTiles = distance / TILE_SIZE;
    if (distanceTiles > 4) {
        const falloff = 1.0 - Math.min((distanceTiles - 4) / 24, 0.5);
        totalDamage = Math.floor(totalDamage * falloff);
    }

    return Math.max(1, totalDamage); // Minimum 1 damage
}
```

---

## 11. Performance Strategy

### 11.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS (desktop) | 60 | requestAnimationFrame delta time |
| FPS (mobile iPhone 12+) | 30 | Same |
| First paint | < 2s | Menu visible |
| Level load | < 3s | From click to playable |
| Total download (per episode) | < 10MB | Lazy loaded |
| Total download (all episodes) | < 50MB | Only loaded as needed |
| Memory (heap) | < 200MB | Chrome DevTools |
| Draw calls per frame | < 50 | renderer.info.render.calls |

### 11.2 Optimization Techniques

**Geometry**:

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| InstancedMesh for walls | **Massive** -- reduces draw calls from thousands to ~10 (one per texture) | Group by texture, use InstancedMesh |
| Face culling | **High** -- skip non-visible wall faces | Only create faces adjacent to empty space |
| Frustum culling | **Medium** -- Three.js does this automatically | Enabled by default |
| LOD for 3D boss models | **Low** -- only 1-2 models | Three.js LOD helper |

**Rendering**:

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| No shadows | **High** | `renderer.shadowMap.enabled = false` |
| MeshLambertMaterial (not Standard/Physical) | **Medium** | Cheaper lighting calculations |
| NearestFilter on textures | **Low** (also stylistic) | Pixel-perfect, no mipmapping cost |
| Cap pixel ratio at 2 | **Medium on mobile** | `setPixelRatio(Math.min(dpr, 2))` |
| Conditional post-processing | **Medium** | Disable bloom/CRT on low-end devices |

**Memory**:

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| Lazy load episodes | **High** | Only load current episode's assets |
| Dispose on level unload | **Critical** | `geometry.dispose()`, `material.dispose()`, `texture.dispose()` |
| Object pooling for SFX | **Medium** | Reuse AudioBufferSourceNodes |
| Sprite sheets (not individual images) | **Medium** | Fewer HTTP requests, single texture per enemy |
| Texture atlas for walls | **Optional** | Merge wall textures into one atlas (fewer material switches) |

**Asset Loading**:

```javascript
// Lazy loading per episode
async loadEpisode(episodeNum) {
    const manifest = await fetch(`assets/levels/e${episodeNum}-manifest.json`);
    const assets = manifest.json();

    // Load textures
    const texturePromises = assets.textures.map(t => this.loadTexture(t));

    // Load audio
    const audioPromises = assets.audio.map(a => this.loadAudio(a));

    // Load sprites
    const spritePromises = assets.sprites.map(s => this.loadSprite(s));

    // Load levels (just JSON, very fast)
    const levelPromises = assets.levels.map(l => fetch(l).then(r => r.json()));

    // Wait for critical assets (textures + level data)
    await Promise.all([...texturePromises, ...levelPromises]);

    // Audio can finish loading in background
    Promise.all([...audioPromises, ...spritePromises]).then(() => {
        this.episodeFullyLoaded = true;
    });
}
```

### 11.3 Mobile-Specific Optimizations

```javascript
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isMobile) {
    // Reduce render resolution
    renderer.setPixelRatio(1); // 1x instead of 2x

    // Disable post-processing
    postProcessingEnabled = false;

    // Reduce fog density (fewer fragment shader calculations)
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.05);

    // Simplify materials
    // Use MeshBasicMaterial instead of MeshLambertMaterial (no lighting calc)

    // Lower enemy sprite resolution
    // Use 32x32 sprites instead of 64x64

    // Reduce draw distance
    camera.far = 50; // Instead of 100
}
```

### 11.4 Frame Budget

At 60fps, each frame has 16.67ms. Budget allocation:

| System | Budget | Notes |
|--------|--------|-------|
| Input processing | 0.1ms | Trivial |
| Player movement + collision | 0.3ms | Grid check is O(1) |
| Enemy AI (all enemies) | 1.0ms | ~20 enemies * 50us each |
| Weapon system | 0.1ms | Hitscan is single raycast |
| Door animations | 0.1ms | Simple lerp |
| Pickup checks | 0.1ms | Distance checks |
| Audio updates | 0.2ms | Web Audio is async |
| HUD updates | 0.2ms | DOM updates batched |
| Three.js render | ~10ms | The bulk of the frame |
| Post-processing | ~3ms | Bloom + vignette |
| **Total** | **~15ms** | **1.5ms headroom** |

---

## 12. Development Phases

### Phase 1: Core Engine (Foundation)

**Goal**: Walk around a textured room.

**Deliverables**:
- `renderer.js` -- Three.js scene, camera, lighting
- `level-loader.js` -- Parse JSON, generate walls + floor + ceiling
- `collision.js` -- Player-wall collision with sliding
- `input.js` -- Keyboard + pointer lock
- `player-controller.js` -- WASD movement + mouse look
- `constants.js` -- TILE_SIZE, WALL_HEIGHT, speeds
- `math.js` -- Grid conversion helpers
- `main.js` -- Boot sequence, game loop
- `index.html` + `styles.css` -- Canvas + basic layout
- One test level JSON (10x10 room with corridors)

**Verification**: Player can walk through a multi-room level, collide with walls, look around.
Runs at 60fps.

**Estimated effort**: 1 session

### Phase 2: Combat System

**Goal**: Shoot enemies, take damage, die.

**Deliverables**:
- `weapon-system.js` -- All 4 weapons, hitscan, ammo
- `enemy-ai.js` -- State machine, sight detection, movement, attack
- `enemy-types.js` -- Guard, SS, Officer, Dog, Mutant stats
- `pickup-system.js` -- Health, ammo, treasure, keys, weapons
- `game-state.js` -- Player health, ammo, score, lives
- `scoring.js` -- Kill/secret/treasure tracking
- `event-bus.js` -- Decoupled communication

**Verification**: Can fight guards, pick up health and ammo, die and respawn. Enemy AI works
(idle -> alert -> chase -> attack cycle).

**Estimated effort**: 1-2 sessions

### Phase 3: Game Loop & UI

**Goal**: Complete game flow from menu to level completion.

**Deliverables**:
- `door-system.js` -- All door types with animations
- `difficulty.js` -- 4 difficulty levels
- `hud.js` -- Full status bar with BJ face
- `menu.js` -- Main menu, pause, options, difficulty select
- `cinematics.js` -- Level transitions, death sequence, stats screen
- `loading.js` -- Loading screen with progress
- `save-manager.js` -- Save/load game state
- Secret push-walls

**Verification**: Can start game from menu, select difficulty, play through level, see stats
screen, proceed to next level. Save and load works.

**Estimated effort**: 1-2 sessions

### Phase 4: AI Assets

**Goal**: Replace placeholder textures and sprites with AI-generated assets.

**Deliverables**:
- 8-12 wall textures (Flux)
- 2-3 floor textures (Flux)
- 4 door textures (Flux)
- Enemy sprite sheets -- at minimum guards and SS (Flux)
- Weapon first-person sprites (Flux)
- Pickup sprites (Flux)
- BJ face health states (Flux)
- HUD fonts and styling

**Verification**: Game looks cohesive with consistent art style. All placeholder art replaced.

**Estimated effort**: 2-3 sessions (asset generation is iterative)

### Phase 5: Audio & Polish

**Goal**: Sound design, music, voice acting, visual polish.

**Deliverables**:
- All SFX (ElevenLabs Sound Effects)
- Enemy voice lines (ElevenLabs TTS)
- BJ voice lines (ElevenLabs TTS)
- Background music per episode (Suno, generated by Richard)
- Post-processing pipeline (bloom, vignette, optional CRT)
- Boss introduction cinematics
- Episode intro/outro screens

**Verification**: Audio-visual experience feels complete. Music plays during gameplay, enemies
shout alerts, weapons have satisfying sounds.

**Estimated effort**: 2 sessions

### Phase 6: Content & Levels

**Goal**: Multiple playable levels with proper enemy/item placement.

**Deliverables**:
- E1M1 through E1M3 (minimum 3 levels for Episode 1)
- Boss level (E1M8 or E1M9)
- Level design guide documentation
- Secret rooms properly placed
- Balanced enemy/item placement per difficulty
- Boss fight (Hans Grosse)

**Verification**: Episode 1 is playable from start to boss fight. Difficulty scaling works.
Secrets are discoverable.

**Estimated effort**: 2-3 sessions

### Phase 7: Testing & Optimization

**Goal**: Performance, mobile support, browser compatibility.

**Deliverables**:
- Mobile touch controls
- Mobile performance optimizations
- Browser testing (Chrome, Firefox, Safari)
- Performance profiling and optimization
- Bug fixes from playtesting

**Verification**: 60fps desktop, 30fps mobile. Works on all major browsers. No crashes.

**Estimated effort**: 1-2 sessions

### Phase 8: Deployment

**Goal**: Live on theuws.com/games/wolfenstein3d/

**Deliverables**:
- Landing page card added
- INVENTORY.md updated
- `deploy-ftp.sh wolfenstein3d`
- OG image generated
- Final testing on production URL

**Verification**: Accessible at https://theuws.com/games/wolfenstein3d/, loads correctly,
no mixed content issues, all assets resolve.

**Estimated effort**: 0.5 session

---

## 13. Technical Constraints & Decisions

### Why Plain HTML/JS (no build step)?

1. **Portfolio consistency**: 26 of 29 games use plain HTML/JS. The Wolfenstein 3D remake should
   be directly deployable via FTP without requiring `npm run build`.
2. **Simplicity**: No webpack/vite config to maintain. Files load via native ES modules.
3. **Three.js CDN**: Three.js via import map is well-supported in all modern browsers.
4. **Debugging**: Source code matches deployed code. No source maps needed.

### Why ES6 Modules (not bundled)?

Modern browsers handle ES modules natively. With HTTP/2, the overhead of many small files is
negligible. Import maps provide clean `import * as THREE from 'three'` syntax.

### Why Grid-Based Collision (not Three.js physics)?

1. **Authenticity**: The original Wolfenstein used grid collision. It creates the characteristic
   "wall sliding" feel.
2. **Performance**: Grid lookup is O(1). No AABB tree, no broadphase. Trivially fast.
3. **Simplicity**: No third-party physics library (Cannon.js, Ammo.js) needed.
4. **Determinism**: Grid collision is perfectly deterministic. No floating-point edge cases.

### Why Billboard Sprites for Enemies (not 3D models)?

1. **Authenticity**: The original used 2D sprites. It's a defining aesthetic.
2. **Performance**: Sprites are single quads. 50 sprites cost less than 5 3D models.
3. **Asset pipeline**: Easier to generate with Flux than rigging/animating 3D models.
4. **Exception**: Bosses may optionally use low-poly 3D models (Meshy) for dramatic impact.

### Why HTML/CSS HUD (not Three.js overlay)?

1. **Resolution independence**: CSS scales perfectly at any resolution.
2. **Accessibility**: Screen readers can parse the HUD.
3. **Maintainability**: Styling changes don't require shader knowledge.
4. **Performance**: DOM updates are batched and only happen on state change, not every frame.

### Why Event Bus (not direct method calls)?

1. **Decoupling**: Weapons don't need a reference to the Audio system. They just emit
   `'sfx:play'` and the SFXPlayer handles it.
2. **Extensibility**: Adding new systems (analytics, replay recording) requires zero changes to
   existing modules.
3. **Debugging**: Can log all events to console for debugging.

### Browser Support Target

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Primary dev target |
| Firefox | 90+ | Full support |
| Safari | 15+ | WebGL2, ES modules, import maps |
| Edge | 90+ | Chromium-based, same as Chrome |
| Mobile Safari | 15+ | iOS 15+ (import maps support) |
| Chrome Android | 90+ | Full support |

**Not supported**: Internet Explorer (any version), browsers without ES module + import map support.

### Key Constants

```javascript
// constants.js
export const TILE_SIZE = 1.0;          // 1 unit = 1 tile in Three.js
export const WALL_HEIGHT = 1.0;        // Walls are cubic (1:1 ratio)
export const PLAYER_EYE_HEIGHT = 0.6;  // Camera height within tile
export const PLAYER_RADIUS = 0.25;     // Collision radius
export const WALK_SPEED = 3.0;         // Tiles per second
export const SPRINT_SPEED = 5.0;       // Tiles per second
export const MOUSE_SENSITIVITY = 0.002;// Radians per pixel
export const BOB_AMOUNT_X = 0.02;      // Horizontal weapon bob
export const BOB_AMOUNT_Y = 0.04;      // Vertical weapon bob
export const DOOR_SPEED = 2.0;         // Tiles per second (door slide)
export const DOOR_OPEN_DURATION = 4.0; // Seconds before auto-close
export const ENEMY_FOV = Math.PI * 2/3;// 120 degrees
export const MAX_ENEMIES_PER_LEVEL = 100;
export const PICKUP_RADIUS = 0.5;      // Auto-collect distance
export const SAVE_VERSION = 1;
```

---

## Appendix: main.js Boot Sequence

```javascript
// main.js -- Complete initialization and game loop

import { EventBus } from './utils/event-bus.js';
import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { LevelLoader } from './engine/level-loader.js';
import { CollisionSystem } from './engine/collision.js';
import { AudioManager } from './audio/audio-manager.js';
import { SFXPlayer } from './audio/sfx-player.js';
import { MusicPlayer } from './audio/music-player.js';
import { VoicePlayer } from './audio/voice-player.js';
import { GameState } from './game/game-state.js';
import { PlayerController } from './game/player-controller.js';
import { WeaponSystem } from './game/weapon-system.js';
import { EnemyAI } from './game/enemy-ai.js';
import { DoorSystem } from './game/door-system.js';
import { PickupSystem } from './game/pickup-system.js';
import { ScoringSystem } from './game/scoring.js';
import { HUD } from './ui/hud.js';
import { MenuSystem } from './ui/menu.js';
import { CinematicSystem } from './ui/cinematics.js';
import { LoadingScreen } from './ui/loading.js';

class Game {
    constructor() {
        // Phase 1: Core systems (no dependencies)
        this.eventBus = new EventBus();
        this.loadingScreen = new LoadingScreen();

        // Phase 2: Renderer + Input
        const canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.input.init(canvas);

        // Phase 3: Audio
        this.audioManager = new AudioManager();
        this.sfx = new SFXPlayer(this.audioManager);
        this.music = new MusicPlayer(this.audioManager);
        this.voice = new VoicePlayer(this.audioManager);

        // Phase 4: Level + Collision
        this.levelLoader = new LevelLoader(this.renderer);
        this.collision = new CollisionSystem(this.levelLoader);

        // Phase 5: Game state
        this.gameState = new GameState(this.eventBus);
        this.scoring = new ScoringSystem(this.gameState, this.eventBus);

        // Phase 6: Player + Combat
        this.player = new PlayerController(
            this.renderer.camera, this.input, this.collision, this.eventBus
        );
        this.weapons = new WeaponSystem(
            this.player, this.collision, this.eventBus
        );
        this.enemies = new EnemyAI(
            this.levelLoader, this.collision, this.eventBus
        );
        this.doors = new DoorSystem(
            this.levelLoader, this.collision, this.eventBus
        );
        this.pickups = new PickupSystem(
            this.levelLoader, this.gameState, this.eventBus
        );

        // Phase 7: UI
        this.hud = new HUD(this.gameState, this.eventBus);
        this.menus = new MenuSystem(this.eventBus);
        this.cinematics = new CinematicSystem(
            this.renderer, this.audioManager, this.eventBus
        );

        // Wire up event listeners
        this.registerEventHandlers();

        // State
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
    }

    registerEventHandlers() {
        this.eventBus.on('game:start', (data) => this.startGame(data));
        this.eventBus.on('game:pause', () => this.pause());
        this.eventBus.on('game:resume', () => this.resume());
        this.eventBus.on('level:complete', (stats) => this.onLevelComplete(stats));
        this.eventBus.on('player:death', () => this.onPlayerDeath());
        // ... more event wiring
    }

    async startGame({ episode, level, difficulty }) {
        this.loadingScreen.show(`E${episode}M${level}`);

        // Initialize audio context (requires user interaction -- already happened via menu click)
        this.audioManager.init();

        // Load level
        this.loadingScreen.updateProgress(10, 'Loading level data...');
        const levelData = await this.levelLoader.loadLevel(`e${episode}m${level}`);

        this.loadingScreen.updateProgress(40, 'Building geometry...');
        this.levelLoader.buildGeometry(levelData);

        this.loadingScreen.updateProgress(60, 'Spawning entities...');
        this.collision.setLevel(levelData);
        this.enemies.spawnFromLevelData(levelData.entities, difficulty);
        this.pickups.placeFromLevelData(levelData.pickups);
        this.doors.createFromLevelData(levelData.doors);

        this.loadingScreen.updateProgress(80, 'Setting up player...');
        this.player.respawn(levelData.playerStart);
        this.gameState.resetForNewLevel();

        this.loadingScreen.updateProgress(90, 'Loading audio...');
        await this.sfx.preloadEssentials();
        this.music.play(levelData.meta.music);

        this.loadingScreen.updateProgress(100, 'Ready!');
        await this.loadingScreen.hide();

        // Lock pointer and start
        this.input.requestPointerLock();
        this.hud.show();
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap at 50ms
        this.lastTime = timestamp;

        if (!this.isPaused && !this.cinematics.isPlaying()) {
            // Update all systems
            this.input.update();
            this.player.update(deltaTime);
            this.weapons.update(deltaTime);
            this.enemies.update(deltaTime, this.player.getPosition());
            this.doors.update(deltaTime);
            this.pickups.checkCollection(this.player.getPosition());
        }

        // Always render (even when paused -- for menu overlay)
        this.renderer.render(deltaTime);

        // Continue loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    pause() {
        this.isPaused = true;
        document.exitPointerLock();
        this.menus.showPauseMenu();
    }

    resume() {
        this.isPaused = false;
        this.input.requestPointerLock();
        this.menus.closeAll();
    }

    async onLevelComplete(stats) {
        this.isRunning = false;
        document.exitPointerLock();
        await this.cinematics.playLevelComplete(stats);
        // Advance to next level...
    }

    onPlayerDeath() {
        if (this.gameState.lives > 0) {
            this.gameState.lives--;
            this.gameState.resetForNewLife();
            // Reload current level
        } else {
            // Game over
            this.isRunning = false;
            this.cinematics.playDeathSequence().then(() => {
                this.menus.showDeathScreen();
            });
        }
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    window.game.menus.showMainMenu();
});
```

---

**End of Technical Blueprint**

This document serves as the definitive technical reference for the Wolfenstein 3D browser remake.
All implementation decisions, algorithms, data formats, and performance strategies are captured
here. Refer to this blueprint during every development session.
