/**
 * pickup-system.js — Item Pickup Manager
 *
 * Manages spawning, rendering, and collection of pickups (ammo, health, keys,
 * treasures). Pickups use billboard sprites that face the camera each frame,
 * with a hover bob animation. Collection checks run every frame against the
 * player position. Enemy death drops are handled via the 'enemy:death' event.
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';

// ── Pickup Definitions ─────────────────────────────────────────────────────

export const PICKUP_TYPES = {
    pistol_ammo:     { effect: 'ammo',     value: 8,        color: 0xFFFF00, height: 0.3,  label: 'Ammo',      sprite: 'ammo.png' },
    health_small:    { effect: 'health',   value: 10,       color: 0x00FF00, height: 0.3,  label: 'First Aid', sprite: 'health_small.png' },
    health_large:    { effect: 'health',   value: 25,       color: 0x00CC00, height: 0.5,  label: 'Med Kit',   sprite: 'health_large.png' },
    gold_key:        { effect: 'key',      value: 'gold',   color: 0xFFD700, height: 0.4,  label: 'Gold Key',  sprite: 'gold_key.png' },
    silver_key:      { effect: 'key',      value: 'silver', color: 0xC0C0C0, height: 0.4,  label: 'Silver Key',sprite: 'silver_key.png' },
    treasure_cross:  { effect: 'treasure', value: 100,      color: 0xDAA520, height: 0.3,  label: 'Cross',     sprite: 'treasure_cross.png' },
    treasure_goblet: { effect: 'treasure', value: 500,      color: 0xC0C0C0, height: 0.35, label: 'Chalice',   sprite: 'treasure_goblet.png' },
    treasure_chest:  { effect: 'treasure', value: 1000,     color: 0x8B4513, height: 0.4,  label: 'Chest',     sprite: 'treasure_chest.png' },
    treasure_crown:  { effect: 'treasure', value: 5000,     color: 0xFFD700, height: 0.35, label: 'Crown',     sprite: 'treasure_crown.png' },

    // ── Weapon Pickups ─────────────────────────────────────────────
    weapon_mp40:     { effect: 'weapon',   value: 2,        color: 0x555555, height: 0.4,  label: 'MP40',      sprite: 'mp40.png' },
    weapon_chaingun: { effect: 'weapon',   value: 3,        color: 0x333333, height: 0.4,  label: 'Chain Gun', sprite: 'chaingun.png' },
};

/** Base path for pickup sprite textures */
const SPRITE_BASE_PATH = 'assets/sprites/pickups/';

/** Distance from player center at which a pickup is collected */
const COLLECTION_RADIUS = 0.8;

/** Y-axis rotation speed in radians per second */
const ROTATE_SPEED = 1.0;

/** Amplitude of the hover bob in world units */
const BOB_AMPLITUDE = 0.05;

/** Frequency multiplier for the hover bob */
const BOB_FREQUENCY = 2.0;

// ── PickupSystem ────────────────────────────────────────────────────────────

