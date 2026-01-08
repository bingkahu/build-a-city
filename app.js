import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let cityMesh, domeMesh, peopleMesh, buildingData = [];

window.launch = () => {
    document.getElementById('boot-screen').style.opacity = 0;
    setTimeout(() => document.getElementById('boot-screen').remove(), 1000);
    init();
    startAudio();
    animate();
};

function startAudio() {
    const ctx = new AudioContext();
    const g = ctx.createGain();
    const n = ctx.createOscillator();
    n.type = 'triangle';
    n.frequency.setValueAtTime(110, ctx.currentTime); // Low A
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 2);
    n.connect(g); g.connect(ctx.destination);
    n.start();
}

function init() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1814); // Constant Day
    scene.fog = new THREE.FogExp2(0x1a1814, 0.0015);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 400, 800);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; 
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;

    // --- LIGHTING (Fixed Brightness) ---
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(200, 400, 200);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404050, 0.7));

    // --- CENTER OF KNOWLEDGE (Bayt al-Hikmah) ---
    const centerGrp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(50, 55, 40, 8), new THREE.MeshStandardMaterial({color: 0x8b7355}));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(48, 32, 32, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color: 0x1a4538, metalness: 0.6}));
    dome.position.y = 20;
    centerGrp.add(base, dome);
    centerGrp.userData = { name: "House of Wisdom", lore: "The center of the world's knowledge. Scholars gather here to translate the works of Aristotle and Euclid." };
    scene.add(centerGrp);

    // --- CITY WITH NO OVERLAP (Grid Check) ---
    const grid = new Set();
    const count = 5000;
    const matClay = new THREE.MeshStandardMaterial({ color: 0x9c8263 });
    const matDome = new THREE.MeshStandardMaterial({ color: 0x2a5a4a });
    
    cityMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matClay, count);
    domeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 8), matDome, count);
    scene.add(cityMesh, domeMesh);

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < 8000; i++) {
        if (idx >= count) break;
        const r = 120 + Math.random() * 600;
        const a = Math.random() * Math.PI * 2;
        const x = Math.floor(Math.cos(a) * r / 15) * 15; // Snap to 15-unit grid
        const z = Math.floor(Math.sin(a) * r / 15) * 15;

        if (grid.has(`${x},${z}`) || Math.abs(z) < 60) continue;
        grid.add(`${x},${z}`);

        const h = 10 + Math.random() * 25;
        const w = 6 + Math.random() * 4;

        buildingData.push({ x, z, h, w, currentY: 1000 + Math.random() * 500, targetY: h/2 });

        dummy.position.set(x, 0, z);
        dummy.scale.set(w, h, w);
        dummy.updateMatrix();
        cityMesh.setMatrixAt(idx, dummy.matrix);
        idx++;
    }

    // --- CROWDS (VISIBLE PEOPLE) ---
    const pCount = 3000;
    peopleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}), pCount);
    scene.add(peopleMesh);
    for (let i = 0; i < pCount; i++) {
        const r = 130 + Math.random() * 580;
        people.push({ r, a: Math.random() * Math.PI * 2, s: 0.001 + Math.random() * 0.002 });
    }
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    // 1. SATISFYING FALL
    buildingData.forEach((b, i) => {
        b.currentY = THREE.MathUtils.lerp(b.currentY, b.targetY, 0.06);
        dummy.position.set(b.x, b.currentY, b.z);
        dummy.scale.set(b.w, b.h, b.w);
        dummy.updateMatrix();
        cityMesh.setMatrixAt(i, dummy.matrix);

        // Place dome on top
        dummy.position.y += b.h/2;
        dummy.scale.set(b.w/2, b.w/2, b.w/2);
        dummy.updateMatrix();
        domeMesh.setMatrixAt(i, dummy.matrix);
    });
    cityMesh.instanceMatrix.needsUpdate = true;
    domeMesh.instanceMatrix.needsUpdate = true;

    // 2. VISIBLE CROWDS
    people.forEach((p, i) => {
        p.a += p.s;
        dummy.position.set(Math.cos(p.a)*p.r, 2, Math.sin(p.a)*p.r);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        peopleMesh.setMatrixAt(i, dummy.matrix);
    });
    peopleMesh.instanceMatrix.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('mousedown', (e) => {
    const mouse = new THREE.Vector2((e.clientX/window.innerWidth)*2-1, -(e.clientY/window.innerHeight)*2+1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(scene.children);
    if(hit.length > 0 && hit[0].object.parent?.userData?.name) {
        document.getElementById('hud').style.opacity = 1;
        document.getElementById('b-name').innerText = hit[0].object.parent.userData.name;
        document.getElementById('b-lore').innerText = hit[0].object.parent.userData.lore;
    }
});
