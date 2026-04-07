import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// --- DATA ---
const DEG = Math.PI / 180;
const planetData = [
    { name: 'Mercury', distance: 60,  size: 2.2,  speed: 0.02,  inclination: 7.00 * DEG, texture: '/mercury.png' },
    { name: 'Venus',   distance: 95,  size: 3.6,  speed: 0.015, inclination: 3.39 * DEG, texture: '/venus.png'   },
    { name: 'Earth',   distance: 135, size: 4.0,  speed: 0.012, inclination: 0.00 * DEG, texture: '/earth.png', moons: [
        { name: 'Moon', distance: 8, size: 1.0, speed: 0.04, texture: '/moon.png', isSyncFocus: true }
    ]},
    { name: 'Mars',    distance: 175, size: 3.2,  speed: 0.010, inclination: 1.85 * DEG, texture: '/mars.png', moons: [
        { name: 'Phobos', distance: 5,   size: 0.5, speed: 0.08, texture: '/moon.png' },
        { name: 'Deimos', distance: 7.5, size: 0.4, speed: 0.06, texture: '/moon.png' }
    ]},
    { name: 'Jupiter', distance: 280, size: 14.5, speed: 0.006, inclination: 1.30 * DEG, texture: '/jupiter.png', moons: [
        { name: 'Io',       distance: 20, size: 1.2, speed: 0.05, texture: '/moon.png' },
        { name: 'Europa',   distance: 25, size: 1.1, speed: 0.04, texture: '/moon.png' },
        { name: 'Ganymede', distance: 30, size: 1.5, speed: 0.03, texture: '/moon.png' },
        { name: 'Callisto', distance: 36, size: 1.4, speed: 0.02, texture: '/moon.png' }
    ]},
    { name: 'Saturn',  distance: 380, size: 12.0, speed: 0.004, inclination: 2.49 * DEG, texture: '/saturn.png', hasRings: true, moons: [
        { name: 'Titan', distance: 25, size: 2.0, speed: 0.03, texture: '/moon.png' }
    ]},
    { name: 'Uranus',  distance: 480, size: 7.5,  speed: 0.003, inclination: 0.77 * DEG, texture: '/uranus.png', moons: [
        { name: 'Titania', distance: 15, size: 0.8, speed: 0.05, texture: '/moon.png' }
    ]},
    { name: 'Neptune', distance: 560, size: 7.2,  speed: 0.002, inclination: 1.77 * DEG, texture: '/neptune.png', moons: [
        { name: 'Triton', distance: 15, size: 1.0, speed: 0.04, texture: '/moon.png' }
    ]},
];

