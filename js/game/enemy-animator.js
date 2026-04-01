/**
 * enemy-animator.js — Procedural Animation System for Enemies
 *
 * Adds life-like movement to static GLB models (no skeleton/bones) and
 * fallback box meshes through root-transform manipulation.
 *
 * Animation states map to enemy AI states:
 *   idle, walk, attack, pain, death
 *
 * Uses spring physics for smooth state transitions.
 */

// ── Spring Helper ─────────────────────────────────────────────────

/**
 * Simple spring interpolation toward a target value.
 * @param {number} current
 * @param {number} target
 * @param {number} stiffness - Spring stiffness (higher = faster)
 * @param {number} dt - Delta time in seconds
 * @returns {number} New value
 */
function spring(current, target, stiffness, dt) {
    return current + (target - current) * Math.min(stiffness * dt, 1);
}

// ── Animation States ──────────────────────────────────────────────

const ANIM_STATE = {
    IDLE: 'idle',
    WALK: 'walk',
    ATTACK: 'attack',
    PAIN: 'pain',
    DEATH: 'death',
};

// ── Amplitude Scales ──────────────────────────────────────────────

/** Box meshes and GLB models both get clearly visible animations. */
const AMP = {
    box: 0.7,
    model: 1.0,
};

// ── EnemyAnimator Class ───────────────────────────────────────────

export class EnemyAnimator {
    /**
     * @param {THREE.Mesh|THREE.Group} mesh - The enemy's visible mesh
     * @param {string} enemyType - 'guard' | 'officer' | 'ss' | 'dog' | 'mutant'
     */
    constructor(mesh, enemyType) {
        /** @type {THREE.Mesh|THREE.Group} */
        this._mesh = mesh;

        /** @type {string} */
        this._type = enemyType;

        /** Whether this is a quadruped (dog) */
        this._isDog = enemyType === 'dog';

        /** Whether the mesh is a GLB model (Group) vs a simple box (Mesh) */
        this._isModel = mesh.isGroup === true;

        /** Amplitude multiplier based on mesh type */
        this._amp = this._isModel ? AMP.model : AMP.box;

        /** Current animation state */
        this._state = ANIM_STATE.IDLE;

        /** Previous state (for transition detection) */
        this._prevState = ANIM_STATE.IDLE;

        /** Accumulated time for oscillation functions */
        this._time = 0;

        /** State-specific timer (for one-shot animations like pain/death) */
        this._stateTime = 0;

        /** Whether the death animation has completed */
        this._deathFinished = false;

        // ── Animated transform offsets (applied on top of base transforms) ──

        /** Current rotation offsets (radians) */
        this._rotX = 0;
        this._rotY = 0;
        this._rotZ = 0;

        /** Current position offsets */
        this._posY = 0;
        this._posZ = 0; // for recoil/lunge

        /** Current scale offset for Y (breathing) */
        this._scaleY = 1;

        // ── Targets for spring interpolation ──

        this._targetRotX = 0;
        this._targetRotZ = 0;
        this._targetPosY = 0;
        this._targetPosZ = 0;
        this._targetScaleY = 1;

        // ── Emissive flash state ──

        this._flashIntensity = 0;
        this._flashTarget = 0;

        // ── Store base mesh rotation.x set by enemy.js death animation ──
        // We only modify rotation offsets; the main rotation.x/y are controlled
        // by enemy.js (_billboardToward and _updateDeathAnimation).
        // Our procedural offsets are ADDITIVE on top of the rotation set by
        // the parent enemy code. We track what we last applied so we can
        // cleanly subtract it before applying the next frame's offset.

        this._lastAppliedRotX = 0;
        this._lastAppliedRotZ = 0;
        this._lastAppliedPosY = 0;
        this._lastAppliedPosZ = 0;
        this._lastAppliedScaleY = 0; // delta from 1.0

        // ── Random phase offsets so enemies don't all breathe in sync ──
        this._phaseOffset = Math.random() * Math.PI * 2;
    }

    /**
     * Transition to a new animation state.
     * @param {'idle'|'walk'|'attack'|'pain'|'death'} state
     */
    setState(state) {
        if (this._state === ANIM_STATE.DEATH) return; // death is permanent
        if (state === this._state) return;

        this._prevState = this._state;
        this._state = state;
        this._stateTime = 0;

        // Reset targets on state entry
        switch (state) {
            case ANIM_STATE.IDLE:
                this._targetRotX = 0;
                this._targetRotZ = 0;
                this._targetPosY = 0;
                this._targetPosZ = 0;
                this._flashTarget = 0;
                this._flashIntensity = 0;
                this._clearFlash();
                break;

            case ANIM_STATE.ATTACK:
                // Trigger flash on attack start
                this._flashTarget = 1.0;
                break;

            case ANIM_STATE.PAIN:
                // Immediate flinch
                this._flashTarget = 1.0;
                break;

            case ANIM_STATE.DEATH:
                this._deathFinished = false;
                break;
        }
    }

