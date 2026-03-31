/**
 * weapon-system.js — Wolfenstein 3D Weapon System
 *
 * 4 weapons (Knife, Pistol, Machine Gun, Chain Gun) with hitscan combat,
 * distance-based damage, ammo management, and weapon switching.
 * Fires raycasts through Three.js for enemy hit detection.
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';

// ── Weapon Definitions ─────────────────────────────────────────────

/** Fire states */
const FIRE_STATE = {
    IDLE: 'idle',
    FIRING: 'firing',
    COOLDOWN: 'cooldown',
};

/**
 * Weapon data array. Index corresponds to weapon slot (1-4 keys map to 0-3).
 * @type {Array<{name: string, type: string, range: number, fireRate: number, ammoPerShot: number, autoFire: boolean, damageMin: number, damageMax: number}>}
 */
const WEAPONS = [
    {
        name: 'Knife',
        type: 'melee',
        range: 1.5,
        fireRate: 0.4,
        ammoPerShot: 0,
        autoFire: false,
        damageMin: 1,
        damageMax: 8,
    },
    {
        name: 'Pistol',
        type: 'hitscan',
        range: Infinity,
        fireRate: 0.5,
        ammoPerShot: 1,
        autoFire: false,
        damageMin: 2,
        damageMax: 15,
    },
    {
        name: 'Machine Gun',
        type: 'hitscan',
        range: Infinity,
        fireRate: 0.12,
        ammoPerShot: 1,
        autoFire: true,
        damageMin: 2,
        damageMax: 15,
    },
    {
        name: 'Chain Gun',
        type: 'hitscan',
        range: Infinity,
        fireRate: 0.08,
        ammoPerShot: 1,
        autoFire: true,
        damageMin: 2,
        damageMax: 15,
    },
];

export class WeaponSystem {
    /**
     * @param {import('../engine/input.js').InputManager} inputManager
     * @param {THREE.PerspectiveCamera} camera
     * @param {import('./game-state.js').GameState} gameState
     */
    constructor(inputManager, camera, gameState) {
        /** @type {import('../engine/input.js').InputManager} */
        this._input = inputManager;

        /** @type {THREE.PerspectiveCamera} */
        this._camera = camera;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** Current weapon index (0-3) */
        this._currentWeapon = 1; // Start with pistol

        /** Fire state machine */
        this._fireState = FIRE_STATE.IDLE;

        /** Cooldown timer remaining in seconds */
        this._cooldownTimer = 0;

        /** Mouse button held state — tracked internally since InputManager doesn't track mouse buttons */
        this._mouseDown = false;

        /** Whether fire was requested this frame (rising edge for non-auto weapons) */
        this._fireRequested = false;

        /** Mobile fire rising edge — true on the first frame mobile fire is held */
        this._mobileFireRequested = false;

        /** Previous frame's mobile fire state for edge detection */
        this._prevMobileFire = false;

        /** Enemy meshes for raycasting (set by enemy-manager) */
        this._enemyMeshes = [];

        /** Three.js raycaster for hitscan */
        this._raycaster = new THREE.Raycaster();

        /** Reusable vector for raycaster direction */
        this._direction = new THREE.Vector3();

        // Bind mouse event handlers
        this._onMouseDown = this._handleMouseDown.bind(this);
        this._onMouseUp = this._handleMouseUp.bind(this);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);

