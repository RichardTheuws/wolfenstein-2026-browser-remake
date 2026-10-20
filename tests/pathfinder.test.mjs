/**
 * Pathfinder tests — run with: node --test tests/
 *
 * Synthetic grids check correctness (optimal cost, no corner cutting, live
 * door state); the real levels check that every enemy can reach the player
 * start whenever a flood fill says it is reachable.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CollisionSystem } from '../js/engine/collision.js';
import { Pathfinder } from '../js/engine/pathfinder.js';

function makeCollision(rows) {
    const grid = rows.map((r) => [...r].map((c) => (c === '#' ? 1 : 0)));
    const col = new CollisionSystem();
    col.setGrid(grid, grid[0].length, grid.length);
    return col;
}

function pathCost(start, path) {
    let cost = 0;
    let prev = { x: Math.floor(start.x) + 0.5, z: Math.floor(start.z) + 0.5 };
    for (const p of path) {
        cost += Math.hypot(p.x - prev.x, p.z - prev.z);
        prev = p;
    }
    return cost;
}

function assertNoCornerCuts(col, start, path) {
    let prev = { x: Math.floor(start.x), z: Math.floor(start.z) };
    for (const p of path) {
        const cx = Math.floor(p.x);
        const cz = Math.floor(p.z);
        assert.ok(!col.isWall(cx, cz), `waypoint in wall at ${cx},${cz}`);
        assert.ok(Math.abs(cx - prev.x) <= 1 && Math.abs(cz - prev.z) <= 1, 'waypoints not adjacent');
        if (cx !== prev.x && cz !== prev.z) {
            assert.ok(!col.isWall(cx, prev.z) && !col.isWall(prev.x, cz), `corner cut at ${cx},${cz}`);
        }
        prev = { x: cx, z: cz };
    }
}

test('routes around a wall instead of through it', () => {
    const col = makeCollision([
        '#######',
        '#.....#',
        '#.###.#',
        '#..#..#',
        '#######',
    ]);
    const pf = new Pathfinder(col);
    const start = { x: 1.5, z: 3.5 };
    const path = pf.findPath(start.x, start.z, 4.5, 3.5);
    assert.ok(path, 'path expected');
    assert.deepEqual(path.at(-1), { x: 4.5, z: 3.5 });
    assertNoCornerCuts(col, start, path);
    // Every diagonal here would clip a wall corner: up 2, right 4, down 2, left 1
    assert.ok(Math.abs(pathCost(start, path) - 9) < 1e-6);
});

test('never squeezes diagonally between two wall corners', () => {
    const col = makeCollision([
        '#####',
        '#.#.#',
        '##..#',
        '#####',
    ]);
    const pf = new Pathfinder(col);
    // (1,1) only touches (2,2) diagonally, through two wall corners
    assert.equal(pf.findPath(1.5, 1.5, 2.5, 2.5), null);
});

test('respects live door state (closed = wall, open = passable)', () => {
    const col = makeCollision([
        '#####',
        '#.#.#',
        '#####',
    ]);
    const pf = new Pathfinder(col);
    assert.equal(pf.findPath(1.5, 1.5, 3.5, 1.5), null);
    col.clearCell(2, 1); // door opens
    assert.deepEqual(pf.findPath(1.5, 1.5, 3.5, 1.5), [{ x: 2.5, z: 1.5 }, { x: 3.5, z: 1.5 }]);
    col.fillCell(2, 1); // door closes again
    assert.equal(pf.findPath(1.5, 1.5, 3.5, 1.5), null);
});

test('same-cell and wall endpoints', () => {
    const col = makeCollision(['###', '#.#', '###']);
    const pf = new Pathfinder(col);
    assert.deepEqual(pf.findPath(1.2, 1.7, 1.8, 1.1), [{ x: 1.5, z: 1.5 }]);
    assert.equal(pf.findPath(1.5, 1.5, 0.5, 0.5), null);
});

test('hasClearLine accounts for body radius', () => {
    const col = makeCollision([
        '#####',
        '#...#',
        '#.#.#',
        '#...#',
        '#####',
    ]);
    const pf = new Pathfinder(col);
    assert.ok(pf.hasClearLine(1.5, 1.5, 3.5, 1.5, 0.3));
    // Diagonal across the centre pillar
    assert.ok(!pf.hasClearLine(1.5, 1.5, 3.5, 3.5, 0.3));
    // Along the corridor but hugging the pillar too closely for the radius
    assert.ok(!pf.hasClearLine(1.5, 1.9, 3.5, 1.9, 0.3));
});

test('every level: enemies reach the player start whenever it is reachable', () => {
    const dir = new URL('../assets/levels/', import.meta.url);
    const files = readdirSync(dir).filter((f) => /^e\d+m\d+\.json$/.test(f));
    assert.ok(files.length >= 30, `expected all levels, found ${files.length}`);

    for (const file of files) {
        const level = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
        const w = level.width;
        const h = level.height;
        const rows = level.walls.filter((r) => Array.isArray(r));
        const grid = Array.from({ length: h }, (_, z) =>
            Array.from({ length: w }, (_, x) => rows[z]?.[x] || 0));
        // Worst-case-reachable layout: every door open
        for (const d of level.doors || []) grid[d.z][d.x] = 0;

        const col = new CollisionSystem();
        col.setGrid(grid, w, h);
        const pf = new Pathfinder(col);

        // 4-connected flood fill from the player start
        const ps = level.playerStart;
        const seen = new Set([`${Math.floor(ps.x)},${Math.floor(ps.z)}`]);
        const queue = [[Math.floor(ps.x), Math.floor(ps.z)]];
        while (queue.length) {
            const [x, z] = queue.pop();
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${x + dx},${z + dz}`;
                if (!seen.has(k) && !col.isWall(x + dx, z + dz)) {
                    seen.add(k);
                    queue.push([x + dx, z + dz]);
                }
            }
        }

        for (const e of level.entities || []) {
            const reachable = seen.has(`${Math.floor(e.x)},${Math.floor(e.z)}`);
            const path = pf.findPath(e.x, e.z, ps.x + 0.5, ps.z + 0.5);
            assert.equal(!!path, reachable, `${file}: ${e.type} at ${e.x},${e.z}`);
            if (path) assertNoCornerCuts(col, e, path);
        }
    }
});