export class PickupSystem {
    /**
     * @param {THREE.Scene} scene - The Three.js scene to add meshes to
     * @param {import('./game-state.js').GameState} gameState - Central game state
     * @param {import('./player-controller.js').PlayerController} playerController - Player controller for position
     * @param {THREE.Camera} camera - The camera for billboard facing
     */
    constructor(scene, gameState, playerController, camera) {
        /** @type {THREE.Scene} */
        this._scene = scene;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** @type {import('./player-controller.js').PlayerController} */
        this._player = playerController;

        /** @type {THREE.Camera} */
        this._camera = camera;

        /**
         * Active pickups in the world.
         * @type {Array<{type: string, mesh: THREE.Mesh, baseY: number}>}
         */
        this._pickups = [];

        /** Elapsed time accumulator for bob animation */
        this._time = 0;

        /** Texture loader for pickup sprites */
        this._textureLoader = new THREE.TextureLoader();

        /** Cached textures by sprite filename */
        this._spriteTextures = new Map();

        // Pre-load all pickup sprite textures
        for (const [, def] of Object.entries(PICKUP_TYPES)) {
            if (def.sprite && !this._spriteTextures.has(def.sprite)) {
                const tex = this._textureLoader.load(SPRITE_BASE_PATH + def.sprite);
                tex.colorSpace = THREE.SRGBColorSpace;
                this._spriteTextures.set(def.sprite, tex);
            }
        }

        // Listen for enemy deaths to spawn drops
        this._onEnemyDeath = this._handleEnemyDeath.bind(this);
        eventBus.on('enemy:death', this._onEnemyDeath);
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Spawn pickup meshes from level data.
     * Each entry should have: { type: string, x: number, z: number }
     * @param {Array<{type: string, x: number, z: number}>} pickupsArray
     */
    spawnFromLevel(pickupsArray) {
        if (!Array.isArray(pickupsArray)) return;

        for (const entry of pickupsArray) {
            if (!entry.type || entry.x == null || entry.z == null) {
                console.warn('[PickupSystem] Skipping invalid pickup entry:', entry);
                continue;
            }
            this._spawn(entry.type, entry.x, entry.z);
        }
    }

    /**
     * Spawn a single pickup at the given position (e.g. enemy drop).
     * @param {string} type - Key into PICKUP_TYPES
     * @param {number} x - World X position
     * @param {number} z - World Z position
     */
    spawnDrop(type, x, z) {
        this._spawn(type, x, z);
    }

    /**
     * Per-frame update: check collection and animate pickups.
     * @param {number} deltaTime - Seconds since last frame
     */
    update(deltaTime) {
        this._time += deltaTime;

        const playerX = this._player.position.x;
        const playerZ = this._player.position.z;

        // Iterate backwards so splice doesn't break the loop
        for (let i = this._pickups.length - 1; i >= 0; i--) {
            const pickup = this._pickups[i];
            const def = PICKUP_TYPES[pickup.type];

            // ── Animate ─────────────────────────────────────────────
            // Billboard: face the camera (Y-axis only to stay upright)
            if (this._camera) {
                const camPos = this._camera.position;
                pickup.mesh.rotation.y = Math.atan2(
                    camPos.x - pickup.mesh.position.x,
                    camPos.z - pickup.mesh.position.z
                );
            } else {
                pickup.mesh.rotation.y += ROTATE_SPEED * deltaTime;
            }
            // Hover bob animation
            pickup.mesh.position.y = pickup.baseY + Math.sin(this._time * BOB_FREQUENCY) * BOB_AMPLITUDE;

            // ── Collection check ────────────────────────────────────
            const dx = pickup.mesh.position.x - playerX;
            const dz = pickup.mesh.position.z - playerZ;
            const distSq = dx * dx + dz * dz;

            if (distSq <= COLLECTION_RADIUS * COLLECTION_RADIUS) {
                if (this._tryCollect(pickup.type, def)) {
                    // Remove mesh from scene and array
                    this._removeMesh(pickup.mesh);
                    this._pickups.splice(i, 1);
                }
            }
        }
    }

    /**
     * Clean up all pickups, cached textures, and event listeners.
     */
    dispose() {
        for (const pickup of this._pickups) {
            this._removeMesh(pickup.mesh);
        }
        this._pickups.length = 0;

        // Dispose cached sprite textures
        for (const tex of this._spriteTextures.values()) {
            tex.dispose();
        }
        this._spriteTextures.clear();

        eventBus.off('enemy:death', this._onEnemyDeath);
    }

    // ── Internal ────────────────────────────────────────────────────────

    /**
     * Create and add a pickup mesh to the scene.
     * Uses a billboard sprite plane if a sprite texture is available,
     * falls back to colored BoxGeometry otherwise.
     * @param {string} type - Key into PICKUP_TYPES
     * @param {number} x - World X
     * @param {number} z - World Z
     */
    _spawn(type, x, z) {
        const def = PICKUP_TYPES[type];
        if (!def) {
            console.warn(`[PickupSystem] Unknown pickup type: "${type}"`);
            return;
        }

        const size = def.height;
        let mesh;

        // Try to use the sprite texture for a billboard plane
        const texture = def.sprite ? this._spriteTextures.get(def.sprite) : null;
        if (texture) {
            const spriteSize = Math.max(size, 0.5);
            const geometry = new THREE.PlaneGeometry(spriteSize, spriteSize);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide,
            });
            mesh = new THREE.Mesh(geometry, material);
        } else {
            // Fallback: colored box (no sprite texture available)
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({
                color: def.color,
                emissive: def.color,
                emissiveIntensity: 0.3,
            });
            mesh = new THREE.Mesh(geometry, material);
        }

        // Position at ground level (center of the plane/box sits at half-height)
        const baseY = size * 0.5;
        mesh.position.set(x, baseY, z);

        this._scene.add(mesh);
        this._pickups.push({ type, mesh, baseY });
    }

    /**
     * Attempt to collect a pickup. Returns true if collected, false if
     * the pickup cannot be collected right now (e.g. health at 100).
     * @param {string} type - Pickup type key
     * @param {object} def - Pickup definition from PICKUP_TYPES
     * @returns {boolean}
     */
    _tryCollect(type, def) {
        const gs = this._gameState;

        switch (def.effect) {
            case 'health':
                // Don't waste health pickups if already full
                if (gs.health >= 100) return false;
                gs.heal(def.value);
                break;

            case 'ammo':
                gs.addAmmo(def.value);
                break;

            case 'key':
                gs.addKey(def.value);
                break;

            case 'treasure':
                gs.addScore(def.value);
                gs.recordTreasure();
                break;

            case 'weapon':
                gs.addWeapon(def.value);
                gs.setCurrentWeapon(def.value);
                // Give some ammo with the weapon (MP40 = 20, Chain Gun = 30)
                gs.addAmmo(def.value === 2 ? 20 : 30);
                // Notify HUD of weapon switch
                eventBus.emit('weapon:switch', {
                    index: def.value,
                    weapon: { name: def.label },
                });
                break;

            default:
                console.warn(`[PickupSystem] Unknown effect: "${def.effect}"`);
                return false;
        }

        eventBus.emit('pickup:collect', { type, label: def.label, effect: def.effect, value: def.value });
        return true;
    }

    /**
     * Remove a mesh from the scene and dispose its geometry/material.
     * Note: Textures are shared across pickups of the same type and are
     * NOT disposed here — they're cached in _spriteTextures.
     * @param {THREE.Mesh} mesh
     */
    _removeMesh(mesh) {
        this._scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    }

    /**
     * Handle enemy death events — spawn a drop if the enemy has a dropType.
     * @param {object} data - Event data with { dropType?, position: { x, z } }
     */
    _handleEnemyDeath(data) {
        if (data && data.dropType && data.position && data.position.x != null && data.position.z != null) {
            this.spawnDrop(data.dropType, data.position.x, data.position.z);
        }
    }
}