// --- ASTRONOMICAL FACTS ---
const celestialFacts = {
    'Sun': {
        type: '⭐ G-Type Star',
        fact: 'Our GIANT star! The Sun is so huge that ONE MILLION Earths could fit inside it! It\'s a giant ball of super-hot gas that\'s been shining for 4.6 billion years — and it\'ll keep going for another 5 billion!',
        gravity: '274 m/s² (28x Earth!)',
        day: '27 Earth Days',
        year: '230 Million Years',
        temp: '5,500°C surface',
        details: 'Radius: 696,340 km • 99.8% of all solar system mass',
        wow: '☀️ Sunlight takes 8 minutes to reach Earth — if the Sun vanished, we wouldn\'t know for 8 whole minutes!'
    },
    'Mercury': {
        type: '🪨 Terrestrial Planet',
        fact: 'The speed champion! Mercury zips around the Sun in just 88 days — but a single day takes 59 Earth days! It\'s only a little bigger than our Moon and has no atmosphere to hold heat.',
        gravity: '3.7 m/s² (you\'d weigh 62% less!)',
        day: '59 Earth Days',
        year: '88 Earth Days',
        temp: '-180°C night / 430°C day',
        details: '0 Moons • Radius: 2,439 km',
        wow: '🌡️ Wild temperature swings! Nights freeze colder than Antarctica, days scorch hotter than an oven — all with no atmosphere!'
    },
    'Venus': {
        type: '🔥 Terrestrial Planet',
        fact: 'The scorching rebel! Venus is the HOTTEST planet — even hotter than Mercury! It spins BACKWARDS compared to most planets, and a single day here lasts longer than its whole year. It also rains sulfuric acid!',
        gravity: '8.87 m/s² (similar to Earth)',
        day: '243 Earth Days',
        year: '225 Earth Days',
        temp: '464°C (melts lead!)',
        details: '0 Moons • Radius: 6,051 km',
        wow: '🔄 A day on Venus is LONGER than its year! And it spins backwards — the Sun rises in the west and sets in the east!'
    },
    'Earth': {
        type: '🌍 Terrestrial Planet',
        fact: 'Our amazing home! Earth is the only planet with oceans, rainforests, and YOU! It sits perfectly in the "Goldilocks zone" — not too hot, not too cold — just right for life. It\'s the densest planet in the solar system!',
        gravity: '9.81 m/s² (that\'s you, normal!)',
        day: '24 Hours',
        year: '365.25 Days',
        temp: '15°C average',
        details: '1 Major Moon • Radius: 6,371 km',
        wow: '💧 71% of Earth is covered in water — we basically live on a giant water planet spinning through space!'
    },
    'Moon': {
        type: '🌕 Earth\'s Moon',
        fact: 'Earth\'s loyal companion! The Moon always shows us the same face — the far side is hidden forever! It\'s slowly drifting away from Earth at 3.8 cm per year. Its gravity pulls our oceans to create tides!',
        gravity: '1.62 m/s² (you\'d jump 6x higher!)',
        day: '27.3 Earth Days',
        year: '27.3 Earth Days',
        temp: '-183°C night / 127°C day',
        details: 'Radius: 1,737 km • Drifts 3.8 cm/year from Earth',
        wow: '🌊 The Moon controls Earth\'s ocean tides! Imagine the whole ocean being pulled around by the Moon\'s gravity!'
    },
    'Mars': {
        type: '🔴 Terrestrial Planet',
        fact: 'The Rusty Red Planet! Mars is red because it\'s literally covered in rust (iron oxide). It has the tallest volcano in the solar system — Olympus Mons is 3 times taller than Mount Everest! A Martian day is only 37 minutes longer than Earth\'s.',
        gravity: '3.72 m/s² (you\'d weigh 63% less!)',
        day: '24.6 Hours',
        year: '687 Earth Days',
        temp: '-63°C average',
        details: '2 Moons • Radius: 3,389 km',
        wow: '🌋 Olympus Mons volcano is so tall (22km!) it pokes above most of the atmosphere — 3x higher than Mount Everest!'
    },
    'Phobos': {
        type: '🪨 Martian Moon',
        fact: 'The speed demon moon! Phobos orbits Mars so fast it laps the planet 3 times every Martian day. It\'s also doomed — in about 50 million years, gravity will tear it apart into a ring around Mars!',
        gravity: '0.005 m/s² (you\'d float off easily!)',
        day: '8 Hours',
        year: '8 Hours',
        temp: '-40°C',
        details: 'Radius: ~11 km (size of a city!)',
        wow: '💥 Phobos is slowly spiraling toward Mars — in 50 million years it\'ll shatter into a ring like Saturn\'s!'
    },
    'Deimos': {
        type: '🪨 Martian Moon',
        fact: 'The tiny wanderer! Deimos is so small it would fit inside most cities. From Mars, it looks like a star, not a moon. It\'s shaped like a lumpy potato and takes 30 hours to orbit Mars once.',
        gravity: '0.003 m/s² (a gentle push = escape!)',
        day: '30.3 Hours',
        year: '30.3 Hours',
        temp: '-40°C',
        details: 'Radius: ~6.2 km (size of a mountain!)',
        wow: '⭐ From Mars, Deimos looks like a bright star — you\'d need binoculars to tell it\'s actually a moon!'
    },
    'Jupiter': {
        type: '🪐 Gas Giant',
        fact: 'The King of Planets! Jupiter is SO BIG that 1,300 Earths could fit inside it! Its famous Great Red Spot is a STORM bigger than Earth that has been raging for over 350 years! It has 95 moons — a mini solar system!',
        gravity: '24.79 m/s² (you\'d weigh 2.5x more!)',
        day: '9.9 Hours',
        year: '11.8 Earth Years',
        temp: '-108°C cloud tops',
        details: '95 Known Moons • Radius: 69,911 km',
        wow: '⚡ Jupiter\'s storm (Great Red Spot) has been raging for 350+ years and is wider than planet Earth!'
    },
    'Io': {
        type: '🌋 Jovian Moon',
        fact: 'The volcanic pizza moon! Io is the most volcanically active place in the entire solar system — hundreds of volcanoes constantly erupting! Jupiter\'s huge gravity squeezes and stretches Io like a stress ball, generating all that heat.',
        gravity: '1.79 m/s²',
        day: '1.77 Earth Days',
        year: '1.77 Earth Days',
        temp: '-130°C (surface avg)',
        details: 'Radius: 1,821 km',
        wow: '🌋 Jupiter squishes and stretches Io constantly — like squeezing a stress ball — and that friction creates 400+ active volcanoes!'
    },
    'Europa': {
        type: '🧊 Jovian Moon',
        fact: 'The hidden ocean world! Under Europa\'s cracked icy shell lies a massive liquid ocean — possibly twice as much water as ALL of Earth\'s oceans combined! This makes it one of the best candidates for alien life in our solar system!',
        gravity: '1.31 m/s²',
        day: '3.55 Earth Days',
        year: '3.55 Earth Days',
        temp: '-160°C surface',
        details: 'Radius: 1,560 km',
        wow: '🌊 Europa may have MORE liquid water than all of Earth\'s oceans combined — hidden beneath miles of ice!'
    },
    'Ganymede': {
        type: '🌕 Jovian Moon',
        fact: 'The giant among moons! Ganymede is the largest moon in the entire solar system — bigger than the planet Mercury! It\'s the only moon with its own magnetic field, which means it has its own Northern Lights!',
        gravity: '1.42 m/s²',
        day: '7.15 Earth Days',
        year: '7.15 Earth Days',
        temp: '-163°C',
        details: 'Radius: 2,634 km (larger than Mercury!)',
        wow: '🧲 Ganymede is the ONLY moon with its own magnetic field — it creates its very own Northern and Southern Lights!'
    },
    'Callisto': {
        type: '☄️ Jovian Moon',
        fact: 'The ancient solar system fossil! Callisto\'s surface hasn\'t changed in billions of years — it\'s covered in so many craters it can\'t fit any more! Scientists call it the most "beat up" world in the solar system.',
        gravity: '1.23 m/s²',
        day: '16.7 Earth Days',
        year: '16.7 Earth Days',
        temp: '-139°C',
        details: 'Radius: 2,410 km',
        wow: '☄️ Callisto is so covered in craters there\'s almost no room for new ones — it\'s a 4 billion-year-old record of asteroid hits!'
    },
    'Saturn': {
        type: '💍 Gas Giant',
        fact: 'The Ringed Superstar! Saturn\'s rings stretch 282,000 km wide — almost the distance from Earth to the Moon — but they\'re thinner than a 10-story building! Saturn is so light that it could FLOAT in a giant bathtub!',
        gravity: '10.44 m/s² (slightly more than Earth)',
        day: '10.7 Hours',
        year: '29.4 Earth Years',
        temp: '-138°C cloud tops',
        details: '146 Known Moons • Radius: 58,232 km',
        wow: '🛁 Saturn is the only planet that could float in water — it\'s less dense than water! Its rings are 282,000 km wide but only 100m thick!'
    },
    'Titan': {
        type: '🌧️ Saturnian Moon',
        fact: 'Alien Earth! Titan is the only moon with a thick atmosphere and has rivers, lakes, and rain — but instead of water, it\'s all liquid methane! With its thick air, you could actually fly with giant wings like a bird!',
        gravity: '1.35 m/s²',
        day: '15.9 Earth Days',
        year: '15.9 Earth Days',
        temp: '-179°C',
        details: 'Radius: 2,574 km',
        wow: '🦅 Titan\'s thick atmosphere lets humans fly with just wings and a small flap — the gravity and air density make it possible!'
    },
    'Uranus': {
        type: '🔵 Ice Giant',
        fact: 'The sideways planet! A giant collision long ago knocked Uranus completely on its side. Now it spins like a rolling ball around the Sun! Each pole gets 42 years of non-stop sunlight, then 42 years of complete darkness.',
        gravity: '8.69 m/s²',
        day: '17.2 Hours',
        year: '84 Earth Years',
        temp: '-195°C (coldest atmosphere!)',
        details: '28 Known Moons • Radius: 25,362 km',
        wow: '↔️ Uranus spins on its side! Half the planet gets 42 years of straight sunlight, then 42 years of total darkness — no seasons like ours!'
    },
    'Titania': {
        type: '🌑 Uranian Moon',
        fact: 'The canyon world! Titania is Uranus\'s biggest moon and has enormous canyons slicing across its surface — some longer than the entire United States! It has both ancient craters and fresh rocky cliffs.',
        gravity: '0.38 m/s²',
        day: '8.7 Earth Days',
        year: '8.7 Earth Days',
        temp: '-203°C',
        details: 'Radius: 788 km',
        wow: '🏔️ Titania has canyons longer than the entire United States — carved by the moon cracking apart as it cooled down!'
    },
    'Neptune': {
        type: '💨 Ice Giant',
        fact: 'The Wild Wind World! Neptune has the STRONGEST winds in the entire solar system — up to 2,100 km/h! That\'s 5 times faster than Earth\'s worst hurricanes. It\'s so far away that one year here equals 165 Earth years!',
        gravity: '11.15 m/s² (slightly more than Earth)',
        day: '16.1 Hours',
        year: '165 Earth Years',
        temp: '-200°C',
        details: '16 Known Moons • Radius: 24,622 km',
        wow: '💨 Neptune\'s winds hit 2,100 km/h — faster than a fighter jet! Its first full year since discovery was only completed in 2011!'
    },
    'Triton': {
        type: '🔄 Neptunian Moon',
        fact: 'The backwards rebel! Triton is the only large moon that orbits BACKWARDS — opposite to Neptune\'s spin. Scientists think Neptune captured it from the outer solar system long ago. It\'s also slowly spiraling inward and will eventually shatter!',
        gravity: '0.78 m/s²',
        day: '5.8 Earth Days',
        year: '5.8 Earth Days',
        temp: '-235°C (one of the coldest!)',
        details: 'Radius: 1,353 km',
        wow: '🔄 Triton is doomed! It orbits backwards, getting closer to Neptune every year — in 3.6 billion years it will shatter into rings!'
    }
};

