/**
 * cinematics.js — Full-Screen Cinematic System
 *
 * Plays text-based cinematic sequences using DOM overlays.
 * Used for episode intros, boss reveals, and story beats.
 * Supports fade, text, and pause beat types with skip functionality.
 */

export class Cinematics {
    constructor() {
        /** @type {boolean} Whether a cinematic is currently playing */
        this._playing = false;

        /** @type {Function|null} Resolve function for the current play() promise */
        this._resolve = null;

        /** @type {AbortController|null} Controller to abort the current sequence */
        this._abortController = null;

        // Build DOM
        this._createDOM();

        // Bind skip handlers
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onClick = this._onClick.bind(this);
    }

    // ── DOM Creation ────────────────────────────────────────────────

    /**
     * Create the cinematic overlay DOM elements.
     * @private
     */
    _createDOM() {
        this._overlay = document.createElement('div');
        this._overlay.id = 'cinematic-overlay';
        this._overlay.style.display = 'none';

        this._textEl = document.createElement('div');
        this._textEl.id = 'cinematic-text';

        this._skipEl = document.createElement('div');
        this._skipEl.id = 'cinematic-skip';
        this._skipEl.textContent = 'Press SPACE to skip';

        this._overlay.appendChild(this._textEl);
        this._overlay.appendChild(this._skipEl);
        document.body.appendChild(this._overlay);
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Play a cinematic sequence.
     * @param {Array<Object>} beats - Array of cinematic beat objects
     * @returns {Promise<void>} Resolves when the cinematic ends or is skipped
     */
    play(beats) {
        if (this._playing) {
            this.skip();
        }

        return new Promise((resolve) => {
            this._resolve = resolve;
            this._playing = true;
            this._abortController = new AbortController();

            // Show overlay
            this._overlay.style.display = 'flex';
            this._overlay.style.backgroundColor = '#000';
            this._overlay.style.opacity = '1';
            this._textEl.innerHTML = '';

            // Attach skip listeners
            document.addEventListener('keydown', this._onKeyDown);
            this._overlay.addEventListener('click', this._onClick);

            // Run the beat sequence
            this._runBeats(beats, this._abortController.signal).then(() => {
                this._finish();
            });
        });
    }

    /**
     * Immediately skip/end the current cinematic.
     */
    skip() {
        if (!this._playing) return;

        if (this._abortController) {
            this._abortController.abort();
        }
    }

    /**
     * Whether a cinematic is currently playing.
     * @returns {boolean}
     */
    isPlaying() {
        return this._playing;
    }

    /**
     * Clean up all DOM elements and listeners.
     */
    dispose() {
        this.skip();
        document.removeEventListener('keydown', this._onKeyDown);

        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }

        this._overlay = null;
        this._textEl = null;
        this._skipEl = null;
    }

    // ── Private Methods ─────────────────────────────────────────────

    /**
     * Run all beats in sequence.
     * @param {Array<Object>} beats
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    async _runBeats(beats, signal) {
        for (const beat of beats) {
            if (signal.aborted) return;

            switch (beat.type) {
                case 'fade':
                    await this._playFade(beat, signal);
                    break;
                case 'text':
                    await this._playText(beat, signal);
                    break;
                case 'pause':
                    await this._playPause(beat, signal);
                    break;
                default:
                    console.warn(`[Cinematics] Unknown beat type: ${beat.type}`);
            }
        }
    }

    /**
     * Play a fade beat — transition the overlay background color.
     * @param {Object} beat - { type: 'fade', color: string, duration: number }
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    _playFade(beat, signal) {
        return new Promise((resolve) => {
            if (signal.aborted) { resolve(); return; }

            const duration = beat.duration * 1000;
            this._overlay.style.transition = `background-color ${duration}ms ease, opacity ${duration}ms ease`;

            if (beat.color === 'transparent') {
                this._overlay.style.opacity = '0';
            } else {
                this._overlay.style.opacity = '1';
                this._overlay.style.backgroundColor = beat.color;
            }

            const timer = setTimeout(resolve, duration);
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                resolve();
            }, { once: true });
        });
    }

    /**
     * Play a text beat — fade text in, hold, fade out.
     * @param {Object} beat - { type: 'text', text: string, style: string, duration: number }
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    _playText(beat, signal) {
        return new Promise((resolve) => {
            if (signal.aborted) { resolve(); return; }

            const fadeInMs = 500;
            const fadeOutMs = 500;
            const holdMs = Math.max(0, (beat.duration * 1000) - fadeInMs - fadeOutMs);

            // Create text element with appropriate style class
            this._textEl.innerHTML = '';
            const span = document.createElement('span');
            span.className = `cinematic-${beat.style}`;
            // Support newlines in text
            span.innerHTML = beat.text.replace(/\n/g, '<br>');
            span.style.opacity = '0';
            span.style.transition = `opacity ${fadeInMs}ms ease`;
            this._textEl.appendChild(span);

            // Force reflow before triggering transition
            void span.offsetHeight;

            // Fade in
            span.style.opacity = '1';

            const timer1 = setTimeout(() => {
                if (signal.aborted) { resolve(); return; }

                // Hold complete, start fade out
                span.style.transition = `opacity ${fadeOutMs}ms ease`;
                span.style.opacity = '0';

                const timer2 = setTimeout(() => {
                    this._textEl.innerHTML = '';
                    resolve();
                }, fadeOutMs);

                signal.addEventListener('abort', () => {
                    clearTimeout(timer2);
                    resolve();
                }, { once: true });
            }, fadeInMs + holdMs);

            signal.addEventListener('abort', () => {
                clearTimeout(timer1);
                resolve();
            }, { once: true });
        });
    }

    /**
     * Play a pause beat — wait for a duration.
     * @param {Object} beat - { type: 'pause', duration: number }
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    _playPause(beat, signal) {
        return new Promise((resolve) => {
            if (signal.aborted) { resolve(); return; }

            const timer = setTimeout(resolve, beat.duration * 1000);
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                resolve();
            }, { once: true });
        });
    }

    /**
     * Clean up after a cinematic finishes or is skipped.
     * @private
     */
    _finish() {
        this._playing = false;

        // Remove skip listeners
        document.removeEventListener('keydown', this._onKeyDown);
        this._overlay.removeEventListener('click', this._onClick);

        // Hide overlay immediately
        this._overlay.style.transition = 'none';
        this._overlay.style.opacity = '0';
        this._overlay.style.display = 'none';
        this._textEl.innerHTML = '';

        // Reset for next use
        this._abortController = null;

        // Resolve the play() promise
        if (this._resolve) {
            const resolve = this._resolve;
            this._resolve = null;
            resolve();
        }
    }

    /**
     * Handle keydown for skip (SPACE).
     * @param {KeyboardEvent} e
     * @private
     */
    _onKeyDown(e) {
        if (e.code === 'Space' && this._playing) {
            e.preventDefault();
            this.skip();
        }
    }

    /**
     * Handle click for skip.
     * @private
     */
    _onClick() {
        if (this._playing) {
            this.skip();
        }
    }
}
