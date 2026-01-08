import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a12, 0.015); // Atmospheric depth

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 30, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth camera movement

// --- 2. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); 
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(20, 50, 10);
scene.add(sunLight);

// --- 3. WORLD OBJECTS ---
const buildings = [];

// Create Ground
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x151515 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Building Generator
function spawnBuilding(x, z) {
    const h = Math.random() * 15 + 3;
    const w = 2 + Math.random() * 2;
    
    const geo = new THREE.BoxGeometry(w, h, w);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x334466,
        roughness: 0.2,
        metalness: 0.5
    });
    
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, h/2, z);
    
    // Metadata for the UI
    building.userData = {
        name: `Sector ${Math.floor(Math.random()*900 + 100)}`,
        district: x > 0 ? "North Plaza" : "South Industrial",
        height: h
    };

    scene.add(building);
    buildings.push(building);
}

// Generate City Grid
for(let x = -5; x < 5; x++) {
    for(let z = -5; z < 5; z++) {
        if(Math.random() > 0.3) { // Create gaps for "streets"
            spawnBuilding(x * 8, z * 8);
        }
    }
}

// --- 4. INTERACTION LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Hover Effect
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buildings);
    document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
});

// Click Selection
window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buildings);

    if (intersects.length > 0) {
        const selected = intersects[0].object;
        
        // Update UI
        const panel = document.getElementById('info-panel');
        panel.style.display = 'block';
        document.getElementById('b-name').innerText = selected.userData.name;
        document.getElementById('b-district').innerText = selected.userData.district;
        document.getElementById('b-height').innerText = selected.userData.height.toFixed(1);

        // Highlight Building
        buildings.forEach(b => b.material.color.set(0x334466)); // Reset others
        selected.material.color.set(0x00d4ff); // Highlight selected
    }
});

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 5. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
