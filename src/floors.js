import * as THREE from 'three';
import { ROOMS, PADS, WALL_H as H, BOUNDS } from './plan.js';
import { box, cyl, polyArea, inPoly } from './geo.js';

function shapeMesh(poly, mat, y) {
    // Shape vẽ trên (x, -z) rồi xoay -90° quanh X để nằm ngang, mặt hướng lên, UV tính bằng mét
    const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    return mesh;
}

export function buildFloors(scene, M) {
    const floorMeshes = [], lights = [];
    const W = BOUNDS.maxX - BOUNDS.minX, D = BOUNDS.maxZ - BOUNDS.minZ;
    const cx = (BOUNDS.minX + BOUNDS.maxX) / 2, cz = (BOUNDS.minZ + BOUNDS.maxZ) / 2;

    for (const r of ROOMS) {
        const xs = r.poly.map((p) => p[0]), zs = r.poly.map((p) => p[1]);
        Object.assign(r, { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), area: polyArea(r.poly) });
        const f = shapeMesh(r.poly, M[r.floor], 0.002);
        scene.add(f);
        floorMeshes.push(f);

        // đèn âm trần: lưới ~1.4 m, chỉ giữ điểm nằm trong phòng và cách tường 0.45 m
        if (!r.light) continue;
        const spots = [];
        const nx = Math.max(1, Math.round((r.maxX - r.minX) / 1.4)), nz = Math.max(1, Math.round((r.maxZ - r.minZ) / 1.4));
        for (let i = 0; i < nx; i++)
            for (let j = 0; j < nz; j++) {
                const x = r.minX + ((i + 0.5) * (r.maxX - r.minX)) / nx, z = r.minZ + ((j + 0.5) * (r.maxZ - r.minZ)) / nz;
                const m = 0.45;
                if ([[-m, 0], [m, 0], [0, -m], [0, m]].every(([ox, oz]) => inPoly(x + ox, z + oz, r.poly))) spots.push([x, z]);
            }
        for (const [x, z] of spots) {
            cyl(scene, 0.045, 0.045, 0.006, x, H - 0.006, z, M.glowWarm, 16, false);
            cyl(scene, 0.065, 0.065, 0.004, x, H - 0.004, z, M.white, 20, false);
        }
        // đèn thật: 1–2 bóng mỗi phòng (nhiều hơn sẽ nặng máy)
        const n = r.area > 14 ? 2 : 1;
        for (let k = 0; k < n; k++) {
            const s = spots.length ? spots[Math.floor(((k + 0.5) * spots.length) / n)] : [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2];
            const l = new THREE.PointLight(0xffe9d2, (r.light * 2.2) / n, 7, 2);
            l.position.set(s[0], H - 0.35, s[1]);
            scene.add(l);
            lights.push(l);
        }
    }
    for (const p of PADS) scene.add(shapeMesh(p.poly, M[p.floor], 0.004));

    // sàn bê tông bên dưới và tấm trần (đổ bóng để nắng chỉ vào qua cửa)
    box(scene, W + 0.2, 0.25, D + 0.2, cx, -0.25, cz, M.slab);
    const ceiling = box(scene, W + 0.2, 0.2, D + 0.2, cx, H, cz, M.ceiling);
    return { floorMeshes, ceiling, lights };
}