const missionMap = {
    'Mercury': 'MESSENGER',
    'Venus': 'Magellan',
    'Moon': 'Apollo 11',
    'Mars': 'Perseverance',
    'Phobos': 'MMX Probe',
    'Deimos': 'MMX Probe',
    'Jupiter': 'Juno',
    'Io': 'Galileo',
    'Europa': 'Europa Clipper',
    'Ganymede': 'JUICE',
    'Callisto': 'JUICE',
    'Saturn': 'Cassini',
    'Titan': 'Huygens Probe',
    'Uranus': 'Voyager 2',
    'Titania': 'Voyager 2',
    'Neptune': 'Voyager 2',
    'Triton': 'Voyager 2'
};

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200000);
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

// Sun glow — sprites always face the camera so they look perfect from any angle
function makeGlowTexture(stops, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    stops.forEach(([t, color]) => g.addColorStop(t, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

// Inner warm corona
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture([
        [0,   'rgba(255, 220, 120, 0.55)'],
        [0.25, 'rgba(255, 160, 40, 0.45)'],
        [0.55, 'rgba(255, 90, 10, 0.22)'],
        [1,   'rgba(200, 40, 0, 0)'],
    ]),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
}));
sunGlow.scale.set(140, 140, 1);
scene.add(sunGlow);

