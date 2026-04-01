/**
 * audio-manager.js — Web Audio API Manager
 *
 * Manages all game audio through three independent gain buses (music, SFX,
 * voice) under a single master gain. Handles iOS AudioContext unlock,
 * crossfading, positional SFX volume falloff, and graceful error handling
 * for missing audio files.
 *
 * Audio Bus Architecture:
 *   AudioContext.destination
 *     └── Master Gain
 *           ├── Music Gain  (default 0.4)
 *           ├── SFX Gain    (default 0.7)
 *           └── Voice Gain  (default 0.8)
 */

import { eventBus } from '../engine/event-bus.js';

// ── Track Mapping ───────────────────────────────────────────────────────────

const MUSIC_TRACKS = {
    'menu':       'assets/audio/music/menu_theme.mp3',
    'e1_combat':  'assets/audio/music/e1_combat.mp3',
    'e1_explore': 'assets/audio/music/e1_exploration.mp3',
    'e2_theme':   'assets/audio/music/e2_theme.mp3',
    'e2_explore': 'assets/audio/music/e2_theme.mp3',
    'e2_combat':  'assets/audio/music/e2_theme.mp3',
    'e3_theme':   'assets/audio/music/e3_theme.mp3',
    'e3_explore': 'assets/audio/music/e3_theme.mp3',
    'e3_combat':  'assets/audio/music/e3_theme.mp3',
    'boss':       'assets/audio/music/boss_battle.mp3',
    'explore':    'assets/audio/music/exploration.mp3',
    'victory':    'assets/audio/music/victory.mp3',
    'gameover':   'assets/audio/music/gameover.mp3',
    'secret':     'assets/audio/music/secret.mp3',
    'credits':    'assets/audio/music/credits.mp3',
};

// ── AudioManager ────────────────────────────────────────────────────────────

