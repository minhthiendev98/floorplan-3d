import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

// Hậu kỳ: bóng tối ở góc tường và dưới chân đồ đạc (AO), loé sáng nhẹ quanh đèn/cửa sổ, khử răng cưa.
export function createPost(renderer, scene, camera) {
    const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));

    const ao = new N8AOPostPass(scene, camera, 1, 1);
    ao.configuration.aoRadius = 0.55;
    ao.configuration.distanceFalloff = 1.0;
    ao.configuration.intensity = 3.2;
    ao.configuration.color = new THREE.Color(0x0b0705);
    ao.configuration.gammaCorrection = false;
    ao.configuration.halfRes = true;
    ao.setQualityMode('Medium');
    composer.addPass(ao);

    const bloom = new BloomEffect({ intensity: 0.22, luminanceThreshold: 1.3, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.7 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    composer.addPass(new EffectPass(camera, bloom, tone));
    composer.addPass(new EffectPass(camera, new SMAAEffect()));

    return {
        setSize: (w, h) => composer.setSize(w, h),
        render: (dt) => composer.render(dt)
    };
}
