/**
 * main.js — Game Entry Point & Loop
 *
 * Boot sequence: create all systems, load level, wire events, run game loop.
 * Manages transitions between menu, gameplay, and pause states.
 */

import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { CollisionSystem } from './engine/collision.js';
import { LevelLoader } from './engine/level-loader.js';
import { eventBus } from './engine/event-bus.js';
import { PlayerController } from './game/player-controller.js';
import { DoorSystem } from './game/door-system.js';
import { GameState } from './game/game-state.js';
import { WeaponSystem } from './game/weapon-system.js';
import { EnemyManager } from './game/enemy-manager.js';
import { Enemy } from './game/enemy.js';
import { ModelLoader } from './engine/model-loader.js';
import { AnimationLoader } from './engine/animation-loader.js';
import { PickupSystem } from './game/pickup-system.js';
import { AudioManager } from './audio/audio-manager.js';
import { SecretSystem } from './game/secret-system.js';
import { LevelExit } from './game/level-exit.js';
import { Boss } from './game/boss.js';
import { SaveSystem } from './game/save-system.js';
import { WeaponViewmodel } from './ui/weapon-viewmodel.js';
import { DamageIndicator } from './ui/damage-indicator.js';
import { MenuController } from './ui/menu-controller.js';
import { Cinematics } from './ui/cinematics.js';
import { Credits } from './ui/credits.js';
import { Settings } from './ui/settings.js';
import { Minimap } from './ui/minimap.js';
import { MobileControls } from './ui/mobile-controls.js';
import { CheatSystem } from './game/cheats.js';
import { EPISODE_INTROS } from './data/episode-intros.js';

// ── Constants ───────────────────────────────────────────────────────
const MAX_DELTA = 1 / 30; // Cap delta time at ~33ms (30 FPS minimum)
const DEFAULT_LEVEL = 'e1m1';
const FOOTSTEP_INTERVAL = 0.4; // Seconds between footstep sounds

// ── System References ───────────────────────────────────────────────
/** @type {Renderer} */
let renderer = null;

/** @type {InputManager} */
let input = null;

/** @type {CollisionSystem} */
let collision = null;

/** @type {LevelLoader} */
let levelLoader = null;

/** @type {PlayerController} */
let player = null;

/** @type {DoorSystem} */
let doorSystem = null;

/** @type {GameState} */
let gameState = null;

/** @type {WeaponSystem} */
let weaponSystem = null;

/** @type {EnemyManager} */
let enemyManager = null;

/** @type {ModelLoader} */
let modelLoader = null;

/** @type {PickupSystem} */
let pickupSystem = null;

/** @type {AudioManager} */
let audioManager = null;

/** @type {WeaponViewmodel} */
let weaponHUD = null;

/** @type {DamageIndicator} */
let damageIndicator = null;

/** @type {SecretSystem} */
let secretSystem = null;

/** @type {LevelExit} */
let levelExit = null;

/** @type {Boss} */
let boss = null;

/** @type {HTMLDivElement|null} Gas overlay for Otto Giftmacher */
let gasOverlay = null;

/** @type {THREE.Mesh[]} Active 3D gas cloud meshes */
const gasCloudMeshes = [];

/** @type {SaveSystem} */
let saveSystem = null;

/** @type {MenuController} */
let menuController = null;

/** @type {Cinematics} */
let cinematics = null;

/** @type {Credits} */
let credits = null;

/** @type {Settings} */
let settings = null;

/** @type {Minimap} */
let minimap = null;

/** @type {MobileControls} */
let mobileControls = null;

/** @type {CheatSystem} */
let cheatSystem = null;

/** Whether the device is a mobile touch device */
const isMobileDevice = MobileControls.isMobileDevice();

/** Footstep timer — counts down, plays sound at 0 */
let footstepTimer = 0;

/** @type {number} Previous frame timestamp */
let lastTime = 0;

/** @type {number} requestAnimationFrame ID */
let rafId = 0;

/** @type {boolean} Whether the game loop is running */
let running = false;

// ── DOM References ──────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('progress-fill');
const loadingText = document.getElementById('progress-text');
const mainMenu = document.getElementById('main-menu');
const gameHUD = document.getElementById('game-hud');
const pauseMenu = document.getElementById('pause-menu');

// Menu buttons
const startGameBtn = document.getElementById('btn-new-game');
const continueBtn = document.getElementById('btn-continue');
const resumeBtn = document.getElementById('btn-resume');
const quitBtn = document.getElementById('btn-quit');

// HUD elements
const hudHealth = document.getElementById('hud-health');
const hudHealthFill = document.getElementById('hud-health-fill');
const hudAmmo = document.getElementById('hud-ammo');
const hudScore = document.getElementById('hud-score');
const hudLives = document.getElementById('hud-lives');
const hudFloor = document.getElementById('hud-floor');
const hudFace = document.getElementById('hud-face');
const hudKeyGold = document.getElementById('hud-key-gold');
const hudKeySilver = document.getElementById('hud-key-silver');
const crosshair = document.getElementById('crosshair');
const hitMarker = document.getElementById('hit-marker');

/** Timer for hit marker display (seconds remaining) */
let hitMarkerTimer = 0;

/** Hit stop timer — brief slow-motion on enemy kill (seconds remaining) */
let hitStopTimer = 0;

/** Timer ID for weapon switch notification */
let weaponNotifyTimer = 0;

// ── Boot Sequence ───────────────────────────────────────────────────

/**
 * Initialize all game systems. Called once on page load.
 */
