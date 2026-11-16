import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FURNITURE, WALL_H as H } from './plan.js';
import { getManifest } from './materials.js';
import { box, cyl, sphere, rad } from './geo.js';

// Mỗi hàm dựng một món trong hệ toạ độ cục bộ: tâm đáy ở gốc, bề ngang W theo x, chiều sâu D theo z,
// mặt trước quay về +z. Trả về (tuỳ chọn) danh sách vật cản cục bộ [cx, cz, hx, hz].
const BUILD = {
    rug(g, W, D, f, M) {
        box(g, W, 0.012, D, 0, 0, 0, M.rug, 0.004, false);
    },

    sofaL(g, W, D, f, M) {
        const dA = 0.93, dB = 0.88, back = 0.2, arm = 0.17, seatH = 0.42, L = M.leather;
        const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
        // đế
        box(g, dA, 0.24, D - dB, x0 + dA / 2, 0.05, z0 + (D - dB) / 2, L, 0.03);
        box(g, W, 0.24, dB, 0, 0.05, z1 - dB / 2, L, 0.03);
        // lưng tựa: dọc cạnh trái và cạnh dưới
        box(g, back, 0.5, D, x0 + back / 2, 0.27, 0, L, 0.07);
        box(g, W - back, 0.5, back, back / 2, 0.27, z1 - back / 2, L, 0.07);
        // tay vịn hai đầu
        box(g, dA - back, 0.36, arm, x0 + back + (dA - back) / 2, 0.27, z0 + arm / 2, L, 0.06);
        box(g, arm, 0.36, dB - back, x1 - arm / 2, 0.27, z1 - back - (dB - back) / 2, L, 0.06);
        // đệm ngồi
        const aLen = D - dB - arm, aN = 2;
        for (let i = 0; i < aN; i++) box(g, dA - back - 0.01, 0.17, aLen / aN - 0.012, x0 + back + (dA - back) / 2, 0.27, z0 + arm + (aLen * (i + 0.5)) / aN, L, 0.055);
        const bLen = W - back - arm, bN = 3;
        for (let i = 0; i < bN; i++) box(g, bLen / bN - 0.012, 0.17, dB - back - 0.01, x0 + back + (bLen * (i + 0.5)) / bN, 0.27, z1 - back - (dB - back) / 2, L, 0.055);
        // gối tựa
        const pil = (x, z, ry, mat) => {
            const p = box(g, 0.38, 0.38, 0.14, x, seatH + 0.03, z, mat, 0.065);
            p.rotation.set(-0.22, ry, 0, 'YXZ');
        };
        pil(x0 + back + 0.14, z0 + 0.6, Math.PI / 2 + 0.1, M.linen);
        pil(x0 + back + 0.14, z0 + 1.05, Math.PI / 2 - 0.08, M.linenMint);
        pil(x0 + 1.25, z1 - back - 0.14, Math.PI + 0.1, M.linen);
        for (const [x, z] of [[x0 + 0.08, z0 + 0.08], [x0 + 0.08, z1 - 0.08], [x1 - 0.08, z1 - 0.08], [x1 - 0.08, z1 - dB + 0.08], [x0 + dA - 0.08, z0 + 0.08]])
            cyl(g, 0.02, 0.016, 0.05, x, 0, z, M.darkMetal, 10);
        return [[x0 + dA / 2, z0 + (D - dB) / 2, dA / 2, (D - dB) / 2], [0, z1 - dB / 2, W / 2, dB / 2]];
    },

    roundTable(g, W, D, f, M) {
        const r = W / 2, h = f.h || 0.4;
        cyl(g, r, r, 0.025, 0, h - 0.025, 0, M.mint, 48);
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + 0.5;
            const leg = cyl(g, 0.011, 0.011, h, Math.cos(a) * r * 0.62, 0, Math.sin(a) * r * 0.62, M.black, 8);
            leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
        }
    },

    sideTable(g, W, D, f, M) {
        box(g, W, 0.42, D, 0, 0.03, 0, M.walnut, 0.012);
        box(g, W - 0.06, 0.03, D - 0.06, 0, 0, 0, M.black);
        sphere(g, 0.07, 0, 0.52, 0, M.ceramic, 1, 1.25, 1);
    },

    lowCabinet(g, W, D, f, M) {
        box(g, W, 0.8, D, 0, 0.08, 0, M.white, 0.008);
        box(g, W - 0.04, 0.08, D - 0.05, 0, 0, -0.02, M.black);
        box(g, 0.004, 0.74, 0.003, 0, 0.11, D / 2, M.darkMetal, 0, false);
        box(g, 0.3, 0.02, 0.2, -0.15, 0.88, 0, M.walnutDark, 0.004);
        sphere(g, 0.06, 0.2, 0.96, 0, M.mint, 1, 1.3, 1);
    },

    tv(g, W, D, f, M) {
        box(g, W, 0.32, D, 0, 0.2, 0, M.walnut, 0.01);
        for (const x of [-W / 6, W / 6]) box(g, 0.004, 0.28, 0.003, x, 0.22, D / 2, M.black, 0, false);
        // tấm ốp gỗ + TV treo tường
        box(g, W + 0.5, 1.5, 0.02, 0, 0.62, -D / 2 + 0.011, M.walnutDark);
        box(g, 1.25, 0.72, 0.035, 0, 0.98, -D / 2 + 0.045, M.screen, 0.008);
        box(g, 0.7, 0.06, 0.08, 0, 0.53, -0.04, M.black, 0.02);
        box(g, 0.24, 0.035, 0.17, W / 2 - 0.25, 0.52, 0.02, M.linenGrey, 0.005);
        box(g, 0.22, 0.03, 0.16, W / 2 - 0.25, 0.555, 0.02, M.white, 0.005);
    },

    diningTable(g, W, D, f, M) {
        box(g, W, 0.012, D, 0, 0.745, 0, M.mintGlass, 0.004);
        box(g, W - 0.16, 0.05, D - 0.16, 0, 0.695, 0, M.walnutDark, 0.008);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.055, 0.7, 0.055, sx * (W / 2 - 0.12), 0, sz * (D / 2 - 0.12), M.walnutDark, 0.01);
    },

    pendant(g, W, D, f, M) {
        for (const x of [-W / 2 + 0.15, 0, W / 2 - 0.15]) {
            cyl(g, 0.004, 0.004, H - 1.72, x, 1.72, 0, M.black, 6, false);
            cyl(g, 0.035, 0.11, 0.16, x, 1.56, 0, M.black, 24);
            sphere(g, 0.045, x, 1.58, 0, M.glowWarm);
        }
        const l = new THREE.PointLight(0xffd9a8, 1.2, 4, 2);
        l.position.set(0, 1.45, 0);
        g.add(l);
    },

    art(g, W, D, f, M) {
        const h = f.h || 0.7, y = 0;
        const c = document.createElement('canvas');
        c.width = 256; c.height = Math.round((256 * h) / W);
        const x = c.getContext('2d');
        let s = f.seed || 1;
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        x.fillStyle = '#efe9df'; x.fillRect(0, 0, c.width, c.height);
        const cols = ['#b0704e', '#a9dccf', '#3d4a4a', '#d9b98a', '#7f8f86'];
        for (let i = 0; i < 6; i++) {
            x.fillStyle = cols[Math.floor(rnd() * cols.length)];
            x.globalAlpha = 0.75;
            x.beginPath();
            x.arc(rnd() * c.width, rnd() * c.height, 20 + rnd() * 70, rnd() * 6, rnd() * 6 + 2.5);
            x.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        box(g, W, h, 0.03, 0, y, 0, M.black, 0.003);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, h - 0.06), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
        p.position.set(0, y + h / 2, 0.017);
        g.add(p);
    },

    curtain(g, W, D, f, M) {
        const h = H - 0.08, seg = 40;
        const geo = new THREE.PlaneGeometry(W, h, seg, 1);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / W) * Math.PI * 9) * 0.035);
        geo.computeVertexNormals();
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W * 2.2, uv.getY(i) * h);
        const m = new THREE.Mesh(geo, M.curtain);
        m.position.set(0, h / 2 + 0.02, 0);
        m.castShadow = true;
        g.add(m);
        box(g, W + 0.5, 0.02, 0.02, 0.2, H - 0.07, 0, M.darkMetal, 0, false);
    },

    washer(g, W, D, f, M) {
        box(g, W, 0.85, D, 0, 0, 0, M.white, 0.02);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 12, 32), M.steel);
        ring.position.set(0, 0.45, D / 2 + 0.005);
        g.add(ring);
        cyl(g, 0.15, 0.15, 0.01, 0, 0.445, D / 2, M.screen, 32).rotation.x = Math.PI / 2;
        box(g, W - 0.1, 0.06, 0.004, 0, 0.75, D / 2, M.black, 0, false);
    },

    vanity(g, W, D, f, M) {
        box(g, W, 0.4, D - 0.02, 0, 0.42, -0.01, M.walnut, 0.008);
        box(g, W + 0.01, 0.03, D, 0, 0.82, 0, M.marble, 0.004);
        box(g, Math.min(0.46, W - 0.14), 0.11, 0.32, 0, 0.85, 0.03, M.ceramic, 0.04);
        box(g, Math.min(0.38, W - 0.22), 0.012, 0.24, 0, 0.951, 0.03, M.white, 0.004, false);
        cyl(g, 0.012, 0.014, 0.2, 0, 0.85, -D / 2 + 0.07, M.chrome, 12);
        box(g, 0.02, 0.018, 0.12, 0, 1.04, -D / 2 + 0.12, M.chrome, 0.006);
        // gương có đèn hắt
        box(g, W, 0.75, 0.012, 0, 1.25, -D / 2 + 0.012, M.glowSoft, 0, false);
        box(g, W - 0.04, 0.71, 0.014, 0, 1.27, -D / 2 + 0.014, M.mirror, 0, false);
    },

    tallCabinet(g, W, D, f, M) {
        box(g, W, 1.8, D, 0, 0.1, 0, M.white, 0.006);
        box(g, 0.012, 0.3, 0.02, W / 2 - 0.04, 0.95, D / 2 + 0.01, M.steel);
    },

    toilet(g, W, D, f, M) {
        const C = M.ceramic;
        box(g, W, 0.36, 0.17, 0, 0.4, -D / 2 + 0.09, C, 0.03); // két nước
        box(g, 0.24, 0.3, 0.4, 0, 0, -D / 2 + 0.32, C, 0.06); // chân
        sphere(g, 0.2, 0, 0.33, 0.06, C, 0.95, 0.55, 1.3); // bầu
        cyl(g, 0.19, 0.19, 0.025, 0, 0.4, 0.06, C, 32).scale.set(0.98, 1, 1.32); // nắp
        cyl(g, 0.02, 0.02, 0.01, 0, 0.76, -D / 2 + 0.09, M.chrome, 16);
    },

    shower(g, W, D, f, M) {
        const sx = f.flip ? -1 : 1;
        box(g, W, 0.04, D, 0, 0, 0, M.white, 0.008);
        const pane = (w, d, x, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.95, d), M.glass);
            m.position.set(x, 1.015, z);
            g.add(m);
        };
        pane(W, 0.01, 0, D / 2);
        pane(0.01, D, sx * (W / 2), 0);
        box(g, W, 0.02, 0.02, 0, 1.99, D / 2, M.chrome);
        box(g, 0.02, 0.02, D, sx * (W / 2), 1.99, 0, M.chrome);
        cyl(g, 0.012, 0.012, 2.0, sx * (W / 2), 0, D / 2, M.chrome, 8);
        box(g, 0.02, 0.3, 0.02, sx * (W / 2 - 0.25), 0.95, D / 2 + 0.03, M.chrome, 0.008);
        // sen cây
        cyl(g, 0.011, 0.011, 1.3, -sx * (W / 2 - 0.2), 0.9, -D / 2 + 0.05, M.chrome, 10);
        box(g, 0.018, 0.018, 0.3, -sx * (W / 2 - 0.2), 2.19, -D / 2 + 0.19, M.chrome);
        cyl(g, 0.11, 0.11, 0.012, -sx * (W / 2 - 0.2), 2.17, -D / 2 + 0.33, M.chrome, 24);
    },

    kitchen(g, W, D, f, M) {
        // tủ dưới
        box(g, W, 0.1, D - 0.08, 0, 0, -0.04, M.black);
        box(g, W, 0.76, D - 0.02, 0, 0.1, -0.01, M.white, 0.004);
        const n = Math.round(W / 0.52);
        for (let i = 1; i < n; i++) box(g, 0.004, 0.74, 0.003, -W / 2 + (W * i) / n, 0.11, D / 2 - 0.02, M.darkMetal, 0, false);
        box(g, W, 0.012, 0.004, 0, 0.8, D / 2 - 0.018, M.darkMetal, 0, false);
        box(g, W, 0.04, D + 0.02, 0, 0.86, 0.01, M.counter, 0.004);
        // ốp tường + tủ trên có đèn hắt
        box(g, W, 0.62, 0.012, 0, 0.9, -D / 2 + 0.006, M.marble, 0, false);
        box(g, W, 0.72, 0.34, 0, 1.52, -D / 2 + 0.17, M.walnut, 0.004);
        for (let i = 1; i < n; i++) box(g, 0.004, 0.7, 0.003, -W / 2 + (W * i) / n, 1.53, -D / 2 + 0.341, M.black, 0, false);
        box(g, W - 0.1, 0.008, 0.03, 0, 1.512, -D / 2 + 0.1, M.glowWarm, 0, false);
        const strip = new THREE.PointLight(0xffe0bd, 0.5, 2.6, 2);
        strip.position.set(0, 1.4, -D / 2 + 0.2);
        g.add(strip);
        // chậu đôi
        const sx = f.sinkX ?? 0;
        box(g, 0.78, 0.006, 0.44, sx, 0.9, 0.01, M.steel, 0.002, false);
        for (const o of [-0.19, 0.19]) box(g, 0.33, 0.004, 0.36, sx + o, 0.906, 0.01, M.darkMetal, 0.001, false);
        cyl(g, 0.014, 0.016, 0.26, sx, 0.9, -D / 2 + 0.07, M.chrome, 12);
        box(g, 0.02, 0.02, 0.17, sx, 1.15, -D / 2 + 0.15, M.chrome, 0.008);
        // bếp 4 lò + hút mùi
        const tx = f.stoveX ?? 0;
        box(g, 0.6, 0.008, 0.5, tx, 0.9, 0.01, M.screen, 0.002, false);
        for (const ox of [-0.15, 0.15]) for (const oz of [-0.12, 0.12]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 8, 28), M.steel);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(tx + ox, 0.912, 0.01 + oz);
            g.add(ring);
        }
        box(g, 0.6, 0.06, 0.45, tx, 1.46, -D / 2 + 0.225, M.steel, 0.006);
        // vài món trên mặt bếp
        cyl(g, 0.045, 0.045, 0.2, -sx * 0.2 - 0.1, 0.9, -D / 2 + 0.12, M.walnutDark, 16);
        cyl(g, 0.06, 0.05, 0.09, W / 2 - 0.25, 0.9, -0.05, M.ceramic, 20);
    },

    fridge(g, W, D, f, M) {
        box(g, W, 1.82, D - 0.03, 0, 0.02, -0.015, M.steel, 0.012);
        box(g, 0.006, 1.78, 0.004, 0, 0.04, D / 2 - 0.028, M.black, 0, false);
        for (const s of [-1, 1]) box(g, 0.02, 0.9, 0.025, s * 0.05, 0.6, D / 2 - 0.015, M.darkMetal, 0.006);
    },

    bed(g, W, D, f, M) {
        const hb = 0.1;
        box(g, W + 0.06, 0.26, D + 0.04, 0, 0.04, 0.02, M.walnut, 0.015);
        box(g, W - 0.2, 0.04, D - 0.2, 0, 0, 0, M.black);
        box(g, W, 0.24, D - hb - 0.02, 0, 0.3, hb / 2 + 0.01, M.cottonWhite, 0.07); // nệm
        // chăn phủ 2/3 phía chân, mép gấp
        const dl = (D - hb) * 0.66;
        box(g, W + 0.05, 0.07, dl, 0, 0.5, D / 2 - dl / 2 + 0.005, M.cotton, 0.03);
        box(g, W + 0.05, 0.05, 0.3, 0, 0.545, D / 2 - dl + 0.13, M.cottonWhite, 0.024);
        // gối
        const xs = f.single ? [0] : [-W / 4, W / 4], pw = f.single ? 0.62 : W / 2 - 0.12;
        for (const x of xs) {
            box(g, pw, 0.17, 0.44, x, 0.52, -D / 2 + hb + 0.27, M.linen, 0.055).rotation.x = -0.12;
            if (!f.single) box(g, pw - 0.14, 0.13, 0.34, x, 0.6, -D / 2 + hb + 0.5, M.linenGrey, 0.06).rotation.x = -0.3;
        }
        // đầu giường bọc vải
        box(g, W + 0.1, 1.05, hb, 0, 0.04, -D / 2 + hb / 2, M.linenGrey, 0.04);
    },

    nightstand(g, W, D, f, M) {
        box(g, W, 0.4, D, 0, 0.06, 0, M.walnut, 0.01);
        box(g, W - 0.06, 0.06, D - 0.06, 0, 0, 0, M.black);
        box(g, W - 0.04, 0.004, 0.003, 0, 0.26, D / 2, M.black, 0, false);
        cyl(g, 0.05, 0.06, 0.02, 0, 0.46, 0, M.darkMetal, 16);
        cyl(g, 0.008, 0.008, 0.2, 0, 0.48, 0, M.darkMetal, 8);
        cyl(g, 0.07, 0.1, 0.15, 0, 0.66, 0, M.glowSoft, 24);
        const l = new THREE.PointLight(0xffd3a0, 0.4, 3, 2);
        l.position.set(0, 0.8, 0.05);
        g.add(l);
    },

    dresser(g, W, D, f, M) {
        box(g, W, 0.04, D, 0, 0.72, 0, M.walnut, 0.008);
        box(g, W - 0.04, 0.14, D - 0.04, 0, 0.58, 0, M.walnutDark, 0.006);
        for (const s of [-1, 1]) box(g, 0.03, 0.58, D - 0.08, s * (W / 2 - 0.04), 0, 0, M.black);
        cyl(g, 0.23, 0.23, 0.012, 0, 1.05, -D / 2 + 0.02, M.mirror, 40, false).rotation.x = Math.PI / 2;
        cyl(g, 0.245, 0.245, 0.01, 0, 1.05, -D / 2 + 0.012, M.black, 40, false).rotation.x = Math.PI / 2;
        sphere(g, 0.05, -W / 2 + 0.14, 0.82, 0, M.mint, 1, 1.4, 1);
    },

    wardrobe(g, W, D, f, M) {
        const h = 2.45, n = Math.max(2, Math.round(W / 0.5));
        box(g, W, 0.08, D - 0.06, 0, 0, -0.03, M.black);
        box(g, W, h - 0.08, D, 0, 0.08, 0, M.walnut, 0.004);
        for (let i = 1; i < n; i++) box(g, 0.005, h - 0.12, 0.003, -W / 2 + (W * i) / n, 0.1, D / 2, M.black, 0, false);
        for (let i = 0; i < n; i++) {
            const x = -W / 2 + (W * (i + (i % 2 ? 0.14 : 0.86))) / n;
            box(g, 0.012, 0.5, 0.02, x, 0.95, D / 2 + 0.01, M.darkMetal, 0.004);
        }
        box(g, W, H - h - 0.001, D - 0.02, 0, h, -0.01, M.wall, 0, false);
    },

    desk(g, W, D, f, M) {
        box(g, W, 0.035, D, 0, 0.725, 0, M.walnut, 0.008);
        box(g, 0.03, 0.725, D - 0.04, -W / 2 + 0.02, 0, 0, M.white);
        box(g, 0.03, 0.725, D - 0.04, 0, 0, 0, M.white);
        box(g, 0.42, 0.56, D - 0.05, W / 2 - 0.21, 0.165, 0, M.white, 0.006);
        for (const y of [0.35, 0.54]) box(g, 0.4, 0.004, 0.003, W / 2 - 0.21, y, D / 2 - 0.024, M.darkMetal, 0, false);
        // kệ treo + laptop
        box(g, W, 0.03, 0.22, 0, 1.45, -D / 2 + 0.11, M.walnut, 0.006);
        box(g, 0.3, 0.2, 0.16, -W / 4, 1.48, -D / 2 + 0.1, M.linenGrey, 0.01);
        box(g, 0.34, 0.012, 0.23, -W / 4, 0.76, 0.05, M.steel, 0.004);
        const scr = box(g, 0.34, 0.22, 0.008, -W / 4, 0.77, -0.075, M.screen, 0.003);
        scr.rotation.x = -0.2;
    },

    utilitySink(g, W, D, f, M) {
        box(g, W, 0.8, D, 0, 0, 0, M.white, 0.006);
        box(g, W + 0.02, 0.03, D + 0.02, 0, 0.8, 0, M.steel, 0.004);
        box(g, W - 0.16, 0.006, D - 0.16, 0, 0.831, 0, M.darkMetal, 0.002, false);
        cyl(g, 0.012, 0.014, 0.2, 0, 0.83, -D / 2 + 0.06, M.chrome, 12);
    },

    acUnit(g, W, D, f, M) {
        box(g, W, 0.58, D, 0, 0.06, 0, M.white, 0.015);
        cyl(g, 0.2, 0.2, 0.012, -W / 6, 0.35, D / 2 + 0.001, M.darkMetal, 32, false).rotation.x = Math.PI / 2;
    }
};

