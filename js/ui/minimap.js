/**
 * minimap.js — Minimap Overlay
 *
 * Renders a small 2D minimap in the top-right corner showing:
 * - Wall grid as colored blocks
 * - Player position with direction indicator
 * - Fog of war (only explored areas visible)
 * - Enemies as red dots (if in player's line of sight)
 * - Doors as yellow marks
 * - Exit as green blinking dot
 * - Keys as gold/silver dots
 */

export class Minimap {
    /**
     * @param {import('../engine/level-loader.js').LevelLoader} levelLoader
     * @param {import('../game/player-controller.js').PlayerController} playerController
     * @param {import('../game/enemy-manager.js').EnemyManager} enemyManager
     */
    constructor(levelLoader, playerController, enemyManager) {
        /** @type {import('../engine/level-loader.js').LevelLoader} */
        this._levelLoader = levelLoader;

        /** @type {import('../game/player-controller.js').PlayerController} */
        this._player = playerController;

        /** @type {import('../game/enemy-manager.js').EnemyManager} */
        this._enemyManager = enemyManager;

        /** Canvas size in pixels */
        this._size = 180;

        /** Whether minimap is visible */
        this._visible = true;

        /** Fog of war: Set of explored cell keys "x,z" */
        this._explored = new Set();

        /** Exploration radius around the player (in grid cells) */
        this._exploreRadius = 5;

        /** Blink timer for exit dot */
        this._blinkTimer = 0;

        // ── Create DOM ──────────────────────────────────────────────
        this._canvas = document.createElement('canvas');
        this._canvas.id = 'minimap-canvas';
        this._canvas.width = this._size;
        this._canvas.height = this._size;
        this._canvas.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            width: ${this._size}px;
            height: ${this._size}px;
            border: 2px solid rgba(255, 200, 50, 0.6);
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.8);
            z-index: 50;
            pointer-events: none;
            image-rendering: pixelated;
        `;
        document.body.appendChild(this._canvas);

        /** @type {CanvasRenderingContext2D} */
        this._ctx = this._canvas.getContext('2d');
    }

    /**
     * Update the minimap rendering. Call each frame.
     * @param {number} [dt=0] - Delta time for animations
     */
    update(dt = 0) {
        if (!this._visible) return;

        const grid = this._levelLoader.grid;
        const gridW = this._levelLoader.width;
        const gridH = this._levelLoader.height;

        if (!grid || gridW === 0 || gridH === 0) return;

        this._blinkTimer += dt;

        // Update explored cells around the player
        this._updateExploration();

        const ctx = this._ctx;
        const size = this._size;
        const cellSize = size / Math.max(gridW, gridH);

        // Clear
        ctx.clearRect(0, 0, size, size);

        // ── Draw walls and floor ────────────────────────────────────
        for (let z = 0; z < gridH; z++) {
            for (let x = 0; x < gridW; x++) {
                const key = `${x},${z}`;
                if (!this._explored.has(key)) continue;

                const px = x * cellSize;
                const py = z * cellSize;

                if (grid[z][x] > 0) {
                    // Wall colors by type
                    const wallType = grid[z][x];
                    ctx.fillStyle = this._wallColor(wallType);
                    ctx.fillRect(px, py, Math.ceil(cellSize), Math.ceil(cellSize));
                } else {
                    // Floor — dark tint
                    ctx.fillStyle = 'rgba(60, 60, 70, 0.8)';
                    ctx.fillRect(px, py, Math.ceil(cellSize), Math.ceil(cellSize));
                }
            }
        }

        // ── Draw doors ──────────────────────────────────────────────
        for (const door of this._levelLoader.doors) {
            const key = `${door.gridX},${door.gridZ}`;
            if (!this._explored.has(key)) continue;

            const px = door.gridX * cellSize + cellSize * 0.1;
            const py = door.gridZ * cellSize + cellSize * 0.1;
            ctx.fillStyle = door.requiredKey === 'gold' ? '#DAA520'
                : door.requiredKey === 'silver' ? '#C0C0C0'
                : '#CCCC44';
            ctx.fillRect(px, py, cellSize * 0.8, cellSize * 0.8);
        }

        // ── Draw pickups (keys only) ────────────────────────────────
        for (const pickup of this._levelLoader.pickups) {
            if (pickup.type !== 'gold_key' && pickup.type !== 'silver_key') continue;

            const gx = Math.floor(pickup.x);
            const gz = Math.floor(pickup.z);
            const key = `${gx},${gz}`;
            if (!this._explored.has(key)) continue;

            const px = pickup.x * cellSize;
            const py = pickup.z * cellSize;
            const dotSize = Math.max(2, cellSize * 0.6);

            ctx.fillStyle = pickup.type === 'gold_key' ? '#FFD700' : '#C0C0C0';
            ctx.beginPath();
            ctx.arc(px, py, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Draw exit (blinking green) ──────────────────────────────
        const exit = this._levelLoader.exit;
        if (exit) {
            const gx = Math.floor(exit.x);
            const gz = Math.floor(exit.z);
            const key = `${gx},${gz}`;
            if (this._explored.has(key)) {
                const blink = Math.sin(this._blinkTimer * 4) * 0.5 + 0.5;
                const alpha = 0.4 + blink * 0.6;
                ctx.fillStyle = `rgba(0, 255, 80, ${alpha})`;
                const px = exit.x * cellSize;
                const py = exit.z * cellSize;
                const dotSize = Math.max(3, cellSize * 0.7);
                ctx.beginPath();
                ctx.arc(px, py, dotSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Draw enemies (red dots, only if in LOS) ────────────────
        if (this._enemyManager) {
            const enemies = this._enemyManager.getEnemyPositions();
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;

                // Only show if within reasonable range and explored
                const gx = Math.floor(enemy.x);
                const gz = Math.floor(enemy.z);
                const key = `${gx},${gz}`;
                if (!this._explored.has(key)) continue;

                // Simple distance check as a proxy for LOS on the minimap
                const dx = enemy.x - this._player.position.x;
                const dz = enemy.z - this._player.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > 15) continue;

                const px = enemy.x * cellSize;
                const py = enemy.z * cellSize;
                const dotSize = Math.max(2, cellSize * 0.5);

                ctx.fillStyle = '#FF3333';
                ctx.beginPath();
                ctx.arc(px, py, dotSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── Draw player ─────────────────────────────────────────────
        const playerPx = this._player.position.x * cellSize;
        const playerPy = this._player.position.z * cellSize;
        const playerDotSize = Math.max(3, cellSize * 0.6);

        // Direction triangle
        const angle = this._player.rotation;
        const triLen = cellSize * 1.5;
        const tipX = playerPx + Math.sin(angle) * triLen;
        const tipY = playerPy - Math.cos(angle) * triLen;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
            playerPx + Math.sin(angle + 2.5) * triLen * 0.5,
            playerPy - Math.cos(angle + 2.5) * triLen * 0.5
        );
        ctx.lineTo(
            playerPx + Math.sin(angle - 2.5) * triLen * 0.5,
            playerPy - Math.cos(angle - 2.5) * triLen * 0.5
        );
        ctx.closePath();
        ctx.fill();

        // Player dot (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(playerPx, playerPy, playerDotSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Toggle minimap visibility.
     */
    toggle() {
        this._visible = !this._visible;
        this._canvas.style.display = this._visible ? 'block' : 'none';
    }

    /**
     * Set minimap visibility.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this._visible = visible;
        this._canvas.style.display = visible ? 'block' : 'none';
    }

    /**
     * Reset explored areas (for new level).
     */
    reset() {
        this._explored.clear();
    }

    /**
     * Clean up DOM element.
     */
    dispose() {
        if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
        this._canvas = null;
        this._ctx = null;
    }

    // ── Internal ────────────────────────────────────────────────────

    /**
     * Mark cells around the player as explored.
     */
    _updateExploration() {
        const px = Math.floor(this._player.position.x);
        const pz = Math.floor(this._player.position.z);
        const r = this._exploreRadius;

        for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
                const gx = px + dx;
                const gz = pz + dz;
                if (gx >= 0 && gx < this._levelLoader.width &&
                    gz >= 0 && gz < this._levelLoader.height) {
                    this._explored.add(`${gx},${gz}`);
                }
            }
        }
    }

    /**
     * Get a color for a wall type.
     * @param {number} wallType
     * @returns {string}
     */
    _wallColor(wallType) {
        const colors = {
            1: '#808080', // Grey stone
            2: '#707090', // Grey eagle
            3: '#4A6A8C', // Blue brick
            4: '#3A4A6C', // Blue cell
            5: '#8C6A3A', // Wood
            6: '#7A5A2A', // Wood portrait
            7: '#6A6A7A', // Metal
            8: '#5A4A3A', // Door frame
            9: '#4A4A5A', // Elevator
        };
        return colors[wallType] || '#666666';
    }
}