    /**
     * Update procedural animation for the current frame.
     * Must be called AFTER enemy.js sets mesh.position and mesh.rotation.y
     * (billboard), but the offsets are applied additively.
     *
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this._deathFinished) return;

        this._time += dt;
        this._stateTime += dt;

        // ── Remove previous frame's offsets ──
        this._unapplyOffsets();

        // ── Compute new targets based on current state ──
        switch (this._state) {
            case ANIM_STATE.IDLE:
                this._breathe(dt);
                break;
            case ANIM_STATE.WALK:
                this._isDog ? this._dogWalk(dt) : this._walk(dt);
                break;
            case ANIM_STATE.ATTACK:
                this._isDog ? this._dogAttack(dt) : this._attack(dt);
                break;
            case ANIM_STATE.PAIN:
                this._pain(dt);
                break;
            case ANIM_STATE.DEATH:
                this._die(dt);
                break;
        }

        // ── Spring-interpolate current values toward targets ──
        const stiffness = this._state === ANIM_STATE.PAIN ? 10 : 6;
        this._rotX = spring(this._rotX, this._targetRotX, stiffness, dt);
        this._rotZ = spring(this._rotZ, this._targetRotZ, stiffness, dt);
        this._posY = spring(this._posY, this._targetPosY, stiffness, dt);
        this._posZ = spring(this._posZ, this._targetPosZ, stiffness, dt);
        this._scaleY = spring(this._scaleY, this._targetScaleY, stiffness, dt);

        // Spring the flash
        this._flashIntensity = spring(this._flashIntensity, this._flashTarget, 12, dt);
        if (this._flashIntensity < 0.01) this._flashIntensity = 0;

        // ── Apply new offsets ──
        this._applyOffsets();

        // ── Apply emissive flash (attack muzzle light / pain red) ──
        this._applyFlash();
    }

    /**
     * Reset mesh to original transforms and clean up.
     */
    dispose() {
        this._unapplyOffsets();
        this._clearFlash();
        this._mesh = null;
    }

    // ── Animation Behaviors ───────────────────────────────────────────

    /**
     * Idle breathing: subtle Y scale oscillation and slight body sway.
     * @param {number} dt
     */
    _breathe(dt) {
        const t = this._time + this._phaseOffset;
        const amp = this._amp;

        // Breathing: Y scale oscillation at ~0.5Hz (barely perceptible)
        const breathe = Math.sin(t * Math.PI) * 0.005 * amp;
        this._targetScaleY = 1 + breathe;

        // Slight Z sway (almost still)
        const sway = Math.sin(t * 0.6 * Math.PI) * (0.5 * Math.PI / 180) * amp;
        this._targetRotZ = sway;

        // Slight forward/back rock
        const rock = Math.sin(t * 0.4 * Math.PI) * (0.3 * Math.PI / 180) * amp;
        this._targetRotX = rock;

        this._targetPosY = 0;
        this._targetPosZ = 0;
        this._flashTarget = 0;
    }

    /**
     * Bipedal walk: bob up/down, alternating body lean.
     * @param {number} dt
     */
    _walk(dt) {
        const t = this._time + this._phaseOffset;
        const amp = this._amp;
        const walkFreq = 3.0; // Hz multiplied by walk cycle

        // Walk bob: visible up/down bounce
        const bob = Math.abs(Math.sin(t * walkFreq * Math.PI)) * 0.06 * amp;
        this._targetPosY = bob;

        // Body lean: alternating Z rotation (visible sway)
        const lean = Math.sin(t * walkFreq * Math.PI) * (5 * Math.PI / 180) * amp;
        this._targetRotZ = lean;

        // Forward lean when moving
        this._targetRotX = (4 * Math.PI / 180) * amp;

        this._targetPosZ = 0;
        this._targetScaleY = 1;
        this._flashTarget = 0;
    }

