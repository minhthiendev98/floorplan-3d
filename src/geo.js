import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Gán UV theo mét (chiếu theo trục pháp tuyến trội) để texture không bị kéo giãn theo kích thước khối.
export function worldUV(geo) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
        if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
        else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
        else uv.setXY(i, p.getX(i), p.getY(i));
    }
    uv.needsUpdate = true;
    return geo;
}

function finish(mesh, parent, shadow) {
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent && parent.add(mesh);
    return mesh;
}

// Hộp, y = cao độ mặt đáy. r > 0 thì bo góc.
export function box(parent, w, h, d, x, y, z, mat, r = 0, shadow = true) {
    const rr = Math.min(r, Math.min(w, h, d) / 2 - 0.001);
    const geo = rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(worldUV(geo), mat);
    mesh.position.set(x, y + h / 2, z);
    return finish(mesh, parent, shadow);
}

// Trụ đứng, y = cao độ mặt đáy
export function cyl(parent, rTop, rBot, h, x, y, z, mat, seg = 24, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
    mesh.position.set(x, y + h / 2, z);
    return finish(mesh, parent, shadow);
}

export function sphere(parent, r, x, y, z, mat, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    return finish(mesh, parent, true);
}

export const rad = (deg) => (deg * Math.PI) / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function polyArea(p) {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
}
export function inPoly(x, y, p) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i], b = p[j];
        if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
}
