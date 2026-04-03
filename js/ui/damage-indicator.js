/**
 * damage-indicator.js — Screen effects for damage feedback
 *
 * Creates HTML overlay elements for:
 * - Red vignette on damage taken
 * - Colored flash on item pickup
 * - Persistent pulsing warning at low health
 * - Death screen (red → black + GAME OVER)
 *
 * Listens to eventBus for 'player:damage', 'pickup:collect', 'player:death'.
 */

import { eventBus } from '../engine/event-bus.js';

/** Map pickup types to flash colors */
const PICKUP_COLORS = {
    health:   'rgba(64, 160, 64, 0.20)',   // green
    ammo:     'rgba(200, 192, 48, 0.20)',   // yellow
    key:      'rgba(218, 165, 32, 0.20)',   // gold
    treasure: 'rgba(255, 255, 255, 0.20)',  // white
};

export class DamageIndicator {
    /**
     * @param {import('../game/game-state.js').GameState} [gameState] - Optional game state for death screen info
     */
    constructor(gameState) {
        /** @type {import('../game/game-state.js').GameState|null} */
        this._gameState = gameState || null;

        /** @type {string} Last enemy type that killed the player */
        this._lastKillerType = 'unknown';
        // --- Damage vignette overlay ---
        this._damageOverlay = document.createElement('div');
        this._damageOverlay.id = 'damage-overlay';
        document.body.appendChild(this._damageOverlay);

        // --- Pickup flash overlay ---
        this._pickupFlash = document.createElement('div');
        this._pickupFlash.id = 'pickup-flash';
        document.body.appendChild(this._pickupFlash);

        // --- Internal state ---
        /** @type {number} Current damage overlay opacity (0-1) */
        this._damageOpacity = 0;

        /** @type {number} Current pickup flash opacity (0-1) */
        this._pickupOpacity = 0;

        /** @type {boolean} Low health warning active */
        this._lowHealth = false;

        /** @type {boolean} Death sequence active */
        this._deathActive = false;

        /** @type {number} Death sequence timer (seconds elapsed) */
        this._deathTimer = 0;

        /** @type {boolean} Is this a final death (no lives remaining) */
        this._deathIsFinal = false;

        // --- Bind event listeners ---
        this._onDamage = (data) => {
            const amount = (typeof data === 'number') ? data : (data?.amount ?? 10);
            this.showDamage(amount);
        };

        this._onPickup = (data) => {
            const effect = data?.effect ?? 'health';
            const color = PICKUP_COLORS[effect] || PICKUP_COLORS.health;
            this.showPickupFlash(color);
        };

        this._onDeath = (data) => {
            const isFinal = data?.livesRemaining !== undefined ? data.livesRemaining <= 0 : true;
            this._lastKillerType = data?.killerType || 'unknown';
            this.showDeath(isFinal);
        };

        eventBus.on('player:damage', this._onDamage);
        eventBus.on('pickup:collect', this._onPickup);
        eventBus.on('player:death', this._onDeath);
    }

    /**
     * Show red vignette proportional to damage taken.
     * @param {number} amount - Damage points (e.g. 5-50)
     */
    showDamage(amount) {
        if (this._deathActive) return;

        // Map damage to opacity: 5 dmg → 0.15, 15 dmg → 0.45, cap at 0.8
        const targetOpacity = Math.min(amount * 0.03, 0.8);
        this._damageOpacity = Math.max(this._damageOpacity, targetOpacity);

        this._damageOverlay.style.background =
            `radial-gradient(ellipse at center, transparent 40%, rgba(139, 0, 0, ${this._damageOpacity}) 100%)`;
        this._damageOverlay.style.opacity = '1';

        // CSS transition handles the fade-out; we kick it off after a frame
        this._damageOverlay.classList.remove('damage-fade');
        void this._damageOverlay.offsetHeight;
        this._damageOverlay.classList.add('damage-fade');
    }

    /**
     * Brief colored flash overlay for item pickups.
     * @param {string} color - CSS rgba color string
     */
    showPickupFlash(color) {
        if (this._deathActive) return;

        this._pickupFlash.style.background = color;
        this._pickupFlash.style.opacity = '1';

        this._pickupFlash.classList.remove('pickup-fade');
        void this._pickupFlash.offsetHeight;
        this._pickupFlash.classList.add('pickup-fade');
    }

    /**
     * Toggle persistent low-health pulsing vignette.
     * @param {boolean} isLow
     */
    setLowHealth(isLow) {
        if (isLow === this._lowHealth) return;
        this._lowHealth = isLow;

        if (isLow) {
            this._damageOverlay.classList.add('low-health-pulse');
        } else {
            this._damageOverlay.classList.remove('low-health-pulse');
            // Reset inline background if no active damage flash
            if (this._damageOpacity <= 0) {
                this._damageOverlay.style.background = '';
                this._damageOverlay.style.opacity = '0';
            }
        }
    }

