/**
 * enemy.js — Single Enemy Entity with Wolfenstein-Faithful AI
 *
 * Manages one enemy's state machine (IDLE → ALERT → CHASE → ATTACK → PAIN → DEAD),
 * line-of-sight checks via DDA grid raycasting, movement with collision,
 * and hitscan attacks against the player.
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';
import { EnemyAnimator } from './enemy-animator.js';
import { EnemyAnimationMixer } from './enemy-animation-mixer.js';

// ── Enemy Type Definitions ─────────────────────────────────────────

/**
 * Enemy type data. Each type defines stats, behavior, and visuals.
 * Structured so adding new types (officer, SS, mutant, boss) is trivial.
 */
export const ENEMY_TYPES = {
    guard: {
        type: 'guard',
        hp: 25,
        score: 100,
        speed: 1.5,
        alertSpeed: 4.5,
        damage: [2, 15],
        fireRate: 1.0,
        alertRange: 10,
        painChance: 0.5,
        dropType: 'pistol_ammo',
        dropAmount: 4,
        color: 0x8B7355, // Wehrmacht feldgrau
        height: 1.8,
        width: 0.6,
        voices: {
            alert: ['guard_halt', 'guard_achtung'],
            attack: ['guard_attack'],
            death: ['guard_mein_leben'],
        },
    },
    officer: {
        type: 'officer',
        hp: 50,
        score: 400,
        speed: 2.0,
        alertSpeed: 6.0,
        damage: [3, 18],
        fireRate: 0.6,
        alertRange: 12,
        painChance: 0.3,
        dropType: 'pistol_ammo',
        dropAmount: 8,
        color: 0xC0C0C0, // Light grey officer uniform
        height: 1.8,
        width: 0.6,
        voices: {
            alert: ['officer_spion'],
            attack: ['officer_alarm'],
            death: ['officer_death'],
        },
    },
    ss: {
        type: 'ss',
        hp: 100,
        score: 500,
        speed: 1.8,
        alertSpeed: 5.0,
        damage: [4, 20],
        fireRate: 0.4,
        alertRange: 12,
        painChance: 0.2,
        dropType: 'pistol_ammo',
        dropAmount: 8,
        color: 0x2A3A2A, // Dark SS uniform
        height: 1.8,
        width: 0.6,
        voices: {
            alert: ['ss_schutzstaffel'],
            attack: ['ss_alarm'],
            death: ['ss_death'],
        },
    },
    dog: {
        type: 'dog',
        hp: 1,
        score: 200,
        speed: 3.0,
        alertSpeed: 7.0,
        damage: [1, 8],
        fireRate: 0.3,
        alertRange: 8,
        painChance: 0.0,
        dropType: null,
        dropAmount: 0,
        color: 0x4A3A2A, // Brown dog
        height: 0.8,
        width: 0.5,
        isMelee: true, // Dogs don't shoot, they bite (melee only)
        voices: {},
    },
    mutant: {
        type: 'mutant',
        hp: 45,
        score: 700,
        speed: 1.2,
        alertSpeed: 3.5,
        damage: [5, 22],
        fireRate: 0.5,
        alertRange: 10,
        painChance: 0.4,
        dropType: 'pistol_ammo',
        dropAmount: 4,
        color: 0x5A7A5A, // Sickly green
        height: 1.9,
        width: 0.7,
        voices: {
            alert: ['mutant_alert'],
            attack: ['mutant_attack'],
            death: ['mutant_death'],
        },
    },
};

// ── AI States ──────────────────────────────────────────────────────

const STATE = {
    IDLE: 'idle',
    PATROL: 'patrol',
    ALERT: 'alert',
    CHASE: 'chase',
    ATTACK: 'attack',
    PAIN: 'pain',
    DEAD: 'dead',
};

/** How often IDLE/PATROL enemies check for player line-of-sight (seconds) */
const LOS_CHECK_INTERVAL = 0.5;

/** Alert reaction time range (seconds) */
const ALERT_TIME_MIN = 0.3;
const ALERT_TIME_MAX = 0.5;

/** Pain flinch duration (seconds) */
const PAIN_DURATION = 0.3;

/** Death animation duration (seconds) */
const DEATH_ANIM_DURATION = 0.5;

/** Minimum attack range — enemies try to close to this distance */
const MIN_ATTACK_RANGE = 1.5;

