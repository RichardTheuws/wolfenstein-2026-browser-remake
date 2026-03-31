/**
 * weapon-viewmodel.js — 3D First-Person Weapon Viewmodel
 *
 * Renders a 3D weapon overlay on top of the main game scene using a separate
 * Three.js scene/camera pair. Replaces the old sprite-based WeaponHUD with
 * proper geometric weapon models, idle sway, walk bob, fire recoil, muzzle
 * flash, and weapon-switch animations.
 */

import * as THREE from 'three';

// ── Constants ───────────────────────────────────────────────────────────
const WEAPON_NAMES = ['knife', 'pistol', 'mp40', 'chaingun'];

// Base position for each weapon (lower-right of screen)
const WEAPON_POSITIONS = {
    knife:    new THREE.Vector3(0.25, -0.20, -0.40),
    pistol:   new THREE.Vector3(0.30, -0.25, -0.50),
    mp40:     new THREE.Vector3(0.30, -0.25, -0.50),
    chaingun: new THREE.Vector3(0.30, -0.28, -0.50),
};

// Base rotation for each weapon
const WEAPON_ROTATIONS = {
    knife:    new THREE.Euler(0, -0.3, 0.1),
    pistol:   new THREE.Euler(0, 0, 0),
    mp40:     new THREE.Euler(0, 0, 0),
    chaingun: new THREE.Euler(0, 0, 0),
};

// Idle sway parameters
const SWAY_AMPLITUDE = 0.002;
const SWAY_SPEED = 1.0; // Hz

// Walk bob parameters
const BOB_SPEED_BASE = 8.0;
const BOB_AMPLITUDE_X = 0.012;
const BOB_AMPLITUDE_Y = 0.008;

// Fire recoil parameters
const RECOIL_KICK_TIME = 0.05;   // Time to reach peak recoil (seconds)
const RECOIL_RETURN_TIME = 0.15; // Time to return from recoil (seconds)
const RECOIL_POS = new THREE.Vector3(0, 0.03, 0.05);
const RECOIL_ANGLE = THREE.MathUtils.degToRad(5);

// Weapon switch parameters
const SWITCH_DROP_TIME = 0.15;
const SWITCH_RISE_TIME = 0.15;
const SWITCH_DROP_DISTANCE = 0.3;

// Muzzle flash parameters
const FLASH_DURATION = 0.05; // seconds — 3 frames at 60fps for punchy feel
const FLASH_INTENSITY = 5.0; // Very bright — every shot should BOOM

// Chaingun vibration
const CHAINGUN_VIBRATION_AMP = 0.003;

// ── Helper: Materials ───────────────────────────────────────────────────

function metalMaterial(color, roughness = 0.4) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.8,
        emissive: 0x111111,
    });
}

function darkMetalMaterial() {
    return metalMaterial(0x4a4a4a, 0.5);
}

function gunmetalMaterial() {
    return metalMaterial(0x5a5a64, 0.45);
}

function silverMaterial() {
    return metalMaterial(0xaaaaaa, 0.3);
}

function woodMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x5c3a1e,
        roughness: 0.7,
        metalness: 0.0,
        emissive: 0x111111,
    });
}

// ── Weapon Model Builders ───────────────────────────────────────────────

/**
 * Build a knife model from basic geometries.
 * @returns {{ group: THREE.Group, muzzleTip: THREE.Vector3 }}
 */
