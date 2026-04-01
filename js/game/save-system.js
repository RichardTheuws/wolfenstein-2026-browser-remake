/**
 * save-system.js — Save/Load Game State
 *
 * Saves and loads game state to/from localStorage between levels.
 * We save between levels (not mid-level). When loading, the player
 * restarts the saved floor from the beginning with their saved stats.
 */

const STORAGE_KEY = 'wolfenstein3d-save';
const SAVE_VERSION = 1;

export class SaveSystem {
    /**
     * Save the current game state to localStorage.
     * @param {import('./game-state.js').GameState} gameState
     */
    save(gameState) {
        const data = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            episode: gameState.currentEpisode,
            floor: gameState.currentFloor,
            difficulty: gameState.difficulty,
            health: gameState.health,
            lives: gameState.lives,
            score: gameState.score,
            ammo: gameState.ammo,
            weapons: gameState.weapons.slice(), // clone array
            currentWeapon: gameState.currentWeapon,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
            console.error('[SaveSystem] Failed to save:', err);
        }
    }

    /**
     * Load saved game state from localStorage.
     * @returns {object|null} Saved data object, or null if no save exists or data is invalid.
     */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);

            // Validate version
            if (!data || data.version !== SAVE_VERSION) {
                console.warn('[SaveSystem] Incompatible save version, ignoring.');
                return null;
            }

            return data;
        } catch (err) {
            console.error('[SaveSystem] Failed to load:', err);
            return null;
        }
    }

    /**
     * Check whether a saved game exists.
     * @returns {boolean}
     */
    hasSave() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            return data && data.version === SAVE_VERSION;
        } catch {
            return false;
        }
    }

    /**
     * Delete the saved game.
     */
    deleteSave() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.error('[SaveSystem] Failed to delete save:', err);
        }
    }

    /**
     * Get summary info about the save slot for display purposes.
     * @returns {{ episode: number, floor: number, score: number, timestamp: number }|null}
     */
    getSlotInfo() {
        const data = this.load();
        if (!data) return null;

        return {
            episode: data.episode,
            floor: data.floor,
            score: data.score,
            timestamp: data.timestamp,
        };
    }
}
