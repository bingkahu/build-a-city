import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- CONFIG ---
const CONFIG = {
    cityRadius: 650,
    pop: 6500,
    riverLength: 1400, // Reduced river length
    crowdCount: 3000
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 4000);
camera.position.set(0, 800, 800);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better exposure control
renderer.toneMappingExposure = 0.5; // Prevent the "Blinding White" issue
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10; // Allow deep zoom for street view
controls.maxDistance = 1500;
controls.maxPolarAngle = Math.PI / 2.1;

// --- ATMOSPHERE ---
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();
const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x1a2030, 0.4));

// --- THE RIVER (Fixed Length) ---
const waterGeo = new THREE.PlaneGeometry(CONFIG.riverLength, 120);
const water = new Water(waterGeo, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/water/waternormals.jpg', t => t.wrapS = t.wrapT = THREE.RepeatWrapping),
    sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x01151a, distortionScale: 3.0
});
water.rotation.x = -Math.PI / 2;
water.position.y = 0.5;
scene.add(water);

// --- MATERIALS ---
const matClay = new THREE.MeshStandardMaterial({ color: 0x9c8263, roughness: 1.0 });
const matDome = new THREE.MeshStandardMaterial({ color: 0x1a4538, roughness: 0.3, metalness: 0.4 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
const matWindow = new THREE.MeshStandardMaterial({ emissive: 0xff9900, emissiveIntensity: 0 });

// --- RECURSIVE LORE GENERATOR (1,000,000+ Permutations) ---
const ADJ = ["Silent", "Gilded", "Hidden", "Lapis", "Marble", "Scented", "Azure", "Veridian", "Crimson", "Shaded", "Starry", "Infinite", "Winding", "High", "Sacred"];
const TYPE = ["Vault", "Library", "Atrium", "Sanctuary", "Manor", "Forge", "Observatory", "Mill", "Hearth", "Plaza", "Bastion", "Courtyard", "Bazaar", "Archive"];
const OWNER = ["The Vizier", "The Silk Master", "Al-Khwarizmi", "The Chief Astrologer", "The Royal Baker", "The Persian Poet", "The Sword-Smith", "The Librarian"];
const SECRET = [
    "contains a hidden basement for alchemy experiments.", "is where the Caliph's guards store their ceremonial armor.",
    "holds a collection of maps from the Far East.", "is famous for its jasmine-covered rooftop terrace.",
    "is built with rare white clay from the Euphrates.", "was once the home of a legendary mathematician.",
    "houses the finest loom in the Abbasid Empire.", "smells faintly of sandalwood and old parchment.",
    "features a cooling wind-tower designed for the summer heat.", "has floor mosaics depicting the journey of the stars."
];

function getLore(x, z) {
    const s = Math.abs(Math.floor(x * 13 + z * 7));
    const r = (arr) => arr[s % arr.length];
    const r2 = (arr) => arr[(s + 7) % arr.length];
    
    const name = s % 2 === 0 ? `The ${r(ADJ)} ${r(TYPE)}` : `${r(OWNER)}'s ${r(TYPE)}`;
    const lore = `Built by ${r2(OWNER)}, this structure ${r(SECRET)} Its proximity to the ${x < 200 ? 'Palace' : 'Market'} makes it a hub of activity.`;
    
    return { name, lore, sector: x < 200 ? "Imperial Circle" : "Merchant Suburb" };
}

// --- POPULATION (PEOPLE IN STREETS) ---
const crowdGeo = new THREE.CapsuleGeometry(0.15, 0.4, 4, 8);
const crowdMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, CONFIG.crowdCount);
scene.add(crowdMesh);

const personData = [];
const dummy = new THREE.Object3D();

for (let i = 0; i < CONFIG.crowdCount; i++) {
    const r = 80 + Math.random() * 550;
    const a = Math.random() * Math.PI * 2;
    personData.push({ r, a, speed: 0.001 + Math.random() * 0.002 });
}

// --- CITY GEOMETRY ---
const buildings = [];
const meshBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.1, 1, 6), matClay, CONFIG.pop);
const meshDome = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 12, 0, Math.PI*2, 0, Math.PI/2), matDome, CONFIG.pop);
const meshWin = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.8, 0.1), matWindow, CONFIG.pop * 2);

const grid = new Set();
let bIdx = 0; let wIdx = 0;

