import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// --- DATA ---
const planetData = [
    { name: 'Mercury', distance: 60, size: 2.2, speed: 0.02, texture: '/mercury.png' },
    { name: 'Venus',   distance: 95, size: 3.6, speed: 0.015, texture: '/venus.png'   },
    { name: 'Earth',   distance: 135, size: 4.0, speed: 0.012, texture: '/earth.png', moons: [
        { name: 'Moon', distance: 8, size: 1.0, speed: 0.04, texture: '/moon.png', isSyncFocus: true }
    ]},
    { name: 'Mars',    distance: 175, size: 3.2, speed: 0.010, texture: '/mars.png', moons: [
        { name: 'Phobos', distance: 5, size: 0.5, speed: 0.08, texture: '/moon.png' },
        { name: 'Deimos', distance: 7.5, size: 0.4, speed: 0.06, texture: '/moon.png' }
    ]},
    { name: 'Jupiter', distance: 280, size: 14.5, speed: 0.006, texture: '/jupiter.png', moons: [
        { name: 'Io', distance: 20, size: 1.2, speed: 0.05, texture: '/moon.png' },
        { name: 'Europa', distance: 25, size: 1.1, speed: 0.04, texture: '/moon.png' },
        { name: 'Ganymede', distance: 30, size: 1.5, speed: 0.03, texture: '/moon.png' },
        { name: 'Callisto', distance: 36, size: 1.4, speed: 0.02, texture: '/moon.png' }
    ]},
    { name: 'Saturn',  distance: 380, size: 12.0, speed: 0.004, texture: '/saturn.png', hasRings: true, moons: [
        { name: 'Titan', distance: 25, size: 2.0, speed: 0.03, texture: '/moon.png' }
    ]},
    { name: 'Uranus',  distance: 480, size: 7.5, speed: 0.003, texture: '/uranus.png', moons: [
        { name: 'Titania', distance: 15, size: 0.8, speed: 0.05, texture: '/moon.png' }
    ]},
    { name: 'Neptune', distance: 560, size: 7.2, speed: 0.002, texture: '/neptune.png', moons: [
        { name: 'Triton', distance: 15, size: 1.0, speed: 0.04, texture: '/moon.png' }
    ]},
];

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 8000);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

// CSS2D Renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0x333355, 1.5));
const sunLight = new THREE.PointLight(0xfff5e0, 3.0, 0, 0);
scene.add(sunLight);

// --- BACKGROUND ---
const starGeo = new THREE.BufferGeometry();
const starCount = 20000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const r = 2000 + Math.random() * 3000;
    const phi = Math.acos(Math.random() * 2 - 1);
    const theta = Math.random() * Math.PI * 2;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0.8 })));

// --- TEXTURE LOADER ---
const textureLoader = new THREE.TextureLoader();
const sunTex = textureLoader.load('/sun.png');
const moonTex = textureLoader.load('/moon.png');

// --- SUN ---
const sun = new THREE.Mesh(new THREE.SphereGeometry(35, 64, 64), new THREE.MeshBasicMaterial({ map: sunTex }));
scene.add(sun);

// Corona glow — additive blending, no dark silhouette
const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(52, 64, 64),
    new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
);
scene.add(sunGlow);

// Outer soft halo
const sunHalo = new THREE.Mesh(
    new THREE.SphereGeometry(72, 64, 64),
    new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
);
scene.add(sunHalo);

// Sun label
function createLabel(text, isLarge = false) {
    const div = document.createElement('div');
    div.className = 'planet-label' + (isLarge ? ' planet-label--large' : '');
    div.textContent = text;
    return new CSS2DObject(div);
}

const sunLabel = createLabel('☀ Sun', true);
sunLabel.position.set(0, 42, 0);
scene.add(sunLabel);

// --- PLANETS & MOONS ---
const planets = [];
const allClickable = [{ mesh: sun, name: 'Sun', size: 35 }];

planetData.forEach((data) => {
    const orbitPivot = new THREE.Group();
    scene.add(orbitPivot);

    const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 64, 64),
        new THREE.MeshStandardMaterial({ 
            map: textureLoader.load(data.texture),
            roughness: 0.8,
            metalness: 0.0,
        })
    );
    planetMesh.position.x = data.distance;
    planetMesh.userData = { name: data.name, size: data.size };
    orbitPivot.add(planetMesh);
    allClickable.push({ mesh: planetMesh, name: data.name, size: data.size });

    // Planet Label
    const label = createLabel(data.name);
    label.position.set(0, data.size + 3, 0);
    planetMesh.add(label);

    // Orbit Line
    const orbitLine = new THREE.Mesh(
        new THREE.TorusGeometry(data.distance, 0.15, 4, 350),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 })
    );
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);

    // Saturn Rings
    if (data.hasRings) {
        const rings = new THREE.Mesh(
            new THREE.RingGeometry(data.size * 1.5, data.size * 2.5, 64),
            new THREE.MeshStandardMaterial({ color: 0xe5e7eb, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
        );
        rings.rotation.x = Math.PI / 2;
        planetMesh.add(rings);
    }

    // Moons
    const moons = [];
    if (data.moons) {
        data.moons.forEach(m => {
            const moonPivot = new THREE.Group();
            planetMesh.add(moonPivot);

            const mMesh = new THREE.Mesh(
                new THREE.SphereGeometry(m.size, 32, 32),
                new THREE.MeshStandardMaterial({ map: moonTex })
            );
            mMesh.position.x = m.distance + data.size;
            moonPivot.add(mMesh);

            if (m.isSyncFocus) {
                const marker = new THREE.Mesh(
                    new THREE.RingGeometry(0.2, 0.3, 32),
                    new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide })
                );
                marker.position.z = m.size + 0.01;
                mMesh.add(marker);

                const moonLabel = createLabel(m.name);
                moonLabel.position.set(0, m.size + 2, 0);
                mMesh.add(moonLabel);
            }

            moons.push({ mesh: mMesh, pivot: moonPivot, data: m });
        });
    }

    planets.push({ mesh: planetMesh, orbitPivot, data, moons });
});

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
camera.position.set(0, 800, 400);
controls.update();

