/**
 * animation-loader.js — Mixamo FBX Animation Loader
 *
 * Loads Mixamo FBX animation files and maps them to enemy types.
 * Uses Three.js FBXLoader to extract AnimationClip objects from FBX files.
 *
 * Gracefully handles missing files — if an FBX is not found, that animation
 * is simply omitted from the returned clip map. The game falls back to
 * procedural animations (enemy-animator.js) for any enemy type that has
 * no Mixamo clips available.
 */

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// ── Animation File Mapping ───────────────────────────────────────────

/**
 * Maps enemy types to their Mixamo FBX file paths.
 * Each entry is an object of animation-name → file-path.
 *
 * NOTE: Dogs are excluded — Mixamo does not support quadruped rigs.
 * Mutant uses zombie-style animations from Mixamo.
 */
const ANIMATION_MAP = {
    guard: {
        idle: 'assets/models/animations/guard_idle.fbx',
        walk: 'assets/models/animations/guard_walk.fbx',
        run: 'assets/models/animations/guard_run.fbx',
        shoot: 'assets/models/animations/guard_shoot.fbx',
        hit: 'assets/models/animations/guard_hit.fbx',
        death: 'assets/models/animations/guard_death.fbx',
    },
    ss: {
        idle: 'assets/models/animations/ss_idle.fbx',
        walk: 'assets/models/animations/ss_walk.fbx',
        run: 'assets/models/animations/ss_run.fbx',
        shoot: 'assets/models/animations/ss_shoot.fbx',
        hit: 'assets/models/animations/ss_hit.fbx',
        death: 'assets/models/animations/ss_death.fbx',
    },
    officer: {
        idle: 'assets/models/animations/officer_idle.fbx',
        walk: 'assets/models/animations/officer_walk.fbx',
        run: 'assets/models/animations/officer_run.fbx',
        shoot: 'assets/models/animations/officer_shoot.fbx',
        hit: 'assets/models/animations/officer_hit.fbx',
        death: 'assets/models/animations/officer_death.fbx',
    },
    mutant: {
        idle: 'assets/models/animations/mutant_idle.fbx',
        walk: 'assets/models/animations/mutant_walk.fbx',
        run: 'assets/models/animations/mutant_run.fbx',
        shoot: 'assets/models/animations/mutant_shoot.fbx',
        hit: 'assets/models/animations/mutant_hit.fbx',
        death: 'assets/models/animations/mutant_death.fbx',
    },
    // dog: no Mixamo animations (quadruped not supported)
};

// ── AnimationLoader Class ────────────────────────────────────────────

export class AnimationLoader {
    constructor() {
        /** @type {FBXLoader} */
        this._loader = new FBXLoader();

        /**
         * Loaded animation clips per enemy type.
         * @type {Map<string, Map<string, THREE.AnimationClip>>}
         */
        this._clips = new Map();

        /**
         * In-flight loading promises to prevent duplicate requests.
         * @type {Map<string, Promise<Map<string, THREE.AnimationClip>>>}
         */
        this._loading = new Map();
    }

    /**
     * Load all animation FBX files for a given enemy type.
     * Returns a Map of animation-name to AnimationClip.
     * Silently skips any files that fail to load (network error, 404, etc.).
     *
     * @param {string} enemyType - Enemy type key (e.g. 'guard', 'ss', 'officer', 'mutant')
     * @returns {Promise<Map<string, THREE.AnimationClip>>} Map of clip name → AnimationClip
     */
    async loadAnimations(enemyType) {
        // Return cached clips if already loaded
        if (this._clips.has(enemyType)) {
            return this._clips.get(enemyType);
        }

        // Return in-flight promise if already loading
        if (this._loading.has(enemyType)) {
            return this._loading.get(enemyType);
        }

        // No animation map for this type (e.g. dog)
        const animPaths = ANIMATION_MAP[enemyType];
        if (!animPaths) {
            const empty = new Map();
            this._clips.set(enemyType, empty);
            return empty;
        }

        // Start loading all FBX files for this enemy type
        const loadPromise = this._loadAllClips(enemyType, animPaths);
        this._loading.set(enemyType, loadPromise);

        try {
            const clips = await loadPromise;
            this._clips.set(enemyType, clips);
            return clips;
        } finally {
            this._loading.delete(enemyType);
        }
    }

