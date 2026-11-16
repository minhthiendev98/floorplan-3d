// Dữ liệu mặt bằng. Toạ độ ghi bằng PIXEL đo trên reference/floorplan.png (526 × 676),
// đổi ra mét bằng SCALE. Có số đo thật thì chỉ cần sửa PX_PER_M.
// Quy ước: x ảnh → x thế giới, y ảnh (xuống dưới) → z thế giới. 1 đơn vị = 1 m.
export const PX_PER_M = 68; // giường đôi dài 2.0 m ≈ 136 px
const S = 1 / PX_PER_M;
const m = (v) => +(v * S).toFixed(4);
const P = (x, y) => [m(x), m(y)];

export const IMAGE = { w: 526 * S, h: 676 * S, url: 'floorplan.png' };
export const WALL_H = 2.7;

// Tường: a → b (px), t = độ dày (m). Lỗ mở ghi theo toạ độ px tuyệt đối trên trục chạy của tường.
function wall(ax, ay, bx, by, t, ops = []) {
    const horiz = Math.abs(bx - ax) > Math.abs(by - ay);
    const a0 = horiz ? ax : ay;
    return {
        a: P(ax, ay),
        b: P(bx, by),
        t,
        openings: ops.map((o) => {
            const d0 = Math.abs(o.from - a0), d1 = Math.abs(o.to - a0);
            return { ...o, at: m(Math.min(d0, d1)), w: m(Math.abs(d1 - d0)) };
        })
    };
}
const OUT = 0.2, IN = 0.1;

export const WALLS = [
    // --- tường bao ---
    wall(14, 14, 510, 14, OUT, [
        { type: 'balcony', from: 62, to: 212, rail: 1.1, kind: 'glass' },
        { type: 'window', from: 255, to: 400, sill: 0.75, head: 2.35 }
    ]),
    wall(510, 14, 510, 659, OUT, [
        { type: 'balcony', from: 165, to: 430, rail: 1.2, kind: 'solid' },
        { type: 'window', from: 495, to: 640, sill: 1.0, head: 2.35 }
    ]),
    wall(510, 659, 14, 659, OUT, [{ type: 'door', from: 205, to: 142, head: 2.2, hinge: 'end', swing: 1, main: true }]),
    wall(14, 659, 14, 14, OUT),
    // --- tường ngăn ---
    wall(14, 88, 218, 88, IN, [
        { type: 'window', from: 62, to: 136, sill: 0, head: 2.4 },
        { type: 'open', from: 136, to: 212, head: 2.4 }
    ]),
    wall(218, 14, 218, 378, IN, [{ type: 'door', from: 258, to: 310, head: 2.15, hinge: 'end', swing: -1 }]),
    wall(218, 322, 296, 322, IN),
    wall(296, 250, 296, 378, IN, [{ type: 'door', from: 262, to: 306, head: 2.15, hinge: 'end', swing: -1 }]),
    wall(296, 250, 436, 250, IN),
    wall(296, 378, 436, 378, IN),
    wall(436, 14, 436, 475, IN, [
        { type: 'window', from: 322, to: 354, sill: 1.5, head: 2.1, frosted: true },
        { type: 'door', from: 380, to: 434, head: 2.15, hinge: 'end', swing: -1 }
    ]),
    wall(436, 155, 510, 155, IN),
    wall(436, 438, 510, 438, IN),
    wall(218, 475, 436, 475, IN),
    wall(218, 475, 218, 659, IN, [{ type: 'door', from: 537, to: 590, head: 2.15, hinge: 'start', swing: -1 }]),
    wall(14, 507, 131, 507, IN),
    wall(131, 507, 131, 659, IN, [{ type: 'door', from: 517, to: 563, head: 2.15, hinge: 'start', swing: 1 }])
];

const poly = (...pts) => pts.map(([x, y]) => P(x, y));
export const ROOMS = [
    { name: 'Lô gia', floor: 'tile', light: 0, poly: poly([14, 14], [218, 14], [218, 88], [14, 88]) },
    { name: 'Phòng khách & bàn ăn', floor: 'wood', light: 1.6, poly: poly([14, 88], [218, 88], [218, 507], [14, 507]) },
    { name: 'Sảnh vào', floor: 'wood', light: 0.7, poly: poly([131, 507], [218, 507], [218, 659], [131, 659]) },
    { name: 'Bếp', floor: 'wood', light: 0.9, poly: poly([218, 322], [296, 322], [296, 378], [436, 378], [436, 475], [218, 475]) },
    { name: 'Phòng ngủ Master', floor: 'wood', light: 1.2, poly: poly([218, 14], [436, 14], [436, 250], [296, 250], [296, 322], [218, 322]) },
    { name: 'WC Master', floor: 'tile', light: 0.7, poly: poly([296, 250], [436, 250], [436, 378], [296, 378]) },
    { name: 'Lô gia phục vụ', floor: 'tile', light: 0, poly: poly([436, 155], [510, 155], [510, 438], [436, 438]) },
    { name: 'Phòng ngủ 2', floor: 'wood', light: 1.1, poly: poly([218, 475], [436, 475], [436, 438], [510, 438], [510, 659], [218, 659]) },
    { name: 'WC chung', floor: 'tile', light: 0.7, poly: poly([14, 507], [131, 507], [131, 659], [14, 659]) }
];
// Ô đá ở sảnh (phủ lên sàn gỗ)
export const PADS = [{ floor: 'granite', poly: poly([134.4, 600], [214.6, 600], [214.6, 652.2], [134.4, 652.2]) }];

