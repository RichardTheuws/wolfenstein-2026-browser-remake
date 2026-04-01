/**
 * boss.js — Boss Enemy System (Multi-Boss Support)
 *
 * Manages boss encounters with a dedicated state machine, health bar UI,
 * room trigger zones, and cinematic encounter sequences.
 * Designed to work alongside the regular Enemy/EnemyManager systems.
 *
 * Supports multiple boss types via BOSS_TYPES data object:
 *   - Episode 1: Hans Grosse (dual chainguns, strafe + charge)
 *   - Episode 2: Dr. Schabbs (syringe throws, circle + summon)
 *   - Episode 3: Hitler (two-phase: mech suit → human form)
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';
import { EnemyAnimationMixer } from './enemy-animation-mixer.js';

// ── Boss Type Definitions ─────────────────────────────────────────

export const BOSS_TYPES = {
    hans: {
        name: 'HANS GROSSE',
        hp: 850,
        score: 5000,
        speed: 2.0,
        chargeSpeed: 4.0,
        damage: [8, 25],
        fireRate: 0.15,
        size: { height: 2.5, width: 1.0 },
        color: 0x4a6a4a,
        dropType: 'pistol_ammo',
        dropAmount: 20,
        voice: 'hans_guten_tag',
        enrageThreshold: 0.3,
        attacks: ['strafe_fire', 'charge', 'pause'],
    },
    schabbs: {
        name: 'DR. SCHABBS',
        hp: 950,
        score: 10000,
        speed: 1.5,
        chargeSpeed: 3.0,
        damage: [5, 15],       // Syringe throws — less per hit but more dangerous
        fireRate: 0.8,         // Slower fire rate (throws syringes)
        size: { height: 2.0, width: 0.8 },
        color: 0xcccccc,       // White lab coat
        dropType: 'pistol_ammo',
        dropAmount: 25,
        voice: 'schabbs_welcome',
        enrageThreshold: 0.4,  // Enrages earlier
        attacks: ['circle_fire', 'summon', 'pause'],
    },
    hitler_mech: {
        name: 'HITLER \u2014 MECH SUIT',
        hp: 800,
        score: 0,              // Score awarded on phase 2 death only
        speed: 1.0,
        chargeSpeed: 2.5,
        damage: [10, 30],      // 4 chainguns!
        fireRate: 0.1,         // Extremely rapid
        size: { height: 3.0, width: 1.5 },  // Huge mech
        color: 0x556655,       // Military green-grey
        dropType: null,
        dropAmount: 0,
        voice: null,           // Mechanical sounds only
        enrageThreshold: 0.0,  // No enrage on mech (phase transition instead)
        attacks: ['strafe_fire', 'strafe_fire', 'pause'],  // Simple but deadly
        isPhaseOne: true,
        nextPhase: 'hitler',
    },
    hitler: {
        name: 'HITLER',
        hp: 500,
        score: 50000,          // THE biggest score in the game
        speed: 3.0,            // Fast and desperate
        chargeSpeed: 5.0,      // Very fast charge
        damage: [8, 25],
        fireRate: 0.12,
        size: { height: 2.0, width: 0.8 },
        color: 0x4a3a2a,       // Brown uniform
        dropType: 'pistol_ammo',
        dropAmount: 50,
        voice: 'hitler_rage',
        enrageThreshold: 0.3,
        attacks: ['strafe_fire', 'charge', 'strafe_fire', 'pause'],
    },

    // ── Episode 4 Boss ───────────────────────────────────────────
    otto: {
        name: 'OTTO GIFTMACHER',
        hp: 850,
        score: 8000,
        speed: 1.8,
        chargeSpeed: 3.5,
        damage: [6, 20],           // Direct fire damage
        gasDamage: [2, 5],         // Gas cloud tick damage
        fireRate: 0.6,
        size: { height: 2.2, width: 0.9 },
        color: 0x4a6a2a,           // Olive green — chemical warfare
        dropType: 'pistol_ammo',
        dropAmount: 25,
        voice: 'otto_willkommen',
        enrageThreshold: 0.35,
        attacks: ['strafe_fire', 'gas_cloud', 'charge', 'gas_cloud', 'pause'],
    },

    // ── Episode 5 Boss ───────────────────────────────────────────
    gretel: {
        name: 'GRETEL GRÖSSE',
        hp: 900,
        score: 7000,
        speed: 2.5,                // Faster than Hans — she's a hunter
        chargeSpeed: 5.0,          // Devastatingly fast charge
        damage: [8, 25],
        fireRate: 0.12,            // Rapid fire — dual chainguns like Hans
        size: { height: 2.3, width: 0.9 },
        color: 0x3a3a5a,           // Dark blue-grey tactical uniform
        dropType: 'pistol_ammo',
        dropAmount: 20,
        voice: 'gretel_willkommen',
        enrageThreshold: 0.25,     // Enrages later — she stays controlled
        attacks: ['strafe_fire', 'charge', 'strafe_fire', 'charge', 'pause'],
    },

    // ── Episode 6 Boss — THE FINAL BOSS ──────────────────────────
    fettgesicht: {
        name: 'GENERAL FETTGESICHT',
        hp: 1200,                  // Toughest boss in the game
        score: 15000,
        speed: 1.5,                // Slow but devastating
        chargeSpeed: 3.0,
        damage: [12, 35],          // Highest direct damage
        rocketDamage: [15, 40],    // Rocket attack damage
        fireRate: 0.8,             // Slow fire — each shot counts
        size: { height: 2.6, width: 1.2 },  // Imposing figure
        color: 0x5a3a2a,           // Military brown
        dropType: 'chaingun_ammo',
        dropAmount: 50,
        voice: 'fettgesicht_willkommen',
        enrageThreshold: 0.3,
        attacks: ['rocket', 'strafe_fire', 'rocket', 'charge', 'pause'],
    },
    // ── BONUS Episode Boss — THE ULTIMATE CHALLENGE ─────────────
    ubersoldier: {
        name: 'DER ÜBERSOLDIER',
        hp: 1500,                  // The hardest boss in the game
        score: 25000,
        speed: 2.2,
        chargeSpeed: 4.5,
        damage: [10, 30],
        gasDamage: [3, 7],         // Gas clouds (from Otto)
        rocketDamage: [12, 35],    // Rockets (from Fettgesicht)
        fireRate: 0.2,
        size: { height: 2.8, width: 1.3 },
        color: 0x2a1a1a,           // Dark crimson — the perfect soldier
        dropType: 'chaingun_ammo',
        dropAmount: 50,
        voice: 'ubersoldier_willkommen',
        enrageThreshold: 0.4,      // Enrages at 40% — then the real fight begins
        attacks: ['strafe_fire', 'gas_cloud', 'rocket', 'charge', 'gas_cloud', 'summon', 'pause'],
    },
};

// ── Boss AI States ────────────────────────────────────────────────

const BOSS_STATE = {
    DORMANT: 'dormant',
    ENCOUNTER: 'encounter',
    STRAFE_FIRE: 'strafe_fire',
    CHARGE: 'charge',
    CIRCLE_FIRE: 'circle_fire',
    SUMMON: 'summon',
    GAS_CLOUD: 'gas_cloud',
    ROCKET: 'rocket',
    PAUSE: 'pause',
    ENRAGE: 'enrage',
    PHASE_TRANSITION: 'phase_transition',
    DEATH: 'death',
};

/** Encounter cinematic duration (seconds) */
const ENCOUNTER_DURATION = 2.0;

