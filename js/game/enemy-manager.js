/**
 * enemy-manager.js — Enemy Lifecycle Manager
 *
 * Spawns, updates, and cleans up all enemy instances for a level.
 * Bridges enemy AI with the weapon system (raycasting targets) and
 * game state (score, kills, damage). Handles sound propagation
 * (gunfire alerting nearby enemies through walls).
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';
import { Enemy, ENEMY_TYPES } from './enemy.js';

/** Sound propagation radius in world units */
const SOUND_PROPAGATION_RANGE = 20;

/** Delay before removing dead enemy meshes (seconds) */
const DEAD_CLEANUP_DELAY = 2.0;

export class EnemyManager {
    /**
     * @param {THREE.Scene} scene
     * @param {import('../engine/collision.js').CollisionSystem} collisionSystem
     * @param {import('./game-state.js').GameState} gameState
     * @param {import('./player-controller.js').PlayerController} playerController
     */
    constructor(scene, collisionSystem, gameState, playerController) {
        /** @type {THREE.Scene} */
        this._scene = scene;

        /** @type {import('../engine/collision.js').CollisionSystem} */
        this._collision = collisionSystem;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** @type {import('./player-controller.js').PlayerController} */
        this._playerController = playerController;

        /** All enemy instances (alive and dead) @type {Map<number, Enemy>} */
        this._enemies = new Map();

        /** Next unique enemy ID */
        this._nextId = 0;

        /** Dead enemies pending cleanup: { enemy, timer } */
        this._deadQueue = [];

        // Wire up event listeners
        this._onEnemyHit = this._handleEnemyHit.bind(this);
        this._onWeaponFire = this._handleWeaponFire.bind(this);
        this._onEnemyDeath = this._handleEnemyDeath.bind(this);
        this._onEnemyAttack = this._handleEnemyAttack.bind(this);

        eventBus.on('enemy:hit', this._onEnemyHit);
        eventBus.on('weapon:fire', this._onWeaponFire);
        eventBus.on('enemy:death', this._onEnemyDeath);
        eventBus.on('enemy:attack', this._onEnemyAttack);
    }

    /**
     * Spawn enemies from the level loader's entities array.
     * Entities with a type matching a key in ENEMY_TYPES are spawned as enemies.
     * Applies difficulty multipliers from gameState to enemy stats.
     *
     * @param {Array<{id: string, type: string, x: number, z: number, angle: number}>} entities
     */
    spawnFromLevel(entities) {
        const multipliers = this._gameState.getDifficultyMultipliers();

        for (const entity of entities) {
            // Only spawn entities whose type matches a known enemy type
            if (!ENEMY_TYPES[entity.type]) continue;

            const id = this._nextId++;
            const enemy = new Enemy(
                entity.type,
                entity.x,
                entity.z,
                entity.angle,
                this._scene,
                this._collision
            );

            // Apply difficulty multipliers to enemy stats
            enemy.hp = Math.round(enemy.hp * (multipliers.enemyDamageMult > 0 ? 1 : 1));
            enemy.maxHp = enemy.hp;
            enemy._typeData = { ...enemy._typeData };
            enemy._typeData.damage = enemy._typeData.damage.map(
                (d) => Math.round(d * multipliers.enemyDamageMult)
            );
            enemy._typeData.speed = enemy._typeData.speed * multipliers.enemySpeedMult;
            enemy._typeData.alertSpeed = enemy._typeData.alertSpeed * multipliers.enemySpeedMult;

            enemy.id = id;
            enemy.mesh.userData.enemyId = id;

            this._enemies.set(id, enemy);
        }
    }