async function boot() {
    setLoadingProgress(10, 'Initializing renderer...');

    // 1. Create renderer
    renderer = new Renderer(canvas);

    setLoadingProgress(20, 'Setting up input...');

    // 2. Create input manager
    input = new InputManager(canvas);

    // 3. Create collision system
    collision = new CollisionSystem();

    setLoadingProgress(30, 'Loading level...');

    // 4. Create level loader and load the first level
    levelLoader = new LevelLoader(renderer.scene);

    try {
        await levelLoader.loadLevel(DEFAULT_LEVEL);
    } catch (err) {
        console.warn(`Could not load ${DEFAULT_LEVEL}, creating test level:`, err.message);
        createTestLevel();
    }

    setLoadingProgress(70, 'Setting up collision...');

    // 5. Set collision grid from loaded level
    collision.setGrid(levelLoader.grid, levelLoader.width, levelLoader.height);

    setLoadingProgress(80, 'Initializing player...');

    // 6. Create player controller at spawn point
    player = new PlayerController(input, collision, renderer.camera);
    player.spawn(levelLoader.spawnPoint.x, levelLoader.spawnPoint.z, levelLoader.spawnPoint.angle);
    player.enabled = false; // Disabled until game starts

    setLoadingProgress(85, 'Setting up doors...');

    // 7. Create game state
    gameState = new GameState();

    // 8. Create door system
    doorSystem = new DoorSystem(levelLoader, collision, gameState);

    // 9. Initialize level stats
    gameState.startLevel({
        totalSecrets: levelLoader.secrets.length,
        totalKills: levelLoader.entities.length,
        totalTreasures: levelLoader.pickups.filter(
            (p) => p.type?.startsWith('treasure')
        ).length,
        parTime: levelLoader.levelData?.par_time || 0,
    });

    setLoadingProgress(88, 'Initializing combat systems...');

    // 9b. Phase 2: Combat systems
    weaponSystem = new WeaponSystem(input, renderer.camera, gameState);
    enemyManager = new EnemyManager(renderer.scene, collision, gameState, player);

    // Load 3D animated enemy models (Blender-rigged with embedded skeletal animations)
    modelLoader = new ModelLoader();
    Enemy.setModelLoader(modelLoader);
    try {
        await Enemy.preloadModel('guard', 'assets/models/animated/guard.glb');
    } catch {
        console.warn('Guard model not available, using placeholder boxes');
    }

    // Try loading other enemy models (non-blocking — use placeholder if not yet generated)
    // Note: 'ss' type in ENEMY_TYPES maps to 'ss_soldier' filename
    const animatedModelMap = {
        ss: 'ss_soldier',
        officer: 'officer',
        dog: 'dog',
        mutant: 'mutant',
    };
    Object.entries(animatedModelMap).forEach(([type, filename]) => {
        Enemy.preloadModel(type, `assets/models/animated/${filename}.glb`).catch(() => {});
    });

    // Load 3D boss models (non-blocking — falls back to placeholder boxes if not yet generated)
    Boss.setModelLoader(modelLoader);
    const bossModelMap = {
        hitler_mech: 'hitler_mech',
        hitler: 'hitler',
        hans: 'hans',
        schabbs: 'schabbs',
        otto: 'otto',
        gretel: 'gretel',
        fettgesicht: 'fettgesicht',
        ubersoldier: 'ubersoldier',
    };
    Object.entries(bossModelMap).forEach(([type, filename]) => {
        Boss.preloadModel(type, `assets/models/animated/${filename}.glb`).catch(() => {});
    });

    // Skeletal animations are embedded in GLB models (loaded via Enemy.preloadModel above).
    // No separate Mixamo FBX loading needed.

    enemyManager.spawnFromLevel(levelLoader.entities);
    weaponSystem.setEnemyMeshes(enemyManager.getEnemyMeshes());

    pickupSystem = new PickupSystem(renderer.scene, gameState, player, renderer.camera);
    pickupSystem.spawnFromLevel(levelLoader.pickups);

    // Audio
    audioManager = new AudioManager();
    await audioManager.loadTrack('menu', 'assets/audio/music/menu_theme.mp3');
    await audioManager.loadTrack('e1_combat', 'assets/audio/music/e1_combat.mp3');
    await audioManager.loadTrack('e1_explore', 'assets/audio/music/e1_exploration.mp3');
    await audioManager.loadTrack('e2_explore', 'assets/audio/music/e2_theme.mp3');
    await audioManager.loadTrack('e2_combat', 'assets/audio/music/e2_theme.mp3');
    await audioManager.loadTrack('e3_explore', 'assets/audio/music/e3_theme.mp3');
    await audioManager.loadTrack('e3_combat', 'assets/audio/music/e3_theme.mp3');
    audioManager.loadTrack('e4_explore', 'assets/audio/music/e4_exploration.mp3').catch(() => {});
    audioManager.loadTrack('e4_combat', 'assets/audio/music/e4_combat.mp3').catch(() => {});
    audioManager.loadTrack('e5_explore', 'assets/audio/music/e5_exploration.mp3').catch(() => {});
    audioManager.loadTrack('e5_combat', 'assets/audio/music/e5_combat.mp3').catch(() => {});
    audioManager.loadTrack('e6_explore', 'assets/audio/music/e6_exploration.mp3').catch(() => {});
    audioManager.loadTrack('e6_combat', 'assets/audio/music/e6_combat.mp3').catch(() => {});
    audioManager.loadTrack('e7_explore', 'assets/audio/music/e7_exploration.mp3').catch(() => {});
    audioManager.loadTrack('e7_combat', 'assets/audio/music/e7_combat.mp3').catch(() => {});
    await audioManager.loadTrack('victory', 'assets/audio/music/victory.mp3');
    await audioManager.loadTrack('gameover', 'assets/audio/music/gameover.mp3');

    // Voice lines — German enemy barks + boss voice lines
    const voiceFiles = [
        'guard_halt', 'guard_achtung', 'guard_mein_leben', 'guard_alert', 'guard_attack',
        'ss_schutzstaffel', 'ss_alarm', 'ss_death',
        'officer_spion', 'officer_alarm', 'officer_death',
        'hans_guten_tag',
        'mutant_alert', 'mutant_attack', 'mutant_death',
        'schabbs_welcome',
        'hitler_rage',
        'otto_willkommen',
        'gretel_willkommen',
        'fettgesicht_willkommen',
        'ubersoldier_willkommen',
    ];
    await Promise.all(voiceFiles.map(v => audioManager.loadSFX(v, `assets/audio/voices/${v}.mp3`)));

    // Weapon & gameplay SFX
    const sfxFiles = [
        'pistol_fire', 'mp40_fire', 'chaingun_fire', 'knife_slash', 'empty_click',
        'door_open', 'pickup_ammo', 'pickup_health', 'pickup_key', 'pickup_treasure',
        'player_pain', 'secret_found',
        'ambient_lab', 'syringe_throw'
    ];
    await Promise.all(sfxFiles.map(s => audioManager.loadSFX(s, `assets/audio/sfx/${s}.mp3`)));

    // Footstep & ambient SFX
    await audioManager.loadSFX('footstep', 'assets/audio/sfx/footstep.mp3');
    await audioManager.loadSFX('ambient_drip', 'assets/audio/sfx/ambient_drip.mp3');
    await audioManager.loadSFX('ambient_lab', 'assets/audio/sfx/ambient_lab.mp3');

    // Phase 3: Game loop & progression systems
    secretSystem = new SecretSystem(levelLoader, collision, gameState);
    levelExit = new LevelExit(gameState, player, audioManager);
    if (levelLoader.exit) {
        levelExit.setExit(levelLoader.exit.x, levelLoader.exit.z);
    }

    // Save system
    saveSystem = new SaveSystem();

    // Menu controller
    menuController = new MenuController();
    menuController.onStartGame(({ episode, difficulty }) => {
        gameState.setDifficulty(difficulty);
        menuController.hide();
        startGame(episode);
    });

    // Cinematics system
    cinematics = new Cinematics();

    // UI overlays
    weaponHUD = new WeaponViewmodel(renderer);
    damageIndicator = new DamageIndicator(gameState);

    // Settings panel (creates its own DOM)
    settings = new Settings(renderer, audioManager, input);

    // Minimap overlay
    minimap = new Minimap(levelLoader, player, enemyManager);
    minimap.setVisible(false); // Hidden until game starts

    // Mobile controls — only created on touch devices
    if (isMobileDevice) {
        mobileControls = new MobileControls(input, weaponSystem);
    }

    // Cheat code system (classic Wolfenstein easter egg)
    cheatSystem = new CheatSystem(gameState, input);

    // Wire main menu OPTIONS button to settings
    menuController.onOptions(() => {
        menuController.hide();
        settings.show();
        settings.onBack(() => {
            menuController.show();
        });
    });

    // Credits system
    credits = new Credits(audioManager);

    // Wire main menu CREDITS button
    menuController.onCredits(async () => {
        menuController.hide();
        audioManager.stopMusic();
        await credits.play();
        audioManager.playMusic('menu');
        menuController.show();
    });

    setLoadingProgress(90, 'Wiring events...');

    // 10. Wire up events
    wireEvents();

    setLoadingProgress(100, 'Ready!');

    // 11. Show/hide CONTINUE button based on saved game
    if (continueBtn) {
        continueBtn.style.display = saveSystem.hasSave() ? '' : 'none';
        continueBtn.addEventListener('click', () => {
            continueGame();
        });
    }

    // 11b. Restore unlocked episodes from localStorage
    try {
        const unlockedEpisodes = JSON.parse(localStorage.getItem('wolf3d-episodes-unlocked') || '[]');
        for (const ep of unlockedEpisodes) {
            const card = document.querySelector(`.episode-card[data-episode="${ep}"]`);
            if (card && card.classList.contains('locked')) {
                card.classList.remove('locked');
                card.removeAttribute('disabled');
                const lockOverlay = card.querySelector('.lock-overlay');
                if (lockOverlay) lockOverlay.remove();
            }
        }
    } catch (_) { /* ignore storage errors */ }

    // 12. Transition to main menu
    setTimeout(() => {
        showScreen('menu');
    }, 300);
}