// Outer diffuse halo
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture([
        [0,   'rgba(255, 140, 30, 0.28)'],
        [0.4, 'rgba(255, 70, 0, 0.15)'],
        [0.75, 'rgba(200, 40, 0, 0.06)'],
        [1,   'rgba(180, 20, 0, 0)'],
    ]),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
}));
sunHalo.scale.set(240, 240, 1);
scene.add(sunHalo);

// --- MILKY WAY ---
// Galactic coordinate frame (disc tilted ~60° from ecliptic, centre offset from solar system)
const GCENTER = new THREE.Vector3(12000, 6000, -22000);
const GNORMAL = new THREE.Vector3(0.15, 0.72, 0.68).normalize();
const GTANGENT = (() => {
    const t = new THREE.Vector3(1, 0, 0);
    return t.sub(GNORMAL.clone().multiplyScalar(t.dot(GNORMAL))).normalize();
})();
const GBITANGENT = GNORMAL.clone().cross(GTANGENT).normalize();
const GRADIUS = 52000;

// Galaxy disc — baked into a canvas texture (1 quad, no per-frame point cost)
function createGalaxyTexture(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    const cx = size / 2, cy = size / 2, R = size * 0.46;
    const sl = R * 0.28; // exponential scale length

    for (let i = 0; i < 90000; i++) {
        const r = Math.min(-sl * Math.log(Math.max(1 - Math.random(), 1e-6)), R);
        const normR = r / R;
        const armIdx = Math.floor(Math.random() * 4);
        const inArm = Math.random() < 0.35;
        const theta = inArm
            ? (armIdx / 4) * Math.PI * 2 + Math.log(r / (R * 0.015) + 1) * 1.3 + (Math.random() - 0.5) * 0.65
            : Math.random() * Math.PI * 2;
        const sx = Math.round(cx + r * Math.cos(theta));
        const sy = Math.round(cy + r * Math.sin(theta));
        if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
        const idx = (sy * size + sx) * 4;

        let rr, gg, bb;
        if (inArm && normR > 0.12) {
            rr = 100 + Math.random() * 155; gg = 170 + Math.random() * 85; bb = 255;
        } else if (normR < 0.22) {
            rr = 255; gg = 200 + normR * 200; bb = 130 + normR * 300;
        } else {
            const c = 180 + Math.random() * 75;
            rr = c; gg = c * 0.92; bb = c * 0.82;
        }
        d[idx]   = Math.min(255, d[idx]   + rr);
        d[idx+1] = Math.min(255, d[idx+1] + gg);
        d[idx+2] = Math.min(255, d[idx+2] + bb);
        d[idx+3] = Math.min(255, d[idx+3] + 180 + Math.random() * 75);
    }
    ctx.putImageData(imgData, 0, 0);

    // Centre bulge glow (canvas gradient, fast)
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
    glow.addColorStop(0,    'rgba(255, 245, 200, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 200,  90, 0.55)');
    glow.addColorStop(0.6,  'rgba(180,  80,  15, 0.18)');
    glow.addColorStop(1,    'rgba(  0,   0,   0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

// Single textured quad — replaces 180k GPU points with 2 triangles
const galaxyDiscPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRADIUS * 2.2, GRADIUS * 2.2),
    new THREE.MeshBasicMaterial({
        map: createGalaxyTexture(1024),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })
);
galaxyDiscPlane.position.copy(GCENTER);
galaxyDiscPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), GNORMAL);
scene.add(galaxyDiscPlane);