    /**
     * Spawn a single enemy at runtime (e.g. boss summon).
     * Returns the spawned Enemy instance.
     *
     * @param {{type: string, x: number, z: number, angle?: number, state?: string, summoned?: boolean}} data
     * @returns {Enemy|null}
     */
    spawnEnemy(data) {
        if (!ENEMY_TYPES[data.type]) {
            console.warn(`[EnemyManager] Unknown enemy type: ${data.type}`);
            return null;
        }

        const id = this._nextId++;
        const enemy = new Enemy(
            data.type,
            data.x,
            data.z,
            data.angle || 0,
            this._scene,
            this._collision
        );

        // Apply difficulty multipliers
        const multipliers = this._gameState.getDifficultyMultipliers();
        enemy.hp = Math.round(enemy.hp * (multipliers.enemyDamageMult > 0 ? 1 : 1));
        enemy.maxHp = enemy.hp;
        enemy._typeData = { ...enemy._typeData };
        enemy._typeData.damage = enemy._typeData.damage.map(
            (d) => Math.round(d * multipliers.enemyDamageMult)
        );
        enemy._typeData.speed = enemy._typeData.speed * multipliers.enemySpeedMult;
        enemy._typeData.alertSpeed = enemy._typeData.alertSpeed * multipliers.enemySpeedMult;

        enemy.id = id;
        enemy.mesh.userData.enemyId = id;

        // Tag summoned enemies so boss can track their deaths
        if (data.summoned) {
            enemy._summoned = true;
        }

        // If spawned in alert state, immediately alert the enemy
        if (data.state === 'alert') {
            enemy.alert();
        }

        this._enemies.set(id, enemy);
        return enemy;
    }

    /**
     * Update all alive enemies (AI, movement, attack).
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const playerPos = this._playerController.position;

        // Update all alive enemies
        for (const enemy of this._enemies.values()) {
            if (enemy.isAlive) {
                enemy.update(deltaTime, playerPos, this._collision);
            }
        }

        // Process dead enemy cleanup queue
        this._updateDeadQueue(deltaTime);
    }

    /**
     * Get an array of all alive enemy meshes (for weapon raycasting).
     * @returns {THREE.Mesh[]}
     */
    getEnemyMeshes() {
        const meshes = [];
        for (const enemy of this._enemies.values()) {
            if (enemy.isAlive && enemy.mesh) {
                meshes.push(enemy.mesh);
            }
        }
        return meshes;
    }

    /**
     * Apply damage to a specific enemy by ID.
     * @param {number} enemyId
     * @param {number} damage
     */
    handleEnemyHit(enemyId, damage) {
        const enemy = this._enemies.get(enemyId);
        if (!enemy || !enemy.isAlive) return;

        enemy.takeDamage(damage);
    }

