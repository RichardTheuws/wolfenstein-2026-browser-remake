/**
 * leaderboard.js — High Score Leaderboard System
 *
 * Handles score submission, retrieval, and display via a retro-styled
 * overlay that matches the Wolfenstein 3D 2026 game aesthetic.
 *
 * Communicates with the PHP backend at api/scores.php (SQLite).
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  INTEGRATION INSTRUCTIONS FOR main.js                          ║
 * ║                                                                ║
 * ║  1. Add import at the top of main.js:                          ║
 * ║     import { Leaderboard } from './ui/leaderboard.js';         ║
 * ║                                                                ║
 * ║  2. Declare a variable alongside other system references:      ║
 * ║     /** @type {Leaderboard} *\/                                ║
 * ║     let leaderboard = null;                                    ║
 * ║                                                                ║
 * ║  3. Instantiate after menuController is created (boot seq):    ║
 * ║     leaderboard = new Leaderboard();                           ║
 * ║                                                                ║
 * ║  4. In showEpisodeComplete(), after the overlay is shown,      ║
 * ║     submit the score automatically:                            ║
 * ║                                                                ║
 * ║     leaderboard.submitScore(null, {                            ║
 * ║         score: gameState.score,                                ║
 * ║         episode: episode,                                      ║
 * ║         floor: gameState.currentFloor,                         ║
 * ║         kills: gameState.kills,                                ║
 * ║         secrets: gameState.secretsFound,                       ║
 * ║         time: Math.round(gameState.getLevelTime()),             ║
 * ║         difficulty: gameState.difficulty,                       ║
 * ║     });                                                        ║
 * ║                                                                ║
 * ║  5. In gameOver(), submit the score if > 0:                    ║
 * ║                                                                ║
 * ║     if (gameState.score > 0) {                                 ║
 * ║         leaderboard.submitScore(null, {                        ║
 * ║             score: gameState.score,                             ║
 * ║             episode: gameState.currentEpisode,                  ║
 * ║             floor: gameState.currentFloor,                      ║
 * ║             kills: gameState.kills,                             ║
 * ║             secrets: gameState.secretsFound,                    ║
 * ║             time: Math.round(gameState.getLevelTime()),          ║
 * ║             difficulty: gameState.difficulty,                    ║
 * ║         });                                                     ║
 * ║     }                                                           ║
 * ║                                                                ║
 * ║  6. Add a HIGH SCORES button to the main menu (wolf3d.html)    ║
 * ║     alongside New Game / Continue / Options / Credits:          ║
 * ║                                                                ║
 * ║     <button id="btn-leaderboard" class="menu-btn">             ║
 * ║         HIGH SCORES                                             ║
 * ║     </button>                                                   ║
 * ║                                                                ║
 * ║     Then in main.js, wire the click:                            ║
 * ║     const btnLeaderboard = document.getElementById(             ║
 * ║         'btn-leaderboard');                                     ║
 * ║     if (btnLeaderboard) {                                       ║
 * ║         btnLeaderboard.addEventListener('click', () => {        ║
 * ║             leaderboard.show();                                 ║
 * ║         });                                                     ║
 * ║     }                                                           ║
 * ║                                                                ║
 * ║  7. Optionally show leaderboard from episode complete screen:   ║
 * ║     Add a "VIEW HIGH SCORES" link in the episode complete card  ║
 * ║     that calls leaderboard.show(episode).                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── Constants ──────────────────────────────────────────────────────

const STORAGE_KEY_NAME = 'wolf3d-player-name';
const STORAGE_KEY_LAST_SCORE = 'wolf3d-last-submitted-score';

const EPISODE_NAMES = {
    1: 'Escape from Castle Wolfenstein',
    2: 'Operation Eisenfaust',
    3: 'Die, Fuhrer, Die!',
    4: 'A Dark Secret',
    5: 'Trail of the Madman',
    6: 'Confrontation',
    7: 'The Nightmare',
};

const DIFFICULTY_LABELS = {
    baby: 'Can I Play, Daddy?',
    easy: 'Don\'t Hurt Me',
    medium: 'Bring \'Em On!',
    hard: 'I Am Death Incarnate!',
};

const TAB_ALL = 'all';
const TABS = [TAB_ALL, '1', '2', '3', '4', '5', '6', '7'];

// ── Styles ─────────────────────────────────────────────────────────

const FONT_FAMILY = '"Press Start 2P", "Courier New", monospace';

const COLORS = {
    red: '#c0392b',
    redGlow: 'rgba(192, 57, 43, 0.5)',
    gold: '#f0c040',
    blue: '#3498db',
    green: '#2ecc71',
    dimText: '#7f8c8d',
    bodyText: '#bdc3c7',
    darkBg: 'rgba(0, 0, 0, 0.92)',
    cardBg: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    cardBorder: '#c0392b',
    tabActive: '#c0392b',
    tabInactive: '#2c3e50',
    rowEven: 'rgba(255, 255, 255, 0.03)',
    rowOdd: 'transparent',
    playerRow: 'rgba(52, 152, 219, 0.15)',
};

// ── Leaderboard Class ──────────────────────────────────────────────

export class Leaderboard {
    constructor() {
        /** @type {string} API endpoint (relative to game root) */
        this._apiUrl = 'api/scores.php';

        /** @type {HTMLElement|null} The overlay element */
        this._overlay = null;

        /** @type {string} Currently active tab */
        this._activeTab = TAB_ALL;

        /** @type {Object|null} Cached scores keyed by tab id */
        this._cache = {};

        /** @type {string|null} The player name submitted with last score */
        this._lastSubmittedName = null;

        /** @type {number|null} The last submitted score value (dedup) */
        this._lastSubmittedScore = null;

        // Bound handlers for cleanup
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onOverlayClick = this._handleOverlayClick.bind(this);

        // Load persisted values
        this._loadStoredName();
        this._loadLastSubmitted();
    }

    // ── Public API ─────────────────────────────────────────────────

    /**
     * Submit a score to the leaderboard.
     *
     * If playerName is null and no name is stored, shows a name entry
     * dialog first. Skips submission if the same score was already submitted.
     *
     * @param {string|null} playerName - Player name, or null to use stored / prompt
     * @param {object} gameState - Score data
     * @param {number} gameState.score
     * @param {number} gameState.episode
     * @param {number} [gameState.floor]
     * @param {number} [gameState.kills]
     * @param {number} [gameState.secrets]
     * @param {number} [gameState.time]
     * @param {string} [gameState.difficulty]
     * @returns {Promise<{success: boolean, rank: number|null}|null>}
     */
    async submitScore(playerName, gameState) {
        if (!gameState || gameState.score <= 0) return null;

        // Dedup: skip if we already submitted this exact score
        if (this._lastSubmittedScore === gameState.score) {
            return null;
        }

        // Resolve player name
        let name = playerName || this._getStoredName();
        if (!name) {
            name = await this._promptForName();
            if (!name) return null; // User cancelled
        }

        // Map 'baby' difficulty to 'easy' since the API only accepts easy/medium/hard
        let difficulty = gameState.difficulty || 'medium';
        if (difficulty === 'baby') difficulty = 'easy';

        const payload = {
            name,
            score: gameState.score,
            episode: Math.min(gameState.episode, 6), // API max is 6
            floor: gameState.floor || 0,
            kills: gameState.kills || 0,
            secrets: gameState.secrets || 0,
            time: gameState.time || 0,
            difficulty,
        };

        try {
            const response = await fetch(this._apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
                // Track submission to prevent duplicates
                this._lastSubmittedScore = gameState.score;
                this._persistLastSubmitted(gameState.score);
                this._lastSubmittedName = name;

                // Invalidate cache
                this._cache = {};
            }

            return result;
        } catch (err) {
            console.warn('[Leaderboard] Failed to submit score:', err);
            return null;
        }
    }

    /**
     * Fetch top scores from the API.
     *
     * @param {number|null} [episode=null] - Filter by episode, or null for all
     * @param {number} [limit=10] - Number of scores to fetch
     * @returns {Promise<Array>} Array of score objects
     */
    async getScores(episode = null, limit = 10) {
        const cacheKey = `${episode || 'all'}-${limit}`;
        if (this._cache[cacheKey]) {
            return this._cache[cacheKey];
        }

        try {
            let url = `${this._apiUrl}?limit=${limit}`;
            if (episode !== null && episode >= 1) {
                url += `&episode=${Math.min(episode, 6)}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            const scores = data.scores || [];

            this._cache[cacheKey] = scores;
            return scores;
        } catch (err) {
            console.warn('[Leaderboard] Failed to fetch scores:', err);
            return [];
        }
    }

    /**
     * Show the leaderboard overlay.
     *
     * @param {number|null} [episode=null] - Episode to show initially, or null for ALL
     */
    async show(episode = null) {
        // Remove any existing overlay
        this.hide();

        this._activeTab = episode ? String(episode) : TAB_ALL;

        // Build the overlay
        this._createOverlay();

        // Bind input handlers
        document.addEventListener('keydown', this._onKeyDown);

        // Load and display scores for the active tab
        await this._loadAndRenderScores();
    }

    /**
     * Hide the leaderboard overlay.
     */
    hide() {
        document.removeEventListener('keydown', this._onKeyDown);

        if (this._overlay) {
            // Fade out
            this._overlay.style.opacity = '0';
            setTimeout(() => {
                if (this._overlay && this._overlay.parentNode) {
                    this._overlay.remove();
                }
                this._overlay = null;
            }, 300);
        }
    }

    /**
     * Reset the duplicate-submission tracker (call when starting a new game).
     */
    resetSubmissionTracker() {
        this._lastSubmittedScore = null;
        try {
            localStorage.removeItem(STORAGE_KEY_LAST_SCORE);
        } catch (_) { /* ignore */ }
    }

    // ── Name Management ────────────────────────────────────────────

    /**
     * Get the stored player name from localStorage.
     * @returns {string|null}
     */
    _getStoredName() {
        try {
            return localStorage.getItem(STORAGE_KEY_NAME) || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Load stored name into memory.
     */
    _loadStoredName() {
        this._lastSubmittedName = this._getStoredName();
    }

    /**
     * Store the player name in localStorage.
     * @param {string} name
     */
    _storeName(name) {
        try {
            localStorage.setItem(STORAGE_KEY_NAME, name);
        } catch (_) { /* ignore */ }
    }

    /**
     * Load last submitted score value from localStorage.
     */
    _loadLastSubmitted() {
        try {
            const val = localStorage.getItem(STORAGE_KEY_LAST_SCORE);
            this._lastSubmittedScore = val ? parseInt(val, 10) : null;
        } catch (_) {
            this._lastSubmittedScore = null;
        }
    }

    /**
     * Persist the last submitted score to localStorage.
     * @param {number} score
     */
    _persistLastSubmitted(score) {
        try {
            localStorage.setItem(STORAGE_KEY_LAST_SCORE, String(score));
        } catch (_) { /* ignore */ }
    }

    /**
     * Show a name entry dialog and return the entered name.
     * @returns {Promise<string|null>} The entered name, or null if cancelled
     */
    _promptForName() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                inset: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.darkBg,
                zIndex: '10001',
                fontFamily: FONT_FAMILY,
                opacity: '0',
                transition: 'opacity 0.3s ease',
            });

            const card = document.createElement('div');
            Object.assign(card.style, {
                background: COLORS.cardBg,
                border: `3px solid ${COLORS.cardBorder}`,
                borderRadius: '8px',
                padding: '40px 50px',
                textAlign: 'center',
                maxWidth: '500px',
                width: '90%',
                boxShadow: `0 0 60px ${COLORS.redGlow}`,
            });

            const title = document.createElement('h2');
            title.textContent = 'ENTER YOUR NAME';
            Object.assign(title.style, {
                color: COLORS.red,
                fontSize: '18px',
                margin: '0 0 8px 0',
                fontFamily: FONT_FAMILY,
                letterSpacing: '3px',
                textTransform: 'uppercase',
            });

            const subtitle = document.createElement('p');
            subtitle.textContent = 'For the leaderboard';
            Object.assign(subtitle.style, {
                color: COLORS.dimText,
                fontSize: '10px',
                margin: '0 0 30px 0',
                fontFamily: FONT_FAMILY,
            });

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 20;
            input.value = this._getStoredName() || 'BJ';
            input.placeholder = 'BJ';
            Object.assign(input.style, {
                fontFamily: FONT_FAMILY,
                fontSize: '16px',
                padding: '12px 20px',
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#0a0a1a',
                border: `2px solid ${COLORS.red}`,
                borderRadius: '4px',
                color: COLORS.gold,
                textAlign: 'center',
                outline: 'none',
                letterSpacing: '2px',
                textTransform: 'uppercase',
            });

            const btnRow = document.createElement('div');
            Object.assign(btnRow.style, {
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                justifyContent: 'center',
            });

            const btnSubmit = document.createElement('button');
            btnSubmit.textContent = 'SUBMIT';
            Object.assign(btnSubmit.style, {
                fontFamily: FONT_FAMILY,
                fontSize: '12px',
                padding: '10px 24px',
                backgroundColor: COLORS.red,
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '2px',
            });

            const btnCancel = document.createElement('button');
            btnCancel.textContent = 'CANCEL';
            Object.assign(btnCancel.style, {
                fontFamily: FONT_FAMILY,
                fontSize: '12px',
                padding: '10px 24px',
                backgroundColor: COLORS.tabInactive,
                color: COLORS.dimText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '2px',
            });

            btnRow.appendChild(btnSubmit);
            btnRow.appendChild(btnCancel);

            card.appendChild(title);
            card.appendChild(subtitle);
            card.appendChild(input);
            card.appendChild(btnRow);
            overlay.appendChild(card);
            document.body.appendChild(overlay);

            // Fade in
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
            });

            // Focus the input
            setTimeout(() => input.select(), 100);

            const cleanup = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (overlay.parentNode) overlay.remove();
                }, 300);
            };

            const submit = () => {
                const name = input.value.trim() || 'BJ';
                this._storeName(name);
                cleanup();
                resolve(name);
            };

            const cancel = () => {
                cleanup();
                resolve(null);
            };

            btnSubmit.addEventListener('click', submit);
            btnCancel.addEventListener('click', cancel);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            });
        });
    }

    // ── Overlay Construction ───────────────────────────────────────

    /**
     * Build the full leaderboard overlay DOM.
     */
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'leaderboard-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.darkBg,
            zIndex: '10000',
            fontFamily: FONT_FAMILY,
            opacity: '0',
            transition: 'opacity 0.3s ease',
        });

        overlay.addEventListener('click', this._onOverlayClick);

        const card = document.createElement('div');
        card.id = 'leaderboard-card';
        Object.assign(card.style, {
            background: COLORS.cardBg,
            border: `3px solid ${COLORS.cardBorder}`,
            borderRadius: '8px',
            padding: '30px 40px',
            textAlign: 'center',
            maxWidth: '850px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: `0 0 60px ${COLORS.redGlow}`,
            position: 'relative',
        });

        // Prevent clicks on card from closing overlay
        card.addEventListener('click', (e) => e.stopPropagation());

        // Title
        const title = document.createElement('h1');
        title.textContent = 'HIGH SCORES';
        Object.assign(title.style, {
            color: COLORS.red,
            fontSize: '24px',
            margin: '0 0 6px 0',
            fontFamily: FONT_FAMILY,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            textShadow: `0 0 20px ${COLORS.redGlow}`,
        });

        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'WOLFENSTEIN 3D';
        Object.assign(subtitle.style, {
            color: COLORS.gold,
            fontSize: '10px',
            margin: '0 0 20px 0',
            fontFamily: FONT_FAMILY,
            letterSpacing: '4px',
        });

        // Divider
        const divider = this._createDivider();

        // Tabs
        const tabsContainer = this._createTabs();

        // Table container (will be populated by _renderScores)
        const tableContainer = document.createElement('div');
        tableContainer.id = 'leaderboard-table-container';
        Object.assign(tableContainer.style, {
            marginTop: '20px',
            minHeight: '200px',
        });

        // Bottom divider
        const divider2 = this._createDivider();
        divider2.style.marginTop = '20px';

        // Close hint
        const hint = document.createElement('div');
        hint.textContent = 'PRESS ANY KEY TO CLOSE';
        Object.assign(hint.style, {
            color: COLORS.dimText,
            fontSize: '9px',
            marginTop: '16px',
            fontFamily: FONT_FAMILY,
            letterSpacing: '2px',
            animation: 'wolf3d-lb-blink 1.2s ease-in-out infinite',
        });

        // Blink animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes wolf3d-lb-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            @keyframes wolf3d-lb-fadeInRow {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes wolf3d-lb-pulse {
                0%, 100% { text-shadow: 0 0 8px rgba(46, 204, 113, 0.4); }
                50% { text-shadow: 0 0 16px rgba(46, 204, 113, 0.8); }
            }
            #leaderboard-card::-webkit-scrollbar {
                width: 6px;
            }
            #leaderboard-card::-webkit-scrollbar-track {
                background: #0a0a1a;
            }
            #leaderboard-card::-webkit-scrollbar-thumb {
                background: ${COLORS.red};
                border-radius: 3px;
            }
        `;

        card.appendChild(style);
        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(divider);
        card.appendChild(tabsContainer);
        card.appendChild(tableContainer);
        card.appendChild(divider2);
        card.appendChild(hint);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        this._overlay = overlay;

        // Fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }

    /**
     * Create the episode filter tabs.
     * @returns {HTMLElement}
     */
    _createTabs() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            justifyContent: 'center',
            marginTop: '16px',
        });

        for (const tab of TABS) {
            const btn = document.createElement('button');
            btn.dataset.tab = tab;
            btn.textContent = tab === TAB_ALL ? 'ALL' : `E${tab}`;
            const isActive = tab === this._activeTab;

            Object.assign(btn.style, {
                fontFamily: FONT_FAMILY,
                fontSize: '9px',
                padding: '6px 12px',
                backgroundColor: isActive ? COLORS.tabActive : COLORS.tabInactive,
                color: isActive ? '#fff' : COLORS.dimText,
                border: isActive ? `1px solid ${COLORS.red}` : '1px solid #3a3a5a',
                borderRadius: '3px',
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'all 0.2s ease',
                minWidth: '36px',
            });

            // Hover effect
            btn.addEventListener('mouseenter', () => {
                if (btn.dataset.tab !== this._activeTab) {
                    btn.style.backgroundColor = '#3a3a5a';
                    btn.style.color = '#ddd';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (btn.dataset.tab !== this._activeTab) {
                    btn.style.backgroundColor = COLORS.tabInactive;
                    btn.style.color = COLORS.dimText;
                }
            });

            btn.addEventListener('click', () => {
                this._activeTab = tab;
                this._updateTabStyles();
                this._loadAndRenderScores();
            });

            container.appendChild(btn);
        }

        return container;
    }

    /**
     * Update tab button styles to reflect the active tab.
     */
    _updateTabStyles() {
        if (!this._overlay) return;

        const buttons = this._overlay.querySelectorAll('[data-tab]');
        for (const btn of buttons) {
            const isActive = btn.dataset.tab === this._activeTab;
            btn.style.backgroundColor = isActive ? COLORS.tabActive : COLORS.tabInactive;
            btn.style.color = isActive ? '#fff' : COLORS.dimText;
            btn.style.border = isActive ? `1px solid ${COLORS.red}` : '1px solid #3a3a5a';
        }
    }

    /**
     * Create a red divider line.
     * @returns {HTMLElement}
     */
    _createDivider() {
        const div = document.createElement('div');
        Object.assign(div.style, {
            width: '80%',
            height: '2px',
            background: COLORS.red,
            margin: '0 auto',
            opacity: '0.6',
        });
        return div;
    }

    // ── Score Rendering ────────────────────────────────────────────

    /**
     * Fetch scores for the active tab and render the table.
     */
    async _loadAndRenderScores() {
        if (!this._overlay) return;

        const container = this._overlay.querySelector('#leaderboard-table-container');
        if (!container) return;

        // Show loading
        container.innerHTML = '';
        const loading = document.createElement('p');
        loading.textContent = 'LOADING...';
        Object.assign(loading.style, {
            color: COLORS.dimText,
            fontSize: '11px',
            fontFamily: FONT_FAMILY,
            letterSpacing: '3px',
            padding: '40px 0',
        });
        container.appendChild(loading);

        // Fetch
        const episode = this._activeTab === TAB_ALL ? null : parseInt(this._activeTab, 10);
        const scores = await this.getScores(episode, 10);

        // Clear and render
        container.innerHTML = '';

        if (scores.length === 0) {
            const empty = document.createElement('div');
            Object.assign(empty.style, {
                padding: '40px 0',
                textAlign: 'center',
            });

            const emptyTitle = document.createElement('p');
            emptyTitle.textContent = 'NO SCORES YET';
            Object.assign(emptyTitle.style, {
                color: COLORS.dimText,
                fontSize: '14px',
                fontFamily: FONT_FAMILY,
                letterSpacing: '3px',
                margin: '0 0 12px 0',
            });

            const emptyHint = document.createElement('p');
            emptyHint.textContent = 'Complete an episode to claim the #1 spot!';
            Object.assign(emptyHint.style, {
                color: '#555',
                fontSize: '9px',
                fontFamily: FONT_FAMILY,
                margin: '0',
            });

            empty.appendChild(emptyTitle);
            empty.appendChild(emptyHint);
            container.appendChild(empty);
            return;
        }

        // Build table
        const table = document.createElement('table');
        Object.assign(table.style, {
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: FONT_FAMILY,
        });

        // Header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['#', 'NAME', 'SCORE', 'EP', 'FLOOR', 'DIFF', 'DATE'];
        const headerWidths = ['6%', '22%', '20%', '8%', '10%', '18%', '16%'];

        for (let i = 0; i < headers.length; i++) {
            const th = document.createElement('th');
            th.textContent = headers[i];
            Object.assign(th.style, {
                color: COLORS.red,
                fontSize: '8px',
                fontFamily: FONT_FAMILY,
                padding: '8px 4px',
                textAlign: i === 0 ? 'center' : (i === 2 ? 'right' : 'left'),
                letterSpacing: '1px',
                borderBottom: `1px solid ${COLORS.red}40`,
                width: headerWidths[i],
                whiteSpace: 'nowrap',
            });
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body rows
        const tbody = document.createElement('tbody');
        const playerName = this._lastSubmittedName || this._getStoredName();

        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            const rank = i + 1;
            const isPlayer = playerName && score.name === playerName &&
                             score.score === this._lastSubmittedScore;

            const row = document.createElement('tr');
            Object.assign(row.style, {
                backgroundColor: isPlayer ? COLORS.playerRow : (i % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd),
                animation: `wolf3d-lb-fadeInRow 0.3s ease ${i * 0.05}s both`,
                transition: 'background-color 0.2s ease',
            });

            // Hover
            row.addEventListener('mouseenter', () => {
                if (!isPlayer) {
                    row.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                }
            });
            row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = isPlayer ? COLORS.playerRow : (i % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd);
            });

            // Rank
            const rankCell = document.createElement('td');
            rankCell.textContent = this._getRankDisplay(rank);
            Object.assign(rankCell.style, {
                color: rank <= 3 ? COLORS.gold : COLORS.green,
                fontSize: rank <= 3 ? '12px' : '10px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'center',
                fontWeight: rank <= 3 ? 'bold' : 'normal',
            });
            if (rank === 1) {
                rankCell.style.animation = 'wolf3d-lb-pulse 2s ease-in-out infinite';
            }
            row.appendChild(rankCell);

            // Name
            const nameCell = document.createElement('td');
            nameCell.textContent = score.name;
            Object.assign(nameCell.style, {
                color: isPlayer ? COLORS.blue : '#fff',
                fontSize: '10px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'left',
                letterSpacing: '1px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '0',
            });
            if (isPlayer) {
                nameCell.textContent = `> ${score.name}`;
                nameCell.style.fontWeight = 'bold';
            }
            row.appendChild(nameCell);

            // Score
            const scoreCell = document.createElement('td');
            scoreCell.textContent = score.score.toLocaleString();
            Object.assign(scoreCell.style, {
                color: COLORS.gold,
                fontSize: '11px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'right',
                fontWeight: 'bold',
                letterSpacing: '1px',
            });
            row.appendChild(scoreCell);

            // Episode
            const epCell = document.createElement('td');
            epCell.textContent = `E${score.episode}`;
            Object.assign(epCell.style, {
                color: COLORS.bodyText,
                fontSize: '9px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'left',
            });
            row.appendChild(epCell);

            // Floor
            const floorCell = document.createElement('td');
            floorCell.textContent = score.floor > 0 ? `F${score.floor}` : '-';
            Object.assign(floorCell.style, {
                color: COLORS.bodyText,
                fontSize: '9px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'left',
            });
            row.appendChild(floorCell);

            // Difficulty
            const diffCell = document.createElement('td');
            diffCell.textContent = this._getDifficultyLabel(score.difficulty);
            Object.assign(diffCell.style, {
                color: this._getDifficultyColor(score.difficulty),
                fontSize: '8px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '0',
            });
            row.appendChild(diffCell);

            // Date
            const dateCell = document.createElement('td');
            dateCell.textContent = this._formatDate(score.date);
            Object.assign(dateCell.style, {
                color: COLORS.dimText,
                fontSize: '8px',
                fontFamily: FONT_FAMILY,
                padding: '10px 4px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
            });
            row.appendChild(dateCell);

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        container.appendChild(table);
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /**
     * Get a display string for a rank number (medal emoji for top 3).
     * @param {number} rank
     * @returns {string}
     */
    _getRankDisplay(rank) {
        switch (rank) {
            case 1: return '1ST';
            case 2: return '2ND';
            case 3: return '3RD';
            default: return `${rank}`;
        }
    }

    /**
     * Get a short difficulty label.
     * @param {string} difficulty
     * @returns {string}
     */
    _getDifficultyLabel(difficulty) {
        switch (difficulty) {
            case 'easy': return 'EASY';
            case 'medium': return 'MEDIUM';
            case 'hard': return 'HARD';
            default: return difficulty ? difficulty.toUpperCase() : '-';
        }
    }

    /**
     * Get a color for a difficulty level.
     * @param {string} difficulty
     * @returns {string}
     */
    _getDifficultyColor(difficulty) {
        switch (difficulty) {
            case 'easy': return COLORS.green;
            case 'medium': return COLORS.gold;
            case 'hard': return COLORS.red;
            default: return COLORS.dimText;
        }
    }

    /**
     * Format a date string (YYYY-MM-DD) for display.
     * @param {string} dateStr
     * @returns {string}
     */
    _formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}`;
            }
            return dateStr;
        } catch (_) {
            return dateStr;
        }
    }

    // ── Event Handlers ─────────────────────────────────────────────

    /**
     * Handle keydown — close overlay on any key.
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
        // Ignore modifier keys by themselves
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

        // Allow tab navigation with left/right arrows
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            this._navigateTab(e.key === 'ArrowLeft' ? -1 : 1);
            return;
        }

        // Close on Escape or any other key
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.hide();
        }
    }

    /**
     * Handle click on the overlay background (outside card) to close.
     * @param {MouseEvent} e
     */
    _handleOverlayClick(e) {
        if (e.target === this._overlay) {
            this.hide();
        }
    }

    /**
     * Navigate between tabs using arrow keys.
     * @param {number} direction - -1 for left, +1 for right
     */
    _navigateTab(direction) {
        const currentIndex = TABS.indexOf(this._activeTab);
        if (currentIndex === -1) return;

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = TABS.length - 1;
        if (newIndex >= TABS.length) newIndex = 0;

        this._activeTab = TABS[newIndex];
        this._updateTabStyles();
        this._loadAndRenderScores();
    }
}
