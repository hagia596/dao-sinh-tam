import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * dragon3d_v2.js - Nâng cấp hiệu ứng Rồng Đông Á 3D
 * Tích hợp từ mã nguồn người dùng cung cấp và tối ưu cho trang Đạo Sinh Tâm.
 */

(function initDragonV2() {
    const canvas = document.getElementById('dragon3dCanvas');
    if (!canvas) return;

    // ===== SCENE =====
    const scene = new THREE.Scene();
    // scene.fog = new THREE.FogExp2(0x020617, 0.02); // Tùy chọn sương mù

    // ===== CAMERA =====
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 15);

    // ===== RENDERER =====
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true, 
        alpha: true 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // ===== POST PROCESSING (BLOOM) =====
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, // strength
        0.4, // radius
        0.85 // threshold
    );
    composer.addPass(bloom);

    // ===== LIGHTING =====
    const hemi = new THREE.HemisphereLight(0xffffff, 0x020617, 0.8);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    const rimLight = new THREE.PointLight(0x22c55e, 10, 50);
    rimLight.position.set(0, 5, 5);
    scene.add(rimLight);

    // ===== PARTICLE VORTEX (KHÍ) =====
    const particleCount = 3000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 10 + Math.random() * 20;
        const angle = Math.random() * Math.PI * 2;
        pos[i3] = Math.cos(angle) * radius;
        pos[i3 + 1] = (Math.random() - 0.5) * 15;
        pos[i3 + 2] = Math.sin(angle) * radius;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ 
        size: 0.1, 
        color: 0x22c55e, 
        transparent: true, 
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });

    const vortex = new THREE.Points(geo, mat);
    scene.add(vortex);

    // ===== LOAD DRAGON (FALLBACK TO PROCEDURAL IF NO GLB) =====
    const loader = new GLTFLoader();
    let dragon, mixer;

    // Thử tải model rồng, nếu không có sẽ dùng hiệu ứng hạt tập trung
    loader.load('dragon.glb', (gltf) => {
        dragon = gltf.scene;
        dragon.scale.set(4, 4, 4);

        dragon.traverse((child) => {
            if (child.isMesh) {
                child.material.metalness = 1;
                child.material.roughness = 0.2;
                child.material.envMapIntensity = 1.5;

                if (child.name.toLowerCase().includes('eye')) {
                    child.material.emissive = new THREE.Color(0x22c55e);
                    child.material.emissiveIntensity = 10;
                }
            }
        });

        scene.add(dragon);
        mixer = new THREE.AnimationMixer(dragon);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    }, undefined, (error) => {
        console.warn('Dragon model not found, using energy orb fallback.');
        // Fallback: Quả cầu năng lượng (Linh khí)
        const orbGeo = new THREE.SphereGeometry(1, 32, 32);
        const orbMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 });
        dragon = new THREE.Mesh(orbGeo, orbMat);
        scene.add(dragon);
    });

    // ===== CURVE PATH (QUỸ ĐẠO BAY) =====
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-15, 2, 5),
        new THREE.Vector3(-8, 5, -5),
        new THREE.Vector3(0, 2, -10),
        new THREE.Vector3(8, 6, -5),
        new THREE.Vector3(15, 2, 5),
        new THREE.Vector3(0, -2, 8),
        new THREE.Vector3(-15, 2, 5)
    ]);
    curve.closed = true;

    let clock = new THREE.Clock();
    let mouseX = 0, mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 4;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 4;
    });

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        const t = (elapsed * 0.03) % 1;

        if (dragon) {
            const pos = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);
            
            // Thêm tương tác chuột nhẹ vào vị trí
            dragon.position.x = pos.x + mouseX;
            dragon.position.y = pos.y - mouseY;
            dragon.position.z = pos.z;

            const axis = new THREE.Vector3(0, 1, 0);
            const up = new THREE.Vector3().crossVectors(axis, tangent).normalize();
            const matrix = new THREE.Matrix4().lookAt(dragon.position, dragon.position.clone().add(tangent), up);
            dragon.quaternion.setFromRotationMatrix(matrix);
            
            // Hiệu ứng nhịp thở/phát sáng
            rimLight.intensity = 5 + Math.sin(elapsed * 2) * 5;
            rimLight.position.copy(dragon.position);
        }

        vortex.rotation.y += 0.001;
        vortex.rotation.z += 0.0005;

        if (mixer) mixer.update(delta);

        composer.render();
    }

    animate();

    // ===== RESIZE =====
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
})();
