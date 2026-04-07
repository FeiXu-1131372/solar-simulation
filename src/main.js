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

// --- ASTRONOMICAL FACTS ---
const celestialFacts = {
    'Sun': { type: 'G-Type Star', fact: 'The Sun contains 99.8% of the mass in the entire solar system and is fueled by nuclear fusion.', gravity: '274 m/s²', day: '27 Earth Days', year: '230M Years', temp: '5,500°C', details: 'Radius: 696,340 km' },
    'Mercury': { type: 'Terrestrial Planet', fact: 'The smallest and closest planet to the Sun. Its surface experiences the most extreme temperature fluctuations.', gravity: '3.7 m/s²', day: '59 Earth Days', year: '88 Earth Days', temp: '167°C Avg', details: '0 Moons • Radius: 2,439 km' },
    'Venus': { type: 'Terrestrial Planet', fact: 'The hottest planet in the solar system, shrouded in thick clouds of sulfuric acid.', gravity: '8.87 m/s²', day: '243 Earth Days', year: '225 Earth Days', temp: '464°C', details: '0 Moons • Radius: 6,051 km' },
    'Earth': { type: 'Terrestrial Planet', fact: 'Our home planet, the only known astronomical object to harbor life, with liquid water covering 71% of its surface.', gravity: '9.81 m/s²', day: '24 Hours', year: '365.25 Days', temp: '15°C Avg', details: '1 Major Moon • Radius: 6,371 km' },
    'Moon': { type: 'Earth\'s Moon', fact: 'Exhibits synchronous rotation, meaning Earth only ever sees one face. Responsible for Earth\'s ocean tides.', gravity: '1.62 m/s²', day: '27.3 Earth Days', year: '27.3 Earth Days', temp: '-53°C Avg', details: 'Radius: 1,737 km' },
    'Mars': { type: 'Terrestrial Planet', fact: 'Known as the Red Planet due to iron oxide on its surface. Home to Olympus Mons, the largest volcano in the solar system.', gravity: '3.72 m/s²', day: '24.6 Hours', year: '687 Earth Days', temp: '-63°C Avg', details: '2 Moons • Radius: 3,389 km' },
    'Phobos': { type: 'Martian Moon', fact: 'Orbiting closer to its primary than any other planetary moon, it races around Mars 3 times a day.', gravity: '0.005 m/s²', day: '8 Hours', year: '8 Hours', temp: '-40°C', details: 'Radius: ~11 km' },
    'Deimos': { type: 'Martian Moon', fact: 'The smaller and outermost of Mars\' two irregularly shaped, asteroid-like moons.', gravity: '0.003 m/s²', day: '30.3 Hours', year: '30.3 Hours', temp: '-40°C', details: 'Radius: ~6.2 km' },
    'Jupiter': { type: 'Gas Giant', fact: 'The largest planet, holding more than twice the mass of all other planets combined.', gravity: '24.79 m/s²', day: '9.9 Hours', year: '11.8 Earth Years', temp: '-108°C', details: '95 Known Moons • Radius: 69,911 km' },
    'Io': { type: 'Jovian Moon', fact: 'The most volcanically active body in the solar system, constantly reshaped by tidal heating.', gravity: '1.79 m/s²', day: '1.77 Earth Days', year: '1.77 Earth Days', temp: '-130°C', details: 'Radius: 1,821 km' },
    'Europa': { type: 'Jovian Moon', fact: 'Believed to conceal a vast, deep global ocean of liquid water beneath its cracked icy crust.', gravity: '1.31 m/s²', day: '3.55 Earth Days', year: '3.55 Earth Days', temp: '-160°C', details: 'Radius: 1,560 km' },
    'Ganymede': { type: 'Jovian Moon', fact: 'The largest moon in the solar system, larger than the planet Mercury. Generates its own magnetic field.', gravity: '1.42 m/s²', day: '7.15 Earth Days', year: '7.15 Earth Days', temp: '-163°C', details: 'Radius: 2,634 km' },
    'Callisto': { type: 'Jovian Moon', fact: 'Possesses one of the oldest, most heavily cratered surfaces in the solar system, indicating low geologic activity.', gravity: '1.23 m/s²', day: '16.7 Earth Days', year: '16.7 Earth Days', temp: '-139°C', details: 'Radius: 2,410 km' },
    'Saturn': { type: 'Gas Giant', fact: 'Famous for its extensive and brilliant ring system composed mostly of ice particles.', gravity: '10.44 m/s²', day: '10.7 Hours', year: '29.4 Earth Years', temp: '-138°C', details: '146 Known Moons • Radius: 58,232 km' },
    'Titan': { type: 'Saturnian Moon', fact: 'The only moon known to have a dense atmosphere and liquid methane-ethane lakes on its surface.', gravity: '1.35 m/s²', day: '15.9 Earth Days', year: '15.9 Earth Days', temp: '-179°C', details: 'Radius: 2,574 km' },
    'Uranus': { type: 'Ice Giant', fact: 'An ice giant with an extreme axial tilt, causing it to essentially rotate on its side.', gravity: '8.69 m/s²', day: '17.2 Hours', year: '84 Earth Years', temp: '-195°C', details: '28 Known Moons • Radius: 25,362 km' },
    'Titania': { type: 'Uranian Moon', fact: 'The largest moon of Uranus, featuring a mix of rough, cratered terrain and massive geological canyons.', gravity: '0.38 m/s²', day: '8.7 Earth Days', year: '8.7 Earth Days', temp: '-203°C', details: 'Radius: 788 km' },
    'Neptune': { type: 'Ice Giant', fact: 'The outermost major planet, known for its deep blue hue and supersonic atmospheric winds.', gravity: '11.15 m/s²', day: '16.1 Hours', year: '165 Earth Years', temp: '-200°C', details: '16 Known Moons • Radius: 24,622 km' },
    'Triton': { type: 'Neptunian Moon', fact: 'A captured dwarf planet with a retrograde orbit—it travels the opposite direction of Neptune\'s rotation.', gravity: '0.78 m/s²', day: '5.8 Earth Days', year: '5.8 Earth Days', temp: '-235°C', details: 'Radius: 1,353 km' }
};

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

