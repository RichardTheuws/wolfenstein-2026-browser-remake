/**
 * mobile-controls.js — Full Mobile Touch Control System
 *
 * Virtual joystick (left side) for movement, touch-look (right side) for
 * rotation, and action buttons (fire, weapon switch, interact).
 * Only activates on touch devices with screen width < 1024.
 */

/** Dead zone threshold — ignore joystick movements under 10% */
const DEAD_ZONE = 0.1;

/** Look sensitivity multiplier for touch delta */
const LOOK_SENSITIVITY = 0.004;

/** Joystick ring radius in pixels (half of the 120px CSS ring) */
const RING_RADIUS = 60;

/** Knob visual radius for clamping (half of 48px knob) */
const KNOB_RADIUS = 24;

/** Maximum knob travel from center */
const MAX_KNOB_OFFSET = RING_RADIUS - KNOB_RADIUS;

export class MobileControls {
    /**
     * @param {import('../engine/input.js').InputManager} inputManager
     * @param {import('../game/weapon-system.js').WeaponSystem} weaponSystem
     */
    constructor(inputManager, weaponSystem) {
        /** @type {import('../engine/input.js').InputManager} */
        this._input = inputManager;

        /** @type {import('../game/weapon-system.js').WeaponSystem} */
        this._weaponSystem = weaponSystem;

        /** Whether mobile controls are currently active */
        this._enabled = false;

        // ── DOM elements ──────────────────────────────────────────
        this._container = document.getElementById('mobile-controls');
        this._joystickArea = document.getElementById('joystick-area');
        this._joystickKnob = document.getElementById('joystick-knob');
        this._btnFire = document.getElementById('btn-fire');
        this._btnWeaponSwitch = document.getElementById('btn-weapon-switch');
        this._btnInteract = document.getElementById('btn-interact');

        // ── Joystick state ────────────────────────────────────────
        /** Touch identifier tracking the joystick */
        this._joystickTouchId = null;

        /** Center position of the joystick ring when touch started */
        this._joystickCenterX = 0;
        this._joystickCenterY = 0;

        /** Normalized joystick output: -1..1 */
        this._joystickX = 0;
        this._joystickZ = 0;

        // ── Look state ────────────────────────────────────────────
        /** Touch identifier tracking look rotation */
        this._lookTouchId = null;

        /** Previous touch position for delta calculation */
        this._lookPrevX = 0;

        // ── Fire state ────────────────────────────────────────────
        /** Whether fire button is currently held */
        this._fireHeld = false;

        // ── Bind event handlers ───────────────────────────────────
        this._onTouchStart = this._handleTouchStart.bind(this);
        this._onTouchMove = this._handleTouchMove.bind(this);
        this._onTouchEnd = this._handleTouchEnd.bind(this);
        this._onBtnFireStart = this._handleFireStart.bind(this);
        this._onBtnFireEnd = this._handleFireEnd.bind(this);
        this._onBtnWeapon = this._handleWeaponSwitch.bind(this);
        this._onBtnInteract = this._handleInteract.bind(this);
    }

    /**
     * Detect whether the current device should use mobile controls.
     * Checks for touch support AND screen width under 1024px.
     * @returns {boolean}
     */
    static isMobileDevice() {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isNarrow = window.innerWidth < 1024;
        return hasTouch && isNarrow;
    }

    /**
     * Enable mobile controls — show UI and attach touch listeners.
     */
    enable() {
        if (this._enabled) return;
        this._enabled = true;

        // Show the mobile control overlay
        if (this._container) {
            this._container.classList.remove('hidden');
        }

        // Joystick touch events on the entire left area
        if (this._joystickArea) {
            this._joystickArea.addEventListener('touchstart', this._onTouchStart, { passive: false });
            this._joystickArea.addEventListener('touchmove', this._onTouchMove, { passive: false });
            this._joystickArea.addEventListener('touchend', this._onTouchEnd, { passive: false });
            this._joystickArea.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
        }

        // Look control — listen on the entire document for right-side touches
        document.addEventListener('touchstart', this._onLookTouchStart = this._handleLookStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this._onLookTouchMove = this._handleLookMove.bind(this), { passive: false });
        document.addEventListener('touchend', this._onLookTouchEnd = this._handleLookEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this._onLookTouchEnd, { passive: false });

        // Fire button
        if (this._btnFire) {
            this._btnFire.addEventListener('touchstart', this._onBtnFireStart, { passive: false });
            this._btnFire.addEventListener('touchend', this._onBtnFireEnd, { passive: false });
            this._btnFire.addEventListener('touchcancel', this._onBtnFireEnd, { passive: false });
        }

        // Weapon switch button
        if (this._btnWeaponSwitch) {
            this._btnWeaponSwitch.addEventListener('touchstart', this._onBtnWeapon, { passive: false });
        }

        // Interact button
        if (this._btnInteract) {
            this._btnInteract.addEventListener('touchstart', this._onBtnInteract, { passive: false });
        }
    }

