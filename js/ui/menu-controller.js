/**
 * menu-controller.js — Menu Flow Controller
 *
 * Manages the full menu chain:
 *   Main Menu -> Episode Select -> Difficulty Select -> Start Game
 *
 * Operates on DOM elements already present in wolf3d.html.
 */

export class MenuController {
    constructor() {
        // ── DOM References ──────────────────────────────────────────
        /** @type {HTMLElement} */
        this._mainMenu = document.getElementById('main-menu');
        /** @type {HTMLElement} */
        this._episodeSelect = document.getElementById('episode-select');
        /** @type {HTMLElement} */
        this._difficultySelect = document.getElementById('difficulty-select');

        // Buttons
        /** @type {HTMLElement} */
        this._btnNewGame = document.getElementById('btn-new-game');
        /** @type {HTMLElement} */
        this._btnOptions = document.getElementById('btn-options');
        /** @type {HTMLElement} */
        this._btnCredits = document.getElementById('btn-credits');
        /** @type {HTMLElement} */
        this._btnEpisodeBack = document.getElementById('btn-episode-back');
        /** @type {HTMLElement} */
        this._btnDifficultyBack = document.getElementById('btn-difficulty-back');

        // Episode & difficulty cards
        /** @type {NodeListOf<HTMLElement>} */
        this._episodeCards = document.querySelectorAll('.episode-card[data-episode]');
        /** @type {NodeListOf<HTMLElement>} */
        this._difficultyCards = document.querySelectorAll('.difficulty-card[data-difficulty]');

        // ── State ───────────────────────────────────────────────────
        /** @type {number} Selected episode number */
        this._selectedEpisode = 1;

        /** @type {Function | null} Callback for when the game should start */
        this._startGameCallback = null;

        /** @type {Function | null} Callback for when OPTIONS is pressed */
        this._optionsCallback = null;

        /** @type {Function | null} Callback for when CREDITS is pressed */
        this._creditsCallback = null;

        // ── Bound Handlers (for cleanup) ────────────────────────────
        this._handlers = [];

        // Wire up all events
        this._wireEvents();
    }

    /**
     * Show the main menu screen.
     */
    show() {
        this._showScreen('main');
    }

    /**
     * Hide all menu screens.
     */
    hide() {
        this._hideAll();
    }

    /**
     * Register a callback for when the player starts the game.
     * @param {(config: { episode: number, difficulty: string }) => void} callback
     */
    onStartGame(callback) {
        this._startGameCallback = callback;
    }

    /**
     * Register a callback for when OPTIONS is pressed from the main menu.
     * @param {Function} callback
     */
    onOptions(callback) {
        this._optionsCallback = callback;
    }

    /**
     * Register a callback for when CREDITS is pressed from the main menu.
     * @param {Function} callback
     */
    onCredits(callback) {
        this._creditsCallback = callback;
    }

    /**
     * Wire up all button and card click events.
     */
    _wireEvents() {
        // NEW GAME → Episode Select
        this._addHandler(this._btnNewGame, 'click', () => {
            this._showScreen('episode');
        });

        // OPTIONS
        this._addHandler(this._btnOptions, 'click', () => {
            if (this._optionsCallback) {
                this._optionsCallback();
            }
        });

        // CREDITS
        this._addHandler(this._btnCredits, 'click', () => {
            if (this._creditsCallback) {
                this._creditsCallback();
            }
        });

        // BACK from Episode Select → Main Menu
        this._addHandler(this._btnEpisodeBack, 'click', () => {
            this._showScreen('main');
        });

        // BACK from Difficulty Select → Episode Select
        this._addHandler(this._btnDifficultyBack, 'click', () => {
            this._showScreen('episode');
        });

        // Episode cards → store selection, go to Difficulty Select
        this._episodeCards.forEach((card) => {
            this._addHandler(card, 'click', () => {
                const ep = parseInt(card.dataset.episode, 10) || 1;
                this._selectedEpisode = ep;

                // Highlight selected card
                this._episodeCards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');

                this._showScreen('difficulty');
            });
        });

        // Difficulty cards → emit start event
        this._difficultyCards.forEach((card) => {
            this._addHandler(card, 'click', () => {
                const difficulty = card.dataset.difficulty || 'medium';

                // Highlight selected card
                this._difficultyCards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');

                // Fire the start game callback
                if (this._startGameCallback) {
                    this._startGameCallback({
                        episode: this._selectedEpisode,
                        difficulty,
                    });
                }
            });
        });
    }

    /**
     * Show a specific menu screen.
     * @param {'main'|'episode'|'difficulty'} screen
     */
    _showScreen(screen) {
        this._hideAll();
        switch (screen) {
            case 'main':
                if (this._mainMenu) this._mainMenu.classList.remove('hidden');
                break;
            case 'episode':
                if (this._episodeSelect) this._episodeSelect.classList.remove('hidden');
                break;
            case 'difficulty':
                if (this._difficultySelect) this._difficultySelect.classList.remove('hidden');
                break;
        }
    }

    /**
     * Hide all menu screens.
     */
    _hideAll() {
        if (this._mainMenu) this._mainMenu.classList.add('hidden');
        if (this._episodeSelect) this._episodeSelect.classList.add('hidden');
        if (this._difficultySelect) this._difficultySelect.classList.add('hidden');
    }

    /**
     * Helper: add an event listener and track it for cleanup.
     * @param {HTMLElement | null} el
     * @param {string} event
     * @param {Function} handler
     */
    _addHandler(el, event, handler) {
        if (!el) return;
        el.addEventListener(event, handler);
        this._handlers.push({ el, event, handler });
    }

    /**
     * Remove all event listeners and clean up.
     */
    dispose() {
        for (const { el, event, handler } of this._handlers) {
            el.removeEventListener(event, handler);
        }
        this._handlers = [];
        this._startGameCallback = null;
        this._creditsCallback = null;
    }
}
