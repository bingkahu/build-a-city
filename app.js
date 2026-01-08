import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let cityMesh, detailMesh, peopleMesh;
let buildingData = [];
let peopleData = [];

// --- AUDIO ENGINE ---
function initMusic() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 4);
    masterGain.connect(audioCtx.destination);

    // Deep Drone (D-tone)
    [73.42, 110.00, 146.83].forEach(freq => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 200;

        g.gain.value = 0.05;
        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start();
    });
}

window.launch = () => {
    initMusic();
    document.getElementById('boot-screen').style.opacity = '0';
    setTimeout(() => document.getElementById('boot-screen').style.display = 'none', 1000);
    animate();
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1814);
    scene.fog = new THREE.FogExp2(0x1a1814, 0.002);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(500, 500, 500);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    clock = new THREE.Clock();

    // Lights
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.5);
    sun.position.set(1, 2, 1);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404050, 0.8));

    // House of Wisdom (Centre)
    const howBase = new THREE.Mesh(new THREE.CylinderGeometry(50, 55, 40, 8), new THREE.MeshStandardMaterial({color: 0x9c8263}));
    const howDome = new THREE.Mesh(new THREE.SphereGeometry(48, 32, 16, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color: 0x1a4538, metalness: 0.5}));
    howDome.position.y = 20;
    const how = new THREE.Group();
    how.add(howBase, howDome);
    how.userData = { name: "The House of Wisdom", sector: "Imperial Quarter", lore: "The grandest centre of learning in the medieval world." };
    scene.add(how);

    // City Generation
    const grid = new Set();
    const count = 4000;
    cityMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x8b7355}), count);
    detailMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.7, 1, 4), new THREE.MeshStandardMaterial({color: 0x4a3728}), count);
    scene.add(cityMesh, detailMesh);

    let idx = 0;
    for (let i = 0; i < 10000 && idx < count; i++) {
        const r = 130 + Math.random() * 600;
        const a = Math.random() * Math.PI * 2;
        const x = Math.round(Math.cos(a) * r / 20) * 20;
        const z = Math.round(Math.sin(a) * r / 20) * 20;

        if (grid.has(`${x},${z}`)) continue;
        grid.add(`${x},${z}`);

        const h = 10 + Math.random() * 25;
        const w = 8 + Math.random() * 4;
        buildingData.push({ x, z, h, w, currY: 1000 + Math.random() * 500, targetY: h/2 });
        idx++;
    }

    // People
    const pCount = 2000;
    peopleMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), new THREE.MeshBasicMaterial({color: 0xffffff}), pCount);
    scene.add(peopleMesh);
    for (let i = 0; i < pCount; i++) {
        peopleData.push({ r: 140 + Math.random() * 550, a: Math.random() * Math.PI * 2, s: 0.001 + Math.random() * 0.002 });
    }

    document.getElementById('launch-btn').style.visibility = 'visible';
    document.getElementById('loading-msg').innerText = "Ready for Departure";
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    buildingData.forEach((b, i) => {
        b.currY = THREE.MathUtils.lerp(b.currY, b.targetY, 0.05);
        dummy.position.set(b.x, b.currY, b.z);
        dummy.scale.set(b.w, b.h, b.w);
        dummy.updateMatrix();
        cityMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.y += b.h/2;
        dummy.scale.set(b.w * 0.9, 1.5, b.w * 0.9);
        dummy.updateMatrix();
        detailMesh.setMatrixAt(i, dummy.matrix);
    });
    cityMesh.instanceMatrix.needsUpdate = true;
    detailMesh.instanceMatrix.needsUpdate = true;

    peopleData.forEach((p, i) => {
        p.a += p.s;
        dummy.position.set(Math.cos(p.a) * p.r, 1, Math.sin(p.a) * p.r);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        peopleMesh.setMatrixAt(i, dummy.matrix);
    });
    peopleMesh.instanceMatrix.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

// Click Detection
window.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(scene.children, true);
    
    if (hits.length > 0) {
        const h = hits[0];
        const hud = document.getElementById('hud');
        hud.style.opacity = '1';
        
        if (h.object.parent?.userData?.name) {
            document.getElementById('b-name').innerText = h.object.parent.userData.name;
            document.getElementById('b-sector').innerText = h.object.parent.userData.sector;
            document.getElementById('b-lore').innerText = h.object.parent.userData.lore;
        } else if (h.instanceId !== undefined) {
            document.getElementById('b-name').innerText = "Private Residence";
            document.getElementById('b-sector').innerText = "Civilian Quarter";
            document.getElementById('b-lore').innerText = "A sturdy dwelling constructed from sun-dried mud bricks, typical of the Abbasid period.";
        }
    }
});

init();