    /**
     * Ranged attack: recoil and muzzle flash.
     * @param {number} dt
     */
    _attack(dt) {
        const t = this._stateTime;
        const amp = this._amp;

        // Recoil: visible backward kick when firing
        if (t < 0.1) {
            // Recoil phase — snappy and visible
            this._targetPosZ = -0.06 * amp;
            this._targetRotX = -(8 * Math.PI / 180) * amp;
            this._flashTarget = 1.0;
        } else if (t < 0.25) {
            // Recovery phase
            this._targetPosZ = 0;
            this._targetRotX = -(2 * Math.PI / 180) * amp;
            this._flashTarget = 0;
        } else {
            // Hold steady (idle-like breathing while in attack stance)
            this._breathe(dt);
        }

        this._targetScaleY = 1;
    }

    /**
     * Pain flinch: quick backward tilt then spring back.
     * @param {number} dt
     */
    _pain(dt) {
        const t = this._stateTime;
        const amp = this._amp;

        if (t < 0.12) {
            // Hard flinch backward — clearly visible
            this._targetRotX = -(15 * Math.PI / 180) * amp;
            this._targetPosZ = -0.08 * amp;
            // Random lateral stagger
            this._targetRotZ = (Math.random() - 0.5) * (10 * Math.PI / 180) * amp;
            this._flashTarget = 1.0;
        } else if (t < 0.25) {
            // Spring back
            this._targetRotX = -(5 * Math.PI / 180) * amp;
            this._targetPosZ = -0.02 * amp;
            this._targetRotZ = 0;
            this._flashTarget = 0.3;
        } else {
            // Recover
            this._targetRotX = 0;
            this._targetRotZ = 0;
            this._targetPosZ = 0;
            this._flashTarget = 0;
        }

        this._targetPosY = 0;
        this._targetPosZ = 0;
        this._targetScaleY = 1;
    }

    /**
     * Death fall sequence:
     *   Phase 1 (0-0.3s): tilt backward
     *   Phase 2 (0.3-0.8s): fall sideways
     *   Phase 3 (0.8-1.2s): settle to ground
     *
     * NOTE: enemy.js has its own death animation on mesh.rotation.x and
     * mesh.position.y. Our offsets ADD to those values. We keep ours subtle
     * to complement rather than fight the existing death fall.
     *
     * @param {number} dt
     */
    _die(dt) {
        const t = this._stateTime;

        if (t < 0.2) {
            // Phase 1: stumble backward — hit hard
            const progress = t / 0.2;
            this._targetRotX = -(20 * Math.PI / 180) * progress;
            this._targetRotZ = (8 * Math.PI / 180) * progress;
            this._targetPosZ = -0.1 * progress;
            this._targetPosY = 0.05 * progress;
        } else if (t < 0.5) {
            // Phase 2: knees buckle — drop down
            const progress = (t - 0.2) / 0.3;
            this._targetRotX = -(20 + 40 * progress) * Math.PI / 180;
            this._targetRotZ = (8 + 15 * progress) * Math.PI / 180;
            this._targetPosY = 0.05 - 0.4 * progress;
            this._targetPosZ = -0.1 - 0.05 * progress;
        } else if (t < 0.9) {
            // Phase 3: collapse forward to ground
            const progress = (t - 0.5) / 0.4;
            this._targetRotX = -(60 + 20 * progress) * Math.PI / 180;
            this._targetRotZ = (23 - 5 * progress) * Math.PI / 180;
            this._targetPosY = -0.35 - 0.3 * progress;
            this._targetPosZ = -0.15 + 0.05 * progress;
        } else if (t < 1.5) {
            // Phase 4: settled on ground — hold final pose
            this._targetRotX = -80 * Math.PI / 180;
            this._targetRotZ = 18 * Math.PI / 180;
            this._targetPosY = -0.65;
            this._targetPosZ = -0.1;
        } else {
            // Animation complete — freeze
            this._deathFinished = true;
        }

        this._targetPosZ = 0;
        this._targetScaleY = 1;
        this._flashTarget = 0;
    }

    /**
     * Quadruped (dog) walking: loping up-down motion, more pronounced bob.
     * @param {number} dt
     */
    _dogWalk(dt) {
        const t = this._time + this._phaseOffset;
        const amp = this._amp;
        const lopeFreq = 4.0;

        // Dogs have a more pronounced vertical bob (loping gait)
        const bob = Math.abs(Math.sin(t * lopeFreq * Math.PI)) * 0.07 * amp;
        this._targetPosY = bob;

        // Front-to-back rocking (simulates gallop)
        const rock = Math.sin(t * lopeFreq * Math.PI) * (8 * Math.PI / 180) * amp;
        this._targetRotX = rock;

        // Slight lateral sway
        const sway = Math.sin(t * lopeFreq * 0.5 * Math.PI) * (3 * Math.PI / 180) * amp;
        this._targetRotZ = sway;

        this._targetPosZ = 0;
        this._targetScaleY = 1;
        this._flashTarget = 0;
    }

