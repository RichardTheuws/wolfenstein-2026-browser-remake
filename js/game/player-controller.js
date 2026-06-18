/**
 * player-controller.js — First-Person Player Controller
 *
 * FPS movement: WASD/arrows for movement, mouse for rotation (yaw + pitch).
 * Uses CollisionSystem for wall sliding and InputManager for input.
 */

import * as THREE from 'three';
import { eventBus } from '../engine/event-bus.js';

/** Movement speed in units per second */
const MOVE_SPEED = 5.0;

/** Sprint speed in units per second */
const SPRINT_SPEED = 7.5;

/** Player eye height in world units */
const EYE_HEIGHT = 1.6;

/** Interaction range in world units */
const INTERACT_RANGE = 1.5;

/** Movement responsiveness — higher = snappier start / stop (exp. approach rate) */
const ACCEL_RATE = 14;
const DECEL_RATE = 10;

/** Camera headbob */
const BOB_FREQUENCY = 9.0;    // base oscillation rate (rad/s)
const BOB_AMPLITUDE = 0.045;  // max vertical bob in world units at full speed

/** Sprint FOV kick */
const BASE_FOV = 75;          // must match the camera's default FOV (renderer.js)
const SPRINT_FOV = 82;
const FOV_LERP = 6;

export class PlayerController {
    /**
     * @param {import('../engine/input.js').InputManager} inputManager
     * @param {import('../engine/collision.js').CollisionSystem} collision
     * @param {THREE.PerspectiveCamera} camera
     */
    constructor(inputManager, collision, camera) {
        /** @type {import('../engine/input.js').InputManager} */
        this._input = inputManager;

        /** @type {import('../engine/collision.js').CollisionSystem} */
        this._collision = collision;

        /** @type {THREE.PerspectiveCamera} */
        this._camera = camera;

        /** Player position in world space (feet position) */
        this.position = new THREE.Vector3(0, 0, 0);

        /** Player Y-axis rotation in radians (0 = looking along +X, PI/2 = looking along +Z) */
        this.rotation = 0;

        /** Player vertical look angle in radians (positive = looking up) */
        this.pitch = 0;

        /** Whether the player is currently alive and controllable */
        this.enabled = true;

        /** Screen shake intensity (decays over time) */
        this._shakeIntensity = 0;

        /** How fast shake decays per second */
        this._shakeDecay = 8.0;

        /** Current velocity in LOCAL space (x = strafe, y = forward), units/sec.
         *  Local-space so turning instantly redirects momentum (no world-space drift). */
        this._velocity = new THREE.Vector2(0, 0);

        /** Fraction of sprint speed currently moving at (0..1), for bob + FOV */
        this._speedRatio = 0;

        /** Whether sprint is being held this frame */
        this._isSprinting = false;

        /** Headbob phase accumulator + eased amplitude + current offsets */
        this._bobPhase = 0;
        this._bobAmp = 0;
        this._bobY = 0;
        this._bobX = 0;
    }

    /**
     * Trigger screen shake. Keeps the highest intensity if overlapping.
     * @param {number} intensity - Shake strength (0 = none, 1 = extreme)
     */
    shake(intensity) {
        this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
    }

    /**
     * Set the player spawn position and rotation.
     * @param {number} x - World X
     * @param {number} z - World Z
     * @param {number} [angle=0] - Facing angle in radians
     */
    spawn(x, z, angle = 0) {
        this.position.set(x, 0, z);
        this.rotation = angle;
        this.pitch = 0;
        this._velocity.set(0, 0);
        this._speedRatio = 0;
        this._bobAmp = 0;
        this._bobY = 0;
        this._bobX = 0;
        this._syncCamera();
    }

