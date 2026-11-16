// Kiểm tra nhanh không cần trình duyệt: dựng vật cản từ dữ liệu mặt bằng rồi tìm đường giữa các điểm tour.
// Chạy: node scripts/navtest.mjs
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const THREE = await import('three');
const { TOUR, ROOMS, FURNITURE } = await import('../src/plan.js');
const { makeMaterials } = await import('../src/materials.js');
const { buildWalls } = await import('../src/walls.js');
const { buildFurniture } = await import('../src/furniture.js');
const { createNav, resolve, R } = await import('../src/nav.js');
const { polyArea, inPoly } = await import('../src/geo.js');

const scene = new THREE.Scene(), M = makeMaterials(), colliders = [];
const doors = buildWalls(scene, M, colliders);
const wallColliders = colliders.length;
buildFurniture(scene, M, colliders);
const nav = createNav(colliders);
let ok = true;

console.log(`Vật cản: ${wallColliders} tường + ${colliders.length - wallColliders} nội thất, ${doors.length} cửa, ${FURNITURE.length} món đồ`);
console.log(`Tổng diện tích phòng: ${ROOMS.reduce((s, r) => s + polyArea(r.poly), 0).toFixed(1)} m²`);

// 1. mỗi điểm tour phải nằm trong phòng và không kẹt trong vật cản
for (const t of TOUR) {
    const p = { x: t.pos[0], z: t.pos[1] };
    resolve(colliders, p);
    const moved = Math.hypot(p.x - t.pos[0], p.z - t.pos[1]);
    const room = ROOMS.find((r) => inPoly(t.pos[0], t.pos[1], r.poly));
    if (!room || moved > 0.01) ok = false;
    console.log(`  điểm "${t.name}": ${room ? room.name : 'NGOÀI PHÒNG'}${moved > 0.01 ? `, BỊ KẸT (đẩy ra ${moved.toFixed(2)} m)` : ''}`);
}
// 2. có đường đi giữa các điểm tour liên tiếp và tới tâm mọi phòng
const len = (p) => p.slice(1).reduce((s, q, k) => s + Math.hypot(q[0] - p[k][0], q[1] - p[k][1]), 0);
for (let i = 0; i < TOUR.length; i++) {
    const a = TOUR[i], b = TOUR[(i + 1) % TOUR.length], p = nav.findPath(a.pos[0], a.pos[1], b.pos[0], b.pos[1]);
    if (!p) ok = false;
    console.log(`  ${a.name} → ${b.name}: ${p ? `${p.length} điểm, ${len(p).toFixed(1)} m` : 'KHÔNG CÓ ĐƯỜNG'}`);
}
for (const r of ROOMS) {
    // tìm một ô trống bất kỳ trong phòng rồi thử đi tới từ sảnh
    let target = null;
    const xs = r.poly.map((q) => q[0]), zs = r.poly.map((q) => q[1]);
    for (let x = Math.min(...xs) + 0.3; x < Math.max(...xs) && !target; x += 0.15)
        for (let z = Math.min(...zs) + 0.3; z < Math.max(...zs); z += 0.15) {
            if (!inPoly(x, z, r.poly)) continue;
            const q = { x, z };
            resolve(colliders, q);
            if (Math.hypot(q.x - x, q.z - z) < 1e-6) { target = [x, z]; break; }
        }
    const p = target && nav.findPath(TOUR[0].pos[0], TOUR[0].pos[1], target[0], target[1]);
    if (!p) ok = false;
    console.log(`  Sảnh → ${r.name}: ${p ? len(p).toFixed(1) + ' m' : 'KHÔNG TỚI ĐƯỢC'}`);
}
console.log(ok ? `ĐẠT (bán kính người chơi ${R} m)` : 'CÓ LỖI');
process.exit(ok ? 0 : 1);