// ── Game Loop ───────────────────────────────────────────────────────

/**
 * Start the game loop.
 */
function startGameLoop() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);
}

/**
 * Stop the game loop.
 */
function stopGameLoop() {
    running = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }
}

/**
 * Main game loop. Runs every frame via requestAnimationFrame.
 * @param {DOMHighResTimeStamp} timestamp
 */
function gameLoop(timestamp) {
    if (!running) return;

    // Calculate delta time, capped to prevent spiral of death
    let dt = (timestamp - lastTime) / 1000;
    if (dt > MAX_DELTA) dt = MAX_DELTA;
    lastTime = timestamp;

    // Hit stop: brief slow-motion on enemy kill — everything slows to 0.2x
    const realDt = dt;
    if (hitStopTimer > 0) {
        dt *= 0.2;
        hitStopTimer -= realDt;
        if (hitStopTimer < 0) hitStopTimer = 0;
    }

    // Skip updates if paused (but still render)
    if (!gameState.isPaused) {
        // Update mobile controls BEFORE other systems read input
        if (mobileControls) mobileControls.update();

        // Update order matters: input first, then game logic, then render
        player.update(dt);
        weaponSystem.update(dt);
        enemyManager.update(dt);
        if (boss) boss.update(dt);
        doorSystem.update(dt);
        pickupSystem.update(dt);
        levelExit.update(dt);
        damageIndicator.update(dt);

        // Update hit marker timer
        if (hitMarkerTimer > 0) {
            hitMarkerTimer -= dt;
            if (hitMarkerTimer <= 0) {
                hitMarkerTimer = 0;
                if (hitMarker) {
                    hitMarker.classList.remove('active');
                    hitMarker.classList.add('hidden');
                }
            }
        }

        // Set weapon bobbing based on player movement keys or mobile joystick
        const mobileMove = input.getMobileMove();
        const isMoving = input.isKeyDown('KeyW') || input.isKeyDown('KeyA')
            || input.isKeyDown('KeyS') || input.isKeyDown('KeyD')
            || mobileMove.x !== 0 || mobileMove.z !== 0;
        weaponHUD.setBobbing(isMoving);

        // Footstep sounds while moving
        if (isMoving) {
            footstepTimer -= dt;
            if (footstepTimer <= 0) {
                footstepTimer = FOOTSTEP_INTERVAL;
                // Vary pitch slightly for variety (0.9 - 1.1)
                const pitch = 0.9 + Math.random() * 0.2;
                audioManager.playSFXWithPitch('footstep', 0.5, pitch);
            }
        } else {
            footstepTimer = 0; // Reset so first step is immediate
        }

        // Update 3D weapon viewmodel animations
        weaponHUD.update(dt);

        // Update minimap
        if (minimap) minimap.update(dt);

        // Update cheat system (FPS counter)
        if (cheatSystem) cheatSystem.update(realDt);

        // Toggle minimap with Tab
        if (input.isKeyPressed('Tab')) {
            if (minimap) minimap.toggle();
        }

        updateHUD();
    }

    renderer.render(dt);
    weaponHUD.render(); // Render 3D weapon overlay on top of game scene

    // Reset per-frame input state AFTER all systems have read it
    input.resetFrameState();

    rafId = requestAnimationFrame(gameLoop);
}

// ── Screen Management ───────────────────────────────────────────────

/**
 * Show a specific screen, hiding all others.
 * @param {'loading'|'menu'|'game'|'pause'} screen
 */
function showScreen(screen) {
    loadingScreen.style.display = screen === 'loading' ? 'flex' : 'none';
    mainMenu.classList.toggle('hidden', screen !== 'menu');
    canvas.classList.toggle('hidden', screen !== 'game' && screen !== 'pause');
    if (gameHUD) gameHUD.classList.toggle('hidden', screen !== 'game' && screen !== 'pause');
    pauseMenu.classList.toggle('hidden', screen !== 'pause');

    // Hide menu sub-screens when transitioning away from menu flow
    if (screen !== 'menu' && menuController) {
        menuController.hide();
    }

    // Always hide settings when changing screens
    if (settings) settings.hide();

    // Show minimap only during gameplay (not pause/menu)
    if (minimap) minimap.setVisible(screen === 'game');
}

/**
 * Update loading bar and text.
 * @param {number} percent - 0-100
 * @param {string} text - Status message
 */
function setLoadingProgress(percent, text) {
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = text;
}

// ── HUD Updates ─────────────────────────────────────────────────────

/**
 * Update the HUD elements with current game state.
 */
function updateHUD() {
    if (hudHealth) hudHealth.textContent = gameState.health;
    if (hudHealthFill) hudHealthFill.style.width = `${gameState.health}%`;
    if (hudAmmo) hudAmmo.textContent = gameState.ammo;
    if (hudScore) hudScore.textContent = gameState.score.toLocaleString();
    if (hudLives) hudLives.textContent = gameState.lives;
    if (hudFloor) hudFloor.textContent = gameState.currentFloor;
    if (hudKeyGold) hudKeyGold.classList.toggle('active', gameState.hasKey('gold'));
    if (hudKeySilver) hudKeySilver.classList.toggle('active', gameState.hasKey('silver'));

    // Par time display
    const hudParTime = document.getElementById('hud-par-time');
    if (hudParTime && gameState.parTime > 0) {
        const elapsed = Math.floor(gameState.getLevelTime());
        const remaining = Math.max(0, gameState.parTime - elapsed);
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        hudParTime.textContent = `PAR ${min}:${sec.toString().padStart(2, '0')}`;
        hudParTime.className = 'hud-par-time' + (remaining > 0 ? ' under-par' : ' over-par');
    } else if (hudParTime) {
        hudParTime.textContent = '';
    }

    // BJ face based on health — image switching (god mode shows sunglasses)
    if (hudFace) {
        if (gameState.godMode) {
            // God mode: show sunglasses emoji face
            const godFaceHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#1a1a2e;border-radius:4px;">😎</div>`;
            if (!hudFace.querySelector('div') || !hudFace.innerHTML.includes('😎')) {
                hudFace.innerHTML = godFaceHTML;
            }
        } else {
            let faceImg = 'bj_100.png';
            if (gameState.health > 75) faceImg = 'bj_100.png';
            else if (gameState.health > 50) faceImg = 'bj_75.png';
            else if (gameState.health > 25) faceImg = 'bj_50.png';
            else if (gameState.health > 0) faceImg = 'bj_25.png';
            else faceImg = 'bj_dead.png';

            // Only update if changed
            const src = `assets/ui/faces/${faceImg}`;
            const existingImg = hudFace.querySelector('img');
            if (!existingImg || !existingImg.src.endsWith(faceImg)) {
                hudFace.innerHTML = `<img src="${src}" alt="BJ" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">`;
            }
        }
    }

    // Low health warning vignette
    if (damageIndicator) {
        damageIndicator.setLowHealth(gameState.health <= 25);
    }

    // Health bar color gradient based on health value
    if (hudHealthFill) {
        const h = gameState.health;
        if (h > 60) {
            hudHealthFill.style.background = `linear-gradient(90deg, #2d8a2d, #40c040)`;
        } else if (h > 30) {
            hudHealthFill.style.background = `linear-gradient(90deg, #c8a020, #e0c030)`;
        } else {
            hudHealthFill.style.background = `linear-gradient(90deg, #8b0000, #cc2020)`;
        }
    }
}

/**
 * Show a brief weapon name notification at the top-center of the screen.
 * @param {string} weaponName
 */