// ---- model GLB ----
const YAW = {}; // góc hiệu chỉnh hướng model (độ), ví dụ { dining_chair_02: 180 }
const cache = {};
export async function preloadModels(onProgress) {
    const ids = [...new Set(FURNITURE.filter((f) => f.type === 'glb').map((f) => f.model))];
    const man = getManifest(), loader = new GLTFLoader();
    await Promise.all(
        ids.map(async (id) => {
            if (!man.models[id]) return;
            try {
                const gltf = await loader.loadAsync('assets/' + man.models[id]);
                gltf.scene.traverse((o) => {
                    if (!o.isMesh) return;
                    o.castShadow = o.receiveShadow = true;
                    if (o.material.transparent || o.material.alphaTest > 0 || o.material.alphaMap) {
                        o.material.alphaTest = Math.max(o.material.alphaTest, 0.4);
                        o.material.transparent = false;
                        o.material.side = THREE.DoubleSide;
                    }
                });
                cache[id] = gltf.scene;
            } catch (e) {
                console.warn('Không nạp được model', id, e.message);
            }
            onProgress && onProgress();
        })
    );
}

function placeGLB(g, f, M) {
    const src = cache[f.model];
    if (!src) {
        // thiếu model: khối thế chỗ bo góc
        box(g, f.w, f.h || 0.8, f.d, 0, 0, 0, M.linenGrey, 0.04);
        return;
    }
    const obj = src.clone(true);
    obj.rotation.y = rad(YAW[f.model] || 0);
    const holder = new THREE.Group();
    holder.add(obj);
    const bb = new THREE.Box3().setFromObject(holder), size = bb.getSize(new THREE.Vector3());
    const s = f.h ? f.h / size.y : Math.min(f.w / size.x, f.d / size.z);
    holder.scale.setScalar(s);
    const c = bb.getCenter(new THREE.Vector3());
    holder.position.set(-c.x * s, -bb.min.y * s, -c.z * s);
    g.add(holder);
}

export function buildFurniture(scene, M, colliders) {
    for (const f of FURNITURE) {
        const g = new THREE.Group();
        let rects;
        if (f.type === 'glb') placeGLB(g, f, M);
        else if (BUILD[f.type]) rects = BUILD[f.type](g, f.w, f.d, f, M);
        else console.warn('Chưa có hàm dựng cho', f.type);
        g.position.set(f.pos[0], f.y || 0.003, f.pos[1]);
        g.rotation.y = rad(f.rot);
        scene.add(g);
        if (f.collide === false) continue;
        const c = Math.cos(rad(f.rot)), s = Math.sin(rad(f.rot));
        for (const [lx, lz, hx, hz] of rects || [[0, 0, f.w / 2, f.d / 2]])
            colliders.push({ cx: f.pos[0] + lx * c + lz * s, cz: f.pos[1] - lx * s + lz * c, ux: c, uz: -s, hl: hx, ht: hz });
    }
}
