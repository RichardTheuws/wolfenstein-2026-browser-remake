/**
 * level-exit.js — Level Exit Detection & End-of-Level Stats
 *
 * Detects when the player reaches the level exit and handles
 * progression: stops movement, shows stats overlay, advances floor.
 */

import { eventBus } from '../engine/event-bus.js';

/** Distance threshold to trigger exit (in world units) */
const EXIT_TRIGGER_RANGE = 1.5;

/** Bonus points for achieving 100% in a stat category */
const PERFECT_BONUS = 10000;

/** Auto-advance delay in milliseconds */
const AUTO_ADVANCE_DELAY = 15000;

export class LevelExit {
    /**
     * @param {import('./game-state.js').GameState} gameState
     * @param {import('./player-controller.js').PlayerController} playerController
     * @param {import('../audio/audio-manager.js').AudioManager} audioManager
     */
    constructor(gameState, playerController, audioManager) {
        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** @type {import('./player-controller.js').PlayerController} */
        this._player = playerController;

        /** @type {import('../audio/audio-manager.js').AudioManager} */
        this._audioManager = audioManager;

        /** @type {{ x: number, z: number } | null} */
        this._exitPosition = null;

        /** @type {boolean} Whether the exit has been triggered this level */
        this._triggered = false;

        /** @type {HTMLElement | null} Stats overlay element */
        this._overlay = null;

        /** @type {number} Auto-advance timer ID */
        this._advanceTimer = 0;

        /** @type {Function | null} Keypress handler reference */
        this._keypressHandler = null;
    }

    /**
     * Set the exit position for the current level.
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     */
    setExit(x, z) {
        this._exitPosition = { x: x + 0.5, z: z + 0.5 }; // Center of cell
        this._triggered = false;
    }

