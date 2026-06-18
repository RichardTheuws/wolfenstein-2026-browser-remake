/**
 * renderer.js — Three.js WebGL Renderer
 *
 * Manages the Three.js scene, camera, lighting, fog, and render loop.
 * Post-processing via EffectComposer is wired up but kept minimal for Phase 1.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CRTShader } from './crt-shader.js';

export class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     */
    constructor(canvas) {
        /** @type {HTMLCanvasElement} */
        this._canvas = canvas;

        // ── WebGL Renderer ──────────────────────────────────────────
        this._renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false, // Authentic pixel look
            powerPreference: 'high-performance',
        });
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.shadowMap.enabled = false; // No shadows (authentic + perf)
        this._renderer.outputColorSpace = THREE.SRGBColorSpace;
        // Filmic tone mapping for modern highlight roll-off (applied via OutputPass).
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.55;

        // Max anisotropy supported by the GPU — used to sharpen grazing-angle textures.
        this.maxAnisotropy = this._renderer.capabilities.getMaxAnisotropy();

        // ── Scene ───────────────────────────────────────────────────
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x252525);
        this.scene.fog = new THREE.Fog(0x252525, 3, 25);

        // ── Camera ──────────────────────────────────────────────────
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
        this.camera.position.set(0, 1.6, 0); // Eye height

        // ── Ambient + Hemisphere + Key Light ────────────────────────
        // Low ambient base, hemisphere for sky/ground tint, and a directional
        // key light so walls gain form/specular instead of reading flat.
        this._ambientLight = new THREE.AmbientLight(0x3a3a44, 0.75);
        this.scene.add(this._ambientLight);

        this._hemiLight = new THREE.HemisphereLight(0xaac2ee, 0x35281c, 1.0);
        this.scene.add(this._hemiLight);

        this._keyLight = new THREE.DirectionalLight(0xfff0e0, 1.8);
        this._keyLight.position.set(0.5, 1.0, 0.3);
        this.scene.add(this._keyLight);

        // ── Point Lights Container ──────────────────────────────────
        /** @type {Map<string, THREE.PointLight>} */
        this._pointLights = new Map();

        // ── Post-Processing (EffectComposer) ────────────────────────
        // Pass order: scene → AO → bloom → SMAA → tone-map/output → CRT.
        const width = window.innerWidth;
        const height = window.innerHeight;

        this._composer = new EffectComposer(this._renderer);
        this._renderPass = new RenderPass(this.scene, this.camera);
        this._composer.addPass(this._renderPass);

        // Selective bloom — only bright sources (lamps, muzzle flash, gold) glow.
        this._bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.6,  // strength
            0.6,  // radius
            0.6   // threshold — lamps/flames/highlights glow, dim walls don't
        );
        this._composer.addPass(this._bloomPass);

        // SMAA — soft edge AA that preserves the crunchy pixel look better than MSAA.
        this._smaaPass = new SMAAPass(width, height);
        this._composer.addPass(this._smaaPass);

        // OutputPass applies tone mapping + sRGB conversion to the composed result
        // (EffectComposer render targets are linear, so this is required).
        this._outputPass = new OutputPass();
        this._composer.addPass(this._outputPass);

        // CRT post-processing pass (disabled by default, runs last when enabled)
        this._crtPass = new ShaderPass(CRTShader);
        this._crtPass.uniforms.resolution.value = new THREE.Vector2(width, height);
        this._crtPass.enabled = false;
        this._composer.addPass(this._crtPass);

        // ── Resize Handling ─────────────────────────────────────────
        this._onResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._onResize);
    }

    /**
     * Add a point light to the scene (for torches, muzzle flash, etc.).
     * @param {string} id - Unique identifier for this light
     * @param {object} options
     * @param {number} [options.color=0xffaa33] - Light color
     * @param {number} [options.intensity=1.0] - Light intensity
     * @param {number} [options.distance=10] - Maximum range
     * @param {number} [options.decay=2] - How fast light fades
     * @param {THREE.Vector3} [options.position] - World position
     * @returns {THREE.PointLight}
     */
    addPointLight(id, options = {}) {
        const {
            color = 0xffaa33,
            intensity = 1.0,
            distance = 10,
            decay = 2,
            position = new THREE.Vector3(0, 1.5, 0),
        } = options;

        const light = new THREE.PointLight(color, intensity, distance, decay);
        light.position.copy(position);
        this.scene.add(light);
        this._pointLights.set(id, light);
        return light;
    }

    /**
     * Get an existing point light by id.
     * @param {string} id
     * @returns {THREE.PointLight|undefined}
     */
    getPointLight(id) {
        return this._pointLights.get(id);
    }

    /**
     * Remove a point light.
     * @param {string} id
     */
    removePointLight(id) {
        const light = this._pointLights.get(id);
        if (light) {
            this.scene.remove(light);
            light.dispose();
            this._pointLights.delete(id);
        }
    }

    /**
     * Set the fog parameters.
     * @param {number} color - Fog color hex
     * @param {number} near - Distance where fog starts
     * @param {number} far - Distance where fog is fully opaque
     */
    setFog(color, near, far) {
        this.scene.fog = new THREE.Fog(color, near, far);
        this.scene.background = new THREE.Color(color);
    }

    /**
     * Set the ambient light intensity and color.
     * @param {number} color
     * @param {number} intensity
     */
    setAmbientLight(color, intensity) {
        this._ambientLight.color.setHex(color);
        this._ambientLight.intensity = intensity;
    }

    /**
     * Enable or disable the CRT post-processing filter.
     * @param {boolean} enabled
     */
    setCRTEnabled(enabled) {
        this._crtPass.enabled = !!enabled;
    }

    /**
     * Check if the CRT filter is currently enabled.
     * @returns {boolean}
     */
    isCRTEnabled() {
        return this._crtPass.enabled;
    }

    /**
     * Set the rendering quality tier. SMAA edge-AA is disabled on 'low'
     * (mobile / weak GPUs); bloom + tone mapping stay on for all tiers.
     * @param {'low'|'high'} tier
     */
    setQuality(tier) {
        const high = tier !== 'low';
        this._bloomPass.enabled = true;
        this._smaaPass.enabled = high;
    }

    /**
     * Main render call. Runs the EffectComposer pipeline.
     * @param {number} _deltaTime - Time since last frame in seconds
     */
    render(_deltaTime) {
        // Update CRT time uniform for animated grain
        if (this._crtPass.enabled) {
            this._crtPass.uniforms.time.value += _deltaTime;
        }
        this._composer.render();
    }

    /**
     * Get the underlying Three.js WebGLRenderer.
     * @returns {THREE.WebGLRenderer}
     */
    get webGLRenderer() {
        return this._renderer;
    }

    /**
     * Clean up all resources.
     */
    dispose() {
        window.removeEventListener('resize', this._onResize);

        for (const [id] of this._pointLights) {
            this.removePointLight(id);
        }

        this._composer.dispose();
        this._renderer.dispose();
    }

    // ── Internal ────────────────────────────────────────────────────

    _handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this._renderer.setSize(width, height);
        this._composer.setSize(width, height);

        // Update CRT resolution uniform
        if (this._crtPass) {
            this._crtPass.uniforms.resolution.value.set(width, height);
        }
    }
}