/** Maximum attack range — enemies won't fire beyond this */
const MAX_ATTACK_RANGE = 15;

/** Collision radius for enemies */
const ENEMY_RADIUS = 0.3;

/** Default enemy mesh dimensions (overridden by type data) */
const DEFAULT_ENEMY_WIDTH = 0.6;
const DEFAULT_ENEMY_HEIGHT = 1.8;
const DEFAULT_ENEMY_DEPTH = 0.6;

export class Enemy {
    /** @type {import('../engine/model-loader.js').ModelLoader|null} */
    static _modelLoader = null;

    /** @type {import('../engine/animation-loader.js').AnimationLoader|null} */
    static _animationLoader = null;

    /** @type {Map<string, {scene: THREE.Group, animations: THREE.AnimationClip[]}>} Cached model data per enemy type */
    static _models = new Map();

    /**
     * Set the model loader instance for all enemies.
     * @param {import('../engine/model-loader.js').ModelLoader} modelLoader
     */
    static setModelLoader(modelLoader) {
        Enemy._modelLoader = modelLoader;
    }

    /**
     * Set the animation loader instance for Mixamo skeletal animations.
     * @param {import('../engine/animation-loader.js').AnimationLoader} animationLoader
     */
    static setAnimationLoader(animationLoader) {
        Enemy._animationLoader = animationLoader;
    }

    /**
     * Preload a 3D model for a specific enemy type.
     * @param {string} type - Enemy type key (e.g. 'guard', 'dog')
     * @param {string} url - URL to the .glb model file
     * @returns {Promise<void>}
     */
    static async preloadModel(type, url) {
        if (!Enemy._modelLoader) {
            console.warn('Enemy.preloadModel: No model loader set. Call Enemy.setModelLoader() first.');
            return;
        }
        try {
            const result = await Enemy._modelLoader.loadModel(url);
            Enemy._models.set(type, result);
            if (result.animations.length > 0) {
                console.log(`Enemy model "${type}": ${result.animations.length} embedded animations (${result.animations.map(a => a.name).join(', ')})`);
            }
        } catch (err) {
            console.warn(`Enemy.preloadModel: Failed to load model for "${type}" from ${url}:`, err);
        }
    }

    /**
     * @param {string} type - Enemy type key (e.g. 'guard')
     * @param {number} x - World X position
     * @param {number} z - World Z position
     * @param {number} angle - Facing angle in radians
     * @param {THREE.Scene} scene - Scene to add mesh to
     * @param {import('../engine/collision.js').CollisionSystem} collisionSystem
     */
    constructor(type, x, z, angle, scene, collisionSystem) {
        const typeData = ENEMY_TYPES[type];
        if (!typeData) {
            throw new Error(`Unknown enemy type: ${type}`);
        }

        /** Unique ID assigned by EnemyManager */
        this.id = -1;

        /** Enemy type key */
        this.type = type;

        /** @type {object} Type data reference */
        this._typeData = typeData;

        /** Current HP */
        this.hp = typeData.hp;

        /** Max HP */
        this.maxHp = typeData.hp;

        /** Position in world space */
        this.position = new THREE.Vector3(x, 0, z);

        /** Facing angle in radians */
        this.angle = angle;

        /** Current AI state */
        this.state = STATE.IDLE;

        /** Timer for current state */
        this.stateTimer = 0;

        /** General-purpose timer (LOS checks, fire cooldown) */
        this._losTimer = 0;

        /** Fire cooldown timer */
        this._fireTimer = 0;

        /** Whether this enemy is alive */
        this.isAlive = true;

        /** Whether this enemy has been alerted by sound */
        this._soundAlerted = false;

        /** Patrol route (if any) */
        this._patrolRoute = null;
        this._patrolIndex = 0;

        /** Reference to collision system */
        this._collision = collisionSystem;

        /** Reference to scene */
        this._scene = scene;

        /** Per-type dimensions (fallback to defaults) */
        this._width = typeData.width ?? DEFAULT_ENEMY_WIDTH;
        this._height = typeData.height ?? DEFAULT_ENEMY_HEIGHT;
        this._depth = typeData.width ?? DEFAULT_ENEMY_DEPTH; // depth matches width

        /** The visible mesh (3D model or fallback box) */
        this.mesh = this._createMeshOrModel(typeData);
        this._scene.add(this.mesh);

        /** Whether this mesh uses a 3D model (affects flash/death differently) */
        this._usesModel = false;

        /** Procedural animation controller */
        this._animator = new EnemyAnimator(this.mesh, this._typeData.type || type);

        /** @type {EnemyAnimationMixer|null} Mixamo skeletal animation mixer */
        this._mixerAnimator = null;

        /** Whether this enemy uses Mixamo skeletal animations (vs procedural) */
        this._useMixamo = false;

        /** Original material color for flash-back (only for box fallback) */
        this._originalColor = new THREE.Color(typeData.color);

        // Check if a preloaded model is available for this type
        if (Enemy._models.has(type)) {
            const modelData = Enemy._models.get(type);
            this._applyModel(modelData.scene, modelData.animations);
        } else {
            // Add invisible hitbox to the fallback box mesh too, for a more forgiving hit area
            this._addHitbox();
        }

        // Check if Mixamo skeletal animations are available for this enemy type
        this._initMixamoAnimations();

        /** Flash timer for damage feedback */
        this._flashTimer = 0;

        /** Death animation progress (0-1) */
        this._deathProgress = 0;
    }