export class AudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this._ctx = null;

        // ── Gain Nodes (created lazily in _ensureContext) ───────────
        /** @type {GainNode|null} */
        this._masterGain = null;
        /** @type {GainNode|null} */
        this._musicGain = null;
        /** @type {GainNode|null} */
        this._sfxGain = null;
        /** @type {GainNode|null} */
        this._voiceGain = null;

        // ── Volume Levels (stored so they survive context recreation) ──
        this._masterVolume = 1.0;
        this._musicVolume = 0.3;
        this._sfxVolume = 1.0;
        this._voiceVolume = 1.0;

        // ── Buffer Cache ────────────────────────────────────────────
        /** @type {Map<string, AudioBuffer>} */
        this._buffers = new Map();

        // ── Currently Playing ───────────────────────────────────────
        /** @type {{source: AudioBufferSourceNode, gain: GainNode, name: string}|null} */
        this._currentMusic = null;

        /** @type {AudioBufferSourceNode|null} */
        this._currentVoice = null;

        /** @type {{source: AudioBufferSourceNode, gain: GainNode}|null} Ambient loop */
        this._ambientLoop = null;

        // ── iOS Unlock ──────────────────────────────────────────────
        this._unlocked = false;
        this._unlockHandler = this._handleUserInteraction.bind(this);
        document.addEventListener('click', this._unlockHandler, { once: false });
        document.addEventListener('touchstart', this._unlockHandler, { once: false });

        // ── Event Listeners (placeholders until SFX files exist) ────
        this._onWeaponFire = () => {};
        this._onPickupCollect = () => {};
        this._onEnemyDeath = () => {};

        eventBus.on('weapon:fire', this._onWeaponFire);
        eventBus.on('pickup:collect', this._onPickupCollect);
        eventBus.on('enemy:death', this._onEnemyDeath);
    }

    // ── Music System ────────────────────────────────────────────────────

    /**
     * Load a music track by name. Uses the built-in MUSIC_TRACKS mapping.
     * Can also load arbitrary URLs via the url parameter.
     * @param {string} name - Track name (key in MUSIC_TRACKS) or custom name
     * @param {string} [url] - Optional URL override. If omitted, looks up MUSIC_TRACKS.
     * @returns {Promise<void>}
     */
    async loadTrack(name, url) {
        const resolvedUrl = url || MUSIC_TRACKS[name];
        if (!resolvedUrl) {
            console.warn(`[AudioManager] No URL for track "${name}"`);
            return;
        }
        await this._loadBuffer(name, resolvedUrl);
    }

    /**
     * Play a music track. Stops the current track first.
     * @param {string} name - Track name
     * @param {boolean} [loop=true] - Whether the track loops
     * @param {number} [fadeInDuration=1.0] - Fade-in time in seconds
     */
    playMusic(name, loop = true, fadeInDuration = 1.0) {
        this._ensureContext();
        if (!this._ctx) return;

        // Resume if suspended
        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }

        const buffer = this._buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Track "${name}" not loaded. Call loadTrack() first.`);
            return;
        }

        // Stop current track immediately
        this._stopMusicImmediate();

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        // Per-track gain for crossfade control
        const trackGain = this._ctx.createGain();
        trackGain.gain.setValueAtTime(0, this._ctx.currentTime);
        trackGain.gain.linearRampToValueAtTime(1.0, this._ctx.currentTime + fadeInDuration);

        source.connect(trackGain);
        trackGain.connect(this._musicGain);
        source.start(0);

        this._currentMusic = { source, gain: trackGain, name };

        // Clean up reference when track ends naturally
        source.onended = () => {
            if (this._currentMusic && this._currentMusic.source === source) {
                this._currentMusic = null;
            }
        };
    }

    /**
     * Fade out and stop the currently playing music track.
     * @param {number} [fadeOutDuration=1.0] - Fade-out time in seconds
     */
    stopMusic(fadeOutDuration = 1.0) {
        if (!this._currentMusic || !this._ctx) return;

        const { source, gain } = this._currentMusic;
        const now = this._ctx.currentTime;

        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);

        // Schedule stop after fade completes
        const capturedMusic = this._currentMusic;
        setTimeout(() => {
            try {
                capturedMusic.source.stop();
            } catch (_) {
                // Already stopped — ignore
            }
        }, fadeOutDuration * 1000 + 50);

        this._currentMusic = null;
    }

    /**
     * Crossfade from the current music track to a new one.
     * @param {string} name - New track name
     * @param {number} [duration=2.0] - Crossfade duration in seconds
     */
    crossfadeTo(name, duration = 2.0) {
        this._ensureContext();
        if (!this._ctx) return;

        const buffer = this._buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Track "${name}" not loaded for crossfade.`);
            return;
        }

        const now = this._ctx.currentTime;

        // Fade out old track
        if (this._currentMusic) {
            const old = this._currentMusic;
            old.gain.gain.cancelScheduledValues(now);
            old.gain.gain.setValueAtTime(old.gain.gain.value, now);
            old.gain.gain.linearRampToValueAtTime(0, now + duration);

            setTimeout(() => {
                try {
                    old.source.stop();
                } catch (_) {
                    // Already stopped
                }
            }, duration * 1000 + 50);
        }

        // Start new track with fade in
        const source = this._ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const trackGain = this._ctx.createGain();
        trackGain.gain.setValueAtTime(0, now);
        trackGain.gain.linearRampToValueAtTime(1.0, now + duration);

        source.connect(trackGain);
        trackGain.connect(this._musicGain);
        source.start(0);

        this._currentMusic = { source, gain: trackGain, name };

        source.onended = () => {
            if (this._currentMusic && this._currentMusic.source === source) {
                this._currentMusic = null;
            }
        };
    }

    /**
     * Set the music bus volume.
     * @param {number} volume - 0 to 1
     */
    setMusicVolume(volume) {
        this._musicVolume = Math.max(0, Math.min(1, volume));
        if (this._musicGain) {
            this._musicGain.gain.setValueAtTime(this._musicVolume, this._ctx.currentTime);
        }
    }

    // ── SFX System ──────────────────────────────────────────────────────

    /**
     * Load a sound effect.
     * @param {string} name - SFX identifier
     * @param {string} url - URL to audio file
     * @returns {Promise<void>}
     */
    async loadSFX(name, url) {
        await this._loadBuffer(name, url);
    }

    /**
     * Play a sound effect (fire-and-forget).
     * @param {string} name - SFX identifier (must be loaded)
     * @param {number} [volume=1.0] - Per-instance volume multiplier (0-1)
     */
    playSFX(name, volume = 1.0) {
        this._ensureContext();
        if (!this._ctx) return;

        // Resume if suspended (can happen after pointer lock changes)
        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }

        const buffer = this._buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] SFX "${name}" not loaded.`);
            return;
        }

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;

        const instanceGain = this._ctx.createGain();
        instanceGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this._ctx.currentTime);

        source.connect(instanceGain);
        instanceGain.connect(this._sfxGain);
        source.start(0);
    }

    /**
     * Play a sound effect with pitch variation (fire-and-forget).
     * @param {string} name - SFX identifier (must be loaded)
     * @param {number} [volume=1.0] - Per-instance volume multiplier (0-1)
     * @param {number} [pitch=1.0] - Playback rate (0.5 = half speed, 2.0 = double speed)
     */
    playSFXWithPitch(name, volume = 1.0, pitch = 1.0) {
        this._ensureContext();
        if (!this._ctx) return;

        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }

        const buffer = this._buffers.get(name);
        if (!buffer) return;

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(pitch, this._ctx.currentTime);

        const instanceGain = this._ctx.createGain();
        instanceGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this._ctx.currentTime);

        source.connect(instanceGain);
        instanceGain.connect(this._sfxGain);
        source.start(0);
    }

    /**
     * Play a sound effect with distance-based volume falloff.
     * @param {string} name - SFX identifier
     * @param {number} x - Source world X
     * @param {number} z - Source world Z
     * @param {number} listenerX - Listener world X
     * @param {number} listenerZ - Listener world Z
     * @param {number} [maxDistance=20] - Distance at which the sound is silent
     * @param {number} [volumeBoost=1.0] - Multiplier applied on top of distance falloff (e.g. 1.2 for alert voices)
     */
    playSFXAtPosition(name, x, z, listenerX, listenerZ, maxDistance = 20, volumeBoost = 1.0) {
        const dx = x - listenerX;
        const dz = z - listenerZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance >= maxDistance) return; // Too far, don't bother

        // Linear falloff with minimum volume floor so voices are always audible
        const MIN_VOLUME = 0.5;
        const falloff = 1.0 - (distance / maxDistance);
        const volume = Math.min(1.0, (MIN_VOLUME + falloff * (1.0 - MIN_VOLUME)) * volumeBoost);
        this.playSFX(name, volume);
    }

    /**
     * Set the SFX bus volume.
     * @param {number} volume - 0 to 1
     */
    setSFXVolume(volume) {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        if (this._sfxGain) {
            this._sfxGain.gain.setValueAtTime(this._sfxVolume, this._ctx.currentTime);
        }
    }

    // ── Ambient Loop System ────────────────────────────────────────────

    /**
     * Play an SFX as a looping ambient sound at a fixed volume.
     * Only one ambient loop can play at a time.
     * @param {string} name - SFX identifier (must be loaded)
     * @param {number} [volume=0.15] - Volume level (0-1)
     */
    playAmbientLoop(name, volume = 0.15) {
        this._ensureContext();
        if (!this._ctx) return;

        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }

        // Stop existing ambient loop
        this.stopAmbientLoop();

        const buffer = this._buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Ambient loop "${name}" not loaded.`);
            return;
        }

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const loopGain = this._ctx.createGain();
        loopGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this._ctx.currentTime);

        source.connect(loopGain);
        loopGain.connect(this._sfxGain);
        source.start(0);

        this._ambientLoop = { source, gain: loopGain };

        source.onended = () => {
            if (this._ambientLoop && this._ambientLoop.source === source) {
                this._ambientLoop = null;
            }
        };
    }

    /**
     * Stop the ambient loop if playing.
     */
    stopAmbientLoop() {
        if (!this._ambientLoop) return;
        try {
            this._ambientLoop.source.stop();
        } catch (_) {
            // Already stopped
        }
        this._ambientLoop = null;
    }

    // ── Voice System ────────────────────────────────────────────────────

    /**
     * Play a voice line. Interrupts any currently playing voice.
     * @param {string} name - Voice identifier (must be loaded via loadSFX)
     * @param {number} [volume=1.0] - Volume multiplier (0-1)
     */
    playVoice(name, volume = 1.0) {
        this._ensureContext();
        if (!this._ctx) return;

        const buffer = this._buffers.get(name);
        if (!buffer) {
            console.warn(`[AudioManager] Voice "${name}" not loaded.`);
            return;
        }

        // Stop current voice if playing
        if (this._currentVoice) {
            try {
                this._currentVoice.stop();
            } catch (_) {
                // Already stopped
            }
            this._currentVoice = null;
        }

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;

        const instanceGain = this._ctx.createGain();
        instanceGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this._ctx.currentTime);

        source.connect(instanceGain);
        instanceGain.connect(this._voiceGain);
        source.start(0);

        this._currentVoice = source;

        source.onended = () => {
            if (this._currentVoice === source) {
                this._currentVoice = null;
            }
        };
    }

    /**
     * Set the voice bus volume.
     * @param {number} volume - 0 to 1
     */
    setVoiceVolume(volume) {
        this._voiceVolume = Math.max(0, Math.min(1, volume));
        if (this._voiceGain) {
            this._voiceGain.gain.setValueAtTime(this._voiceVolume, this._ctx.currentTime);
        }
    }

    // ── Master Volume ───────────────────────────────────────────────────

    /**
     * Set the master volume (affects all buses).
     * @param {number} volume - 0 to 1
     */
    setMasterVolume(volume) {
        this._masterVolume = Math.max(0, Math.min(1, volume));
        if (this._masterGain) {
            this._masterGain.gain.setValueAtTime(this._masterVolume, this._ctx.currentTime);
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────────────

    /**
     * Stop all audio and release resources.
     */
    dispose() {
        this._stopMusicImmediate();
        this.stopAmbientLoop();

        if (this._currentVoice) {
            try { this._currentVoice.stop(); } catch (_) { /* noop */ }
            this._currentVoice = null;
        }

        if (this._ctx && this._ctx.state !== 'closed') {
            this._ctx.close().catch(() => {});
        }

        this._buffers.clear();

        document.removeEventListener('click', this._unlockHandler);
        document.removeEventListener('touchstart', this._unlockHandler);

        eventBus.off('weapon:fire', this._onWeaponFire);
        eventBus.off('pickup:collect', this._onPickupCollect);
        eventBus.off('enemy:death', this._onEnemyDeath);
    }

    // ── Internal ────────────────────────────────────────────────────────

    /**
     * Create the AudioContext and gain node graph on first use.
     * Safe to call multiple times — only initializes once.
     */
    _ensureContext() {
        if (this._ctx) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('[AudioManager] Web Audio API not supported.');
                return;
            }

            this._ctx = new AudioContextClass();

            // Master gain → destination
            this._masterGain = this._ctx.createGain();
            this._masterGain.gain.setValueAtTime(this._masterVolume, this._ctx.currentTime);
            this._masterGain.connect(this._ctx.destination);

            // Music gain → master
            this._musicGain = this._ctx.createGain();
            this._musicGain.gain.setValueAtTime(this._musicVolume, this._ctx.currentTime);
            this._musicGain.connect(this._masterGain);

            // SFX gain → master
            this._sfxGain = this._ctx.createGain();
            this._sfxGain.gain.setValueAtTime(this._sfxVolume, this._ctx.currentTime);
            this._sfxGain.connect(this._masterGain);

            // Voice gain → master
            this._voiceGain = this._ctx.createGain();
            this._voiceGain.gain.setValueAtTime(this._voiceVolume, this._ctx.currentTime);
            this._voiceGain.connect(this._masterGain);
        } catch (err) {
            console.error('[AudioManager] Failed to create AudioContext:', err);
            this._ctx = null;
        }
    }

    /**
     * Resume AudioContext on first user interaction (iOS requirement).
     */
    _handleUserInteraction() {
        if (this._unlocked) return;

        this._ensureContext();
        if (!this._ctx) return;

        if (this._ctx.state === 'suspended') {
            this._ctx.resume().then(() => {
                this._unlocked = true;
                document.removeEventListener('click', this._unlockHandler);
                document.removeEventListener('touchstart', this._unlockHandler);
            }).catch((err) => {
                console.warn('[AudioManager] Failed to resume AudioContext:', err);
            });
        } else {
            this._unlocked = true;
            document.removeEventListener('click', this._unlockHandler);
            document.removeEventListener('touchstart', this._unlockHandler);
        }
    }

    /**
     * Fetch and decode an audio file into a buffer. Caches the result.
     * @param {string} name - Identifier for the buffer
     * @param {string} url - URL to the audio file
     * @returns {Promise<void>}
     */
    async _loadBuffer(name, url) {
        // Return early if already cached
        if (this._buffers.has(name)) return;

        this._ensureContext();
        if (!this._ctx) return;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`[AudioManager] Failed to fetch "${url}" (${response.status})`);
                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
            this._buffers.set(name, audioBuffer);
        } catch (err) {
            console.warn(`[AudioManager] Failed to load audio "${name}" from "${url}":`, err);
        }
    }

    /**
     * Immediately stop the current music source without fading.
     */
    _stopMusicImmediate() {
        if (!this._currentMusic) return;

        try {
            this._currentMusic.source.stop();
        } catch (_) {
            // Already stopped
        }
        this._currentMusic = null;
    }
}
