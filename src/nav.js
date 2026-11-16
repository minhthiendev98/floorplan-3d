import { BOUNDS } from './plan.js';
import { clamp } from './geo.js';

export const R = 0.2; // bán kính người chơi (m)

// Khoảng cách từ điểm tới hình chữ nhật xoay (vật cản)
function distTo(c, x, z) {
    const rx = x - c.cx, rz = z - c.cz;
    const u = rx * c.ux + rz * c.uz, v = -rx * c.uz + rz * c.ux;
    return Math.hypot(u - clamp(u, -c.hl, c.hl), v - clamp(v, -c.ht, c.ht));
}

// Đẩy người chơi ra khỏi vật cản
export function resolve(colliders, p) {
    for (let it = 0; it < 3; it++)
        for (const c of colliders) {
            const rx = p.x - c.cx, rz = p.z - c.cz;
            const u = rx * c.ux + rz * c.uz, v = -rx * c.uz + rz * c.ux;
            if (Math.abs(u) > c.hl + R || Math.abs(v) > c.ht + R) continue;
            const du = u - clamp(u, -c.hl, c.hl), dv = v - clamp(v, -c.ht, c.ht), d = Math.hypot(du, dv);
            if (d >= R) continue;
            let nu, nv, push;
            if (d > 1e-6) {
                nu = du / d; nv = dv / d; push = R - d;
            } else {
                const pu = c.hl - Math.abs(u), pv = c.ht - Math.abs(v);
                if (pu < pv) { nu = Math.sign(u) || 1; nv = 0; push = pu + R; }
                else { nu = 0; nv = Math.sign(v) || 1; push = pv + R; }
            }
            p.x += (nu * c.ux - nv * c.uz) * push;
            p.z += (nu * c.uz + nv * c.ux) * push;
        }
}

// Lưới tìm đường (A*) để tour và "bấm để đi tới" không xuyên tường
const CELL = 0.08;
export function createNav(colliders) {
    const ox = BOUNDS.minX, oz = BOUNDS.minZ;
    const nx = Math.ceil((BOUNDS.maxX - ox) / CELL), nz = Math.ceil((BOUNDS.maxZ - oz) / CELL);
    const blocked = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
            const x = ox + (i + 0.5) * CELL, z = oz + (j + 0.5) * CELL;
            for (const c of colliders)
                if (distTo(c, x, z) < R + 0.03) { blocked[j * nx + i] = 1; break; }
        }
    const cell = (x, z) => [clamp(Math.floor((x - ox) / CELL), 0, nx - 1), clamp(Math.floor((z - oz) / CELL), 0, nz - 1)];
    const center = (i, j) => [ox + (i + 0.5) * CELL, oz + (j + 0.5) * CELL];
    const isBlocked = (i, j) => i < 0 || j < 0 || i >= nx || j >= nz || blocked[j * nx + i];

    function nearestFree(i, j) {
        if (!isBlocked(i, j)) return [i, j];
        for (let r = 1; r < 14; r++)
            for (let dj = -r; dj <= r; dj++)
                for (let di = -r; di <= r; di++)
                    if (Math.max(Math.abs(di), Math.abs(dj)) === r && !isBlocked(i + di, j + dj)) return [i + di, j + dj];
        return null;
    }
    function clear(x0, z0, x1, z1) {
        const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (CELL * 0.5));
        for (let k = 0; k <= n; k++) {
            const [i, j] = cell(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n);
            if (isBlocked(i, j)) return false;
        }
        return true;
    }

    // Trả về danh sách điểm [x, z] từ vị trí hiện tại tới đích, hoặc null nếu không tới được
    function findPath(sx, sz, gx, gz) {
        const s = nearestFree(...cell(sx, sz)), g = nearestFree(...cell(gx, gz));
        if (!s || !g) return null;
        const N = nx * nz, start = s[1] * nx + s[0], goal = g[1] * nx + g[0];
        const gScore = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
        const open = [start];
        const fScore = new Float32Array(N).fill(Infinity);
        const hDist = (id) => Math.hypot((id % nx) - g[0], Math.floor(id / nx) - g[1]);
        gScore[start] = 0;
        fScore[start] = hDist(start);
        const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
        let found = false;
        while (open.length) {
            let bi = 0;
            for (let k = 1; k < open.length; k++) if (fScore[open[k]] < fScore[open[bi]]) bi = k;
            const cur = open[bi];
            open[bi] = open[open.length - 1];
            open.pop();
            if (cur === goal) { found = true; break; }
            if (closed[cur]) continue;
            closed[cur] = 1;
            const ci = cur % nx, cj = Math.floor(cur / nx);
            for (const [di, dj, cost] of NB) {
                const ni = ci + di, nj = cj + dj;
                if (isBlocked(ni, nj)) continue;
                if (di && dj && (isBlocked(ci + di, cj) || isBlocked(ci, cj + dj))) continue;
                const id = nj * nx + ni, t = gScore[cur] + cost;
                if (t < gScore[id]) {
                    gScore[id] = t;
                    from[id] = cur;
                    fScore[id] = t + hDist(id);
                    open.push(id);
                }
            }
        }
        if (!found) return null;
        const pts = [];
        for (let id = goal; id !== -1; id = from[id]) pts.push(center(id % nx, Math.floor(id / nx)));
        pts.reverse();
        // rút gọn: bỏ các điểm giữa nếu đi thẳng được
        const out = [pts[0]];
        let a = 0;
        while (a < pts.length - 1) {
            let b = pts.length - 1;
            while (b > a + 1 && !clear(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
            out.push(pts[b]);
            a = b;
        }
        return out;
    }
    return { findPath };
}