    /**
     * Dog attack: lunging bite motion.
     * @param {number} dt
     */
    _dogAttack(dt) {
        const t = this._stateTime;
        const amp = this._amp;

        if (t < 0.15) {
            // Lunge forward
            this._targetPosZ = 0.08 * amp;
            this._targetRotX = (10 * Math.PI / 180) * amp; // nose down (bite)
        } else if (t < 0.35) {
            // Pull back
            this._targetPosZ = -0.02 * amp;
            this._targetRotX = -(5 * Math.PI / 180) * amp;
        } else {
            // Settle back to ready stance
            this._targetPosZ = 0;
            this._targetRotX = 0;
            // Continue with walk-like idle
            this._dogWalk(dt);
        }

        this._targetScaleY = 1;
        this._flashTarget = 0;
    }

    // ── Offset Application ────────────────────────────────────────────

    /**
     * Remove the previously applied offsets from the mesh transforms.
     * This ensures we don't accumulate offsets over multiple frames.
     */
    _unapplyOffsets() {
        if (!this._mesh) return;

        this._mesh.rotation.x -= this._lastAppliedRotX;
        this._mesh.rotation.z -= this._lastAppliedRotZ;
        this._mesh.position.y -= this._lastAppliedPosY;

        // Position Z offset is in local forward direction, applied via position.z
        // but since billboard rotation changes world alignment, we just use world Z
        this._mesh.position.z -= this._lastAppliedPosZ;

        // Undo scale offset
        const prevScaleDelta = this._lastAppliedScaleY;
        if (prevScaleDelta !== 0) {
            this._mesh.scale.y -= prevScaleDelta;
        }

        this._lastAppliedRotX = 0;
        this._lastAppliedRotZ = 0;
        this._lastAppliedPosY = 0;
        this._lastAppliedPosZ = 0;
        this._lastAppliedScaleY = 0;
    }

    /**
     * Apply the current interpolated offsets to the mesh transforms.
     */
    _applyOffsets() {
        if (!this._mesh) return;

        this._mesh.rotation.x += this._rotX;
        this._mesh.rotation.z += this._rotZ;
        this._mesh.position.y += this._posY;
        this._mesh.position.z += this._posZ;

        const scaleDelta = this._scaleY - 1;
        if (scaleDelta !== 0) {
            this._mesh.scale.y += scaleDelta;
        }

        // Record what we applied so we can unapply next frame
        this._lastAppliedRotX = this._rotX;
        this._lastAppliedRotZ = this._rotZ;
        this._lastAppliedPosY = this._posY;
        this._lastAppliedPosZ = this._posZ;
        this._lastAppliedScaleY = scaleDelta;
    }

    // ── Emissive Flash ────────────────────────────────────────────────

    /**
     * Apply emissive color to mesh materials based on flash intensity.
     * Attack flash = very subtle warm tint, pain flash = very subtle red.
     * Always resets to black (0x000000) when flash intensity reaches zero.
     */
    _applyFlash() {
        if (!this._mesh) return;

        // When flash intensity is zero or negligible, ensure emissive is reset to black
        if (this._flashIntensity <= 0) {
            this._clearFlash();
            return;
        }

        const intensity = this._flashIntensity;
        const isPain = this._state === ANIM_STATE.PAIN;

        // Visible flash colors: pain = bright red, attack = orange muzzle flash
        const r = isPain ? intensity * 0.8 : intensity * 0.6;
        const g = isPain ? intensity * 0.1 : intensity * 0.3;
        const b = 0;

        if (this._isModel) {
            this._mesh.traverse((child) => {
                if (child.isMesh && child.material && child.material.emissive) {
                    child.material.emissive.setRGB(r, g, b);
                }
            });
        } else if (this._mesh.material && this._mesh.material.emissive) {
            this._mesh.material.emissive.setRGB(r, g, b);
        }
    }

    /**
     * Clear all emissive flash from mesh materials.
     */
    _clearFlash() {
        if (!this._mesh) return;

        if (this._isModel) {
            this._mesh.traverse((child) => {
                if (child.isMesh && child.material && child.material.emissive) {
                    child.material.emissive.setRGB(0, 0, 0);
                }
            });
        } else if (this._mesh.material && this._mesh.material.emissive) {
            this._mesh.material.emissive.setRGB(0, 0, 0);
        }
    }
}
