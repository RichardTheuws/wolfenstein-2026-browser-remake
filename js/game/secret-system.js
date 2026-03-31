/**
 * secret-system.js — Push Wall / Secret Passage Manager
 *
 * Manages secret push walls defined in level data.
 * When the player presses E near a secret wall, the passage opens
 * by clearing the collision cell and emitting a discovery event.
 */

import { eventBus } from '../engine/event-bus.js';

/** Maximum distance (in world units) for interacting with a secret wall */
const SECRET_INTERACT_RANGE = 1.5;

export class SecretSystem {
    /**
     * @param {import('../engine/level-loader.js').LevelLoader} levelLoader
     * @param {import('../engine/collision.js').CollisionSystem} collision
     * @param {import('./game-state.js').GameState} gameState
     */
    constructor(levelLoader, collision, gameState) {
        /** @type {import('../engine/level-loader.js').LevelLoader} */
        this._levelLoader = levelLoader;

        /** @type {import('../engine/collision.js').CollisionSystem} */
        this._collision = collision;

        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /**
         * Tracked secrets from level data. Each entry gains a `found` flag.
         * @type {Array<{ x: number, z: number, pushDirection: string, found: boolean }>}
         */
        this._secrets = (levelLoader.secrets || []).map((s) => ({
            x: s.x,
            z: s.z,
            pushDirectionection: s.pushDirectionection,
            found: false,
        }));

        // Listen for player interact events
        this._onInteract = this._handleInteract.bind(this);
        eventBus.on('player:interact', this._onInteract);
    }

    /**
     * Handle a player interact event. Check if any unfound secret wall
     * is within range of the interaction point.
     * @param {{ x: number, z: number, dirX: number, dirZ: number, range: number }} data
     */
    _handleInteract(data) {
        for (const secret of this._secrets) {
            if (secret.found) continue;

            // Calculate distance from player to the secret wall center
            const dx = (secret.x + 0.5) - data.x;
            const dz = (secret.z + 0.5) - data.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > SECRET_INTERACT_RANGE) continue;

            // Check that player is roughly facing the secret wall
            const toDirX = dx / (dist || 1);
            const toDirZ = dz / (dist || 1);
            const dot = data.dirX * toDirX + data.dirZ * toDirZ;

            if (dot < 0.3) continue; // Not facing the wall

            // Open the secret passage
            this._openSecret(secret);
            break; // Only one secret per interaction
        }
    }

    /**
     * Open a secret passage: clear the collision cell and record the discovery.
     * @param {{ x: number, z: number, pushDirection: string, found: boolean }} secret
     */
    _openSecret(secret) {
        secret.found = true;

        // Clear collision grid cell so the player can walk through
        if (this._collision.grid && this._collision.grid[secret.z]) {
            this._collision.grid[secret.z][secret.x] = 0;
        }

        // Record in game state
        this._gameState.recordSecret();
        this._gameState.addScore(500);

        // Sound placeholder
        console.log('[SecretSystem] Grinding stone sound — secret found at', secret.x, secret.z);

        // Emit event for other systems
        eventBus.emit('secret:found', {
            x: secret.x,
            z: secret.z,
            pushDirection: secret.pushDirection,
            totalFound: this._gameState.secretsFound,
            totalSecrets: this._gameState.totalSecrets,
        });
    }

    /**
     * Get number of secrets found / total.
     * @returns {{ found: number, total: number }}
     */
    getProgress() {
        const found = this._secrets.filter((s) => s.found).length;
        return { found, total: this._secrets.length };
    }

    /**
     * Clean up event listeners.
     */
    dispose() {
        eventBus.off('player:interact', this._onInteract);
    }
}
