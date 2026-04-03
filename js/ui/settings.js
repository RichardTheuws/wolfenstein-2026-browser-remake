/**
 * settings.js — Settings / Options Panel
 *
 * Provides a settings screen accessible from both the main menu and pause menu.
 * Controls brightness, crosshair style, audio volumes, and mouse sensitivity.
 * Persists settings to localStorage.
 */

const STORAGE_KEY = 'wolfenstein3d-settings';

/** Default settings values */
const DEFAULTS = {
    brightness: 1.0,
    crosshair: 'dot',
    crtFilter: false,
    soundOff: false,
    masterVolume: 0.8,
    musicVolume: 0.4,
    sfxVolume: 0.9,
    sensitivity: 0.002,
    playerName: '',
};

export class Settings {
    /**
     * @param {import('../engine/renderer.js').Renderer} renderer
     * @param {import('../audio/audio-manager.js').AudioManager} audioManager
     * @param {import('../engine/input.js').InputManager} inputManager
     */
    constructor(renderer, audioManager, inputManager) {
        /** @type {import('../engine/renderer.js').Renderer} */
        this._renderer = renderer;

        /** @type {import('../audio/audio-manager.js').AudioManager} */
        this._audioManager = audioManager;

        /** @type {import('../engine/input.js').InputManager} */
        this._inputManager = inputManager;

        /** Current settings object */
        this._settings = { ...DEFAULTS };

        /** @type {HTMLElement|null} */
        this._el = null;

        /** @type {Function|null} Callback when back button pressed */
        this._onBackCallback = null;

        // Build DOM
        this._buildDOM();

        // Load persisted settings
        this._loadSettings();

        // Apply loaded settings to all systems
        this.applySettings();
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Show the settings screen.
     */
    show() {
        if (this._el) this._el.classList.remove('hidden');
    }

    /**
     * Hide the settings screen.
     */
    hide() {
        if (this._el) this._el.classList.add('hidden');
    }

    /**
     * Register a callback for the back button.
     * @param {Function} callback
     */
    onBack(callback) {
        this._onBackCallback = callback;
    }

    /**
     * Apply all current settings to the game systems.
     */
    applySettings() {
        const s = this._settings;

        // Brightness: adjust ambient light intensity and CSS filter
        if (this._renderer) {
            // Base ambient is 1.2 (from renderer constructor). Scale by brightness.
            this._renderer.setAmbientLight(0x606060, 1.2 * s.brightness);

            // Apply CSS brightness filter to the game canvas
            const canvas = this._renderer.webGLRenderer.domElement;
            if (canvas) {
                canvas.style.filter = s.brightness !== 1.0
                    ? `brightness(${s.brightness})`
                    : '';
            }
        }

        // CRT Filter
        if (this._renderer && this._renderer.setCRTEnabled) {
            this._renderer.setCRTEnabled(s.crtFilter);
        }

        // Crosshair
        const crosshairEl = document.getElementById('crosshair');
        if (crosshairEl) {
            if (s.crosshair === 'off') {
                crosshairEl.classList.add('hidden');
            } else {
                // Don't remove hidden if the game isn't active (showScreen manages that)
                crosshairEl.classList.toggle('crosshair-cross', s.crosshair === 'cross');
            }
        }

        // Audio
        if (this._audioManager) {
            if (s.soundOff) {
                this._audioManager.setMasterVolume(0);
            } else {
                this._audioManager.setMasterVolume(s.masterVolume);
            }
            this._audioManager.setMusicVolume(s.musicVolume);
            this._audioManager.setSFXVolume(s.sfxVolume);
        }

        // Mouse sensitivity
        if (this._inputManager) {
            this._inputManager.mouseSensitivity = s.sensitivity;
        }

        // Persist
        this._saveSettings();
    }

    /**
     * Get the current crosshair style.
     * @returns {'dot'|'cross'|'off'}
     */
    getCrosshairStyle() {
        return this._settings.crosshair;
    }

    /**
     * Clean up DOM and event listeners.
     */
    dispose() {
        if (this._el && this._el.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
        this._el = null;
        this._onBackCallback = null;
    }

    // ── Private: DOM Construction ───────────────────────────────────────

    _buildDOM() {
        const el = document.createElement('div');
        el.id = 'settings-screen';
        el.className = 'screen hidden';

        el.innerHTML = `
            <div class="screen-inner settings-panel">
                <h2 class="screen-title">OPTIONS</h2>

                <div class="settings-group">
                    <h3 class="settings-group-title">Display</h3>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-brightness">Brightness</label>
                        <input type="range" class="setting-range" id="setting-brightness"
                               min="0.5" max="2.0" step="0.1" value="1.0">
                        <span class="setting-value" data-for="setting-brightness">100%</span>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-crosshair">Crosshair</label>
                        <select class="setting-select" id="setting-crosshair">
                            <option value="dot">Dot</option>
                            <option value="cross">Cross</option>
                            <option value="off">Off</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-crt">CRT Filter</label>
                        <label class="setting-toggle">
                            <input type="checkbox" id="setting-crt">
                            <span class="setting-toggle-label" data-for="setting-crt">Off</span>
                        </label>
                    </div>
                </div>

                <div class="settings-group">
                    <h3 class="settings-group-title">Audio</h3>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-sound-off">Sound</label>
                        <label class="setting-toggle">
                            <input type="checkbox" id="setting-sound-off">
                            <span class="setting-toggle-label" data-for="setting-sound-off">On</span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-master">Master Volume</label>
                        <input type="range" class="setting-range" id="setting-master"
                               min="0" max="1" step="0.05" value="0.8">
                        <span class="setting-value" data-for="setting-master">80%</span>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-music">Music</label>
                        <input type="range" class="setting-range" id="setting-music"
                               min="0" max="1" step="0.05" value="0.4">
                        <span class="setting-value" data-for="setting-music">40%</span>
                    </div>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-sfx">SFX</label>
                        <input type="range" class="setting-range" id="setting-sfx"
                               min="0" max="1" step="0.05" value="0.9">
                        <span class="setting-value" data-for="setting-sfx">90%</span>
                    </div>
                </div>

                <div class="settings-group">
                    <h3 class="settings-group-title">Controls</h3>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-sensitivity">Mouse Sensitivity</label>
                        <input type="range" class="setting-range" id="setting-sensitivity"
                               min="0.0005" max="0.005" step="0.0005" value="0.002">
                        <span class="setting-value" data-for="setting-sensitivity">Medium</span>
                    </div>
                </div>

                <div class="settings-group">
                    <h3 class="settings-group-title">Player</h3>
                    <div class="setting-row">
                        <label class="setting-label" for="setting-playername">Name (High Scores)</label>
                        <input type="text" class="setting-select" id="setting-playername"
                               maxlength="20" placeholder="BJ" style="text-transform: uppercase; letter-spacing: 1px; width: 140px; text-align: center;">
                    </div>
                </div>

                <button class="btn btn-primary" id="settings-back">BACK</button>
            </div>
        `;

        document.body.appendChild(el);
        this._el = el;

        // Wire up controls
        this._wireControls();
    }

    _wireControls() {
        const el = this._el;
        if (!el) return;

        // Brightness
        const brightness = el.querySelector('#setting-brightness');
        if (brightness) {
            brightness.addEventListener('input', () => {
                this._settings.brightness = parseFloat(brightness.value);
                this._updateValueDisplay('setting-brightness', Math.round(this._settings.brightness * 100) + '%');
                this.applySettings();
            });
        }

        // Crosshair
        const crosshairSelect = el.querySelector('#setting-crosshair');
        if (crosshairSelect) {
            crosshairSelect.addEventListener('change', () => {
                this._settings.crosshair = crosshairSelect.value;
                this.applySettings();
            });
        }

        // CRT Filter toggle
        const crtCheckbox = el.querySelector('#setting-crt');
        if (crtCheckbox) {
            crtCheckbox.addEventListener('change', () => {
                this._settings.crtFilter = crtCheckbox.checked;
                const label = el.querySelector('.setting-toggle-label[data-for="setting-crt"]');
                if (label) label.textContent = crtCheckbox.checked ? 'On' : 'Off';
                this.applySettings();
            });
        }

        // Master volume
        const master = el.querySelector('#setting-master');
        if (master) {
            master.addEventListener('input', () => {
                this._settings.masterVolume = parseFloat(master.value);
                this._updateValueDisplay('setting-master', Math.round(this._settings.masterVolume * 100) + '%');
                this.applySettings();
            });
        }

        // Music volume
        const music = el.querySelector('#setting-music');
        if (music) {
            music.addEventListener('input', () => {
                this._settings.musicVolume = parseFloat(music.value);
                this._updateValueDisplay('setting-music', Math.round(this._settings.musicVolume * 100) + '%');
                this.applySettings();
            });
        }

        // SFX volume
        const sfx = el.querySelector('#setting-sfx');
        if (sfx) {
            sfx.addEventListener('input', () => {
                this._settings.sfxVolume = parseFloat(sfx.value);
                this._updateValueDisplay('setting-sfx', Math.round(this._settings.sfxVolume * 100) + '%');
                this.applySettings();
            });
        }

        // Sensitivity
        const sensitivity = el.querySelector('#setting-sensitivity');
        if (sensitivity) {
            sensitivity.addEventListener('input', () => {
                this._settings.sensitivity = parseFloat(sensitivity.value);
                this._updateValueDisplay('setting-sensitivity', this._sensitivityLabel(this._settings.sensitivity));
                this.applySettings();
            });
        }

        // Sound Off toggle
        const soundOff = el.querySelector('#setting-sound-off');
        if (soundOff) {
            soundOff.addEventListener('change', () => {
                this._settings.soundOff = soundOff.checked;
                const label = el.querySelector('.setting-toggle-label[data-for="setting-sound-off"]');
                if (label) label.textContent = soundOff.checked ? 'Off' : 'On';
                this.applySettings();
            });
        }

        // Player name
        const playerName = el.querySelector('#setting-playername');
        if (playerName) {
            playerName.addEventListener('input', () => {
                this._settings.playerName = playerName.value.trim().substring(0, 20);
                // Sync to leaderboard localStorage key
                if (this._settings.playerName) {
                    localStorage.setItem('wolf3d-player-name', this._settings.playerName);
                }
                this._saveSettings();
            });
            playerName.addEventListener('keydown', (e) => e.stopPropagation());
        }

        // Back button
        const backBtn = el.querySelector('#settings-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
                if (this._onBackCallback) this._onBackCallback();
            });
        }
    }