function buildKnife() {
    const group = new THREE.Group();

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.015, 0.20, 0.005);
    const blade = new THREE.Mesh(bladeGeo, silverMaterial());
    blade.position.set(0, 0.10, 0);
    group.add(blade);

    // Blade edge taper (slightly angled tip)
    const tipGeo = new THREE.ConeGeometry(0.008, 0.06, 4);
    const tip = new THREE.Mesh(tipGeo, silverMaterial());
    tip.position.set(0, 0.23, 0);
    group.add(tip);

    // Guard (cross-guard)
    const guardGeo = new THREE.BoxGeometry(0.05, 0.012, 0.012);
    const guard = new THREE.Mesh(guardGeo, darkMetalMaterial());
    guard.position.set(0, 0.0, 0);
    group.add(guard);

    // Handle/grip
    const gripGeo = new THREE.BoxGeometry(0.018, 0.08, 0.018);
    const grip = new THREE.Mesh(gripGeo, woodMaterial());
    grip.position.set(0, -0.045, 0);
    group.add(grip);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.014, 8, 6);
    const pommel = new THREE.Mesh(pommelGeo, darkMetalMaterial());
    pommel.position.set(0, -0.09, 0);
    group.add(pommel);

    // Knife is held tilted forward
    group.rotation.set(-0.5, 0, 0.3);

    return { group, muzzleTip: new THREE.Vector3(0, 0.26, 0) };
}

/**
 * Build a pistol model (Luger-style) from basic geometries.
 * @returns {{ group: THREE.Group, muzzleTip: THREE.Vector3 }}
 */
function buildPistol() {
    const group = new THREE.Group();
    const mat = darkMetalMaterial();

    // Barrel/slide (long upper part)
    const slideGeo = new THREE.BoxGeometry(0.025, 0.025, 0.14);
    const slide = new THREE.Mesh(slideGeo, mat);
    slide.position.set(0, 0.015, -0.02);
    group.add(slide);

    // Barrel extension (protruding muzzle)
    const barrelGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8);
    const barrel = new THREE.Mesh(barrelGeo, mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.11);
    group.add(barrel);

    // Frame / receiver
    const frameGeo = new THREE.BoxGeometry(0.022, 0.018, 0.08);
    const frame = new THREE.Mesh(frameGeo, mat);
    frame.position.set(0, -0.003, 0.01);
    group.add(frame);

    // Grip (angled downward)
    const gripGeo = new THREE.BoxGeometry(0.022, 0.065, 0.028);
    const grip = new THREE.Mesh(gripGeo, woodMaterial());
    grip.position.set(0, -0.035, 0.04);
    grip.rotation.x = 0.25;
    group.add(grip);

    // Trigger guard
    const guardGeo = new THREE.TorusGeometry(0.012, 0.002, 6, 8, Math.PI);
    const guard = new THREE.Mesh(guardGeo, mat);
    guard.position.set(0, -0.015, 0.01);
    guard.rotation.x = Math.PI;
    guard.rotation.z = Math.PI;
    group.add(guard);

    // Trigger
    const triggerGeo = new THREE.BoxGeometry(0.003, 0.012, 0.003);
    const trigger = new THREE.Mesh(triggerGeo, mat);
    trigger.position.set(0, -0.018, 0.01);
    group.add(trigger);

    // Front sight
    const sightGeo = new THREE.BoxGeometry(0.003, 0.008, 0.003);
    const sight = new THREE.Mesh(sightGeo, mat);
    sight.position.set(0, 0.032, -0.08);
    group.add(sight);

    // Rear sight
    const rearSightGeo = new THREE.BoxGeometry(0.015, 0.006, 0.003);
    const rearSight = new THREE.Mesh(rearSightGeo, mat);
    rearSight.position.set(0, 0.032, 0.02);
    group.add(rearSight);

    return { group, muzzleTip: new THREE.Vector3(0, 0.015, -0.13) };
}

/**
 * Build an MP40 submachine gun from basic geometries.
 * @returns {{ group: THREE.Group, muzzleTip: THREE.Vector3 }}
 */