    /**
     * Disable mobile controls — hide UI and remove touch listeners.
     */
    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        // Hide the mobile control overlay
        if (this._container) {
            this._container.classList.add('hidden');
        }

        // Remove joystick listeners
        if (this._joystickArea) {
            this._joystickArea.removeEventListener('touchstart', this._onTouchStart);
            this._joystickArea.removeEventListener('touchmove', this._onTouchMove);
            this._joystickArea.removeEventListener('touchend', this._onTouchEnd);
            this._joystickArea.removeEventListener('touchcancel', this._onTouchEnd);
        }

        // Remove look listeners
        if (this._onLookTouchStart) {
            document.removeEventListener('touchstart', this._onLookTouchStart);
            document.removeEventListener('touchmove', this._onLookTouchMove);
            document.removeEventListener('touchend', this._onLookTouchEnd);
            document.removeEventListener('touchcancel', this._onLookTouchEnd);
        }

        // Remove button listeners
        if (this._btnFire) {
            this._btnFire.removeEventListener('touchstart', this._onBtnFireStart);
            this._btnFire.removeEventListener('touchend', this._onBtnFireEnd);
            this._btnFire.removeEventListener('touchcancel', this._onBtnFireEnd);
        }
        if (this._btnWeaponSwitch) {
            this._btnWeaponSwitch.removeEventListener('touchstart', this._onBtnWeapon);
        }
        if (this._btnInteract) {
            this._btnInteract.removeEventListener('touchstart', this._onBtnInteract);
        }

