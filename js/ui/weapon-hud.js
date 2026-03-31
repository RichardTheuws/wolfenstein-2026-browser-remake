/**
 * weapon-hud.js — First-person weapon display
 *
 * HTML/CSS overlay at the bottom center of the screen showing the current weapon.
 * Uses CSS classes for placeholder weapon visuals (Phase 2).
 * Animations: walk bob, fire flash, weapon switch — all CSS-driven.
 */

import { eventBus } from '../engine/event-bus.js';

const WEAPONS = ['knife', 'pistol', 'mp40', 'chaingun'];

export class WeaponHUD {
    constructor() {
        /** @type {string} */
        this._currentWeapon = 'pistol';

        /** @type {boolean} */
        this._isBobbing = false;

        /** @type {boolean} */
        this._isSwitching = false;

        /** @type {boolean} */
        this._visible = true;

        // --- Sprite image paths ---
        this._spritePaths = {
            knife: 'assets/sprites/weapons/knife.png',
            pistol: 'assets/sprites/weapons/pistol.png',
            mp40: 'assets/sprites/weapons/mp40.png',
            chaingun: 'assets/sprites/weapons/chaingun.png',
        };

        // --- Build DOM ---
        this._container = document.createElement('div');
        this._container.id = 'weapon-display';

        this._sprite = document.createElement('div');
        this._sprite.id = 'weapon-sprite';
        this._sprite.className = 'weapon-pistol';

        this._img = document.createElement('img');
        this._img.id = 'weapon-img';
        this._img.src = this._spritePaths[this._currentWeapon];
        this._img.alt = this._currentWeapon;
        this._img.draggable = false;

        this._sprite.appendChild(this._img);
        this._container.appendChild(this._sprite);
        document.body.appendChild(this._container);
    }

    /**
     * Switch to a different weapon with drop/rise animation.
     * @param {'knife'|'pistol'|'mp40'|'chaingun'} name
     */
    switchWeapon(name) {
        if (!WEAPONS.includes(name) || name === this._currentWeapon || this._isSwitching) {
            return;
        }

        this._isSwitching = true;

        // Drop current weapon
        this._sprite.classList.add('weapon-switching-out');

        // After drop completes, swap class and rise
        const onDropEnd = () => {
            this._sprite.removeEventListener('transitionend', onDropEnd);
            this._sprite.classList.remove('weapon-switching-out');

            // Swap weapon class and image
            this._sprite.classList.remove(`weapon-${this._currentWeapon}`);
            this._currentWeapon = name;
            this._sprite.classList.add(`weapon-${this._currentWeapon}`);
            this._img.src = this._spritePaths[this._currentWeapon];
            this._img.alt = this._currentWeapon;

            // Force reflow so the rise transition triggers
            void this._sprite.offsetHeight;

            this._sprite.classList.add('weapon-switching-in');

            const onRiseEnd = () => {
                this._sprite.removeEventListener('transitionend', onRiseEnd);
                this._sprite.classList.remove('weapon-switching-in');
                this._isSwitching = false;
            };
            this._sprite.addEventListener('transitionend', onRiseEnd, { once: false });

            // Safety timeout in case transitionend doesn't fire
            setTimeout(() => {
                this._sprite.classList.remove('weapon-switching-in');
                this._isSwitching = false;
            }, 200);
        };

        this._sprite.addEventListener('transitionend', onDropEnd, { once: false });

        // Safety timeout for the drop
        setTimeout(() => {
            if (this._isSwitching && this._sprite.classList.contains('weapon-switching-out')) {
                onDropEnd();
            }
        }, 200);
    }

    /**
     * Play the fire flash animation (brief scale + flash).
     */
    playFireAnimation() {
        if (this._isSwitching) return;

        // Remove class first to allow re-trigger
        this._sprite.classList.remove('weapon-firing');
        void this._sprite.offsetHeight;
        this._sprite.classList.add('weapon-firing');

        // Clean up after animation completes
        setTimeout(() => {
            this._sprite.classList.remove('weapon-firing');
        }, 120);
    }

    /**
     * Enable/disable the walk bob animation.
     * @param {boolean} isMoving
     */
    setBobbing(isMoving) {
        if (isMoving === this._isBobbing) return;
        this._isBobbing = isMoving;

        if (isMoving) {
            this._sprite.classList.add('weapon-bobbing');
        } else {
            this._sprite.classList.remove('weapon-bobbing');
        }
    }

    /**
     * Show or hide the weapon display.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this._visible = visible;
        this._container.style.display = visible ? '' : 'none';
    }

    /**
     * Clean up DOM elements and references.
     */
    dispose() {
        this._sprite.classList.remove('weapon-bobbing', 'weapon-firing', 'weapon-switching-out', 'weapon-switching-in');
        if (this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        this._container = null;
        this._sprite = null;
        this._img = null;
    }
}