function buildMP40() {
    const group = new THREE.Group();
    const mat = gunmetalMaterial();

    // Main receiver body
    const bodyGeo = new THREE.BoxGeometry(0.03, 0.03, 0.22);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.set(0, 0, 0);
    group.add(body);

    // Barrel (extends forward)
    const barrelGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.12, 8);
    const barrel = new THREE.Mesh(barrelGeo, mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.17);
    group.add(barrel);

    // Barrel shroud / ventilated cover
    const shroudGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
    const shroud = new THREE.Mesh(shroudGeo, mat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.005, -0.14);
    group.add(shroud);

    // Magazine (below receiver)
    const magGeo = new THREE.BoxGeometry(0.018, 0.12, 0.022);
    const mag = new THREE.Mesh(magGeo, mat);
    mag.position.set(0, -0.07, -0.02);
    mag.rotation.x = 0.05;
    group.add(mag);

    // Grip (pistol grip behind magazine)
    const gripGeo = new THREE.BoxGeometry(0.024, 0.06, 0.024);
    const grip = new THREE.Mesh(gripGeo, woodMaterial());
    grip.position.set(0, -0.04, 0.06);
    grip.rotation.x = 0.3;
    group.add(grip);

    // Folding stock — represented as two thin rods
    const stockMat = metalMaterial(0x555555, 0.6);
    const rod1Geo = new THREE.CylinderGeometry(0.003, 0.003, 0.14, 6);
    const rod1 = new THREE.Mesh(rod1Geo, stockMat);
    rod1.position.set(0.01, -0.01, 0.17);
    rod1.rotation.x = -0.15;
    group.add(rod1);

    const rod2 = new THREE.Mesh(rod1Geo.clone(), stockMat);
    rod2.position.set(-0.01, -0.01, 0.17);
    rod2.rotation.x = -0.15;
    group.add(rod2);

    // Stock end plate
    const platGeo = new THREE.BoxGeometry(0.035, 0.03, 0.005);
    const plate = new THREE.Mesh(platGeo, stockMat);
    plate.position.set(0, -0.03, 0.24);
    group.add(plate);

    // Front sight post
    const sightGeo = new THREE.BoxGeometry(0.003, 0.01, 0.003);
    const sight = new THREE.Mesh(sightGeo, mat);
    sight.position.set(0, 0.025, -0.17);
    group.add(sight);

    return { group, muzzleTip: new THREE.Vector3(0, 0.005, -0.23) };
}

/**
 * Build a chaingun (gatling-style) from basic geometries.
 * @returns {{ group: THREE.Group, muzzleTip: THREE.Vector3 }}
 */
function buildChaingun() {
    const group = new THREE.Group();
    const mat = gunmetalMaterial();
    const heavyMat = metalMaterial(0x444450, 0.5);

    // Main body housing
    const bodyGeo = new THREE.BoxGeometry(0.06, 0.05, 0.18);
    const body = new THREE.Mesh(bodyGeo, heavyMat);
    body.position.set(0, 0, 0);
    group.add(body);

    // Barrel cluster: 6 barrels in a ring
    const barrelCount = 6;
    const barrelRadius = 0.022;
    const barrelLength = 0.20;
    const barrelGeo = new THREE.CylinderGeometry(0.005, 0.005, barrelLength, 8);

    for (let i = 0; i < barrelCount; i++) {
        const angle = (i / barrelCount) * Math.PI * 2;
        const bx = Math.cos(angle) * barrelRadius;
        const by = Math.sin(angle) * barrelRadius;
        const barrel = new THREE.Mesh(barrelGeo, mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(bx, by + 0.01, -0.19);
        group.add(barrel);
    }

    // Barrel shroud ring (front)
    const ringGeo = new THREE.TorusGeometry(0.03, 0.005, 8, 16);
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.set(0, 0.01, -0.10);
    group.add(ring);

    // Barrel shroud ring (rear)
    const ring2 = new THREE.Mesh(ringGeo.clone(), mat);
    ring2.position.set(0, 0.01, -0.28);
    group.add(ring2);

    // Motor / rear housing
    const motorGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.06, 10);
    const motor = new THREE.Mesh(motorGeo, heavyMat);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0, 0.01, 0.12);
    group.add(motor);

    // Ammo drum (below and to the side)
    const drumGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12);
    const drum = new THREE.Mesh(drumGeo, mat);
    drum.position.set(-0.03, -0.04, 0);
    drum.rotation.z = Math.PI / 2;
    group.add(drum);

    // Handle/grip
    const gripGeo = new THREE.BoxGeometry(0.028, 0.07, 0.028);
    const grip = new THREE.Mesh(gripGeo, woodMaterial());
    grip.position.set(0, -0.06, 0.06);
    grip.rotation.x = 0.2;
    group.add(grip);

    // Top carry handle
    const handleGeo = new THREE.BoxGeometry(0.008, 0.008, 0.08);
    const handle = new THREE.Mesh(handleGeo, mat);
    handle.position.set(0, 0.035, -0.02);
    group.add(handle);

    // Handle supports
    const supportGeo = new THREE.BoxGeometry(0.006, 0.015, 0.006);
    const sup1 = new THREE.Mesh(supportGeo, mat);
    sup1.position.set(0, 0.03, -0.06);
    group.add(sup1);
    const sup2 = new THREE.Mesh(supportGeo.clone(), mat);
    sup2.position.set(0, 0.03, 0.02);
    group.add(sup2);

    return { group, muzzleTip: new THREE.Vector3(0, 0.01, -0.30) };
}