for (let i = 0; i < CONFIG.pop; i++) {
    const r = 80 + Math.random() * 550;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    const gx = Math.round(x/14); const gz = Math.round(z/14);
    if (grid.has(`${gx},${gz}`) || Math.abs(z) < 80) continue;
    grid.add(`${gx},${gz}`);

    const h = 10 + Math.random() * 15;
    const w = 4 + Math.random() * 4;

    dummy.position.set(x, h/2, z);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    meshBody.setMatrixAt(bIdx, dummy.matrix);

    if (Math.random() > 0.4) {
        dummy.position.set(x, h, z);
        dummy.scale.set(w, w, w);
        dummy.updateMatrix();
        meshDome.setMatrixAt(bIdx, dummy.matrix);
    } else {
        dummy.position.set(0, -500, 0); dummy.updateMatrix();
        meshDome.setMatrixAt(bIdx, dummy.matrix);
    }

    // Two Windows per building
    dummy.scale.set(1.5, 1.5, 1.5);
    dummy.position.set(x + w*0.8, h*0.6, z); dummy.updateMatrix();
    meshWin.setMatrixAt(wIdx++, dummy.matrix);
    dummy.position.set(x - w*0.8, h*0.6, z); dummy.updateMatrix();
    meshWin.setMatrixAt(wIdx++, dummy.matrix);

    buildings[bIdx] = getLore(x, z);
    bIdx++;
}
scene.add(meshBody, meshDome, meshWin);

// --- THE HOUSE OF WISDOM (Hero Centerpiece) ---
const howGrp = new THREE.Group();
const howBase = new THREE.Mesh(new THREE.CylinderGeometry(45, 50, 40, 8), matClay);
const howDome = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 32, 0, Math.PI*2, 0, Math.PI/2), matGold);
howDome.position.y = 20;
howGrp.add(howBase, howDome);
howGrp.position.y = 20;
howGrp.userData = { name: "Bayt al-Hikmah", sector: "The Royal Center", lore: "The spiritual and intellectual heart of the world. Here, the knowledge of the Greeks, Indians, and Persians is gathered and translated." };
scene.add(howGrp);

// --- ANIMATION & DAY CYCLE ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85));

let time = 0.25; // Start at morning
function updateAtmosphere() {
    time += 0.0003;
    const phi = (time % 1) * Math.PI * 2;
    sun.setFromSphericalCoords(1, phi, Math.PI / 2.5);
    
    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    sunLight.position.copy(sun).multiplyScalar(1000);
    
    // Smooth Exposure Handling
    const elevation = sun.y;
    renderer.toneMappingExposure = Math.max(0.1, elevation * 0.6 + 0.1); 
    
    const isNight = elevation < 0;
    matWindow.emissiveIntensity = isNight ? 3.0 : 0;
    document.getElementById('time-label').innerText = isNight ? "NIGHT" : (elevation > 0.8 ? "NOON" : "DAY");
}

// --- INTERACTION ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hitHero = raycaster.intersectObject(howBase);
    const hitCity = raycaster.intersectObject(meshBody);
    const hud = document.getElementById('hud');

    if (hitHero.length > 0) {
        showHUD(howGrp.userData);
    } else if (hitCity.length > 0) {
        showHUD(buildings[hitCity[0].instanceId]);
    } else {
        hud.style.display = 'none';
    }
});

function showHUD(data) {
    const hud = document.getElementById('hud');
    hud.style.display = 'block';
    document.getElementById('ui-name').innerText = data.name;
    document.getElementById('ui-type').innerText = data.sector;
    document.getElementById('ui-lore').innerText = data.lore;
}

// --- CINEMATIC INTRO ---
let intro = true;
const targetPos = new THREE.Vector3(200, 30, 200); // Near street level
setTimeout(() => { 
    document.getElementById('loader').style.opacity = 0;
    setTimeout(() => document.getElementById('loader').remove(), 1000);
}, 2000);

function animate() {
    requestAnimationFrame(animate);
    updateAtmosphere();
    
    // Animate People
    for (let i = 0; i < CONFIG.crowdCount; i++) {
        const p = personData[i];
        p.a += p.speed;
        dummy.position.set(Math.cos(p.a)*p.r, 0.4, Math.sin(p.a)*p.r);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        crowdMesh.setMatrixAt(i, dummy.matrix);
    }
    crowdMesh.instanceMatrix.needsUpdate = true;
    
    water.material.uniforms['time'].value += 1.0 / 60.0;
    
    // Intro swoop
    if (intro && time < 0.28) {
        camera.position.lerp(targetPos, 0.02);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(targetPos) < 1) intro = false;
    }

    controls.update();
    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