    /**
     * Get previously loaded clips for an enemy type.
     * Returns null if animations haven't been loaded yet.
     *
     * @param {string} enemyType - Enemy type key
     * @returns {Map<string, THREE.AnimationClip>|null}
     */
    getClips(enemyType) {
        return this._clips.get(enemyType) ?? null;
    }

    /**
     * Check if any Mixamo animations are available for the given enemy type.
     *
     * @param {string} enemyType - Enemy type key
     * @returns {boolean} True if at least one animation clip is loaded
     */
    hasAnimations(enemyType) {
        const clips = this._clips.get(enemyType);
        return clips != null && clips.size > 0;
    }

    /**
     * Preload animations for all supported enemy types.
     * Non-blocking — individual failures are silently ignored.
     * Use this at boot time so clips are ready when enemies spawn.
     *
     * @returns {Promise<void>}
     */
    async preloadAll() {
        const types = Object.keys(ANIMATION_MAP);
        const results = await Promise.allSettled(
            types.map((type) => this.loadAnimations(type))
        );

        // Log summary
        let loadedCount = 0;
        for (const type of types) {
            const clips = this._clips.get(type);
            if (clips && clips.size > 0) {
                loadedCount++;
                console.log(
                    `AnimationLoader: ${type} — ${clips.size} clip(s) loaded: [${[...clips.keys()].join(', ')}]`
                );
            }
        }

        if (loadedCount === 0) {
            console.log('AnimationLoader: No Mixamo animations found, procedural animations will be used');
        } else {
            console.log(`AnimationLoader: ${loadedCount}/${types.length} enemy types have Mixamo animations`);
        }
    }

    // ── Internal ──────────────────────────────────────────────────────

    /**
     * Load all FBX files for one enemy type, extracting AnimationClips.
     *
     * @param {string} enemyType - Enemy type key
     * @param {Object<string, string>} animPaths - Map of anim name → FBX file path
     * @returns {Promise<Map<string, THREE.AnimationClip>>}
     */
    async _loadAllClips(enemyType, animPaths) {
        const clips = new Map();
        const entries = Object.entries(animPaths);

        // Load all FBX files in parallel, settling individually
        const results = await Promise.allSettled(
            entries.map(([name, path]) => this._loadSingleClip(name, path))
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const [name] = entries[i];

            if (result.status === 'fulfilled' && result.value) {
                clips.set(name, result.value);
            }
            // Rejected or null → silently skip (file not found / not yet downloaded)
        }

        return clips;
    }

    /**
     * Load a single FBX file and extract the first AnimationClip.
     * Mixamo FBX files typically contain exactly one clip per file.
     *
     * @param {string} name - Animation name (e.g. 'idle', 'walk')
     * @param {string} path - Path to the FBX file
     * @returns {Promise<THREE.AnimationClip|null>}
     */
    _loadSingleClip(name, path) {
        return new Promise((resolve) => {
            this._loader.load(
                path,
                (fbx) => {
                    // FBX files from Mixamo contain animations array
                    if (fbx.animations && fbx.animations.length > 0) {
                        const clip = fbx.animations[0];
                        // Rename the clip to our standard name for clarity
                        clip.name = name;
                        resolve(clip);
                    } else {
                        console.warn(`AnimationLoader: FBX "${path}" contains no animation clips`);
                        resolve(null);
                    }
                },
                undefined, // onProgress — not needed
                (err) => {
                    // Silently resolve null on error (file not found is expected)
                    resolve(null);
                }
            );
        });
    }
}