// Galactic centre glow
const galacticCentreSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture([
        [0,    'rgba(255, 245, 210, 1.0)'],
        [0.15, 'rgba(255, 210, 130, 0.85)'],
        [0.35, 'rgba(255, 150, 50,  0.5)'],
        [0.60, 'rgba(180,  70, 15,  0.2)'],
        [1,    'rgba( 80,  15,  0,  0)'],
    ]),
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
}));
galacticCentreSprite.position.copy(GCENTER);
galacticCentreSprite.scale.set(14000, 14000, 1);
scene.add(galacticCentreSprite);

// Soft galaxy-plane haze (unresolved starlight glow)
const hazePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRADIUS * 2.2, GRADIUS * 2.2),
    new THREE.MeshBasicMaterial({
        color: 0x6070cc, transparent: true, opacity: 0.040,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    })
);
hazePlane.position.copy(GCENTER);
hazePlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), GNORMAL);
scene.add(hazePlane);

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
    // Tilt the entire orbit plane around the X axis — planet will rise/fall correctly as it orbits
    const inclinationGroup = new THREE.Group();
    inclinationGroup.rotation.x = data.inclination;
    scene.add(inclinationGroup);

    const orbitPivot = new THREE.Group();
    inclinationGroup.add(orbitPivot);

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
        new THREE.TorusGeometry(data.distance, 0.4, 4, 200),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
    );
    orbitLine.rotation.x = Math.PI / 2;
    inclinationGroup.add(orbitLine);

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
const infoWow = document.getElementById('info-wow');
const launchBtn = document.getElementById('launch-btn');

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
    infoWow.textContent = factData.wow || '';
    infoCard.classList.remove('hidden');

    if (meshEntry.name === 'Earth' || meshEntry.name === 'Sun') {
        launchBtn.classList.add('hidden');
    } else {
        const mName = missionMap[meshEntry.name] || 'Explorer';
        launchBtn.textContent = `🚀 Launch ${mName}`;
        launchBtn.classList.remove('hidden');
    }
}

