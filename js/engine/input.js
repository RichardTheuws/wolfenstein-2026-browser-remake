/**
 * input.js — Keyboard & Mouse Input Manager
 *
 * Tracks keyboard state (down/pressed), mouse movement via Pointer Lock API,
 * and provides per-frame delta queries. Call resetFrameState() each frame
 * after processing input.
 */

export class InputManager {
    /**
     * @param {HTMLElement} canvas - Element to attach pointer lock to
     */
    constructor(canvas) {
        /** @type {HTMLElement} */
        this._canvas = canvas;

        /** Keys currently held down */
        this._keysDown = new Map();

        /** Keys pressed this frame (rising edge) */
        this._keysPressed = new Map();

        /** Keys released this frame (falling edge) */
        this._keysReleased = new Map();

        /** Accumulated mouse movement this frame */
        this._mouseDeltaX = 0;
        this._mouseDeltaY = 0;

        /** Mouse sensitivity multiplier */
        this.mouseSensitivity = 0.002;

        /** Whether pointer lock is currently active */
        this._pointerLocked = false;

        /** Whether the device is likely mobile/touch */
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        // ── Mobile input state ────────────────────────────────────────
        /** Mobile joystick movement vector (-1..1 each axis) */
        this._mobileMove = { x: 0, z: 0 };

        /** Accumulated mobile look delta (added to mouse delta) */
        this._mobileLookDelta = 0;

        /** Whether mobile fire is held */
        this._mobileFire = false;

        /** Whether mobile interact was tapped this frame */
        this._mobileInteract = false;

        // Bind event handlers
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onPointerLockChange = this._handlePointerLockChange.bind(this);

        // Attach listeners
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }

    /**
     * Check if a key is currently held down.
     * @param {string} code - KeyboardEvent.code (e.g. 'KeyW', 'ShiftLeft')
     * @returns {boolean}
     */
    isKeyDown(code) {
        return this._keysDown.has(code);
    }

    /**
     * Check if a key was pressed this frame (rising edge, not held).
     * @param {string} code - KeyboardEvent.code
     * @returns {boolean}
     */
    isKeyPressed(code) {
        return this._keysPressed.has(code);
    }

    /**
     * Check if a key was released this frame.
     * @param {string} code - KeyboardEvent.code
     * @returns {boolean}
     */
    isKeyReleased(code) {
        return this._keysReleased.has(code);
    }

    /**
     * Get accumulated mouse movement since last frame reset.
     * Values are already scaled by mouseSensitivity.
     * On mobile, includes accumulated touch-look delta.
     * @returns {{ x: number, y: number }}
     */
    getMouseDelta() {
        return {
            x: this._mouseDeltaX * this.mouseSensitivity + this._mobileLookDelta,
            y: this._mouseDeltaY * this.mouseSensitivity,
        };
    }

    /**
     * Get raw (unscaled) mouse delta for this frame.
     * @returns {{ x: number, y: number }}
     */
    getRawMouseDelta() {
        return {
            x: this._mouseDeltaX,
            y: this._mouseDeltaY,
        };
    }

    /**
     * Request pointer lock on the canvas element.
     */
    requestPointerLock() {
        this._canvas.requestPointerLock();
    }

    /**
     * Exit pointer lock.
     */
    exitPointerLock() {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Whether pointer lock is currently active.
     * @returns {boolean}
     */
    get isPointerLocked() {
        return this._pointerLocked;
    }

    // ── Mobile Input Methods ──────────────────────────────────────────

    /**
     * Set mobile joystick movement vector (called by MobileControls each frame).
     * @param {number} x - Horizontal: -1 = left, +1 = right
     * @param {number} z - Vertical: -1 = forward, +1 = backward
     */
    setMobileMove(x, z) {
        this._mobileMove.x = x;
        this._mobileMove.z = z;
    }

    /**
     * Add mobile look rotation delta (called by MobileControls on touch move).
     * Accumulated like mouse delta and consumed at frame reset.
     * @param {number} dx - Horizontal rotation delta (pre-scaled)
     */
    setMobileLook(dx) {
        this._mobileLookDelta += dx;
    }

    /**
     * Set mobile fire button state (called by MobileControls each frame).
     * @param {boolean} held - Whether fire button is held down
     */
    setMobileFire(held) {
        this._mobileFire = held;
    }

    /**
     * Set mobile interact flag for this frame (called by MobileControls on tap).
     */
    setMobileInteract() {
        this._mobileInteract = true;
    }

    /**
     * Get mobile joystick movement vector.
     * @returns {{ x: number, z: number }}
     */
    getMobileMove() {
        return { x: this._mobileMove.x, z: this._mobileMove.z };
    }

    /**
     * Whether mobile fire is currently held.
     * @returns {boolean}
     */
    isMobileFireHeld() {
        return this._mobileFire;
    }

    /**
     * Whether mobile interact was tapped this frame.
     * @returns {boolean}
     */
    isMobileInteract() {
        return this._mobileInteract;
    }

    /**
     * Reset per-frame transient state. Call at the END of each game loop tick.
     */
    resetFrameState() {
        this._keysPressed.clear();
        this._keysReleased.clear();
        this._mouseDeltaX = 0;
        this._mouseDeltaY = 0;
        this._mobileLookDelta = 0;
        this._mobileInteract = false;
    }

    /**
     * Clean up all event listeners. Call when destroying the input system.
     */
    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        this.exitPointerLock();
    }

    // ── Internal handlers ──────────────────────────────────────────────

    /** @param {KeyboardEvent} e */
    _handleKeyDown(e) {
        // Prevent default for game-relevant keys
        if (this._isGameKey(e.code)) {
            e.preventDefault();
        }

        // Only register pressed if it wasn't already down (avoids key repeat)
        if (!this._keysDown.has(e.code)) {
            this._keysPressed.set(e.code, true);
        }
        this._keysDown.set(e.code, true);
    }

    /** @param {KeyboardEvent} e */
    _handleKeyUp(e) {
        this._keysDown.delete(e.code);
        this._keysReleased.set(e.code, true);
    }

    /** @param {MouseEvent} e */
    _handleMouseMove(e) {
        if (!this._pointerLocked) return;
        this._mouseDeltaX += e.movementX;
        this._mouseDeltaY += e.movementY;
    }

    _handlePointerLockChange() {
        this._pointerLocked = document.pointerLockElement === this._canvas;
    }

    /**
     * Keys that should have their default browser behavior suppressed.
     * @param {string} code
     * @returns {boolean}
     */
    _isGameKey(code) {
        return (
            code.startsWith('Key') ||
            code.startsWith('Arrow') ||
            code === 'Space' ||
            code === 'ShiftLeft' ||
            code === 'ShiftRight' ||
            code === 'Tab' ||
            code === 'ControlLeft' ||
            code === 'ControlRight'
        );
    }
}