        // Reset state
        this._resetJoystick();
        this._fireHeld = false;
        this._lookTouchId = null;
        this._input.setMobileMove(0, 0);
        this._input.setMobileFire(false);
    }

    /**
     * Per-frame update. Pushes current mobile state into InputManager.
     * Called each frame from the game loop.
     */
    update() {
        if (!this._enabled) return;

        // Push joystick movement into InputManager
        this._input.setMobileMove(this._joystickX, this._joystickZ);

        // Push fire state into InputManager
        this._input.setMobileFire(this._fireHeld);
    }

    /**
     * Clean up all listeners and state.
     */
    dispose() {
        this.disable();
    }

    // ── Joystick Touch Handlers ────────────────────────────────────────

    /**
     * @param {TouchEvent} e
     */
    _handleTouchStart(e) {
        e.preventDefault();

        // Only track one joystick touch at a time
        if (this._joystickTouchId !== null) return;

        const touch = e.changedTouches[0];
        this._joystickTouchId = touch.identifier;

        // Record the center of the joystick ring element
        const rect = this._joystickArea.getBoundingClientRect();
        this._joystickCenterX = rect.left + rect.width / 2;
        this._joystickCenterY = rect.top + rect.height / 2;

        // Process initial position
        this._updateJoystickFromTouch(touch.clientX, touch.clientY);
    }

    /**
     * @param {TouchEvent} e
     */
    _handleTouchMove(e) {
        e.preventDefault();

        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._updateJoystickFromTouch(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    /**
     * @param {TouchEvent} e
     */
    _handleTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._resetJoystick();
                break;
            }
        }
    }

    /**
     * Calculate joystick offset from center, normalize, apply dead zone.
     * @param {number} touchX - Client X position
     * @param {number} touchY - Client Y position
     */
    _updateJoystickFromTouch(touchX, touchY) {
        let dx = touchX - this._joystickCenterX;
        let dy = touchY - this._joystickCenterY;

        // Distance from center
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Normalize to 0..1 range, clamped
        const normalizedDist = Math.min(dist / MAX_KNOB_OFFSET, 1);

        // Direction unit vector
        const angle = Math.atan2(dy, dx);

        // Apply dead zone
        if (normalizedDist < DEAD_ZONE) {
            this._joystickX = 0;
            this._joystickZ = 0;
            this._updateKnobVisual(0, 0);
            return;
        }

        // Remap from [DEAD_ZONE..1] to [0..1] for smooth response
        const remapped = (normalizedDist - DEAD_ZONE) / (1 - DEAD_ZONE);

        // Output: X = horizontal (-1 left, +1 right), Z = vertical (-1 forward, +1 backward)
        this._joystickX = Math.cos(angle) * remapped;
        this._joystickZ = Math.sin(angle) * remapped;

        // Visual: move knob, clamped to ring
        const clampedDist = Math.min(dist, MAX_KNOB_OFFSET);
        const visualX = Math.cos(angle) * clampedDist;
        const visualY = Math.sin(angle) * clampedDist;
        this._updateKnobVisual(visualX, visualY);
    }

    /**
     * Reset joystick to center position.
     */
    _resetJoystick() {
        this._joystickTouchId = null;
        this._joystickX = 0;
        this._joystickZ = 0;
        this._updateKnobVisual(0, 0);
    }

    /**
     * Move the joystick knob element visually.
     * @param {number} x - Pixel offset from center
     * @param {number} y - Pixel offset from center
     */
    _updateKnobVisual(x, y) {
        if (this._joystickKnob) {
            this._joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
        }
    }

    // ── Look Touch Handlers (right side) ───────────────────────────────

    /**
     * Check if a touch target is one of the action buttons.
     * @param {EventTarget} target
     * @returns {boolean}
     */
    _isButtonTouch(target) {
        return (
            target === this._btnFire ||
            target === this._btnWeaponSwitch ||
            target === this._btnInteract ||
            (target && target.closest && (
                target.closest('#btn-fire') ||
                target.closest('#btn-weapon-switch') ||
                target.closest('#btn-interact') ||
                target.closest('#joystick-area')
            ))
        );
    }

    /**
     * @param {TouchEvent} e
     */
    _handleLookStart(e) {
        // Only track one look touch at a time
        if (this._lookTouchId !== null) return;

        for (const touch of e.changedTouches) {
            // Must be on right half of screen AND not on any button
            if (touch.clientX > window.innerWidth / 2 && !this._isButtonTouch(touch.target)) {
                this._lookTouchId = touch.identifier;
                this._lookPrevX = touch.clientX;
                break;
            }
        }
    }

    /**
     * @param {TouchEvent} e
     */
    _handleLookMove(e) {
        if (this._lookTouchId === null) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this._lookTouchId) {
                const dx = touch.clientX - this._lookPrevX;
                this._lookPrevX = touch.clientX;

                // Feed horizontal delta into InputManager as look rotation
                this._input.setMobileLook(dx * LOOK_SENSITIVITY);
                break;
            }
        }
    }

    /**
     * @param {TouchEvent} e
     */
    _handleLookEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._lookTouchId) {
                this._lookTouchId = null;
                break;
            }
        }
    }

    // ── Action Button Handlers ─────────────────────────────────────────

    /**
     * @param {TouchEvent} e
     */
    _handleFireStart(e) {
        e.preventDefault();
        this._fireHeld = true;
    }

    /**
     * @param {TouchEvent} e
     */
    _handleFireEnd(e) {
        e.preventDefault();
        this._fireHeld = false;
    }

    /**
     * @param {TouchEvent} e
     */
    _handleWeaponSwitch(e) {
        e.preventDefault();
        // Cycle to the next weapon
        const current = this._weaponSystem.getCurrentWeapon().index;
        const weapons = this._weaponSystem.getWeaponList();
        const next = (current + 1) % weapons.length;
        this._weaponSystem.switchWeapon(next);
    }

    /**
     * @param {TouchEvent} e
     */
    _handleInteract(e) {
        e.preventDefault();
        // Set mobile interact flag — PlayerController reads this alongside KeyE
        this._input.setMobileInteract();
    }
}