    /**
     * Death screen effect. Red flash → fade to black → optional GAME OVER.
     * @param {boolean} isFinal - True if no lives remain (show GAME OVER)
     */
    showDeath(isFinal) {
        this._deathActive = true;
        this._deathIsFinal = isFinal;
        this._deathTimer = 0;

        // Remove any ongoing effects
        this._damageOverlay.classList.remove('low-health-pulse', 'damage-fade');
        this._pickupFlash.classList.remove('pickup-fade');
        this._pickupFlash.style.opacity = '0';

        // Immediate red flash
        this._damageOverlay.style.background = 'rgba(139, 0, 0, 0.7)';
        this._damageOverlay.style.opacity = '1';
        this._damageOverlay.style.transition = 'none';

        if (isFinal) {
            // Fade from red to black over 1s, then show GAME OVER
            requestAnimationFrame(() => {
                this._damageOverlay.style.transition = 'background 1s ease-in';
                this._damageOverlay.style.background = 'rgba(0, 0, 0, 0.95)';
            });

            // Show GAME OVER text after the fade
            setTimeout(() => {
                this._showGameOverText();
            }, 1100);
        } else {
            // Brief red flash then fade out (player has lives left)
            requestAnimationFrame(() => {
                this._damageOverlay.style.transition = 'opacity 0.6s ease-out';
                this._damageOverlay.style.opacity = '0';
            });

            setTimeout(() => {
                this._deathActive = false;
                this._damageOverlay.style.transition = '';
                this._damageOverlay.style.background = '';
            }, 700);
        }
    }

    /**
     * Create and display the GAME OVER text element with background image.
     * @private
     */
    _showGameOverText() {
        // Avoid duplicates
        const existing = document.getElementById('game-over-screen');
        if (existing) existing.remove();
        const existingText = document.getElementById('game-over-text');
        if (existingText) existingText.remove();

        // Background image container
        const screen = document.createElement('div');
        screen.id = 'game-over-screen';
        screen.style.cssText = `
            position: fixed;
            inset: 0;
            background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.7) 100%),
                        url('assets/ui/screens/game_over.jpg') center/cover no-repeat;
            background-color: rgba(0, 0, 0, 0.95);
            z-index: 5;
            opacity: 0;
            transition: opacity 1.2s ease-in;
            pointer-events: none;
        `;
        document.body.appendChild(screen);

        // GAME OVER text
        const text = document.createElement('div');
        text.id = 'game-over-text';
        text.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Trebuchet MS', 'Arial Black', Impact, sans-serif;
            text-align: center;
            z-index: 6;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.8s ease-in;
        `;

        // Build death info from game state
        const killerName = this._lastKillerType !== 'unknown'
            ? this._lastKillerType.replace(/_/g, ' ').toUpperCase()
            : '';
        const score = this._gameState ? this._gameState.score.toLocaleString() : '0';
        const floor = this._gameState ? this._gameState.currentFloor : '?';

        text.innerHTML = `
            <div style="
                font-size: clamp(2rem, 8vw, 5rem);
                font-weight: 900;
                color: #8b0000;
                text-transform: uppercase;
                letter-spacing: 0.3em;
                text-shadow: 0 0 40px rgba(139, 0, 0, 0.6), 0 0 80px rgba(139, 0, 0, 0.3);
                margin-bottom: 24px;
            ">GAME OVER</div>
            ${killerName ? `<div style="
                font-size: clamp(0.7rem, 2vw, 1.1rem);
                color: #cc4444;
                letter-spacing: 0.15em;
                margin-bottom: 16px;
            ">KILLED BY ${killerName}</div>` : ''}
            <div style="
                font-size: clamp(0.6rem, 1.5vw, 0.9rem);
                color: #aaa;
                letter-spacing: 0.1em;
                line-height: 1.8;
            ">SCORE: <span style="color: #f0c040;">${score}</span> &nbsp;&bull;&nbsp; FLOOR: <span style="color: #f0c040;">${floor}</span></div>
            <div style="
                margin-top: 40px;
                font-size: clamp(0.5rem, 1.2vw, 0.7rem);
                color: #666;
                letter-spacing: 0.15em;
                animation: gameOverBlink 1.5s ease-in-out infinite;
            ">PRESS ANY KEY TO CONTINUE</div>
            <style>@keyframes gameOverBlink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }</style>
        `;

        document.body.appendChild(text);

        // Fade in background first, then text
        requestAnimationFrame(() => {
            screen.style.opacity = '1';
            setTimeout(() => {
                text.style.opacity = '1';
            }, 400);
        });
    }

    /**
     * Called each frame for manual animation updates (if needed).
     * Currently CSS handles all fade timings, but this hook is available
     * for future use (e.g., frame-synced effects).
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Decay damage opacity for tracking purposes
        if (this._damageOpacity > 0 && !this._deathActive) {
            this._damageOpacity = Math.max(0, this._damageOpacity - deltaTime * 2);
        }
    }

    /**
     * Reset visual state without destroying the component.
     * Clears game over screen, damage overlay, and death state.
     */
    reset() {
        this._deathActive = false;
        this._damageOpacity = 0;
        this._damageOverlay.style.background = 'transparent';
        this._damageOverlay.style.opacity = '0';
        this._damageOverlay.classList.remove('low-health-pulse', 'damage-fade');
        this._pickupFlash.classList.remove('pickup-fade');

        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.remove();
        const gameOverText = document.getElementById('game-over-text');
        if (gameOverText) gameOverText.remove();
    }

    /**
     * Clean up DOM elements and event listeners.
     */
    dispose() {
        eventBus.off('player:damage', this._onDamage);
        eventBus.off('pickup:collect', this._onPickup);
        eventBus.off('player:death', this._onDeath);

        // Remove low health pulse
        this._damageOverlay.classList.remove('low-health-pulse', 'damage-fade');
        this._pickupFlash.classList.remove('pickup-fade');

        // Remove GAME OVER screen and text if present
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.remove();
        const gameOverText = document.getElementById('game-over-text');
        if (gameOverText) gameOverText.remove();

        // Remove overlay elements
        if (this._damageOverlay.parentNode) {
            this._damageOverlay.parentNode.removeChild(this._damageOverlay);
        }
        if (this._pickupFlash.parentNode) {
            this._pickupFlash.parentNode.removeChild(this._pickupFlash);
        }

        this._damageOverlay = null;
        this._pickupFlash = null;
    }
}
