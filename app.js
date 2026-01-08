import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(400, 300, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.1;

// --- ATMOSPHERE & SKY ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x202030, 0.5));

// --- RIVER TIGRIS ---
const waterGeometry = new THREE.PlaneGeometry(3000, 140);
const water = new Water(waterGeometry, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/water/waternormals.jpg', (t) => t.wrapS = t.wrapT = THREE.RepeatWrapping),
    sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x001e0f, distortionScale: 4.0
});
water.rotation.x = -Math.PI / 2;
water.position.y = 1;
scene.add(water);

// --- MATERIALS ---
const matClay = new THREE.MeshStandardMaterial({ color: 0xba9b77, roughness: 0.9 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.1 });
const matLapis = new THREE.MeshStandardMaterial({ color: 0x1a2b4c, metalness: 0.4, roughness: 0.2 });
const matGlow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa44, emissiveIntensity: 0 });

// --- THE RECURSIVE LORE ENGINE ---
const ADJ = ["Silent", "Golden", "Hidden", "Emerald", "Azure", "Scented", "Lapis", "Crimson", "Shaded", "Starry"];
const NOUN = ["Atrium", "Vault", "Garden", "Manor", "Forge", "Observatory", "Archive", "Sanctuary", "Plaza", "Hearth"];
const FLAVOR = [
    "holds scrolls of ancient geometry.", "is cooled by Tigris river breezes.", "houses a master calligrapher.",
    "features floors of polished marble.", "retains the scent of burning agarwood.", "was built during the first moon of construction."
];

function generateUniqueLore(x, z) {
    const seed = Math.abs(Math.floor(x * 99 + z * 12));
    const get = (arr) => arr[seed % arr.length];
    const name = `The ${get(ADJ)} ${get(NOUN)}`;
    const lore = `This structure ${get(FLAVOR)} Its walls are reinforced with sun-dried clay and decorated with geometric carvings.`;
    return { name, lore, type: x < 200 ? "Imperial Noble" : "Urban Residence" };
}

// --- CITY GENERATION (NO OVERLAP) ---
const grid = new Set();
const buildings = [];
const meshBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.1, 1, 6), matClay, 6000);
const meshDome = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 16, 0, Math.PI*2, 0, Math.PI/2), matLapis, 6000);
const meshWin = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1, 0.2), matGlow, 12000);

const dummy = new THREE.Object3D();
let idx = 0; let winIdx = 0;

for (let i = 0; i < 6000; i++) {
    const r = 80 + Math.random() * 600;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    // Check Grid Spacing (15-unit radius)
    const gx = Math.round(x/15); const gz = Math.round(z/15);
    if (grid.has(`${gx},${gz}`) || Math.abs(z) < 80) continue;
    grid.add(`${gx},${gz}`);

    const h = 8 + Math.random() * 20;
    const w = 4 + Math.random() * 6;

    dummy.position.set(x, h/2, z);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    meshBody.setMatrixAt(idx, dummy.matrix);

    if (Math.random() > 0.5) {
        dummy.position.set(x, h, z);
        dummy.scale.set(w, w, w);
        dummy.updateMatrix();
        meshDome.setMatrixAt(idx, dummy.matrix);
    } else {
        dummy.position.set(0, -500, 0); dummy.updateMatrix();
        meshDome.setMatrixAt(idx, dummy.matrix);
    }

    // Windows
    dummy.position.set(x + w*0.8, h*0.7, z); dummy.scale.set(1, 1.5, 1); dummy.updateMatrix();
    meshWin.setMatrixAt(winIdx++, dummy.matrix);
    dummy.position.set(x - w*0.8, h*0.7, z); dummy.updateMatrix();
    meshWin.setMatrixAt(winIdx++, dummy.matrix);

    buildings[idx] = generateUniqueLore(x, z);
    idx++;
}
scene.add(meshBody, meshDome, meshWin);

// --- HERO OBJECT: HOUSE OF WISDOM ---
const hero = new THREE.Group();
const hBase = new THREE.Mesh(new THREE.CylinderGeometry(40, 45, 40, 8), matClay);
const hDome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 32, 0, Math.PI*2, 0, Math.PI/2), matGold);
hDome.position.y = 20;
hero.add(hBase, hDome);
hero.position.y = 20;
hero.userData = { name: "Bayt al-Hikmah", type: "Grand Library", lore: "The center of all human knowledge in the 8th century." };
scene.add(hero);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
composer.addPass(bloom);

// --- ANIMATION & DAY CYCLE ---
let timeOffset = 0;
function updateWorld() {
    timeOffset += 0.0002;
    const phi = (timeOffset % 1) * Math.PI * 2;
    sun.setFromSphericalCoords(1, phi, Math.PI / 3);
    
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    sunLight.position.copy(sun).multiplyScalar(1000);
    
    const isNight = sun.y < 0;
    matGlow.emissiveIntensity = isNight ? 2.5 : 0;
    document.getElementById('time-val').innerText = isNight ? "NIGHT" : (sun.y > 0.7 ? "NOON" : "DAY");
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const heroHit = raycaster.intersectObject(hBase);
    const instHit = raycaster.intersectObject(meshBody);

    const hud = document.getElementById('hud');
    if (heroHit.length > 0) {
        setHUD(hero.userData);
    } else if (instHit.length > 0) {
        setHUD(buildings[instHit[0].instanceId]);
    } else {
        hud.classList.remove('active');
    }
});

function setHUD(data) {
    const hud = document.getElementById('hud');
    hud.classList.add('active');
    document.getElementById('ui-name').innerText = data.name;
    document.getElementById('ui-type').innerText = data.type;
    document.getElementById('ui-lore').innerText = data.lore;
}

function animate() {
    requestAnimationFrame(animate);
    updateWorld();
    water.material.uniforms['time'].value += 1.0 / 60.0;
    controls.update();
    composer.render();
}

setTimeout(() => { document.getElementById('loader').style.opacity = 0; setTimeout(()=>document.getElementById('loader').remove(), 1000); }, 2000);
animate();
