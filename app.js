import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// 1. ENGINE CONFIGURATION & SETUP
// ==========================================
const CONFIG = {
    cityRadius: 600,
    buildingCount: 4000,
    wallInner: 200,
    wallOuter: 580,
    riverWidth: 60
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.Fog(0x050508, 200, 1200);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
camera.position.set(400, 300, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Keep camera above ground

// ==========================================
// 2. LIGHTING & ATMOSPHERE
// ==========================================
// Main Moon/Sun Light
const mainLight = new THREE.DirectionalLight(0xffeebb, 1.5);
mainLight.position.set(200, 400, 100);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 1500;
mainLight.shadow.camera.left = -700;
mainLight.shadow.camera.right = 700;
mainLight.shadow.camera.top = 700;
mainLight.shadow.camera.bottom = -700;
scene.add(mainLight);

// Ambient fill
scene.add(new THREE.AmbientLight(0x222244, 0.8));

// Stars
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 3000; i++) {
    const r = 1000 + Math.random() * 1000;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 })));

// ==========================================
// 3. PROCEDURAL GEOMETRY SYSTEM
// ==========================================

// Materials
const matSandstone = new THREE.MeshStandardMaterial({ color: 0xc2a67e, roughness: 0.8 });
const matDome = new THREE.MeshStandardMaterial({ color: 0x3d7a5c, roughness: 0.3, metalness: 0.2 }); // Emerald
const matGold = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.1, metalness: 0.9 });
const matWater = new THREE.MeshStandardMaterial({ color: 0x113355, roughness: 0.1, metalness: 0.8 });
const matGlow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa44, emissiveIntensity: 2 });

// --- THE TIGRIS RIVER ---
const riverGeo = new THREE.PlaneGeometry(1600, CONFIG.riverWidth);
const river = new THREE.Mesh(riverGeo, matWater);
river.rotation.x = -Math.PI / 2;
river.position.y = 0.5; // Slightly above ground
scene.add(river);

// --- THE GROUND ---
const ground = new THREE.Mesh(new THREE.CircleGeometry(1000, 64), new THREE.MeshStandardMaterial({ color: 0x110f0a }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- INSTANCED BUILDINGS (The Performance Hack) ---
// We create one geometry, then replicate it thousands of times on the GPU
const baseGeometry = new THREE.CylinderGeometry(1, 1, 1, 6); // Hexagonal bases
baseGeometry.translate(0, 0.5, 0); // Pivot at bottom

// We need an array to store the "Data" for every single building
// ID -> { name, lore, district }
const buildingData = []; 

const meshMain = new THREE.InstancedMesh(baseGeometry, matSandstone, CONFIG.buildingCount);
const meshDomes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 16, 0, Math.PI*2, 0, Math.PI/2), matDome, CONFIG.buildingCount);
const meshSpire = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 2, 8), matGold, CONFIG.buildingCount);

meshMain.receiveShadow = true; meshMain.castShadow = true;
meshDomes.castShadow = true;

scene.add(meshMain);
scene.add(meshDomes);
scene.add(meshSpire);

// --- CITY GENERATION LOGIC ---
const dummy = new THREE.Object3D();
let idx = 0;

for (let i = 0; i < CONFIG.buildingCount; i++) {
    // Polar Coordinates for Round City
    const r = Math.random() * CONFIG.cityRadius;
    const theta = Math.random() * Math.PI * 2;
    
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    // RESTRICTIONS:
    // 1. Don't build in the river
    if (Math.abs(z) < CONFIG.riverWidth / 2 + 10) continue;
    // 2. Don't build on the walls (leave gaps)
    if (Math.abs(r - CONFIG.wallInner) < 10) continue;
    if (Math.abs(r - CONFIG.wallOuter) < 10) continue;

    // SCALING & TYPE
    let h = 5 + Math.random() * 15;
    let w = 2 + Math.random() * 4;
    let hasDome = Math.random() > 0.6;
    let hasSpire = Math.random() > 0.9;

    // Special: Palace District (Center)
    if (r < CONFIG.wallInner) {
        h *= 1.5; w *= 1.5; hasDome = true;
    }

    // POSITIONING
    dummy.position.set(x, 0, z);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    meshMain.setMatrixAt(idx, dummy.matrix);

    // ADD DOME (If applicable)
    if (hasDome) {
        dummy.position.set(x, h, z);
        dummy.scale.set(w, w, w); // Sphere scale
        dummy.updateMatrix();
        meshDomes.setMatrixAt(idx, dummy.matrix);
        // Put dome far away if not used (hacky but fast)
    } else {
        dummy.position.set(0, -999, 0);
        dummy.updateMatrix();
        meshDomes.setMatrixAt(idx, dummy.matrix);
    }

    // ADD SPIRE
    if (hasSpire) {
        dummy.position.set(x, h + (hasDome ? w * 0.8 : 0), z);
        dummy.scale.set(w, w, w);
        dummy.updateMatrix();
        meshSpire.setMatrixAt(idx, dummy.matrix);
    } else {
        dummy.position.set(0, -999, 0);
        meshSpire.setMatrixAt(idx, dummy.matrix);
    }

    // GENERATE LORE (The secret sauce)
    buildingData[idx] = generateLore(r, x, z);
    idx++;
}

