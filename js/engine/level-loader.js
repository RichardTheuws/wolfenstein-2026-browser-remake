/**
 * level-loader.js — Level Loading & Geometry Generation
 *
 * Loads JSON level files (64x64 grid format), converts them to Three.js geometry
 * using InstancedMesh for walls grouped by texture type. Generates floor/ceiling
 * planes, door meshes, and extracts spawn/entity positions.
 */

import * as THREE from 'three';

/** Wall height in world units (each grid cell is 1x1, walls are 2 tall) */
const WALL_HEIGHT = 2.0;

/** Door thickness for the door mesh */
const DOOR_THICKNESS = 0.1;

/**
 * Episode-specific texture overrides.
 * Maps wall type number to the texture path (relative to assets/textures/).
 * Only wall types that differ from the default set need entries.
 */
const EPISODE_TEXTURES = {
    2: {
        walls: {
            1: 'e2/e2_wall_concrete.jpg',
            3: 'e2/e2_wall_tiles.jpg',
            4: 'e2/e2_wall_cell.jpg',
            7: 'e2/e2_wall_metal.jpg',
        },
        floor: 'e2/e2_floor.jpg',
        ceiling: 'e2/e2_ceiling.jpg',
    },
    3: {
        walls: {
            1: 'e3/e3_wall_concrete.jpg',
            3: 'e3/e3_wall_tiles.jpg',
            5: 'e3/e3_wall_wood.jpg',
            7: 'e3/e3_wall_metal.jpg',
        },
        floor: 'e3/e3_floor.jpg',
        ceiling: 'e3/e3_ceiling.jpg',
    },
};

/** Directions for face culling checks: [dx, dz, rotationY, offsetX, offsetZ] */
const FACE_DIRECTIONS = [
    { name: 'north', dx: 0, dz: -1, rotY: Math.PI,      offX: 0.5, offZ: 0.0 },
    { name: 'south', dx: 0, dz: 1,  rotY: 0,            offX: 0.5, offZ: 1.0 },
    { name: 'east',  dx: 1, dz: 0,  rotY: Math.PI / 2,  offX: 1.0, offZ: 0.5 },
    { name: 'west',  dx: -1, dz: 0, rotY: -Math.PI / 2, offX: 0.0, offZ: 0.5 },
];

export class LevelLoader {
    /**
     * @param {THREE.Scene} scene - The scene to add geometry to
     */
    constructor(scene) {
        /** @type {THREE.Scene} */
        this.scene = scene;

        /** @type {number[][]} The wall grid [z][x] */
        this.grid = [];

        /** Grid dimensions */
        this.width = 0;
        this.height = 0;

        /** Meshes created for this level (for cleanup) */
        this._meshes = [];

        /** Loaded textures cache */
        this._textures = new Map();

        /** Texture loader */
        this._textureLoader = new THREE.TextureLoader();

        /** Player spawn point from level data */
        this.spawnPoint = { x: 1.5, z: 1.5, angle: 0 };

        /** Door definitions from level data */
        this.doors = [];

        /** Entity spawn positions (enemies, items) for other systems to use */
        this.entities = [];
        this.pickups = [];
        this.secrets = [];
        this.decorations = [];
    }