    /**
     * Update player movement and camera. Call once per frame.
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.enabled) return;

        this._handleRotation();
        this._handleMovement(deltaTime);
        this._updateHeadbob(deltaTime);
        this._handleFov(deltaTime);
        this._handleInteraction();
        this._syncCamera();

        // Decay screen shake
        if (this._shakeIntensity > 0.001) {
            this._shakeIntensity *= Math.max(0, 1 - this._shakeDecay * deltaTime);
        } else {
            this._shakeIntensity = 0;
        }
    }

    /**
     * Get the forward direction vector (on the XZ plane).
     * @returns {THREE.Vector3}
     */
    getForward() {
        return new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            -Math.cos(this.rotation)
        );
    }

    /**
     * Get the right direction vector (on the XZ plane).
     * @returns {THREE.Vector3}
     */
    getRight() {
        return new THREE.Vector3(
            Math.cos(this.rotation),
            0,
            Math.sin(this.rotation)
        );
    }

    // ── Internal ────────────────────────────────────────────────────

    /**
     * Handle mouse-based rotation (yaw + pitch).
     * On mobile, touch-look delta is folded into getMouseDelta() by InputManager.
     */
    _handleRotation() {
        // On desktop require pointer lock; on mobile allow touch-look without it
        const mouseDelta = this._input.getMouseDelta();

        if (!this._input.isPointerLocked && mouseDelta.x === 0 && mouseDelta.y === 0) return;

        // Horizontal rotation (yaw)
        this.rotation += mouseDelta.x; // Positive X = turn right (clockwise)

        // Keep rotation in [0, 2*PI) range
        this.rotation = ((this.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        // Vertical rotation (pitch) — mouse up = look up (negative Y delta)
        this.pitch -= mouseDelta.y;

        // Clamp pitch to prevent flipping (-60 to +60 degrees)
        const MAX_PITCH = Math.PI / 3;
        this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
    }

    /**
     * Handle WASD/arrow key movement with collision.
     * Also reads mobile joystick input when available.
     * @param {number} dt - Delta time in seconds
     */
    _handleMovement(dt) {
        this._isSprinting =
            this._input.isKeyDown('ShiftLeft') || this._input.isKeyDown('ShiftRight');
        const speed = this._isSprinting ? SPRINT_SPEED : MOVE_SPEED;

        // Build raw input vector in local space (x = strafe, z = forward)
        let moveX = 0;
        let moveZ = 0;

        if (this._input.isKeyDown('KeyW') || this._input.isKeyDown('ArrowUp')) moveZ -= 1;
        if (this._input.isKeyDown('KeyS') || this._input.isKeyDown('ArrowDown')) moveZ += 1;
        if (this._input.isKeyDown('KeyA') || this._input.isKeyDown('ArrowLeft')) moveX -= 1;
        if (this._input.isKeyDown('KeyD') || this._input.isKeyDown('ArrowRight')) moveX += 1;

        // Mobile joystick input — add on top of keyboard
        const mobileMove = this._input.getMobileMove();
        moveX += mobileMove.x;
        moveZ += mobileMove.z;

        // Target local velocity (normalized direction × speed; zero when no input)
        let targetX = 0;
        let targetZ = 0;
        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            targetX = (moveX / len) * speed;
            targetZ = (moveZ / len) * speed;
        }

        // Exponentially approach the target — quick to start, slightly slower to stop.
        const hasInput = targetX !== 0 || targetZ !== 0;
        const rate = hasInput ? ACCEL_RATE : DECEL_RATE;
        const t = 1 - Math.exp(-rate * dt);
        this._velocity.x += (targetX - this._velocity.x) * t;
        this._velocity.y += (targetZ - this._velocity.y) * t;

        const vMag = Math.hypot(this._velocity.x, this._velocity.y);
        this._speedRatio = vMag / SPRINT_SPEED;

        // Negligible velocity — snap to rest and skip the move
        if (vMag < 0.001) {
            this._velocity.set(0, 0);
            this._speedRatio = 0;
            return;
        }

        // Transform local velocity to world space using the current rotation
        const sinR = Math.sin(this.rotation);
        const cosR = Math.cos(this.rotation);
        const worldMoveX = (this._velocity.x * cosR - this._velocity.y * sinR) * dt;
        const worldMoveZ = (this._velocity.x * sinR + this._velocity.y * cosR) * dt;

        // Apply collision (wall-slide)
        const currentPos = { x: this.position.x, z: this.position.z };
        const resolved = this._collision.checkMove(currentPos, {
            x: this.position.x + worldMoveX,
            z: this.position.z + worldMoveZ,
        });
        this.position.x = resolved.x;
        this.position.z = resolved.z;

        // Hit a wall head-on — bleed momentum so it doesn't dart sideways on release
        const intended = Math.hypot(worldMoveX, worldMoveZ);
        const actual = Math.hypot(resolved.x - currentPos.x, resolved.z - currentPos.z);
        if (intended > 1e-5 && actual < intended * 0.3) {
            this._velocity.set(0, 0);
        }
    }

    /**
     * Advance the headbob phase and compute the current bob offsets.
     * Amplitude is eased so the bob fades in/out smoothly when starting/stopping.
     * @param {number} dt
     */
    _updateHeadbob(dt) {
        const moving = this._speedRatio > 0.01;
        if (moving) {
            this._bobPhase += dt * BOB_FREQUENCY * (0.6 + this._speedRatio);
        }
        const targetAmp = moving ? this._speedRatio * BOB_AMPLITUDE : 0;
        this._bobAmp += (targetAmp - this._bobAmp) * Math.min(1, dt * 8);
        this._bobY = Math.sin(this._bobPhase * 2) * this._bobAmp;       // vertical, double freq
        this._bobX = Math.sin(this._bobPhase) * this._bobAmp * 0.6;     // lateral sway
    }

    /**
     * Lerp the camera FOV toward a slightly wider value while sprint-moving.
     * @param {number} dt
     */
    _handleFov(dt) {
        const sprinting = this._isSprinting && this._speedRatio > 0.5;
        const target = sprinting ? SPRINT_FOV : BASE_FOV;
        if (Math.abs(this._camera.fov - target) > 0.01) {
            this._camera.fov += (target - this._camera.fov) * Math.min(1, dt * FOV_LERP);
            this._camera.updateProjectionMatrix();
        }
    }

    /**
     * Handle E key or mobile interact button (doors, secrets, etc.).
     */
    _handleInteraction() {
        if (this._input.isKeyPressed('KeyE') || this._input.isMobileInteract()) {
            const forward = this.getForward();
            eventBus.emit('player:interact', {
                x: this.position.x,
                z: this.position.z,
                dirX: forward.x,
                dirZ: forward.z,
                range: INTERACT_RANGE,
            });
        }
    }

    /**
     * Sync the Three.js camera to match the player position, rotation, and pitch.
     */
    _syncCamera() {
        // Headbob: vertical offset on the eye + a subtle lateral sway (along "right").
        // The lookAt target stays at the un-bobbed eye height so the view bobs naturally.
        const right = this.getRight();
        this._camera.position.set(
            this.position.x + right.x * this._bobX,
            EYE_HEIGHT + this._bobY,
            this.position.z + right.z * this._bobX
        );

        // Camera looks in the direction the player is facing, with pitch applied
        const forward = this.getForward();
        const lookDistance = 10;
        this._camera.lookAt(
            this.position.x + forward.x * lookDistance,
            EYE_HEIGHT + Math.tan(this.pitch) * lookDistance,
            this.position.z + forward.z * lookDistance
        );

        // Screen shake offset — applied AFTER lookAt so the camera jitters
        if (this._shakeIntensity > 0.001) {
            const shakeX = (Math.random() - 0.5) * this._shakeIntensity * 0.03;
            const shakeY = (Math.random() - 0.5) * this._shakeIntensity * 0.03;
            this._camera.position.x += shakeX;
            this._camera.position.y += shakeY;
        }
    }
}