function showWeaponNotification(weaponName) {
    let el = document.getElementById('weapon-notify');
    if (!el) {
        el = document.createElement('div');
        el.id = 'weapon-notify';
        el.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Trebuchet MS', 'Arial Black', Impact, sans-serif;
            font-size: clamp(0.9rem, 2.5vw, 1.4rem);
            font-weight: 900;
            color: #f0c040;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            text-shadow: 0 0 10px rgba(240, 192, 64, 0.5), 2px 2px 0 rgba(0,0,0,0.8);
            z-index: 60;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease-in;
        `;
        document.body.appendChild(el);
    }
    el.textContent = weaponName;
    el.style.opacity = '1';

    // Clear previous timer and set new fade-out
    if (weaponNotifyTimer) clearTimeout(weaponNotifyTimer);
    weaponNotifyTimer = setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease-out';
        el.style.opacity = '0';
        // Reset transition for next show
        setTimeout(() => { el.style.transition = 'opacity 0.15s ease-in'; }, 400);
    }, 1500);
}

// ── Event Wiring ────────────────────────────────────────────────────

/**
 * Wire up all DOM and game events.
 */
function wireEvents() {
    // Start game button — now handled by MenuController in boot(),
    // but keep a direct fallback for testing/accessibility
    // (MenuController already wires btn-new-game → episode select)

    // Resume from pause
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            resumeGame();
        });
    }

    // Restart level
    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            restartLevel();
        });
    }

    // Quit to menu
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            quitToMenu();
        });
    }

    // OPTIONS button from pause menu
    const btnPauseOptions = document.getElementById('btn-pause-options');
    if (btnPauseOptions && settings) {
        btnPauseOptions.addEventListener('click', () => {
            pauseMenu.classList.add('hidden');
            settings.show();
            settings.onBack(() => {
                // Return to pause menu
                pauseMenu.classList.remove('hidden');
            });
        });
    }

    // Escape key for pause
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && gameState.isPlaying) {
            if (gameState.isPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });

    // Click canvas to request pointer lock during gameplay (desktop only)
    canvas.addEventListener('click', () => {
        if (!isMobileDevice && gameState.isPlaying && !gameState.isPaused && !input.isPointerLocked) {
            input.requestPointerLock();
        }
    });

    // Handle player death
    eventBus.on('player:death', (data) => {
        if (data.livesRemaining <= 0) {
            gameOver();
        } else {
            respawnPlayer();
        }
    });

    // Handle player damage — update HUD immediately + pain SFX
    eventBus.on('player:damage', () => {
        updateHUD();
        audioManager.playSFX('player_pain', 1.0);
    });

    // ── Phase 2: Combat Events ─────────────────────────────────────

    // Hit marker — brief X flash when an enemy is hit + impact effects
    eventBus.on('enemy:hit', (data) => {
        if (hitMarker) {
            hitMarker.classList.remove('hidden');
            hitMarker.classList.add('active');
            hitMarkerTimer = 0.1; // Show for 100ms
        }

        // Screen shake on hit — you FEEL the impact
        player.shake(0.3);

        // Brief white spark light at the hit position (0.1s duration)
        if (data.hitPoint) {
            const sparkLight = renderer.addPointLight('hit_spark', {
                color: 0xffffff,
                intensity: 3.0,
                distance: 6,
                decay: 2,
                position: data.hitPoint,
            });
            setTimeout(() => {
                renderer.removePointLight('hit_spark');
            }, 100);
        }
    });

    // Refresh enemy meshes for raycasting after enemy dies (include boss meshes)
    // + death satisfaction: big screen shake + hit stop slow-motion
    eventBus.on('enemy:death', (data) => {
        // Record kill + award score (skip boss — boss.js handles its own scoring)
        if (data.type !== 'boss') {
            if (data.score) {
                gameState.addScore(data.score);
            }
            if (!data.summoned) {
                gameState.recordKill();
            }
        }

        const enemyMeshes = enemyManager.getEnemyMeshes();
        const bossMeshes = boss ? boss.getMeshes() : [];
        weaponSystem.setEnemyMeshes([...enemyMeshes, ...bossMeshes]);

        // REWARDING kill feel: big screen shake
        player.shake(0.6);

        // Hit stop: brief slow-motion for 80ms (everything slows to 0.2x)
        hitStopTimer = 0.08;
    });

    // Combat music state — episode-specific
    eventBus.on('enemy:alert', () => {
        const combatTrack = `e${gameState.currentEpisode}_combat`;
        audioManager.crossfadeTo(combatTrack, 1.0);
    });

    // Enemy voice lines — positional German barks (alert voices boosted for clarity)
    eventBus.on('enemy:voice', (data) => {
        if (data.name && player) {
            const maxDist = data.category === 'alert' ? 30 : 25;
            audioManager.playSFXAtPosition(data.name, data.x, data.z, player.position.x, player.position.z, maxDist, data.category === 'alert' ? 1.2 : 1.0);
        }
    });

    // Weapon switching updates HUD + on-screen notification
    const weaponHUDNames = ['knife', 'pistol', 'mp40', 'chaingun'];
    const weaponDisplayNames = ['KNIFE', 'PISTOL', 'MP40', 'CHAIN GUN'];
    eventBus.on('weapon:switch', (data) => {
        weaponHUD.switchWeapon(weaponHUDNames[data.index] || 'pistol');
        const hudWeapon = document.getElementById('hud-weapon');
        if (hudWeapon) hudWeapon.textContent = data.weapon.name.toUpperCase();

        // Show weapon switch notification at top-center
        showWeaponNotification(weaponDisplayNames[data.index] || data.weapon.name.toUpperCase());
    });

    // Weapon fire — animation + SFX + screen shake
    eventBus.on('weapon:fire', (data) => {
        weaponHUD.playFireAnimation();
        // Map weapon index to SFX name (weapon-system.js emits weaponIndex 0-3)
        const sfxByIndex = ['knife_slash', 'pistol_fire', 'mp40_fire', 'chaingun_fire'];
        const sfxName = sfxByIndex[data.weaponIndex] || 'pistol_fire';
        audioManager.playSFX(sfxName, 1.0);

        // Screen shake per weapon: knife=0, pistol=0.5, mp40=0.3, chaingun=0.8
        const shakeByIndex = [0, 0.5, 0.3, 0.8];
        player.shake(shakeByIndex[data.weaponIndex] || 0);
    });

    // Pickup sounds (includes weapon pickups)
    eventBus.on('pickup:collect', (data) => {
        const sfxMap = {
            health: 'pickup_health',
            ammo: 'pickup_ammo',
            key: 'pickup_key',
            treasure: 'pickup_treasure',
            weapon: 'pickup_ammo',
        };
        audioManager.playSFX(sfxMap[data.effect] || 'pickup_ammo', 1.0);
    });

    // Door sounds
    eventBus.on('door:open', () => audioManager.playSFX('door_open', 1.0));

    // NOTE: Pickup drops from enemies are handled by PickupSystem's own
    // 'enemy:death' listener — no need to duplicate here.

    // ── Phase 3: Level Progression Events ──────────────────────────

    // Auto-save when completing a level (before advancing to next)
    eventBus.on('level:complete', () => {
        if (saveSystem) {
            // Save with the NEXT floor number (the one we're about to enter)
            const nextFloor = gameState.currentFloor + 1;
            const tempFloor = gameState.currentFloor;
            gameState.currentFloor = nextFloor;
            saveSystem.save(gameState);
            gameState.currentFloor = tempFloor; // Restore — level-exit._advance() will increment

            // Show the continue button now that a save exists
            if (continueBtn) continueBtn.style.display = '';
        }
    });

    // When the player advances to the next floor after viewing stats
    eventBus.on('level:advance', async (data) => {
        const nextFloor = data.floor;
        const levelId = `e${data.episode}m${nextFloor}`;

        // Floor 10 is the boss level. After beating it, the episode is complete.
        if (nextFloor > 10) {
            showEpisodeComplete(data.episode);
            return;
        }
        try {
            // Stop current game loop during level load
            stopGameLoop();
            player.enabled = false;

            // Clean up previous boss if any
            if (boss) {
                boss.dispose();
                boss = null;
            }

            // Clean up gas cloud meshes from Otto Giftmacher
            for (const mesh of gasCloudMeshes) {
                renderer.scene.remove(mesh);
                mesh.geometry?.dispose();
                mesh.material?.dispose();
            }
            gasCloudMeshes.length = 0;
            if (gasOverlay) gasOverlay.style.opacity = '0';

            // Smooth transition: fade to black → show floor title → load → fade in
            const transition = document.createElement('div');
            transition.style.cssText = `
                position: fixed; inset: 0; background: #000; z-index: 9998;
                opacity: 0; transition: opacity 0.4s ease-in;
                display: flex; align-items: center; justify-content: center;
                font-family: "Press Start 2P", "Courier New", monospace;
            `;
            transition.innerHTML = `
                <div style="text-align: center; opacity: 0; transition: opacity 0.3s ease-in 0.3s;" id="floor-title">
                    <div style="color: #c0392b; font-size: 14px; letter-spacing: 4px; margin-bottom: 8px;">
                        EPISODE ${data.episode}
                    </div>
                    <div style="color: #f0c040; font-size: 22px; letter-spacing: 3px;">
                        FLOOR ${nextFloor === 10 ? 'BOSS' : nextFloor}
                    </div>
                </div>
            `;
            document.body.appendChild(transition);
            requestAnimationFrame(() => {
                transition.style.opacity = '1';
                const title = document.getElementById('floor-title');
                if (title) title.style.opacity = '1';
            });

            // Wait for fade-in, then load level
            await new Promise(r => setTimeout(r, 800));

            // Load the next level
            await levelLoader.loadLevel(levelId);
            collision.setGrid(levelLoader.grid, levelLoader.width, levelLoader.height);

            // Re-initialize systems for new level
            doorSystem.dispose();
            doorSystem = new DoorSystem(levelLoader, collision, gameState);

            secretSystem.dispose();
            secretSystem = new SecretSystem(levelLoader, collision, gameState);

            // Dispose old enemies and pickups before spawning new ones
            enemyManager.dispose();
            enemyManager = new EnemyManager(renderer.scene, collision, gameState, player);
            pickupSystem.dispose();
            pickupSystem = new PickupSystem(renderer.scene, gameState, player, renderer.camera);

            // Set exit for new level (boss levels start with exit locked)
            levelExit.reset();
            const isBossLevel = levelLoader.levelData && levelLoader.levelData.isBossLevel;
            if (levelLoader.exit && !isBossLevel) {
                levelExit.setExit(levelLoader.exit.x, levelLoader.exit.z);
            }

            // Spawn enemies and pickups
            enemyManager.spawnFromLevel(levelLoader.entities);
            pickupSystem.spawnFromLevel(levelLoader.pickups);

            // Boss level: create and spawn boss (type comes from level data)
            if (isBossLevel && levelLoader.levelData.boss) {
                const bossData = levelLoader.levelData.boss;
                const bossType = bossData.type || 'hans';
                boss = new Boss(bossType, renderer.scene, collision, gameState, player);
                boss.spawn(bossData.x, bossData.z, bossData.triggerZone);

                // Include boss mesh in weapon raycaster targets
                const allMeshes = [...enemyManager.getEnemyMeshes(), ...boss.getMeshes()];
                weaponSystem.setEnemyMeshes(allMeshes);
            } else {
                weaponSystem.setEnemyMeshes(enemyManager.getEnemyMeshes());
            }

            // Initialize level stats (boss counts as 1 kill for boss levels)
            const totalKills = levelLoader.entities.length + (isBossLevel ? 1 : 0);
            gameState.startLevel({
                totalSecrets: levelLoader.secrets.length,
                totalKills,
                totalTreasures: levelLoader.pickups.filter(
                    (p) => p.type?.startsWith('treasure')
                ).length,
                parTime: levelLoader.levelData?.par_time || 0,
            });

            // Spawn player at new level's start
            player.spawn(
                levelLoader.spawnPoint.x,
                levelLoader.spawnPoint.z,
                levelLoader.spawnPoint.angle
            );
            player.enabled = true;

            // Resume with exploration music
            const episodeTrack = `e${data.episode}_explore`;
            audioManager.crossfadeTo(episodeTrack, 1.0);

            // Reset minimap for new level
            if (minimap) minimap.reset();

            // Fade out transition screen
            if (transition.parentNode) {
                transition.style.transition = 'opacity 0.5s ease-out';
                transition.style.opacity = '0';
                setTimeout(() => transition.remove(), 600);
            }

            showScreen('game');
            if (mobileControls) {
                mobileControls.enable();
            } else {
                input.requestPointerLock();
            }
            weaponHUD.setVisible(true);
            if (crosshair) crosshair.classList.remove('hidden');
            updateHUD(); // Immediately update floor number and par time
            startGameLoop();
        } catch (err) {
            console.warn(`[main.js] Could not load ${levelId}:`, err.message);
            // If next level doesn't exist (404), show episode complete
            showEpisodeComplete(data.episode);
        }
    });

    // Secret found — SFX + log for debugging
    eventBus.on('secret:found', (data) => {
        gameState.recordSecret();
        audioManager.playSFX('secret_found', 1.0);
    });

    // ── Boss Events ───────────────────────────────────────────────

    // Boss encounter — switch to episode-specific combat music
    eventBus.on('boss:encounter', (data) => {
        const combatTrack = `e${gameState.currentEpisode}_combat`;
        audioManager.crossfadeTo(combatTrack, 1.0);
    });

    // Boss hit — show hit marker
    eventBus.on('boss:hit', () => {
        if (hitMarker) {
            hitMarker.classList.remove('hidden');
            hitMarker.classList.add('active');
            hitMarkerTimer = 0.1;
        }
    });

    // Boss death — open exit, play victory music, refresh weapon targets
    eventBus.on('boss:death', (data) => {
        audioManager.crossfadeTo('victory', 1.0);

        // Unlock the exit behind the boss (open the exit if it was locked)
        if (levelLoader.exit && levelExit) {
            levelExit.setExit(levelLoader.exit.x, levelLoader.exit.z);
        }

        // Refresh weapon raycaster targets (boss mesh no longer alive)
        const enemyMeshes = enemyManager.getEnemyMeshes();
        weaponSystem.setEnemyMeshes(enemyMeshes);
    });

    // Boss summon — Schabbs summons a mutant near the player
    eventBus.on('boss:summon', (data) => {
        if (enemyManager) {
            const summonedEnemy = enemyManager.spawnEnemy({
                type: data.type,
                x: data.x,
                z: data.z,
                angle: Math.random() * Math.PI * 2,
                state: 'alert', // Summoned enemies are immediately hostile
                summoned: true, // Tag so boss can track summon deaths
            });

            // Refresh weapon raycaster targets to include the new summon
            const enemyMeshes = enemyManager.getEnemyMeshes();
            const bossMeshes = boss ? boss.getMeshes() : [];
            weaponSystem.setEnemyMeshes([...enemyMeshes, ...bossMeshes]);
        }
    });

    // Boss gas cloud — Otto Giftmacher deploys toxic gas (3D visual + screen overlay)

    eventBus.on('boss:gas_cloud', (data) => {
        // 3D gas cloud: translucent green cylinder in the scene
        const gasGeo = new THREE.CylinderGeometry(data.radius, data.radius, 1.8, 16);
        const gasMat = new THREE.MeshBasicMaterial({
            color: 0x00cc00,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const gasMesh = new THREE.Mesh(gasGeo, gasMat);
        gasMesh.position.set(data.x, 0.9, data.z);
        renderer.scene.add(gasMesh);
        gasCloudMeshes.push(gasMesh);

        // Animate gas opacity pulse + auto-remove after duration
        const startTime = performance.now();
        const duration = (data.duration || 5) * 1000;
        const animateGas = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= duration) {
                renderer.scene.remove(gasMesh);
                gasGeo.dispose();
                gasMat.dispose();
                const idx = gasCloudMeshes.indexOf(gasMesh);
                if (idx !== -1) gasCloudMeshes.splice(idx, 1);
                return;
            }
            // Pulse opacity
            const fade = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1;
            gasMat.opacity = (0.1 + Math.sin(elapsed / 300) * 0.05) * fade;
            // Slow rotation for visual interest
            gasMesh.rotation.y += 0.005;
            requestAnimationFrame(animateGas);
        };
        requestAnimationFrame(animateGas);

        // Screen overlay for when player is near
        if (!gasOverlay) {
            gasOverlay = document.createElement('div');
            Object.assign(gasOverlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'radial-gradient(circle, rgba(0,180,0,0.15) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: '900', opacity: '0',
                transition: 'opacity 0.3s ease-in',
            });
            document.body.appendChild(gasOverlay);
        }
    });

    eventBus.on('boss:gas_damage', () => {
        // Flash green overlay on gas damage tick
        if (gasOverlay) {
            gasOverlay.style.opacity = '1';
            gasOverlay.style.background = 'radial-gradient(circle, rgba(0,200,0,0.3) 0%, rgba(0,100,0,0.1) 60%, transparent 80%)';
            setTimeout(() => {
                if (gasOverlay) gasOverlay.style.opacity = '0.4';
            }, 200);
        }
    });

    eventBus.on('boss:gas_cloud_expire', () => {
        if (gasOverlay) {
            gasOverlay.style.opacity = '0';
        }
    });

    // Boss rocket fire — Fettgesicht's rockets (screen shake + audio)
    eventBus.on('boss:rocket_fire', () => {
        player.shake(0.8);
        audioManager.playSFX('weapon_chaingun', 0.8);
    });

    // Boss door lock — emitted when player enters boss trigger zone
    eventBus.on('boss:door_lock', () => {
        // The boss door lock is handled visually — the collision grid already
        // has walls around the boss room; the door cell is set to wall to trap the player
        if (levelLoader.levelData && levelLoader.levelData.isBossLevel) {
            const bossDoor = (levelLoader.levelData.doors || []).find(d => d.bossDoor);
            if (bossDoor && collision) {
                collision.setWall(bossDoor.x, bossDoor.z, true);
            }
        }
    });

    // Boss phase transition — mech destroyed, spawn human Hitler (phase 2)
    eventBus.on('boss:phase_transition', (data) => {
        // Clean up phase 1 boss (mesh, health bar, event listeners)
        if (boss) {
            boss.dispose();
        }

        // Create phase 2 boss at the same position
        boss = new Boss(data.nextPhase, renderer.scene, collision, gameState, player);
        boss.spawn(data.position.x, data.position.z);
        boss.triggerEncounter(); // Immediately active — no dormant phase

        // Refresh weapon raycaster targets to include new boss mesh
        const allMeshes = [...enemyManager.getEnemyMeshes(), ...boss.getMeshes()];
        weaponSystem.setEnemyMeshes(allMeshes);
    });

    // ── Cheat Code Events ────────────────────────────────────────

    // Cheat activated — play the satisfying pickup_treasure SFX
    eventBus.on('cheat:activated', () => {
        audioManager.playSFX('pickup_treasure', 1.0);
    });

    // Full map reveal — mark all cells as explored on the minimap
    eventBus.on('cheat:fullmap', () => {
        if (minimap && levelLoader) {
            for (let z = 0; z < levelLoader.height; z++) {
                for (let x = 0; x < levelLoader.width; x++) {
                    minimap._explored.add(`${x},${z}`);
                }
            }
        }
    });

    // God mode — update BJ face in HUD with sunglasses image
    eventBus.on('cheat:godmode', (data) => {
        if (hudFace && data.active) {
            hudFace.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#1a1a2e;border-radius:4px;">😎</div>`;
        }
        // When deactivated, the regular updateHUD() will restore the normal face
    });

    // Weapons cheat — switch to chaingun (best weapon)
    eventBus.on('cheat:weapons', () => {
        if (weaponSystem) {
            weaponSystem.switchWeapon(3); // Chaingun
            eventBus.emit('weapon:switch', {
                index: 3,
                weapon: { name: 'Chain Gun' },
            });
        }
    });

    // ── Extra Life Events ────────────────────────────────────────

    // Extra life at every 40,000 points — show notification + SFX
    eventBus.on('player:extralife', () => {
        // Play a special sound (reuse pickup_treasure with higher pitch feel)
        audioManager.playSFXWithPitch('pickup_treasure', 1.0, 1.5);

        // Show EXTRA LIFE notification
        let el = document.getElementById('extralife-notify');
        if (!el) {
            el = document.createElement('div');
            el.id = 'extralife-notify';
            el.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-family: 'Press Start 2P', 'Courier New', monospace;
                font-size: clamp(1.2rem, 4vw, 2rem);
                font-weight: 900;
                color: #00FF80;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                text-shadow: 0 0 20px rgba(0, 255, 128, 0.8), 0 0 40px rgba(0, 255, 128, 0.4), 2px 2px 0 rgba(0,0,0,0.9);
                z-index: 150;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.15s ease-in;
            `;
            document.body.appendChild(el);
        }
        el.textContent = 'EXTRA LIFE!';
        el.style.opacity = '1';

        setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease-out';
            el.style.opacity = '0';
            setTimeout(() => { el.style.transition = 'opacity 0.15s ease-in'; }, 600);
        }, 2000);
    });
}

// ── Game State Transitions ──────────────────────────────────────────

/**
 * Start a new game from the main menu.
 * Plays the episode intro cinematic first, then begins gameplay.
 */
async function startGame(episode = 1) {
    // Clean up previous game state
    if (boss) { boss.dispose(); boss = null; }
    for (const mesh of gasCloudMeshes) {
        renderer.scene.remove(mesh);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
    }
    gasCloudMeshes.length = 0;
    if (gasOverlay) gasOverlay.style.opacity = '0';
    if (damageIndicator) damageIndicator.reset();
    stopGameLoop();

    gameState.newGame();
    gameState.currentEpisode = episode;
    gameState.currentFloor = 1;

    // Load the first level of the selected episode
    const levelId = `e${episode}m1`;
    try {
        await levelLoader.loadLevel(levelId);
    } catch (err) {
        console.error(`Failed to load ${levelId}:`, err);
        return;
    }

    // Re-initialize all systems for the new level (same pattern as level:advance)
    collision.setGrid(levelLoader.grid, levelLoader.width, levelLoader.height);

    doorSystem.dispose();
    doorSystem = new DoorSystem(levelLoader, collision, gameState);

    secretSystem.dispose();
    secretSystem = new SecretSystem(levelLoader, collision, gameState);

    enemyManager.dispose();
    enemyManager = new EnemyManager(renderer.scene, collision, gameState, player);

    pickupSystem.dispose();
    pickupSystem = new PickupSystem(renderer.scene, gameState, player, renderer.camera);

    // Set exit (boss levels start locked)
    levelExit.reset();
    const isBossLevel = levelLoader.levelData?.isBossLevel;
    if (levelLoader.exit && !isBossLevel) {
        levelExit.setExit(levelLoader.exit.x, levelLoader.exit.z);
    }

    // Spawn enemies and pickups
    enemyManager.spawnFromLevel(levelLoader.entities);
    pickupSystem.spawnFromLevel(levelLoader.pickups);

    // Boss level setup
    if (isBossLevel && levelLoader.levelData?.boss) {
        const bossData = levelLoader.levelData.boss;
        boss = new Boss(bossData.type || 'hans', renderer.scene, collision, gameState, player);
        boss.spawn(bossData.x, bossData.z, bossData.triggerZone);
        weaponSystem.setEnemyMeshes([...enemyManager.getEnemyMeshes(), ...boss.getMeshes()]);
    } else {
        weaponSystem.setEnemyMeshes(enemyManager.getEnemyMeshes());
    }

    // Initialize level stats
    const totalKills = levelLoader.entities.length + (isBossLevel ? 1 : 0);
    gameState.startLevel({
        totalSecrets: levelLoader.secrets.length,
        totalKills,
        totalTreasures: levelLoader.pickups.filter(p => p.type?.startsWith('treasure')).length,
        parTime: levelLoader.levelData?.par_time || 90,
    });

    player.spawn(levelLoader.spawnPoint.x, levelLoader.spawnPoint.z, levelLoader.spawnPoint.angle);

    // Play episode intro cinematic before starting gameplay
    const introBeats = EPISODE_INTROS[episode];
    if (introBeats) {
        await cinematics.play(introBeats);
    }

    // After cinematic completes (or is skipped), start gameplay
    player.enabled = true;
    showScreen('game');

    // On mobile, enable touch controls instead of pointer lock
    if (mobileControls) {
        mobileControls.enable();
    } else {
        input.requestPointerLock();
    }

    // Episode-specific exploration music
    const episodeTrack = `e${gameState.currentEpisode}_explore`;
    audioManager.playMusic(episodeTrack);

    weaponHUD.setVisible(true);
    if (crosshair) crosshair.classList.remove('hidden');

    // Reset minimap explored areas for new game
    if (minimap) minimap.reset();

    // Start ambient dungeon drip loop
    startAmbientAudio();

    startGameLoop();
}

/**
 * Continue from a saved game. Loads save data, applies it to gameState,
 * and loads the saved level.
 */
async function continueGame() {
    const save = saveSystem.load();
    if (!save) return;

    // Hide menus
    menuController.hide();

    // Apply saved state
    gameState.newGame(); // Reset everything first
    gameState.currentEpisode = save.episode;
    gameState.currentFloor = save.floor;
    gameState.setDifficulty(save.difficulty);
    gameState.health = save.health;
    gameState.lives = save.lives;
    gameState.score = save.score;
    gameState.ammo = save.ammo;
    gameState.weapons = save.weapons.slice();
    gameState.currentWeapon = save.currentWeapon;

    // Load the saved level
    const levelId = `e${save.episode}m${save.floor}`;
    try {
        stopGameLoop();
        await levelLoader.loadLevel(levelId);
        collision.setGrid(levelLoader.grid, levelLoader.width, levelLoader.height);

        // Re-initialize systems for the level
        doorSystem.dispose();
        doorSystem = new DoorSystem(levelLoader, collision, gameState);

        secretSystem.dispose();
        secretSystem = new SecretSystem(levelLoader, collision, gameState);

        levelExit.reset();
        if (levelLoader.exit) {
            levelExit.setExit(levelLoader.exit.x, levelLoader.exit.z);
        }

        // Dispose and re-create enemies and pickups for the loaded level
        enemyManager.dispose();
        enemyManager = new EnemyManager(renderer.scene, collision, gameState, player);
        pickupSystem.dispose();
        pickupSystem = new PickupSystem(renderer.scene, gameState, player, renderer.camera);

        enemyManager.spawnFromLevel(levelLoader.entities);
        pickupSystem.spawnFromLevel(levelLoader.pickups);

        // Boss level: spawn boss and lock exit
        const isBossLevel = levelLoader.levelData?.isBossLevel;
        if (isBossLevel && levelLoader.levelData?.boss) {
            const bossData = levelLoader.levelData.boss;
            boss = new Boss(bossData.type || 'hans', renderer.scene, collision, gameState, player);
            boss.spawn(bossData.x, bossData.z, bossData.triggerZone);
            weaponSystem.setEnemyMeshes([...enemyManager.getEnemyMeshes(), ...boss.getMeshes()]);
            // Boss levels start with exit locked
            levelExit.reset();
        } else {
            weaponSystem.setEnemyMeshes(enemyManager.getEnemyMeshes());
        }

        gameState.startLevel({
            totalSecrets: levelLoader.secrets.length,
            totalKills: levelLoader.entities.length + (isBossLevel ? 1 : 0),
            totalTreasures: levelLoader.pickups.filter(
                (p) => p.type?.startsWith('treasure')
            ).length,
            parTime: levelLoader.levelData?.par_time || 0,
        });

        player.spawn(
            levelLoader.spawnPoint.x,
            levelLoader.spawnPoint.z,
            levelLoader.spawnPoint.angle
        );
        player.enabled = true;

        // Start gameplay
        showScreen('game');
        if (mobileControls) {
            mobileControls.enable();
        } else {
            input.requestPointerLock();
        }

        const episodeTrack = `e${save.episode}_explore`;
        audioManager.playMusic(episodeTrack);

        weaponHUD.setVisible(true);
        if (crosshair) crosshair.classList.remove('hidden');

        // Sync weapon system to saved weapon
        weaponSystem.switchWeapon(gameState.currentWeapon);

        // Emit weapon:switch so HUD shows correct weapon
        eventBus.emit('weapon:switch', {
            index: gameState.currentWeapon,
            weapon: { name: ['Knife', 'Pistol', 'Machine Gun', 'Chain Gun'][gameState.currentWeapon] || 'Pistol' },
        });

        // Reset minimap and start ambient
        if (minimap) minimap.reset();
        startAmbientAudio();

        startGameLoop();
    } catch (err) {
        console.error(`[main.js] Failed to load saved level ${levelId}:`, err);
        showScreen('menu');
    }
}

/**
 * Show the episode complete screen and unlock the next episode.
 * @param {number} episode - The episode that was just completed
 */
function showEpisodeComplete(episode) {
    stopGameLoop();
    player.enabled = false;
    input.exitPointerLock();
    weaponHUD.setVisible(false);
    if (crosshair) crosshair.classList.add('hidden');

    // Play victory music
    audioManager.crossfadeTo('victory', 1.0);

    // Create episode complete overlay
    const overlay = document.createElement('div');
    overlay.id = 'episode-complete-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: '9999',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: '#fff',
    });

    const EPISODE_NAMES = [
        '',
        'Escape from Castle Wolfenstein',
        'Operation Eisenfaust',
        'Die, Fuhrer, Die!',
        'A Dark Secret',
        'Trail of the Madman',
        'Confrontation',
        'The Nightmare',
    ];

    const card = document.createElement('div');
    Object.assign(card.style, {
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        border: '3px solid #c0392b',
        borderRadius: '8px',
        padding: '50px 70px',
        textAlign: 'center',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 0 60px rgba(192, 57, 43, 0.5)',
    });

    card.innerHTML = `
        <h1 style="
            color: #c0392b; font-size: 28px; margin: 0 0 12px 0;
            text-transform: uppercase; letter-spacing: 4px;
        ">Episode ${episode} Complete</h1>
        <h2 style="color: #f39c12; font-size: 16px; margin: 0 0 30px 0;">
            ${EPISODE_NAMES[episode] || ''}
        </h2>
        <div style="width: 80%; height: 2px; background: #c0392b; margin: 0 auto 30px;"></div>
        <p style="color: #bdc3c7; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
            Final Score: <span style="color: #2ecc71; font-weight: bold;">${gameState.score.toLocaleString()}</span>
        </p>
        ${episode < 6 ? `
        <p style="color: #3498db; font-size: 12px; margin: 0 0 30px 0;">
            Episode ${episode + 1} unlocked!
        </p>` : episode === 6 ? `
        <p style="color: #ff4444; font-size: 12px; margin: 0 0 30px 0;">
            BONUS EPISODE UNLOCKED: The Nightmare
        </p>` : `
        <p style="color: #f39c12; font-size: 14px; margin: 0 0 30px 0;">
            THE NIGHTMARE IS OVER. You have conquered everything.
        </p>`}
        <div style="margin-top: 20px; color: #7f8c8d; font-size: 10px; animation: blink 1.2s ease-in-out infinite;">
            Press any key to return to menu
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`;
    overlay.appendChild(style);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Unlock next episode in the episode select screen + persist to localStorage
    if (episode < 7) {
        const nextEp = episode + 1;
        const nextEpCard = document.querySelector(`.episode-card[data-episode="${nextEp}"]`);
        if (nextEpCard) {
            nextEpCard.classList.remove('locked');
            nextEpCard.removeAttribute('disabled');
            const lockOverlay = nextEpCard.querySelector('.lock-overlay');
            if (lockOverlay) lockOverlay.remove();
        }

        // Persist unlocked episodes to localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('wolf3d-episodes-unlocked') || '[]');
            if (!stored.includes(nextEp)) {
                stored.push(nextEp);
                localStorage.setItem('wolf3d-episodes-unlocked', JSON.stringify(stored));
            }
        } catch (_) { /* ignore storage errors */ }
    }

    // Delete the save (episode is complete, start fresh)
    saveSystem.deleteSave();
    if (continueBtn) continueBtn.style.display = 'none';

    // Listen for keypress to continue
    const handler = async (e) => {
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
        document.removeEventListener('keydown', handler);
        overlay.remove();

        // Play credits after completing Episode 3 or 6
        if (episode === 3 || episode === 6 || episode === 7) {
            audioManager.stopMusic();
            await credits.play();
        }

        quitToMenu();
    };
    document.addEventListener('keydown', handler);

    // Auto-return after 20 seconds
    setTimeout(async () => {
        document.removeEventListener('keydown', handler);
        if (overlay.parentNode) {
            overlay.remove();

            // Play credits after completing Episode 3 or 6
            if (episode === 3 || episode === 6 || episode === 7) {
                audioManager.stopMusic();
                await credits.play();
            }

            quitToMenu();
        }
    }, 20000);
}

/**
 * Pause the game.
 */
function pauseGame() {
    gameState.isPaused = true;
    player.enabled = false;
    input.exitPointerLock();
    if (mobileControls) mobileControls.disable();
    showScreen('pause');
    weaponHUD.setVisible(false);
    if (crosshair) crosshair.classList.add('hidden');
    eventBus.emit('game:pause');
}

/**
 * Resume from pause.
 */
function resumeGame() {
    gameState.isPaused = false;
    player.enabled = true;
    showScreen('game');
    if (mobileControls) {
        mobileControls.enable();
    } else {
        input.requestPointerLock();
    }
    weaponHUD.setVisible(true);
    if (crosshair) crosshair.classList.remove('hidden');
    eventBus.emit('game:resume');
}

/**
 * Restart the current level.
 */
async function restartLevel() {
    gameState.health = 100;
    gameState.ammo = 8;
    gameState.keys = [];
    gameState.startLevel({
        totalSecrets: levelLoader.secrets.length,
        totalKills: levelLoader.entities.length,
        totalTreasures: 0,
        parTime: levelLoader.levelData?.par_time || 0,
    });
    player.spawn(levelLoader.spawnPoint.x, levelLoader.spawnPoint.z, levelLoader.spawnPoint.angle);
    player.enabled = true;
    gameState.isPaused = false;
    showScreen('game');
    if (mobileControls) {
        mobileControls.enable();
    } else {
        input.requestPointerLock();
    }
}

/**
 * Respawn the player after losing a life.
 */
function respawnPlayer() {
    gameState.health = 100;
    gameState.ammo = 8;
    player.spawn(levelLoader.spawnPoint.x, levelLoader.spawnPoint.z, levelLoader.spawnPoint.angle);
}

/**
 * Game over — stop the game and show the menu.
 */
function gameOver() {
    gameState.isPlaying = false;
    player.enabled = false;
    input.exitPointerLock();
    if (mobileControls) mobileControls.disable();
    stopGameLoop();
    stopAmbientAudio();
    audioManager.crossfadeTo('gameover', 1.0);
    if (crosshair) crosshair.classList.add('hidden');
    weaponHUD.setVisible(false);

    // Wait for explicit keypress before returning to menu
    const gameOverHandler = (e) => {
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
        document.removeEventListener('keydown', gameOverHandler);
        // Clean up game over screen
        if (damageIndicator) damageIndicator.reset();
        audioManager.stopMusic();
        quitToMenu();
    };
    // Also handle click/tap for mobile
    const gameOverClick = () => {
        document.removeEventListener('click', gameOverClick);
        document.removeEventListener('keydown', gameOverHandler);
        if (damageIndicator) damageIndicator.reset();
        audioManager.stopMusic();
        quitToMenu();
    };
    // Delay the listener to prevent accidental dismissal
    setTimeout(() => {
        document.addEventListener('keydown', gameOverHandler);
        document.addEventListener('click', gameOverClick);
    }, 2000);
}

/**
 * Quit to main menu.
 */
function quitToMenu() {
    gameState.isPlaying = false;
    gameState.isPaused = false;
    player.enabled = false;
    input.exitPointerLock();
    if (mobileControls) mobileControls.disable();
    stopGameLoop();
    // Clean up boss if active
    if (boss) {
        boss.dispose();
        boss = null;
    }
    // Clean up gas cloud meshes + overlay
    for (const mesh of gasCloudMeshes) {
        renderer.scene.remove(mesh);
        mesh.geometry?.dispose();
        mesh.material?.dispose();
    }
    gasCloudMeshes.length = 0;
    if (gasOverlay) gasOverlay.style.opacity = '0';
    stopAmbientAudio();
    audioManager.stopMusic();
    audioManager.playMusic('menu');
    weaponHUD.setVisible(false);
    if (crosshair) crosshair.classList.add('hidden');
    showScreen('menu');
}

// ── Ambient Audio Helpers ───────────────────────────────────────────

/**
 * Start the episode-appropriate ambient loop at low volume.
 * Episode 1: dungeon water dripping
 * Episode 2: laboratory buzzing/bubbling
 */
function startAmbientAudio() {
    stopAmbientAudio(); // Ensure no duplicates
    const ambientMap = {
        1: 'ambient_drip',
        2: 'ambient_lab',
    };
    const ambient = ambientMap[gameState.currentEpisode] || 'ambient_drip';
    audioManager.playAmbientLoop(ambient, 0.15);
}

/**
 * Stop the ambient drip loop.
 */
function stopAmbientAudio() {
    audioManager.stopAmbientLoop();
}

// ── Fallback Test Level ─────────────────────────────────────────────

/**
 * Create a minimal test level if no level JSON is found.
 * Generates a small room the player can walk around in.
 */
function createTestLevel() {
    const size = 16;
    const grid = [];

    for (let z = 0; z < size; z++) {
        const row = [];
        for (let x = 0; x < size; x++) {
            // Border walls
            if (x === 0 || x === size - 1 || z === 0 || z === size - 1) {
                row.push(1);
            }
            // Interior walls for corridors
            else if (x === 6 && z > 2 && z < 10) {
                row.push(2);
            } else if (z === 8 && x > 8 && x < 14) {
                row.push(3);
            } else {
                row.push(0);
            }
        }
        grid.push(row);
    }

    levelLoader.grid = grid;
    levelLoader.width = size;
    levelLoader.height = size;
    levelLoader.spawnPoint = { x: 3.5, z: 3.5, angle: 0 };
    levelLoader.doors = [];
    levelLoader.entities = [];
    levelLoader.pickups = [];
    levelLoader.secrets = [];
    levelLoader.decorations = [];

    // Build geometry manually
    levelLoader._buildWalls();
    levelLoader._buildFloorCeiling();
    levelLoader._doorMeshes = [];
}

// ── Initialize ──────────────────────────────────────────────────────

boot().catch((err) => {
    console.error('[main.js] Boot failed:', err);
    setLoadingProgress(0, `Error: ${err.message}`);
});