    /**
     * Load a level by ID. Fetches the JSON, builds geometry, returns level data.
     * @param {string} levelId - e.g. 'e1m1'
     * @returns {Promise<object>} Parsed level data
     */
    async loadLevel(levelId) {
        // Clean up previous level
        this.unloadLevel();

        // Fetch level JSON
        const url = `assets/levels/${levelId}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load level: ${url} (${response.status})`);
        }
        const levelData = await response.json();

        // Determine episode number from level data or level ID (e.g. 'e2m1' → 2)
        const episode = levelData.episode
            || (levelId.match(/^e(\d+)/)?.[1] ? parseInt(levelId.match(/^e(\d+)/)[1], 10) : 1);

        // Load textures (with episode-specific overrides when available)
        await this._loadTextures(levelData.wallTextures || {}, episode);

        // Parse grid dimensions — support both formats:
        //   Blueprint: { dimensions: { width, height } }
        //   Existing:  { width, height } at top level
        this.width = levelData.dimensions?.width || levelData.width || 64;
        this.height = levelData.dimensions?.height || levelData.height || 64;

        // Parse wall grid
        this.grid = this._parseWallGrid(levelData.walls);

        // Collect door positions so wall builder can skip them
        // (doors have their own meshes — don't render wall faces at door cells)
        this._doorCells = new Set();
        for (const d of (levelData.doors || [])) {
            this._doorCells.add(`${d.x},${d.z}`);
        }

        // Build Three.js geometry
        this._buildWalls();
        this._buildFloorCeiling(levelData.meta || levelData);

        // Parse spawn point
        if (levelData.playerStart) {
            this.spawnPoint = {
                x: levelData.playerStart.x + 0.5,
                z: levelData.playerStart.z + 0.5,
                angle: (levelData.playerStart.angle || 0) * (Math.PI / 180),
            };
        }

        // Parse doors and build door meshes
        // Support both formats:
        //   Blueprint: { orientation: 'horizontal'|'vertical' }
        //   Existing:  { axis: 'x'|'z' } where axis=x means door slides along X (horizontal)
        this.doors = (levelData.doors || []).map((d, i) => {
            let orientation = d.orientation || 'horizontal';
            if (d.axis) {
                orientation = d.axis === 'x' ? 'horizontal' : 'vertical';
            }
            return {
                id: i,
                gridX: d.x,
                gridZ: d.z,
                type: d.type || 'normal',
                orientation,
                texture: d.texture || null,
                requiredKey: d.type === 'gold' ? 'gold' : d.type === 'silver' ? 'silver' : null,
            };
        });
        this._buildDoors();

        // Extract entity positions (for enemy AI / pickup systems in later phases)
        // Handle both integer grid coords (add 0.5) and float world coords (use as-is)
        this.entities = (levelData.entities || []).map((e, i) => {
            const isFloatCoord = e.x !== Math.floor(e.x);
            return {
                id: e.id || `entity_${i}`,
                type: e.type,
                x: isFloatCoord ? e.x : e.x + 0.5,
                z: isFloatCoord ? e.z : e.z + 0.5,
                angle: (e.angle || 0) * (Math.PI / 180),
            };
        });

        // Support both 'pickups' (blueprint) and 'items' (existing format)
        const pickupsData = levelData.pickups || levelData.items || [];
        this.pickups = pickupsData.map((p, i) => {
            const isFloatCoord = p.x !== Math.floor(p.x);
            return {
                id: p.id || `pickup_${i}`,
                type: p.type,
                x: isFloatCoord ? p.x : p.x + 0.5,
                z: isFloatCoord ? p.z : p.z + 0.5,
                hidden: p.hidden || false,
            };
        });

        this.secrets = (levelData.secrets || []).map((s) => ({
            x: s.x,
            z: s.z,
            pushDirection: s.pushDirection || 'north',
            revealPickups: s.revealPickups || [],
        }));

        this.decorations = (levelData.decorations || []).map((d) => ({
            type: d.type,
            x: d.x + 0.5,
            z: d.z + 0.5,
            blocking: d.blocking || false,
        }));

        // Store exit position (for level-exit system)
        this.exit = levelData.exit || null;

        // Store full level data (for boss levels and other systems)
        this.levelData = levelData;

        return levelData;
    }

    /**
     * Remove all level geometry from the scene and free resources.
     */
    unloadLevel() {
        for (const mesh of this._meshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((m) => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        this._meshes = [];
        this.grid = [];
        this.doors = [];
        this.entities = [];
        this.pickups = [];
        this.secrets = [];
        this.decorations = [];
    }

    /**
     * Get the wall type at a grid position.
     * @param {number} gridX
     * @param {number} gridZ
     * @returns {number} Wall type (0 = empty)
     */
    getTileAt(gridX, gridZ) {
        if (gridX < 0 || gridX >= this.width || gridZ < 0 || gridZ >= this.height) {
            return -1;
        }
        return this.grid[gridZ][gridX];
    }

    /**
     * Get the door mesh objects (for DoorSystem to animate).
     * @returns {THREE.Mesh[]}
     */
    getDoorMeshes() {
        return this._doorMeshes || [];
    }

    // ── Internal: Texture Loading ───────────────────────────────────

    /**
     * Load wall textures from the wallTextures mapping.
     * Falls back to procedural textures if files are unavailable.
     * Supports episode-specific texture overrides (e.g. Episode 2 lab textures).
     * @param {Object<string, string>} textureMap - { wallTypeId: texturePath }
     * @param {number} [episode=1] - Episode number for theme-specific textures
     */
    async _loadTextures(textureMap, episode = 1) {
        // Fallback colors matching Wolfenstein wall types from GAMEPLAY-ANALYSIS
        const fallbackColors = {
            1: 0x808080,  // Grey stone wall
            2: 0x707090,  // Grey stone with eagle banner
            3: 0x4A6A8C,  // Blue stone brick
            4: 0x3A4A6C,  // Blue stone with cell door
            5: 0x8C6A3A,  // Wood paneling
            6: 0x7A5A2A,  // Wood with portrait
            7: 0x6A6A7A,  // Metal/steel
            8: 0x5A4A3A,  // Door frame
            9: 0x4A4A5A,  // Elevator/exit wall
        };

        // Generate procedural fallback textures for all wall types
        for (const [type, color] of Object.entries(fallbackColors)) {
            this._textures.set(Number(type), this._createFallbackTexture(color));
        }

        // Load texture files for all wall types (override fallbacks if found)
        const textureFiles = {
            1: 'wall_grey_stone.jpg',
            2: 'wall_grey_eagle.jpg',
            3: 'wall_blue_brick.jpg',
            4: 'wall_blue_cell.jpg',
            5: 'wall_wood.jpg',
            6: 'wall_wood_portrait.jpg',
            7: 'wall_metal.jpg',
            8: 'wall_doorframe.jpg',
            9: 'wall_elevator.jpg',
        };
        for (const [type, filename] of Object.entries(textureFiles)) {
            try {
                const tex = await this._loadTexture(`assets/textures/${filename}`);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace;
                this._textures.set(Number(type), tex);
            } catch {
                // Keep the procedural fallback
            }
        }

        // Episode-specific wall texture overrides (e.g. Episode 2 laboratory theme)
        const episodeConfig = EPISODE_TEXTURES[episode];
        if (episodeConfig?.walls) {
            for (const [type, filename] of Object.entries(episodeConfig.walls)) {
                try {
                    const tex = await this._loadTexture(`assets/textures/${filename}`);
                    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                    tex.colorSpace = THREE.SRGBColorSpace;
                    this._textures.set(Number(type), tex);
                } catch {
                    // Keep the default texture for this wall type
                }
            }
        }

        // Load floor and ceiling textures (defaults first, then episode overrides)
        try {
            const floorTex = await this._loadTexture('assets/textures/floor.jpg');
            floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
            floorTex.colorSpace = THREE.SRGBColorSpace;
            this._textures.set('floor', floorTex);
        } catch {
            this._textures.set('floor', this._createFallbackTexture(0x404040));
        }

        try {
            const ceilTex = await this._loadTexture('assets/textures/ceiling.jpg');
            ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
            ceilTex.colorSpace = THREE.SRGBColorSpace;
            this._textures.set('ceiling', ceilTex);
        } catch {
            this._textures.set('ceiling', this._createFallbackTexture(0x303030));
        }

        // Episode-specific floor/ceiling overrides
        if (episodeConfig?.floor) {
            try {
                const tex = await this._loadTexture(`assets/textures/${episodeConfig.floor}`);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace;
                this._textures.set('floor', tex);
            } catch {
                // Keep the default floor texture
            }
        }
        if (episodeConfig?.ceiling) {
            try {
                const tex = await this._loadTexture(`assets/textures/${episodeConfig.ceiling}`);
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace;
                this._textures.set('ceiling', tex);
            } catch {
                // Keep the default ceiling texture
            }
        }

        // Load door textures (keyed by door type string)
        const doorTextureFiles = {
            'normal':   'door_wood.jpg',
            'gold':     'door_gold.jpg',
            'silver':   'door_metal.jpg',
            'elevator': 'door_elevator.jpg',
        };
        for (const [doorType, filename] of Object.entries(doorTextureFiles)) {
            try {
                const tex = await this._loadTexture(`assets/textures/${filename}`);
                tex.colorSpace = THREE.SRGBColorSpace;
                this._textures.set(`door_${doorType}`, tex);
            } catch {
                // Keep using solid color fallback in _buildDoors
            }
        }
    }

    /**
     * Load a single texture, returning a promise.
     * @param {string} path
     * @returns {Promise<THREE.Texture>}
     */
    _loadTexture(path) {
        return new Promise((resolve, reject) => {
            this._textureLoader.load(path, resolve, undefined, reject);
        });
    }

    /**
     * Create a solid-color fallback texture.
     * @param {number} color - Hex color
     * @returns {THREE.Texture}
     */
    _createFallbackTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 64, 64);

        // Add some subtle brick-like lines for visual interest
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let y = 0; y < 64; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(64, y);
            ctx.stroke();
        }
        for (let x = 0; x < 64; x += 32) {
            for (let y = 0; y < 64; y += 32) {
                const offset = (y / 16) % 2 === 0 ? 0 : 16;
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + offset, y + 16);
                ctx.stroke();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    // ── Internal: Grid Parsing ──────────────────────────────────────

    /**
     * Parse the walls array from level JSON. Handles both the blueprint format
     * (2D array with optional comment string) and a flat 2D array.
     * @param {Array} wallsData
     * @returns {number[][]}
     */
    _parseWallGrid(wallsData) {
        if (!wallsData || wallsData.length === 0) {
            // Generate empty grid
            return Array.from({ length: this.height }, () =>
                new Array(this.width).fill(0)
            );
        }

        // Filter out comment strings (the blueprint format includes a comment as first element)
        const rows = wallsData.filter((row) => Array.isArray(row));

        // Pad or trim to expected dimensions
        const grid = [];
        for (let z = 0; z < this.height; z++) {
            if (z < rows.length) {
                const row = rows[z];
                // Pad row to width if shorter
                const paddedRow = new Array(this.width).fill(0);
                for (let x = 0; x < Math.min(row.length, this.width); x++) {
                    paddedRow[x] = row[x] || 0;
                }
                grid.push(paddedRow);
            } else {
                grid.push(new Array(this.width).fill(0));
            }
        }

        return grid;
    }

    // ── Internal: Wall Geometry ──────────────────────────────────────

    /**
     * Build wall geometry using InstancedMesh, grouped by wall texture type.
     * Only creates faces where a wall cell borders an empty cell (face culling).
     */
    _buildWalls() {
        // Group wall faces by texture type
        /** @type {Map<number, Array<{x: number, z: number, dir: object}>>} */
        const facesByTexture = new Map();

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const wallType = this.grid[z][x];
                if (wallType === 0) continue;

                // Skip door cells — they get their own meshes
                if (this._doorCells && this._doorCells.has(`${x},${z}`)) continue;

                // Check each direction for exposed faces
                for (const dir of FACE_DIRECTIONS) {
                    const nx = x + dir.dx;
                    const nz = z + dir.dz;

                    // Create face if neighbor is empty, out of bounds, or a door cell
                    const neighborIsDoor = this._doorCells && this._doorCells.has(`${nx},${nz}`);
                    const neighborIsEmpty =
                        nx < 0 || nx >= this.width || nz < 0 || nz >= this.height ||
                        this.grid[nz][nx] === 0 || neighborIsDoor;

                    if (neighborIsEmpty) {
                        if (!facesByTexture.has(wallType)) {
                            facesByTexture.set(wallType, []);
                        }
                        facesByTexture.get(wallType).push({ x, z, dir });
                    }
                }
            }
        }

        // Create one InstancedMesh per texture type
        const faceGeometry = new THREE.PlaneGeometry(1.0, WALL_HEIGHT);
        const dummy = new THREE.Object3D();

        for (const [wallType, faces] of facesByTexture) {
            const texture = this._textures.get(wallType) || this._textures.get(1);
            const material = new THREE.MeshLambertMaterial({
                map: texture,
                side: THREE.FrontSide,
            });

            const instancedMesh = new THREE.InstancedMesh(faceGeometry, material, faces.length);
            instancedMesh.castShadow = false;
            instancedMesh.receiveShadow = false;

            for (let i = 0; i < faces.length; i++) {
                const face = faces[i];

                // Position: cell origin + face offset
                dummy.position.set(
                    face.x + face.dir.offX,
                    WALL_HEIGHT / 2,
                    face.z + face.dir.offZ
                );
                dummy.rotation.set(0, face.dir.rotY, 0);
                dummy.updateMatrix();

                instancedMesh.setMatrixAt(i, dummy.matrix);
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedMesh);
            this._meshes.push(instancedMesh);
        }

        faceGeometry.dispose(); // The InstancedMesh clones it internally
    }

    // ── Internal: Floor & Ceiling ───────────────────────────────────

    /**
     * Build floor and ceiling planes.
     * @param {object} [meta] - Level meta for custom textures/colors
     */
    _buildFloorCeiling(meta) {
        const planeGeo = new THREE.PlaneGeometry(this.width, this.height);

        // Floor
        const floorTex = this._textures.get('floor');
        if (floorTex) {
            floorTex.repeat.set(this.width, this.height);
        }
        const floorMaterial = new THREE.MeshLambertMaterial({
            map: floorTex || undefined,
            color: floorTex ? 0xffffff : 0x404040,
            side: THREE.FrontSide,
        });
        const floor = new THREE.Mesh(planeGeo, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(this.width / 2, 0, this.height / 2);
        this.scene.add(floor);
        this._meshes.push(floor);

        // Ceiling
        const ceilTex = this._textures.get('ceiling');
        if (ceilTex) {
            ceilTex.repeat.set(this.width, this.height);
        }
        const ceilingColor = meta?.ceilingColor
            ? new THREE.Color(meta.ceilingColor)
            : 0x303030;
        const ceilMaterial = new THREE.MeshLambertMaterial({
            map: ceilTex || undefined,
            color: ceilTex ? 0xffffff : ceilingColor,
            side: THREE.FrontSide,
        });
        const ceiling = new THREE.Mesh(planeGeo.clone(), ceilMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(this.width / 2, WALL_HEIGHT, this.height / 2);
        this.scene.add(ceiling);
        this._meshes.push(ceiling);
    }

    // ── Internal: Door Geometry ──────────────────────────────────────

    /**
     * Build door meshes at door positions. Doors are thin boxes that slide open.
     * Uses generated door textures when available, falls back to solid color.
     */
    _buildDoors() {
        this._doorMeshes = [];

        // Fallback colors per door type (used when textures are unavailable)
        const doorFallbackColors = {
            'normal':   0x663300,
            'gold':     0xDAA520,
            'silver':   0x808080,
            'elevator': 0x505060,
        };

        for (const door of this.doors) {
            const isHorizontal = door.orientation === 'horizontal';
            const doorWidth = isHorizontal ? 1.0 : DOOR_THICKNESS;
            const doorDepth = isHorizontal ? DOOR_THICKNESS : 1.0;

            const geometry = new THREE.BoxGeometry(doorWidth, WALL_HEIGHT, doorDepth);

            // Look up door texture by type
            const doorType = door.type || 'normal';
            const doorTexture = this._textures.get(`door_${doorType}`);
            const fallbackColor = doorFallbackColors[doorType] || 0x663300;

            const material = new THREE.MeshLambertMaterial({
                map: doorTexture || undefined,
                color: doorTexture ? 0xffffff : fallbackColor,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                door.gridX + 0.5,
                WALL_HEIGHT / 2,
                door.gridZ + 0.5
            );

            // Store door metadata on the mesh for the DoorSystem to use
            mesh.userData = {
                doorId: door.id,
                gridX: door.gridX,
                gridZ: door.gridZ,
                orientation: door.orientation,
                type: door.type,
                requiredKey: door.requiredKey,
                openPosition: isHorizontal
                    ? mesh.position.x - 1.0  // Slide west
                    : mesh.position.z - 1.0,  // Slide north
                closedPosition: isHorizontal
                    ? mesh.position.x
                    : mesh.position.z,
            };

            this.scene.add(mesh);
            this._meshes.push(mesh);
            this._doorMeshes.push(mesh);
        }
    }
}
