import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { BOUNDS } from './plan.js';
import { getManifest } from './materials.js';

export async function setupLighting(renderer, scene) {
    const cx = (BOUNDS.minX + BOUNDS.maxX) / 2, cz = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
    const pmrem = new THREE.PMREMGenerator(renderer);

    // Trời thật (HDRI): vừa là nền nhìn qua cửa, vừa là ánh sáng môi trường
    const hdrUrl = Object.values(getManifest().hdris)[0];
    let skyEnv = null;
    if (hdrUrl) {
        try {
            const hdr = await new RGBELoader().loadAsync('assets/' + hdrUrl);
            hdr.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = hdr;
            scene.backgroundIntensity = 0.8;
            skyEnv = pmrem.fromEquirectangular(hdr).texture;
        } catch (e) {
            console.warn('Không nạp được HDRI', e.message);
        }
    }
    if (!skyEnv) {
        scene.background = new THREE.Color(0xbfd4e6);
        scene.add(new THREE.HemisphereLight(0xdfeaff, 0x9a8f80, 1.2));
    }
    scene.environment = skyEnv;
    scene.environmentIntensity = 0.45;
    // Ánh sáng dội giả lập: màu "đất" chiếu ngược lên trần, màu "trời" chiếu xuống
    scene.add(new THREE.HemisphereLight(0xe3ebf5, 0xf3e7d8, 0.7));

    // Nắng: chiếu từ phía lô gia (phía trên bản vẽ), hơi lệch phải
    const sun = new THREE.DirectionalLight(0xfff2e2, 3.2);
    sun.position.set(cx + 3.5, 9.5, cz - 10);
    sun.target.position.set(cx, 0, cz);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);

    // Ánh sáng dội: chụp chính căn phòng thành bản đồ môi trường để vật liệu phản chiếu nội thất thay vì bầu trời
    function bakeProbe(x, y, z) {
        const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
        const cam = new THREE.CubeCamera(0.05, 60, rt);
        cam.position.set(x, y, z);
        scene.add(cam);
        for (let pass = 0; pass < 2; pass++) {
            cam.update(renderer, scene);
            const env = pmrem.fromCubemap(rt.texture).texture;
            scene.environment = env;
            scene.environmentIntensity = 0.85;
        }
        scene.remove(cam);
        rt.dispose();
    }
    function setShadowQuality(high) {
        const size = high ? 4096 : 2048;
        if (sun.shadow.mapSize.x !== size) {
            sun.shadow.mapSize.set(size, size);
            if (sun.shadow.map) {
                sun.shadow.map.dispose();
                sun.shadow.map = null;
            }
        }
    }
    return { sun, bakeProbe, setShadowQuality };
}
