import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let cityMesh, peopleMesh, buildingData = [], peopleData = [];

window.launch = () => {
    initMusic();
    document.getElementById('boot-screen').style.opacity = '0';
    setTimeout(() => document.getElementById('boot-screen').style.display = 'none', 1000);
    animate();
};

function initMusic() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.7, audioCtx.currentTime); // Loud volume
    master.connect(audioCtx.destination);

    [55, 110, 164.8, 220].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = f;
        g.gain.value = 0.15;
        osc.connect(g);
        g.connect(master);
        osc.start();
    });
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8dcc0); // Sandy, clear day sky
    scene.fog = new THREE.FogExp2(0xe8dcc0, 0.001);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(450, 450, 450);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4; // High-noon brightness
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    clock = new THREE.Clock();

    // Intense Desert Sun
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(100, 500, 100);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xfff4e0, 1.0));

    // The House of Wisdom (Centre)
    const how = new THREE.Group();
    const howBase = new THREE.Mesh(new THREE.CylinderGeometry(55, 60, 50, 8), new THREE.MeshStandardMaterial({color: 0x9c8263}));
    const howDome = new THREE.Mesh(new THREE.SphereGeometry(55, 32, 16, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color: 0x1a4538, metalness: 0.5}));
    howDome.position.y = 25;
    how.add(howBase, howDome);
    how.userData = { name: "The Grand Library", lore: "The centre of scientific enquiry and translation in the Abbasid world." };
    scene.add(how);

    // City Construction (No Overlaps)
    const count = 4000;
    cityMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x8b7355}), count);
    scene.add(cityMesh);

    const grid = new Set();
    let idx = 0;
    for (let i = 0; i < 9000 && idx < count; i++) {
        const r = 140 + Math.random() * 650;
        const a = (Math.round((Math.random() * Math.PI * 2) / (Math.PI / 4)) * (Math.PI / 4));
        const x = Math.round(Math.cos(a) * r / 25) * 25;
        const z = Math.round(Math.sin(a) * r / 25) * 25;

        if (grid.has(`${x},${z}`)) continue;
        grid.add(`${x},${z}`);

        const h = 15 + Math.random() * 30;
        buildingData.push({ x, z, h, currY: 1000, targetY: h/2 });
        idx++;
    }

    // PEOPLE (REALISTIC FIGURES)
    const pCount = 1800;
    // Humanoid shape: narrow cylinder with a "bobbing" animation
    const pGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.2, 6);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x221100 }); 
    peopleMesh = new THREE.InstancedMesh(pGeo, pMat, pCount);
    scene.add(peopleMesh);

    for (let i = 0; i < pCount; i++) {
        peopleData.push({
            r: 150 + Math.random() * 550,
            a: Math.random() * Math.PI * 2,
            speed: 0.005 + Math.random() * 0.01,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    // City Drop
    buildingData.forEach((b, i) => {
        b.currY = THREE.MathUtils.lerp(b.currY, b.targetY, 0.05);
        dummy.position.set(b.x, b.currY, b.z);
        dummy.scale.set(12, b.h, 12);
        dummy.updateMatrix();
        cityMesh.setMatrixAt(i, dummy.matrix);
    });
    cityMesh.instanceMatrix.needsUpdate = true;

    // Humanoid Crowd Logic
    peopleData.forEach((p, i) => {
        p.a += p.speed * 0.1;
        // The walking "bob" makes them look like they have legs
        const bob = Math.abs(Math.sin(t * 12 + p.bobOffset)) * 0.4;
        
        dummy.position.set(Math.cos(p.a) * p.r, 1.1 + bob, Math.sin(p.a) * p.r);
        dummy.rotation.z = Math.sin(t * 12 + p.bobOffset) * 0.15; // Body sway
        dummy.updateMatrix();
        peopleMesh.setMatrixAt(i, dummy.matrix);
    });
    peopleMesh.instanceMatrix.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

// Click to Inspect
window.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(scene.children, true);
    if (hits.length > 0) {
        const hud = document.getElementById('hud');
        hud.style.opacity = '1';
        const h = hits[0];
        const data = h.object.parent?.userData?.name ? h.object.parent.userData : { name: "Domestic Dwelling", lore: "A residential structure built from local clay, designed to remain cool during the midday heat." };
        document.getElementById('b-name').innerText = data.name;
        document.getElementById('b-lore').innerText = data.lore;
    }
});

init();
