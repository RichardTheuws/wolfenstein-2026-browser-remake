/**
 * model-loader.js — GLB 3D Model Loader
 *
 * Loads .glb models using Three.js GLTFLoader with caching.
 * Models are cached in a Map to avoid redundant network requests.
 * Use clone() on returned models to create per-instance copies.
 */

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        /** @type {GLTFLoader} */
        this._loader = new GLTFLoader();

        /** @type {Map<string, {scene: THREE.Group, animations: THREE.AnimationClip[]}>} Cached loaded models keyed by URL */
        this._cache = new Map();

        /** @type {Map<string, Promise<{scene: THREE.Group, animations: THREE.AnimationClip[]}>>} In-flight loading promises to deduplicate requests */
        this._loading = new Map();
    }

    /**
     * Load a .glb model file. Returns a cached copy if already loaded.
     * Concurrent calls for the same URL share one network request.
     *
     * @param {string} url - URL or path to the .glb file
     * @returns {Promise<{scene: THREE.Group, animations: THREE.AnimationClip[]}>} The root group and animation clips
     */
    async loadModel(url) {
        // Return cached model if available
        if (this._cache.has(url)) {
            const cached = this._cache.get(url);
            return { scene: cached.scene.clone(), animations: cached.animations };
        }

        // Deduplicate in-flight requests for the same URL
        if (this._loading.has(url)) {
            const result = await this._loading.get(url);
            return { scene: result.scene.clone(), animations: result.animations };
        }

        // Start loading
        const loadPromise = new Promise((resolve, reject) => {
            this._loader.load(
                url,
                (gltf) => {
                    const result = {
                        scene: gltf.scene,
                        animations: gltf.animations || [],
                    };
                    this._cache.set(url, result);
                    this._loading.delete(url);
                    resolve(result);
                },
                undefined, // onProgress — not needed
                (error) => {
                    this._loading.delete(url);
                    reject(new Error(`Failed to load model "${url}": ${error.message || error}`));
                }
            );
        });

        this._loading.set(url, loadPromise);

        const result = await loadPromise;
        return { scene: result.scene.clone(), animations: result.animations };
    }

    /**
     * Get a cached model without loading. Returns null if not cached.
     *
     * @param {string} url - URL or path to the .glb file
     * @returns {{scene: THREE.Group, animations: THREE.AnimationClip[]}|null} Cloned model + animations or null
     */
    getCachedModel(url) {
        if (this._cache.has(url)) {
            const cached = this._cache.get(url);
            return { scene: cached.scene.clone(), animations: cached.animations };
        }
        return null;
    }

    /**
     * Dispose all cached models and free GPU resources.
     */
    clearCache() {
        for (const [, entry] of this._cache) {
            entry.scene.traverse((child) => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => m.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
        }
        this._cache.clear();
        this._loading.clear();
    }
}