// Info Card DOM elements
const infoCard = document.getElementById('planet-info-card');
const infoName = document.getElementById('info-name');
const infoType = document.getElementById('info-type');
const infoFact = document.getElementById('info-fact');
const infoGravity = document.getElementById('info-gravity');
const infoDay = document.getElementById('info-day');
const infoYear = document.getElementById('info-year');
const infoTemp = document.getElementById('info-temp');
const infoDetails = document.getElementById('info-details');

function focusOn(meshEntry) {
    lockedTarget = meshEntry;
    focusTarget = meshEntry;
    isFocusing = true;
    focusOrbitDist = meshEntry.size * 6 + 20;

    if (focusInfoEl) {
        focusInfoEl.textContent = `📍 Focused: ${meshEntry.name}`;
        focusInfoEl.style.opacity = '1';
    }

    // Populate and show the info card
    const factData = celestialFacts[meshEntry.name] || { type: 'Celestial Body', fact: 'A fascinating object.', gravity: '--', day: '--', year: '--', temp: '--', details: 'Radius: Unknown' };
    infoName.textContent = meshEntry.name === 'Sun' ? '☀ Sun' : meshEntry.name;
    infoType.textContent = factData.type;
    infoFact.textContent = factData.fact;
    infoGravity.textContent = factData.gravity;
    infoDay.textContent = factData.day;
    infoYear.textContent = factData.year;
    infoTemp.textContent = factData.temp;
    infoDetails.textContent = factData.details;
    infoCard.classList.remove('hidden');
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
    if (infoCard) infoCard.classList.add('hidden');
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