// Nội thất: pos = tâm (px), rot (độ): 0 = mặt trước quay xuống dưới ảnh (+z), 90 = quay sang phải (+x),
// 180 = quay lên trên, -90 = quay sang trái. w = bề ngang, d = chiều sâu (m).
const F = (type, x, y, rot, w, d, extra = {}) => ({ type, pos: P(x, y), rot, w, d, ...extra });
export const FURNITURE = [
    // Phòng khách
    F('rug', 91, 181, 0, 2.0, 2.3, { collide: false }),
    F('sofaL', 84.5, 181, 0, 1.84, 2.2),
    F('roundTable', 120, 137, 0, 0.58, 0.58, { h: 0.4 }),
    F('roundTable', 127, 170, 0, 0.5, 0.5, { h: 0.33 }),
    F('lowCabinet', 205, 120, -90, 0.8, 0.28),
    F('tv', 203.6, 203, -90, 1.55, 0.32),
    F('glb', 40, 292, 30, 0.5, 0.5, { model: 'potted_plant_02', h: 1.25 }),
    F('art', 21.6, 165, 90, 1.3, 0.04, { y: 1.35, h: 0.8, seed: 3, collide: false }),
    F('curtain', 40, 97, 0, 0.6, 0.1, { collide: false }),
    // Bàn ăn
    F('diningTable', 78, 423, 0, 1.65, 0.8),
    F('glb', 42, 388, 0, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 78, 388, 0, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 114, 388, 0, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 42, 458, 180, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 78, 458, 180, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 114, 458, 180, 0.46, 0.5, { model: 'dining_chair_02' }),
    F('glb', 78, 423, 0, 0.22, 0.22, { model: 'ceramic_vase_03', h: 0.3, y: 0.77, collide: false }),
    F('pendant', 78, 423, 0, 1.0, 0.2, { collide: false }),
    F('art', 21.6, 423, 90, 0.9, 0.04, { y: 1.45, h: 0.6, seed: 8, collide: false }),
    // Lô gia
    F('washer', 41.2, 50, 90, 0.6, 0.6),
    F('glb', 196, 40, 0, 0.35, 0.35, { model: 'potted_plant_01', h: 1.2 }),
    // WC chung
    F('vanity', 37, 540, 90, 0.6, 0.48),
    F('toilet', 100, 629, 180, 0.4, 0.68),
    F('shower', 51.3, 621.7, 180, 0.9, 0.9, { flip: true }),
    // Bếp
    F('kitchen', 327, 451.9, 180, 3.1, 0.58, { sinkX: 0.66, stoveX: -0.93 }),
    F('fridge', 257, 349.2, 0, 0.9, 0.7),
    // Phòng ngủ Master
    F('bed', 364.6, 127, -90, 1.75, 2.0),
    F('dresser', 398, 36, 0, 0.85, 0.45),
    F('nightstand', 414, 196.5, 0, 0.5, 0.26),
    F('wardrobe', 366, 226.2, 180, 1.95, 0.6),
    F('glb', 238, 50, 0, 0.4, 0.4, { model: 'potted_plant_04', h: 0.9 }),
    F('art', 222.2, 127, 90, 1.0, 0.04, { y: 1.4, h: 0.7, seed: 5, collide: false }),
    F('curtain', 243, 25, 0, 0.6, 0.1, { collide: false }),
    // WC Master
    F('vanity', 385, 269.7, 0, 0.7, 0.48),
    F('tallCabinet', 421, 273.8, 0, 0.3, 0.6),
    F('toilet', 327, 351.5, 180, 0.4, 0.68),
    F('shower', 395.2, 344, 180, 1.1, 0.9),
    // Lô gia phục vụ
    F('utilitySink', 489.6, 297, -90, 0.7, 0.4),
    F('acUnit', 471, 170, 0, 0.8, 0.3),
    // Phòng ngủ 2
    F('wardrobe', 293, 498.1, 0, 2.1, 0.58),
    F('wardrobe', 471.3, 459.7, 0, 0.93, 0.54),
    F('bed', 435.2, 514, -90, 0.92, 2.0, { single: true }),
    F('bed', 435.2, 620, -90, 0.92, 2.0, { single: true }),
    F('nightstand', 486, 567, -90, 0.5, 0.45),
    F('desk', 305, 633.5, 180, 1.85, 0.55),
    F('glb', 275, 598, 0, 0.55, 0.55, { model: 'modern_arm_chair_01' }),
    F('glb', 335, 598, 0, 0.55, 0.55, { model: 'modern_arm_chair_01' }),
    F('glb', 358, 636, 150, 0.3, 0.3, { model: 'desk_lamp_arm_01', h: 0.45, y: 0.76, collide: false }),
    F('glb', 262, 640, 0, 0.3, 0.2, { model: 'book_encyclopedia_set_01', h: 0.22, y: 0.76, collide: false })
];

// Điểm tour: pos = chỗ đứng, look = điểm nhìn (px)
const T = (name, px, py, lx, ly) => ({ name, pos: P(px, py), look: P(lx, ly) });
export const TOUR = [
    T('Sảnh vào', 173, 628, 173, 400),
    T('Phòng khách', 180, 300, 80, 165),
    T('Bàn ăn', 186, 352, 70, 432),
    T('Bếp', 236, 406, 420, 446),
    T('Phòng ngủ Master', 248, 196, 400, 112),
    T('Phòng ngủ 2', 292, 560, 440, 572)
];

export const BOUNDS = { minX: m(14) - 0.1, maxX: m(510) + 0.1, minZ: m(14) - 0.1, maxZ: m(659) + 0.1 };
