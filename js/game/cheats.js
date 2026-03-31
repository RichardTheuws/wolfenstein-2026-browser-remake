/**
 * cheats.js — Classic Wolfenstein Cheat Code System
 *
 * Listens for keyboard sequences (Konami-style typed codes) and applies
 * classic Wolfenstein cheat effects. Cheats are a beloved feature of the
 * original game — they're fun, not game-breaking.
 *
 * Supported cheats:
 *   GOD   → Toggle god mode (invincibility)
 *   GUNS  → Give all weapons + max ammo
 *   KEYS  → Give all keys
 *   MAP   → Reveal full minimap (disable fog of war)
 *   FPS   → Toggle FPS counter overlay
 */

import { eventBus } from '../engine/event-bus.js';

/** Maximum key buffer length */
const BUFFER_SIZE = 10;

/** How long the cheat notification stays visible (ms) */
const NOTIFY_DURATION = 2000;

/** All cheat codes and their definitions */
const CHEAT_CODES = [
    { code: 'GOD',  name: 'god' },
    { code: 'GUNS', name: 'guns' },
    { code: 'KEYS', name: 'keys' },
    { code: 'MAP',  name: 'map' },
    { code: 'FPS',  name: 'fps' },
];

export class CheatSystem {
    /**
     * @param {import('./game-state.js').GameState} gameState
     * @param {import('../engine/input.js').InputManager} inputManager
     */
    constructor(gameState, inputManager) {
        /** @type {import('./game-state.js').GameState} */
        this._gameState = gameState;

        /** @type {import('../engine/input.js').InputManager} */
        this._input = inputManager;

        /** @type {string[]} Rolling buffer of last N key characters */
        this._buffer = [];

        /** @type {HTMLElement|null} Notification element */
        this._notifyEl = null;

        /** @type {number} Notification hide timer */
        this._notifyTimer = 0;

        /** @type {HTMLElement|null} FPS counter element */
        this._fpsEl = null;

        /** @type {boolean} Whether FPS counter is visible */
        this._fpsVisible = false;

        /** @type {number} FPS frame counter */
        this._fpsFrameCount = 0;

        /** @type {number} FPS timer accumulator */
        this._fpsTimer = 0;

        /** @type {boolean} Whether god mode is active */
        this.godMode = false;

        // Listen to raw keydown events for cheat detection
        this._onKeyDown = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._onKeyDown);
    }

    /**
     * Update FPS counter. Call from game loop with delta time.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this._fpsVisible) return;

        this._fpsFrameCount++;
        this._fpsTimer += dt;

        if (this._fpsTimer >= 1.0) {
            if (this._fpsEl) {
                this._fpsEl.textContent = `${this._fpsFrameCount} FPS`;
            }
            this._fpsFrameCount = 0;
            this._fpsTimer = 0;
        }
    }

    /**
     * Clean up event listeners and DOM elements.
     */
    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        if (this._notifyEl && this._notifyEl.parentNode) {
            this._notifyEl.parentNode.removeChild(this._notifyEl);
        }
        if (this._fpsEl && this._fpsEl.parentNode) {
            this._fpsEl.parentNode.removeChild(this._fpsEl);
        }
    }

    // ── Internal ────────────────────────────────────────────────────

    /**
     * Handle raw keydown events for cheat code detection.
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
        // Only capture single letter keys (A-Z)
        if (e.key.length !== 1) return;

        const char = e.key.toUpperCase();
        if (char < 'A' || char > 'Z') return;

        // Append to rolling buffer
        this._buffer.push(char);
        if (this._buffer.length > BUFFER_SIZE) {
            this._buffer.shift();
        }

        // Check if any cheat code matches the end of the buffer
        const bufferStr = this._buffer.join('');

        for (const cheat of CHEAT_CODES) {
            if (bufferStr.endsWith(cheat.code)) {
                this._activateCheat(cheat.name);
                this._buffer = []; // Clear buffer after activation
                break;
            }
        }
    }

    /**
     * Activate a cheat by name.
     * @param {string} name
     */
    _activateCheat(name) {
        // Play pickup_treasure SFX for that satisfying cheat sound
        eventBus.emit('cheat:activated', { name });

        switch (name) {
            case 'god':
                this._toggleGodMode();
                break;
            case 'guns':
                this._giveAllWeapons();
                break;
            case 'keys':
                this._giveAllKeys();
                break;
            case 'map':
                this._revealMap();
                break;
            case 'fps':
                this._toggleFPS();
                break;
        }
    }

    /**
     * Toggle god mode (invincibility).
     */
    _toggleGodMode() {
        this.godMode = !this.godMode;
        this._gameState.godMode = this.godMode;

        if (this.godMode) {
            // Full health when activating
            this._gameState.health = 100;
            this._showNotification('GOD MODE ON', '#FFD700');
        } else {
            this._showNotification('GOD MODE OFF', '#FF6B6B');
        }

        // Update the BJ face in HUD — event triggers HUD refresh
        eventBus.emit('cheat:godmode', { active: this.godMode });
    }

    /**
     * Give all weapons and max ammo.
     */
    _giveAllWeapons() {
        this._gameState.addWeapon(2); // MP40
        this._gameState.addWeapon(3); // Chaingun
        this._gameState.ammo = 99;
        this._showNotification('ALL WEAPONS', '#00CCFF');

        // Switch to the best weapon
        eventBus.emit('cheat:weapons');
    }

    /**
     * Give all keys.
     */
    _giveAllKeys() {
        this._gameState.addKey('gold');
        this._gameState.addKey('silver');
        this._showNotification('ALL KEYS', '#FFD700');
    }

    /**
     * Reveal the full minimap (disable fog of war).
     */
    _revealMap() {
        eventBus.emit('cheat:fullmap');
        this._showNotification('FULL MAP', '#00FF80');
    }

    /**
     * Toggle FPS counter display.
     */
    _toggleFPS() {
        this._fpsVisible = !this._fpsVisible;

        if (this._fpsVisible) {
            this._createFPSElement();
            this._fpsEl.style.display = 'block';
            this._fpsFrameCount = 0;
            this._fpsTimer = 0;
            this._showNotification('FPS ON', '#AAAAAA');
        } else {
            if (this._fpsEl) {
                this._fpsEl.style.display = 'none';
            }
            this._showNotification('FPS OFF', '#AAAAAA');
        }
    }

    /**
     * Create the FPS counter DOM element (lazily).
     */
    _createFPSElement() {
        if (this._fpsEl) return;

        this._fpsEl = document.createElement('div');
        this._fpsEl.id = 'fps-counter';
        this._fpsEl.style.cssText = `
            position: fixed;
            top: 8px;
            left: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            color: #FFFFFF;
            background: rgba(0, 0, 0, 0.5);
            padding: 4px 8px;
            border-radius: 3px;
            z-index: 100;
            pointer-events: none;
            text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.8);
        `;
        this._fpsEl.textContent = '-- FPS';
        document.body.appendChild(this._fpsEl);
    }

    /**
     * Show a brief cheat activation notification.
     * @param {string} text - Notification text
     * @param {string} color - CSS color for the text
     */
    _showNotification(text, color) {
        if (!this._notifyEl) {
            this._notifyEl = document.createElement('div');
            this._notifyEl.id = 'cheat-notify';
            this._notifyEl.style.cssText = `
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                font-family: 'Press Start 2P', 'Courier New', monospace;
                font-size: clamp(1rem, 3vw, 1.6rem);
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                z-index: 200;
                pointer-events: none;
                text-align: center;
                opacity: 0;
                transition: opacity 0.15s ease-in;
            `;
            document.body.appendChild(this._notifyEl);
        }

        this._notifyEl.textContent = text;
        this._notifyEl.style.color = color;
        this._notifyEl.style.textShadow = `0 0 15px ${color}, 0 0 30px ${color}, 2px 2px 0 rgba(0,0,0,0.9)`;
        this._notifyEl.style.opacity = '1';

        // Clear previous timer
        if (this._notifyTimer) clearTimeout(this._notifyTimer);

        this._notifyTimer = setTimeout(() => {
            if (this._notifyEl) {
                this._notifyEl.style.transition = 'opacity 0.5s ease-out';
                this._notifyEl.style.opacity = '0';
                setTimeout(() => {
                    if (this._notifyEl) {
                        this._notifyEl.style.transition = 'opacity 0.15s ease-in';
                    }
                }, 500);
            }
        }, NOTIFY_DURATION);
    }
}
