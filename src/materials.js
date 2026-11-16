import * as THREE from 'three';

// Kích thước thật của mỗi texture (mét), lấy từ thông tin Poly Haven
const SIZE = {
    laminate_floor_02: 1.7,
    walnut_veneer: 1.8,
    brown_leather: 0.4,
    rough_linen: 0.27,
    cotton_jersey: 0.264,
    large_grey_tiles: 3,
    painted_plaster_wall: 2,
    fabric_pattern_07: 0.4
};

let manifest = { textures: {}, models: {}, hdris: {} };
let aniso = 8;
const base = {}; // id:kind → texture gốc
const variants = {};

export const getManifest = () => manifest;

export async function initMaterials(renderer, onProgress) {
    try {
        manifest = await (await fetch('assets/manifest.json')).json();
    } catch (e) {
        console.warn('Không đọc được assets/manifest.json, dùng vật liệu trơn. Chạy: npm run assets');
    }
    aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const loader = new THREE.TextureLoader();
    const jobs = [];
    for (const [id, maps] of Object.entries(manifest.textures))
        for (const [kind, url] of Object.entries(maps))
            jobs.push(
                loader.loadAsync('assets/' + url).then(
                    (t) => {
                        t.wrapS = t.wrapT = THREE.RepeatWrapping;
                        t.anisotropy = aniso;
                        if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace;
                        base[id + ':' + kind] = t;
                        onProgress && onProgress();
                    },
                    () => console.warn('Thiếu texture', url)
                )
            );
    await Promise.all(jobs);
}

function tex(id, kind, scale, rot) {
    const b = base[id + ':' + kind];
    if (!b) return null;
    const key = `${id}:${kind}:${scale}:${rot}`;
    if (!variants[key]) {
        const t = b.clone();
        const s = 1 / ((SIZE[id] || 1) * scale);
        t.repeat.set(s, s);
        t.rotation = rot;
        t.needsUpdate = true;
        variants[key] = t;
    }
    return variants[key];
}

// Vật liệu PBR từ bộ texture. Mọi hình khối dùng UV tính bằng mét (xem geo.js) nên texture luôn đúng tỉ lệ.
export function pbr(id, o = {}) {
    const scale = o.scale || 1, rot = o.rot || 0;
    const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, roughness: o.roughness ?? 1, metalness: o.metalness ?? 0 });
    if (o.map !== false) mat.map = tex(id, 'diff', scale, rot);
    const nor = tex(id, 'nor', scale, rot);
    if (nor) {
        mat.normalMap = nor;
        mat.normalScale.setScalar(o.normalScale ?? 1);
    }
    mat.roughnessMap = tex(id, 'rough', scale, rot) || tex(id, 'arm', scale, rot);
    if (o.envMapIntensity != null) mat.envMapIntensity = o.envMapIntensity;
    if (o.side) mat.side = o.side;
    return mat;
}

// Vân đá hạt nhỏ tự tạo (mặt bếp, sảnh): ô 0.5 m
function speckle(baseColor, dark, light) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = baseColor;
    g.fillRect(0, 0, 256, 256);
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5200; i++) {
        g.fillStyle = rnd() < 0.55 ? dark : light;
        g.globalAlpha = 0.25 + rnd() * 0.5;
        const r = 0.5 + rnd() * 1.6;
        g.beginPath();
        g.arc(rnd() * 256, rnd() * 256, r, 0, 6.3);
        g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
}

const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });

export function makeMaterials() {
    return {
        wall: pbr('painted_plaster_wall', { map: false, color: 0xf3f1ed, normalScale: 0.6 }),
        ceiling: flat(0xf7f5f1, { roughness: 0.95 }),
        slab: flat(0x8f8c88, { roughness: 0.95 }),
        skirting: flat(0xf4f2ee, { roughness: 0.45 }),
        wood: pbr('laminate_floor_02', { rot: Math.PI / 2, roughness: 0.85, envMapIntensity: 0.9 }),
        tile: pbr('large_grey_tiles', { scale: 0.4, roughness: 0.75 }),
        granite: flat(0xffffff, { map: speckle('#8d8f92', '#3c3e42', '#d4d6d8'), roughness: 0.35 }),
        walnut: pbr('walnut_veneer', { roughness: 0.8 }),
        walnutDark: pbr('walnut_veneer', { color: 0xc4a591, roughness: 0.8 }),
        leather: pbr('brown_leather', { map: false, color: 0x6f3d2a, roughness: 0.8 }),
        linen: pbr('rough_linen', { map: false, color: 0xf1ede6 }),
        linenGrey: pbr('rough_linen', { map: false, color: 0xb3b1ad }),
        linenMint: pbr('rough_linen', { map: false, color: 0xa6d6ca }),
        curtain: pbr('rough_linen', { map: false, color: 0xe8e3d9, side: THREE.DoubleSide }),
        cotton: pbr('cotton_jersey', { map: false, color: 0x9c9d9f }),
        cottonWhite: pbr('cotton_jersey', { map: false, color: 0xf7f5f1 }),
        rug: pbr('fabric_pattern_07', { color: 0xe6e2da, scale: 3 }),
        marble: flat(0xecebe7, { roughness: 0.22 }),
        counter: flat(0xffffff, { map: speckle('#cdbfa6', '#6f6252', '#efe6d6'), roughness: 0.3 }),
        white: flat(0xf5f4f1, { roughness: 0.35 }),
        ceramic: flat(0xfbfbfa, { roughness: 0.12 }),
        black: flat(0x18191b, { roughness: 0.35 }),
        screen: flat(0x08090b, { roughness: 0.08, metalness: 0.4 }),
        steel: flat(0xc4c7ca, { roughness: 0.28, metalness: 0.9 }),
        chrome: flat(0xe6e8ea, { roughness: 0.08, metalness: 1 }),
        darkMetal: flat(0x2c2e31, { roughness: 0.4, metalness: 0.7 }),
        mint: flat(0xa9dccf, { roughness: 0.25 }),
        mintGlass: new THREE.MeshStandardMaterial({ color: 0xbfe8dc, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.55 }),
        mirror: flat(0xf2f5f7, { roughness: 0.02, metalness: 1 }),
        glass: new THREE.MeshStandardMaterial({
            color: 0xdcecf2, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide
        }),
        frosted: new THREE.MeshStandardMaterial({ color: 0xeef4f6, roughness: 0.7, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
        frame: flat(0x2e3033, { roughness: 0.45, metalness: 0.6 }),
        doorLeaf: pbr('walnut_veneer', { color: 0xe6d6c8, roughness: 0.7 }),
        glowWarm: new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xffd9a6, emissiveIntensity: 2 }),
        glowSoft: new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xffe2bd, emissiveIntensity: 0.9 })
    };
}