/** Pause between attack patterns (seconds) */
const ATTACK_PAUSE_DURATION = 1.0;

/** Strafe duration before switching pattern (seconds) */
const STRAFE_DURATION = 3.0;

/** Charge duration before switching pattern (seconds) */
const CHARGE_DURATION = 2.0;

/** Circle-fire duration (seconds) */
const CIRCLE_FIRE_DURATION = 4.0;

/** Circle-fire orbit distance (units from player) */
const CIRCLE_FIRE_DISTANCE = 8.0;

/** Summon state duration (seconds) — brief pause while summoning */
const SUMMON_DURATION = 1.2;

/** Maximum number of active summoned mutants */
const MAX_SUMMONS = 3;

/** Death animation total duration (seconds) */
const DEATH_TOTAL_DURATION = 2.5;

/** Gas cloud throw phase duration (seconds) — Otto Giftmacher */
const GAS_CLOUD_THROW_DURATION = 1.5;

/** Gas cloud zone lifetime after deployment (seconds) */
const GAS_ZONE_LIFETIME = 5.0;

/** Gas cloud zone damage radius (world units) */
const GAS_ZONE_RADIUS = 3.0;

/** Gas cloud damage tick interval (seconds) */
const GAS_TICK_INTERVAL = 0.5;

/** Rocket attack phase duration (seconds) — General Fettgesicht */
const ROCKET_DURATION = 3.5;

/** Rocket fire interval (seconds) — slow but devastating */
const ROCKET_FIRE_INTERVAL = 1.2;

/** Phase transition pause duration (seconds) — mech explodes before Hitler emerges */
const PHASE_TRANSITION_DURATION = 1.5;

/** Collision radius for the boss */
const BOSS_RADIUS = 0.5;

/** Strafe direction: 1 = right, -1 = left */
const STRAFE_RIGHT = 1;
const STRAFE_LEFT = -1;

export class Boss {
    /** @type {import('../engine/model-loader.js').ModelLoader|null} */
    static _modelLoader = null;

    /** @type {Map<string, {scene: THREE.Group, animations: THREE.AnimationClip[]}>} Cached model data per boss type */
    static _models = new Map();

    /**
     * Set the model loader instance for all bosses.
     * @param {import('../engine/model-loader.js').ModelLoader} modelLoader
     */
    static setModelLoader(modelLoader) {
        Boss._modelLoader = modelLoader;
    }

    /**
     * Preload a 3D model for a specific boss type.
     * @param {string} type - Boss type key (e.g. 'hitler_mech', 'hitler')
     * @param {string} url - URL to the .glb model file
     * @returns {Promise<void>}
     */
    static async preloadModel(type, url) {
        if (!Boss._modelLoader) {
            console.warn('Boss.preloadModel: No model loader set. Call Boss.setModelLoader() first.');
            return;
        }
        try {
            const result = await Boss._modelLoader.loadModel(url);
            Boss._models.set(type, result);
        } catch (err) {
            console.warn(`Boss.preloadModel: Failed to load model for "${type}" from ${url}:`, err);
        }
    }

    /**
     * @param {string} bossType - Boss type key ('hans' or 'schabbs')
     * @param {THREE.Scene} scene
     * @param {import('../engine/collision.js').CollisionSystem} collisionSystem
     * @param {import('./game-state.js').GameState} gameState
     * @param {import('./player-controller.js').PlayerController} playerController
     */
    constructor(bossType, scene, collisionSystem, gameState, playerController) {
        /** @type {string} */
        this._bossType = bossType;

        /** @type {THREE.Scene} */
        this._scene = scene;

        /** @type {import('../engine/collision.js').CollisionSystem} */
        this._collision = collisionSystem;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** @type {import('./player-controller.js').PlayerController} */
        this._player = playerController;

        /** Boss type data — looked up from BOSS_TYPES */
        this._typeData = BOSS_TYPES[bossType] || BOSS_TYPES.hans;

        /** Current HP */
        this.hp = this._typeData.hp;

        /** Max HP */
        this.maxHp = this._typeData.hp;

        /** World position */
        this.position = new THREE.Vector3(0, 0, 0);

        /** Current AI state */
        this.state = BOSS_STATE.DORMANT;

        /** Timer for current state */
        this._stateTimer = 0;

        /** Fire cooldown timer */
        this._fireTimer = 0;

        /** Whether the boss is alive */
        this.isAlive = false;

        /** Whether the boss has been spawned */
        this._spawned = false;

        /** Whether the encounter has been triggered */
        this._encountered = false;

        /** Strafe direction */
        this._strafeDir = STRAFE_RIGHT;

        /** Whether boss is enraged (below 30% HP) */
        this._enraged = false;

        /** Death animation progress (0 to 1) */
        this._deathProgress = 0;

        /** The visible mesh */
        this.mesh = null;

        /** Boss health bar DOM elements */
        this._healthBarContainer = null;
        this._healthBarFill = null;
        this._healthBarLabel = null;

        /** Boss trigger zone (set when spawning from level data) */
        this._triggerZone = null;

        /** Attack pattern rotation index */
        this._patternIndex = 0;

        /** Flash timer for damage feedback */
        this._flashTimer = 0;

        /** Original mesh color */
        this._originalColor = new THREE.Color(this._typeData.color);

        /** Whether this boss uses a 3D model (affects flash/death differently) */
        this._usesModel = false;

        /** @type {EnemyAnimationMixer|null} Skeletal animation mixer for 3D models */
        this._mixerAnimator = null;

        /** Circle-fire angle (radians) — Schabbs orbits around the player */
        this._circleAngle = 0;

        /** Number of active summoned mutants (Schabbs only) */
        this._activeSummons = 0;

        /** Attack cycle counter — used for Schabbs summon timing */
        this._attackCycleCount = 0;

        /** Active gas zones (Otto Giftmacher) — {x, z, lifetime, tickTimer} */
        this._gasZones = [];

        /** Gas damage cooldown to prevent double-ticking within same interval */
        this._gasDamageTimer = 0;

        /** Boss ID string — used for hit detection and event identification */
        this._bossId = `boss_${bossType}`;

        // Wire event listeners
        this._onEnemyHit = this._handleHit.bind(this);
        eventBus.on('enemy:hit', this._onEnemyHit);

        // Track summon deaths so we can decrement the active count
        this._onSummonDeath = this._handleSummonDeath.bind(this);
        eventBus.on('enemy:death', this._onSummonDeath);
    }