    /**
     * Update the displayed value next to a slider.
     * @param {string} inputId - The id of the input element
     * @param {string} text - The text to display
     */
    _updateValueDisplay(inputId, text) {
        const span = this._el?.querySelector(`.setting-value[data-for="${inputId}"]`);
        if (span) span.textContent = text;
    }

    /**
     * Return a human-readable sensitivity label.
     * @param {number} value
     * @returns {string}
     */
    _sensitivityLabel(value) {
        if (value <= 0.001) return 'Low';
        if (value <= 0.002) return 'Medium';
        if (value <= 0.003) return 'High';
        return 'Very High';
    }

    // ── Private: Persistence ────────────────────────────────────────────

    _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
        } catch {
            // localStorage might be unavailable
        }
    }

    _loadSettings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults so new settings always exist
                this._settings = { ...DEFAULTS, ...parsed };
            }
        } catch {
            // Corrupted or unavailable — use defaults
            this._settings = { ...DEFAULTS };
        }

        // Sync DOM inputs with loaded settings
        this._syncDOM();
    }

    /**
     * Update all DOM inputs to reflect current settings.
     */
    _syncDOM() {
        const el = this._el;
        if (!el) return;

        const s = this._settings;

        const brightness = el.querySelector('#setting-brightness');
        if (brightness) {
            brightness.value = s.brightness;
            this._updateValueDisplay('setting-brightness', Math.round(s.brightness * 100) + '%');
        }

        const crosshairSelect = el.querySelector('#setting-crosshair');
        if (crosshairSelect) crosshairSelect.value = s.crosshair;

        const crtCheckbox = el.querySelector('#setting-crt');
        if (crtCheckbox) {
            crtCheckbox.checked = s.crtFilter;
            const label = el.querySelector('.setting-toggle-label[data-for="setting-crt"]');
            if (label) label.textContent = s.crtFilter ? 'On' : 'Off';
        }

        const master = el.querySelector('#setting-master');
        if (master) {
            master.value = s.masterVolume;
            this._updateValueDisplay('setting-master', Math.round(s.masterVolume * 100) + '%');
        }

        const music = el.querySelector('#setting-music');
        if (music) {
            music.value = s.musicVolume;
            this._updateValueDisplay('setting-music', Math.round(s.musicVolume * 100) + '%');
        }

        const sfx = el.querySelector('#setting-sfx');
        if (sfx) {
            sfx.value = s.sfxVolume;
            this._updateValueDisplay('setting-sfx', Math.round(s.sfxVolume * 100) + '%');
        }

        const sensitivity = el.querySelector('#setting-sensitivity');
        if (sensitivity) {
            sensitivity.value = s.sensitivity;
            this._updateValueDisplay('setting-sensitivity', this._sensitivityLabel(s.sensitivity));
        }

        const soundOff = el.querySelector('#setting-sound-off');
        if (soundOff) {
            soundOff.checked = s.soundOff;
            const label = el.querySelector('.setting-toggle-label[data-for="setting-sound-off"]');
            if (label) label.textContent = s.soundOff ? 'Off' : 'On';
        }

        const playerName = el.querySelector('#setting-playername');
        if (playerName) {
            // Load from settings first, fall back to leaderboard localStorage
            playerName.value = s.playerName || localStorage.getItem('wolf3d-player-name') || '';
        }
    }
}
