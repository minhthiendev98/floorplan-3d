// Tải model / texture / HDRI (CC0) từ Poly Haven về public/assets.
// Chạy: node scripts/fetch-assets.mjs   (bỏ qua file đã có)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const UA = { headers: { 'User-Agent': 'floorplan-3d-fetch' } };

const TEXTURES = [
    'laminate_floor_02', // sàn gỗ sáng
    'walnut_veneer', // tủ, kệ gỗ óc chó
    'brown_leather', // sofa
    'rough_linen', // ga giường, rèm
    'cotton_jersey', // chăn, gối
    'large_grey_tiles', // WC, lô gia
    'painted_plaster_wall', // tường
    'fabric_pattern_07' // thảm
];
const HDRIS = [['kloofendal_48d_partly_cloudy_puresky', '2k']];
const MODELS = [
    'potted_plant_01',
    'potted_plant_02',
    'potted_plant_04',
    'dining_chair_02',
    'modern_arm_chair_01',
    'book_encyclopedia_set_01',
    'ceramic_vase_03',
    'desk_lamp_arm_01'
];

const exists = (p) => access(p).then(() => true, () => false);
async function download(url, dest) {
    if (await exists(dest)) return false;
    await mkdir(dirname(dest), { recursive: true });
    for (let attempt = 1; ; attempt++) {
        try {
            const r = await fetch(url, UA);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            await writeFile(dest, Buffer.from(await r.arrayBuffer()));
            return true;
        } catch (e) {
            if (attempt >= 3) throw new Error(`${url}: ${e.message}`);
        }
    }
}
const files = async (id) => {
    const r = await fetch('https://api.polyhaven.com/files/' + id, UA);
    if (!r.ok) throw new Error(`files/${id}: HTTP ${r.status}`);
    return r.json();
};
const pick = (obj, re) => Object.keys(obj).find((k) => re.test(k));

const manifest = { textures: {}, hdris: {}, models: {} };
const failed = [];

for (const id of TEXTURES) {
    try {
        const f = await files(id);
        const maps = { diff: pick(f, /^diff/i), nor: pick(f, /^nor_gl$/i), rough: pick(f, /^rough$/i), arm: pick(f, /^arm$/i) };
        const entry = {};
        for (const [name, key] of Object.entries(maps)) {
            if (!key || (name === 'arm' && maps.rough)) continue;
            const res = f[key]['1k'];
            const fmt = res.jpg || res.png;
            if (!fmt) continue;
            const ext = res.jpg ? 'jpg' : 'png';
            await download(fmt.url, join(ROOT, 'textures', id, `${name}.${ext}`));
            entry[name] = `textures/${id}/${name}.${ext}`;
        }
        manifest.textures[id] = entry;
        console.log('texture', id, Object.keys(entry).join('+'));
    } catch (e) {
        failed.push(id);
        console.log('LỖI texture', id, e.message);
    }
}

for (const [id, res] of HDRIS) {
    try {
        const f = await files(id);
        await download(f.hdri[res].hdr.url, join(ROOT, 'hdri', `${id}.hdr`));
        manifest.hdris[id] = `hdri/${id}.hdr`;
        console.log('hdri', id);
    } catch (e) {
        failed.push(id);
        console.log('LỖI hdri', id, e.message);
    }
}

for (const id of MODELS) {
    try {
        const f = await files(id);
        const g = f.gltf['1k'].gltf;
        const dir = join(ROOT, 'models', id);
        await download(g.url, join(dir, `${id}.gltf`));
        for (const [rel, inc] of Object.entries(g.include || {})) await download(inc.url, join(dir, rel));
        manifest.models[id] = `models/${id}/${id}.gltf`;
        console.log('model', id);
    } catch (e) {
        failed.push(id);
        console.log('LỖI model', id, e.message);
    }
}

await writeFile(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(failed.length ? `Xong, thiếu ${failed.length}: ${failed.join(', ')}` : 'Xong, đủ tài nguyên.');