const activeRockets = [];

function createRocket() {
    const group = new THREE.Group();
    // Body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 2.0, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    group.add(body);
    // Nose
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.3 })
    );
    nose.position.y = 1.4;
    group.add(nose);
    // Exhaust Flame
    const fireMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 1.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    fireMesh.position.y = -1.6;
    fireMesh.rotation.x = Math.PI;
    group.add(fireMesh);
    
    group.fireMesh = fireMesh;
    return group;
}

launchBtn.addEventListener('click', () => {
    if (!focusTarget || focusTarget.name === 'Earth' || focusTarget.name === 'Sun') return;
    const earthEntry = allClickable.find(c => c.name === 'Earth');
    if (!earthEntry) return;

    const rocket = createRocket();
    const earthPos = new THREE.Vector3();
    earthEntry.mesh.getWorldPosition(earthPos);
    
    rocket.position.copy(earthPos);
    scene.add(rocket);
    
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    activeRockets.push({
        mesh: rocket,
        target: focusTarget,
        missionName: missionMap[focusTarget.name] || 'Explorer',
        fireMesh: rocket.fireMesh,
        trailGeo: trailGeo,
        trailLine: trailLine,
        points: [earthPos.clone()]
    });
    
    launchBtn.classList.add('hidden');
});

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
let simSpeed = 0.05;
let clock = 0;
let isGalaxyView = false;
let galaxyTransition = null;
const GALAXY_CAM  = new THREE.Vector3(24000, 64000, 32000);
const SOLAR_CAM   = new THREE.Vector3(0, 800, 400);
const SOLAR_LOOK  = new THREE.Vector3(0, 0, 0);

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
    isGalaxyView = false;
    galaxyTransition = null;
    if (galaxyBtn) galaxyBtn.textContent = '🌌 Galaxy View';
    if (focusInfoEl) focusInfoEl.style.opacity = '0.6';
    if (focusInfoEl) focusInfoEl.textContent = '📍 Focused: Solar System';
    if (infoCard) infoCard.classList.add('hidden');
    controls.target.set(0, 0, 0);
    camera.position.set(0, 800, 400);
});