// ── Builder Registry ────────────────────────────────────────────────────
const WEAPON_BUILDERS = {
    knife: buildKnife,
    pistol: buildPistol,
    mp40: buildMP40,
    chaingun: buildChaingun,
};

// ── WeaponViewmodel Class ───────────────────────────────────────────────

export class WeaponViewmodel {
    /**
     * @param {import('../engine/renderer.js').Renderer} renderer - Main game renderer instance
     */
    constructor(renderer) {
        /** @type {import('../engine/renderer.js').Renderer} */
        this._renderer = renderer;

        /** @type {string} */
        this._currentWeapon = 'pistol';

        /** @type {boolean} */
        this._visible = true;

        // ── Weapon Scene & Camera ───────────────────────────────────
        this._weaponScene = new THREE.Scene();

        this._weaponCamera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.01,
            10
        );

        // ── Weapon Scene Lighting ───────────────────────────────────
        // Ambient fill (boosted for visibility)
        const ambient = new THREE.AmbientLight(0x404040, 0.8);
        this._weaponScene.add(ambient);

        // Key light: warm upper-right (mimics indoor lighting, boosted)
        const keyLight = new THREE.DirectionalLight(0xffeedd, 1.5);
        keyLight.position.set(1, 1.5, 0.5);
        this._weaponScene.add(keyLight);

        // Fill light: cool lower-left
        const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
        fillLight.position.set(-1, -0.5, 0.5);
        this._weaponScene.add(fillLight);

        // Rim light: subtle back light for silhouette definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
        rimLight.position.set(0, 0.5, 1);
        this._weaponScene.add(rimLight);

        // ── Build All Weapon Models ─────────────────────────────────
        /** @type {Map<string, { group: THREE.Group, muzzleTip: THREE.Vector3 }>} */
        this._weaponModels = new Map();

        for (const name of WEAPON_NAMES) {
            const builder = WEAPON_BUILDERS[name];
            const { group, muzzleTip } = builder();
            group.visible = (name === this._currentWeapon);
            this._weaponScene.add(group);
            this._weaponModels.set(name, { group, muzzleTip });
        }

        // Position all weapons at their default positions
        this._applyWeaponTransforms();

        // ── Animation State ─────────────────────────────────────────
        this._time = 0;

        // Bobbing
        this._isMoving = false;
        this._bobSpeed = 0;
        this._bobPhase = 0;

        // Idle sway
        this._swayOffset = new THREE.Vector3();

        // Fire recoil
        this._isRecoiling = false;
        this._recoilTimer = 0;
        this._recoilPhase = 'none'; // 'none' | 'kick' | 'return'
        this._recoilOffset = new THREE.Vector3();
        this._recoilRotation = 0;

        // Chaingun continuous fire state
        this._chaingUnFiring = false;
        this._chaingUnTimer = 0;

        // Weapon switch
        this._isSwitching = false;
        this._switchPhase = 'none'; // 'none' | 'drop' | 'rise'
        this._switchTimer = 0;
        this._switchTarget = '';
        this._switchOffset = 0;