// Update meshes
meshMain.instanceMatrix.needsUpdate = true;
meshDomes.instanceMatrix.needsUpdate = true;
meshSpire.instanceMatrix.needsUpdate = true;

// --- WALLS (The Round City Rings) ---
function createWallRing(radius) {
    const wallGeo = new THREE.CylinderGeometry(radius, radius, 12, 128, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8f7856, side: THREE.DoubleSide, roughness: 0.9 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 6;
    scene.add(wall);
}
createWallRing(CONFIG.wallInner);
createWallRing(CONFIG.wallOuter);


// ==========================================
// 4. LORE GENERATOR
// ==========================================
function generateLore(r, x, z) {
    // Determine District
    let district = "Outer Slums";
    if (r < CONFIG.wallInner) district = "The Caliph's Circle";
    else if (z > 0 && x > 0) district = "Karkh Market";
    else if (z > 0 && x < 0) district = "Gate of Kufa";
    else if (z < 0 && x > 0) district = "Gate of Khorasan";
    
    // Name Generators
    const prefixes = ["House", "Library", "Observatory", "Forge", "Garden", "Court", "Sanctuary"];
    const suffixes = ["Wisdom", "Stars", "Silence", "the Euphrates", "Gold", "Tranquility", "Scholars"];
    const people = ["Al-Rashid", "Ziryab", "Ibn Hayyan", "Al-Khwarizmi", "The Caliph"];
    
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const ppl = people[Math.floor(Math.random() * people.length)];

    const name = Math.random() > 0.5 ? `${p} of ${s}` : `${p} of ${ppl}`;
    
    const loreText = [
        "Famous for its collection of translated Greek manuscripts.",
        "Merchants here trade silk from China and spices from India.",
        "Astronomers gather here to calculate the phases of the moon.",
        "A quiet retreat known for its fountain of rose water.",
        "Rumored to hold a secret passage to the Tigris river.",
        "The scent of frankincense is heavy in the air here.",
        "Home to a master calligrapher of the royal court."
    ];

    return {
        name: name,
        type: Math.random() > 0.8 ? "Public Landmark" : "Private Residence",
        district: district,
        lore: loreText[Math.floor(Math.random() * loreText.length)]
    };
}

// ==========================================
// 5. INTERACTION ENGINE
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Raycast against the Main Mesh (the bases)
    const intersection = raycaster.intersectObject(meshMain);

    if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;
        const data = buildingData[instanceId];
        
        if (data) {
            updateHUD(data);
            highlightInstance(instanceId);
        }
    } else {
        document.getElementById('hud').classList.remove('active');
    }
});

// Highlight System (A temporary highlighter mesh)
const highlightMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1), 
    new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
);
scene.add(highlightMesh);
highlightMesh.visible = false;

function highlightInstance(instanceId) {
    // Get the matrix of the clicked building to copy its position
    meshMain.getMatrixAt(instanceId, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    
    highlightMesh.position.copy(dummy.position);
    // Move up slightly so it floats over the building
    highlightMesh.position.y += dummy.scale.y + 5; 
    highlightMesh.scale.set(5, 5, 5); // Marker size
    highlightMesh.visible = false; // Hidden for now, just used for logic if needed
    
    // Play sound? (Optional)
}

function updateHUD(data) {
    const hud = document.getElementById('hud');
    hud.classList.add('active');
    document.getElementById('ui-name').innerText = data.name;
    document.getElementById('ui-type').innerText = data.type;
    document.getElementById('ui-district').innerText = data.district;
    document.getElementById('ui-lore').innerText = data.lore;
}

// Remove loader
setTimeout(() => {
    document.getElementById('loader').style.opacity = 0;
    setTimeout(() => document.getElementById('loader').remove(), 1000);
}, 1500);

// ==========================================
// 6. RENDER LOOP
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Subtle rotation of the sky
    scene.rotation.y += 0.0001;

    renderer.render(scene, camera);
}
animate();
