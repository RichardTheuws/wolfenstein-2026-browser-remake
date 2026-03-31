/**
 * enemy-animation-mixer.js — Skeletal Animation Mixer for a Single Enemy
 *
 * Wraps THREE.AnimationMixer to manage Mixamo skeletal animation playback
 * on one enemy instance. Handles crossfade transitions between animation
 * states (idle ↔ walk ↔ run ↔ shoot ↔ hit ↔ death).
 *
 * Used when Mixamo FBX animations are available; otherwise the game
 * falls back to procedural animations from enemy-animator.js.
 */

import * as THREE from 'three';

// ── State → Clip name mapping ────────────────────────────────────────

/**
 * Maps AI state names to animation clip names.
 * AI states come from enemy.js (idle, patrol, alert, chase, attack, pain, dead).
 * Animation clip names come from AnimationLoader (idle, walk, run, shoot, hit, death).
 */
const STATE_TO_CLIP = {
    idle: 'idle',
    patrol: 'walk',
    alert: 'idle',       // Alert = standing still, reacting
    chase: 'run',
    attack: 'shoot',
    pain: 'hit',
    dead: 'death',
    // Fallbacks
    walk: 'walk',
    run: 'run',
    shoot: 'shoot',
    hit: 'hit',
    death: 'death',
};

/** One-shot animations that play once and don't loop */
const ONE_SHOT_STATES = new Set(['hit', 'death']);

/** Default crossfade duration in seconds */
const DEFAULT_FADE_DURATION = 0.25;

// ── EnemyAnimationMixer Class ────────────────────────────────────────

export class EnemyAnimationMixer {
    /**
     * @param {THREE.Group} mesh - The enemy's mesh (must have a skeleton for Mixamo anims)
     * @param {Map<string, THREE.AnimationClip>} clips - Animation clips from AnimationLoader
     */
    constructor(mesh, clips) {
        /** @type {THREE.Group} */
        this._mesh = mesh;

        /** @type {Map<string, THREE.AnimationClip>} */
        this._clips = clips;

        /** @type {THREE.AnimationMixer} */
        this._mixer = new THREE.AnimationMixer(mesh);

        /**
         * Cached AnimationActions, keyed by clip name.
         * Created lazily on first play() call for each clip.
         * @type {Map<string, THREE.AnimationAction>}
         */
        this._actions = new Map();

        /** Name of the currently playing clip */
        this._currentClipName = null;

        /** @type {THREE.AnimationAction|null} Currently active action */
        this._currentAction = null;

        /** Previous clip name (for returning from one-shot states like 'hit') */
        this._previousClipName = null;

        /** Whether the current state is a one-shot that should return to previous */
        this._isOneShot = false;

        /** Whether death animation has finished (clamp at last frame) */
        this._deathFinished = false;

        // Pre-configure all available actions
        this._setupActions();
    }

    /**
     * Play a named animation state with crossfade.
     *
     * @param {string} stateName - AI state name (e.g. 'idle', 'chase', 'attack', 'pain', 'dead')
     * @param {number} [fadeInDuration=0.25] - Crossfade duration in seconds
     */
    play(stateName, fadeInDuration = DEFAULT_FADE_DURATION) {
        if (this._deathFinished) return;

        // Map AI state to clip name
        const clipName = STATE_TO_CLIP[stateName] ?? stateName;

        // Don't restart the same animation (unless it's a one-shot like hit)
        if (clipName === this._currentClipName && !ONE_SHOT_STATES.has(clipName)) {
            return;
        }

        const action = this._actions.get(clipName);
        if (!action) {
            // Clip not available — caller should fall back to procedural
            return;
        }

        const isOneShot = ONE_SHOT_STATES.has(clipName);
        const isDeath = clipName === 'death';

        // Store previous state for returning from one-shots
        if (isOneShot && !isDeath && this._currentClipName) {
            this._previousClipName = this._currentClipName;
        }

        // Stop current action with crossfade
        if (this._currentAction && this._currentAction !== action) {
            if (isDeath) {
                // Death: immediate switch, no crossfade
                this._currentAction.fadeOut(0.1);
            } else {
                this._currentAction.fadeOut(fadeInDuration);
            }
        }

        // Configure the new action
        action.reset();
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);

        if (isDeath) {
            // Death: play once, clamp at final frame
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.fadeIn(0.1);
        } else if (isOneShot) {
            // Hit/pain: play once, then return to previous state
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = false;
            action.fadeIn(fadeInDuration);
        } else {
            // Looping animations (idle, walk, run, shoot)
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.fadeIn(fadeInDuration);
        }

        action.play();

        this._currentAction = action;
        this._currentClipName = clipName;
        this._isOneShot = isOneShot && !isDeath;
    }

    /**
     * Update the animation mixer. Must be called every frame.
     *
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (this._deathFinished) return;

        this._mixer.update(deltaTime);
    }

    /**
     * Get the name of the currently playing animation clip.
     *
     * @returns {string|null}
     */
    getCurrentAction() {
        return this._currentClipName;
    }

    /**
     * Stop all actions, uncache all clips, and release the mixer.
     */
    dispose() {
        if (this._mixer) {
            this._mixer.stopAllAction();

            // Uncache all clips to free memory
            for (const [, clip] of this._clips) {
                this._mixer.uncacheClip(clip);
            }
            this._mixer.uncacheRoot(this._mesh);

            this._mixer = null;
        }

        this._actions.clear();
        this._clips = null;
        this._mesh = null;
        this._currentAction = null;
        this._currentClipName = null;
    }

    // ── Internal ──────────────────────────────────────────────────────

    /**
     * Pre-create AnimationAction objects for all available clips
     * and wire up the 'finished' event for one-shot handling.
     */
    _setupActions() {
        for (const [name, clip] of this._clips) {
            const action = this._mixer.clipAction(clip);
            action.setEffectiveWeight(0); // Start inactive
            this._actions.set(name, action);
        }

        // Listen for animation-finished events (one-shot return + death clamp)
        this._mixer.addEventListener('finished', (e) => {
            const finishedAction = e.action;
            const finishedClip = finishedAction.getClip();

            if (finishedClip.name === 'death') {
                // Death animation complete — freeze in place
                this._deathFinished = true;
                return;
            }

            // One-shot finished (e.g. 'hit') — return to previous state
            if (this._isOneShot && this._previousClipName) {
                this._isOneShot = false;
                this.play(this._previousClipName, DEFAULT_FADE_DURATION);
                this._previousClipName = null;
            }
        });
    }
}