        // Muzzle flash
        this._flashActive = false;
        this._flashTimer = 0;
        this._flashLight = null;

        // ── Resize Handling ─────────────────────────────────────────
        this._onResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            this._weaponCamera.aspect = aspect;
            this._weaponCamera.updateProjectionMatrix();
        };
        window.addEventListener('resize', this._onResize);
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Switch to a different weapon with drop/rise animation.
     * @param {'knife'|'pistol'|'mp40'|'chaingun'} name
     */
    switchWeapon(name) {
        if (!WEAPON_NAMES.includes(name) || name === this._currentWeapon || this._isSwitching) {
            return;
        }

        this._isSwitching = true;
        this._switchPhase = 'drop';
        this._switchTimer = 0;
        this._switchTarget = name;
        this._switchOffset = 0;

        // Cancel any ongoing recoil
        this._isRecoiling = false;
        this._recoilPhase = 'none';
        this._recoilOffset.set(0, 0, 0);
        this._recoilRotation = 0;
    }

    /**
     * Play the fire/recoil animation for the current weapon.
     */
    playFireAnimation() {
        if (this._isSwitching) return;

        // Start recoil
        this._isRecoiling = true;
        this._recoilPhase = 'kick';
        this._recoilTimer = 0;

        // Chaingun: track continuous fire for vibration
        if (this._currentWeapon === 'chaingun') {
            this._chaingUnFiring = true;
            this._chaingUnTimer = 0;
        }

        // Muzzle flash (not for knife)
        if (this._currentWeapon !== 'knife') {
            this._triggerMuzzleFlash();
        }
    }

    /**
     * Set the bobbing state based on player movement.
     * @param {boolean} isMoving - Whether the player is moving
     * @param {number} [speed=1] - Speed multiplier (0=idle, 1=walk, 1.5=sprint)
     */
    setBobbing(isMoving, speed = 1) {
        this._isMoving = isMoving;
        this._bobSpeed = isMoving ? speed : 0;
    }

    /**
     * Update all animations. Call once per frame.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this._visible) return;

        this._time += dt;

        // Update sub-animations
        this._updateIdleSway(dt);
        this._updateBob(dt);
        this._updateRecoil(dt);
        this._updateSwitch(dt);
        this._updateMuzzleFlash(dt);

        // Apply combined offset to the current weapon model
        this._applyAnimationOffsets();
    }

    /**
     * Render the weapon overlay on top of the main scene.
     * Uses clearDepth trick so the weapon always renders in front.
     */
    render() {
        if (!this._visible) return;

        const gl = this._renderer.webGLRenderer;

        // Render weapon scene on top: don't clear color, only clear depth
        gl.autoClear = false;
        gl.clearDepth();
        gl.render(this._weaponScene, this._weaponCamera);
        gl.autoClear = true;
    }

    /**
     * Show or hide the weapon viewmodel.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this._visible = visible;
        // Also hide all weapon groups
        for (const { group } of this._weaponModels.values()) {
            group.visible = visible && (this._weaponModels.get(this._currentWeapon).group === group);
        }
    }

    /**
     * Clean up all resources.
     */
    dispose() {
        window.removeEventListener('resize', this._onResize);

        // Remove muzzle flash light if active
        this._cleanupMuzzleFlash();

        // Dispose weapon geometries and materials
        for (const { group } of this._weaponModels.values()) {
            group.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material.dispose) child.material.dispose();
                }
            });
            this._weaponScene.remove(group);
        }
        this._weaponModels.clear();
    }

    // ── Private: Transform Helpers ──────────────────────────────────────

    /**
     * Set each weapon group to its default position and rotation.
     */
    _applyWeaponTransforms() {
        for (const name of WEAPON_NAMES) {
            const entry = this._weaponModels.get(name);
            if (!entry) continue;
            const pos = WEAPON_POSITIONS[name];
            const rot = WEAPON_ROTATIONS[name];
            entry.group.position.copy(pos);
            entry.group.rotation.copy(rot);
        }
    }

    /**
     * Apply combined sway + bob + recoil + switch offsets to the active weapon.
     */
    _applyAnimationOffsets() {
        const entry = this._weaponModels.get(this._currentWeapon);
        if (!entry) return;

        const basePos = WEAPON_POSITIONS[this._currentWeapon];
        const baseRot = WEAPON_ROTATIONS[this._currentWeapon];

        // Combine all offsets
        entry.group.position.set(
            basePos.x + this._swayOffset.x + this._recoilOffset.x,
            basePos.y + this._swayOffset.y + this._recoilOffset.y + this._switchOffset,
            basePos.z + this._swayOffset.z + this._recoilOffset.z
        );

        entry.group.rotation.set(
            baseRot.x - this._recoilRotation, // Tilt up on recoil
            baseRot.y,
            baseRot.z
        );

        // Chaingun vibration while firing
        if (this._currentWeapon === 'chaingun' && this._chaingUnFiring) {
            entry.group.position.x += (Math.random() - 0.5) * CHAINGUN_VIBRATION_AMP * 2;
            entry.group.position.y += (Math.random() - 0.5) * CHAINGUN_VIBRATION_AMP * 2;
        }
    }

    // ── Private: Animation Updates ──────────────────────────────────────

    /**
     * Subtle idle sway — gentle sine wave even when standing still.
     */
    _updateIdleSway(_dt) {
        const t = this._time;
        this._swayOffset.x = Math.sin(t * SWAY_SPEED * Math.PI * 2) * SWAY_AMPLITUDE;
        this._swayOffset.y = Math.sin(t * SWAY_SPEED * Math.PI * 2 * 0.7) * SWAY_AMPLITUDE * 0.5;
    }

    /**
     * Walk bob: figure-8 pattern that increases with movement speed.
     */
    _updateBob(dt) {
        if (!this._isMoving || this._bobSpeed <= 0) {
            // Smoothly return to center when stopping
            this._swayOffset.x *= 0.9;
            this._swayOffset.y *= 0.9;
            return;
        }

        this._bobPhase += dt * BOB_SPEED_BASE * this._bobSpeed;

        const amplitude = this._bobSpeed;
        const bobX = Math.sin(this._bobPhase) * BOB_AMPLITUDE_X * amplitude;
        const bobY = Math.sin(this._bobPhase * 2) * BOB_AMPLITUDE_Y * amplitude;

        // Add to sway offset (sway becomes bob when moving)
        this._swayOffset.x = bobX;
        this._swayOffset.y = bobY;
    }

    /**
     * Fire recoil: weapon kicks up/back, then smoothly returns.
     */
    _updateRecoil(dt) {
        if (!this._isRecoiling) {
            // Smoothly decay any remaining recoil
            this._recoilOffset.multiplyScalar(0.85);
            this._recoilRotation *= 0.85;

            // Stop chaingun vibration after brief delay
            if (this._chaingUnFiring) {
                this._chaingUnTimer += dt;
                if (this._chaingUnTimer > 0.1) {
                    this._chaingUnFiring = false;
                }
            }
            return;
        }

        this._recoilTimer += dt;

        if (this._recoilPhase === 'kick') {
            // Quick snap to peak recoil
            const t = Math.min(this._recoilTimer / RECOIL_KICK_TIME, 1.0);
            const easeOut = 1 - Math.pow(1 - t, 3); // Cubic ease-out for snappy feel

            this._recoilOffset.x = 0;
            this._recoilOffset.y = RECOIL_POS.y * easeOut;
            this._recoilOffset.z = RECOIL_POS.z * easeOut;
            this._recoilRotation = RECOIL_ANGLE * easeOut;

            if (t >= 1.0) {
                this._recoilPhase = 'return';
                this._recoilTimer = 0;
            }
        } else if (this._recoilPhase === 'return') {
            // Smooth return to resting position
            const t = Math.min(this._recoilTimer / RECOIL_RETURN_TIME, 1.0);
            const easeIn = t * t; // Quadratic ease-in for smooth settle

            this._recoilOffset.y = RECOIL_POS.y * (1 - easeIn);
            this._recoilOffset.z = RECOIL_POS.z * (1 - easeIn);
            this._recoilRotation = RECOIL_ANGLE * (1 - easeIn);

            if (t >= 1.0) {
                this._isRecoiling = false;
                this._recoilPhase = 'none';
                this._recoilOffset.set(0, 0, 0);
                this._recoilRotation = 0;
            }
        }
    }

    /**
     * Weapon switch: drop out, swap model, rise back.
     */
    _updateSwitch(dt) {
        if (!this._isSwitching) return;

        this._switchTimer += dt;

        if (this._switchPhase === 'drop') {
            const t = Math.min(this._switchTimer / SWITCH_DROP_TIME, 1.0);
            const easeIn = t * t; // Accelerate downward
            this._switchOffset = -SWITCH_DROP_DISTANCE * easeIn;

            if (t >= 1.0) {
                // Swap the visible weapon
                const oldEntry = this._weaponModels.get(this._currentWeapon);
                if (oldEntry) oldEntry.group.visible = false;

                this._currentWeapon = this._switchTarget;

                const newEntry = this._weaponModels.get(this._currentWeapon);
                if (newEntry) newEntry.group.visible = true;

                // Start rise
                this._switchPhase = 'rise';
                this._switchTimer = 0;
            }
        } else if (this._switchPhase === 'rise') {
            const t = Math.min(this._switchTimer / SWITCH_RISE_TIME, 1.0);
            const easeOut = 1 - Math.pow(1 - t, 2); // Decelerate upward
            this._switchOffset = -SWITCH_DROP_DISTANCE * (1 - easeOut);

            if (t >= 1.0) {
                this._isSwitching = false;
                this._switchPhase = 'none';
                this._switchOffset = 0;
            }
        }
    }

    // ── Private: Muzzle Flash ───────────────────────────────────────────

    /**
     * Trigger a muzzle flash: add a point light to the main scene.
     */
    _triggerMuzzleFlash() {
        // Remove previous flash if still active
        this._cleanupMuzzleFlash();

        // Get barrel tip position in world space (approximate)
        const cameraPos = this._renderer.camera.position;
        const cameraDir = new THREE.Vector3(0, 0, -1);
        cameraDir.applyQuaternion(this._renderer.camera.quaternion);

        // Flash position: at camera + slight forward offset (lights up the area)
        const flashPos = new THREE.Vector3(
            cameraPos.x + cameraDir.x * 0.8,
            cameraPos.y - 0.05,
            cameraPos.z + cameraDir.z * 0.8
        );

        this._flashLight = this._renderer.addPointLight('muzzle_flash', {
            color: 0xffaa44, // Warm orange-yellow
            intensity: FLASH_INTENSITY,
            distance: 12, // Large range — lights up a big area
            decay: 2,
            position: flashPos,
        });

        this._flashActive = true;
        this._flashTimer = 0;
    }

    /**
     * Update and decay the muzzle flash.
     */
    _updateMuzzleFlash(dt) {
        if (!this._flashActive) return;

        this._flashTimer += dt;

        if (this._flashTimer >= FLASH_DURATION) {
            this._cleanupMuzzleFlash();
        } else {
            // Rapid decay
            const t = this._flashTimer / FLASH_DURATION;
            if (this._flashLight) {
                let intensity = FLASH_INTENSITY * (1 - t);

                // Chaingun: rapid pulsing flicker between 3 and 5
                if (this._currentWeapon === 'chaingun' && this._chaingUnFiring) {
                    intensity = 3.0 + Math.random() * 2.0;
                }

                this._flashLight.intensity = intensity;
            }
        }
    }

    /**
     * Remove the muzzle flash light from the main scene.
     */
    _cleanupMuzzleFlash() {
        if (this._flashActive) {
            this._renderer.removePointLight('muzzle_flash');
            this._flashLight = null;
            this._flashActive = false;
            this._flashTimer = 0;
        }
    }
}