    /**
     * Alert nearby enemies when the player fires a weapon (sound propagation).
     * Enemies within SOUND_PROPAGATION_RANGE that don't have a wall between them
     * and the player become ALERT.
     *
     * @param {THREE.Vector3} playerPos - Player position when firing
     */
    handleWeaponFire(playerPos) {
        for (const enemy of this._enemies.values()) {
            if (!enemy.isAlive) continue;

            // Check distance
            const dx = enemy.position.x - playerPos.x;
            const dz = enemy.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > SOUND_PROPAGATION_RANGE) continue;

            // Check LOS using DDA (sound doesn't travel through walls)
            if (this._hasLineOfSight(playerPos, enemy.position)) {
                enemy.alert();
            }
        }
    }

    /**
     * Get the number of alive enemies.
     * @returns {number}
     */
    getAliveCount() {
        let count = 0;
        for (const enemy of this._enemies.values()) {
            if (enemy.isAlive) count++;
        }
        return count;
    }

    /**
     * Get total number of enemies (alive + dead).
     * @returns {number}
     */
    getTotalCount() {
        return this._enemies.size;
    }

    /**
     * Get positions of all enemies for minimap rendering.
     * @returns {Array<{x: number, z: number, isAlive: boolean}>}
     */
    getEnemyPositions() {
        const positions = [];
        for (const enemy of this._enemies.values()) {
            positions.push({
                x: enemy.position.x,
                z: enemy.position.z,
                isAlive: enemy.isAlive,
            });
        }
        return positions;
    }

    /**
     * Clean up all meshes, events, and resources.
     */
    dispose() {
        // Remove event listeners
        eventBus.off('enemy:hit', this._onEnemyHit);
        eventBus.off('weapon:fire', this._onWeaponFire);
        eventBus.off('enemy:death', this._onEnemyDeath);
        eventBus.off('enemy:attack', this._onEnemyAttack);

        // Dispose all enemies
        for (const enemy of this._enemies.values()) {
            enemy.dispose();
        }
        this._enemies.clear();
        this._deadQueue = [];
    }

    // ── Internal: Event Handlers ───────────────────────────────────────

    /**
     * Handle 'enemy:hit' event from the weapon system.
     * @param {{enemyId: number, damage: number, hitPoint: THREE.Vector3}} data
     */
    _handleEnemyHit(data) {
        this.handleEnemyHit(data.enemyId, data.damage);
    }

    /**
     * Handle 'weapon:fire' event for sound propagation.
     * @param {{position: THREE.Vector3}} data
     */
    _handleWeaponFire(data) {
        this.handleWeaponFire(data.position);
    }

    /**
     * Handle 'enemy:death' event — award score, record kill, schedule cleanup.
     * @param {{enemyId: number, score: number, dropType: string, dropAmount: number, position: {x: number, z: number}}} data
     */
    _handleEnemyDeath(data) {
        // Award score
        this._gameState.addScore(data.score);

        // Record kill
        this._gameState.recordKill();

        // Emit pickup drop event (for a future pickup system to handle)
        if (data.dropType) {
            eventBus.emit('enemy:drop', {
                type: data.dropType,
                amount: data.dropAmount,
                x: data.position.x,
                z: data.position.z,
            });
        }

        // Schedule dead enemy mesh for cleanup
        const enemy = this._enemies.get(data.enemyId);
        if (enemy) {
            this._deadQueue.push({ enemy, timer: DEAD_CLEANUP_DELAY });
        }
    }

    /**
     * Handle 'enemy:attack' event — apply damage to the player.
     * @param {{enemyId: number, damage: number, distance: number}} data
     */
    _handleEnemyAttack(data) {
        this._gameState.takeDamage(data.damage);
    }

    // ── Internal: Dead Enemy Cleanup ───────────────────────────────────

    /**
     * Process the dead enemy cleanup queue.
     * After the death animation completes + delay, remove the mesh from the scene.
     * @param {number} dt
     */
    _updateDeadQueue(dt) {
        for (let i = this._deadQueue.length - 1; i >= 0; i--) {
            const entry = this._deadQueue[i];
            entry.timer -= dt;

            if (entry.timer <= 0) {
                // Remove mesh from scene but keep enemy in the map
                // (so we can still track total kills, etc.)
                entry.enemy.dispose();
                this._deadQueue.splice(i, 1);
            }
        }
    }

    // ── Internal: Line of Sight (for sound propagation) ────────────────

    /**
     * Check line of sight between two positions using DDA on the collision grid.
     * Used for sound propagation — sound doesn't travel through walls.
     *
     * @param {THREE.Vector3} from
     * @param {THREE.Vector3} to
     * @returns {boolean} True if LOS is clear
     */
    _hasLineOfSight(from, to) {
        const x0 = from.x;
        const z0 = from.z;
        const x1 = to.x;
        const z1 = to.z;

        // Current grid cell
        let gridX = Math.floor(x0);
        let gridZ = Math.floor(z0);

        // Target grid cell
        const targetX = Math.floor(x1);
        const targetZ = Math.floor(z1);

        // Same cell
        if (gridX === targetX && gridZ === targetZ) return true;

        // Direction of ray
        const dx = x1 - x0;
        const dz = z1 - z0;

        // Step direction
        const stepX = dx >= 0 ? 1 : -1;
        const stepZ = dz >= 0 ? 1 : -1;

        // Distance to cross one cell in each axis
        const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : 1e10;
        const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : 1e10;

        // Distance to first cell boundary
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

        const maxSteps = 100;
        for (let i = 0; i < maxSteps; i++) {
            if (tMaxX < tMaxZ) {
                gridX += stepX;
                tMaxX += tDeltaX;
            } else {
                gridZ += stepZ;
                tMaxZ += tDeltaZ;
            }

            if (gridX === targetX && gridZ === targetZ) return true;

            if (this._collision.isWall(gridX, gridZ)) return false;
        }

        return false;
    }
}
