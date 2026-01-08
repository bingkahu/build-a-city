import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let cityMesh, peopleMesh, buildingData = [], peopleData = [];

window.launch = () => {
    initAncientMusic();
    document.getElementById('boot').style.opacity = '0';
    setTimeout(() => document.getElementById('boot').remove(), 1500);
    animate();
};

function initAncientMusic() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.4, audioCtx.currentTime);
    master.connect(audioCtx.destination);

    // Ancient Modal Drone (Oud-style harmonics)
    const notes = [146.83, 220.00, 293.66, 311.13]; // D, A, D, Eb (Phrygian)
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // Slight detune for "honky" ancient instrument feel
        osc.detune.value = Math.random() * 10 - 5;
        
        g.gain.value = 0.05;
        osc.connect(g);
        g.connect(master);
        osc.start();
    });
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9c8a9); // High-noon sky
    scene.fog = new THREE.FogExp2(0xd9c8a9, 0.0012);

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(500, 350, 500);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    clock = new THREE.Clock();

    // Constant Day Light
    const sun = new THREE.DirectionalLight(0xfffdf2, 1.8);
    sun.position.set(200, 600, 100);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.8));

    // --- THE TIGRIS RIVER ---
    const riverGeo = new THREE.PlaneGeometry(3000, 120);
    const riverMat = new THREE.MeshStandardMaterial({ color: 0x212a2e, roughness: 0.1, metalness: 0.5 });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.y = -0.5;
    scene.add(river);

    // --- CENTRE OF KNOWLEDGE ---
    const how = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(40, 45, 35, 8), new THREE.MeshStandardMaterial({color: 0x9c8263}));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 16, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color: 0x1a4538, metalness: 0.4}));
    dome.position.y = 17;
    how.add(base, dome);
    how.position.set(0, 0, 0);
    how.userData = { name: "The House of Wisdom", lore: "The legendary library where scholars translated the world's knowledge into Arabic." };
    scene.add(how);

    // --- DENSE CITY (No Overlaps) ---
    const count = 6000;
    cityMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x8b7355}), count);
    scene.add(cityMesh);

    const grid = new Set();
    let idx = 0;
    for (let i = 0; i < 15000 && idx < count; i++) {
        const r = 110 + Math.random() * 700;
        const a = Math.random() * Math.PI * 2;
        
        // Radial grid snapping
        const x = Math.round(Math.cos(a) * r / 15) * 15;
        const z = Math.round(Math.sin(a) * r / 15) * 15;

        // Skip the river area and existing buildings
        if (grid.has(`${x},${z}`) || Math.abs(z) < 80) continue;
        grid.add(`${x},${z}`);

        const h = 8 + Math.random() * 20;
        buildingData.push({ x, z, h, currY: 1200 + Math.random() * 400, targetY: h/2 });
        idx++;
    }

    // --- HUMANOID PEOPLE (PROPER SCALE) ---
    const pCount = 2000;
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.6, 6); // Slender humanoid
    const headGeo = new THREE.SphereGeometry(0.18, 6, 6);
    headGeo.translate(0, 0.9, 0); // Put head on top
    const pMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2b });
    
    peopleMesh = new THREE.InstancedMesh(bodyGeo, pMat, pCount);
    scene.add(peopleMesh);

    for (let i = 0; i < pCount; i++) {
        peopleData.push({
            r: 120 + Math.random() * 650,
            a: Math.random() * Math.PI * 2,
            speed: 0.004 + Math.random() * 0.008,
            bob: Math.random() * Math.PI
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    // Satisfying Construction
    buildingData.forEach((b, i) => {
        b.currY = THREE.MathUtils.lerp(b.currY, b.targetY, 0.06);
        dummy.position.set(b.x, b.currY, b.z);
        dummy.scale.set(10, b.h, 10);
        dummy.updateMatrix();
        cityMesh.setMatrixAt(i, dummy.matrix);
    });
    cityMesh.instanceMatrix.needsUpdate = true;

    // Humanoid Movement (Wandering Alleyways)
    peopleData.forEach((p, i) => {
        p.a += p.speed * 0.1;
        const x = Math.cos(p.a) * p.r;
        const z = Math.sin(p.a) * p.r;
        
        // Skip river logic
        if (Math.abs(z) < 70) p.a += 0.1; 

        const walkBob = Math.abs(Math.sin(t * 8 + p.bob)) * 0.25;
        dummy.position.set(x, 0.8 + walkBob, z);
        dummy.rotation.z = Math.sin(t * 8 + p.bob) * 0.1;
        dummy.updateMatrix();
        peopleMesh.setMatrixAt(i, dummy.matrix);
    });
    peopleMesh.instanceMatrix.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

// Click Inspection
window.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(scene.children, true);
    if (hits.length > 0) {
        document.getElementById('hud').style.opacity = '1';
        const h = hits[0];
        const data = h.object.parent?.userData?.name ? h.object.parent.userData : { name: "Domestic Quarter", lore: "Dense mud-brick housing providing shade and community for the city's craftsmen." };
        document.getElementById('b-name').innerText = data.name;
        document.getElementById('b-lore').innerText = data.lore;
    }
});

init();