const galaxyBtn = document.getElementById('galaxy-view-btn');
galaxyBtn.addEventListener('click', () => {
    isGalaxyView = !isGalaxyView;
    galaxyBtn.textContent = isGalaxyView ? '🪐 Solar System' : '🌌 Galaxy View';
    if (isGalaxyView) {
        galaxyTransition = { cam: GALAXY_CAM.clone(), tgt: GCENTER.clone() };
        lockedTarget = null;
        isFocusing = false;
        if (infoCard) infoCard.classList.add('hidden');
        if (focusInfoEl) { focusInfoEl.textContent = '🌌 Milky Way Galaxy'; focusInfoEl.style.opacity = '1'; }
    } else {
        galaxyTransition = { cam: SOLAR_CAM.clone(), tgt: SOLAR_LOOK.clone() };
        if (focusInfoEl) { focusInfoEl.textContent = '📍 Focused: Solar System'; focusInfoEl.style.opacity = '0.6'; }
    }
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

    // --- ROCKET UPDATES ---
    for (let i = activeRockets.length - 1; i >= 0; i--) {
        const r = activeRockets[i];
        const targetPos = new THREE.Vector3();
        r.target.mesh.getWorldPosition(targetPos);
        
        const distToTarget = r.mesh.position.distanceTo(targetPos);
        const moveDist = 1.0 + (simSpeed * 1.5); 
        
        if (distToTarget <= (r.target.size + 1.5)) {
            // Arrived
            scene.remove(r.mesh);
            scene.remove(r.trailLine);
            activeRockets.splice(i, 1);
            
            // Success Label
            const successDiv = document.createElement('div');
            successDiv.className = 'planet-label planet-label--large';
            successDiv.textContent = `✅ ${r.missionName} Arrived!`;
            successDiv.style.color = '#10b981';
            successDiv.style.borderColor = '#10b981';
            const successLabel = new CSS2DObject(successDiv);
            successLabel.position.set(0, r.target.size + 4, 0);
            r.target.mesh.add(successLabel);
            
            setTimeout(() => {
                if(r.target.mesh) r.target.mesh.remove(successLabel);
            }, 5000);
            
            // Restore launch button if still focused
            if (focusTarget === r.target) launchBtn.classList.remove('hidden');
        } else {
            const dir = targetPos.clone().sub(r.mesh.position).normalize();
            
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
            r.mesh.quaternion.slerp(quaternion, 0.15);
            
            r.mesh.position.add(dir.multiplyScalar(moveDist));
            
            // Trail
            r.points.push(r.mesh.position.clone());
            if (r.points.length > 200) r.points.shift();
            r.trailGeo.setFromPoints(r.points);
            
            // Flickering fire
            r.fireMesh.scale.set(1, 0.7 + Math.random() * 0.6, 1);
        }
    }

    // Galaxy view smooth camera transition
    if (galaxyTransition) {
        camera.position.lerp(galaxyTransition.cam, 0.025);
        controls.target.lerp(galaxyTransition.tgt, 0.025);
        if (camera.position.distanceTo(galaxyTransition.cam) < 300) {
            camera.position.copy(galaxyTransition.cam);
            controls.target.copy(galaxyTransition.tgt);
            galaxyTransition = null;
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
