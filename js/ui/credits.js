/**
 * credits.js — Epic Scrolling Credits Sequence
 *
 * A cinematic credits experience that plays after completing the game
 * or from the main menu. Features smooth-scrolling text, crossfading
 * background images, and the original credits soundtrack.
 *
 * Controls:
 *   SPACE — Hold to speed up (3x)
 *   ESC   — Skip credits entirely
 *   Click — Skip credits (mobile)
 */

export class Credits {

    /**
     * @param {import('../audio/audio-manager.js').AudioManager} audioManager
     */
    constructor(audioManager) {
        /** @type {import('../audio/audio-manager.js').AudioManager} */
        this._audio = audioManager;

        /** @type {HTMLElement | null} */
        this._overlay = null;

        /** @type {HTMLElement | null} */
        this._scrollContainer = null;

        /** @type {number} */
        this._rafId = 0;

        /** @type {boolean} */
        this._running = false;

        /** @type {boolean} */
        this._speedUp = false;

        /** @type {Function | null} */
        this._resolve = null;

        // Bound handlers for cleanup
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Play the full credits sequence.
     * @returns {Promise<void>} Resolves when credits finish or are skipped.
     */
    play() {
        return new Promise((resolve) => {
            this._resolve = resolve;
            this._running = true;
            this._speedUp = false;

            // Build DOM
            this._createOverlay();
            this._preloadImages();

            // Start credits music
            try {
                this._audio.stopMusic();
                this._audio.playMusic('credits', false, 2.0);
            } catch (_) { /* audio may not be loaded */ }

            // Bind controls
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);

            // Start scroll animation after a brief fade-in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._startScrollAnimation();
                });
            });
        });
    }

    /**
     * Skip credits immediately.
     */
    skip() {
        this._finish();
    }

    /**
     * Clean up all DOM and listeners.
     */
    dispose() {
        this._running = false;
        cancelAnimationFrame(this._rafId);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.remove();
        }
        this._overlay = null;
        this._scrollContainer = null;
    }

    // ── Private: DOM Construction ───────────────────────────────────

    /**
     * Build the full-screen credits overlay with all sections.
     */
    _createOverlay() {
        // Remove any existing overlay
        const existing = document.getElementById('credits-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'credits-overlay';
        overlay.className = 'credits-overlay';

        // Background image layer (crossfades)
        const bgLayer = document.createElement('div');
        bgLayer.className = 'credits-bg-layer';
        overlay.appendChild(bgLayer);
        this._bgLayer = bgLayer;

        // Dark gradient overlay on top of images
        const bgDim = document.createElement('div');
        bgDim.className = 'credits-bg-dim';
        overlay.appendChild(bgDim);

        // Scroll container
        const scroll = document.createElement('div');
        scroll.className = 'credits-scroll';
        overlay.appendChild(scroll);

        // Skip hint
        const hint = document.createElement('div');
        hint.className = 'credits-skip-hint';
        hint.innerHTML = 'SPACE to speed up &bull; ESC to skip';
        overlay.appendChild(hint);

        // Populate sections
        scroll.innerHTML = this._buildSectionsHTML();

        // Mobile skip: tap overlay to skip
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === bgDim) {
                this.skip();
            }
        });

        document.body.appendChild(overlay);
        this._overlay = overlay;
        this._scrollContainer = scroll;
    }

    /**
     * Build the HTML for all credit sections.
     * @returns {string}
     */
    _buildSectionsHTML() {
        return `
            <!-- Top spacer: starts with empty screen -->
            <div class="credits-spacer"></div>

            <!-- SECTION 1: Title Card -->
            <section class="credits-section" data-bg="assets/ui/credits/credits_collaboration.jpg">
                <h1 class="credits-game-title">Wolfenstein 3D</h1>
                <p class="credits-game-subtitle">2026 Browser Remake</p>
                <div class="credits-divider"></div>
                <p class="credits-tagline">A game by Richard Theuws &amp; Claude AI</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 2: Creative Director -->
            <section class="credits-section" data-bg="assets/ui/credits/credits_richard.jpg">
                <h2 class="credits-role">Creative Director</h2>
                <div class="credits-divider"></div>
                <div class="credits-portrait-frame">
                    <img src="assets/ui/credits/credits_richard.jpg"
                         alt="Richard Theuws" class="credits-portrait" loading="eager">
                </div>
                <h3 class="credits-name">Richard Theuws</h3>
                <p class="credits-detail">Founder, Theuws Consulting</p>
                <p class="credits-detail">25 years of entrepreneurship. Metal to the bone.</p>
                <p class="credits-detail">From Bladel, Netherlands &mdash; where castles are built, not just dreamed.</p>
                <p class="credits-detail">First gaming tattoo: Warcraft &mdash; Reign of Chaos</p>
                <p class="credits-detail credits-link">theuws.com &bull; Metal Business Club</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 3: Game Master -->
            <section class="credits-section" data-bg="assets/ui/credits/credits_gamemaster.jpg">
                <h2 class="credits-role">Game Master &mdash; AI Director</h2>
                <div class="credits-divider"></div>
                <div class="credits-portrait-frame">
                    <img src="assets/ui/credits/credits_gamemaster.jpg"
                         alt="Claude AI" class="credits-portrait" loading="eager">
                </div>
                <h3 class="credits-name">Claude Opus 4.6 by Anthropic</h3>
                <p class="credits-detail">Project Manager &bull; Creative Director &bull; Technical Architect</p>
                <div class="credits-sub-block">
                    <p class="credits-sub-title">7 Specialized Agents</p>
                    <p class="credits-detail">Game Analyzer &bull; Asset Generator &bull; 3D Animation Director</p>
                    <p class="credits-detail">Audio Director &bull; Scenario Writer &bull; Game Deployer</p>
                    <p class="credits-detail">Game Master Improvement</p>
                </div>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 4: The Tools -->
            <section class="credits-section" data-bg="assets/ui/credits/credits_tools.jpg">
                <h2 class="credits-role">The Tools</h2>
                <div class="credits-divider"></div>
                <div class="credits-portrait-frame">
                    <img src="assets/ui/credits/credits_tools.jpg"
                         alt="AI Tools" class="credits-portrait" loading="eager">
                </div>
                <p class="credits-tool"><span class="credits-tool-name">Flux (fal.ai)</span> &mdash; Textures, Sprites, UI Art</p>
                <p class="credits-tool"><span class="credits-tool-name">Meshy v6 (fal.ai)</span> &mdash; 3D Enemy Models</p>
                <p class="credits-tool"><span class="credits-tool-name">Blender 5.1</span> &mdash; Rigging &amp; Animation</p>
                <p class="credits-tool"><span class="credits-tool-name">ElevenLabs</span> &mdash; German Voice Acting &amp; Sound Effects</p>
                <p class="credits-tool"><span class="credits-tool-name">Suno AI</span> &mdash; Original Soundtrack</p>
                <p class="credits-tool"><span class="credits-tool-name">Three.js</span> &mdash; WebGL 3D Engine</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 5: Infrastructure -->
            <section class="credits-section" data-bg="assets/ui/credits/credits_infrastructure.jpg">
                <h2 class="credits-role">The Infrastructure</h2>
                <div class="credits-divider"></div>
                <div class="credits-portrait-frame">
                    <img src="assets/ui/credits/credits_infrastructure.jpg"
                         alt="Server Setup" class="credits-portrait" loading="eager">
                </div>
                <p class="credits-detail">Development: MacBook Pro M5 Pro</p>
                <p class="credits-detail">Production: Mac mini M4 &mdash; Bladel, Netherlands</p>
                <p class="credits-detail">Hosted at theuws.com</p>
                <p class="credits-detail">Part of a portfolio of 29+ browser games</p>
                <p class="credits-detail">The 3D Game World at theuws.com/games/</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 6: By the Numbers -->
            <section class="credits-section credits-section--stats">
                <h2 class="credits-role">By the Numbers</h2>
                <div class="credits-divider"></div>
                <div class="credits-stats">
                    <div class="credits-stat">
                        <span class="credits-stat-number">33</span>
                        <span class="credits-stat-label">JavaScript Modules</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">13,200+</span>
                        <span class="credits-stat-label">Lines of Code</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">15</span>
                        <span class="credits-stat-label">Playable Levels</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">3</span>
                        <span class="credits-stat-label">Epic Boss Fights</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">7</span>
                        <span class="credits-stat-label">Animated 3D Models</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">11</span>
                        <span class="credits-stat-label">Original Music Tracks</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">15+</span>
                        <span class="credits-stat-label">German Voice Lines</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">16+</span>
                        <span class="credits-stat-label">Sound Effects</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">30+</span>
                        <span class="credits-stat-label">AI-Generated Textures</span>
                    </div>
                    <div class="credits-stat credits-stat--highlight">
                        <span class="credits-stat-number">~6</span>
                        <span class="credits-stat-label">Hours Total Development</span>
                    </div>
                </div>

                <div class="credits-divider"></div>
                <h3 class="credits-subheading">Production Costs</h3>
                <div class="credits-stats">
                    <div class="credits-stat">
                        <span class="credits-stat-number">~$6</span>
                        <span class="credits-stat-label">fal.ai (Flux + Meshy)</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">$10/mo</span>
                        <span class="credits-stat-label">Suno Pro (Soundtrack)</span>
                    </div>
                    <div class="credits-stat">
                        <span class="credits-stat-number">$22/mo</span>
                        <span class="credits-stat-label">ElevenLabs Pro (Voices &amp; SFX)</span>
                    </div>
                </div>
                <p class="credits-detail" style="margin-top: 1.5rem; opacity: 0.7; font-style: italic;">A complete FPS with 3 episodes, 15 levels, and 3 boss fights &mdash;<br>built in 6 hours for $6 in generation costs.</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 7: Special Thanks -->
            <section class="credits-section">
                <h2 class="credits-role">Special Thanks</h2>
                <div class="credits-divider"></div>
                <p class="credits-thanks"><span class="credits-thanks-name">id Software</span> &mdash; For creating the original Wolfenstein 3D in 1992</p>
                <p class="credits-thanks"><span class="credits-thanks-name">Bobby Prince</span> &mdash; For the music that defined a generation</p>
                <p class="credits-thanks"><span class="credits-thanks-name">The Metal Business Club</span> community</p>
                <p class="credits-thanks">And to every gamer who remembers hearing<br><em class="credits-mein-leben">&ldquo;Mein Leben!&rdquo;</em><br>for the first time</p>
            </section>

            <div class="credits-gap"></div>

            <!-- SECTION 8: Finale -->
            <section class="credits-section credits-section--finale" data-bg="assets/ui/credits/credits_collaboration.jpg">
                <h1 class="credits-finale-title">Wolfenstein 3D</h1>
                <p class="credits-finale-subtitle">2026 Browser Remake</p>
                <div class="credits-divider"></div>
                <p class="credits-finale-url">theuws.com/games/wolfenstein-3d</p>
                <p class="credits-finale-location">Made in Bladel &#x1F1F3;&#x1F1F1;</p>
            </section>

            <!-- Bottom spacer: let the finale sit centered -->
            <div class="credits-spacer"></div>
        `;
    }

    /**
     * Preload all credits background images.
     */
    _preloadImages() {
        const images = [
            'assets/ui/credits/credits_collaboration.jpg',
            'assets/ui/credits/credits_richard.jpg',
            'assets/ui/credits/credits_gamemaster.jpg',
            'assets/ui/credits/credits_tools.jpg',
            'assets/ui/credits/credits_infrastructure.jpg',
        ];
        for (const src of images) {
            const img = new Image();
            img.src = src;
        }
    }

    // ── Private: Animation ──────────────────────────────────────────

    /**
     * Start the smooth scroll animation.
     */
    _startScrollAnimation() {
        if (!this._scrollContainer || !this._overlay) return;

        const scroll = this._scrollContainer;
        const totalHeight = scroll.scrollHeight - window.innerHeight;
        const DURATION = 90; // seconds at normal speed
        const SPEED_MULTIPLIER = 3;

        let scrollY = 0;
        let lastTime = performance.now();
        let currentBg = '';

        const tick = (now) => {
            if (!this._running) return;

            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;

            const speed = this._speedUp ? SPEED_MULTIPLIER : 1;
            const pixelsPerSecond = (totalHeight / DURATION) * speed;
            scrollY += pixelsPerSecond * dt;

            // Apply scroll
            scroll.style.transform = `translateY(${-scrollY}px)`;

            // Update background crossfade based on visible section
            this._updateBackground(scrollY);

            // Check if done
            if (scrollY >= totalHeight) {
                // Linger on finale for 4 seconds then finish
                setTimeout(() => this._finish(), 4000);
                return;
            }

            this._rafId = requestAnimationFrame(tick);
        };

        this._rafId = requestAnimationFrame(tick);
    }

    /**
     * Update the background image based on which section is currently visible.
     * @param {number} scrollY - Current scroll position
     */
    _updateBackground(scrollY) {
        if (!this._bgLayer) return;

        const sections = this._scrollContainer.querySelectorAll('.credits-section[data-bg]');
        const viewCenter = scrollY + window.innerHeight / 2;

        let closestSection = null;
        let closestDist = Infinity;

        for (const section of sections) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            const sectionCenter = (sectionTop + sectionBottom) / 2;
            const dist = Math.abs(viewCenter - sectionCenter);

            if (dist < closestDist && viewCenter >= sectionTop - window.innerHeight &&
                viewCenter <= sectionBottom + window.innerHeight) {
                closestDist = dist;
                closestSection = section;
            }
        }

        if (closestSection) {
            const bg = closestSection.dataset.bg;
            if (bg && bg !== this._currentBg) {
                this._currentBg = bg;
                this._crossfadeBackground(bg);
            }
        }
    }

    /**
     * Crossfade to a new background image.
     * @param {string} src - Image URL
     */
    _crossfadeBackground(src) {
        if (!this._bgLayer) return;

        const newBg = document.createElement('div');
        newBg.className = 'credits-bg-image credits-bg-fadein';
        newBg.style.backgroundImage = `url('${src}')`;
        this._bgLayer.appendChild(newBg);

        // Force reflow then trigger fade-in
        void newBg.offsetWidth;
        newBg.classList.add('credits-bg-visible');

        // Remove old backgrounds after transition
        setTimeout(() => {
            const children = this._bgLayer.querySelectorAll('.credits-bg-image');
            for (let i = 0; i < children.length - 1; i++) {
                children[i].remove();
            }
        }, 1500);
    }

    // ── Private: Controls ───────────────────────────────────────────

    /**
     * Handle keydown events.
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.skip();
        } else if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            this._speedUp = true;
        }
    }

    /**
     * Handle keyup events.
     * @param {KeyboardEvent} e
     */
    _handleKeyUp(e) {
        if (e.key === ' ' || e.code === 'Space') {
            this._speedUp = false;
        }
    }

    // ── Private: Finish ─────────────────────────────────────────────

    /**
     * End the credits sequence cleanly.
     */
    _finish() {
        if (!this._running) return;
        this._running = false;

        cancelAnimationFrame(this._rafId);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);

        // Fade out overlay
        if (this._overlay) {
            this._overlay.classList.add('credits-fadeout');
            setTimeout(() => {
                if (this._overlay && this._overlay.parentNode) {
                    this._overlay.remove();
                }
                this._overlay = null;
                this._scrollContainer = null;
                this._bgLayer = null;
                this._currentBg = '';

                // Stop credits music
                try {
                    this._audio.stopMusic();
                } catch (_) { /* ignore */ }

                if (this._resolve) {
                    this._resolve();
                    this._resolve = null;
                }
            }, 800);
        } else {
            if (this._resolve) {
                this._resolve();
                this._resolve = null;
            }
        }
    }
}
