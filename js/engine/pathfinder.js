/**
 * pathfinder.js — Grid A* Pathfinding
 *
 * Finds routes through the collision grid so enemies can walk around walls
 * and corners instead of pushing straight at the player. The grid is read
 * live on every query, so opening/closing doors and pushwalls are respected
 * without any cache invalidation.
 *
 * Movement is 8-directional; diagonal steps are only allowed when both
 * orthogonal neighbours are open, so paths never cut through wall corners.
 */

const SQRT2 = Math.SQRT2;

/** 8 neighbour offsets: 4 orthogonal first, then 4 diagonal */
const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Sample spacing for corridor clearance checks (world units) */
const CLEARANCE_STEP = 0.2;

export class Pathfinder {
    /**
     * @param {import('./collision.js').CollisionSystem} collision
     */
    constructor(collision) {
        this._collision = collision;

        /** Per-query buffers, reallocated only when the grid size changes */
        this._size = 0;
        this._g = null;
        this._f = null;
        this._parent = null;
        this._state = null; // 0 = unseen, 1 = open, 2 = closed
        this._heap = null;
        this._heapKeys = null;
    }

    /**
     * Find a path between two world positions.
     * @param {number} startX - World X of the start
     * @param {number} startZ - World Z of the start
     * @param {number} goalX - World X of the goal
     * @param {number} goalZ - World Z of the goal
     * @param {number} [maxExpanded=4096] - Search budget (nodes closed)
     * @returns {Array<{x: number, z: number}>|null} Cell-center waypoints
     *   (start cell excluded, goal cell last), or null when unreachable
     */
    findPath(startX, startZ, goalX, goalZ, maxExpanded = 4096) {
        const col = this._collision;
        const w = col.width;
        const h = col.height;
        const sx = Math.floor(startX);
        const sz = Math.floor(startZ);
        const gx = Math.floor(goalX);
        const gz = Math.floor(goalZ);

        if (col.isWall(sx, sz) || col.isWall(gx, gz)) return null;
        if (sx === gx && sz === gz) return [{ x: gx + 0.5, z: gz + 0.5 }];

        this._ensureBuffers(w * h);
        const g = this._g;
        const f = this._f;
        const parent = this._parent;
        const state = this._state;
        state.fill(0);

        const start = sz * w + sx;
        const goal = gz * w + gx;
        g[start] = 0;
        f[start] = this._heuristic(sx, sz, gx, gz);
        parent[start] = -1;
        state[start] = 1;
        let heapLen = this._push(0, start);

        let expanded = 0;
        while (heapLen > 0) {
            const current = this._heap[0];
            heapLen = this._pop(heapLen);
            if (state[current] === 2) continue; // Stale heap entry
            if (current === goal) return this._reconstruct(goal, w);

            state[current] = 2;
            if (++expanded > maxExpanded) return null;

            const cx = current % w;
            const cz = (current - cx) / w;

            for (let d = 0; d < 8; d++) {
                const dx = DIRS[d][0];
                const dz = DIRS[d][1];
                const nx = cx + dx;
                const nz = cz + dz;
                if (col.isWall(nx, nz)) continue;
                // No corner cutting: diagonal needs both orthogonals open
                if (d >= 4 && (col.isWall(cx + dx, cz) || col.isWall(cx, cz + dz))) continue;

                const n = nz * w + nx;
                if (state[n] === 2) continue;

                const tentative = g[current] + (d >= 4 ? SQRT2 : 1);
                if (state[n] === 1 && tentative >= g[n]) continue;

                g[n] = tentative;
                f[n] = tentative + this._heuristic(nx, nz, gx, gz);
                parent[n] = current;
                state[n] = 1;
                heapLen = this._push(heapLen, n);
            }
        }

        return null;
    }

    /**
     * Check whether a body of the given radius can travel in a straight line
     * between two world positions without touching a wall.
     * @param {number} x0
     * @param {number} z0
     * @param {number} x1
     * @param {number} z1
     * @param {number} radius
     * @returns {boolean}
     */
    hasClearLine(x0, z0, x1, z1, radius) {
        const dx = x1 - x0;
        const dz = z1 - z0;
        const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dz * dz) / CLEARANCE_STEP));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            if (!this._collision.isPositionClear(x0 + dx * t, z0 + dz * t, radius)) return false;
        }
        return true;
    }

    // ── Internal helpers ────────────────────────────────────────────

    /** Octile distance — exact cost on an open 8-connected grid */
    _heuristic(x0, z0, x1, z1) {
        const dx = Math.abs(x1 - x0);
        const dz = Math.abs(z1 - z0);
        return (dx + dz) + (SQRT2 - 2) * Math.min(dx, dz);
    }

    _ensureBuffers(size) {
        if (this._size === size) return;
        this._size = size;
        this._g = new Float32Array(size);
        this._f = new Float32Array(size);
        this._parent = new Int32Array(size);
        this._state = new Uint8Array(size);
        // Lazy decrease-key: a node can be pushed once per improvement
        this._heap = new Int32Array(size * 8);
        this._heapKeys = new Float32Array(size * 8);
    }

    _reconstruct(goal, w) {
        const path = [];
        for (let n = goal; this._parent[n] !== -1; n = this._parent[n]) {
            const x = n % w;
            path.push({ x: x + 0.5, z: (n - x) / w + 0.5 });
        }
        return path.reverse();
    }

    /** Binary min-heap keyed on the f-score at push time. Returns the new length. */
    _push(len, node) {
        const heap = this._heap;
        const keys = this._heapKeys;
        const key = this._f[node];
        let i = len;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (keys[p] <= key) break;
            heap[i] = heap[p];
            keys[i] = keys[p];
            i = p;
        }
        heap[i] = node;
        keys[i] = key;
        return len + 1;
    }

    _pop(len) {
        const heap = this._heap;
        const keys = this._heapKeys;
        len--;
        const lastNode = heap[len];
        const lastKey = keys[len];
        let i = 0;
        while (true) {
            const l = 2 * i + 1;
            if (l >= len) break;
            const r = l + 1;
            const c = (r < len && keys[r] < keys[l]) ? r : l;
            if (lastKey <= keys[c]) break;
            heap[i] = heap[c];
            keys[i] = keys[c];
            i = c;
        }
        if (len > 0) {
            heap[i] = lastNode;
            keys[i] = lastKey;
        }
        return len;
    }
}
