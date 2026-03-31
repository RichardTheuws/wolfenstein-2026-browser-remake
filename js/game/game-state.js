/**
 * game-state.js — Central Game State
 *
 * Holds all player stats, inventory, level progress, and scoring data.
 * Single source of truth for game state — other systems read/write through this.
 */

import { eventBus } from '../engine/event-bus.js';

/** Valid difficulty levels */
const DIFFICULTIES = ['baby', 'easy', 'medium', 'hard'];

/** Difficulty presets (from original Wolfenstein source code) */
const DIFFICULTY_PRESETS = {
    baby:   { enemyDamageMult: 0.5,  enemySpeedMult: 0.8, enemyCountMult: 0.5 },
    easy:   { enemyDamageMult: 0.75, enemySpeedMult: 0.9, enemyCountMult: 0.75 },
    medium: { enemyDamageMult: 1.0,  enemySpeedMult: 1.0, enemyCountMult: 1.0 },
    hard:   { enemyDamageMult: 1.5,  enemySpeedMult: 1.2, enemyCountMult: 1.5 },
};

export class GameState {
    constructor() {
        // ── Player Stats ────────────────────────────────────────────
        /** @type {number} Current health (0-100) */
        this.health = 100;

        /** @type {number} Remaining lives */
        this.lives = 3;

        /** @type {number} Player score */
        this.score = 0;

        /** @type {number} Current ammo count */
        this.ammo = 8;

        // ── Weapons ─────────────────────────────────────────────────
        /** @type {number} Current weapon index (0=knife, 1=pistol, 2=mp40, 3=chaingun) */
        this.currentWeapon = 1;

        /** @type {boolean[]} Owned weapons (knife + pistol by default) */
        this.weapons = [true, true, false, false];

        // ── Inventory ───────────────────────────────────────────────
        /** @type {string[]} Collected keys (e.g. 'gold', 'silver') */
        this.keys = [];

        // ── Level Progress ──────────────────────────────────────────
        /** @type {number} Current episode (1-6) */
        this.currentEpisode = 1;

        /** @type {number} Current floor/level within episode (1-10) */
        this.currentFloor = 1;

        // ── Difficulty ──────────────────────────────────────────────
        /** @type {'baby'|'easy'|'medium'|'hard'} */
        this.difficulty = 'medium';

        // ── Level Stats (for end-of-level screen) ───────────────────
        /** @type {number} Secrets found this level */
        this.secretsFound = 0;

        /** @type {number} Total secrets in this level */
        this.totalSecrets = 0;

        /** @type {number} Enemies killed this level */
        this.kills = 0;

        /** @type {number} Total enemies in this level */
        this.totalKills = 0;

        /** @type {number} Treasures collected this level */
        this.treasures = 0;

        /** @type {number} Total treasures in this level */
        this.totalTreasures = 0;

        /** @type {number} Level start timestamp (for par time comparison) */
        this.levelStartTime = 0;

        /** @type {number} Par time in seconds for current level */
        this.parTime = 0;

        // ── Game Flags ──────────────────────────────────────────────
        /** @type {boolean} Whether the game is currently running */
        this.isPlaying = false;

        /** @type {boolean} Whether the game is paused */
        this.isPaused = false;

        // ── Cheat Flags ─────────────────────────────────────────────
        /** @type {boolean} God mode (invincibility) — toggled by cheat code */
        this.godMode = false;

        // ── Extra Life Tracking ─────────────────────────────────────
        /** @type {number} Score threshold for next extra life */
        this._nextLifeAt = 40000;
    }

    /**
     * Set the difficulty level.
     * @param {'baby'|'easy'|'medium'|'hard'} difficulty
     */
    setDifficulty(difficulty) {
        if (DIFFICULTIES.includes(difficulty)) {
            this.difficulty = difficulty;
        }
    }

    /**
     * Get the multiplier preset for the current difficulty.
     * @returns {{ enemyDamageMult: number, enemySpeedMult: number, enemyCountMult: number }}
     */
    getDifficultyMultipliers() {
        return DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.medium;
    }

    /**
     * Reset player stats for a new game (keeps difficulty setting).
     */
    newGame() {
        this.health = 100;
        this.lives = 3;
        this.score = 0;
        this.ammo = 8;
        this.keys = [];
        this.currentEpisode = 1;
        this.currentFloor = 1;
        this.currentWeapon = 1;
        this.weapons = [true, true, false, false];
        this.isPlaying = true;
        this.isPaused = false;
        this.godMode = false;
        this._nextLifeAt = 40000;
        this._resetLevelStats();
    }