    /**
     * Update this enemy's AI and visuals.
     * @param {number} dt - Delta time in seconds
     * @param {THREE.Vector3} playerPos - Player world position
     * @param {import('../engine/collision.js').CollisionSystem} collision
     */
    update(dt, playerPos, collision) {
        if (!this.isAlive) {
            this._updateDeathAnimation(dt);
            if (this._useMixamo) {
                this._mixerAnimator.update(dt);
            } else if (this._animator) {
                this._animator.update(dt);
            }
            return;
        }

        // Update flash effect
        if (this._flashTimer > 0) {
            this._flashTimer -= dt;
            if (this._flashTimer <= 0) {
                if (this._usesModel) {
                    // Reset all materials in the model
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.emissive?.setHex(0x000000);
                        }
                    });
                } else if (this.mesh.material) {
                    this.mesh.material.color.copy(this._originalColor);
                    this.mesh.material.emissive.setHex(0x000000);
                }
            }
        }

        // State machine
        switch (this.state) {
            case STATE.IDLE:
                this._updateIdle(dt, playerPos);
                break;
            case STATE.PATROL:
                this._updatePatrol(dt, playerPos);
                break;
            case STATE.ALERT:
                this._updateAlert(dt, playerPos);
                break;
            case STATE.CHASE:
                this._updateChase(dt, playerPos);
                break;
            case STATE.ATTACK:
                this._updateAttack(dt, playerPos);
                break;
            case STATE.PAIN:
                this._updatePain(dt, playerPos);
                break;
        }

        // Billboard: rotate mesh Y to face camera/player
        this._billboardToward(playerPos);

        // Sync mesh position
        this.mesh.position.set(this.position.x, this._height / 2, this.position.z);

        // Sync animation state and update animation system
        if (this._useMixamo) {
            this._mixerAnimator.play(this.state);
            this._mixerAnimator.update(dt);
        } else if (this._animator) {
            // Procedural animations (applied as additive offsets after position/rotation sync)
            this._animator.update(dt);
        }
    }

    /**
     * Apply damage to this enemy.
     * @param {number} damage - Damage amount
     * @returns {boolean} True if the enemy died from this hit
     */
    takeDamage(damage) {
        if (!this.isAlive) return false;

        this.hp -= damage;

        // Brief subtle flash on hit
        this._flashTimer = 0.05;
        if (this._usesModel) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.emissive?.setHex(0x111111);
                }
            });
        } else if (this.mesh.material) {
            this.mesh.material.emissive.setHex(0x111111);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this._die();
            return true;
        }

        // Pain chance check — if in pain, briefly interrupts current action
        if (Math.random() < this._typeData.painChance) {
            this.state = STATE.PAIN;
            this.stateTimer = PAIN_DURATION;
            if (this._animator) this._animator.setState('pain');
        } else if (this.state === STATE.IDLE || this.state === STATE.PATROL) {
            // If not already aggressive, become alert
            this.state = STATE.CHASE;
            if (this._animator) this._animator.setState('walk');
        }

        return false;
    }

    /**
     * Alert this enemy (e.g. from hearing gunfire).
     * Only affects IDLE or PATROL enemies.
     */
    alert() {
        if (!this.isAlive) return;
        if (this.state === STATE.IDLE || this.state === STATE.PATROL) {
            this._soundAlerted = true;
            this.state = STATE.ALERT;
            this.stateTimer = ALERT_TIME_MIN + Math.random() * (ALERT_TIME_MAX - ALERT_TIME_MIN);
            this._playVoice('alert');
            if (this._animator) this._animator.setState('idle');
            eventBus.emit('enemy:alert', { enemyId: this.id });
        }
    }

    /**
     * Set a patrol route for this enemy.
     * @param {Array<{x: number, z: number}>} route - World-space waypoints
     */
    setPatrolRoute(route) {
        if (route && route.length > 1) {
            this._patrolRoute = route;
            this._patrolIndex = 0;
            this.state = STATE.PATROL;
            if (this._useMixamo) {
                this._mixerAnimator.play('patrol');
            } else if (this._animator) {
                this._animator.setState('walk');
            }
        }
    }

    /**
     * Clean up mesh and resources.
     */
    dispose() {
        if (this._mixerAnimator) {
            this._mixerAnimator.dispose();
            this._mixerAnimator = null;
        }
        if (this._animator) {
            this._animator.dispose();
            this._animator = null;
        }
        if (this.mesh) {
            this._scene.remove(this.mesh);
            if (this._usesModel) {
                // Dispose all geometries and materials in the model tree
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose();
                        if (Array.isArray(child.material)) {
                            child.material.forEach((m) => m.dispose());
                        } else {
                            child.material?.dispose();
                        }
                    }
                });
            } else {
                this.mesh.geometry?.dispose();
                this.mesh.material?.dispose();
            }
            this.mesh = null;
        }
    }

    // ── Internal: Mesh Creation ────────────────────────────────────────

    /**
     * Create the enemy's visual representation.
     * Uses a colored box as fallback; model can be applied later via _applyModel().
     * @param {object} typeData - Enemy type data
     * @returns {THREE.Mesh|THREE.Group}
     */
    _createMeshOrModel(typeData) {
        // Always start with a box fallback; _applyModel() replaces it if a model is available
        return this._createBoxMesh(typeData.color);
    }

    /**
     * Create a colored box mesh (placeholder).
     * @param {number} color - Hex color
     * @returns {THREE.Mesh}
     */
    _createBoxMesh(color) {
        const geometry = new THREE.BoxGeometry(this._width, this._height, this._depth);
        const material = new THREE.MeshLambertMaterial({
            color,
            emissive: 0x000000,
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Position at center of enemy height
        mesh.position.set(this.position.x, this._height / 2, this.position.z);

        // Store enemy ID for raycasting identification
        mesh.userData.enemyId = -1; // Will be set by EnemyManager

        return mesh;
    }

    /**
     * Replace the current box mesh with a cloned 3D model.
     * Scales the model to match this enemy's height and width.
     * If the GLB contains embedded animations, sets up skeletal animation
     * and disables the procedural animator to avoid conflicts.
     *
     * @param {THREE.Group} modelTemplate - The template model to clone
     * @param {THREE.AnimationClip[]} [animations=[]] - Embedded animation clips from the GLB
     */
    _applyModel(modelTemplate, animations = []) {
        const clone = modelTemplate.clone();

        // Calculate bounding box of the model to determine scale
        const box = new THREE.Box3().setFromObject(clone);
        const modelSize = new THREE.Vector3();
        box.getSize(modelSize);

        // Scale to match enemy dimensions
        const scaleY = this._height / (modelSize.y || 1);
        const scaleX = this._width / (modelSize.x || 1);
        const scale = Math.min(scaleX, scaleY); // Uniform scale to fit
        clone.scale.set(scale, scale, scale);

        // Recompute bounding boxes/spheres after scaling so raycaster hits correctly
        clone.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
            }
        });

        // Copy position and userData from old mesh
        clone.position.copy(this.mesh.position);
        clone.userData.enemyId = this.mesh.userData.enemyId;

        // Remove old box mesh
        this._scene.remove(this.mesh);
        this.mesh.geometry?.dispose();
        this.mesh.material?.dispose();

        // Use the model
        this.mesh = clone;
        this._usesModel = true;
        this._scene.add(this.mesh);

        // Check if the GLB has embedded skeletal animations (Blender-rigged)
        if (animations.length > 0) {
            // Build a Map of clip name → AnimationClip for the EnemyAnimationMixer
            const clipMap = new Map();
            for (const clip of animations) {
                // Normalize Blender NLA track names to lowercase for STATE_TO_CLIP mapping
                // e.g. "Walk" → "walk", "Idle" → "idle", "Run" → "run", "Attack" → "shoot", "Death" → "death"
                const normalizedName = this._normalizeClipName(clip.name);
                clipMap.set(normalizedName, clip);
            }

            // Set up the skeletal animation mixer using embedded clips
            if (this._mixerAnimator) {
                this._mixerAnimator.dispose();
                this._mixerAnimator = null;
            }
            this._mixerAnimator = new EnemyAnimationMixer(this.mesh, clipMap);
            this._useMixamo = true;
            this._mixerAnimator.play('idle');

            // Disable procedural animator — skeletal animation takes over
            if (this._animator) {
                this._animator.dispose();
                this._animator = null;
            }

            console.log(`Enemy "${this.type}" using embedded skeletal animations: ${[...clipMap.keys()].join(', ')}`);
        } else {
            // No embedded animations — use procedural animator and check for Mixamo
            if (this._animator) {
                this._animator.dispose();
            }
            this._animator = new EnemyAnimator(this.mesh, this._typeData.type || this.type);

            // Re-initialize Mixamo animations for the new mesh (if available)
            if (this._mixerAnimator) {
                this._mixerAnimator.dispose();
                this._mixerAnimator = null;
            }
            this._initMixamoAnimations();
        }

        // Add invisible hitbox for reliable raycasting
        this._addHitbox();
    }

    /**
     * Normalize Blender NLA track names to the clip names expected by EnemyAnimationMixer.
     * Blender exports: "Walk", "Idle", "Run", "Attack", "Death"
     * EnemyAnimationMixer expects: "walk", "idle", "run", "shoot", "death", "hit"
     *
     * @param {string} blenderName - Animation clip name from Blender GLB
     * @returns {string} Normalized clip name for EnemyAnimationMixer
     */
    _normalizeClipName(blenderName) {
        const lower = blenderName.toLowerCase().trim();
        // Map Blender "Attack" to the mixer's expected "shoot" name
        const nameMap = {
            'attack': 'shoot',
            'hitreaction': 'hit',
            'hit_reaction': 'hit',
            'hit': 'hit',
        };
        return nameMap[lower] ?? lower;
    }

    /**
     * Add an invisible hitbox mesh to the enemy for reliable raycasting.
     * The hitbox is slightly larger than the visual model so the player
     * doesn't have to aim with pixel-perfect precision.
     */
    _addHitbox() {
        const hitboxGeometry = new THREE.BoxGeometry(
            this._width + 0.4,   // Wider than visual
            this._height,         // Full height
            this._depth + 0.4    // Deeper than visual
        );
        const hitboxMaterial = new THREE.MeshBasicMaterial({
            visible: false,       // Invisible — raycaster-only
            transparent: true,
            opacity: 0,
        });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.name = 'enemy-hitbox';
        // Center the hitbox at the model's origin (mesh.position.y is set to _height/2)
        hitbox.position.set(0, 0, 0);
        this.mesh.add(hitbox);
    }

    /**
     * Initialize Mixamo skeletal animations if clips are available for this enemy type.
     * Sets up the EnemyAnimationMixer and flags _useMixamo = true so the update loop
     * uses skeletal playback instead of procedural offsets.
     *
     * Called from constructor (after model is set) and from _applyModel (after mesh swap).
     */
    _initMixamoAnimations() {
        const clips = Enemy._animationLoader?.getClips(this.type);
        if (clips && clips.size > 0) {
            this._mixerAnimator = new EnemyAnimationMixer(this.mesh, clips);
            this._useMixamo = true;
            // Start with idle animation
            this._mixerAnimator.play('idle');
        } else {
            this._useMixamo = false;
        }
    }

    /**
     * Play a voice line from the given category (alert, attack, death).
     * Picks a random line from the category array and emits a positional audio event.
     * @param {string} category - Voice category key ('alert', 'attack', 'death')
     */
    _playVoice(category) {
        const voices = this._typeData.voices;
        if (!voices || !voices[category] || voices[category].length === 0) return;

        const lines = voices[category];
        const voiceName = lines[Math.floor(Math.random() * lines.length)];

        eventBus.emit('enemy:voice', {
            name: voiceName,
            category,
            x: this.position.x,
            z: this.position.z,
        });
    }

    /**
     * Rotate mesh to face the player (Y-axis billboard).
     * @param {THREE.Vector3} playerPos
     */
    _billboardToward(playerPos) {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // ── Internal: AI State Updates ─────────────────────────────────────

    /**
     * IDLE state: standing still, periodically checking for player LOS.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updateIdle(dt, playerPos) {
        this._losTimer += dt;

        if (this._losTimer >= LOS_CHECK_INTERVAL) {
            this._losTimer = 0;

            if (this._canSeePlayer(playerPos)) {
                this.state = STATE.ALERT;
                this.stateTimer = ALERT_TIME_MIN + Math.random() * (ALERT_TIME_MAX - ALERT_TIME_MIN);
                this._playVoice('alert');
                if (this._animator) this._animator.setState('idle');
                eventBus.emit('enemy:alert', { enemyId: this.id });
            }
        }
    }

    /**
     * PATROL state: walk along route, check for player LOS.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updatePatrol(dt, playerPos) {
        // Check LOS periodically
        this._losTimer += dt;
        if (this._losTimer >= LOS_CHECK_INTERVAL) {
            this._losTimer = 0;

            if (this._canSeePlayer(playerPos)) {
                this.state = STATE.ALERT;
                this.stateTimer = ALERT_TIME_MIN + Math.random() * (ALERT_TIME_MAX - ALERT_TIME_MIN);
                this._playVoice('alert');
                if (this._animator) this._animator.setState('idle');
                eventBus.emit('enemy:alert', { enemyId: this.id });
                return;
            }
        }

        // Move toward current waypoint
        if (!this._patrolRoute || this._patrolRoute.length === 0) {
            this.state = STATE.IDLE;
            if (this._animator) this._animator.setState('idle');
            return;
        }

        const target = this._patrolRoute[this._patrolIndex];
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.3) {
            // Reached waypoint, move to next
            this._patrolIndex = (this._patrolIndex + 1) % this._patrolRoute.length;
            return;
        }

        // Move toward waypoint at patrol speed
        const speed = this._typeData.speed;
        const nx = dx / dist;
        const nz = dz / dist;

        this._moveWithCollision(nx * speed * dt, nz * speed * dt);
        this.angle = Math.atan2(dx, dz);
    }

    /**
     * ALERT state: just spotted or heard player, brief reaction delay.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updateAlert(dt, playerPos) {
        this.stateTimer -= dt;

        // Face the player during alert
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        this.angle = Math.atan2(dx, dz);

        if (this.stateTimer <= 0) {
            // Transition to chase
            this.state = STATE.CHASE;
            this._fireTimer = 0;
            if (this._animator) this._animator.setState('walk');
        }
    }

    /**
     * CHASE state: move toward player, switch to ATTACK when in range with LOS.
     * Melee enemies (dogs) must close to melee range before attacking.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updateChase(dt, playerPos) {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const isMelee = !!this._typeData.isMelee;
        const meleeRange = 1.5;

        // Face the player
        this.angle = Math.atan2(dx, dz);

        // Check if we can attack
        if (isMelee) {
            // Melee: must be within bite range
            if (dist <= meleeRange) {
                this.state = STATE.ATTACK;
                this._fireTimer = 0;
                if (this._animator) this._animator.setState('attack');
                return;
            }
        } else if (dist <= MAX_ATTACK_RANGE && this._canSeePlayer(playerPos)) {
            this.state = STATE.ATTACK;
            this._fireTimer = 0; // Ready to fire immediately on first attack
            if (this._animator) this._animator.setState('attack');
            return;
        }

        // Move toward player at alert speed
        const speed = this._typeData.alertSpeed;
        const nx = dx / dist;
        const nz = dz / dist;

        const moveX = nx * speed * dt;
        const moveZ = nz * speed * dt;

        const moved = this._moveWithCollision(moveX, moveZ);

        // If blocked, try sliding left or right to get around obstacle
        if (!moved) {
            // Try perpendicular directions
            const slideLeft = this._moveWithCollision(-nz * speed * dt, nx * speed * dt);
            if (!slideLeft) {
                this._moveWithCollision(nz * speed * dt, -nx * speed * dt);
            }
        }
    }

    /**
     * ATTACK state: in range with LOS, fire at player at fireRate intervals.
     * Melee enemies (dogs) must be within melee range to attack.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updateAttack(dt, playerPos) {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const isMelee = !!this._typeData.isMelee;
        const meleeRange = 1.5;

        // Face the player
        this.angle = Math.atan2(dx, dz);

        if (isMelee) {
            // Melee enemy: must be within bite range
            if (dist > meleeRange) {
                // Too far — chase to close distance
                this.state = STATE.CHASE;
                if (this._animator) this._animator.setState('walk');
                return;
            }

            // Attack on cooldown
            this._fireTimer += dt;
            if (this._fireTimer >= this._typeData.fireRate) {
                this._fireTimer = 0;
                this._fireAtPlayer(dist);
                // Reset attack animation for recoil/lunge
                if (this._animator) {
                    this._animator._stateTime = 0;
                    this._animator._flashTarget = 1.0;
                }
            }
        } else {
            // Ranged enemy: check if we've lost LOS or out of range
            if (dist > MAX_ATTACK_RANGE || !this._canSeePlayer(playerPos)) {
                this.state = STATE.CHASE;
                if (this._animator) this._animator.setState('walk');
                return;
            }

            // Fire at player on cooldown
            this._fireTimer += dt;
            if (this._fireTimer >= this._typeData.fireRate) {
                this._fireTimer = 0;
                this._fireAtPlayer(dist);
                // Reset attack animation for recoil
                if (this._animator) {
                    this._animator._stateTime = 0;
                    this._animator._flashTarget = 1.0;
                }
            }

            // Slowly close distance if far away
            if (dist > MIN_ATTACK_RANGE + 1) {
                const speed = this._typeData.alertSpeed * 0.5;
                const nx = dx / dist;
                const nz = dz / dist;
                this._moveWithCollision(nx * speed * dt, nz * speed * dt);
            }
        }
    }

    /**
     * PAIN state: brief flinch after taking damage.
     * @param {number} dt
     * @param {THREE.Vector3} playerPos
     */
    _updatePain(dt, playerPos) {
        this.stateTimer -= dt;

        if (this.stateTimer <= 0) {
            this.state = STATE.CHASE;
            if (this._animator) this._animator.setState('walk');
        }
    }

    // ── Internal: Combat ───────────────────────────────────────────────

    /**
     * Fire a hitscan shot at the player. In the original Wolfenstein, enemy attacks
     * always hit if they have LOS — damage is distance-based.
     * @param {number} distance - Distance to player
     */
    _fireAtPlayer(distance) {
        // Damage formula: random(min, max) - distance/2, min 1
        const [minDmg, maxDmg] = this._typeData.damage;
        const baseDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;

        let finalDamage;
        if (distance > 2) {
            finalDamage = Math.max(1, Math.floor(baseDamage - distance / 2));
        } else {
            finalDamage = baseDamage;
        }

        // Occasional attack voice lines (type-specific chance)
        const attackChance = this.type === 'guard' ? 0.20
            : this.type === 'ss' ? 0.15
            : this.type === 'officer' ? 0.15
            : 0;
        if (attackChance > 0 && Math.random() < attackChance) {
            this._playVoice('attack');
        }

        eventBus.emit('enemy:attack', {
            enemyId: this.id,
            damage: finalDamage,
            distance,
        });
    }

    /**
     * Handle enemy death.
     */
    _die() {
        this.isAlive = false;
        this.state = STATE.DEAD;
        this._deathProgress = 0;

        // Trigger death animation (Mixamo or procedural)
        if (this._useMixamo) {
            this._mixerAnimator.play('dead');
        } else if (this._animator) {
            this._animator.setState('death');
        }

        // Play death voice line (guard: "Mein Leben!", officer/ss: death scream)
        this._playVoice('death');

        eventBus.emit('enemy:death', {
            enemyId: this.id,
            type: this.type,
            score: this._typeData.score,
            dropType: this._typeData.dropType,
            dropAmount: this._typeData.dropAmount,
            position: { x: this.position.x, z: this.position.z },
            summoned: !!this._summoned,
        });
    }

    /**
     * Update the death fall animation.
     * When skeletal animations are active, the Death clip handles the fall —
     * skip procedural rotation to avoid conflicts.
     * @param {number} dt
     */
    _updateDeathAnimation(dt) {
        // Skeletal death animation is handled by the mixer — don't override with procedural
        if (this._useMixamo) return;

        if (this._deathProgress >= 1) return;

        this._deathProgress += dt / DEATH_ANIM_DURATION;
        if (this._deathProgress > 1) this._deathProgress = 1;

        // Fall to side: rotate X from 0 to 90 degrees
        this.mesh.rotation.x = (Math.PI / 2) * this._deathProgress;

        // Lower the mesh as it falls
        const fallHeight = (this._height / 2) * (1 - this._deathProgress) + (this._depth / 2) * this._deathProgress;
        this.mesh.position.y = fallHeight;
    }

    // ── Internal: Line of Sight ────────────────────────────────────────

    /**
     * Check if this enemy can see the player using DDA grid-based raycasting.
     * Steps through the collision grid from enemy to player position.
     * @param {THREE.Vector3} playerPos
     * @returns {boolean}
     */
    _canSeePlayer(playerPos) {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Out of alert range
        if (dist > this._typeData.alertRange) return false;

        // Same cell — always visible
        if (dist < 0.5) return true;

        // DDA algorithm on the grid
        return this._dda(
            this.position.x, this.position.z,
            playerPos.x, playerPos.z
        );
    }

    /**
     * DDA (Digital Differential Analyzer) line-of-sight check on the collision grid.
     * Steps through grid cells from (x0,z0) to (x1,z1).
     * Returns true if no wall cells are encountered.
     *
     * @param {number} x0 - Start world X
     * @param {number} z0 - Start world Z
     * @param {number} x1 - End world X
     * @param {number} z1 - End world Z
     * @returns {boolean} True if line is clear (no walls)
     */
    _dda(x0, z0, x1, z1) {
        // Current grid cell
        let gridX = Math.floor(x0);
        let gridZ = Math.floor(z0);

        // Target grid cell
        const targetX = Math.floor(x1);
        const targetZ = Math.floor(z1);

        // If start and end are in the same cell, LOS is clear
        if (gridX === targetX && gridZ === targetZ) return true;

        // Direction of ray
        const dx = x1 - x0;
        const dz = z1 - z0;

        // Step direction (+1 or -1)
        const stepX = dx >= 0 ? 1 : -1;
        const stepZ = dz >= 0 ? 1 : -1;

        // How far along the ray we must travel to cross one cell boundary
        // (avoid division by zero with a large number)
        const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : 1e10;
        const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : 1e10;

        // Distance to the first cell boundary in each axis
        let tMaxX, tMaxZ;
        if (dx >= 0) {
            tMaxX = ((gridX + 1) - x0) * tDeltaX;
        } else {
            tMaxX = (x0 - gridX) * tDeltaX;
        }
        if (dz >= 0) {
            tMaxZ = ((gridZ + 1) - z0) * tDeltaZ;
        } else {
            tMaxZ = (z0 - gridZ) * tDeltaZ;
        }

        // Step through grid cells
        const maxSteps = 100; // Safety limit
        for (let i = 0; i < maxSteps; i++) {
            // Step to the nearest cell boundary
            if (tMaxX < tMaxZ) {
                gridX += stepX;
                tMaxX += tDeltaX;
            } else {
                gridZ += stepZ;
                tMaxZ += tDeltaZ;
            }

            // Reached the target cell — LOS is clear
            if (gridX === targetX && gridZ === targetZ) return true;

            // Check if this cell is a wall
            if (this._collision.isWall(gridX, gridZ)) return false;
        }

        // Exceeded max steps — assume blocked
        return false;
    }

    // ── Internal: Movement ─────────────────────────────────────────────

    /**
     * Attempt to move the enemy with collision detection.
     * @param {number} dx - World X movement delta
     * @param {number} dz - World Z movement delta
     * @returns {boolean} True if the enemy actually moved
     */
    _moveWithCollision(dx, dz) {
        const currentPos = { x: this.position.x, z: this.position.z };
        const desiredPos = { x: this.position.x + dx, z: this.position.z + dz };

        const resolved = this._collision.checkMove(currentPos, desiredPos, ENEMY_RADIUS);

        const moved = (resolved.x !== currentPos.x || resolved.z !== currentPos.z);

        this.position.x = resolved.x;
        this.position.z = resolved.z;

        return moved;
    }
}
