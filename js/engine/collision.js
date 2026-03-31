/**
 * collision.js — Grid-Based Collision Detection
 *
 * All collision is resolved against a 2D grid where each cell is 1x1 world units.
 * Walls are any cell with a value > 0. Movement is resolved axis-independently
 * so the player slides along walls naturally.
 */

export class CollisionSystem {
    constructor() {
        /** @type {number[][]} 2D array [z][x] of wall type IDs. 0 = empty. */
        this._grid = [];

        /** Grid dimensions */
        this._width = 0;
        this._height = 0;

        /** Default player collision radius in world units */
        this.playerRadius = 0.3;
    }

    /**
     * Set the level grid for collision queries.
     * @param {number[][]} grid - 2D array [z][x], 0 = empty, >0 = wall
     * @param {number} width - Grid width (X dimension)
     * @param {number} height - Grid height (Z dimension)
     */
    setGrid(grid, width, height) {
        this._grid = grid;
        this._width = width;
        this._height = height;
    }

    /**
     * Check if a grid cell is a solid wall.
     * Out-of-bounds cells are treated as walls.
     * @param {number} gridX - Grid X index
     * @param {number} gridZ - Grid Z index
     * @returns {boolean}
     */
    isWall(gridX, gridZ) {
        if (gridX < 0 || gridX >= this._width || gridZ < 0 || gridZ >= this._height) {
            return true; // Out of bounds is always solid
        }
        return this._grid[gridZ][gridX] > 0;
    }

    /**
     * Set or clear a wall at a grid position. Used for boss door locks.
     * @param {number} gridX - Grid X index
     * @param {number} gridZ - Grid Z index
     * @param {boolean} isWall - True to set as wall, false to clear
     */
    setWall(gridX, gridZ, isWall) {
        if (gridX < 0 || gridX >= this._width || gridZ < 0 || gridZ >= this._height) {
            return;
        }
        this._grid[gridZ][gridX] = isWall ? 1 : 0;
    }

    /**
     * Convert world coordinates to grid indices.
     * @param {number} worldX
     * @param {number} worldZ
     * @returns {{ x: number, z: number }} Grid cell indices (floored)
     */
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.floor(worldX),
            z: Math.floor(worldZ),
        };
    }

    /**
     * Convert grid indices to world-space center of that cell.
     * @param {number} gridX
     * @param {number} gridZ
     * @returns {{ x: number, z: number }} World center of the cell
     */
    gridToWorld(gridX, gridZ) {
        return {
            x: gridX + 0.5,
            z: gridZ + 0.5,
        };
    }

    /**
     * Attempt to move from `position` to `newPosition` with collision radius.
     * Uses axis-independent resolution for wall sliding.
     *
     * @param {{ x: number, z: number }} position - Current world position
     * @param {{ x: number, z: number }} newPosition - Desired world position
     * @param {number} [radius] - Collision radius (defaults to playerRadius)
     * @returns {{ x: number, z: number }} Adjusted position after collision
     */
    checkMove(position, newPosition, radius) {
        const r = radius !== undefined ? radius : this.playerRadius;
        let finalX = newPosition.x;
        let finalZ = newPosition.z;

        // ── Try X movement independently ────────────────────────────
        if (!this._isPositionClear(finalX, position.z, r)) {
            finalX = position.x; // Block X movement
        }

        // ── Try Z movement independently ────────────────────────────
        if (!this._isPositionClear(finalX, finalZ, r)) {
            finalZ = position.z; // Block Z movement
        }

        // ── Final safety check (corner case) ────────────────────────
        if (!this._isPositionClear(finalX, finalZ, r)) {
            finalX = position.x;
            finalZ = position.z;
        }

        return { x: finalX, z: finalZ };
    }

    /**
     * Mark a grid cell as empty (e.g., when a door opens).
     * @param {number} gridX
     * @param {number} gridZ
     */
    clearCell(gridX, gridZ) {
        if (gridX >= 0 && gridX < this._width && gridZ >= 0 && gridZ < this._height) {
            this._grid[gridZ][gridX] = 0;
        }
    }

    /**
     * Mark a grid cell as solid (e.g., when a door closes).
     * @param {number} gridX
     * @param {number} gridZ
     * @param {number} [wallType=1] - Wall type ID
     */
    fillCell(gridX, gridZ, wallType = 1) {
        if (gridX >= 0 && gridX < this._width && gridZ >= 0 && gridZ < this._height) {
            this._grid[gridZ][gridX] = wallType;
        }
    }

    /**
     * Get the wall type at a grid position. Returns 0 for empty, >0 for wall type.
     * Out-of-bounds returns -1.
     * @param {number} gridX
     * @param {number} gridZ
     * @returns {number}
     */
    getWallType(gridX, gridZ) {
        if (gridX < 0 || gridX >= this._width || gridZ < 0 || gridZ >= this._height) {
            return -1;
        }
        return this._grid[gridZ][gridX];
    }

    // ── Internal helpers ────────────────────────────────────────────

    /**
     * Check if a circle at (worldX, worldZ) with given radius is free of walls.
     * Tests the 4 cardinal edge points of the bounding circle against the grid.
     * @param {number} worldX
     * @param {number} worldZ
     * @param {number} radius
     * @returns {boolean} True if position is clear
     */
    _isPositionClear(worldX, worldZ, radius) {
        // Check all 4 corners of the bounding box defined by the radius
        const minX = worldX - radius;
        const maxX = worldX + radius;
        const minZ = worldZ - radius;
        const maxZ = worldZ + radius;

        // Check each corner against the grid
        if (this.isWall(Math.floor(minX), Math.floor(minZ))) return false;
        if (this.isWall(Math.floor(maxX), Math.floor(minZ))) return false;
        if (this.isWall(Math.floor(minX), Math.floor(maxZ))) return false;
        if (this.isWall(Math.floor(maxX), Math.floor(maxZ))) return false;

        return true;
    }
}