    /**
     * Initialize stats for a new level. Call after level loads.
     * @param {object} levelInfo
     * @param {number} levelInfo.totalSecrets
     * @param {number} levelInfo.totalKills
     * @param {number} levelInfo.totalTreasures
     * @param {number} [levelInfo.parTime=0] - Par time in seconds
     */
    startLevel(levelInfo) {
        this._resetLevelStats();
        this.totalSecrets = levelInfo.totalSecrets || 0;
        this.totalKills = levelInfo.totalKills || 0;
        this.totalTreasures = levelInfo.totalTreasures || 0;
        this.parTime = levelInfo.parTime || 0;
        this.levelStartTime = performance.now();
        this.keys = []; // Keys don't carry between levels
    }

    /**
     * Apply damage to the player.
     * @param {number} amount - Damage points
     */
    takeDamage(amount) {
        // God mode: invincible — take no damage
        if (this.godMode) return;

        this.health = Math.max(0, this.health - amount);
        eventBus.emit('player:damage', { health: this.health, amount });

        if (this.health <= 0) {
            this.lives--;
            eventBus.emit('player:death', { livesRemaining: this.lives });
        }
    }

    /**
     * Heal the player.
     * @param {number} amount - Heal points
     */
    heal(amount) {
        this.health = Math.min(100, this.health + amount);
    }

    /**
     * Add ammo.
     * @param {number} amount
     */
    addAmmo(amount) {
        this.ammo += amount;
    }

    /**
     * Use ammo.
     * @param {number} [amount=1]
     * @returns {boolean} True if ammo was available and consumed
     */
    useAmmo(amount = 1) {
        if (this.ammo >= amount) {
            this.ammo -= amount;
            return true;
        }
        return false;
    }

    /**
     * Add a key to inventory.
     * @param {string} keyType - 'gold' or 'silver'
     */
    addKey(keyType) {
        if (!this.keys.includes(keyType)) {
            this.keys.push(keyType);
        }
    }

    /**
     * Check if player has a specific key.
     * @param {string} keyType
     * @returns {boolean}
     */
    hasKey(keyType) {
        return this.keys.includes(keyType);
    }

    /**
     * Add to score. Awards extra lives at every 40,000-point threshold.
     * @param {number} points
     */
    addScore(points) {
        const oldScore = this.score;
        this.score += points;

        // Check for extra life threshold(s) — supports gaining multiple lives at once
        while (this.score >= this._nextLifeAt) {
            this.lives++;
            eventBus.emit('player:extralife', { lives: this.lives, threshold: this._nextLifeAt });
            this._nextLifeAt += 40000;
        }
    }

    /**
     * Record a kill.
     */
    recordKill() {
        this.kills++;
    }

    /**
     * Record finding a secret.
     */
    recordSecret() {
        this.secretsFound++;
    }

    /**
     * Record collecting a treasure.
     */
    recordTreasure() {
        this.treasures++;
    }

    /**
     * Get elapsed level time in seconds.
     * @returns {number}
     */
    getLevelTime() {
        if (this.levelStartTime === 0) return 0;
        return (performance.now() - this.levelStartTime) / 1000;
    }

    /**
     * Get end-of-level statistics as percentages.
     * @returns {object}
     */
    getLevelStats() {
        return {
            killPercent: this.totalKills > 0
                ? Math.round((this.kills / this.totalKills) * 100)
                : 0,
            secretPercent: this.totalSecrets > 0
                ? Math.round((this.secretsFound / this.totalSecrets) * 100)
                : 0,
            treasurePercent: this.totalTreasures > 0
                ? Math.round((this.treasures / this.totalTreasures) * 100)
                : 0,
            time: this.getLevelTime(),
            parTime: this.parTime,
            underPar: this.parTime > 0 && this.getLevelTime() <= this.parTime,
        };
    }

    /**
     * Add a weapon to the player's inventory.
     * @param {number} index - Weapon index (0=knife, 1=pistol, 2=mp40, 3=chaingun)
     */
    addWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.weapons[index] = true;
        }
    }

    /**
     * Check if the player owns a weapon.
     * @param {number} index - Weapon index
     * @returns {boolean}
     */
    hasWeapon(index) {
        return !!this.weapons[index];
    }

    /**
     * Switch to a weapon (if owned).
     * @param {number} index - Weapon index
     */
    setCurrentWeapon(index) {
        if (this.hasWeapon(index)) {
            this.currentWeapon = index;
        }
    }

    /**
     * Reset level-specific counters.
     */
    _resetLevelStats() {
        this.secretsFound = 0;
        this.totalSecrets = 0;
        this.kills = 0;
        this.totalKills = 0;
        this.treasures = 0;
        this.totalTreasures = 0;
        this.levelStartTime = 0;
        this.parTime = 0;
    }
}
