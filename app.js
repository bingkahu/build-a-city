import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, clock;
let city, people, bData = [], pData = [], audio;

// --- LOAD ACTUAL ANCIENT MUSIC ---
function initAudio() {
    audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'); // Placeholder for Ancient Middle Eastern Track
    audio.loop = true;
    audio.volume = 0.8; 
    audio.play().catch(e => console.log("Audio waiting for user click"));
}

window.launch = () => {
    initAudio();
    document.getElementById('boot').style.opacity = '0';
    setTimeout(() => document.getElementById('boot').remove(), 1000);
    animate();
};

function init() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9c8a9); // BRIGHT DESERT DAY
    scene.fog = new THREE.FogExp2(0xd9c8a9, 0.001);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(500, 450, 500);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- DAYLIGHT LIGHTING ---
    const sun = new THREE.DirectionalLight(0xfffdf2, 2.0);
    sun.position.set(200, 600, 100);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.9));

    // --- THE TIGRIS RIVER ---
    const river = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 160),
        new THREE.MeshStandardMaterial({ color: 0x1a2a30, roughness: 0.1, metalness: 0.5 })
    );
    river.rotation.x = -Math.PI / 2;
    river.position.y = -0.5;
    scene.add(river);

    // --- HOUSE OF WISDOM (CENTRE) ---
    const howBase = new THREE.Mesh(new THREE.CylinderGeometry(40, 45, 40, 8), new THREE.MeshStandardMaterial({color: 0x9c8263}));
    const howDome = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 16, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({color: 0x1a4538}));
    howDome.position.y = 20;
    const how = new THREE.Group();
    how.add(howBase, howDome);
    how.userData = { name: "The House of Wisdom", lore: "The grandest centre of learning in the Abbasid world, where philosophy and science flourished." };
    scene.add(how);

    // --- DENSE CITY (GRID ALIGNED) ---
    const count = 5500;
    city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0x8b7355}), count);
    scene.add(city);

    const dummy = new THREE.Object3D();
    const grid = new Set();
    let idx = 0;

    for (let i = 0; i < 15000 && idx < count; i++) {
        const r = 120 + Math.random() * 700;
        const a = Math.random() * Math.PI * 2;
        const x = Math.round(Math.cos(a) * r / 18) * 18;
        const z = Math.round(Math.sin(a) * r / 18) * 18;

        if (grid.has(`${x},${z}`) || Math.abs(z) < 95) continue;
        grid.add(`${x},${z}`);

        const h = 10 + Math.random() * 25;
        bData.push({ x, z, h, y: 1500 + Math.random() * 500, ty: h/2 });
        idx++;
    }

    // --- HUMANOID PEOPLE (PROPORTIONAL) ---
    const pCount = 1200;
    // Humanoid: head + body merged
    const pGeo = new THREE.CapsuleGeometry(0.25, 1.5, 4, 8);
    people = new THREE.InstancedMesh(pGeo, new THREE.MeshStandardMaterial({color: 0x3d2b1f}), pCount);
    scene.add(people);

    for (let i = 0; i < pCount; i++) {
        pData.push({ 
            r: 135 + Math.random() * 650, 
            a: Math.random() * Math.PI * 2, 
            s: 0.004 + Math.random() * 0.01 
        });
    }

    // Finish Loading
    document.getElementById('status').innerText = "Chronicle Ready";
    document.getElementById('start-btn').style.display = "block";
}

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();

    // City Reconstruction
    bData.forEach((b, i) => {
        if (b.y > b.ty) b.y = THREE.MathUtils.lerp(b.y, b.ty, 0.06);
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(14, b.h, 14);
        dummy.updateMatrix();
        city.setMatrixAt(i, dummy.matrix);
    });
    city.instanceMatrix.needsUpdate = true;

    // Realistic Walking Logic
    pData.forEach((p, i) => {
        p.a += p.s * 0.1;
        const bob = Math.abs(Math.sin(t * 8 + i)) * 0.25;
        dummy.position.set(Math.cos(p.a) * p.r, 0.8 + bob, Math.sin(p.a) * p.r);
        dummy.rotation.z = Math.sin(t * 8 + i) * 0.1;
        dummy.updateMatrix();
        people.setMatrixAt(i, dummy.matrix);
    });
    people.instanceMatrix.needsUpdate = true;

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
        const hud = document.getElementById('hud');
        hud.style.opacity = 1;
        const d = hits[0].object.parent?.userData?.name ? hits[0].object.parent.userData : { name: "Domestic Dwelling", lore: "A multi-storey mud-brick house with thick walls to repel the heat." };
        document.getElementById('b-name').innerText = d.name;
        document.getElementById('b-lore').innerText = d.lore;
    }
});

init();
