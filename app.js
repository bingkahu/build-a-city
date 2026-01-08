import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- 1. SETTING THE SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a150f);
scene.fog = new THREE.FogExp2(0x1a150f, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(100, 80, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 2. DESERT LIGHTING ---
const sunLight = new THREE.DirectionalLight(0xffe0b3, 1.5);
sunLight.position.set(50, 100, 50);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x403020, 1.5));

// --- 3. ARCHITECTURE GENERATOR ---
const buildings = [];
const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xd4b483, roughness: 0.8 });
const domeMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, metalness: 0.3, roughness: 0.4 }); // Green tiles
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });

function createMedievalBuilding(x, z, type) {
    const group = new THREE.Group();
    let height = Math.random() * 10 + 5;
    let width = 4 + Math.random() * 3;

    // Main Body
    const bodyGeo = new THREE.BoxGeometry(width, height, width);
    const body = new THREE.Mesh(bodyGeo, sandstoneMat);
    body.position.y = height / 2;
    group.add(body);

    // Add Dome or Roof
    if (type === 'MOSQUE' || Math.random() > 0.7) {
        const domeGeo = new THREE.SphereGeometry(width/1.8, 16, 16, 0, Math.PI * 2, 0, Math.PI/2);
        const dome = new THREE.Mesh(domeGeo, type === 'PALACE' ? goldMat : domeMat);
        dome.position.y = height;
        group.add(dome);
    }

    group.position.set(x, 0, z);
    
    // Metadata for Interaction
    const loreStrings = [
        "A center of translation for Greek texts.",
        "Home to a famous silk merchant.",
        "A quiet courtyard with a dry fountain.",
        "The scent of saffron lingers here.",
        "Scholars gather here to discuss algebra."
    ];

    group.userData = {
        name: type === 'PALACE' ? "House of Wisdom" : `Structure ${Math.floor(x+z)}`,
        type: type,
        district: Math.sqrt(x*x + z*z) < 40 ? "Inner Circle" : "Residential Ward",
        lore: loreStrings[Math.floor(Math.random() * loreStrings.length)]
    };

    scene.add(group);
    // Add all children meshes to raycast array
    group.children.forEach(child => {
        child.userData = group.userData;
        buildings.push(child);
    });
}

// --- 4. THE ROUND CITY LAYOUT ---
// Ground
const ground = new THREE.Mesh(new THREE.CircleGeometry(250, 64), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Central Palace
createMedievalBuilding(0, 0, 'PALACE');

// Generate Circular Grid
for (let r = 20; r < 180; r += 15) {
    const count = r / 2.5;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        // Create "streets" by skipping some spots
        if (Math.random() > 0.2) {
            createMedievalBuilding(x, z, 'HOUSE');
        }
    }
}

// --- 5. INTERACTION & RAYCASTING ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buildings);

    if (intersects.length > 0) {
        const data = intersects[0].object.userData;
        const panel = document.getElementById('info-panel');
        panel.style.display = 'block';
        document.getElementById('b-name').innerText = data.name;
        document.getElementById('b-type').innerText = data.type;
        document.getElementById('b-district').innerText = data.district;
        document.getElementById('b-lore').innerText = data.lore;
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