// --- CLICK-TO-FOCUS ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let focusTarget = null;    // active during fly-in animation
let lockedTarget = null;   // persists to keep tracking the planet
let isFocusing = false;
let focusOrbitDist = 50;
const focusInfoEl = document.getElementById('focus-info');

function focusOn(meshEntry) {
    lockedTarget = meshEntry;
    focusTarget = meshEntry;
    isFocusing = true;
    focusOrbitDist = meshEntry.size * 6 + 20;

    if (focusInfoEl) {
        focusInfoEl.textContent = `📍 Focused: ${meshEntry.name}`;
        focusInfoEl.style.opacity = '1';
    }
}

const pointerDown = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDown.set(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('pointerup', (event) => {
    // Ignore if it was a drag/swipe gesture (moved more than 10 pixels)
    const dist = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    if (dist > 10) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = allClickable.map(c => c.mesh);
    const hits = raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
        const hit = hits[0];
        const entry = allClickable.find(c => c.mesh === hit.object);
        if (entry) focusOn(entry);
    }
});

// --- STATE & UI ---
let isSynchronous = true;
let isPaused = false;
let showLabels = true;
let simSpeed = 0.3;
let clock = 0;

const toggleBtn = document.getElementById('toggle-sync');
const pauseBtn = document.getElementById('pause-anim');
const statusGroup = document.getElementById('status-group');
const statusText = document.getElementById('sync-status-text');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const toggleUiBtn = document.getElementById('toggle-ui-btn');
const uiContainer = document.getElementById('ui-container');

statusGroup.classList.add('status-active');
statusText.innerText = 'Synchronous Rotation: ACTIVE';

toggleUiBtn.addEventListener('click', () => {
    uiContainer.classList.toggle('hidden');
});

speedSlider.addEventListener('input', (e) => {
    simSpeed = parseFloat(e.target.value);
    speedVal.innerText = simSpeed.toFixed(1);
});

toggleBtn.addEventListener('click', () => {
    isSynchronous = !isSynchronous;
    statusGroup.classList.toggle('status-active', isSynchronous);
    statusText.innerText = `Synchronous Rotation: ${isSynchronous ? 'ACTIVE' : 'OFF'}`;
});

const toggleLabelsBtn = document.getElementById('toggle-labels');
toggleLabelsBtn.addEventListener('click', () => {
    showLabels = !showLabels;
    labelRenderer.domElement.style.display = showLabels ? 'block' : 'none';
    toggleLabelsBtn.innerText = showLabels ? 'Hide Labels' : 'Show Labels';
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? 'Resume Simulation' : 'Pause Simulation';
});

document.getElementById('reset-pos').addEventListener('click', () => {
    clock = 0;
    isFocusing = false;
    focusTarget = null;
    lockedTarget = null;
    if (focusInfoEl) focusInfoEl.style.opacity = '0.6';
    if (focusInfoEl) focusInfoEl.textContent = '📍 Focused: Solar System';
    controls.target.set(0, 0, 0);
    camera.position.set(0, 800, 400);
});

// --- ANIMATION ---
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        clock += simSpeed;
        sun.rotation.y += 0.005 * simSpeed;

        planets.forEach(p => {
            p.orbitPivot.rotation.y = clock * p.data.speed;
            p.mesh.rotation.y += 0.01 * simSpeed;

            p.moons.forEach(m => {
                m.pivot.rotation.y = clock * m.data.speed;
                if (m.data.isSyncFocus) {
                    if (isSynchronous) {
                        m.mesh.rotation.y = -Math.PI / 2;
                    } else {
                        m.mesh.rotation.y = -(clock * m.data.speed) - Math.PI / 2;
                    }
                } else {
                    m.mesh.rotation.y += 0.02 * simSpeed;
                }
            });
        });
    }

    // --- CONTINUOUS PLANET TRACKING ---
    if (lockedTarget) {
        const worldPos = new THREE.Vector3();
        lockedTarget.mesh.getWorldPosition(worldPos);

        // Always keep the orbit controls centered on the locked planet
        controls.target.copy(worldPos);

        if (isFocusing) {
            // Fly-in: smoothly move camera to a close orbit position
            // Recalculate desired cam position each frame so it tracks the moving planet
            const camOffset = camera.position.clone().sub(worldPos).normalize().multiplyScalar(focusOrbitDist);
            const desiredCamPos = worldPos.clone().add(camOffset);
            camera.position.lerp(desiredCamPos, 0.08);

            // Stop fly-in when close enough (camera is at orbit distance)
            if (camera.position.distanceTo(worldPos) < focusOrbitDist * 1.1) {
                isFocusing = false;
            }
        }
    }

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