    /**
     * Check each frame if the player has reached the exit.
     * Call this from the game loop.
     * @param {number} _dt - Delta time (unused but kept for consistency)
     */
    update(_dt) {
        if (!this._exitPosition || this._triggered) return;
        if (!this._gameState.isPlaying || this._gameState.isPaused) return;

        const px = this._player.position.x;
        const pz = this._player.position.z;
        const dx = px - this._exitPosition.x;
        const dz = pz - this._exitPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist <= EXIT_TRIGGER_RANGE) {
            this._triggerExit();
        }
    }

    /**
     * Trigger the level exit sequence.
     */
    _triggerExit() {
        this._triggered = true;

        // Freeze player
        this._player.enabled = false;

        // Play victory music
        this._audioManager.crossfadeTo('victory', 1.0);

        // Emit event
        eventBus.emit('level:complete', {
            episode: this._gameState.currentEpisode,
            floor: this._gameState.currentFloor,
            stats: this._gameState.getLevelStats(),
        });

        // Show stats overlay
        this._showStatsScreen();
    }

    /**
     * Create and display the end-of-level stats overlay.
     */
    _showStatsScreen() {
        const stats = this._gameState.getLevelStats();
        const floor = this._gameState.currentFloor;

        // Create overlay container with victory background
        this._overlay = document.createElement('div');
        this._overlay.id = 'level-stats-overlay';
        Object.assign(this._overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.8) 100%), url("assets/ui/screens/victory.jpg") center/cover no-repeat',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: '9999',
            fontFamily: '"Press Start 2P", "Courier New", monospace',
            color: '#fff',
        });

        // Calculate bonus points
        const killBonus = stats.killPercent === 100 ? PERFECT_BONUS : 0;
        const secretBonus = stats.secretPercent === 100 ? PERFECT_BONUS : 0;
        const treasureBonus = stats.treasurePercent === 100 ? PERFECT_BONUS : 0;

        // Under par time bonus: +500 per second remaining
        let parTimeBonus = 0;
        if (stats.underPar && stats.parTime > 0) {
            const secondsRemaining = Math.floor(stats.parTime - stats.time);
            parTimeBonus = secondsRemaining * 500;
        }

        const totalBonus = killBonus + secretBonus + treasureBonus + parTimeBonus;

        // Format time
        const minutes = Math.floor(stats.time / 60);
        const seconds = Math.floor(stats.time % 60);
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        let parStr = '';
        if (stats.parTime > 0) {
            const parMin = Math.floor(stats.parTime / 60);
            const parSec = Math.floor(stats.parTime % 60);
            parStr = `${String(parMin).padStart(2, '0')}:${String(parSec).padStart(2, '0')}`;
        }

        // Build stats card
        const card = document.createElement('div');
        Object.assign(card.style, {
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
            border: '3px solid #c0392b',
            borderRadius: '8px',
            padding: '40px 60px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 0 40px rgba(192, 57, 43, 0.4)',
        });

        card.innerHTML = `
            <h2 style="
                color: #c0392b;
                font-size: 24px;
                margin: 0 0 8px 0;
                text-transform: uppercase;
                letter-spacing: 3px;
            ">Floor ${floor} Complete</h2>
            <div style="
                width: 80%;
                height: 2px;
                background: #c0392b;
                margin: 0 auto 30px;
            "></div>

            <div style="text-align: left; line-height: 2.2;">
                <div class="stat-row" style="display: flex; justify-content: space-between;">
                    <span style="color: #bdc3c7;">Kill Ratio</span>
                    <span class="stat-value" data-target="${stats.killPercent}" style="color: #e74c3c; font-weight: bold;">0%</span>
                </div>
                <div class="stat-row" style="display: flex; justify-content: space-between;">
                    <span style="color: #bdc3c7;">Secret Ratio</span>
                    <span class="stat-value" data-target="${stats.secretPercent}" style="color: #f39c12; font-weight: bold;">0%</span>
                </div>
                <div class="stat-row" style="display: flex; justify-content: space-between;">
                    <span style="color: #bdc3c7;">Treasure Ratio</span>
                    <span class="stat-value" data-target="${stats.treasurePercent}" style="color: #2ecc71; font-weight: bold;">0%</span>
                </div>
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <span style="color: #bdc3c7;">Time</span>
                    <span style="color: #3498db; font-weight: bold;">${timeStr}${parStr ? ` <span style="color: #7f8c8d; font-size: 10px;">(par ${parStr})</span>` : ''}</span>
                </div>
                ${stats.underPar ? `
                <div style="text-align: center; color: #2ecc71; margin-top: 5px; font-size: 10px;">
                    UNDER PAR!
                </div>` : ''}
            </div>

            ${totalBonus > 0 ? `
            <div style="
                margin-top: 20px;
                padding: 10px;
                border: 1px solid #f39c12;
                border-radius: 4px;
                color: #f39c12;
                font-size: 12px;
            ">
                ${killBonus ? '<div>100% KILLS BONUS +10,000</div>' : ''}
                ${secretBonus ? '<div>100% SECRETS BONUS +10,000</div>' : ''}
                ${treasureBonus ? '<div>100% TREASURE BONUS +10,000</div>' : ''}
                ${parTimeBonus ? `<div>UNDER PAR BONUS +${parTimeBonus.toLocaleString()}</div>` : ''}
            </div>` : ''}

            <div style="
                margin-top: 30px;
                color: #7f8c8d;
                font-size: 10px;
                animation: blink 1.2s ease-in-out infinite;
            ">Press any key to continue</div>
        `;

        this._overlay.appendChild(card);
        document.body.appendChild(this._overlay);

        // Add blink animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
        `;
        this._overlay.appendChild(style);

        // Award bonus points
        if (totalBonus > 0) {
            this._gameState.addScore(totalBonus);
        }

        // Tally animation: count up stat percentages
        this._animateStats();

        // Exit pointer lock so the player can see the stats screen cursor-free
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Listen for keypress OR click to advance (delayed to prevent accidental skip)
        setTimeout(() => {
            this._keypressHandler = (e) => {
                if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
                this._advance();
            };
            this._clickHandler = () => this._advance();
            document.addEventListener('keydown', this._keypressHandler);
            document.addEventListener('click', this._clickHandler);
        }, 1000);

        // Auto-advance after delay
        this._advanceTimer = setTimeout(() => this._advance(), AUTO_ADVANCE_DELAY);
    }

    /**
     * Animate stat values counting up from 0 to their target.
     */
    _animateStats() {
        if (!this._overlay) return;

        const statValues = this._overlay.querySelectorAll('.stat-value');
        const duration = 1500; // ms
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out curve
            const eased = 1 - Math.pow(1 - progress, 3);

            statValues.forEach((el) => {
                const target = parseInt(el.dataset.target, 10) || 0;
                const current = Math.round(target * eased);
                el.textContent = `${current}%`;
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Advance to the next floor. Cleans up the stats overlay and emits event.
     */
    _advance() {
        // Prevent double-advance
        if (this._advancing) return;
        this._advancing = true;

        // Clean up
        if (this._advanceTimer) {
            clearTimeout(this._advanceTimer);
            this._advanceTimer = 0;
        }
        if (this._keypressHandler) {
            document.removeEventListener('keydown', this._keypressHandler);
            this._keypressHandler = null;
        }
        if (this._clickHandler) {
            document.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
        }
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }

        // Advance floor in game state (skip floors 5-9, jump to boss on floor 10)
        // Bonus episode (7) has 2 regular levels before the boss
        const currentFloor = this._gameState.currentFloor;
        const bossThreshold = this._gameState.currentEpisode === 7 ? 2 : 4;
        this._gameState.currentFloor = currentFloor >= bossThreshold ? 10 : currentFloor + 1;

        // Emit advance event for main.js to handle level loading
        eventBus.emit('level:advance', {
            episode: this._gameState.currentEpisode,
            floor: this._gameState.currentFloor,
        });
    }

    /**
     * Reset for a new level (call when loading a new floor).
     */
    reset() {
        this._triggered = false;
        this._advancing = false;
        this._exitPosition = null;
        this._cleanup();
    }

    /**
     * Internal cleanup of overlay and timers.
     */
    _cleanup() {
        if (this._advanceTimer) {
            clearTimeout(this._advanceTimer);
            this._advanceTimer = 0;
        }
        if (this._keypressHandler) {
            document.removeEventListener('keydown', this._keypressHandler);
            this._keypressHandler = null;
        }
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }

    /**
     * Clean up all resources.
     */
    dispose() {
        this._cleanup();
    }
}
