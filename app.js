import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let cityParts = [], people = [], buildingData = [];

window.start = () => {
    document.getElementById('overlay').style.opacity = 0;
    setTimeout(() => document.getElementById('overlay').remove(), 2000);
    initAudio();
    init();
    animate();
};

function initAudio() {
    const ctx = new AudioContext();
    const main = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    main.frequency.value = 73.42; // D2 note
    sub.frequency.value = 36.71;  // D1 note
    main.type = 'triangle';
    sub.type = 'sine';
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 3);
    main.connect(g); sub.connect(g);
    g.connect(ctx.destination);
    main.start(); sub.start();
}

function init() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0b0a);
    scene.fog = new THREE.FogExp2(0x0c0b0a, 0.002);

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(600, 800, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;

    // --- ENHANCED LIGHTING ---
    const mainLight = new THREE.DirectionalLight(0xffe0b0, 1.5);
    mainLight.position.set(100, 200, 150);
    scene.add(mainLight);
    scene.add(new THREE.AmbientLight(0x1a2035, 0.4));

    // --- MATERIALS ---
    const clayMat = new THREE.MeshStandardMaterial({ color: 0x9c8263, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.8 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x1a4a3a, metalness: 0.5, roughness: 0.2 });

    // --- THE CITY DNA ENGINE ---
    const count = 6000;
    const baseGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
    const roofGeo = new THREE.SphereGeometry(1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const balconyGeo = new THREE.BoxGeometry(1.2, 0.2, 1.2);

    const mBase = new THREE.InstancedMesh(baseGeo, clayMat, count);
    const mRoof = new THREE.InstancedMesh(roofGeo, domeMat, count);
    const mBalc = new THREE.InstancedMesh(balconyGeo, woodMat, count);
    scene.add(mBase, mRoof, mBalc);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const r = 100 + Math.random() * 600;
        const a = Math.random() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;

        if (Math.abs(z) < 70) continue;

        const h = 10 + Math.random() * 25;
        const w = 4 + Math.random() * 5;
        const hasDome = Math.random() > 0.5;
        const hasBalcony = Math.random() > 0.7;

        // Base
        dummy.position.set(x, 1000 + Math.random() * 1000, z); // Initial sky position
        dummy.scale.set(w, h, w);
        dummy.updateMatrix();
        mBase.setMatrixAt(i, dummy.matrix);

        // Data for animation
        buildingData.push({ 
            id: i, x, z, h, w, 
            currY: dummy.position.y, 
            targetY: h/2,
            delay: (r/600) * 2 + Math.random(),
            hasDome, hasBalcony,
            name: `The ${['Golden', 'Hidden', 'Azure', 'Scented'][Math.floor(Math.random()*4)]} ${['Vault', 'Hearth', 'Atrium'][Math.floor(Math.random()*3)]}`,
            lore: `Built from Euphrates clay, this structure serves as a hub for ${['silk traders', 'astronomers', 'calligraphers'][Math.floor(Math.random()*3)]}.`
        });
    }

    // --- CROWDS ---
    const pGeo = new THREE.SphereGeometry(0.3, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pMesh = new THREE.InstancedMesh(pGeo, pMat, 2500);
    scene.add(pMesh);
    for(let i=0; i<2500; i++) {
        people.push({ r: 120 + Math.random()*500, a: Math.random()*Math.PI*2, speed: 0.001 + Math.random()*0.002 });
    }
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    const [mBase, mRoof, mBalc] = scene.children.filter(c => c instanceof THREE.InstancedMesh);

    buildingData.forEach((b, i) => {
        if (t > b.delay) {
            b.currY = THREE.MathUtils.lerp(b.currY, b.targetY, 0.06);
        }
        
        // Update Base
        dummy.position.set(b.x, b.currY, b.z);
        dummy.scale.set(b.w, b.h, b.w);
        dummy.updateMatrix();
        mBase.setMatrixAt(i, dummy.matrix);

        // Update Dome/Balcony if they exist
        if (b.hasDome) {
            dummy.position.set(b.x, b.currY + b.h/2, b.z);
            dummy.scale.set(b.w*0.8, b.w*0.8, b.w*0.8);
            dummy.updateMatrix();
            mRoof.setMatrixAt(i, dummy.matrix);
        } else {
            dummy.position.set(0,-100,0); dummy.updateMatrix();
            mRoof.setMatrixAt(i, dummy.matrix);
        }
    });
    
    mBase.instanceMatrix.needsUpdate = true;
    mRoof.instanceMatrix.needsUpdate = true;

    // Crowd Animation
    const pMesh = scene.children.find(c => c.count === 2500);
    people.forEach((p, i) => {
        p.a += p.speed;
        dummy.position.set(Math.cos(p.a)*p.r, 1, Math.sin(p.a)*p.r);
        dummy.scale.set(1,1,1); dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
    });
    pMesh.instanceMatrix.needsUpdate = true;

    // Cinematic Camera
    if (t < 6) {
        camera.position.lerp(new THREE.Vector3(400, 300, 500), 0.01);
        camera.lookAt(0,0,0);
    }

    controls.update();
    renderer.render(scene, camera);
}

// Click to Inspect
window.addEventListener('mousedown', (e) => {
    const mouse = new THREE.Vector2((e.clientX/window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(scene.children.find(c => c.count === 6000));
    if (hit.length > 0) {
        const data = buildingData[hit[0].instanceId];
        document.getElementById('hud').classList.add('active');
        document.getElementById('b-name').innerText = data.name;
        document.getElementById('b-lore').innerText = data.lore;
        document.getElementById('sector-tag').innerText = data.x < 200 ? "INNER CIRCLE" : "OUTER SUBURB";
    }
});

// Start sequence
setTimeout(() => {
    document.getElementById('fill').style.width = "100%";
    setTimeout(() => { document.getElementById('start-btn').style.display = "block"; }, 500);
}, 1000);