    /**
     * Spawn the boss at a world position.
     * @param {number} x - World X
     * @param {number} z - World Z
     * @param {object} [triggerZone] - Optional trigger zone { minX, maxX, minZ, maxZ }
     */
    spawn(x, z, triggerZone) {
        this.position.set(x, 0, z);
        this.hp = this._typeData.hp;
        this.maxHp = this._typeData.hp;
        this.isAlive = true;
        this._spawned = true;
        this._encountered = false;
        this._enraged = false;
        this._deathProgress = 0;
        this.state = BOSS_STATE.DORMANT;
        this._patternIndex = 0;
        this._activeSummons = 0;
        this._attackCycleCount = 0;
        this._circleAngle = 0;

        // Create boss mesh — use 3D model if preloaded, otherwise placeholder box
        const typeData = this._typeData;
        this._usesModel = false;
        this._mixerAnimator = null;

        if (Boss._models.has(this._bossType)) {
            // Use preloaded 3D model
            const modelData = Boss._models.get(this._bossType);
            const clone = modelData.scene.clone();

            // Scale model to match boss dimensions
            const box = new THREE.Box3().setFromObject(clone);
            const modelSize = new THREE.Vector3();
            box.getSize(modelSize);
            const scaleY = typeData.size.height / (modelSize.y || 1);
            const scaleX = typeData.size.width / (modelSize.x || 1);
            const scale = Math.min(scaleX, scaleY);
            clone.scale.set(scale, scale, scale);

            // Recompute bounding boxes after scaling
            clone.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.computeBoundingBox();
                    child.geometry.computeBoundingSphere();
                }
            });

            clone.position.set(x, typeData.size.height / 2, z);
            clone.userData.enemyId = this._bossId;
            this.mesh = clone;
            this._usesModel = true;

            // Set up skeletal animation mixer if model has embedded animations
            if (modelData.animations.length > 0) {
                const clipMap = new Map();
                for (const clip of modelData.animations) {
                    const normalized = this._normalizeClipName(clip.name);
                    clipMap.set(normalized, clip);
                }
                this._mixerAnimator = new EnemyAnimationMixer(this.mesh, clipMap);
                this._mixerAnimator.play('idle');
            }
        } else {
            // Fallback: placeholder box
            const geometry = new THREE.BoxGeometry(
                typeData.size.width,
                typeData.size.height,
                typeData.size.width
            );
            const material = new THREE.MeshLambertMaterial({
                color: typeData.color,
                emissive: 0x000000,
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(x, typeData.size.height / 2, z);
            this.mesh.userData.enemyId = this._bossId;
        }

        // Add invisible hitbox for reliable raycasting
        const hitboxGeometry = new THREE.BoxGeometry(
            typeData.size.width + 0.6,
            typeData.size.height,
            typeData.size.width + 0.6
        );
        const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.name = 'boss-hitbox';
        hitbox.position.set(0, 0, 0);
        this.mesh.add(hitbox);

        this._scene.add(this.mesh);

        // Set trigger zone
        if (triggerZone) {
            this._triggerZone = triggerZone;
        }

        // Create health bar UI (hidden until encounter)
        this._createHealthBar();
    }

    /**
     * Update the boss AI and visuals. Called every frame from the game loop.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this._spawned) return;

        // Check trigger zone (before encounter)
        if (this.state === BOSS_STATE.DORMANT && this._triggerZone) {
            this._checkTriggerZone();
        }

        // Update skeletal animation mixer
        if (this._mixerAnimator) {
            this._mixerAnimator.update(dt);
        }

        // Update flash effect
        if (this._flashTimer > 0) {
            this._flashTimer -= dt;
            if (this._flashTimer <= 0 && this.mesh) {
                if (this._usesModel) {
                    // Restore materials on 3D model
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
            case BOSS_STATE.DORMANT:
                // Do nothing — waiting for player to enter trigger zone
                break;

            case BOSS_STATE.ENCOUNTER:
                this._updateEncounter(dt);
                break;

            case BOSS_STATE.STRAFE_FIRE:
                this._updateStrafeFire(dt);
                break;

            case BOSS_STATE.CHARGE:
                this._updateCharge(dt);
                break;

            case BOSS_STATE.CIRCLE_FIRE:
                this._updateCircleFire(dt);
                break;

            case BOSS_STATE.SUMMON:
                this._updateSummon(dt);
                break;

            case BOSS_STATE.GAS_CLOUD:
                this._updateGasCloud(dt);
                break;

            case BOSS_STATE.ROCKET:
                this._updateRocket(dt);
                break;

            case BOSS_STATE.PAUSE:
                this._updatePause(dt);
                break;

            case BOSS_STATE.PHASE_TRANSITION:
                this._updatePhaseTransition(dt);
                break;

            case BOSS_STATE.DEATH:
                this._updateDeath(dt);
                break;
        }

        // Billboard toward player (alive states only)
        if (this.isAlive && this.mesh) {
            const px = this._player.position.x;
            const pz = this._player.position.z;
            const dx = px - this.position.x;
            const dz = pz - this.position.z;
            this.mesh.rotation.y = Math.atan2(dx, dz);
        }

        // Sync mesh position
        if (this.mesh && this.isAlive) {
            this.mesh.position.set(
                this.position.x,
                this._typeData.size.height / 2,
                this.position.z
            );
        }

        // Update active gas zones (Otto Giftmacher area denial)
        this._updateGasZones(dt);

        // Update health bar
        this._updateHealthBar();
    }

    /**
     * Start the boss encounter sequence.
     */
    triggerEncounter() {
        if (this._encountered) return;
        this._encountered = true;
        this.state = BOSS_STATE.ENCOUNTER;
        this._stateTimer = ENCOUNTER_DURATION;

        // Play idle animation during encounter
        this._playAnimation('idle');

        // Play encounter voice line (if this boss type has one)
        if (this._typeData.voice) {
            eventBus.emit('enemy:voice', {
                name: this._typeData.voice,
                category: 'alert',
                x: this.position.x,
                z: this.position.z,
            });
        }

        // Show health bar with fade-in
        this._showHealthBar();

        // Emit boss encounter event
        eventBus.emit('boss:encounter', {
            name: this._typeData.name,
            hp: this.hp,
            maxHp: this.maxHp,
        });

        // Lock the door behind the player
        eventBus.emit('boss:door_lock');
    }

    /**
     * Apply damage to the boss.
     * @param {number} amount - Damage amount
     * @returns {boolean} True if the boss died
     */
    takeDamage(amount) {
        if (!this.isAlive || this.state === BOSS_STATE.DORMANT || this.state === BOSS_STATE.ENCOUNTER) {
            return false;
        }

        this.hp -= amount;

        // Flash white on hit
        this._flashTimer = 0.12;
        if (this.mesh) {
            if (this._usesModel) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(0x444444);
                    }
                });
            } else if (this.mesh.material) {
                this.mesh.material.color.setHex(0xffffff);
                this.mesh.material.emissive.setHex(0x444444);
            }
        }

        // Emit hit event for hit marker
        eventBus.emit('boss:hit', { hp: this.hp, maxHp: this.maxHp });

        // Check for enrage (threshold varies per boss type)
        const enrageThreshold = this._typeData.enrageThreshold || 0.3;
        if (!this._enraged && this.hp <= this.maxHp * enrageThreshold && this.hp > 0) {
            this._enraged = true;
            eventBus.emit('boss:enrage', { name: this._typeData.name });
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this._die();
            return true;
        }

        return false;
    }

    /**
     * Get the boss mesh for raycasting (returns array for compatibility with weapon system).
     * @returns {THREE.Mesh[]}
     */
    getMeshes() {
        if (this.isAlive && this.mesh) {
            return [this.mesh];
        }
        return [];
    }

    /**
     * Clean up all resources.
     */
    dispose() {
        eventBus.off('enemy:hit', this._onEnemyHit);
        eventBus.off('enemy:death', this._onSummonDeath);

        if (this._mixerAnimator) {
            this._mixerAnimator.dispose();
            this._mixerAnimator = null;
        }

        if (this.mesh) {
            this._scene.remove(this.mesh);
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
            this.mesh = null;
        }

        // Clean up any active gas zones
        this._gasZones = [];

        this._removeHealthBar();
        this._spawned = false;
        this.isAlive = false;
    }

    // ── Internal: Trigger Zone ─────────────────────────────────────────

    /**
     * Check if the player has entered the boss trigger zone.
     */
    _checkTriggerZone() {
        const px = this._player.position.x;
        const pz = this._player.position.z;
        const zone = this._triggerZone;

        if (px >= zone.minX && px <= zone.maxX && pz >= zone.minZ && pz <= zone.maxZ) {
            this.triggerEncounter();
        }
    }

    // ── Internal: State Updates ────────────────────────────────────────

    /**
     * ENCOUNTER state: cinematic delay before combat begins.
     * @param {number} dt
     */
    _updateEncounter(dt) {
        this._stateTimer -= dt;

        if (this._stateTimer <= 0) {
            // Start combat — begin with strafe fire
            this._transitionToNextAttack();
        }
    }

    /**
     * STRAFE_FIRE state: strafe left/right while firing chainguns.
     * @param {number} dt
     */
    _updateStrafeFire(dt) {
        this._stateTimer -= dt;
        this._fireTimer += dt;

        const playerPos = this._player.position;
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Face the player
        const angle = Math.atan2(dx, dz);

        // Strafe perpendicular to player direction
        const speed = this._getSpeed();
        const strafeX = -Math.cos(angle) * this._strafeDir * speed * dt;
        const strafeZ = Math.sin(angle) * this._strafeDir * speed * dt;

        const moved = this._moveWithCollision(strafeX, strafeZ);

        // If blocked, reverse strafe direction
        if (!moved) {
            this._strafeDir *= -1;
        }

        // Fire at player
        const fireRate = this._getFireRate();
        if (this._fireTimer >= fireRate) {
            this._fireTimer = 0;
            this._fireAtPlayer(dist);
        }

        // Transition to pause after strafe duration
        if (this._stateTimer <= 0) {
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
            this._fireTimer = 0;
        }
    }

    /**
     * CHARGE state: rush directly at the player at high speed.
     * @param {number} dt
     */
    _updateCharge(dt) {
        this._stateTimer -= dt;
        this._fireTimer += dt;

        const playerPos = this._player.position;
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Rush toward player
        const chargeSpeed = this._enraged
            ? this._typeData.chargeSpeed * 1.5
            : this._typeData.chargeSpeed;
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);

        this._moveWithCollision(nx * chargeSpeed * dt, nz * chargeSpeed * dt);

        // Fire while charging (at reduced rate)
        const fireRate = this._getFireRate() * 2; // Slower fire while charging
        if (this._fireTimer >= fireRate) {
            this._fireTimer = 0;
            this._fireAtPlayer(dist);
        }

        // Transition to pause after charge duration or if very close to player
        if (this._stateTimer <= 0 || dist < 1.5) {
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
            this._fireTimer = 0;
        }
    }

    /**
     * PAUSE state: brief pause between attack patterns.
     * @param {number} dt
     */
    _updatePause(dt) {
        this._stateTimer -= dt;

        if (this._stateTimer <= 0) {
            this._transitionToNextAttack();
        }
    }

    /**
     * CIRCLE_FIRE state (Schabbs): orbit around the player at medium distance,
     * throwing syringes. Duration: 4 seconds.
     * @param {number} dt
     */
    _updateCircleFire(dt) {
        this._stateTimer -= dt;
        this._fireTimer += dt;

        const playerPos = this._player.position;
        const speed = this._getSpeed();

        // Angular velocity — orbit speed scales with movement speed
        const angularSpeed = speed * 0.3;
        this._circleAngle += angularSpeed * dt;

        // Desired position on the circle around the player
        const targetX = playerPos.x + Math.cos(this._circleAngle) * CIRCLE_FIRE_DISTANCE;
        const targetZ = playerPos.z + Math.sin(this._circleAngle) * CIRCLE_FIRE_DISTANCE;

        // Move toward the target orbit position
        const dx = targetX - this.position.x;
        const dz = targetZ - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            const moveSpeed = Math.min(speed * dt, dist);
            const nx = dx / dist;
            const nz = dz / dist;
            this._moveWithCollision(nx * moveSpeed, nz * moveSpeed);
        }

        // Fire syringes at the player
        const fireRate = this._getFireRate();
        if (this._fireTimer >= fireRate) {
            this._fireTimer = 0;
            const playerDist = Math.sqrt(
                (playerPos.x - this.position.x) ** 2 +
                (playerPos.z - this.position.z) ** 2
            );
            this._fireAtPlayer(playerDist);
        }

        // Transition to pause after circle duration
        if (this._stateTimer <= 0) {
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
            this._fireTimer = 0;
        }
    }

    /**
     * SUMMON state (Schabbs): summon a mutant near the player.
     * Emits a 'boss:summon' event that main.js handles by creating an Enemy.
     * @param {number} dt
     */
    _updateSummon(dt) {
        this._stateTimer -= dt;

        // Summon happens at the midpoint of the summon animation
        if (this._stateTimer <= SUMMON_DURATION / 2 && this._stateTimer + dt > SUMMON_DURATION / 2) {
            this._performSummon();
        }

        // Flash boss green during summon (visual cue — works for both 3D models and placeholders)
        if (this.mesh) {
            const pulse = Math.sin(performance.now() / 100) > 0;
            const hexVal = pulse ? 0x003300 : 0x001100;
            if (this._usesModel) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(hexVal);
                    }
                });
            } else if (this.mesh.material) {
                this.mesh.material.emissive.setHex(hexVal);
            }
        }

        if (this._stateTimer <= 0) {
            // Restore emissive
            if (this.mesh) {
                if (this._usesModel) {
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.emissive?.setHex(0x000000);
                        }
                    });
                } else if (this.mesh.material) {
                    this.mesh.material.emissive.setHex(0x000000);
                }
            }
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
        }
    }

    /**
     * Perform the summon: find a valid spawn position near the player
     * and emit the boss:summon event.
     */
    _performSummon() {
        if (this._activeSummons >= MAX_SUMMONS) return;

        const playerPos = this._player.position;

        // Try up to 10 times to find a valid spawn position 3-5 units from the player
        for (let attempt = 0; attempt < 10; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 3 + Math.random() * 2; // 3-5 units
            const spawnX = playerPos.x + Math.cos(angle) * dist;
            const spawnZ = playerPos.z + Math.sin(angle) * dist;

            // Check that the position is not inside a wall
            const gridX = Math.floor(spawnX);
            const gridZ = Math.floor(spawnZ);
            if (!this._collision.isWall(gridX, gridZ)) {
                this._activeSummons++;
                eventBus.emit('boss:summon', {
                    type: 'mutant',
                    x: spawnX,
                    z: spawnZ,
                });
                return;
            }
        }
    }

    /**
     * Handle enemy:death events to track when summoned mutants die.
     * @param {object} data
     */
    _handleSummonDeath(data) {
        // Summoned mutants are tagged with summoned: true
        if (data.summoned && this._activeSummons > 0) {
            this._activeSummons--;
        }
    }

    /**
     * GAS_CLOUD state (Otto Giftmacher): throw a toxic gas cloud at the player's position.
     * Creates a persistent damage zone that hurts the player if they stand in it.
     * @param {number} dt
     */
    _updateGasCloud(dt) {
        this._stateTimer -= dt;

        // Face the player
        const playerPos = this._player.position;
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;

        // Deploy gas at midpoint of the throw animation
        if (this._stateTimer <= GAS_CLOUD_THROW_DURATION / 2 &&
            this._stateTimer + dt > GAS_CLOUD_THROW_DURATION / 2) {
            // Gas zone at player's current position (they must dodge!)
            this._gasZones.push({
                x: playerPos.x,
                z: playerPos.z,
                lifetime: GAS_ZONE_LIFETIME,
                tickTimer: 0,
            });
            eventBus.emit('boss:gas_cloud', {
                x: playerPos.x,
                z: playerPos.z,
                radius: GAS_ZONE_RADIUS,
                duration: GAS_ZONE_LIFETIME,
            });
        }

        // Flash boss green during throw (visual cue)
        if (this.mesh) {
            const pulse = Math.sin(performance.now() / 100) > 0;
            if (this._usesModel) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(pulse ? 0x003300 : 0x001100);
                    }
                });
            } else if (this.mesh.material) {
                this.mesh.material.emissive.setHex(pulse ? 0x003300 : 0x001100);
            }
        }

        if (this._stateTimer <= 0) {
            // Restore emissive
            if (this.mesh) {
                if (this._usesModel) {
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            child.material.emissive?.setHex(0x000000);
                        }
                    });
                } else if (this.mesh.material) {
                    this.mesh.material.emissive.setHex(0x000000);
                }
            }
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
        }
    }

    /**
     * Update active gas zones: tick down lifetimes and deal damage to player if in range.
     * @param {number} dt
     */
    _updateGasZones(dt) {
        if (this._gasZones.length === 0) return;

        const playerPos = this._player.position;
        const gasDmg = this._typeData.gasDamage || [2, 5];

        for (let i = this._gasZones.length - 1; i >= 0; i--) {
            const zone = this._gasZones[i];
            zone.lifetime -= dt;
            zone.tickTimer += dt;

            // Remove expired zones
            if (zone.lifetime <= 0) {
                this._gasZones.splice(i, 1);
                eventBus.emit('boss:gas_cloud_expire', { x: zone.x, z: zone.z });
                continue;
            }

            // Check if player is in the gas zone
            const dx = playerPos.x - zone.x;
            const dz = playerPos.z - zone.z;
            const distSq = dx * dx + dz * dz;

            if (distSq <= GAS_ZONE_RADIUS * GAS_ZONE_RADIUS && zone.tickTimer >= GAS_TICK_INTERVAL) {
                zone.tickTimer = 0;
                const damage = Math.floor(Math.random() * (gasDmg[1] - gasDmg[0] + 1)) + gasDmg[0];
                eventBus.emit('enemy:attack', {
                    enemyId: this._bossId,
                    damage,
                    distance: Math.sqrt(distSq),
                    isGas: true,
                });
                // Emit gas damage indicator
                eventBus.emit('boss:gas_damage', { damage });
            }
        }
    }

    /**
     * ROCKET state (General Fettgesicht): slow strafe with devastating rocket fire.
     * Rockets cause screen shake on impact — maximum intimidation.
     * @param {number} dt
     */
    _updateRocket(dt) {
        this._stateTimer -= dt;
        this._fireTimer += dt;

        const playerPos = this._player.position;
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        // Slow strafe while firing rockets
        const speed = this._getSpeed() * 0.6;
        const strafeX = -Math.cos(angle) * this._strafeDir * speed * dt;
        const strafeZ = Math.sin(angle) * this._strafeDir * speed * dt;

        const moved = this._moveWithCollision(strafeX, strafeZ);
        if (!moved) {
            this._strafeDir *= -1;
        }

        // Fire rockets at slow interval
        const fireInterval = this._enraged ? ROCKET_FIRE_INTERVAL * 0.6 : ROCKET_FIRE_INTERVAL;
        if (this._fireTimer >= fireInterval) {
            this._fireTimer = 0;
            this._fireRocketAtPlayer(dist);
        }

        if (this._stateTimer <= 0) {
            this.state = BOSS_STATE.PAUSE;
            this._stateTimer = ATTACK_PAUSE_DURATION;
            this._fireTimer = 0;
        }
    }

    /**
     * Fire a rocket at the player — high damage + screen shake.
     * @param {number} distance - Distance to player
     */
    _fireRocketAtPlayer(distance) {
        const rocketDmg = this._typeData.rocketDamage || this._typeData.damage;
        const [minDmg, maxDmg] = rocketDmg;
        const baseDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;

        // Rockets lose less damage over distance than bullets
        const finalDamage = distance > 3
            ? Math.max(minDmg, Math.floor(baseDamage - distance / 4))
            : baseDamage;

        eventBus.emit('enemy:attack', {
            enemyId: this._bossId,
            damage: finalDamage,
            distance,
            isRocket: true,
        });

        // Screen shake on every rocket fire (you FEEL these)
        eventBus.emit('screen:shake', { intensity: 0.8, duration: 0.3 });

        // Rocket sound cue
        eventBus.emit('boss:rocket_fire', {
            x: this.position.x,
            z: this.position.z,
        });
    }

    /**
     * DEATH state: epic death sequence.
     * @param {number} dt
     */
    _updateDeath(dt) {
        if (this._deathProgress >= 1) return;

        this._deathProgress += dt / DEATH_TOTAL_DURATION;
        if (this._deathProgress > 1) this._deathProgress = 1;

        if (!this.mesh) return;

        // Phase 1 (0-0.3): stumble back
        if (this._deathProgress < 0.3) {
            const stumbleT = this._deathProgress / 0.3;
            this.mesh.position.y = (this._typeData.size.height / 2) + Math.sin(stumbleT * Math.PI) * 0.3;
            // Slight backward stumble
            const angle = this.mesh.rotation.y;
            const stumbleDist = 0.5 * dt;
            this.position.x -= Math.sin(angle) * stumbleDist;
            this.position.z -= Math.cos(angle) * stumbleDist;
        }
        // Phase 2 (0.3-0.6): fall to knees
        else if (this._deathProgress < 0.6) {
            const kneeT = (this._deathProgress - 0.3) / 0.3;
            const targetY = this._typeData.size.height * 0.35;
            const startY = this._typeData.size.height / 2;
            this.mesh.position.y = startY + (targetY - startY) * kneeT;
        }
        // Phase 3 (0.6-1.0): collapse forward
        else {
            const collapseT = (this._deathProgress - 0.6) / 0.4;
            const kneelY = this._typeData.size.height * 0.35;
            const groundY = this._typeData.size.width / 2;
            this.mesh.position.y = kneelY + (groundY - kneelY) * collapseT;
            // Tilt forward
            this.mesh.rotation.x = (Math.PI / 2) * collapseT;
        }

        // Sync position
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        // Completion
        if (this._deathProgress >= 1) {
            eventBus.emit('boss:death_complete', {
                name: this._typeData.name,
            });
        }
    }

    // ── Internal: Attack Helpers ───────────────────────────────────────

    /**
     * Transition to the next attack pattern in the rotation.
     * Uses the `attacks` array from the boss type definition.
     */
    _transitionToNextAttack() {
        const attacks = this._typeData.attacks || ['strafe_fire', 'charge', 'pause'];
        this._attackCycleCount++;

        // Schabbs/Ubersoldier summon override: every 3rd cycle (or every cycle when enraged)
        if (this._bossType === 'schabbs' || this._bossType === 'ubersoldier') {
            const summonEvery = this._enraged ? 1 : 3;
            if (this._attackCycleCount % summonEvery === 0 && this._activeSummons < MAX_SUMMONS) {
                this.state = BOSS_STATE.SUMMON;
                this._stateTimer = SUMMON_DURATION;
                this._fireTimer = 0;
                return;
            }
        }

        // Normal pattern rotation from the attacks array (skip 'pause' entries — those are handled as transitions)
        const combatPatterns = attacks.filter(a => a !== 'pause');
        const patternKey = combatPatterns[this._patternIndex % combatPatterns.length];
        this._patternIndex++;

        // Map attack key to boss state
        switch (patternKey) {
            case 'strafe_fire':
                this.state = BOSS_STATE.STRAFE_FIRE;
                this._stateTimer = STRAFE_DURATION;
                this._strafeDir = Math.random() < 0.5 ? STRAFE_LEFT : STRAFE_RIGHT;
                break;
            case 'charge':
                this.state = BOSS_STATE.CHARGE;
                this._stateTimer = CHARGE_DURATION;
                break;
            case 'circle_fire':
                this.state = BOSS_STATE.CIRCLE_FIRE;
                this._stateTimer = CIRCLE_FIRE_DURATION;
                // Start circling from the current angle to the player
                const dx = this.position.x - this._player.position.x;
                const dz = this.position.z - this._player.position.z;
                this._circleAngle = Math.atan2(dz, dx);
                break;
            case 'summon':
                if (this._activeSummons < MAX_SUMMONS) {
                    this.state = BOSS_STATE.SUMMON;
                    this._stateTimer = SUMMON_DURATION;
                } else {
                    // Max summons reached — fall back to first combat pattern
                    this.state = BOSS_STATE.CIRCLE_FIRE;
                    this._stateTimer = CIRCLE_FIRE_DURATION;
                    const dx2 = this.position.x - this._player.position.x;
                    const dz2 = this.position.z - this._player.position.z;
                    this._circleAngle = Math.atan2(dz2, dx2);
                }
                break;
            case 'gas_cloud':
                this.state = BOSS_STATE.GAS_CLOUD;
                this._stateTimer = GAS_CLOUD_THROW_DURATION;
                break;
            case 'rocket':
                this.state = BOSS_STATE.ROCKET;
                this._stateTimer = ROCKET_DURATION;
                this._strafeDir = Math.random() < 0.5 ? STRAFE_LEFT : STRAFE_RIGHT;
                break;
            default:
                this.state = BOSS_STATE.STRAFE_FIRE;
                this._stateTimer = STRAFE_DURATION;
                this._strafeDir = Math.random() < 0.5 ? STRAFE_LEFT : STRAFE_RIGHT;
                break;
        }

        this._fireTimer = 0;

        // Play appropriate animation based on new state
        if (this.state === BOSS_STATE.STRAFE_FIRE || this.state === BOSS_STATE.CIRCLE_FIRE || this.state === BOSS_STATE.ROCKET) {
            this._playAnimation('shoot');
        } else if (this.state === BOSS_STATE.CHARGE) {
            this._playAnimation('walk');
        } else if (this.state === BOSS_STATE.SUMMON || this.state === BOSS_STATE.GAS_CLOUD) {
            this._playAnimation('idle');
        }
    }

    /**
     * Get the current movement speed (accounting for enrage).
     * Schabbs doubles speed on enrage; Hans gets 1.5x.
     * @returns {number}
     */
    _getSpeed() {
        if (!this._enraged) return this._typeData.speed;
        // Boss-specific enrage speed multipliers
        let multiplier = 1.5;
        if (this._bossType === 'schabbs') multiplier = 2.0;
        else if (this._bossType === 'hitler') multiplier = 1.8;
        else if (this._bossType === 'gretel') multiplier = 1.8;  // Gretel goes full predator
        else if (this._bossType === 'fettgesicht') multiplier = 1.6;  // Even the general gets faster
        else if (this._bossType === 'otto') multiplier = 1.4;  // Otto relies on gas, not speed
        else if (this._bossType === 'ubersoldier') multiplier = 1.8;  // THE nightmare
        return this._typeData.speed * multiplier;
    }

    /**
     * Get the current fire rate (accounting for enrage).
     * Both bosses halve fire rate interval on enrage (= fire faster).
     * @returns {number}
     */
    _getFireRate() {
        return this._enraged
            ? this._typeData.fireRate / 2
            : this._typeData.fireRate;
    }

    /**
     * Fire a hitscan shot at the player.
     * @param {number} distance - Distance to player
     */
    _fireAtPlayer(distance) {
        const [minDmg, maxDmg] = this._typeData.damage;
        const baseDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;

        let finalDamage;
        if (distance > 2) {
            finalDamage = Math.max(1, Math.floor(baseDamage - distance / 2));
        } else {
            finalDamage = baseDamage;
        }

        eventBus.emit('enemy:attack', {
            enemyId: this._bossId,
            damage: finalDamage,
            distance,
        });
    }

    /**
     * Handle boss death.
     */
    _die() {
        // Phase-one boss (mech suit): don't truly die — transition to phase 2
        if (this._typeData.isPhaseOne && this._typeData.nextPhase) {
            this._startPhaseTransition();
            return;
        }

        this.isAlive = false;
        this.state = BOSS_STATE.DEATH;
        this._deathProgress = 0;

        // Play death animation
        this._playAnimation('death');

        // Award score
        this._gameState.addScore(this._typeData.score);
        this._gameState.recordKill();

        // Play death voice (reuse encounter voice for dramatic effect)
        if (this._typeData.voice) {
            eventBus.emit('enemy:voice', {
                name: this._typeData.voice,
                category: 'death',
                x: this.position.x,
                z: this.position.z,
            });
        }

        // Emit enemy:death with drop info so PickupSystem spawns the drop
        eventBus.emit('enemy:death', {
            type: 'boss',
            score: this._typeData.score,
            dropType: this._typeData.dropType,
            dropAmount: this._typeData.dropAmount,
            position: { x: this.position.x, z: this.position.z },
        });

        // Emit boss death event for main.js (victory music, exit unlock)
        eventBus.emit('boss:death', {
            name: this._typeData.name,
            score: this._typeData.score,
        });

        // Fade out health bar
        this._hideHealthBar();
    }

    /**
     * Start the phase transition sequence (mech → human Hitler).
     * The mech stops fighting, the health bar shows "MECH DESTROYED",
     * and after a brief pause, a phase transition event is emitted.
     */
    _startPhaseTransition() {
        this.isAlive = false;
        this.state = BOSS_STATE.PHASE_TRANSITION;
        this._stateTimer = PHASE_TRANSITION_DURATION;

        // Screen shake — sustained, high intensity
        eventBus.emit('screen:shake', { intensity: 1.5, duration: PHASE_TRANSITION_DURATION });

        // Update health bar label to show destruction
        if (this._healthBarLabel) {
            this._healthBarLabel.textContent = 'MECH DESTROYED';
            this._healthBarLabel.style.color = '#ff8800';
            this._healthBarLabel.style.textShadow = '0 0 15px rgba(255, 136, 0, 0.8)';
        }
        if (this._healthBarFill) {
            this._healthBarFill.style.width = '0%';
            this._healthBarFill.style.background = 'linear-gradient(180deg, #ff6600 0%, #883300 100%)';
        }
    }

    /**
     * PHASE_TRANSITION state: brief pause while mech explodes, then emit event.
     * @param {number} dt
     */
    _updatePhaseTransition(dt) {
        this._stateTimer -= dt;

        // Flash the mech mesh orange/red during destruction
        if (this.mesh) {
            const flash = Math.sin(performance.now() / 80) > 0;
            if (this._usesModel) {
                this.mesh.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(flash ? 0x662200 : 0x110000);
                    }
                });
            } else if (this.mesh.material) {
                this.mesh.material.color.setHex(flash ? 0xff4400 : 0x331100);
                this.mesh.material.emissive.setHex(flash ? 0x662200 : 0x110000);
            }
        }

        if (this._stateTimer <= 0) {
            // Emit phase transition event — main.js creates the phase 2 boss
            eventBus.emit('boss:phase_transition', {
                nextPhase: this._typeData.nextPhase,
                position: { x: this.position.x, z: this.position.z },
            });
        }
    }

    // ── Internal: Movement ─────────────────────────────────────────────

    /**
     * Move the boss with collision detection.
     * @param {number} dx - X delta
     * @param {number} dz - Z delta
     * @returns {boolean} True if moved
     */
    _moveWithCollision(dx, dz) {
        const currentPos = { x: this.position.x, z: this.position.z };
        const desiredPos = { x: this.position.x + dx, z: this.position.z + dz };

        const resolved = this._collision.checkMove(currentPos, desiredPos, BOSS_RADIUS);

        const moved = (resolved.x !== currentPos.x || resolved.z !== currentPos.z);

        this.position.x = resolved.x;
        this.position.z = resolved.z;

        return moved;
    }

    // ── Internal: Hit Handler ──────────────────────────────────────────

    /**
     * Handle 'enemy:hit' event — check if it's for the boss.
     * @param {{enemyId: string|number, damage: number}} data
     */
    _handleHit(data) {
        if (data.enemyId === this._bossId) {
            this.takeDamage(data.damage);
        }
    }

    // ── Internal: Clip Name Normalization ────────────────────────────────

    /**
     * Normalize Blender NLA track names to the clip names expected by EnemyAnimationMixer.
     * @param {string} blenderName - Animation clip name from Blender GLB
     * @returns {string} Normalized clip name
     */
    _normalizeClipName(blenderName) {
        const lower = blenderName.toLowerCase().trim();
        const nameMap = {
            'attack': 'shoot',
            'hitreaction': 'hit',
            'hit_reaction': 'hit',
            'hit': 'hit',
        };
        return nameMap[lower] ?? lower;
    }

    /**
     * Play a skeletal animation if the boss uses a 3D model with embedded animations.
     * @param {string} clipName - Animation name ('idle', 'walk', 'shoot', 'death')
     */
    _playAnimation(clipName) {
        if (this._mixerAnimator) {
            this._mixerAnimator.play(clipName);
        }
    }

    // ── Internal: Health Bar UI ────────────────────────────────────────

    /**
     * Create the boss health bar DOM elements (hidden initially).
     */
    _createHealthBar() {
        // Container
        this._healthBarContainer = document.createElement('div');
        this._healthBarContainer.id = 'boss-health-bar';
        Object.assign(this._healthBarContainer.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            maxWidth: '80vw',
            zIndex: '1000',
            opacity: '0',
            transition: 'opacity 0.5s ease-in',
            pointerEvents: 'none',
            textAlign: 'center',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
        });

        // Boss name label
        this._healthBarLabel = document.createElement('div');
        Object.assign(this._healthBarLabel.style, {
            color: '#ff4444',
            fontSize: '14px',
            marginBottom: '6px',
            textShadow: '0 0 10px rgba(255, 68, 68, 0.6)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
        });
        this._healthBarLabel.textContent = this._typeData.name;
        this._healthBarContainer.appendChild(this._healthBarLabel);

        // Health bar background
        const barBg = document.createElement('div');
        Object.assign(barBg.style, {
            width: '100%',
            height: '16px',
            backgroundColor: '#1a1a1a',
            border: '2px solid #666',
            borderRadius: '2px',
            overflow: 'hidden',
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
        });

        // Health bar fill
        this._healthBarFill = document.createElement('div');
        Object.assign(this._healthBarFill.style, {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #cc0000 0%, #880000 100%)',
            transition: 'width 0.15s ease-out',
        });

        barBg.appendChild(this._healthBarFill);
        this._healthBarContainer.appendChild(barBg);
        document.body.appendChild(this._healthBarContainer);
    }

    /**
     * Show the health bar with fade-in.
     */
    _showHealthBar() {
        if (this._healthBarContainer) {
            this._healthBarContainer.style.opacity = '1';
        }
    }

    /**
     * Hide the health bar with fade-out.
     */
    _hideHealthBar() {
        if (this._healthBarContainer) {
            this._healthBarContainer.style.opacity = '0';
        }
    }

    /**
     * Update the health bar fill width.
     */
    _updateHealthBar() {
        if (!this._healthBarFill) return;

        const percent = Math.max(0, (this.hp / this.maxHp) * 100);
        this._healthBarFill.style.width = `${percent}%`;

        // Color shifts based on HP (threshold matches boss type enrage)
        const enragePct = (this._typeData.enrageThreshold || 0.3) * 100;
        if (percent <= enragePct) {
            this._healthBarFill.style.background =
                'linear-gradient(180deg, #ff2200 0%, #aa0000 100%)';
            // Pulsing effect when enraged
            if (this._enraged) {
                const pulse = 0.7 + Math.sin(performance.now() / 150) * 0.3;
                this._healthBarFill.style.opacity = `${pulse}`;
            }
        } else if (percent <= 60) {
            this._healthBarFill.style.background =
                'linear-gradient(180deg, #dd4400 0%, #992200 100%)';
            this._healthBarFill.style.opacity = '1';
        } else {
            this._healthBarFill.style.background =
                'linear-gradient(180deg, #cc0000 0%, #880000 100%)';
            this._healthBarFill.style.opacity = '1';
        }

        // Update name color when enraged
        if (this._enraged && this._healthBarLabel) {
            const flash = Math.sin(performance.now() / 200) > 0;
            this._healthBarLabel.style.color = flash ? '#ff0000' : '#ff4444';
        }
    }

    /**
     * Remove health bar DOM elements.
     */
    _removeHealthBar() {
        if (this._healthBarContainer) {
            this._healthBarContainer.remove();
            this._healthBarContainer = null;
            this._healthBarFill = null;
            this._healthBarLabel = null;
        }
    }
}