        // Listen for weapon switch via scroll wheel
        this._onWheel = this._handleWheel.bind(this);
        document.addEventListener('wheel', this._onWheel);
    }

    /**
     * Update the weapon system. Handles fire input, cooldowns, and weapon switching.
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Detect mobile fire rising edge (transition from not-held to held)
        const mobileFire = this._input.isMobileFireHeld();
        this._mobileFireRequested = mobileFire && !this._prevMobileFire;
        this._prevMobileFire = mobileFire;

        this._handleWeaponSwitch();
        this._updateFiring(deltaTime);
    }

    /**
     * Switch to a weapon by index (0-3).
     * @param {number} index - Weapon index
     */
    switchWeapon(index) {
        if (index < 0 || index >= WEAPONS.length) return;
        if (index === this._currentWeapon) return;

        // Can only switch to hitscan weapons if the player has ammo,
        // but always allow switching (player might pick up ammo later)
        this._currentWeapon = index;
        this._fireState = FIRE_STATE.IDLE;
        this._cooldownTimer = 0;

        // Keep gameState in sync with weapon system
        this._gameState.setCurrentWeapon(index);

        eventBus.emit('weapon:switch', {
            index,
            weapon: this.getCurrentWeapon(),
        });
    }

    /**
     * Get the current weapon data.
     * @returns {{name: string, type: string, range: number, fireRate: number, ammoPerShot: number, autoFire: boolean, damageMin: number, damageMax: number, index: number}}
     */
    getCurrentWeapon() {
        return { ...WEAPONS[this._currentWeapon], index: this._currentWeapon };
    }

    /**
     * Get all weapons with their stats.
     * @returns {Array<{name: string, type: string, range: number, fireRate: number, ammoPerShot: number, autoFire: boolean, damageMin: number, damageMax: number, index: number}>}
     */
    getWeaponList() {
        return WEAPONS.map((w, i) => ({ ...w, index: i }));
    }

    /**
     * Set the array of enemy meshes for raycasting.
     * Called by EnemyManager when enemies are spawned or die.
     * @param {THREE.Mesh[]} meshArray
     */
    setEnemyMeshes(meshArray) {
        this._enemyMeshes = meshArray;
    }

    /**
     * Clean up event listeners.
     */
    dispose() {
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('wheel', this._onWheel);
    }

    // ── Internal: Input Handling ────────────────────────────────────────

    /**
     * Handle mouse down (left button only).
     * @param {MouseEvent} e
     */
    _handleMouseDown(e) {
        if (e.button !== 0) return; // Left button only
        if (!this._input.isPointerLocked) return;
        this._mouseDown = true;
        this._fireRequested = true;
    }

    /**
     * Handle mouse up.
     * @param {MouseEvent} e
     */
    _handleMouseUp(e) {
        if (e.button !== 0) return;
        this._mouseDown = false;
    }

    /**
     * Handle scroll wheel for weapon switching.
     * @param {WheelEvent} e
     */
    _handleWheel(e) {
        if (!this._input.isPointerLocked) return;

        const direction = e.deltaY > 0 ? 1 : -1;
        let next = this._currentWeapon + direction;

        // Wrap around
        if (next < 0) next = WEAPONS.length - 1;
        if (next >= WEAPONS.length) next = 0;

        this.switchWeapon(next);
    }

    /**
     * Handle number key weapon switching (1-4).
     */
    _handleWeaponSwitch() {
        if (this._input.isKeyPressed('Digit1')) this.switchWeapon(0);
        else if (this._input.isKeyPressed('Digit2')) this.switchWeapon(1);
        else if (this._input.isKeyPressed('Digit3')) this.switchWeapon(2);
        else if (this._input.isKeyPressed('Digit4')) this.switchWeapon(3);
    }

    // ── Internal: Firing Logic ─────────────────────────────────────────

    /**
     * Update firing state machine.
     * @param {number} dt - Delta time in seconds
     */
    _updateFiring(dt) {
        const weapon = WEAPONS[this._currentWeapon];

        switch (this._fireState) {
            case FIRE_STATE.IDLE:
                if (this._shouldFire(weapon)) {
                    this._fire(weapon);
                }
                break;

            case FIRE_STATE.COOLDOWN:
                this._cooldownTimer -= dt;
                if (this._cooldownTimer <= 0) {
                    this._cooldownTimer = 0;
                    this._fireState = FIRE_STATE.IDLE;

                    // For auto-fire weapons, immediately check if still firing
                    const isDesktopFiring = this._mouseDown && this._input.isPointerLocked;
                    const isMobileFiring = this._input.isMobileFireHeld();
                    if (weapon.autoFire && (isDesktopFiring || isMobileFiring)) {
                        this._fire(weapon);
                    }
                }
                break;
        }

        // Consume fire request each frame
        this._fireRequested = false;
        this._mobileFireRequested = false;
    }

    /**
     * Determine if the weapon should fire this frame.
     * Supports both desktop (mouse) and mobile (touch fire button) input.
     * @param {object} weapon - Weapon data
     * @returns {boolean}
     */
    _shouldFire(weapon) {
        const mobileFire = this._input.isMobileFireHeld();

        // Desktop requires pointer lock; mobile bypasses it
        if (!this._input.isPointerLocked && !mobileFire) return false;

        if (weapon.autoFire) {
            // Auto-fire weapons fire while button is held
            return this._mouseDown || mobileFire;
        } else {
            // Semi-auto weapons only fire on click (rising edge)
            // For mobile semi-auto: _fireRequested is set on each new touch via _mobileFireRequested
            return this._fireRequested || this._mobileFireRequested;
        }
    }

    /**
     * Execute a weapon fire action.
     * @param {object} weapon - Weapon data
     */
    _fire(weapon) {
        // Check ammo for non-melee weapons
        if (weapon.ammoPerShot > 0) {
            if (!this._gameState.useAmmo(weapon.ammoPerShot)) {
                // No ammo — auto-switch to knife
                this.switchWeapon(0);
                return;
            }
        }

        // Enter cooldown
        this._fireState = FIRE_STATE.COOLDOWN;
        this._cooldownTimer = weapon.fireRate;

        // Emit fire event (for muzzle flash, sound propagation, etc.)
        eventBus.emit('weapon:fire', {
            weaponIndex: this._currentWeapon,
            weaponName: weapon.name,
            weaponType: weapon.type,
            position: this._camera.position.clone(),
        });

        // Perform the attack
        if (weapon.type === 'melee') {
            this._performMeleeAttack(weapon);
        } else {
            this._performHitscan(weapon);
        }
    }

    /**
     * Perform a melee attack (knife). Checks for enemies within range.
     * @param {object} weapon - Weapon data
     */
    _performMeleeAttack(weapon) {
        // Set raycaster from camera center
        this._camera.getWorldDirection(this._direction);
        this._raycaster.set(this._camera.position, this._direction);
        this._raycaster.far = weapon.range;

        const intersections = this._raycaster.intersectObjects(this._enemyMeshes, true);

        if (intersections.length > 0) {
            const hit = intersections[0];
            const enemyId = this._findEnemyId(hit.object);

            if (enemyId !== undefined && enemyId !== null) {
                // Knife damage: random 1-8
                const damage = Math.floor(Math.random() * weapon.damageMax) + weapon.damageMin;

                eventBus.emit('enemy:hit', {
                    enemyId,
                    damage,
                    hitPoint: hit.point.clone(),
                });
            }
        } else {
            eventBus.emit('weapon:miss', {
                weaponType: weapon.type,
                weaponName: weapon.name,
            });
        }
    }

    /**
     * Perform a hitscan attack (pistol, MG, chaingun).
     * Casts a ray from the camera and checks intersection with enemy meshes.
     * @param {object} weapon - Weapon data
     */
    _performHitscan(weapon) {
        // Set raycaster from camera center, looking forward
        this._camera.getWorldDirection(this._direction);
        this._raycaster.set(this._camera.position, this._direction);
        this._raycaster.far = 100; // Max hitscan range

        const intersections = this._raycaster.intersectObjects(this._enemyMeshes, true);

        if (intersections.length > 0) {
            const hit = intersections[0];
            const enemyId = this._findEnemyId(hit.object);

            if (enemyId !== undefined && enemyId !== null) {
                const distance = hit.distance;
                const damage = this._calculateHitscanDamage(distance);

                eventBus.emit('enemy:hit', {
                    enemyId,
                    damage,
                    hitPoint: hit.point.clone(),
                });
            }
        } else {
            eventBus.emit('weapon:miss', {
                weaponType: weapon.type,
                weaponName: weapon.name,
            });
        }
    }

    /**
     * Walk up the parent chain from a hit object to find the enemyId in userData.
     * Needed because GLB models are Group objects with child meshes — the raycaster
     * hits a child mesh, but enemyId is set on the root Group.
     * @param {THREE.Object3D} object - The intersected object
     * @returns {number|null} The enemyId, or null if not found
     */
    _findEnemyId(object) {
        let current = object;
        while (current) {
            if (current.userData && current.userData.enemyId !== undefined) {
                return current.userData.enemyId;
            }
            current = current.parent;
        }
        return null;
    }

    /**
     * Calculate hitscan damage based on distance (Wolfenstein formula).
     * Base damage: random(1, 15)
     * Distance factor: if distance > 2, reduce by distance/2
     * Final: max(1, baseDamage - distance/2)
     *
     * @param {number} distance - Distance to target in world units
     * @returns {number} Final damage (integer, minimum 1)
     */
    _calculateHitscanDamage(distance) {
        const baseDamage = Math.floor(Math.random() * 15) + 1;

        if (distance > 2) {
            return Math.max(1, Math.floor(baseDamage - distance / 2));
        }

        return baseDamage;
    }
}
