/**
 * door-system.js — Door Management System
 *
 * Manages door states, animations, player interaction, and collision grid updates.
 * Doors slide open over 0.5s, stay open for 3s, then auto-close.
 * Locked doors require matching keys in the player's inventory.
 */

import { eventBus } from '../engine/event-bus.js';

/** Door animation duration in seconds */
const OPEN_DURATION = 0.5;

/** Time a door stays open before auto-closing (seconds) */
const AUTO_CLOSE_DELAY = 3.0;

/** Maximum distance from player to interact with a door */
const INTERACT_DISTANCE = 1.5;

/** Door states */
const DoorState = {
    CLOSED: 'CLOSED',
    OPENING: 'OPENING',
    OPEN: 'OPEN',
    CLOSING: 'CLOSING',
};

export class DoorSystem {
    /**
     * @param {import('../engine/level-loader.js').LevelLoader} levelLoader
     * @param {import('../engine/collision.js').CollisionSystem} collision
     * @param {import('./game-state.js').GameState} gameState
     */
    constructor(levelLoader, collision, gameState) {
        /** @type {import('../engine/collision.js').CollisionSystem} */
        this._collision = collision;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** Door runtime state objects */
        this._doors = [];

        // Build door state from level loader data
        const doorMeshes = levelLoader.getDoorMeshes();
        const doorDefs = levelLoader.doors;

        for (let i = 0; i < doorDefs.length; i++) {
            const def = doorDefs[i];
            const mesh = doorMeshes[i];
            if (!mesh) continue;

            this._doors.push({
                id: def.id,
                mesh,
                gridX: def.gridX,
                gridZ: def.gridZ,
                orientation: def.orientation,
                type: def.type,
                requiredKey: def.requiredKey,
                state: DoorState.CLOSED,
                progress: 0, // 0 = fully closed, 1 = fully open
                openTimer: 0, // Countdown to auto-close when OPEN
                closedPosition: mesh.userData.closedPosition,
                openPosition: mesh.userData.openPosition,
            });
        }

        // Listen for player interact events
        this._onInteract = this._handleInteract.bind(this);
        eventBus.on('player:interact', this._onInteract);
    }

    /**
     * Update all door animations and timers.
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        for (const door of this._doors) {
            switch (door.state) {
                case DoorState.OPENING:
                    this._updateOpening(door, deltaTime);
                    break;
                case DoorState.OPEN:
                    this._updateOpen(door, deltaTime);
                    break;
                case DoorState.CLOSING:
                    this._updateClosing(door, deltaTime);
                    break;
                case DoorState.CLOSED:
                    // Nothing to do
                    break;
            }
        }
    }

    /**
     * Get the state of a specific door.
     * @param {number} doorId
     * @returns {string|null} Door state or null if not found
     */
    getDoorState(doorId) {
        const door = this._doors.find((d) => d.id === doorId);
        return door ? door.state : null;
    }

    /**
     * Clean up event listeners.
     */
    dispose() {
        eventBus.off('player:interact', this._onInteract);
    }

    // ── Internal: State Transitions ─────────────────────────────────

    /**
     * Attempt to open a door.
     * @param {object} door - Door state object
     * @returns {boolean} Whether the door started opening
     */
    _tryOpen(door) {
        if (door.state !== DoorState.CLOSED) return false;

        // Check for key requirement
        if (door.requiredKey) {
            if (!this._gameState.hasKey(door.requiredKey)) {
                eventBus.emit('door:locked', {
                    doorId: door.id,
                    requiredKey: door.requiredKey,
                });
                return false;
            }
        }

        door.state = DoorState.OPENING;
        door.progress = 0;

        // Clear collision grid cell so player can walk through
        this._collision.clearCell(door.gridX, door.gridZ);

        eventBus.emit('door:open', { doorId: door.id });
        return true;
    }

    /**
     * Start closing a door.
     * @param {object} door
     */
    _startClosing(door) {
        door.state = DoorState.CLOSING;
    }

    // ── Internal: Animation Updates ─────────────────────────────────

    /**
     * Update a door that is currently opening.
     * @param {object} door
     * @param {number} dt - Delta time
     */
    _updateOpening(door, dt) {
        door.progress += dt / OPEN_DURATION;

        if (door.progress >= 1.0) {
            door.progress = 1.0;
            door.state = DoorState.OPEN;
            door.openTimer = AUTO_CLOSE_DELAY;
        }

        this._applyDoorPosition(door);
    }

    /**
     * Update a door that is fully open (waiting to auto-close).
     * @param {object} door
     * @param {number} dt - Delta time
     */
    _updateOpen(door, dt) {
        door.openTimer -= dt;

        if (door.openTimer <= 0) {
            this._startClosing(door);
        }
    }

    /**
     * Update a door that is currently closing.
     * @param {object} door
     * @param {number} dt - Delta time
     */
    _updateClosing(door, dt) {
        door.progress -= dt / OPEN_DURATION;

        if (door.progress <= 0) {
            door.progress = 0;
            door.state = DoorState.CLOSED;

            // Re-block collision grid cell
            this._collision.fillCell(door.gridX, door.gridZ);

            eventBus.emit('door:close', { doorId: door.id });
        }

        this._applyDoorPosition(door);
    }

    /**
     * Apply the door's position based on its open progress.
     * @param {object} door
     */
    _applyDoorPosition(door) {
        const mesh = door.mesh;
        const isHorizontal = door.orientation === 'horizontal';

        // Interpolate between closed and open positions
        const pos = door.closedPosition + (door.openPosition - door.closedPosition) * door.progress;

        if (isHorizontal) {
            mesh.position.x = pos;
        } else {
            mesh.position.z = pos;
        }
    }

    // ── Internal: Interaction Handling ───────────────────────────────

    /**
     * Handle player interact events. Find the nearest door in range and open it.
     * @param {object} data - { x, z, dirX, dirZ, range }
     */
    _handleInteract(data) {
        const { x, z, range } = data;

        let nearestDoor = null;
        let nearestDist = Infinity;

        for (const door of this._doors) {
            // Door center in world space
            const doorX = door.gridX + 0.5;
            const doorZ = door.gridZ + 0.5;

            const dx = doorX - x;
            const dz = doorZ - z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < range && dist < nearestDist) {
                nearestDist = dist;
                nearestDoor = door;
            }
        }

        if (nearestDoor) {
            this._tryOpen(nearestDoor);
        }
    }
}
