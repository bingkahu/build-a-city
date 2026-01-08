import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- ENGINE CORE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.004);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(200, 150, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping; // Cinematic lighting
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.1; // Prevent looking under the floor

// --- REALISTIC LIGHTING (Moonlight & Lanterns) ---
const moonLight = new THREE.DirectionalLight(0x8899ff, 0.8);
moonLight.position.set(-100, 200, -100);
moonLight.castShadow = true;
scene.add(moonLight);

const ambient = new THREE.AmbientLight(0x101020, 0.5);
scene.add(ambient);

// --- STARFIELD ---
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for(let i=0; i<5000; i++) {
    starPos.push((Math.random()-0.5)*2000, Math.random()*1000, (Math.random()-0.5)*2000);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
scene.add(new THREE.Points(starGeo, starMat));

// --- ASSET MATERIALS ---
const desertMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a150a, 
    roughness: 1, 
    metalness: 0 
});

const buildingMat = new THREE.MeshStandardMaterial({ 
    color: 0x8c7355, 
    roughness: 0.8,
    emissive: 0x442200, // Inner warmth
    emissiveIntensity: 0.1
});

const goldDomeMat = new THREE.MeshStandardMaterial({ 
    color: 0xffaa00, 
    metalness: 0.9, 
    roughness: 0.1,
    emissive: 0xffaa00,
    emissiveIntensity: 0.2
});

const buildings = [];

// --- PROCEDURAL GENERATOR ---
function buildStructure(x, z, sizeMult = 1) {
    const group = new THREE.Group();
    const h = (Math.random() * 15 + 5) * sizeMult;
    const w = (6 + Math.random() * 4) * sizeMult;

    // Body with "Lantern" windows
    const bodyGeo = new THREE.BoxGeometry(w, h, w);
    const body = new THREE.Mesh(bodyGeo, buildingMat);
    body.position.y = h/2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Detail: Domes and Archways
    if (Math.random() > 0.4) {
        const domeGeo = new THREE.SphereGeometry(w/2.2, 24, 24, 0, Math.PI*2, 0, Math.PI/2);
        const dome = new THREE.Mesh(domeGeo, Math.random() > 0.9 ? goldDomeMat : buildingMat);
        dome.position.y = h;
        group.add(dome);
    }

    // Windows (Glowing Points)
    if (Math.random() > 0.5) {
        const winGeo = new THREE.BoxGeometry(w+0.2, 1, 1);
        const winMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa44, emissiveIntensity: 2 });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.y = h * 0.7;
        group.add(win);
    }

    group.position.set(x, 0, z);
    
    // Lore Metadata
    group.userData = {
        name: sizeMult > 1.5 ? "The Grand Vizier's Estate" : "Craftsman's Dwelling",
        type: sizeMult > 1.5 ? "Noble Estate" : "Residential",
        lore: "A structure built of sun-dried mud bricks, standing strong against the desert winds."
    };

    scene.add(group);
    group.children.forEach(c => { c.userData = group.userData; buildings.push(c); });
}

// --- WORLD INITIALIZATION ---
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), desertMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Generate Circular Baghdad
for (let r = 40; r < 450; r += 25) {
    const count = r * 0.5;
    for (let i = 0; i < count; i++) {
        const angle = (i/count) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        // Skip roads
        if (Math.abs(x) > 15 && Math.abs(z) > 15) {
            buildStructure(x, z, r < 100 ? 1.8 : 1);
        }
    }
}

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(buildings);

    if (hits.length > 0) {
        const d = hits[0].object.userData;
        const p = document.getElementById('info-panel');
        p.style.display = 'block';
        document.getElementById('b-name').innerText = d.name;
        document.getElementById('b-type').innerText = d.type;
        document.getElementById('b-lore').innerText = d.lore;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
