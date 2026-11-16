import * as THREE from 'three';
import { ROOMS, TOUR, BOUNDS, IMAGE, WALL_H } from './plan.js';
import { initMaterials, makeMaterials } from './materials.js';
import { buildWalls, updateDoors } from './walls.js';
import { buildFloors } from './floors.js';
import { buildFurniture, preloadModels } from './furniture.js';
import { setupLighting } from './lighting.js';
import { createPost } from './post.js';
import { createNav, resolve } from './nav.js';
import { createControls } from './controls.js';
import { createHud } from './hud.js';
import { cyl, inPoly, polyArea } from './geo.js';

const EYE = 1.6, WALK = 1.4, RUN = 2.8, FOV = 58;
const stage = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // ?shot=0..5 | top : chế độ chụp ảnh kiểm tra
const lookYaw = (pos, look) => Math.atan2(-(look[0] - pos[0]), -(look[1] - pos[1]));
const angDiff = (a, b) => ((((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

async function start() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    } catch (e) {
        stage.innerHTML = '<div class="err">Trình duyệt này không hỗ trợ WebGL nên không chạy được bản 3D.</div>';
        return;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'gl';
    stage.insertBefore(renderer.domElement, stage.firstChild);
    const canvas = renderer.domElement;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
    camera.rotation.order = 'YXZ';

    // ---- nạp tài nguyên ----
    const bar = document.getElementById('barFill'), loadText = document.getElementById('loadText');
    let done = 0, total = 40;
    const tick = () => (bar.style.width = Math.min(100, (++done / total) * 100) + '%');
    await initMaterials(renderer, tick);
    total = done + 10;
    loadText.textContent = 'Nạp model nội thất';
    await preloadModels(tick);
    loadText.textContent = 'Dựng tường, sàn và ánh sáng';

    // ---- dựng cảnh ----
    const M = makeMaterials();
    const colliders = [];
    const doors = buildWalls(scene, M, colliders);
    const { floorMeshes, ceiling } = buildFloors(scene, M);
    buildFurniture(scene, M, colliders);
    const light = await setupLighting(renderer, scene);
    const nav = createNav(colliders);
    const post = createPost(renderer, scene, camera);

    // nhân vật (hiện ở chế độ xem mô hình) và ảnh mặt bằng đối chiếu
    const marker = new THREE.Group();
    cyl(marker, 0.2, 0.2, 1.5, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0xa8662d, roughness: 0.5 }));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 1.3, -0.3);
    marker.add(nose);
    marker.visible = false;
    scene.add(marker);

    const refTex = new THREE.TextureLoader().load(IMAGE.url);
    refTex.colorSpace = THREE.SRGBColorSpace;
    const refPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(IMAGE.w, IMAGE.h),
        new THREE.MeshBasicMaterial({ map: refTex, transparent: true, opacity: 0.55, depthTest: false, toneMapped: false })
    );
    refPlane.rotation.x = -Math.PI / 2;
    refPlane.position.set(IMAGE.w / 2, WALL_H + 0.02, IMAGE.h / 2);
    refPlane.renderOrder = 10;
    refPlane.visible = false;
    scene.add(refPlane);

    // ---- trạng thái ----
    const player = { x: TOUR[0].pos[0], z: TOUR[0].pos[1], yaw: lookYaw(TOUR[0].pos, TOUR[0].look), pitch: 0 };
    const orbit = { theta: 0.5, phi: 0.8, r: 12, tx: (BOUNDS.minX + BOUNDS.maxX) / 2, tz: (BOUNDS.minZ + BOUNDS.maxZ) / 2 };
    let mode = 'walk', hq = !params.has('lq'), started = false;
    let walk = null; // { pts, i, look, onDone }
    let tour = null; // { i, wait }

    const overlay = document.getElementById('overlay');
    const begin = () => { if (!started) { started = true; overlay.hidden = true; } };
    const cancelAuto = () => { walk = null; if (tour) { tour = null; hud.setTour(false); } };

    function walkTo(x, z, look, onDone) {
        const pts = nav.findPath(player.x, player.z, x, z);
        if (!pts) { player.x = x; player.z = z; resolve(colliders, player); if (look != null) player.yaw = look; onDone && onDone(); return; }
        walk = { pts, i: 1, look, onDone };
    }
    function goStop(i, onDone) {
        hud.setStop(i);
        walkTo(TOUR[i].pos[0], TOUR[i].pos[1], lookYaw(TOUR[i].pos, TOUR[i].look), onDone);
    }
    function setMode(m) {
        mode = m;
        ceiling.visible = m === 'walk';
        marker.visible = m === 'model';
        if (m === 'walk') { refPlane.visible = false; hud.setOverlay(false); }
        else controls.unlock();
        hud.setMode(m);
        controls.refresh();
    }
    function setQuality(v) {
        hq = v;
        renderer.toneMapping = hq ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;
        light.setShadowQuality(hq);
        hud.setQuality(hq);
        resize();
    }

    const hud = createHud({
        onStop(i) { begin(); cancelAuto(); if (mode !== 'walk') setMode('walk'); goStop(i); },
        onTour() {
            begin();
            if (tour) return cancelAuto();
            cancelAuto();
            if (mode !== 'walk') setMode('walk');
            tour = { i: 0, wait: 0 };
            hud.setTour(true);
            goStop(0, () => tour && (tour.wait = 2.2));
        },
        onMode() { begin(); cancelAuto(); setMode(mode === 'walk' ? 'model' : 'walk'); },
        onOverlay() {
            refPlane.visible = !refPlane.visible;
            hud.setOverlay(refPlane.visible);
            if (refPlane.visible) { orbit.phi = 0.02; orbit.theta = 0; orbit.r = 13; }
        },
        onQuality() { setQuality(!hq); },
        onMiniClick(x, z) { begin(); cancelAuto(); walkTo(x, z); }
    });
    const ray = new THREE.Raycaster();
    const controls = createControls(stage, canvas, { player, orbit, mode: () => mode }, {
        onStart: begin,
        onUserMove: cancelAuto,
        onTap(e) {
            const r = canvas.getBoundingClientRect();
            ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
            const hit = ray.intersectObjects(floorMeshes)[0];
            if (hit) { cancelAuto(); walkTo(hit.point.x, hit.point.z); }
        }
    });
    const isTouch = matchMedia('(pointer:coarse)').matches;
    document.getElementById('btnWalk').addEventListener('click', () => { begin(); stage.focus(); if (!isTouch) controls.lock(); });
    document.getElementById('btnTour').addEventListener('click', () => {
        begin();
        stage.focus();
        tour = { i: 0, wait: 1.5 };
        hud.setTour(true);
        hud.setStop(0);
    });

    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(hq ? Math.min(window.devicePixelRatio || 1, 1.5) : 1);
        renderer.setSize(w, h, false);
        post.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        hud.resize();
    }
    new ResizeObserver(resize).observe(stage);

    // ---- hoàn tất nạp ----
    for (const r of ROOMS) if (r.area == null) r.area = polyArea(r.poly);
    const total_m2 = ROOMS.reduce((s, r) => s + r.area, 0);
    document.getElementById('sizeText').textContent = `${(BOUNDS.maxX - BOUNDS.minX - 0.2).toFixed(1)} × ${(BOUNDS.maxZ - BOUNDS.minZ - 0.2).toFixed(1)} m · ~${total_m2.toFixed(0)} m²`;
    setQuality(hq);
    // dựng bóng đổ một lần rồi chụp ánh sáng dội từ giữa phòng khách
    renderer.render(scene, camera);
    const living = ROOMS[1];
    light.bakeProbe((living.minX + living.maxX) / 2, 1.45, living.minZ + (living.maxZ - living.minZ) * 0.45);
    document.getElementById('loading').hidden = true;

    if (shot != null) {
        document.body.classList.add('shot');
        started = true;
        if (shot === 'top' || shot === 'model') {
            setMode('model');
            if (shot === 'top') { refPlane.visible = true; orbit.phi = 0.02; orbit.theta = 0; orbit.r = 13; }
        } else {
            const t = TOUR[+shot] || TOUR[0];
            Object.assign(player, { x: t.pos[0], z: t.pos[1], yaw: lookYaw(t.pos, t.look), pitch: -0.1 });
        }
        if (params.has('tour')) { tour = { i: +shot || 0, wait: 0.5 }; hud.setTour(true); }
    } else overlay.hidden = false;

    // ---- vòng lặp ----
    let last = performance.now();
    function followPath(dt) {
        const p = walk;
        let left = WALK * 1.1 * dt;
        while (left > 0 && p.i < p.pts.length) {
            const [tx, tz] = p.pts[p.i], dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
            if (d <= left) { player.x = tx; player.z = tz; p.i++; left -= d; }
            else { player.x += (dx / d) * left; player.z += (dz / d) * left; left = 0; }
        }
        let target = p.look ?? player.yaw;
        if (p.i < p.pts.length) {
            const [tx, tz] = p.pts[p.i], lastSeg = p.i === p.pts.length - 1;
            const d = Math.hypot(tx - player.x, tz - player.z);
            if (!(lastSeg && p.look != null && d < 1.0)) target = Math.atan2(-(tx - player.x), -(tz - player.z));
        }
        player.yaw += angDiff(target, player.yaw) * Math.min(1, dt * 3.2);
        player.pitch += (-0.1 - player.pitch) * Math.min(1, dt * 3);
        if (p.i >= p.pts.length && Math.abs(angDiff(target, player.yaw)) < 0.02) {
            walk = null;
            p.onDone && p.onDone();
        }
    }
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (walk) followPath(dt);
        else if (tour) {
            tour.wait -= dt;
            if (tour.wait <= 0) {
                tour.i++;
                if (tour.i >= TOUR.length) { tour = null; hud.setTour(false); }
                else { tour.wait = Infinity; goStop(tour.i, () => tour && (tour.wait = 2.2)); }
            }
        } else if (mode === 'walk') {
            const inp = controls.input();
            player.yaw += inp.turn * 1.8 * dt;
            const m = Math.hypot(inp.f, inp.s);
            if (m > 0.01) {
                const sp = ((inp.run ? RUN : WALK) * Math.min(1, m)) / m * dt, sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
                player.x += (-sy * inp.f + cy * inp.s) * sp;
                player.z += (-cy * inp.f - sy * inp.s) * sp;
                resolve(colliders, player);
            }
        }
        updateDoors(doors, player.x, player.z, dt);
        if (mode === 'walk') {
            camera.position.set(player.x, EYE, player.z);
            camera.rotation.set(player.pitch, player.yaw, 0);
        } else {
            const sp = Math.sin(orbit.phi);
            camera.position.set(orbit.tx + orbit.r * sp * Math.sin(orbit.theta), orbit.r * Math.cos(orbit.phi), orbit.tz + orbit.r * sp * Math.cos(orbit.theta));
            camera.up.set(0, 1, 0);
            camera.lookAt(orbit.tx, 0, orbit.tz);
            marker.position.set(player.x, 0, player.z);
            marker.rotation.y = player.yaw;
        }
        const room = ROOMS.find((r) => inPoly(player.x, player.z, r.poly));
        hud.update(player, room, walk ? walk.pts.slice(walk.i) : null);
        if (hq) post.render(dt);
        else renderer.render(scene, camera);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.__ready = true;
}

start().catch((e) => {
    console.error(e);
    stage.insertAdjacentHTML('beforeend', `<div class="err">Lỗi khi dựng cảnh: ${e.message}</div>`);
});
