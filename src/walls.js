import * as THREE from 'three';
import { WALLS, WALL_H as H } from './plan.js';
import { box, cyl } from './geo.js';

// Dựng tường từ dữ liệu: cắt khúc quanh lỗ mở, thêm khung cửa, kính, lan can, len chân tường.
// Trả về danh sách cửa (để tự mở) và ghi vật cản vào `colliders`.
export function buildWalls(scene, M, colliders) {
    const doors = [];
    for (const w of WALLS) {
        const ddx = w.b[0] - w.a[0], ddz = w.b[1] - w.a[1];
        const L = Math.hypot(ddx, ddz), dx = ddx / L, dz = ddz / L;
        const ang = -Math.atan2(dz, dx), ext = w.t / 2;
        Object.assign(w, { dx, dz, L, ang });
        const at = (s) => [w.a[0] + dx * s, w.a[1] + dz * s];
        // nhóm đặt tại điểm s trên tường, trục x cục bộ chạy dọc tường
        const local = (s) => {
            const g = new THREE.Group(), p = at(s);
            g.position.set(p[0], 0, p[1]);
            g.rotation.y = ang;
            scene.add(g);
            return g;
        };
        const piece = (s0, s1, y0, y1, skirt) => {
            if (s1 - s0 < 0.002 || y1 - y0 < 0.002) return;
            const g = local((s0 + s1) / 2);
            box(g, s1 - s0, y1 - y0, w.t, 0, y0, 0, M.wall);
            if (skirt) for (const side of [-1, 1]) box(g, s1 - s0, 0.08, 0.012, 0, 0, side * (w.t / 2 + 0.006), M.skirting, 0, false);
        };
        const block = (s0, s1) => {
            if (s1 - s0 < 0.002) return;
            const p = at((s0 + s1) / 2);
            colliders.push({ cx: p[0], cz: p[1], ux: dx, uz: dz, hl: (s1 - s0) / 2, ht: w.t / 2 });
        };

        const ops = [...w.openings].sort((a, b) => a.at - b.at);
        let cur = -ext, blockStart = -ext;
        for (const op of ops) {
            const s0 = op.at, s1 = op.at + op.w, mid = (s0 + s1) / 2;
            piece(cur, s0, 0, H, true);
            cur = s1;
            const g = local(mid);
            if (op.type === 'window') {
                piece(s0, s1, op.head, H);
                piece(s0, s1, 0, op.sill, op.sill > 0.3);
                glazing(g, op.w, op.sill, op.head, w.t, op.frosted ? M.frosted : M.glass, M);
                if (op.sill > 0.05) box(g, op.w + 0.04, 0.03, w.t + 0.06, 0, op.sill - 0.03, 0, M.white, 0.005); // bậu cửa
            } else if (op.type === 'balcony') {
                if (op.kind === 'solid') {
                    box(g, op.w, op.rail, w.t * 0.6, 0, 0, 0, M.wall);
                    box(g, op.w, 0.04, w.t * 0.6 + 0.04, 0, op.rail, 0, M.frame);
                } else {
                    const pane = new THREE.Mesh(new THREE.PlaneGeometry(op.w, op.rail - 0.1), M.glass);
                    pane.position.y = 0.05 + (op.rail - 0.1) / 2;
                    g.add(pane);
                    box(g, op.w, 0.04, 0.06, 0, op.rail, 0, M.steel, 0.01);
                    const n = Math.max(2, Math.round(op.w / 1.0) + 1);
                    for (let i = 0; i < n; i++) box(g, 0.03, op.rail, 0.04, -op.w / 2 + (op.w * i) / (n - 1), 0, 0, M.steel);
                }
            } else {
                // cửa đi hoặc lối mở
                piece(s0, s1, op.head, H);
                block(blockStart, s0);
                blockStart = s1;
                const fm = op.type === 'open' ? M.frame : M.walnutDark, fd = w.t + 0.04;
                for (const side of [-1, 1]) box(g, 0.045, op.head, fd, side * (op.w / 2 - 0.0225), 0, 0, fm);
                box(g, op.w, 0.045, fd, 0, op.head - 0.045, 0, fm);
                if (op.type === 'door') doors.push(makeDoor(scene, w, op, at, M));
                else slidingPanel(g, op, M);
            }
        }
        piece(cur, L + ext, 0, H, true);
        block(blockStart, L + ext);
    }
    return doors;
}

function glazing(g, w, sill, head, t, glassMat, M) {
    const gh = head - sill, fw = 0.05, fd = Math.min(0.07, t);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - fw, gh - fw), glassMat);
    pane.position.y = sill + gh / 2;
    g.add(pane);
    box(g, w, fw, fd, 0, sill, 0, M.frame);
    box(g, w, fw, fd, 0, head - fw, 0, M.frame);
    for (const side of [-1, 1]) box(g, fw, gh, fd, side * (w / 2 - fw / 2), sill, 0, M.frame);
    const n = Math.floor(w / 1.0);
    for (let i = 1; i <= n; i++) box(g, 0.04, gh, fd, -w / 2 + (w * i) / (n + 1), sill, 0, M.frame);
}

// Cánh kính lùa đã mở, nằm chồng sau ô kính cố định bên cạnh
function slidingPanel(g, op, M) {
    const sg = new THREE.Group();
    sg.position.set(-op.w + 0.06, 0, 0.045);
    g.add(sg);
    glazing(sg, op.w, 0.02, op.head - 0.05, 0.05, M.glass, M);
}

function makeDoor(scene, w, op, at, M) {
    const hingeEnd = op.hinge === 'end';
    const hp = at(hingeEnd ? op.at + op.w : op.at);
    const pivot = new THREE.Group();
    pivot.position.set(hp[0], 0, hp[1]);
    pivot.rotation.y = w.ang;
    scene.add(pivot);
    const lw = op.w - 0.1, lh = op.head - 0.055, dir = hingeEnd ? -1 : 1;
    const leafMat = op.main ? M.walnutDark : M.doorLeaf;
    box(pivot, lw, lh, 0.04, dir * (0.05 + lw / 2), 0.008, 0, leafMat, 0.004);
    // tay nắm hai mặt
    for (const side of [-1, 1]) {
        const hx = dir * (0.05 + lw - 0.07);
        cyl(pivot, 0.022, 0.022, 0.012, hx, 0.99, side * 0.026, M.steel, 16).rotation.x = Math.PI / 2;
        box(pivot, 0.13, 0.018, 0.018, hx - dir * 0.05, 0.985, side * 0.05, M.steel, 0.006);
    }
    const c = at(op.at + op.w / 2);
    return { pivot, base: w.ang, sign: (hingeEnd ? 1 : -1) * op.swing, open: 0, cx: c[0], cz: c[1] };
}

export function updateDoors(doors, px, pz, dt) {
    for (const d of doors) {
        const near = Math.hypot(px - d.cx, pz - d.cz) < 1.15 ? 1 : 0;
        d.open += (near - d.open) * Math.min(1, dt * 4);
        d.pivot.rotation.y = d.base + d.sign * d.open * Math.PI * 0.47;
    }
}
