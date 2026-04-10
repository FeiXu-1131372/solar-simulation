import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { registerLocale, setLang, getLang, t, tf, tm, applyLocaleToDOM, onLangChange } from './i18n/index.js';
import enData from './i18n/en.js';
import zhData from './i18n/zh.js';
import taData from './i18n/ta.js';
import siData from './i18n/si.js';

registerLocale('en', enData);
registerLocale('zh', zhData);
registerLocale('ta', taData);
registerLocale('si', siData);

// --- DATA ---
const DEG = Math.PI / 180;

// Real-world data for scale calculations (NASA Planetary Fact Sheet)
const REAL_DATA = {
    Sun:     { radius_km: 696340,  distance_km: 0 },
    Mercury: { radius_km: 2440,    distance_km: 57900000 },
    Venus:   { radius_km: 6052,    distance_km: 108200000 },
    Earth:   { radius_km: 6371,    distance_km: 149600000 },
    Mars:    { radius_km: 3390,    distance_km: 227900000 },
    Jupiter: { radius_km: 69911,   distance_km: 778600000 },
    Saturn:  { radius_km: 58232,   distance_km: 1433500000 },
    Uranus:  { radius_km: 25362,   distance_km: 2872500000 },
    Neptune: { radius_km: 24622,   distance_km: 4495100000 },
};

const SIZE_K = 8.0;
const DIST_K = 8.0;

function buildLogScale() {
    const result = {};
    for (const [name, data] of Object.entries(REAL_DATA)) {
        result[name] = {
            size: SIZE_K * Math.log10(data.radius_km),
            distance: data.distance_km > 0 ? DIST_K * Math.log10(data.distance_km) : 0,
        };
    }
    return result;
}

function buildRealisticScale() {
    const earthRadius = REAL_DATA.Earth.radius_km;
    const earthDist = REAL_DATA.Earth.distance_km;
    const sizeRef = 4.0;   // Earth size = 4.0
    const distRef = 135;   // Earth distance = 135
    const result = {};
    for (const [name, data] of Object.entries(REAL_DATA)) {
        result[name] = {
            size: sizeRef * (data.radius_km / earthRadius),
            distance: data.distance_km > 0 ? distRef * (data.distance_km / earthDist) : 0,
        };
    }
    return result;
}

const SCALE_MODES = {
    compressed: {
        Sun:     { size: 35,   distance: 0 },
        Mercury: { size: 1.5,  distance: 55 },
        Venus:   { size: 3.8,  distance: 98 },
        Earth:   { size: 4.0,  distance: 135 },
        Mars:    { size: 2.1,  distance: 195 },
        Jupiter: { size: 14.5, distance: 350 },
        Saturn:  { size: 12.0, distance: 500 },
        Uranus:  { size: 7.5,  distance: 700 },
        Neptune: { size: 7.2,  distance: 900 },
    },
    logarithmic: buildLogScale(),
    realistic: buildRealisticScale(),
};

let currentScaleMode = 'compressed';
let scaleTransition = null; // { active: boolean }

// Kepler equation solver: M = E - e*sin(E) → solve for E given M and e
function solveKepler(M, e, iterations = 10) {
    let E = M;
    for (let i = 0; i < iterations; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
}

// Compute true anomaly and orbital radius from mean anomaly
function getOrbitalPosition(meanAnomaly, eccentricity, semiMajorAxis) {
    const E = solveKepler(meanAnomaly, eccentricity);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const trueAnomaly = Math.atan2(
        Math.sqrt(1 - eccentricity * eccentricity) * sinE,
        cosE - eccentricity
    );
    const radius = semiMajorAxis * (1 - eccentricity * cosE);
    return { angle: trueAnomaly, radius };
}

const planetData = [
    { name: 'Mercury', distance: 55,  size: 1.5,  speed: 0.0498, inclination: 7.00 * DEG,
      eccentricity: 0.2056,
      axialTilt: 0.03 * DEG, spinRate: 0.017,
      texture: '/textures/mercury/diffuse_4k.jpg', bumpMap: '/textures/mercury/bump_4k.jpg',
      roughness: 0.9 },
    { name: 'Venus',   distance: 98,  size: 3.8,  speed: 0.0195, inclination: 3.39 * DEG,
      eccentricity: 0.0068,
      axialTilt: 177.4 * DEG, spinRate: 0.004,
      texture: '/textures/venus/diffuse_4k.jpg',
      roughness: 0.4, hasAtmosphere: true, atmosphereColor: 0xffa500 },
    { name: 'Earth',   distance: 135, size: 4.0,  speed: 0.012, inclination: 0.00 * DEG,
      eccentricity: 0.0167,
      axialTilt: 23.44 * DEG, spinRate: 1.0,
      texture: '/textures/earth/diffuse_4k.jpg', normalMap: '/textures/earth/normal_4k.jpg',
      specularMap: '/textures/earth/specular_4k.jpg', cloudMap: '/textures/earth/clouds_4k.jpg', nightMap: '/textures/earth/nightmap_4k.jpg',
      roughness: 0.5, hasAtmosphere: true, atmosphereColor: 0x4488ff,
      moons: [
        { name: 'Moon', distance: 8, size: 1.0, speed: 0.04,
          texture: '/textures/moon/diffuse_4k.jpg', bumpMap: '/textures/moon/bump_4k.jpg',
          isSyncFocus: true }
    ]},
    { name: 'Mars',    distance: 195, size: 2.1,  speed: 0.00638, inclination: 1.85 * DEG,
      eccentricity: 0.0934,
      axialTilt: 25.19 * DEG, spinRate: 0.975,
      texture: '/textures/mars/diffuse_4k.jpg', bumpMap: '/textures/mars/bump_4k.jpg',
      roughness: 0.7,
      moons: [
        { name: 'Phobos', distance: 3,   size: 0.15, speed: 0.08, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Deimos', distance: 5.5, size: 0.12, speed: 0.02, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Jupiter', distance: 350, size: 14.5, speed: 0.00101, inclination: 1.30 * DEG,
      eccentricity: 0.0484,
      axialTilt: 3.13 * DEG, spinRate: 2.4,
      texture: '/textures/jupiter/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Io',       distance: 20, size: 1.2, speed: 0.05, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Europa',   distance: 25, size: 1.1, speed: 0.025, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Ganymede', distance: 30, size: 1.5, speed: 0.012, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Callisto', distance: 36, size: 1.4, speed: 0.005, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Saturn',  distance: 500, size: 12.0, speed: 0.000407, inclination: 2.49 * DEG,
      eccentricity: 0.0539,
      axialTilt: 26.73 * DEG, spinRate: 2.25,
      texture: '/textures/saturn/diffuse_4k.jpg',
      roughness: 0.5, hasRings: true, ringTexture: '/textures/saturn/ring_4k.png',
      moons: [
        { name: 'Titan', distance: 25, size: 2.0, speed: 0.03, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Uranus',  distance: 700, size: 7.5,  speed: 0.000143, inclination: 0.77 * DEG,
      eccentricity: 0.0473,
      axialTilt: 97.77 * DEG, spinRate: 1.39,
      texture: '/textures/uranus/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Titania', distance: 15, size: 0.8, speed: 0.05, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Neptune', distance: 900, size: 7.2,  speed: 0.0000728, inclination: 1.77 * DEG,
      eccentricity: 0.0086,
      axialTilt: 28.32 * DEG, spinRate: 1.49,
      texture: '/textures/neptune/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Triton', distance: 15, size: 1.0, speed: -0.04, texture: '/textures/moon/diffuse_4k.jpg' }
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
        wow: '☀️ Sunlight takes 8 minutes to reach Earth — if the Sun vanished, we wouldn\'t know for 8 whole minutes!',
        emoji: '☀️',
        ministats: ['Center of Solar System', '4.6 billion years old', '1 million Earths fit inside'],
        statPills: ['🔥 5,500°C surface', '⭐ 15M°C core', '💥 Nuclear fusion', '🌟 4.6B years old', '☀️ 8 min light to Earth'],
        wowStrip: 'Every second, the Sun fuses 600 million tonnes of hydrogen into helium. That energy takes 100,000 years to reach the surface — then just 8 minutes to reach your face!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How does the Sun actually make energy?', a: 'Deep in the Sun\'s core, <strong>nuclear fusion</strong> smashes hydrogen atoms together to create helium — releasing energy via Einstein\'s equation <em>E=mc²</em>. The core reaches 15 million °C. That energy takes 100,000 years to travel from the core to the surface, then just 8 minutes to cross space to Earth.' },
            { cls: 'q-chem', q: '🧪 What is the Sun made of?', a: 'About <strong>73% hydrogen (H)</strong> and <strong>25% helium (He)</strong>, with tiny amounts of oxygen, carbon, and iron. Hydrogen is the simplest element — just 1 proton and 1 electron. The Sun is essentially a perfectly controlled hydrogen-to-helium converter that has been running for <em>4.6 billion years</em>!' },
            { cls: 'q-astro', q: '🔭 How long will the Sun last?', a: 'Another <strong>5 billion years</strong>! Then it swells into a red giant — engulfing Mercury and Venus (and possibly Earth). After that it collapses into a <em>white dwarf</em> — a cooling, Earth-sized cinder that glows for trillions of years.' },
            { cls: 'q-life', q: '🌱 What would happen if the Sun disappeared right now?', a: 'You\'d have <strong>8 minutes of normal life</strong> — that\'s how long light takes to reach Earth. Then total darkness. Temperatures drop to −18°C in a week, −73°C in a year. All photosynthesis stops immediately. Oceans freeze from the top down. Surface life ends within months.' },
        ],
        explore: {
            mission: 'Parker Solar Probe (NASA, 2018–present)',
            discovery: 'Parker got closer to the Sun than any spacecraft ever — just <strong>6.2 million km away</strong>! It discovered "switchbacks" — sudden reversals in the magnetic field that accelerate solar wind particles — solving a 70-year mystery about why the solar corona is hotter than the surface.',
            scale: 'If the Sun were the size of a <strong>front door (2 metres tall)</strong>, Earth would be a 2-cent coin sitting about <strong>215 metres away</strong> — the length of 2 football fields. That\'s how much empty space surrounds us.',
            whatif: '<strong>What if the Sun were replaced by a same-mass black hole?</strong> Earth\'s orbit would be unchanged — gravity is identical! But in 8 minutes total darkness falls. Temperatures plummet below −200°C within a year. All life ends. The black hole itself would be only 3 km across — invisible.',
        },
        game: {
            failReason: 'Parker Solar Probe was vaporized by a solar flare — it got too close and never sent another signal!',
            realFact: 'The real Parker Solar Probe withstood 1,377°C during its closest approach — the most extreme temperature ever survived by a spacecraft.',
            stages: [
                { type: 'timing', icon: '🔥', name: 'Perihelion Flyby', prompt: 'Fire thrusters at EXACTLY perihelion to slingshot past the Sun!' },
                { type: 'choice', icon: '☀️', name: 'Solar Flare Alert', prompt: 'X-class solar flare incoming!', options: ['Rotate heat shield toward Sun', 'Speed up to outrun it', 'Deploy antenna array'], correct: 0 },
                { type: 'tap',    icon: '⚡', name: 'Shield Boost', prompt: 'Power up heat shield — tap 10 times before overheating!', taps: 10 },
                { type: 'timing', icon: '📡', name: 'Data Downlink', prompt: 'Transmit data in the narrow Earth-facing window!' },
                { type: 'choice', icon: '🌀', name: 'Magnetic Switchback', prompt: 'Magnetic field reversal detected!', options: ['Enter safe mode', 'Increase speed', 'Jettison antenna'], correct: 0 },
            ],
            hazards: ['solar_flare', 'radiation_burst', 'plasma_wave'],
            crises: ['Solar flare overloading shields!', 'Thermal coating failing!', 'Data link dropping!', 'Guidance system overheating!'],
        },
    },
    'Mercury': {
        type: '🪨 Terrestrial Planet',
        fact: 'The speed champion! Mercury zips around the Sun in just 88 days — but a single day takes 59 Earth days! It\'s only a little bigger than our Moon and has no atmosphere to hold heat.',
        gravity: '3.7 m/s² (you\'d weigh 62% less!)',
        day: '59 Earth Days',
        year: '88 Earth Days',
        temp: '-180°C night / 430°C day',
        details: '0 Moons • Radius: 2,439 km',
        wow: '🌡️ Wild temperature swings! Nights freeze colder than Antarctica, days scorch hotter than an oven — all with no atmosphere!',
        emoji: '🪨',
        ministats: ['0 moons', '88-day orbit', '1st from Sun'],
        statPills: ['🌡️ −180°C nights', '🔥 430°C days', '⏱️ 59-Earth-day day', '🌑 No atmosphere', '🏃 Fastest orbit'],
        wowStrip: 'A Mercury solar day (sunrise to sunrise) takes 176 Earth days — but a Mercury year is only 88 days! The year ends before a single day-night cycle does!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why are Mercury\'s days and nights so extreme?', a: 'Without an atmosphere, there\'s nothing to hold heat at night or block it during the day. Earth\'s atmosphere acts like a <strong>blanket</strong>. Mercury has no blanket — so the sunny side hits <strong>430°C</strong> and the dark side drops to <strong>−180°C</strong>. That\'s a 610°C swing in one rotation!' },
            { cls: 'q-chem', q: '🧪 Why does Mercury have no atmosphere?', a: 'Two reasons: Mercury\'s <strong>gravity is weak</strong> (37% of Earth\'s) — it can\'t hold gas molecules that move fast enough to escape. Second, the <em>solar wind</em> (charged particles from the Sun) blasts away any gas that builds up. No atmosphere means no weather, no erosion by wind — just bare rock and ancient craters.' },
            { cls: 'q-astro', q: '🔭 Why does Mercury move so fast around the Sun?', a: '<em>Kepler\'s Second Law</em>: objects orbit faster when they\'re closer to what they\'re orbiting. Mercury is the closest planet to the Sun, so it races around at <strong>47 km/s</strong> — 6× faster than Earth! A rocket needs 11 km/s to escape Earth\'s gravity. Mercury laps that naturally just from being close to the Sun.' },
            { cls: 'q-life', q: '🌱 Is there anything surprising hiding on Mercury?', a: 'Yes! Despite being the Sun\'s closest neighbour, there is <strong>water ice</strong> in Mercury\'s polar craters — places permanently in shadow where the Sun never reaches, staying at −200°C forever. NASA\'s MESSENGER spacecraft confirmed this in 2012. Ice, right next to the scorching Sun!' },
        ],
        explore: {
            mission: 'MESSENGER (NASA, 2004–2015)',
            discovery: 'MESSENGER confirmed <strong>water ice in Mercury\'s permanently shadowed polar craters</strong>. It also found Mercury\'s iron core takes up 85% of the planet\'s radius — something huge must have knocked off most of the outer layers billions of years ago!',
            scale: 'Mercury is only slightly bigger than our Moon. If Earth were a basketball, Mercury would be a large marble (3.5 cm). They\'re similar in size — but Mercury is much denser, with a massive iron core.',
            whatif: '<strong>What if you lived on Mercury\'s terminator line?</strong> That\'s the moving boundary between day and night. Mercury rotates so slowly that walking at just 3 km/h westward could keep you in permanent twilight — you\'d be racing the sunrise and winning forever.',
        },
        game: {
            failReason: 'MESSENGER ran out of fuel and crashed into Mercury\'s surface before completing its magnetic field maps!',
            realFact: 'The real MESSENGER mission took 6.5 years and used 6 planetary gravity assists just to slow down enough to orbit Mercury.',
            stages: [
                { type: 'timing', icon: '🚀', name: 'Orbital Insertion', prompt: 'Fire the main engine to brake into Mercury\'s orbit — timing is everything!' },
                { type: 'choice', icon: '🌡️', name: 'Temperature Spike', prompt: 'Sun-facing panel reaching 370°C!', options: ['Rotate spacecraft to shade panel', 'Boost power output', 'Shut down comms'], correct: 0 },
                { type: 'tap',    icon: '🔧', name: 'Thruster Check', prompt: 'Fire attitude thrusters 7 times to stabilize orbit!', taps: 7 },
                { type: 'timing', icon: '📡', name: 'Data Downlink', prompt: 'Earth communication window is closing fast — transmit now!' },
                { type: 'choice', icon: '⛽', name: 'Fuel Warning', prompt: 'Fuel reaching critical low!', options: ['Use gravity assist to save fuel', 'Fire main engine', 'Abort orbit'], correct: 0 },
            ],
            hazards: ['asteroid', 'solar_radiation', 'debris'],
            crises: ['Fuel critically low!', 'Thermal spike on sun-facing panel!', 'Solar panel overheating!', 'Attitude thrusters failing!'],
        },
    },
    'Venus': {
        type: '🔥 Terrestrial Planet',
        fact: 'The scorching rebel! Venus is the HOTTEST planet — even hotter than Mercury! It spins BACKWARDS compared to most planets, and a single day here lasts longer than its whole year. It also rains sulfuric acid!',
        gravity: '8.87 m/s² (similar to Earth)',
        day: '243 Earth Days',
        year: '225 Earth Days',
        temp: '464°C (melts lead!)',
        details: '0 Moons • Radius: 6,051 km',
        wow: '🔄 A day on Venus is LONGER than its year! And it spins backwards — the Sun rises in the west and sets in the east!',
        emoji: '🔥',
        ministats: ['0 moons', '225-day orbit', '2nd from Sun'],
        statPills: ['🌡️ 464°C (melts lead!)', '🔄 Spins backwards', '⏱️ Day longer than year', '💨 96% CO₂ atmosphere', '🌧️ Sulfuric acid rain'],
        wowStrip: 'Because Venus spins backwards, the <strong>Sun rises in the west and sets in the east</strong> there — everything is flipped compared to Earth!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Venus hotter than Mercury even though it\'s farther from the Sun?', a: 'The <strong>greenhouse effect</strong>! Venus has a super-thick atmosphere of CO₂ (carbon dioxide). Sunlight gets in and heats the surface, but the heat can\'t escape — trapped like inside a car on a summer day. This <em>runaway greenhouse effect</em> heats Venus to <strong>464°C</strong> — hot enough to melt lead!' },
            { cls: 'q-chem', q: '🧪 What is Venus\'s atmosphere made of?', a: 'About <strong>96% carbon dioxide (CO₂)</strong> and 3.5% nitrogen — with clouds of <em>sulfuric acid (H₂SO₄)</em>. Yes, it rains acid! The acid evaporates before hitting the ground (too hot). The surface pressure is <strong>92× Earth\'s</strong> — like being 920 metres underwater.' },
            { cls: 'q-astro', q: '🔭 Why does Venus spin backwards and so slowly?', a: 'Scientists think a <strong>giant asteroid collision</strong> billions of years ago knocked Venus\'s spin into reverse. It now rotates "retrograde" — opposite to most planets. It also spins incredibly slowly: one Venus day = <strong>243 Earth days</strong>. Its year (orbit) is only 225 days — so a day is literally longer than a year!' },
            { cls: 'q-life', q: '🌱 Could anything survive on Venus?', a: 'The surface is brutal: 464°C, crushing pressure, acid clouds. But in Venus\'s upper atmosphere (~50 km up), temperatures reach a manageable 60°C. Scientists found hints of <em>phosphine gas (PH₃)</em> there in 2020 — on Earth, phosphine is made by living things. Could microscopic life float in Venus\'s clouds? We don\'t know — it\'s one of science\'s biggest open questions!' },
        ],
        explore: {
            mission: 'Magellan (NASA, 1989–1994)',
            discovery: 'Magellan used <strong>radar to map 98% of Venus\'s surface</strong> through its thick clouds — discovering over 1,600 volcanoes! Some may still be active today. A new ESA mission (EnVision) is planned for the 2030s to find out.',
            scale: 'Venus is almost a <strong>twin of Earth</strong> in size — 95% of Earth\'s diameter. Same size, completely different destiny. One has oceans, rainforests, and life; the other is a hellscape at 464°C. The difference is almost entirely atmospheric chemistry.',
            whatif: '<strong>What if Earth swapped atmospheres with Venus?</strong> Our oceans would boil away in months. The surface would hit 400°C+. The CO₂ would trap heat in a runaway loop. Every building would be crushed by the pressure. That\'s what a runaway greenhouse effect looks like — a warning from our nearest neighbour.',
        },
        game: {
            failReason: 'The probe was crushed by Venus\'s 90× atmospheric pressure before the parachute could fully deploy!',
            realFact: 'Soviet Venera probes survived Venus\'s crushing atmosphere for only 23–127 minutes before being destroyed — that\'s the all-time survival record on Venus.',
            stages: [
                { type: 'timing', icon: '🌩️', name: 'Atmospheric Entry', prompt: 'Hit the entry angle precisely — too steep and you burn, too shallow and you skip off!' },
                { type: 'choice', icon: '☁️', name: 'Acid Cloud', prompt: 'Sulfuric acid cloud detected at 48km altitude!', options: ['Deploy acid-resistant shield', 'Speed through quickly', 'Ascend above the clouds'], correct: 0 },
                { type: 'tap',    icon: '🪂', name: 'Parachute Deploy', prompt: 'Manually trigger parachute — tap 9 times before pressure crushes the system!', taps: 9 },
                { type: 'timing', icon: '📸', name: 'Surface Imaging', prompt: 'Surface visible for only 30 seconds — capture the photo now!' },
                { type: 'choice', icon: '🔥', name: 'Heat Surge', prompt: 'Temperature hitting 465°C — beyond design limits!', options: ['Route power to cooling system', 'Reduce science instruments', 'Boost transmitter'], correct: 0 },
            ],
            hazards: ['acid_cloud', 'pressure_wave', 'lightning'],
            crises: ['Atmospheric pressure crushing hull!', 'Acid corrosion on sensors!', 'Temperature exceeding limits!', 'Comms blackout through clouds!'],
        },
    },
    'Earth': {
        type: '🌍 Terrestrial Planet',
        fact: 'Our amazing home! Earth is the only planet with oceans, rainforests, and YOU! It sits perfectly in the "Goldilocks zone" — not too hot, not too cold — just right for life. It\'s the densest planet in the solar system!',
        gravity: '9.81 m/s² (that\'s you, normal!)',
        day: '24 Hours',
        year: '365.25 Days',
        temp: '15°C average',
        details: '1 Major Moon • Radius: 6,371 km',
        wow: '💧 71% of Earth is covered in water — we basically live on a giant water planet spinning through space!',
        emoji: '🌍',
        ministats: ['1 major moon', '365.25-day orbit', '3rd from Sun'],
        statPills: ['🌊 71% covered in ocean', '🌡️ 15°C average', '💨 78% nitrogen air', '🧲 Protective magnetic field', '🌈 Only known life!'],
        wowStrip: 'Earth is the <strong>densest planet</strong> in the solar system — despite being only the 5th largest. Its iron core makes the whole planet weigh 5.97 × 10²⁴ kg!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Earth the perfect temperature for life?', a: 'Earth sits in the <em>"Goldilocks Zone"</em> — not too close to the Sun, not too far. But distance alone isn\'t enough! Earth\'s atmosphere has just enough CO₂ (0.04%) to act as a gentle warming blanket, keeping average temperature at <strong>15°C</strong>. Mars has too little greenhouse effect (freezing). Venus has too much (scorching). Earth got it just right.' },
            { cls: 'q-chem', q: '🧪 What is Earth\'s atmosphere made of?', a: '<strong>78% nitrogen (N₂)</strong>, 21% oxygen (O₂), 0.9% argon, 0.04% carbon dioxide. The oxygen is almost entirely produced by plants and photosynthetic bacteria — early Earth had almost no oxygen! <em>Life literally changed Earth\'s chemistry</em> over billions of years, creating the air we breathe today.' },
            { cls: 'q-astro', q: '🔭 How does the Moon keep Earth\'s climate stable?', a: 'Without the Moon\'s gravity, Earth\'s axial tilt would wobble chaotically between 0° and 85° over millions of years — causing catastrophic climate swings. The Moon acts as a <strong>gravitational anchor</strong>, keeping our tilt stable at ~23.5°. That stability is one reason life had time to evolve into complex forms.' },
            { cls: 'q-life', q: '🌱 What makes Earth special enough for life?', a: 'A remarkable combination: <strong>liquid water</strong>, stable temperature, a <em>magnetic field</em> blocking radiation, an ozone layer filtering UV, plate tectonics recycling nutrients, and a large Moon for stability. Scientists think conditions like these might be very rare — making Earth one of the most special places in the galaxy.' },
        ],
        explore: {
            mission: 'International Space Station (NASA/ESA/JAXA, 1998–present)',
            discovery: 'Astronauts discovered that <strong>the human body loses 1–2% of bone mass per month</strong> in microgravity — critical data for planning Mars missions. The ISS also watches Earth from 400 km up, tracking climate change, wildfires, and hurricanes in real time.',
            scale: 'Earth\'s circumference is <strong>40,075 km</strong>. At 100 km/h, driving around Earth non-stop would take 17 days. The ISS orbits every 90 minutes — moving at 28,000 km/h. Astronauts see <strong>16 sunrises every day!</strong>',
            whatif: '<strong>What if Earth\'s axis were perfectly upright?</strong> No seasons at all — everywhere gets the same sunlight year-round. The poles would be permanently cold, the equator permanently hot. No summer holidays — but also no brutal winters!',
        },
    },
    'Moon': {
        type: '🌕 Earth\'s Moon',
        fact: 'Earth\'s loyal companion! The Moon always shows us the same face — the far side is hidden forever! It\'s slowly drifting away from Earth at 3.8 cm per year. Its gravity pulls our oceans to create tides!',
        gravity: '1.62 m/s² (you\'d jump 6x higher!)',
        day: '27.3 Earth Days',
        year: '27.3 Earth Days',
        temp: '-183°C night / 127°C day',
        details: 'Radius: 1,737 km • Drifts 3.8 cm/year from Earth',
        wow: '🌊 The Moon controls Earth\'s ocean tides! Imagine the whole ocean being pulled around by the Moon\'s gravity!',
        emoji: '🌕',
        ministats: ['Orbits Earth', '27.3-day orbit', '384,400 km away'],
        statPills: ['🌊 Controls Earth\'s tides', '🌡️ −183°C to 127°C', '↔️ Drifting 3.8 cm/yr', '🚶 6 human landings', '🔄 Same face always'],
        wowStrip: 'Billions of years ago, the Moon was <strong>10× closer to Earth</strong> — tides were 1,000× stronger, and a day on Earth was only 6 hours long! The Moon\'s tidal drag has been slowly braking Earth\'s spin ever since.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does the Moon control Earth\'s ocean tides?', a: 'The Moon\'s gravity pulls on Earth\'s water, creating a bulge on the side closest to the Moon. Surprisingly, there\'s also a bulge on the <em>opposite</em> side — that water is being "left behind" as Earth gets pulled toward the Moon. As Earth rotates, these two bulges sweep around, creating <strong>two high tides per day</strong> at most locations.' },
            { cls: 'q-chem', q: '🧪 What is the Moon made of — and where did it come from?', a: 'The Moon\'s crust is rich in oxygen, silicon, magnesium, and aluminium — similar to Earth\'s mantle. Scientists think a <strong>Mars-sized body called "Theia"</strong> smashed into early Earth 4.5 billion years ago. The blast sent material into orbit, which clumped into the Moon. That\'s why Moon rocks look nearly identical to Earth\'s mantle rocks!' },
            { cls: 'q-astro', q: '🔭 Why do we always see the same side of the Moon?', a: 'This is called <em>synchronous rotation</em> — the Moon takes exactly as long to spin once (27.3 days) as it takes to orbit Earth (27.3 days). This isn\'t a coincidence: <strong>Earth\'s gravity slowed the Moon\'s spin</strong> until they matched, billions of years ago. The same thing happens to most large moons around their planets.' },
            { cls: 'q-life', q: '🌱 Could humans live on the Moon permanently?', a: 'Challenging but possible! No atmosphere (need pressurised habitat), extreme temperature swings, radiation. But there\'s <strong>water ice at the poles</strong>, which can be split into hydrogen (rocket fuel) and oxygen (breathable air). NASA\'s Artemis programme is working on lunar bases — the Moon could be humanity\'s first permanent off-Earth home!' },
        ],
        explore: {
            mission: 'Apollo 11 (NASA, July 1969) — First humans on the Moon',
            discovery: 'Neil Armstrong and Buzz Aldrin spent 2.5 hours on the surface, collecting <strong>21.5 kg of Moon rocks</strong>. Analysis showed the Moon formed from Earth\'s own material after a giant collision. They left laser reflectors we still bounce lasers off today to measure the exact Earth-Moon distance!',
            scale: 'The Moon is <strong>384,400 km away</strong>. All 8 planets in the solar system could fit in the gap between Earth and the Moon with room to spare — the planets lined up total about 380,000 km, just inside the gap!',
            whatif: '<strong>What if Earth had no Moon?</strong> Almost no tides. Earth\'s axis would wobble wildly (0°–85°) over millions of years, causing climate chaos. Days would be shorter (6–8 hours). Without stable climate, complex life might never have evolved. We may owe our very existence to that rocky companion!',
        },
        game: {
            failReason: 'The Eagle lander tipped over on rocky terrain — Armstrong and Aldrin couldn\'t complete the moonwalk!',
            realFact: 'During Apollo 11, Neil Armstrong manually flew the lander over a boulder field with only 30 seconds of fuel remaining — it was nearly a disaster.',
            stages: [
                { type: 'timing', icon: '🚀', name: 'Powered Descent', prompt: 'Throttle the descent engine to hit 50m altitude exactly on schedule!' },
                { type: 'choice', icon: '🌑', name: 'Boulder Field', prompt: 'Landing computer selected a boulder-filled crater!', options: ['Manually fly to safer ground', 'Land anyway', 'Abort and orbit'], correct: 0 },
                { type: 'tap',    icon: '🦅', name: 'Thruster Pulses', prompt: 'Fire manual attitude thrusters 8 times to level the lander!', taps: 8 },
                { type: 'timing', icon: '🛬', name: 'Touchdown', prompt: 'Cut engine at EXACTLY the right altitude — contact light must flash!' },
                { type: 'choice', icon: '⛽', name: 'Fuel Critical', prompt: 'Only 20 seconds of hover fuel remaining!', options: ['Commit to current landing spot now', 'Fly further', 'Return to orbit'], correct: 0 },
            ],
            hazards: ['boulder', 'crater_rim', 'dust_cloud'],
            crises: ['Fuel low for descent!', 'Guidance computer alarm!', 'Altitude sensor error!', 'Landing struts at risk!'],
        },
    },
    'Mars': {
        type: '🔴 Terrestrial Planet',
        fact: 'The Rusty Red Planet! Mars is red because it\'s literally covered in rust (iron oxide). It has the tallest volcano in the solar system — Olympus Mons is 3 times taller than Mount Everest! A Martian day is only 37 minutes longer than Earth\'s.',
        gravity: '3.72 m/s² (you\'d weigh 63% less!)',
        day: '24.6 Hours',
        year: '687 Earth Days',
        temp: '-63°C average',
        details: '2 Moons • Radius: 3,389 km',
        wow: '🌋 Olympus Mons volcano is so tall (22km!) it pokes above most of the atmosphere — 3x higher than Mount Everest!',
        emoji: '🔴',
        ministats: ['2 moons', '687-day orbit', '4th from Sun'],
        statPills: ['🔴 Iron oxide surface (rust!)', '🌡️ −63°C average', '⏱️ 24.6-hr day', '🏔️ 22 km tallest volcano', '💨 Thin CO₂ atmosphere'],
        wowStrip: 'Olympus Mons is so tall (22 km!) that if you stood at its base, <strong>the summit would be below the horizon</strong> — the mountain is wider than the curvature of Mars, so you can\'t see the top from the bottom!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is gravity on Mars so much weaker than Earth?', a: 'Gravity depends on <strong>mass</strong>. Mars has only about 10.7% of Earth\'s mass — much smaller and lighter. Less mass = weaker gravitational pull. On Mars, you\'d weigh about <em>38% of your Earth weight</em>. A 50 kg person feels like only 19 kg — you could jump nearly 3× higher!' },
            { cls: 'q-chem', q: '🧪 Why is Mars red? What\'s iron oxide?', a: 'Mars is covered in <strong>iron oxide (Fe₂O₃)</strong> — the same thing as rust on an old bike! Billions of years ago, Mars had liquid water. Water + iron minerals + oxygen reacted to form rust all over the surface. When Martian winds blow, red dust fills the sky — even making sunsets appear <em>blue</em> (dust scatters light differently).' },
            { cls: 'q-astro', q: '🔭 Why is Olympus Mons 3× taller than Everest?', a: 'On Earth, tectonic plates move — so a volcanic hotspot creates a chain of mountains (like Hawaii). On Mars, <strong>the plates don\'t move</strong>. The same volcanic hotspot kept erupting in the same spot for billions of years, piling lava higher and higher. Result: Olympus Mons at 22 km — 3× taller than Everest, wider than Arizona.' },
            { cls: 'q-life', q: '🌱 Did Mars ever have water — and could life have existed?', a: 'Yes! Mars has dried-up riverbeds, ancient lake basins, and polar ice caps of water and CO₂ ice. About <strong>3–4 billion years ago</strong>, Mars had liquid water on its surface. NASA\'s Perseverance rover is hunting for ancient microbial fossils in old lake sediments right now. Whether life started there — we\'re still searching!' },
        ],
        explore: {
            mission: 'Perseverance Rover (NASA, landed Feb 18, 2021)',
            discovery: 'Perseverance found that Mars had a <strong>long-lasting lake system</strong> in Jezero Crater. It also flew Ingenuity — the <em>first powered aircraft ever flown on another planet</em>! Ingenuity made over 70 flights before retiring in January 2024.',
            scale: 'Mars is about <strong>half the width of Earth</strong>. If Earth were a basketball, Mars would be a tennis ball. But Mars has almost the same <em>land surface area</em> as Earth — because Earth is 71% ocean. Same land area, half the diameter!',
            whatif: '<strong>What if you sneezed on Mars?</strong> The CO₂ air is unbreathable, it\'s freezing, and intense UV radiation would hit you instantly — there\'s no ozone layer. Even stepping outside requires a full spacesuit. Your sneeze cloud would drift far in the thin air, then settle as red dust.',
        },
        game: {
            failReason: 'The parachute deployed too late during "7 minutes of terror" — Perseverance slammed into Jezero Crater at full speed!',
            realFact: 'Mars entry takes exactly 7 minutes — the spacecraft goes from 20,000 km/h to 0 with no real-time communication possible. Every step must be pre-programmed perfectly.',
            stages: [
                { type: 'timing', icon: '🪂', name: 'Parachute Deploy', prompt: 'Deploy supersonic parachute at EXACTLY the right altitude!' },
                { type: 'choice', icon: '🌪️', name: 'Dust Storm', prompt: 'Unexpected regional dust storm below!', options: ['Adjust landing site westward', 'Continue descent as planned', 'Abort to orbit'], correct: 0 },
                { type: 'tap',    icon: '🔥', name: 'Retrorocket Burst', prompt: 'Fire 8 retrorockets simultaneously to slow to hover speed!', taps: 8 },
                { type: 'timing', icon: '🏗️', name: 'Sky Crane Lower', prompt: 'Lower rover on cables — cut them at EXACTLY 0.75m above ground!' },
                { type: 'choice', icon: '🤖', name: 'System Reboot', prompt: 'Computer restarted during landing — manual override needed!', options: ['Confirm landing mode manually', 'Wait for auto-recovery', 'Fire ascent engines'], correct: 0 },
            ],
            hazards: ['dust_devil', 'rock', 'canyon_edge'],
            crises: ['Parachute drag insufficient!', 'Retrorocket fuel low!', 'Guidance system failed!', 'Landing zone terrain too steep!'],
        },
    },
    'Phobos': {
        type: '🪨 Martian Moon',
        fact: 'The speed demon moon! Phobos orbits Mars so fast it laps the planet 3 times every Martian day. It\'s also doomed — in about 50 million years, gravity will tear it apart into a ring around Mars!',
        gravity: '0.005 m/s² (you\'d float off easily!)',
        day: '8 Hours',
        year: '8 Hours',
        temp: '-40°C',
        details: 'Radius: ~11 km (size of a city!)',
        wow: '💥 Phobos is slowly spiraling toward Mars — in 50 million years it\'ll shatter into a ring like Saturn\'s!',
        emoji: '🪨',
        ministats: ['Mars\'s inner moon', '8-hour orbit', 'Doomed in ~50 million years'],
        statPills: ['⏱️ 8-hour orbit', '📏 26×22×18 km', '💥 Spiraling toward Mars', '🕳️ 9 km wide crater', '🏙️ City-sized moon'],
        wowStrip: 'Phobos is so close to Mars that it orbits faster than Mars rotates — from the Martian surface, it <strong>rises in the west and sets in the east</strong>, twice a day! Only Phobos and Deimos do this in our solar system.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Phobos spiraling toward Mars?', a: '<em>Tidal forces</em>! Mars\'s gravity stretches Phobos slightly, creating a bulge. The interaction gradually slows Phobos down, stealing its orbital energy. As it loses energy, it sinks closer. In <strong>~50 million years</strong>, it\'ll get so close that tidal forces rip it apart — creating a ring around Mars!' },
            { cls: 'q-chem', q: '🧪 What is Phobos made of?', a: 'Phobos appears to be made of <em>carbonaceous chondrite</em> — dark, carbon-rich rock similar to certain asteroids. It reflects only <strong>7% of light</strong> (darker than coal!). Its density is so low it might be 25–35% empty space — like a rubble pile barely held together by its own weak gravity.' },
            { cls: 'q-astro', q: '🔭 How big is the giant crater on Phobos?', a: 'The <strong>Stickney crater</strong> is 9 km wide — on a moon only 26 km across! The impact nearly shattered Phobos entirely. Strange grooves radiate across the surface from Stickney — scientists think these are <em>fractures</em> caused by the same massive impact, spreading across Phobos like cracks on a car windshield.' },
            { cls: 'q-life', q: '🌱 Could Phobos be useful as a space base?', a: 'Yes! Scientists have proposed using Phobos as a <strong>staging post for Mars exploration</strong>. Astronauts on Phobos could control Mars rovers in real-time (no signal delay — just 6,000 km away). Its almost-zero gravity makes landing and leaving very easy. It could serve as a fuel depot for Mars missions.' },
        ],
        explore: {
            mission: 'MMX — Martian Moons eXploration (JAXA, launching 2026, arrives 2027)',
            discovery: 'No spacecraft has landed on Phobos yet. MMX will be the first — collecting surface samples and returning them to Earth in 2031. Previous Mars orbiters (MRO, Mars Express) photographed it in detail, revealing its low density and strange groove system.',
            scale: 'Phobos is about <strong>26 km long</strong> — roughly the size of a medium city. If it floated above Paris, it would stretch from one side to the other. Its gravity is so weak you could throw a ball into orbit around it with your arm!',
            whatif: '<strong>What happens when Phobos breaks apart in 50 million years?</strong> Tidal forces shatter it into millions of pieces that spread into a ring around Mars. For hundreds of millions of years, Mars would have spectacular rings — visible from Earth through a telescope — before slowly raining down onto the surface.',
        },
        game: {
            failReason: 'MMX bounced off Phobos\'s surface — its gravity was so weak the lander just floated away into space!',
            realFact: 'Landing on Phobos is extraordinarily hard — its gravity is 1,800× weaker than Earth\'s. Without anchoring, any spacecraft will simply bounce off and drift away.',
            stages: [
                { type: 'timing', icon: '🐌', name: 'Slow Approach', prompt: 'Match Phobos\'s surface speed exactly — approach at under 5 cm/s!' },
                { type: 'choice', icon: '⚓', name: 'Anchor Deploy', prompt: 'Surface contact made — which anchor?', options: ['Fire screw anchor into regolith', 'Fire harpoon', 'Use magnetic clamp'], correct: 0 },
                { type: 'tap',    icon: '🪝', name: 'Grip Surface', prompt: 'Drill anchor into loose rubble — tap 9 times before drifting!', taps: 9 },
                { type: 'timing', icon: '🧪', name: 'Sample Collection', prompt: 'Open sample collector in the exact 2-second landing window!' },
                { type: 'choice', icon: '💨', name: 'Dust Contamination', prompt: 'Loose regolith entering sample container!', options: ['Seal container immediately', 'Blow out with nitrogen', 'Continue collecting'], correct: 0 },
            ],
            hazards: ['loose_debris', 'rock_pile', 'dust_cloud'],
            crises: ['Anchor failed to grip regolith!', 'Drifting away from surface!', 'Sample collector jammed!', 'Thruster overcompensating!'],
        },
    },
    'Deimos': {
        type: '🪨 Martian Moon',
        fact: 'The tiny wanderer! Deimos is so small it would fit inside most cities. From Mars, it looks like a star, not a moon. It\'s shaped like a lumpy potato and takes 30 hours to orbit Mars once.',
        gravity: '0.003 m/s² (a gentle push = escape!)',
        day: '30.3 Hours',
        year: '30.3 Hours',
        temp: '-40°C',
        details: 'Radius: ~6.2 km (size of a mountain!)',
        wow: '⭐ From Mars, Deimos looks like a bright star — you\'d need binoculars to tell it\'s actually a moon!',
        emoji: '🪨',
        ministats: ['Mars\'s outer moon', '30-hour orbit', 'Slowly drifting away'],
        statPills: ['⏱️ 30-hour orbit', '📏 15×12×11 km', '⭐ Looks like a star from Mars', '🥔 Potato-shaped', '🔭 Discovered 1877'],
        wowStrip: 'From Mars\'s surface, Deimos looks almost exactly like a <strong>bright star</strong> — so small it doesn\'t appear as a disc. Ancient Martian astronomers (if they existed) might never have realised it was a moon!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why might Deimos escape from Mars entirely?', a: 'Unlike Phobos (spiraling IN), Deimos is slowly spiraling <strong>outward</strong>. Tidal interactions gradually pump energy into Deimos\'s orbit, pushing it further away — the same process that makes our Moon drift from Earth. Eventually, Deimos could escape Mars\'s gravity entirely and become a tiny asteroid orbiting the Sun.' },
            { cls: 'q-chem', q: '🧪 What is Deimos made of?', a: 'Like Phobos, Deimos appears to be made of dark, <em>carbonaceous</em> material — reflecting only about 7% of sunlight, like a lump of charcoal. Its surface is <strong>smoother than Phobos\'s</strong> — ancient craters have been gradually filled by dust sliding down crater walls over billions of years.' },
            { cls: 'q-astro', q: '🔭 Where did Mars\'s moons come from?', a: 'Two main theories: <strong>(1) captured asteroids</strong> from the asteroid belt, or (2) debris from a giant impact on Mars. Their dark composition matches carbonaceous asteroids, supporting capture. But their near-circular orbits are strange for captured objects — most would end up with wild elliptical orbits. The origin is still debated!' },
            { cls: 'q-life', q: '🌱 What would it be like to visit Deimos?', a: 'Deimos\'s gravity is so weak (0.003 m/s²) that you could <strong>escape it with a running jump</strong> — every step would send you floating. A 70 kg person would weigh just 0.2 kg. You\'d need to anchor yourself with tethers constantly. It would feel more like spacewalking than walking on a world.' },
        ],
        explore: {
            mission: 'MMX — Martian Moons eXploration (JAXA, launching 2026)',
            discovery: 'Deimos has never had a dedicated mission visit it. Mars Reconnaissance Orbiter photographed it in detail in 2009, confirming its smooth surface. MMX will observe Deimos on its way to Phobos. Most of what we know comes from remote observation.',
            scale: 'Deimos is only about <strong>15 km long</strong> — smaller than Manhattan island (21 km). Its escape velocity is just 5.6 m/s — slower than a baseball pitch. Throw hard and you\'re sending the ball into space forever!',
            whatif: '<strong>What if you tried to throw a ball on Deimos?</strong> Escape velocity is only 5.6 metres per second — about as fast as a slow jog. Any throw harder than that sends the ball into space forever. If you jumped too hard, so would you! Every movement must be very, very gentle.',
        },
        game: {
            failReason: 'The spacecraft jumped off Deimos — a single thruster pulse was too strong and the probe escaped into orbit!',
            realFact: 'Deimos\'s escape velocity is only 5.6 m/s — slower than a jogging pace. Any movement too fast and your spacecraft literally escapes the moon.',
            stages: [
                { type: 'timing', icon: '🐢', name: 'Ultra-Slow Approach', prompt: 'Approach at UNDER 3 cm/s — the slightest speed bump and you bounce off!' },
                { type: 'choice', icon: '🔍', name: 'Surface Texture', prompt: 'Surface looks smooth — best anchor method?', options: ['Sticky polymer pad', 'Harpoon anchor', 'Thrusters down'], correct: 0 },
                { type: 'tap',    icon: '🪢', name: 'Tether Deploy', prompt: 'Deploy 6 tethers to secure the craft before it drifts!', taps: 6 },
                { type: 'timing', icon: '🤏', name: 'Sample Grab', prompt: 'Sample arm only reaches for 1 second — activate at EXACTLY the right moment!' },
                { type: 'choice', icon: '🌌', name: 'Micro-Gravity Nav', prompt: 'Accidental thruster fired — craft drifting!', options: ['Fire opposite thruster for 0.1 second', 'Deploy drag net', 'Extend arms for balance'], correct: 0 },
            ],
            hazards: ['loose_rock', 'dust_plume', 'micro_debris'],
            crises: ['Tether snapping!', 'Drifting away from surface!', 'Sample arm jammed!', 'Comms antenna misaligned!'],
        },
    },
    'Jupiter': {
        type: '🪐 Gas Giant',
        fact: 'The King of Planets! Jupiter is SO BIG that 1,300 Earths could fit inside it! Its famous Great Red Spot is a STORM bigger than Earth that has been raging for nearly 200 years! It has over 100 moons — a mini solar system!',
        gravity: '24.79 m/s² (you\'d weigh 2.5x more!)',
        day: '9.9 Hours',
        year: '11.8 Earth Years',
        temp: '-108°C cloud tops',
        details: '100+ Known Moons • Radius: 69,911 km',
        wow: '⚡ Jupiter\'s Great Red Spot storm is wider than planet Earth and has been raging for nearly 200 years!',
        emoji: '🪐',
        ministats: ['100+ known moons', '11.8-year orbit', '5th from Sun'],
        statPills: ['🌍 1,300 Earths fit inside', '⚡ 9.9-hour day', '🌡️ −108°C cloud tops', '🔴 Storm: ~200 years', '💪 2.5× Earth gravity'],
        wowStrip: 'Jupiter spins so fast that its equator <strong>bulges outward</strong> — it\'s noticeably fatter in the middle than at the poles. You can actually see this through a basic telescope!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why has Jupiter\'s Great Red Spot lasted so long?', a: 'On Earth, storms die when they hit land. Jupiter has <strong>no solid surface</strong> — it\'s gas all the way down! Without land to stop it, the storm just keeps spinning. Jupiter\'s internal heat keeps pumping energy in like a never-ending engine. The current Great Red Spot has been observed since the 1830s — <strong>nearly 200 years</strong>. Scientists call it a <em>persistent anticyclone</em> — a self-sustaining high-pressure vortex.' },
            { cls: 'q-chem', q: '🧪 What is Jupiter actually made of?', a: 'About <strong>90% hydrogen (H₂)</strong> and <strong>10% helium (He)</strong> — the same ingredients as the Sun. But deep inside, the pressure is so extreme that hydrogen transforms into a <em>metal</em> — it conducts electricity like copper wire. This "metallic hydrogen" generates Jupiter\'s magnetic field, <strong>20,000× stronger than Earth\'s</strong>.' },
            { cls: 'q-astro', q: '🔭 Why does Jupiter have so many moons?', a: 'Jupiter\'s enormous <strong>gravity acts like a giant vacuum cleaner</strong> in space — capturing passing asteroids and comets into orbit. It has <strong>over 100 confirmed moons</strong>, including Ganymede (bigger than Mercury!), Europa (hidden ocean!), and Io (400+ active volcanoes!). Jupiter is basically a mini solar system all by itself.' },
            { cls: 'q-life', q: '🌱 What would happen if you fell into Jupiter?', a: 'There\'s no ground — you\'d just sink deeper. First, <strong>600 km/h winds</strong> would shred your spacecraft. Then increasing pressure would crush it. Then heat would melt everything. You\'d dissolve into the planet itself. Jupiter is the ultimate gas trap — no solid bottom, just increasingly extreme conditions going deeper.' },
        ],
        explore: {
            mission: 'Juno Spacecraft (NASA, orbiting Jupiter since 2016)',
            discovery: 'Juno discovered that Jupiter\'s coloured bands go <strong>3,000 km deep</strong> — not just surface paint! It also found enormous cyclone storms at each pole arranged in perfect geometric patterns — a hexagon of storms, like a cosmic flower.',
            scale: 'If Earth were a <strong>grape</strong>, Jupiter would be a <strong>basketball</strong>. The Sun would be a <strong>door</strong>. Try holding a grape next to a basketball — that\'s us compared to Jupiter. Now imagine the door across the room being the Sun.',
            whatif: '<strong>What if Jupiter were hollow?</strong> You could fit <em>1,300 planet Earths</em> inside with room to rattle around. The hollow shell would still weigh more than everything else in the solar system combined — except the Sun. Jupiter contains 71% of all planetary mass in our solar system.',
        },
        game: {
            failReason: 'Juno fired its engine too late — the spacecraft overshot Jupiter\'s orbit and was flung into deep space, never to return!',
            realFact: 'Juno\'s orbital insertion required a 35-minute engine burn timed to within seconds. The JPL team could only watch — 48-minute one-way signal delay means no real-time commands.',
            stages: [
                { type: 'timing', icon: '🔥', name: 'Orbital Insertion Burn', prompt: 'Fire main engine for orbital insertion — must start at EXACTLY the right moment!' },
                { type: 'choice', icon: '⚡', name: 'Radiation Spike', prompt: 'Jupiter\'s magnetosphere surge detected!', options: ['Shield electronics & enter safe mode', 'Speed up orbit to escape', 'Deploy antenna'], correct: 0 },
                { type: 'tap',    icon: '🔧', name: 'Thruster Correction', prompt: 'Orbit wobbling from Jupiter\'s gravity — fire 8 correction bursts!', taps: 8 },
                { type: 'timing', icon: '🌀', name: 'Storm Band Navigation', prompt: 'Thread through gap between two massive storm bands!' },
                { type: 'choice', icon: '🧲', name: 'Magnetic Anomaly', prompt: 'Unexpected magnetic field reversal disrupting instruments!', options: ['Switch to backup magnetometer', 'Ignore and continue', 'Emergency shutdown'], correct: 0 },
            ],
            hazards: ['radiation_band', 'storm_swirl', 'asteroid'],
            crises: ['Radiation overloading systems!', 'Solar panel damage detected!', 'Fuel line anomaly!', 'Attitude control failing!'],
        },
    },
    'Io': {
        type: '🌋 Jovian Moon',
        fact: 'The volcanic pizza moon! Io is the most volcanically active place in the entire solar system — hundreds of volcanoes constantly erupting! Jupiter\'s huge gravity squeezes and stretches Io like a stress ball, generating all that heat.',
        gravity: '1.79 m/s²',
        day: '1.77 Earth Days',
        year: '1.77 Earth Days',
        temp: '-130°C (surface avg)',
        details: 'Radius: 1,821 km',
        wow: '🌋 Jupiter squishes and stretches Io constantly — like squeezing a stress ball — and that friction creates 400+ active volcanoes!',
        emoji: '🌋',
        ministats: ['Jovian moon', '1.77-day orbit', 'Most volcanic world'],
        statPills: ['🌋 400+ active volcanoes', '🔥 Lava lakes on surface', '🧀 Yellow-orange surface', '💨 Sulfur dioxide atmosphere', '⚡ Tidal squeeze heating'],
        wowStrip: 'Io is the most volcanically active body in the entire solar system — more eruptions than Earth, all other planets, and all other moons <strong>combined</strong>. Its surface is constantly being repaved with fresh lava.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Io have so many volcanoes?', a: '<em>Tidal heating!</em> Io is caught between Jupiter\'s massive gravity and the pulls of Europa and Ganymede. These forces constantly <strong>squeeze and stretch Io</strong> — like kneading dough. The friction generates enormous heat in Io\'s interior, fuelling hundreds of volcanoes. Io experiences tidal forces 10,000× more intensely than Earth\'s Moon does.' },
            { cls: 'q-chem', q: '🧪 Why is Io yellow and orange?', a: 'Io\'s surface is covered in <strong>sulphur (S)</strong> and <strong>sulphur dioxide (SO₂)</strong> in various colours depending on temperature — yellow, orange, red, and white. When sulphur cools rapidly, it\'s yellow. Hotter sulphur goes orange or red. SO₂ frost appears white. Io is basically a giant sulphur chemistry laboratory constantly stirred by eruptions!' },
            { cls: 'q-astro', q: '🔭 How high do Io\'s volcanic plumes shoot?', a: 'Io\'s largest volcano, Pele, shoots plumes up to <strong>300 km high</strong> — 30× the height of Earth\'s atmosphere! Because Io has low gravity and a thin atmosphere, material travels enormous distances. Voyager 1 discovered these plumes in 1979 — the first active volcanoes ever found beyond Earth. It was a complete scientific surprise.' },
            { cls: 'q-life', q: '🌱 Could anything live on Io?', a: 'Io\'s surface is drenched in Jupiter\'s radiation (equivalent to <strong>3,600 chest X-rays per day</strong>), covered in toxic sulphur compounds, and constantly erupting. One of the most hostile places in the solar system. Some scientists speculate about microbial life deep underground, below the volcanism and radiation — very unlikely, but not completely impossible.' },
        ],
        explore: {
            mission: 'Galileo (NASA, 1995–2003) + Juno extended mission flybys (2023–present)',
            discovery: 'Galileo confirmed Io\'s tidal heating and mapped hundreds of volcanic features. Juno\'s extended mission has now flown within 1,500 km of Io — the closest any spacecraft has been — photographing active lava lakes and erupting plumes in stunning detail.',
            scale: 'Io is almost exactly the <strong>same size as our Moon</strong>. Same size, completely different reality: our Moon is geologically dead and quiet; Io is the most volcanically violent world we know. The difference is entirely due to where they orbit.',
            whatif: '<strong>What if you stood on Io\'s surface (without protection)?</strong> Jupiter would fill 20° of sky — enormous! Radiation equivalent to 3,600 X-rays would hit you immediately. Volcanic gases would be toxic. The ground could literally erupt beneath you. An unprotected person would last less than a minute.',
        },
        game: {
            failReason: 'The probe flew directly into Pele volcano\'s eruption plume — sulfur particles shredded every instrument!',
            realFact: 'Io\'s radiation environment delivers the equivalent of 3,600 chest X-rays per day. The Galileo spacecraft received permanent instrument damage from each Io flyby.',
            stages: [
                { type: 'timing', icon: '🌋', name: 'Eruption Window', prompt: 'Pele volcano erupts every 40 hours — fly through the clear window between eruptions!' },
                { type: 'choice', icon: '☁️', name: 'Sulfur Cloud', prompt: 'Sulfur dioxide plume ahead at 300km altitude!', options: ['Dive under the plume at 280km', 'Fly over at 320km', 'Fly straight through'], correct: 0 },
                { type: 'tap',    icon: '⬆️', name: 'Altitude Boost', prompt: 'Lava lake below heating up — fire thrusters 7 times to gain altitude!', taps: 7 },
                { type: 'timing', icon: '📸', name: 'Science Capture', prompt: 'Active lava lake visible for exactly 3 seconds — capture all instruments NOW!' },
                { type: 'choice', icon: '☢️', name: 'Radiation Surge', prompt: 'Jupiter\'s radiation belt intensifying!', options: ['Roll spacecraft to protect instruments', 'Speed up flyby', 'Deploy radiation blanket'], correct: 0 },
            ],
            hazards: ['volcanic_plume', 'lava_ejection', 'sulfur_cloud'],
            crises: ['Volcanic plume incoming!', 'Hull temperature critical!', 'Sulfur clogging sensors!', 'Radiation saturating instruments!'],
        },
    },
    'Europa': {
        type: '🧊 Jovian Moon',
        fact: 'The hidden ocean world! Under Europa\'s cracked icy shell lies a massive liquid ocean — possibly twice as much water as ALL of Earth\'s oceans combined! This makes it one of the best candidates for alien life in our solar system!',
        gravity: '1.31 m/s²',
        day: '3.55 Earth Days',
        year: '3.55 Earth Days',
        temp: '-160°C surface',
        details: 'Radius: 1,560 km',
        wow: '🌊 Europa may have MORE liquid water than all of Earth\'s oceans combined — hidden beneath miles of ice!',
        emoji: '🧊',
        ministats: ['Jovian moon', '3.55-day orbit', 'Hidden ocean beneath ice'],
        statPills: ['🌊 Ocean: 2× all Earth\'s oceans', '❄️ Ice shell 10–30 km thick', '🎯 Top alien life candidate', '⚡ Tidal heating', '🔵 Smoothest world in solar system'],
        wowStrip: 'Europa\'s subsurface ocean may contain <strong>twice as much liquid water as all of Earth\'s oceans combined</strong> — hidden beneath miles of ice. It\'s one of the best places to search for alien life!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How can there be a liquid ocean under miles of ice?', a: '<em>Tidal heating!</em> Like Io, Europa is squeezed by Jupiter\'s gravity and nearby moons. This generates heat in Europa\'s interior — enough to keep a massive ocean <strong>liquid beneath its icy crust</strong>. The ice shell (10–30 km thick) acts as an insulating blanket. The ocean may be ~100 km deep and has been liquid for billions of years.' },
            { cls: 'q-chem', q: '🧪 What is the ocean under Europa\'s ice made of?', a: 'Probably <strong>saltwater</strong> — similar to Earth\'s oceans, with dissolved minerals from the rocky seafloor. Europa\'s surface has reddish-brown streaks that appear to be salt minerals (like magnesium sulphate) brought up from the ocean through cracks in the ice. The ocean chemistry might resemble Earth\'s early oceans — when life first appeared here!' },
            { cls: 'q-astro', q: '🔭 Why is Europa\'s surface so smooth?', a: 'Europa has almost <strong>no impact craters</strong> — its surface is constantly renewed! The ice shell moves and flexes, cracking and refreezing. New ice wells up from below, erasing old craters. At large scales, Europa is the smoothest body in the solar system. Scaled to a bowling ball, it would be smoother than the ball itself.' },
            { cls: 'q-life', q: '🌱 Could alien life exist in Europa\'s ocean?', a: 'This is one of science\'s biggest open questions! Life needs liquid water, energy, and chemistry — Europa has all three. At its seafloor, <em>hydrothermal vents</em> heated by tidal energy could support ecosystems — like on Earth\'s ocean floor where life thrives without sunlight. NASA\'s <strong>Europa Clipper</strong> (launched 2024, arriving 2030) will fly by 50 times to investigate.' },
        ],
        explore: {
            mission: 'Europa Clipper (NASA, launched Oct 2024, arrives Jupiter 2030)',
            discovery: 'Hubble Space Telescope detected what appear to be <strong>water vapour plumes erupting from Europa\'s south pole</strong> — meaning the ocean is venting into space! A spacecraft could fly through these plumes and sample ocean chemistry without even landing on the ice.',
            scale: 'Europa is slightly smaller than our Moon. But its ocean contains <strong>2× as much liquid water as all Earth\'s oceans combined</strong> — because it\'s ~100 km deep. Earth\'s deepest ocean trench (Mariana, 11 km) would fit inside Europa\'s ocean 9 times over.',
            whatif: '<strong>What if Europa\'s ice cracked open?</strong> Ocean water would instantly freeze in space. But just before it did, any life near the crack would be briefly exposed to vacuum. Some Earth microbes survive brief space exposure — if Europa life is similarly tough, it could be the first alien life we ever detected, spraying into space to meet us.',
        },
        game: {
            failReason: 'Europa Clipper flew too close to Jupiter\'s radiation belt — electronics fried before it could sample the ocean plumes!',
            realFact: 'Europa Clipper makes 50 quick flybys rather than orbiting, to limit radiation exposure — extended time near Europa would destroy its instruments.',
            stages: [
                { type: 'timing', icon: '☢️', name: 'Radiation Belt Cross', prompt: 'Cross Jupiter\'s radiation belt at maximum speed — minimize exposure time!' },
                { type: 'choice', icon: '💧', name: 'Plume Sampling', prompt: 'Water vapour plume detected at south pole!', options: ['Fly through for sample collection', 'Observe from safe distance', 'Abort flyby'], correct: 0 },
                { type: 'tap',    icon: '🛡️', name: 'Radiation Shield', prompt: 'Particle burst detected — boost shields 9 times!', taps: 9 },
                { type: 'timing', icon: '📡', name: 'Flyby Data Window', prompt: 'Closest approach lasts 25 seconds — start all instruments NOW!' },
                { type: 'choice', icon: '🧲', name: 'Magnetic Anomaly', prompt: 'Europa\'s magnetic signature stronger than predicted!', options: ['Adjust trajectory for better data', 'Maintain current path', 'Emergency altitude increase'], correct: 0 },
            ],
            hazards: ['ice_shard', 'radiation_belt', 'water_plume'],
            crises: ['Radiation saturating sensors!', 'Ice particle impact!', 'Cryo-fuel pressure dropping!', 'Data storage corruption!'],
        },
    },
    'Ganymede': {
        type: '🌕 Jovian Moon',
        fact: 'The giant among moons! Ganymede is the largest moon in the entire solar system — bigger than the planet Mercury! It\'s the only moon with its own magnetic field, which means it has its own Northern Lights!',
        gravity: '1.42 m/s²',
        day: '7.15 Earth Days',
        year: '7.15 Earth Days',
        temp: '-163°C',
        details: 'Radius: 2,634 km (larger than Mercury!)',
        wow: '🧲 Ganymede is the ONLY moon with its own magnetic field — it creates its very own Northern and Southern Lights!',
        emoji: '🌙',
        ministats: ['Jovian moon', '7.15-day orbit', 'Largest moon in the solar system'],
        statPills: ['🏆 Bigger than Mercury!', '🧲 Own magnetic field', '🌌 Has its own auroras', '🌊 Subsurface ocean', '📏 5,268 km diameter'],
        wowStrip: 'Ganymede is bigger than Mercury and Pluto! If it orbited the Sun instead of Jupiter, it would be classified as a <strong>planet</strong>. It\'s the only moon with its own magnetic field — giving it spectacular auroras!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How does Ganymede have its own magnetic field?', a: 'Ganymede has a <strong>liquid iron core</strong> that generates a magnetic field — just like Earth! This makes it the <em>only moon in the solar system</em> with its own magnetosphere. It carves out a small bubble within Jupiter\'s massive magnetic field, creating its own protected zone — and its own spectacular auroras visible from the Hubble Space Telescope.' },
            { cls: 'q-chem', q: '🧪 What is Ganymede made of?', a: 'About <strong>50% water ice and 50% rocky material</strong> (silicates and iron), arranged in layers like Earth: iron core → rocky mantle → icy outer layer. Scientists also think there\'s a <em>saltwater ocean</em> sandwiched between ice layers deep inside — different ice phases at different pressures, creating an alien geology unlike anywhere else.' },
            { cls: 'q-astro', q: '🔭 Why is Ganymede so much bigger than other moons?', a: 'When Jupiter formed 4.6 billion years ago, it was surrounded by a disk of gas and dust — a mini solar system. Ganymede formed from this disk, accumulating material over millions of years. Because Jupiter was so massive, its gravity gathered enormous amounts of material, letting Ganymede grow into the <strong>largest moon in the entire solar system</strong>.' },
            { cls: 'q-life', q: '🌱 Could life hide in Ganymede\'s hidden ocean?', a: 'Ganymede\'s ocean is sandwiched between <strong>layers of ice</strong> — not in contact with rock. On Earth, life is thought to have started at hydrothermal vents where water meets rock, releasing minerals. If Ganymede\'s ocean doesn\'t touch rock, it might lack those minerals. ESA\'s JUICE mission (arriving 2034) will orbit Ganymede specifically to answer this.' },
        ],
        explore: {
            mission: 'JUICE — JUpiter ICy moons Explorer (ESA, launched 2023, arrives 2031)',
            discovery: 'Hubble confirmed Ganymede\'s auroras in 2015, proving its magnetic field. JUICE will be the <strong>first spacecraft ever to orbit a moon other than our own</strong>! It will map Ganymede\'s magnetic field, subsurface ocean, and surface in unprecedented detail.',
            scale: 'Ganymede\'s diameter is <strong>5,268 km</strong> — larger than Mercury (4,879 km). If it orbited the Sun, it would be a planet. The Voyager team briefly debated reclassifying it before deciding moons are moons!',
            whatif: '<strong>What if Ganymede were a planet?</strong> It would be the 8th planet, orbiting the Sun beyond Mars. Its icy surface would be cold tundra with spectacular auroras at the poles. Large enough for a thin atmosphere. We\'d almost certainly have sent a rover there by now!',
        },
        game: {
            failReason: 'JUICE\'s main antenna failed to deploy in Ganymede\'s magnetic field — the mission went silent forever!',
            realFact: 'JUICE will be the first spacecraft ever to orbit a moon other than Earth\'s Moon. Entering Ganymede\'s orbit requires precise navigation through Jupiter\'s complex multi-moon gravitational field.',
            stages: [
                { type: 'timing', icon: '🎯', name: 'Orbital Capture', prompt: 'Ganymede\'s gravity window is only 4 minutes wide — fire the brake burn NOW!' },
                { type: 'choice', icon: '🧲', name: 'Magnetic Navigation', prompt: 'Ganymede\'s magnetic field deflecting trajectory!', options: ['Compensate with attitude thrusters', 'Follow the field lines', 'Increase speed'], correct: 0 },
                { type: 'tap',    icon: '📡', name: 'Antenna Deploy', prompt: 'Main antenna stuck in magnetic interference — tap 8 times to manually extend it!', taps: 8 },
                { type: 'timing', icon: '🌌', name: 'Aurora Observation', prompt: 'Aurora activity window opens for exactly 6 seconds — start recording!' },
                { type: 'choice', icon: '🌊', name: 'Subsurface Scan', prompt: 'Ice-penetrating radar returning unexpected echoes!', options: ['Adjust frequency to compensate', 'Ignore and continue', 'Switch to backup radar'], correct: 0 },
            ],
            hazards: ['magnetic_storm', 'debris', 'radiation_flux'],
            crises: ['Magnetic interference disrupting comms!', 'Antenna deployment stuck!', 'Power surge in electronics!', 'Orbit decaying unexpectedly!'],
        },
    },
    'Callisto': {
        type: '☄️ Jovian Moon',
        fact: 'The ancient solar system fossil! Callisto\'s surface hasn\'t changed in billions of years — it\'s covered in so many craters it can\'t fit any more! Scientists call it the most "beat up" world in the solar system.',
        gravity: '1.23 m/s²',
        day: '16.7 Earth Days',
        year: '16.7 Earth Days',
        temp: '-139°C',
        details: 'Radius: 2,410 km',
        wow: '☄️ Callisto is so covered in craters there\'s almost no room for new ones — it\'s a 4 billion-year-old record of asteroid hits!',
        emoji: '☄️',
        ministats: ['Jovian moon', '16.7-day orbit', 'Most cratered world'],
        statPills: ['☄️ Surface saturated with craters', '🌑 4-billion-year-old surface', '🥶 No tidal heating', '🌊 Possible subsurface ocean', '📸 Solar system\'s time capsule'],
        wowStrip: 'Callisto\'s surface is so old and so covered in craters that scientists call it "saturated" — there\'s <strong>literally no room for new craters</strong> without overlapping old ones. It\'s a 4-billion-year record of asteroid hits!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Callisto so geologically inactive compared to the other Galilean moons?', a: 'The key is <strong>distance from Jupiter</strong>. Io, Europa, and Ganymede are close enough for significant tidal heating — which drives geological activity. Callisto is much farther out, so tidal heating is minimal. Without internal heat, its geology froze billions of years ago, preserving a perfect fossil record of the solar system\'s most violent early period.' },
            { cls: 'q-chem', q: '🧪 What is Callisto made of?', a: 'Roughly equal parts <strong>rock and water ice</strong>, mixed together — not as well separated into layers as Ganymede. Its dark surface comes from carbon-rich material deposited by comets and asteroids over billions of years. The bright spots in craters are <em>freshly exposed ice</em> that hasn\'t darkened yet — like white chalk showing through old, weathered rock.' },
            { cls: 'q-astro', q: '🔭 What is the "Late Heavy Bombardment"?', a: 'About <strong>3.9 billion years ago</strong>, the solar system went through a chaotic period when giant planets (especially Jupiter) shifted orbits, sending countless asteroids crashing into planets and moons. Callisto\'s crater-saturated surface is one of the best records of this violent era. Earth was also bombarded, but plate tectonics erased all evidence.' },
            { cls: 'q-life', q: '🌱 Could Callisto be a future human outpost?', a: 'Possibly! Callisto might have a <strong>thin subsurface ocean</strong> — kept liquid by radioactive decay rather than tidal heating. It also has a critical advantage: it\'s <em>outside</em> Jupiter\'s intense radiation belts (unlike Io, Europa, and Ganymede). This makes it the safest of Jupiter\'s large moons for future human visits.' },
        ],
        explore: {
            mission: 'Galileo (NASA, 1995–2003) + JUICE (ESA, will fly by Callisto en route)',
            discovery: 'Galileo\'s magnetic measurements hinted that <strong>Callisto might have a subsurface ocean</strong>. Close-up images revealed its strange surface — ancient multi-ring impact basins, bright ice patches, and terrain so saturated with craters it looks like a golf ball.',
            scale: 'Callisto is almost the <strong>same size as Mercury</strong>. If you could see it from above Jupiter\'s clouds, it would appear 4× larger than our Moon appears from Earth. From Earth, Callisto is visible as a tiny moving dot through a basic telescope on a clear night.',
            whatif: '<strong>What if Earth had no plate tectonics (like Callisto)?</strong> Every crater would remain forever — never erased. The Chicxulub crater (dinosaur-killer, 66 million years ago, 180 km wide) would still be a prominent scar. The entire 4-billion-year history of asteroid hits would be permanently written on Earth\'s face — just like Callisto.',
        },
        game: {
            failReason: 'The spacecraft\'s orbit decayed through Callisto\'s ancient debris field — it crashed into the most cratered world in the solar system!',
            realFact: 'Callisto is outside Jupiter\'s main radiation belts, making it the safest large moon to visit — NASA has studied it as a potential staging base for human Jupiter exploration.',
            stages: [
                { type: 'timing', icon: '🛰️', name: 'Orbit Stabilization', prompt: 'Debris field perturbing the orbit — stabilize BEFORE passing the equatorial belt!' },
                { type: 'choice', icon: '☄️', name: 'Debris Field', prompt: 'Ancient impact debris cloud detected ahead!', options: ['Roll spacecraft and boost through', 'Wait for orbit to clear naturally', 'Fire emergency burn'], correct: 0 },
                { type: 'tap',    icon: '🔧', name: 'Thruster Burst', prompt: 'Altitude dropping — fire correction thrusters 7 times!', taps: 7 },
                { type: 'timing', icon: '🗺️', name: 'Surface Scan Start', prompt: 'Begin crater mapping sequence at the optimal ground track moment!' },
                { type: 'choice', icon: '💡', name: 'Power System Check', prompt: 'Solar panels partially shadowed by Jupiter!', options: ['Switch to battery reserves', 'Rotate to maximize solar exposure', 'Reduce instrument power'], correct: 0 },
            ],
            hazards: ['ancient_debris', 'boulder', 'crater_ejecta'],
            crises: ['Orbit altitude dropping!', 'Debris impact detected!', 'Reaction wheels failing!', 'Power system degraded!'],
        },
    },
    'Saturn': {
        type: '💍 Gas Giant',
        fact: 'The Ringed Superstar! Saturn\'s rings stretch 282,000 km wide — almost the distance from Earth to the Moon — but they\'re thinner than a 10-story building! Saturn is so light that it could FLOAT in a giant bathtub!',
        gravity: '10.44 m/s² (slightly more than Earth)',
        day: '10.7 Hours',
        year: '29.4 Earth Years',
        temp: '-138°C cloud tops',
        details: '280+ Known Moons • Radius: 58,232 km',
        wow: '🛁 Saturn is the only planet that could float in water — it\'s less dense than water! Its rings are 282,000 km wide but only 100m thick!',
        emoji: '💍',
        ministats: ['280+ known moons', '29.4-year orbit', '6th from Sun'],
        statPills: ['🛁 Less dense than water!', '💍 Rings 282,000 km wide', '⏱️ 10.7-hour day', '🌡️ −138°C cloud tops', '🌕 280+ moons (and counting)'],
        wowStrip: 'Saturn\'s rings are <strong>282,000 km wide</strong> — nearly the distance from Earth to the Moon — yet they\'re thinner than a 10-story building. Thin as a razor blade stretched across a football field!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How can Saturn float in water?', a: 'An object floats if it\'s <strong>less dense than water</strong>. Saturn is made of gas (hydrogen and helium) and is so huge yet so light that its average density is only <em>0.687 g/cm³</em> — water is 1.0. So yes, if you had a bathtub big enough, Saturn would bob on top! It\'s the only planet in our solar system less dense than water.' },
            { cls: 'q-chem', q: '🧪 What are Saturn\'s rings actually made of?', a: 'About <strong>90–95% water ice</strong>, plus chunks of rock and dust. Particles range from tiny ice grains (snowflakes) to boulders the size of houses. The rings likely formed when a moon or comet got too close and was <em>ripped apart by tidal forces</em>. They\'re only 10–100 metres thick at most — paper-thin on a cosmic scale!' },
            { cls: 'q-astro', q: '🔭 How did Saturn end up with so many moons?', a: 'Saturn has <strong>over 280 known moons</strong> — more than any other planet! Its <strong>massive gravity</strong> captures passing space objects into orbit. Its ring system also clumps together to form tiny "moonlets." Some moons, like <em>Titan</em>, are ancient — formed with Saturn. Others are recently captured asteroids. Scientists discover new moons almost every year — Saturn keeps adding to its collection!' },
            { cls: 'q-life', q: '🌱 Could Titan — Saturn\'s biggest moon — have alien life?', a: 'Titan is one of the most exciting places in the solar system! It has <strong>lakes, rivers, and rain</strong> — but made of liquid methane (CH₄) instead of water. Its thick orange atmosphere resembles early Earth\'s. NASA\'s <em>Dragonfly</em> mission (launching 2028) will fly a helicopter on Titan, searching for chemical signs of life in the 2030s!' },
        ],
        explore: {
            mission: 'Cassini-Huygens (NASA/ESA, orbited Saturn 2004–2017)',
            discovery: 'Cassini discovered that Enceladus (a small moon) has <strong>geysers of water ice shooting into space</strong> — revealing a liquid ocean beneath its surface. Cassini ended its mission by diving into Saturn\'s atmosphere in a heroic "Grand Finale" after 13 years of discoveries.',
            scale: 'Saturn\'s rings span <strong>282,000 km</strong>. The Moon orbits Earth at 384,000 km. So Saturn\'s rings are almost as wide as the Earth-Moon gap — yet barely thicker than a tall building. Thin as a razor blade stretched across the distance from London to Paris.',
            whatif: '<strong>What if Saturn\'s rings disappeared?</strong> They\'re slowly doing just that — "ring rain" particles are constantly being pulled into Saturn. Scientists estimate the rings could completely disappear in <em>100 million years</em>. In cosmic time, we\'re incredibly lucky to exist right now while they\'re still here to admire.',
        },
        game: {
            failReason: 'Cassini\'s Grand Finale dive went wrong — it entered Saturn\'s atmosphere at too steep an angle and broke apart before transmitting final data!',
            realFact: 'Cassini\'s real Grand Finale in 2017 required threading between Saturn\'s rings and atmosphere 22 times — a gap only 2,000 km wide.',
            stages: [
                { type: 'timing', icon: '💍', name: 'Ring Gap Thread', prompt: 'Thread through the 2,000km gap between rings and atmosphere — perfect timing only!' },
                { type: 'choice', icon: '🪨', name: 'Moonlet Avoidance', prompt: 'Uncharted moonlet in ring gap trajectory!', options: ['Micro-burn to shift 50km north', 'Speed through the gap', 'Emergency retro-burn'], correct: 0 },
                { type: 'tap',    icon: '🔧', name: 'Attitude Correction', prompt: 'Ring particles nudging the spacecraft — fire 8 micro-bursts to straighten up!', taps: 8 },
                { type: 'timing', icon: '🌪️', name: 'Atmosphere Dive Angle', prompt: 'Final dive into Saturn\'s atmosphere — entry angle must be between 12.7° and 13.2°!' },
                { type: 'choice', icon: '❄️', name: 'Ring Particle Storm', prompt: 'Dense ring particle region unexpectedly thick!', options: ['Roll to protect antenna dish', 'Maintain orientation', 'Emergency altitude boost'], correct: 0 },
            ],
            hazards: ['ring_particle', 'moonlet', 'ice_chunk'],
            crises: ['Ring particles pitting solar panels!', 'Attitude fuel critically low!', 'Antenna signal dropping!', 'Heat shield temperature rising!'],
        },
    },
    'Titan': {
        type: '🌧️ Saturnian Moon',
        fact: 'Alien Earth! Titan is the only moon with a thick atmosphere and has rivers, lakes, and rain — but instead of water, it\'s all liquid methane! With its thick air, you could actually fly with giant wings like a bird!',
        gravity: '1.35 m/s²',
        day: '15.9 Earth Days',
        year: '15.9 Earth Days',
        temp: '-179°C',
        details: 'Radius: 2,574 km',
        wow: '🦅 Titan\'s thick atmosphere lets humans fly with just wings and a small flap — the gravity and air density make it possible!',
        emoji: '🌧️',
        ministats: ['Saturnian moon', '15.9-day orbit', 'Only moon with a thick atmosphere'],
        statPills: ['🌡️ −179°C surface', '🧡 Thick orange haze sky', '🌊 Methane lakes & rivers', '💨 Nitrogen atmosphere', '🦅 Humans could fly with wings!'],
        wowStrip: 'Titan is the only moon with a dense atmosphere — and it\'s <strong>thicker than Earth\'s</strong>! The air pressure at Titan\'s surface is 1.5× Earth\'s, and the gravity is so low that humans could literally fly by flapping strap-on wings.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why could humans actually fly on Titan with wings?', a: 'Two factors combine: (1) Titan\'s gravity is only <strong>14% of Earth\'s</strong> — you\'d weigh 1/7 of normal. (2) Titan\'s atmosphere is <strong>1.5× denser than Earth\'s</strong>. Flying requires generating lift, which depends on air density and wingspan. Low gravity + thick air = even large flapping wings could lift a person. NASA\'s Dragonfly helicopter mission exploits exactly this!' },
            { cls: 'q-chem', q: '🧪 Why does Titan have methane lakes instead of water lakes?', a: 'At −179°C, water is frozen solid as rock. But at that temperature, <strong>methane (CH₄) and ethane (C₂H₆)</strong> can be liquid! Titan has a complete "methane water cycle": evaporating from lakes, forming clouds, raining down, flowing in rivers, pooling in seas. Ligeia Mare — a methane sea — is <strong>500 km wide</strong>, comparable to Lake Superior on Earth!' },
            { cls: 'q-astro', q: '🔭 What makes Titan\'s orange haze?', a: 'Titan\'s atmosphere contains nitrogen (N₂) and methane (CH₄). Sunlight and charged particles from Saturn\'s magnetosphere break apart methane molecules. The fragments recombine into complex organic molecules called <em>"tholins"</em> — long chains that form the <strong>orange haze</strong> blanketing Titan. This same chemistry may have occurred on early Earth before life began!' },
            { cls: 'q-life', q: '🌱 Could alien life exist on Titan — but not as we know it?', a: 'Most life on Earth uses liquid water. Titan doesn\'t have liquid water on its surface. But could life use <strong>liquid methane instead</strong>? Scientists have theorised about "methane-based life" that would breathe hydrogen instead of oxygen. Completely alien to us — but Titan has all the organic chemistry ingredients to try. Dragonfly will search the 2030s.' },
        ],
        explore: {
            mission: 'Huygens Probe (ESA, landed Jan 14, 2005) + Dragonfly (NASA, launching 2028)',
            discovery: 'Huygens descended through Titan\'s atmosphere for 2.5 hours, photographing <strong>drainage channels, shorelines, and rounded pebbles</strong> of water ice — clear signs of flowing liquid. The most distant soft landing ever achieved. Dragonfly will fly to dozens of sites across Titan in the 2030s.',
            scale: 'Titan is <strong>larger than Mercury</strong>! If it orbited the Sun instead of Saturn, it would be called a planet. Its methane sea (Ligeia Mare) is the size of Lake Superior. You could literally sail a boat across an alien moon\'s methane lake.',
            whatif: '<strong>What if humans visited Titan?</strong> You\'d need a warm suit (−179°C) but not a pressure suit — air pressure is fine. You could breathe with an oxygen supply. You could fly with wings! But the organic haze blocks sunlight, solar panels wouldn\'t work well, and methane lakes would make everything deeply strange and alien.',
        },
        game: {
            failReason: 'Huygens\'s parachute deployed too early at 180km — the batteries ran out before the probe reached Titan\'s surface!',
            realFact: 'Huygens was designed to survive Titan\'s atmosphere for only 2–3 hours on non-rechargeable batteries. Every second of descent counted.',
            stages: [
                { type: 'timing', icon: '🪂', name: 'Parachute Altitude', prompt: 'Deploy main parachute at EXACTLY 150km — too early and battery runs out before landing!' },
                { type: 'choice', icon: '🌧️', name: 'Methane Cloud', prompt: 'Thick methane rain cloud blocking cameras!', options: ['Switch to radar altimeter', 'Descend faster through cloud', 'Wait for cloud to clear'], correct: 0 },
                { type: 'tap',    icon: '🔥', name: 'Heat Shield Jettison', prompt: 'Heat shield must be jettisoned manually — tap 7 times before atmosphere thickens!', taps: 7 },
                { type: 'timing', icon: '🔋', name: 'Battery Management', prompt: 'Transmit all science data during the optimal battery window!' },
                { type: 'choice', icon: '🏞️', name: 'Lake Landing Site', prompt: 'Methane lake directly below — safe to attempt?', options: ['Target adjacent solid shoreline', 'Attempt lake landing', 'Deploy floats'], correct: 0 },
            ],
            hazards: ['methane_cloud', 'ice_particle', 'wind_shear'],
            crises: ['Battery charge critical!', 'Methane rain clogging sensors!', 'Wind shear pushing off course!', 'Heat shield ablating rapidly!'],
        },
    },
    'Uranus': {
        type: '🔵 Ice Giant',
        fact: 'The sideways planet! A giant collision long ago knocked Uranus completely on its side. Now it spins like a rolling ball around the Sun! Each pole gets 42 years of non-stop sunlight, then 42 years of complete darkness.',
        gravity: '8.69 m/s²',
        day: '17.2 Hours',
        year: '84 Earth Years',
        temp: '-195°C (coldest atmosphere!)',
        details: '29 Known Moons • Radius: 25,362 km',
        wow: '↔️ Uranus spins on its side! Half the planet gets 42 years of straight sunlight, then 42 years of total darkness — no seasons like ours!',
        emoji: '🔵',
        ministats: ['29 known moons', '84-year orbit', '7th from Sun'],
        statPills: ['↔️ 98° axial tilt (spins sideways!)', '🔵 Methane blue-green colour', '❄️ −195°C atmosphere', '💎 Diamond rain possible', '⏱️ 17.2-hour day'],
        wowStrip: 'Deep inside Uranus, the pressure is so extreme that scientists think carbon atoms are crushed into <strong>actual diamonds</strong> — which then "rain" downward through the ice layers. Uranus might literally rain diamonds!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Uranus spin completely on its side?', a: 'Scientists believe a <strong>massive collision with an Earth-sized object</strong> billions of years ago knocked Uranus completely sideways. Its axial tilt is 98° — meaning it essentially rolls around the Sun on its side. This creates the solar system\'s most extreme seasons: each pole gets <strong>42 years of continuous sunlight</strong>, then 42 years of total darkness!' },
            { cls: 'q-chem', q: '🧪 What gives Uranus its blue-green colour?', a: '<strong>Methane gas (CH₄)</strong> in Uranus\'s upper atmosphere. Methane absorbs red wavelengths of sunlight and reflects blue-green back to our eyes. The more methane, the bluer the planet. Saturn (less methane) looks yellow-brown; Uranus (more methane) looks blue-green; Neptune (even more methane) is a deeper, richer blue.' },
            { cls: 'q-astro', q: '🔭 Why is Uranus called an "ice giant"?', a: 'Unlike Jupiter and Saturn (mostly hydrogen and helium gas), Uranus\'s interior contains large amounts of <strong>water (H₂O), methane (CH₄), and ammonia (NH₃)</strong> — compressed into a hot, dense fluid. Astronomers call these "ices," hence "ice giant." At extreme pressures inside Uranus, these materials behave unlike anything on Earth.' },
            { cls: 'q-life', q: '🌱 What\'s this about diamond rain inside Uranus?', a: 'At <strong>6 million atmospheres of pressure</strong> inside Uranus, carbon atoms (from methane) get squished so tightly they form diamonds. These diamonds are thought to "rain" downward through the ice layers toward the core. Scientists recreated this in the lab using powerful lasers! It\'s a real physical process — just happening on a scale too extreme to imagine.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Jan 24, 1986) — the only spacecraft to visit Uranus',
            discovery: 'Voyager 2 discovered <strong>10 new moons and 2 new rings</strong> during its 5.5-hour flyby. It found Uranus has a strange off-centre magnetic field — tilted 60° from its rotation axis. A dedicated Uranus orbiter was recommended as NASA\'s top planetary priority by the 2022 Decadal Survey.',
            scale: 'Uranus is about <strong>4× wider than Earth</strong>. If Earth were a tennis ball, Uranus would be a basketball. Despite being bigger, Uranus is actually less massive than Neptune — it\'s puffier and less dense. Its dark, narrow rings look very different from Saturn\'s bright ones.',
            whatif: '<strong>What if Uranus\'s tilt were like Earth\'s (23°)?</strong> It would have normal seasonal cycles — gentle spring, summer, autumn, winter — repeating every 84 years. The collision that tilted it also stripped away internal heat, making Uranus the coldest-atmosphered planet even though Neptune is farther from the Sun.',
        },
        game: {
            failReason: 'Voyager 2 missed Uranus\'s narrow 5.5-hour encounter window — years of data from the only visit ever planned were lost!',
            realFact: 'Voyager 2\'s entire Uranus encounter lasted only 5.5 hours. After 8.5 years of travel, it flew past at 15 km/s — all science had to be captured in that tiny window.',
            stages: [
                { type: 'timing', icon: '⏱️', name: '5.5-Hour Window', prompt: 'Begin science operations at EXACT moment of closest approach — the window is only 330 minutes!' },
                { type: 'choice', icon: '💍', name: 'Ring Plane Crossing', prompt: 'Uranus ring plane crossing in 30 seconds!', options: ['Roll to minimize cross-section', 'Maintain orientation', 'Boost above ring plane'], correct: 0 },
                { type: 'tap',    icon: '📸', name: 'Instrument Pointing', prompt: 'Manually point 9 science instruments to Uranus in rapid sequence!', taps: 9 },
                { type: 'timing', icon: '🌫️', name: 'Atmospheric Probe Drop', prompt: 'Release atmospheric probe at peak atmospheric density moment!' },
                { type: 'choice', icon: '🧲', name: 'Magnetosphere Surprise', prompt: 'Magnetic field tilted 60° from rotation axis — unexpected!', options: ['Adjust magnetometer orientation in flight', 'Record raw data as-is', 'Skip magnetic readings'], correct: 0 },
            ],
            hazards: ['ring_debris', 'magnetic_anomaly', 'ice_particle'],
            crises: ['Flyby window closing fast!', 'Ring debris threatening instruments!', 'Attitude control drifting!', 'Downlink signal weakening!'],
        },
    },
    'Titania': {
        type: '🌑 Uranian Moon',
        fact: 'The canyon world! Titania is Uranus\'s biggest moon and has enormous canyons slicing across its surface — some longer than the entire United States! It has both ancient craters and fresh rocky cliffs.',
        gravity: '0.38 m/s²',
        day: '8.7 Earth Days',
        year: '8.7 Earth Days',
        temp: '-203°C',
        details: 'Radius: 788 km',
        wow: '🏔️ Titania has canyons longer than the entire United States — carved by the moon cracking apart as it cooled down!',
        emoji: '🌑',
        ministats: ['Uranus\'s largest moon', '8.7-day orbit', '788 km radius'],
        statPills: ['🏔️ Canyon longer than the USA', '❄️ −203°C surface', '🌑 Half rock, half ice', '☄️ Ancient cratered terrain', '📏 Messina Chasmata: 1,500 km'],
        wowStrip: 'Titania has canyons (called "chasmata") that stretch <strong>thousands of kilometres</strong> — some longer than the entire United States! They formed when the moon\'s interior froze and expanded, cracking the crust like a cooling shell.',
        learn: [
            { cls: 'q-physics', q: '⚛️ How did Titania\'s enormous canyons form?', a: 'When Titania formed, its interior was warm and partly liquid. As it cooled, the water ice froze solid. But <strong>ice is less dense than liquid water — it expands when it freezes</strong>. This expansion cracked and stretched Titania\'s crust, creating enormous rift valleys. Similar to the East African Rift on Earth — but on a moon, frozen in time billions of years ago.' },
            { cls: 'q-chem', q: '🧪 What is Titania made of?', a: 'About <strong>50% water ice and 50% rock</strong> (silicate minerals and carbon compounds). Its dark surface comes from carbon-rich material deposited by comets over billions of years. The bright spots inside craters are <em>freshly exposed ice</em> that hasn\'t been darkened yet — like white chalk showing through old, weathered rock.' },
            { cls: 'q-astro', q: '🔭 How was Titania discovered?', a: 'Titania was discovered by <strong>William Herschel on January 11, 1787</strong> — just 6 years after he discovered Uranus itself! He spotted it through his handmade telescope in his garden. Titania is named after a character in Shakespeare\'s <em>A Midsummer Night\'s Dream</em>. All 28 of Uranus\'s moons are named after Shakespeare or Alexander Pope characters.' },
            { cls: 'q-life', q: '🌱 Could Titania have conditions for life?', a: 'Very cold (−203°C) and far from the Sun — liquid water on the surface is impossible. But scientists have wondered whether there could be a thin <strong>subsurface ocean</strong> kept warm by radioactive decay in Titania\'s rocky core. With so little data (only Voyager 2 has ever flown past), Titania remains one of the least-explored large moons.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Jan 24, 1986) — the only spacecraft to image Titania',
            discovery: 'Voyager 2 photographed about <strong>40% of Titania\'s surface</strong>, revealing the Messina Chasmata canyon system, ancient craters, and a mix of old and young terrain. No spacecraft has returned in the 40 years since.',
            scale: 'Titania is <strong>1,578 km in diameter</strong> — about the width of India. Its canyon Messina Chasmata is 1,500 km long. If that canyon were on Earth, it would stretch from London to Moscow — deeper than the Grand Canyon, carved by a freezing moon.',
            whatif: '<strong>What if you stood in Titania\'s canyon?</strong> Uranus would hang in the sky as a spectacular pale blue disc, about 5× the apparent size of our Moon. Gravity is only 38% of Earth\'s — you\'d feel light. The canyon walls around you would stretch 5 km deep — like standing at the bottom of a crack while clouds float above.',
        },
        game: {
            failReason: 'The probe\'s thrusters iced over in Titania\'s −203°C cold — it drifted silently out of orbit without firing a single manoeuvre!',
            realFact: 'No spacecraft has returned to Uranus or its moons after Voyager 2\'s 1986 flyby — Titania has been photographed only once, from 369,000 km away.',
            stages: [
                { type: 'timing', icon: '🛸', name: 'Orbit Insertion', prompt: 'Enter Titania orbit during the brief gravity-capture window — the only chance!' },
                { type: 'choice', icon: '🏔️', name: 'Canyon Navigation', prompt: 'Messina Chasmata canyon below — mapping altitude?', options: ['Descend to 500km for high-res data', 'Stay at 2000km safe altitude', 'Abort canyon pass'], correct: 0 },
                { type: 'tap',    icon: '🔥', name: 'Thruster Defrost', prompt: 'Thrusters icing at −200°C — tap 8 times to activate heaters!', taps: 8 },
                { type: 'timing', icon: '📷', name: 'Imaging Window', prompt: 'Canyon lit by Uranus-reflected light for exactly 4 seconds — capture now!' },
                { type: 'choice', icon: '🧊', name: 'Ice Field', prompt: 'Unexpectedly smooth ice field — land or orbit?', options: ['Attempt surface sample from low hover', 'Continue orbital survey', 'Abort to safe altitude'], correct: 0 },
            ],
            hazards: ['ice_crystal', 'canyon_wall', 'surface_debris'],
            crises: ['Thrusters freezing up!', 'Orbit drifting off course!', 'Canyon proximity alarm!', 'Camera lens icing over!'],
        },
    },
    'Neptune': {
        type: '💨 Ice Giant',
        fact: 'The Wild Wind World! Neptune has the STRONGEST winds in the entire solar system — up to 2,100 km/h! That\'s 5 times faster than Earth\'s worst hurricanes. It\'s so far away that one year here equals 165 Earth years!',
        gravity: '11.15 m/s² (slightly more than Earth)',
        day: '16.1 Hours',
        year: '165 Earth Years',
        temp: '-200°C',
        details: '16 Known Moons • Radius: 24,622 km',
        wow: '💨 Neptune\'s winds hit 2,100 km/h — faster than a fighter jet! Its first full year since discovery was only completed in 2011!',
        emoji: '💨',
        ministats: ['16 known moons', '165-year orbit', '8th from Sun'],
        statPills: ['💨 2,100 km/h winds (fastest!)', '💙 Vivid cobalt blue', '🌡️ −200°C', '⏱️ 16.1-hour day', '🔭 Predicted by maths before seen!'],
        wowStrip: 'Neptune was <strong>discovered mathematically</strong> before anyone ever saw it! Astronomers noticed Uranus\'s orbit was slightly wrong — calculated exactly where a hidden planet must be — and found Neptune the same night they looked. Maths discovered a planet!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Neptune have the strongest winds in the solar system?', a: 'Neptune receives almost <strong>900× less sunlight than Earth</strong>, yet its winds reach 2,100 km/h — supersonic! The energy comes from inside: Neptune generates <em>2.6× more heat</em> than it receives from the Sun. This internal heat (left over from Neptune\'s formation), combined with rapid rotation, creates these extreme jet streams.' },
            { cls: 'q-chem', q: '🧪 Why is Neptune such an intense blue?', a: 'Like Uranus, Neptune contains <strong>methane (CH₄)</strong> which absorbs red light and reflects blue. But Neptune is <em>more intensely blue</em> than Uranus — scientists believe there\'s another, still-unidentified substance in Neptune\'s atmosphere making it that vivid cobalt colour. What that substance is remains one of the solar system\'s unsolved mysteries.' },
            { cls: 'q-astro', q: '🔭 How was Neptune discovered using only mathematics?', a: 'In 1845–46, mathematicians Le Verrier and Adams independently calculated that a <strong>hidden planet</strong> must be gravitationally pulling Uranus off its predicted orbit. Le Verrier sent his prediction to the Berlin Observatory. That same night, astronomers aimed their telescope at the calculated spot and <em>found Neptune within 1°</em>. One of the greatest predictions in the history of science.' },
            { cls: 'q-life', q: '🌱 Could anything survive Neptune\'s conditions?', a: 'Neptune is an ice giant — its interior contains hot, dense "ices" (water, methane, ammonia) at extreme pressure. Some scientists speculate that at certain pressure-temperature layers inside Neptune, there could be <strong>liquid water</strong>. Whether life could exist there is wildly speculative — but the basic organic chemistry isn\'t inherently hostile. We know very little about ice giant interiors.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Aug 25, 1989) — the only spacecraft to visit Neptune',
            discovery: 'Voyager 2 discovered Neptune\'s Great Dark Spot (a storm the size of Earth), found <strong>6 new moons</strong>, confirmed the ring system, and photographed Triton\'s nitrogen geysers — the coldest active "volcanic" activity ever found. Neptune completed its first full orbit since discovery in <strong>2011!</strong>',
            scale: 'Neptune is <strong>4× wider than Earth</strong>. But it\'s so far away (30× the Earth-Sun distance) that even powerful telescopes barely show it as a blue disc. Voyager 2 took <strong>12 years to reach Neptune</strong> after launch — moving at 56,000 km/h the whole time.',
            whatif: '<strong>What if you hovered at Neptune\'s cloud tops?</strong> The 2,100 km/h winds would be faster than a rifle bullet. The Sun would be a very bright star — 900× dimmer than on Earth. The sky would be vivid dark blue. And Triton would rise in the west — it orbits backwards.',
        },
        game: {
            failReason: 'Neptune\'s 2,100 km/h supersonic winds spun Voyager 2 off its axis — it missed the entire Triton flyby that can never be repeated!',
            realFact: 'Voyager 2 had a 12-year journey to reach Neptune — and after the flyby, it left the solar system forever. What it captured in those hours is all we have.',
            stages: [
                { type: 'timing', icon: '💨', name: 'Wind Band Crossing', prompt: 'Cross the 2,100 km/h jet stream at the EXACT gap between wind bands!' },
                { type: 'choice', icon: '🌀', name: 'Great Dark Spot', prompt: 'Great Dark Spot storm system directly in flight path!', options: ['Adjust trajectory 800km north', 'Fly through the storm edge', 'Emergency speed boost'], correct: 0 },
                { type: 'tap',    icon: '⚖️', name: 'Attitude Stabilize', prompt: 'Supersonic winds destabilizing spacecraft — fire 9 micro-bursts to stabilize!', taps: 9 },
                { type: 'timing', icon: '🌙', name: 'Triton Flyby Angle', prompt: 'Triton closest approach in 8 seconds — lock instruments at optimal angle NOW!' },
                { type: 'choice', icon: '🧲', name: 'Magnetosphere Realign', prompt: 'Neptune\'s magnetic axis 47° from rotation axis — unexpected reading!', options: ['Adjust instruments to magnetic axis', 'Record both axes', 'Skip magnetic data'], correct: 0 },
            ],
            hazards: ['wind_shear', 'storm_band', 'debris'],
            crises: ['Supersonic winds destabilizing craft!', 'Attitude control overwhelmed!', 'Downlink antenna drifting!', 'Fuel critically low!'],
        },
    },
    'Triton': {
        type: '🔄 Neptunian Moon',
        fact: 'The backwards rebel! Triton is the only large moon that orbits BACKWARDS — opposite to Neptune\'s spin. Scientists think Neptune captured it from the outer solar system long ago. It\'s also slowly spiraling inward and will eventually shatter!',
        gravity: '0.78 m/s²',
        day: '5.8 Earth Days',
        year: '5.8 Earth Days',
        temp: '-235°C (one of the coldest!)',
        details: 'Radius: 1,353 km',
        wow: '🔄 Triton is doomed! It orbits backwards, getting closer to Neptune every year — in 3.6 billion years it will shatter into rings!',
        emoji: '🔄',
        ministats: ['Neptune\'s largest moon', '5.88-day retrograde orbit', 'Doomed in ~3.6 billion years'],
        statPills: ['🔄 Orbits backwards!', '❄️ −235°C (near absolute zero)', '🌋 Active nitrogen geysers', '☄️ Captured Kuiper Belt Object', '💥 Future ring system'],
        wowStrip: 'At −235°C, Triton is one of the <strong>coldest objects in the solar system</strong> — just 38°C above absolute zero (the coldest anything can physically be). Yet despite this extreme cold, it has active geysers shooting nitrogen gas 8 km into space!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Triton slowly spiraling into Neptune?', a: 'Triton orbits <strong>backwards</strong> (retrograde) — opposite to Neptune\'s rotation. Tidal forces always work against Triton\'s orbit, gradually slowing it and stealing orbital energy. As it loses energy, it sinks closer to Neptune. In about <strong>3.6 billion years</strong>, it crosses the Roche limit and Neptune\'s gravity rips it apart — creating spectacular rings!' },
            { cls: 'q-chem', q: '🧪 What are Triton\'s nitrogen geysers made of?', a: 'Triton\'s surface is covered in frozen <strong>nitrogen (N₂) ice</strong>. As sunlight hits the dark sub-surface material, it absorbs heat and warms the nitrogen just below. The nitrogen turns to gas and erupts through weak spots in the ice — powered by sunlight at −235°C. It shoots <em>dark nitrogen plumes 8 km high</em>. The coldest active "volcanic" activity ever found!' },
            { cls: 'q-astro', q: '🔭 Where did Triton actually come from?', a: 'Triton orbits the wrong way, on a tilted path — strongly suggesting it wasn\'t born with Neptune. Scientists believe Triton was once a large <em>Kuiper Belt Object</em> — like Pluto! Billions of years ago, it passed too close to Neptune and was gravitationally captured. Its arrival probably disrupted Neptune\'s entire original moon system.' },
            { cls: 'q-life', q: '🌱 Could Triton have a hidden ocean?', a: 'Despite being the coldest world with active geysers, some scientists think Triton might have a <strong>subsurface liquid ocean</strong> — kept warm by tidal heating (as its orbit slowly decays) plus radioactive decay. Pluto — Triton\'s likely twin — is now thought to have a subsurface ocean. If Pluto has one, Triton might too!' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Aug 25, 1989) — the only spacecraft to observe Triton',
            discovery: 'Voyager 2 photographed Triton\'s active <strong>nitrogen geysers</strong> — completely unexpected on such a cold world. It revealed a young, constantly-refreshed surface, and a pinkish colour from complex organic molecules (<em>tholins</em>) created by radiation hitting nitrogen and methane. No spacecraft has returned in 35+ years.',
            scale: 'Triton is <strong>2,706 km across</strong> — about the width of the continental United States from coast to coast. At −235°C, a cup of water left there would freeze in milliseconds. Yet geysers shoot gas 8 km high from that same frozen surface. A world of extremes at the edge of the solar system.',
            whatif: '<strong>What if Triton breaks apart in 3.6 billion years?</strong> Tidal forces rip it apart near the Roche limit. The resulting ring would be spectacular — far more massive than Saturn\'s current rings. For millions of years, Neptune would have the most dramatic ring system in the solar system, visible as a bright band from Earth.',
        },
        game: {
            failReason: 'The probe matched Triton\'s retrograde orbit perfectly — but a nitrogen geyser erupted directly below and shredded the landing gear at −235°C!',
            realFact: 'Triton is one of the few worlds where active geology has been observed from Earth orbit. Landing on such a cold, active world would be extraordinarily dangerous.',
            stages: [
                { type: 'timing', icon: '🔄', name: 'Retrograde Match', prompt: 'Triton orbits backwards — match its retrograde velocity EXACTLY to enter orbit!' },
                { type: 'choice', icon: '💨', name: 'Nitrogen Geyser', prompt: 'Geyser eruption detected 200m ahead!', options: ['Bank hard left and climb 300m', 'Fly over the geyser at altitude', 'Emergency full retro-burn'], correct: 0 },
                { type: 'tap',    icon: '🔥', name: 'Thermal Protection', prompt: 'Hull at −233°C — tap 8 times to boost heating elements before systems freeze!', taps: 8 },
                { type: 'timing', icon: '🛬', name: 'Landing Approach', prompt: 'Nitrogen ice surface only 50m below — cut descent thrusters at EXACT moment!' },
                { type: 'choice', icon: '🌀', name: 'Retrograde Burn', prompt: 'Orbital decay faster than predicted — burn direction?', options: ['Prograde burn to raise orbit', 'Retrograde burn to maintain', 'Use gravitational assist from Neptune'], correct: 0 },
            ],
            hazards: ['nitrogen_geyser', 'ice_debris', 'cryogenic_plume'],
            crises: ['Cryogenic temperatures freezing systems!', 'Nitrogen geyser erupting nearby!', 'Retrograde approach needs correction!', 'Landing struts at cryo-failure risk!'],
        },
    }
};

const missionData = {
  'Mercury': [
    { name:'MESSENGER', emoji:'🛸', year:'2004–2015', type:'Orbiter', status:'historical',
      agency:'NASA', rocket:'Delta II Heavy', color:0x4499ff,
      steps:['🚀 Delta II ignites — MESSENGER begins a 6.5-year journey to Mercury!','🌍 Using Venus gravity assists like a cosmic slingshot to slow down!','🔭 First spacecraft to orbit Mercury — mapping every crater and lava plain!','🧊 Finding water ice hiding in polar craters that never see sunlight!'],
      discovery:'Found water ice inside shadowed polar craters — even the Sun\'s closest neighbour has ice!',
      funFact:'🧊 Mercury\'s poles stay at -170°C permanently — ice survives there forever, just steps from the hottest surface in the solar system!' },
    { name:'BepiColombo', emoji:'🚀', year:'2018–2025', type:'Dual Orbiter', status:'active',
      agency:'ESA + JAXA', rocket:'Ariane 5', color:0x22ccff,
      steps:['🚀 Two spacecraft in one fairing — Europe and Japan launching together!','🌏 9 gravity assists over 7 years — like a cosmic pinball machine!','🔬 Separating into 2 orbiters to study Mercury from different altitudes!','📡 Unravelling the mystery of Mercury\'s surprisingly strong magnetic field!'],
      discovery:'The most complex Mercury mission ever — two orbiters, two countries, one small planet!',
      funFact:'🌍 BepiColombo swings past Earth once, Venus twice, and Mercury six times just to slow down enough to enter orbit!' },
  ],
  'Venus': [
    { name:'Magellan', emoji:'📡', year:'1989–1994', type:'Radar Mapper', status:'historical',
      agency:'NASA', rocket:'Titan IV', color:0xffaa22,
      steps:['📡 Launched from Space Shuttle — the first planetary probe ever deployed from a shuttle!','🌩️ Piercing Venus\'s impenetrable clouds with radar — like X-ray vision for a planet!','🌋 Discovering over 1,600 volcanoes hiding beneath the acid clouds!','🔥 Deliberately diving into Venus\'s atmosphere at mission end to study it!'],
      discovery:'Revealed Venus is smothered in volcanoes — some may still be erupting today!',
      funFact:'🌋 Venus has MORE volcanoes than any other planet in the solar system — Magellan spotted over 1,600 of them!' },
    { name:'DAVINCI+', emoji:'🔬', year:'Planned 2031', type:'Atmospheric Probe', status:'planned',
      agency:'NASA', rocket:'Atlas V', color:0xff6622,
      steps:['🚀 Most ambitious Venus mission in 30 years — finally going back!','☁️ A probe enters Venus\'s thick clouds and FALLS for 63 minutes through sulfuric acid!','📊 Measuring every layer of the atmosphere on the way down!','🌊 Searching for proof that Venus once had oceans and could have supported life!'],
      discovery:'Will discover whether Venus was once habitable — it may have had oceans for billions of years!',
      funFact:'☁️ The DAVINCI probe will fall through 60km of sulfuric acid clouds for over an hour — and might even survive the landing!' },
  ],
  'Moon': [
    { name:'Apollo 11', emoji:'👨‍🚀', year:'1969', type:'Crewed Lander', status:'historical',
      agency:'NASA', rocket:'Saturn V', color:0xf0c040,
      steps:['🚀 Saturn V ignites — the most powerful rocket ever built, burning 15 TONNES of fuel every second!','🌕 Three-day cruise to the Moon — Neil, Buzz, and Michael in a capsule the size of a car!','🦅 "The Eagle has landed!" — only 30 seconds of fuel left when they touched down!','👨‍🚀 Neil Armstrong steps out: "One small step for man, one giant leap for mankind!" — 600M people watch live!'],
      discovery:'Proved humans can walk on another world! Brought back 21kg of moon rocks, revealing the Moon is 4.5 billion years old.',
      funFact:'🦅 The landing computer had just 4KB of memory and flashed an alarm at landing — but the astronauts landed anyway with 30 seconds of fuel!' },
    { name:'Artemis I', emoji:'🛸', year:'2022', type:'Uncrewed Test Flight', status:'historical',
      agency:'NASA', rocket:'Space Launch System', color:0xaaddff,
      steps:['🚀 SLS — NASA\'s most powerful rocket since Saturn V — lifts off for the first time!','🌕 Orion capsule travels further from Earth than any human-rated spacecraft EVER — 450,000km!','🛸 26 days orbiting the Moon and testing all systems — no crew, but paving the way!','✅ Perfect splashdown in the Pacific — Artemis is GO for crewed missions!'],
      discovery:'Proved the Space Launch System and Orion capsule are ready to carry astronauts back to the Moon!',
      funFact:'🌕 Artemis I flew Orion further from Earth than any crewed-capable capsule in history — smashing the Apollo record!' },
    { name:'Artemis II', emoji:'🧑‍🚀', year:'Planned 2025', type:'Crewed Lunar Flyby', status:'planned',
      agency:'NASA', rocket:'Space Launch System', color:0x88ccff,
      steps:['🚀 SLS launches 4 astronauts — the first humans to leave low Earth orbit since Apollo 17 in 1972!','🌕 Flying around the Moon — the first humans to see the far side with their own eyes!','📸 Capturing breathtaking views of Earth and the Moon together from 8,900km above the lunar surface!','🎉 Safe return to Earth — the most important crewed test flight since Apollo!'],
      discovery:'Will prove SLS + Orion can carry humans safely around the Moon, clearing the way for the Moon landing!',
      funFact:'🧑‍🚀 The Artemis II crew includes the first woman and first non-American to fly to the Moon — Canadian Jeremy Hansen!' },
    { name:'Artemis III', emoji:'👩‍🚀', year:'Planned 2026', type:'Crewed Moon Landing', status:'planned',
      agency:'NASA + SpaceX', rocket:'SLS + Starship HLS', color:0xff8844,
      steps:['🚀 SLS launches the crew — Orion docks with SpaceX\'s Starship Human Landing System in lunar orbit!','🛸 Two astronauts climb into Starship and descend to the lunar South Pole!','👩‍🚀 First woman steps onto the Moon — and first person of colour walks on the lunar surface!','🧊 Exploring icy craters at the South Pole that hold water — the key to living on the Moon!'],
      discovery:'Will land at the lunar South Pole for the first time — where water ice could sustain a permanent Moon base!',
      funFact:'👩‍🚀 For the first time in history, a woman will walk on the Moon — 57 years after Neil Armstrong\'s first step!' },
    { name:'Lunar Gateway', emoji:'🛰️', year:'Construction 2025–2030', type:'Crewed Space Station', status:'planned',
      agency:'NASA + ESA + JAXA + CSA', rocket:'SLS + Falcon Heavy', color:0xcc99ff,
      steps:['🚀 First modules launch on Falcon Heavy and SLS rockets — building a station in lunar orbit!','🛸 Astronauts arrive via Orion capsule — the first humans to live in deep space since the Moon landings!','🌕 Gateway becomes the jumping-off point for landing missions to the Moon\'s surface!','🔭 Also serving as a base for future missions toward Mars — humanity\'s outpost in deep space!'],
      discovery:'Will be humanity\'s first space station outside Earth orbit — a permanent base for Moon exploration and Mars preparation!',
      funFact:'🌕 Gateway will orbit the Moon in a special "near-rectilinear halo orbit" — sometimes just 3,000km from the surface, sometimes 70,000km!' },
  ],
  'Mars': [
    { name:'Perseverance', emoji:'🤖', year:'2021–present', type:'Rover', status:'active',
      agency:'NASA', rocket:'Atlas V 541', color:0xff4444,
      steps:['🚀 Atlas V launches — Percy is folded up like origami inside the rocket\'s nose!','🌌 7-month cruise at 39,600 km/h — faster than any bullet ever fired!','🔥 "7 Minutes of Terror" — parachute, rockets, then a sky crane lowers Percy on cables!','🤖 Rolling on Mars in Jezero Crater — an ancient lake bed billions of years old!'],
      discovery:'Found ancient organic molecules and a river delta — Mars once had flowing water and possibly microbial life!',
      funFact:'🚁 Percy brought a helicopter! Ingenuity made the first powered flight on another planet — the Wright Brothers of Mars!' },
    { name:'Curiosity', emoji:'🔬', year:'2012–present', type:'Rover', status:'active',
      agency:'NASA', rocket:'Atlas V 541', color:0xcc4422,
      steps:['🚀 Curiosity launches — a rover the size of a car, folded into a ball!','🌌 8.5-month cruise protected from deadly cosmic rays by a heat shield!','💥 Sky crane landing — a hovering rocket platform lowers Curiosity by cables!','🔬 Drilling into Martian rocks in Gale Crater — searching for the chemistry of life!'],
      discovery:'Found organic molecules AND methane gas in Mars\'s atmosphere — the actual building blocks of life!',
      funFact:'🎂 Every year on its Mars-birthday, Curiosity plays "Happy Birthday To You" to itself — using a laser pointed at a rock!' },
  ],
  'Phobos': [
    { name:'MMX Probe', emoji:'🪨', year:'2026–2029', type:'Sample Return', status:'planned',
      agency:'JAXA + NASA', rocket:'H3 Rocket', color:0x88aacc,
      steps:['🚀 Japan\'s H3 rocket launches the first dedicated mission to Mars\'s moons!','🌌 3-year journey to Mars, then carefully approaching tiny Phobos!','🪨 Landing on a moon only 27km wide — like touching down on a mountain!','💎 Collecting samples to bring back to Earth — the first Mars moon rocks ever!'],
      discovery:'Will return the first samples from a Martian moon — cracking the mystery of Phobos\'s origin!',
      funFact:'🪨 Phobos is so small its gravity is almost nothing — throw a baseball and it escapes into space forever!' },
  ],
  'Deimos': [
    { name:'MMX Probe', emoji:'🪨', year:'2026–2029', type:'Flyby', status:'planned',
      agency:'JAXA', rocket:'H3 Rocket', color:0x99bbdd,
      steps:['🚀 MMX launches — bound for both of Mars\'s mysterious moons!','🌌 After reaching Mars, swinging out to tiny Deimos for a flyby!','📸 Flying past Deimos — only 15km across, smaller than a city!','🔭 Studying both moons — were they captured asteroids, or chunks blasted off ancient Mars?'],
      discovery:'Will help solve whether Mars\'s moons came from captured asteroids or a giant impact on ancient Mars!',
      funFact:'⭐ Deimos is so small and far from Mars that it looks like a bright star from the Martian surface — you\'d need binoculars!' },
  ],
  'Jupiter': [
    { name:'Juno', emoji:'🌩️', year:'2016–present', type:'Orbiter', status:'active',
      agency:'NASA', rocket:'Atlas V 551', color:0xffcc44,
      steps:['🚀 Atlas V with 5 solid boosters ROARS into space — Juno is heading to Jupiter!','🌍 Flying past Earth 2 years later for a free speed boost from gravity!','⚡ Diving into Jupiter\'s intense radiation — like flying into a giant microwave oven!','🌩️ Peering beneath Jupiter\'s clouds closer than any spacecraft before!'],
      discovery:'Discovered Jupiter\'s poles are packed with dozens of massive cyclone storms — each larger than Earth!',
      funFact:'⚡ Every time Juno passes Jupiter, it absorbs radiation equal to 20 MILLION chest X-rays — its electronics are shielded in titanium!' },
    { name:'Europa Clipper', emoji:'🌊', year:'2024–2030', type:'Orbiter', status:'active',
      agency:'NASA', rocket:'Falcon Heavy', color:0x44aaff,
      steps:['🚀 SpaceX Falcon Heavy launches NASA\'s biggest planetary science spacecraft ever!','🌌 5.5-year journey using Mars and Earth for gravity assists!','🌊 49 close flybys of Europa — scanning for the ocean hiding under 20km of ice!','🔬 Analysing water plumes shooting from Europa\'s surface — is anyone home?'],
      discovery:'Will determine if Europa\'s hidden ocean could host life — possibly the most important mission in history!',
      funFact:'🛸 Europa Clipper carries a message from humanity — 2.6 million names etched on a metal plate sent to the outer solar system!' },
  ],
  'Io': [
    { name:'Galileo', emoji:'🌋', year:'1995–2003', type:'Orbiter', status:'historical',
      agency:'NASA', rocket:'Space Shuttle Atlantis', color:0xff6600,
      steps:['🚀 Launched from Space Shuttle Atlantis — first planetary probe deployed from a shuttle!','💥 Dropped a probe directly INTO Jupiter\'s atmosphere — first time anything entered a gas giant!','🌋 Discovering Io\'s mind-blowing volcanic activity — hundreds of erupting volcanoes!','🌊 Finding strong evidence for liquid oceans under Europa\'s and Ganymede\'s ice!'],
      discovery:'Found Io is the most volcanically active body in the solar system AND discovered subsurface oceans on three moons!',
      funFact:'🌋 Galileo spotted a volcano on Io blasting material 500km into space — higher than the International Space Station orbits Earth!' },
  ],
  'Europa': [
    { name:'Europa Clipper', emoji:'🌊', year:'2024–2030', type:'Orbiter', status:'active',
      agency:'NASA', rocket:'Falcon Heavy', color:0x44aaff,
      steps:['🚀 SpaceX Falcon Heavy launches the biggest planetary mission NASA has ever built!','📡 Flying past Mars then Earth for gravity slingshots — saving years of travel!','❄️ Arriving at Jupiter and beginning 49 close flybys of icy Europa!','🔬 Tasting water plumes shooting from Europa\'s cracked ice shell!'],
      discovery:'Will map Europa\'s ocean and determine whether life could exist there — the holy grail of astrobiology!',
      funFact:'🌊 Europa has more liquid water than ALL of Earth\'s oceans combined — hidden under 10-30km of ice!' },
  ],
  'Ganymede': [
    { name:'JUICE', emoji:'🧃', year:'2023–2034', type:'Orbiter', status:'active',
      agency:'ESA', rocket:'Ariane 5', color:0xaaff44,
      steps:['🚀 ESA\'s Ariane 5 launches JUICE — Jupiter Icy Moons Explorer!','🌍 8-year journey using gravity assists at Earth, Venus, and Jupiter\'s moons!','🌕 Flying past Ganymede, Europa, and Callisto — three worlds hiding secret oceans!','🏆 Becoming the first spacecraft to orbit any moon other than our own Moon!'],
      discovery:'First spacecraft to orbit an alien moon — will study Ganymede\'s magnetic field, atmosphere, and hidden ocean!',
      funFact:'🧲 Ganymede is the only moon in the solar system with its own magnetic field — it creates its own Northern and Southern Lights!' },
  ],
  'Callisto': [
    { name:'JUICE', emoji:'🧃', year:'2023–2034', type:'Flyby', status:'active',
      agency:'ESA', rocket:'Ariane 5', color:0x88cc33,
      steps:['🚀 JUICE launches on Europe\'s most ambitious deep space mission!','🌌 Navigating through Jupiter\'s complex moon system with precision!','☄️ 21 close flybys of ancient, crater-covered Callisto!','🔬 Hunting for the deep saltwater ocean believed to hide 200km underground!'],
      discovery:'Callisto may hide a deep buried ocean — another candidate for life in the outer solar system!',
      funFact:'☄️ Callisto is the most crater-covered object in the solar system — a 4-billion-year record of every asteroid and comet hit!' },
  ],
  'Saturn': [
    { name:'Cassini-Huygens', emoji:'💍', year:'1997–2017', type:'Orbiter + Lander', status:'historical',
      agency:'NASA + ESA', rocket:'Titan IVB', color:0xddaa33,
      steps:['🚀 Titan IVB launches — Cassini and the Huygens lander travel together for 7 years!','🌍 Gravity assists past Venus twice, Earth, and Jupiter — gaining speed for free!','💍 Diving through Saturn\'s ring gap to enter orbit — the most dangerous manoeuvre!','🪂 Releasing Huygens to parachute through Titan\'s orange clouds to its surface!'],
      discovery:'Discovered water geysers on tiny Enceladus — a warm ocean moon — AND soft-landed on Titan!',
      funFact:'💧 Tiny Enceladus (504km wide) fires water jets into space that feed Saturn\'s entire E ring — Cassini flew through them!' },
  ],
  'Titan': [
    { name:'Huygens Probe', emoji:'🪂', year:'2005', type:'Atmospheric Probe + Lander', status:'historical',
      agency:'ESA', rocket:'Titan IVB (via Cassini)', color:0xcc8822,
      steps:['🚀 Hitching a ride on Cassini for 7 years — then separating for the final plunge!','🪂 Entering Titan\'s atmosphere at 6 km/s — parachute deploys in the orange haze!','📸 Photographing Titan while falling for 2.5 hours — rivers, lakes, hills!','🌍 Landing on a surface eerily like Earth — but rocks are ice and rain is liquid methane!'],
      discovery:'First landing in the outer solar system! Revealed Titan has rivers, lakes, hills, and rain — all made of liquid methane!',
      funFact:'📡 Huygens sent data for 72 minutes after landing — but due to a software error, only half the data got through!' },
    { name:'Dragonfly', emoji:'🚁', year:'2028 launch / 2034 arrival', type:'Rotorcraft Lander', status:'planned',
      agency:'NASA', rocket:'Falcon Heavy', color:0xff9933,
      steps:['🚀 Falcon Heavy launches Dragonfly — a nuclear-powered helicopter the size of a car!','🌌 6-year cruise — then parachuting into Titan\'s orange nitrogen atmosphere!','🌧️ Landing on Titan\'s surface at -179°C where methane rains from the sky!','🚁 Flying 8km hops from site to site — like a helicopter on an alien world!'],
      discovery:'Will explore Titan\'s organic chemistry — learning how the building blocks of life form even without liquid water!',
      funFact:'🚁 On Titan you could strap wings to your arms and FLY — the thick atmosphere and gentle gravity make human-powered flight possible!' },
  ],
  'Uranus': [
    { name:'Voyager 2', emoji:'🔭', year:'1986 flyby', type:'Flyby Probe', status:'historical',
      agency:'NASA', rocket:'Titan III-E', color:0x88ccff,
      steps:['🚀 Titan III-E launches Voyager 2 on a once-in-176-year Grand Tour of all outer planets!','🌌 9-year journey to Uranus — traveling further than humanity had ever sent a spacecraft!','🔭 Just 6 hours to fly past Uranus — and 10 new moons discovered in that short window!','📡 Radio signals from Uranus take 2.5 hours to reach Earth at the speed of light!'],
      discovery:'The only spacecraft to visit Uranus! Found 10 new moons, 2 new rings, and a magnetic field tilted 60° from its axis.',
      funFact:'🌌 Voyager 2 launched in 1977 and is still alive — now 22 billion km from Earth, the most distant human-made object ever!' },
    { name:'Uranus Orbiter Probe', emoji:'🛸', year:'Planned 2030s', type:'Orbiter + Probe', status:'planned',
      agency:'NASA', rocket:'Falcon Heavy', color:0x55aacc,
      steps:['🚀 Humanity returns to Uranus — 40+ years after Voyager 2\'s brief visit!','🌌 13-year journey, using Jupiter\'s gravity to slingshot to the outer solar system!','🌊 Dropping an atmospheric probe INTO Uranus — the first time ever!','🔭 Orbiting for years — studying its sideways rotation, rings, and icy moons!'],
      discovery:'Will discover what\'s inside Uranus, why it spins completely sideways, and if its moons hide liquid oceans!',
      funFact:'↔️ Scientists believe a planet the size of EARTH collided with Uranus long ago — knocking it completely on its side!' },
  ],
  'Titania': [
    { name:'Voyager 2', emoji:'🔭', year:'1986 flyby', type:'Flyby', status:'historical',
      agency:'NASA', rocket:'Titan III-E', color:0x77bbee,
      steps:['🚀 Voyager 2 — already past Jupiter and Saturn — now heading for Uranus and its moons!','🌌 Flying past all five major Uranian moons in a single 6-hour window!','🏔️ Spotting Titania\'s enormous canyons from 365,000 km away!','📸 Taking the only close-up photos of Titania humanity has ever seen!'],
      discovery:'Revealed Titania has enormous fault canyons — it cracked open as its interior froze billions of years ago!',
      funFact:'📸 Every single photo ever taken of Titania was captured in one 6-hour window in January 1986 — we have seen nothing new since!' },
  ],
  'Neptune': [
    { name:'Voyager 2', emoji:'🔭', year:'1989 flyby', type:'Flyby Probe', status:'historical',
      agency:'NASA', rocket:'Titan III-E', color:0x4466ff,
      steps:['🚀 After 12 years in space, Voyager 2 reaches the last planet in our solar system!','💨 Detecting winds of 2,100 km/h — the most violent winds anywhere in the solar system!','🌑 Discovering 6 new moons in a single flyby — including the geologically active Triton!','🌊 Finding nitrogen geysers erupting on Triton — active geology at -235°C!'],
      discovery:'Discovered the Great Dark Spot (a storm bigger than Earth!), 6 new moons, and active geysers on frozen Triton!',
      funFact:'📡 Voyager 2\'s radio signals took 4 HOURS to reach Earth from Neptune — traveling at the speed of light the whole way!' },
  ],
  'Triton': [
    { name:'Voyager 2', emoji:'🔭', year:'1989 flyby', type:'Flyby', status:'historical',
      agency:'NASA', rocket:'Titan III-E', color:0x3355dd,
      steps:['🚀 Final stop on Voyager 2\'s incredible 12-year Grand Tour of the solar system!','❄️ Approaching Neptune and its strange backwards-orbiting moon Triton!','💨 Detecting active nitrogen geysers erupting on one of the coldest surfaces ever found!','🔄 Confirming Triton orbits BACKWARDS — captured from the outer solar system long ago!'],
      discovery:'Found Triton has active nitrogen geysers at -235°C — the coldest geological activity ever discovered anywhere!',
      funFact:'🔄 Triton orbits Neptune backwards and is slowly spiraling inward — in 3.6 billion years Neptune\'s gravity will shatter it into a ring!' },
  ],
};

function getMissionsForTarget(targetName) {
    const i18nMissions = tm(targetName, 0, 'name');
    if (i18nMissions && i18nMissions !== `missionData.${targetName}.0.name`) {
        const missions = [];
        let idx = 0;
        while (true) {
            const name = tm(targetName, idx, 'name');
            if (!name || name === `missionData.${targetName}.${idx}.name`) break;
            missions.push({
                name: tm(targetName, idx, 'name') || missionData[targetName]?.[idx]?.name,
                emoji: tm(targetName, idx, 'emoji') || missionData[targetName]?.[idx]?.emoji,
                year: tm(targetName, idx, 'year') || missionData[targetName]?.[idx]?.year,
                type: tm(targetName, idx, 'type') || missionData[targetName]?.[idx]?.type,
                status: missionData[targetName]?.[idx]?.status || 'historical',
                agency: missionData[targetName]?.[idx]?.agency || '',
                rocket: tm(targetName, idx, 'rocket') || missionData[targetName]?.[idx]?.rocket || '',
                color: missionData[targetName]?.[idx]?.color || 0x4499ff,
                steps: tm(targetName, idx, 'steps') || missionData[targetName]?.[idx]?.steps || [],
                discovery: tm(targetName, idx, 'discovery') || missionData[targetName]?.[idx]?.discovery || '',
                funFact: tm(targetName, idx, 'funFact') || missionData[targetName]?.[idx]?.funFact || '',
            });
            idx++;
        }
        return missions;
    }
    return missionData[targetName] || null;
}

// --- SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200000);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.15,  // strength — subtle, avoids blowing out the sun
    0.4,   // radius
    0.9    // threshold — only the brightest pixels bloom
);
composer.addPass(bloomPass);

// --- CINEMATIC POST-PROCESSING ---
const chromaticAberrationShader = {
    uniforms: {
        tDiffuse: { value: null },
        intensity: { value: 0.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
            vec2 dir = vUv - vec2(0.5);
            float dist = length(dir);
            vec2 offset = dir * dist * intensity;
            float r = texture2D(tDiffuse, vUv + offset).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset).b;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `,
};
const chromaticPass = new ShaderPass(chromaticAberrationShader);
chromaticPass.enabled = false;
composer.addPass(chromaticPass);

const motionBlurShader = {
    uniforms: {
        tDiffuse: { value: null },
        intensity: { value: 0.0 },
        direction: { value: new THREE.Vector2(0.0, 0.0) },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        uniform vec2 direction;
        varying vec2 vUv;
        void main() {
            vec2 dir = direction * intensity;
            vec4 color = vec4(0.0);
            color += texture2D(tDiffuse, vUv - 4.0 * dir) * 0.05;
            color += texture2D(tDiffuse, vUv - 3.0 * dir) * 0.09;
            color += texture2D(tDiffuse, vUv - 2.0 * dir) * 0.12;
            color += texture2D(tDiffuse, vUv - 1.0 * dir) * 0.15;
            color += texture2D(tDiffuse, vUv) * 0.18;
            color += texture2D(tDiffuse, vUv + 1.0 * dir) * 0.15;
            color += texture2D(tDiffuse, vUv + 2.0 * dir) * 0.12;
            color += texture2D(tDiffuse, vUv + 3.0 * dir) * 0.09;
            color += texture2D(tDiffuse, vUv + 4.0 * dir) * 0.05;
            gl_FragColor = color;
        }
    `,
};
const motionBlurPass = new ShaderPass(motionBlurShader);
motionBlurPass.enabled = false;
composer.addPass(motionBlurPass);

// --- CINEMATIC STAR STREAKS ---
const STREAK_COUNT = 120;
const streakPositions = new Float32Array(STREAK_COUNT * 6); // 2 vertices per line (start + end)
const streakColors = new Float32Array(STREAK_COUNT * 6);    // RGB per vertex
const streakGeo = new THREE.BufferGeometry();
streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
streakGeo.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));
const streakMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
const streakLines = new THREE.LineSegments(streakGeo, streakMat);
streakLines.frustumCulled = false;
streakLines.visible = false;
scene.add(streakLines);

// Each streak has a random direction in a cone around the forward axis
const streakData = [];
for (let i = 0; i < STREAK_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * 0.8 + 0.1; // cone spread 0.1-0.9 radians
    streakData.push({
        theta,
        phi,
        baseLength: 5 + Math.random() * 15,
        brightness: 0.5 + Math.random() * 0.5,
        speed: 0.8 + Math.random() * 0.4,
    });
}

function updateStarStreaks(rocketPos, forwardDir, intensity, lengthMult) {
    if (intensity <= 0) {
        streakLines.visible = false;
        return;
    }
    streakLines.visible = true;
    streakMat.opacity = intensity;

    // Build a local frame from forwardDir
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(forwardDir.dot(up)) > 0.99) up.set(1, 0, 0);
    right.crossVectors(forwardDir, up).normalize();
    up.crossVectors(right, forwardDir).normalize();

    for (let i = 0; i < STREAK_COUNT; i++) {
        const s = streakData[i];
        // Direction in cone around forward
        const sinP = Math.sin(s.phi);
        const cosP = Math.cos(s.phi);
        const dir = new THREE.Vector3()
            .addScaledVector(forwardDir, cosP)
            .addScaledVector(right, sinP * Math.cos(s.theta))
            .addScaledVector(up, sinP * Math.sin(s.theta))
            .normalize();

        const dist = 30 + s.phi * 40; // farther streaks at wider angles
        const start = rocketPos.clone().add(dir.clone().multiplyScalar(dist));
        const end = start.clone().add(dir.clone().multiplyScalar(s.baseLength * lengthMult));

        const idx = i * 6;
        streakPositions[idx]     = start.x;
        streakPositions[idx + 1] = start.y;
        streakPositions[idx + 2] = start.z;
        streakPositions[idx + 3] = end.x;
        streakPositions[idx + 4] = end.y;
        streakPositions[idx + 5] = end.z;

        const b = s.brightness * intensity;
        // Blue-white tint
        streakColors[idx]     = 0.7 * b;
        streakColors[idx + 1] = 0.8 * b;
        streakColors[idx + 2] = 1.0 * b;
        streakColors[idx + 3] = 0.5 * b;
        streakColors[idx + 4] = 0.6 * b;
        streakColors[idx + 5] = 0.9 * b;
    }
    streakGeo.attributes.position.needsUpdate = true;
    streakGeo.attributes.color.needsUpdate = true;
}

// Circular soft-glow sprite — used for tunnel particles and background stars
function makeStarSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0,  'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.25, 'rgba(240, 248, 255, 0.85)');
    g.addColorStop(0.6,  'rgba(200, 220, 255, 0.35)');
    g.addColorStop(1.0,  'rgba(180, 200, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}
const starSpriteTex = makeStarSprite();

// --- CINEMATIC PARTICLE TUNNEL ---
const TUNNEL_PARTICLE_COUNT = 400;
const tunnelPositions = new Float32Array(TUNNEL_PARTICLE_COUNT * 3);
const tunnelSizes = new Float32Array(TUNNEL_PARTICLE_COUNT);
const tunnelAlphas = new Float32Array(TUNNEL_PARTICLE_COUNT);
const tunnelGeo = new THREE.BufferGeometry();
tunnelGeo.setAttribute('position', new THREE.BufferAttribute(tunnelPositions, 3));
tunnelGeo.setAttribute('size', new THREE.BufferAttribute(tunnelSizes, 1));
tunnelGeo.setAttribute('alpha', new THREE.BufferAttribute(tunnelAlphas, 1));

const tunnelMat = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x4488ff) },
        pointTexture: { value: starSpriteTex },
    },
    vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform sampler2D pointTexture;
        varying float vAlpha;
        void main() {
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            gl_FragColor = vec4(color, texColor.a * vAlpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});

const tunnelParticles = new THREE.Points(tunnelGeo, tunnelMat);
tunnelParticles.frustumCulled = false;
tunnelParticles.visible = false;
scene.add(tunnelParticles);

// Each particle has an offset in a ring around the path
const tunnelParticleData = [];
for (let i = 0; i < TUNNEL_PARTICLE_COUNT; i++) {
    tunnelParticleData.push({
        angle: Math.random() * Math.PI * 2,
        radius: 3 + Math.random() * 5,
        zOffset: (Math.random() - 0.5) * 60, // spread along the tunnel length
        speed: 20 + Math.random() * 30,       // how fast they scroll backward
        baseSize: 1.5 + Math.random() * 2.5,
    });
}

function updateParticleTunnel(rocketPos, forwardDir, intensity, dt) {
    if (intensity <= 0) {
        tunnelParticles.visible = false;
        return;
    }
    tunnelParticles.visible = true;

    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(forwardDir.dot(up)) > 0.99) up.set(1, 0, 0);
    right.crossVectors(forwardDir, up).normalize();
    up.crossVectors(right, forwardDir).normalize();

    for (let i = 0; i < TUNNEL_PARTICLE_COUNT; i++) {
        const p = tunnelParticleData[i];

        // Scroll particles backward
        p.zOffset -= p.speed * dt;
        if (p.zOffset < -30) p.zOffset += 60;

        const ringX = Math.cos(p.angle) * p.radius;
        const ringY = Math.sin(p.angle) * p.radius;

        const pos = rocketPos.clone()
            .addScaledVector(forwardDir, p.zOffset)
            .addScaledVector(right, ringX)
            .addScaledVector(up, ringY);

        const idx = i * 3;
        tunnelPositions[idx]     = pos.x;
        tunnelPositions[idx + 1] = pos.y;
        tunnelPositions[idx + 2] = pos.z;

        // Fade at edges of tunnel
        const zFade = 1.0 - Math.abs(p.zOffset) / 30;
        tunnelSizes[i] = p.baseSize * intensity;
        tunnelAlphas[i] = Math.max(0, zFade * intensity * 0.7);
    }
    tunnelGeo.attributes.position.needsUpdate = true;
    tunnelGeo.attributes.size.needsUpdate = true;
    tunnelGeo.attributes.alpha.needsUpdate = true;
}

// --- CINEMATIC ENERGY WAVES ---
const MAX_WAVES = 5;
const energyWaves = [];
const waveGeometry = new THREE.TorusGeometry(1, 0.08, 8, 64);
const waveMaterial = new THREE.MeshBasicMaterial({
    color: 0x44aaff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
});

function spawnEnergyWave(position, forwardDir) {
    if (energyWaves.length >= MAX_WAVES) {
        const oldest = energyWaves.shift();
        scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
    }
    const mesh = new THREE.Mesh(waveGeometry.clone(), waveMaterial.clone());
    mesh.position.copy(position);
    // Orient ring perpendicular to travel direction
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardDir);
    mesh.quaternion.copy(quat);
    scene.add(mesh);
    energyWaves.push({ mesh, age: 0, maxAge: 0.8 });
}

function updateEnergyWaves(dt) {
    for (let i = energyWaves.length - 1; i >= 0; i--) {
        const w = energyWaves[i];
        w.age += dt;
        if (w.age >= w.maxAge) {
            scene.remove(w.mesh);
            w.mesh.geometry.dispose();
            w.mesh.material.dispose();
            energyWaves.splice(i, 1);
            continue;
        }
        const progress = w.age / w.maxAge;
        const scale = 1 + progress * 8;
        w.mesh.scale.set(scale, scale, scale);
        w.mesh.material.opacity = 0.6 * (1 - progress);
    }
}

function clearEnergyWaves() {
    energyWaves.forEach(w => {
        scene.remove(w.mesh);
        w.mesh.geometry.dispose();
        w.mesh.material.dispose();
    });
    energyWaves.length = 0;
}

// --- CINEMATIC STATE MACHINE ---
const cinematicSkipBtn = document.getElementById('cinematic-skip');
const cinematicFlash = document.getElementById('cinematic-flash');
let cinematicState = null;
let preCinematicCamera = null;
let waveSpawnTimer = 0;

const PHASE_DURATIONS = {
    launch: 1.5,
    ascent: 1.0,
    warp: 1.5,
    warpExit: 0.5,
    deceleration: 0.5,
    flyby: 2.0,
};

function startCinematic(rocketObj) {
    preCinematicCamera = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        controlsTarget: controls.target.clone(),
    };
    controls.enabled = false;
    // Hide planet info card during cinematic
    if (infoCard) infoCard.classList.add('hidden');

    const earthPos = rocketObj.mesh.position.clone();
    const targetPos = new THREE.Vector3();
    rocketObj.target.mesh.getWorldPosition(targetPos);
    const direction = targetPos.clone().sub(earthPos).normalize();

    cinematicState = {
        phase: 'launch',
        elapsed: 0,
        rocketObj,
        earthPos: earthPos.clone(),
        targetPos,
        direction,
        totalDist: earthPos.distanceTo(targetPos),
        shakeIntensity: 0,
        shakeDecay: 0,
    };

    cinematicSkipBtn.classList.remove('hidden');

    // Scale rocket up for cinematic visibility
    rocketObj.mesh.scale.set(2, 2, 2);

    // Store original opacities for flyby fade-out
    rocketObj.mesh.traverse(child => {
        if (child.material) {
            child.material._originalOpacity = child.material.opacity;
        }
    });

    const camOffset = direction.clone().multiplyScalar(-3)
        .add(new THREE.Vector3(0, -1.5, 0))
        .add(new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(2));
    camera.position.copy(earthPos).add(camOffset);
    camera.lookAt(earthPos.clone().add(new THREE.Vector3(0, 2, 0)));
}

function endCinematic(skipToGame) {
    if (!cinematicState) return;
    const { rocketObj } = cinematicState;

    updateStarStreaks(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
    updateParticleTunnel(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
    clearEnergyWaves();
    chromaticPass.enabled = false;
    chromaticPass.uniforms.intensity.value = 0;
    motionBlurPass.enabled = false;
    motionBlurPass.uniforms.intensity.value = 0;
    cinematicFlash.style.opacity = '0';
    cinematicFlash.style.background = 'white';

    // Reset rocket scale
    rocketObj.mesh.scale.set(1, 1, 1);

    // Reset flame colors (may have been changed to blue during warp)
    rocketObj.fireMesh.material.color.set(0xffaa00);
    if (rocketObj.mesh.boosterFlames) {
        rocketObj.mesh.boosterFlames.forEach(bf => bf.material.color.set(0xff6600));
    }

    // Reset rocket opacity (may have been faded during flyby)
    rocketObj.mesh.traverse(child => {
        if (child.material) {
            child.material.opacity = child.material._originalOpacity ?? child.material.opacity;
        }
    });

    scene.remove(rocketObj.mesh);
    scene.remove(rocketObj.trailLine);
    const idx = activeRockets.indexOf(rocketObj);
    if (idx !== -1) activeRockets.splice(idx, 1);
    if (activeMission === rocketObj) activeMission = null;

    missionLog.classList.add('hidden');
    cinematicSkipBtn.classList.add('hidden');

    const targetPos = new THREE.Vector3();
    rocketObj.target.mesh.getWorldPosition(targetPos);
    const orbitDist = (rocketObj.target.size || 4) * 3;
    camera.position.copy(targetPos).add(new THREE.Vector3(orbitDist, orbitDist * 0.5, orbitDist));
    controls.target.copy(targetPos);
    // Close any planet info card
    if (infoCard) infoCard.classList.add('hidden');
    controls.enabled = true;

    lockedTarget = rocketObj.target;
    isFocusing = false;

    cinematicState = null;
    preCinematicCamera = null;
    waveSpawnTimer = 0;

    if (skipToGame) {
        launchMissionGame(rocketObj.mission, rocketObj.target);
    }
}

cinematicSkipBtn.addEventListener('click', () => endCinematic(true));
document.addEventListener('keydown', (e) => {
    if (cinematicState && (e.key === 'Escape' || e.key === ' ')) {
        e.preventDefault();
        endCinematic(true);
    }
});

function updateCinematicLaunch(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.launch;
    const rocket = cs.rocketObj.mesh;

    const easeIn = progress * progress;
    const liftDist = easeIn * 8;
    rocket.position.copy(cs.earthPos).addScaledVector(cs.direction, liftDist);

    if (cs.elapsed < 0.5) {
        const jitter = (1 - cs.elapsed / 0.5) * 0.02;
        rocket.position.x += (Math.random() - 0.5) * jitter;
        rocket.position.z += (Math.random() - 0.5) * jitter;
    }

    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(up, cs.direction), 0.2
    );

    const camLookTarget = rocket.position.clone().add(cs.direction.clone().multiplyScalar(3));
    camera.lookAt(camLookTarget);

    if (cs.elapsed < 0.3) {
        const shakeAmt = 0.03 * (1 - cs.elapsed / 0.3);
        camera.position.x += (Math.random() - 0.5) * shakeAmt;
        camera.position.y += (Math.random() - 0.5) * shakeAmt;
    }

    if (cs.elapsed < 0.5) {
        waveSpawnTimer += dt;
        if (waveSpawnTimer >= 0.1) {
            waveSpawnTimer = 0;
            const basePos = rocket.position.clone().addScaledVector(cs.direction, -2);
            spawnEnergyWave(basePos, cs.direction);
            if (energyWaves.length > 0) {
                energyWaves[energyWaves.length - 1].mesh.material.color.set(0xff8800);
            }
        }
        updateEnergyWaves(dt);
    }

    const flameScale = 0.5 + progress * 1.5;
    cs.rocketObj.fireMesh.scale.set(1, flameScale * (0.7 + Math.random() * 0.6), 1);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => bf.scale.set(1, flameScale * (0.6 + Math.random() * 0.8), 1));
    }

    if (cs.elapsed >= PHASE_DURATIONS.launch) {
        clearEnergyWaves();
        cs.phase = 'ascent';
        cs.elapsed = 0;
    }
}

function updateCinematicAscent(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.ascent;
    const rocket = cs.rocketObj.mesh;

    const accelDist = 8 + progress * progress * 15;
    rocket.position.copy(cs.earthPos).addScaledVector(cs.direction, accelDist);

    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(up, cs.direction), 0.3
    );

    const right = new THREE.Vector3().crossVectors(cs.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const chaseCamOffset = cs.direction.clone().multiplyScalar(-6)
        .add(new THREE.Vector3(0, 3, 0))
        .add(right.clone().multiplyScalar(1.5));
    const desiredCamPos = rocket.position.clone().add(chaseCamOffset);
    camera.position.lerp(desiredCamPos, 0.08);
    camera.lookAt(rocket.position.clone().addScaledVector(cs.direction, 5));

    const flicker = 0.7 + Math.random() * 0.6;
    cs.rocketObj.fireMesh.scale.set(1, 2.0 * flicker, 1);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => bf.scale.set(1, 1.5 * (0.6 + Math.random() * 0.8), 1));
    }

    if (progress > 0.7) {
        const warpProgress = (progress - 0.7) / 0.3;
        cinematicFlash.style.opacity = String(warpProgress * 0.8);
        const shakeAmt = warpProgress * 0.05;
        camera.position.x += (Math.random() - 0.5) * shakeAmt;
        camera.position.y += (Math.random() - 0.5) * shakeAmt;
        updateStarStreaks(rocket.position, cs.direction, warpProgress * 0.5, 0.5 + warpProgress * 2);
        chromaticPass.enabled = true;
        chromaticPass.uniforms.intensity.value = warpProgress * 0.01;
        cs.rocketObj.fireMesh.material.color.lerp(new THREE.Color(0x4488ff), warpProgress * 0.5);
    }

    if (cs.elapsed >= PHASE_DURATIONS.ascent) {
        cs.phase = 'warp';
        cs.elapsed = 0;
        cinematicFlash.style.opacity = '0.8';
        setTimeout(() => { if (cinematicState && cinematicState.phase === 'warp') cinematicFlash.style.opacity = '0'; }, 200);
    }
}

function updateCinematicWarp(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.warp;
    const rocket = cs.rocketObj.mesh;

    const warpStart = cs.earthPos.clone().addScaledVector(cs.direction, 25);
    const warpEnd = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    rocket.position.lerpVectors(warpStart, warpEnd, progress);

    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(up, cs.direction));

    const right = new THREE.Vector3().crossVectors(cs.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const upDir = new THREE.Vector3().crossVectors(right, cs.direction).normalize();
    const sideDist = 8 + Math.sin(cs.elapsed * 2) * 1.5;
    const upDist = 2 + Math.sin(cs.elapsed * 1.3) * 1;
    const camPos = rocket.position.clone()
        .addScaledVector(right, sideDist)
        .addScaledVector(upDir, upDist)
        .addScaledVector(cs.direction, -2);
    camera.position.copy(camPos);
    camera.lookAt(rocket.position);

    updateStarStreaks(rocket.position, cs.direction, 0.9, 4 + Math.sin(cs.elapsed * 3) * 1);
    updateParticleTunnel(rocket.position, cs.direction, 0.8, dt);
    chromaticPass.uniforms.intensity.value = 0.012 + Math.sin(cs.elapsed * 4) * 0.003;
    motionBlurPass.enabled = true;
    motionBlurPass.uniforms.intensity.value = 0.003;
    motionBlurPass.uniforms.direction.value.set(0.5, 0.0);

    waveSpawnTimer += dt;
    if (waveSpawnTimer >= 0.3) {
        waveSpawnTimer = 0;
        spawnEnergyWave(rocket.position.clone(), cs.direction);
    }
    updateEnergyWaves(dt);

    const purpleShift = Math.sin(progress * Math.PI) * 0.3;
    tunnelMat.uniforms.color.value.setRGB(0.27 + purpleShift, 0.33, 1.0);

    // Scene-wide blue/purple tint via overlay
    const tintIntensity = Math.sin(progress * Math.PI) * 0.15;
    cinematicFlash.style.background = `rgba(40, 20, 120, ${tintIntensity})`;

    const flicker = 0.7 + Math.random() * 0.6;
    cs.rocketObj.fireMesh.scale.set(1, 2.5 * flicker, 1);
    cs.rocketObj.fireMesh.material.color.set(0x4488ff);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => {
            bf.scale.set(1, 2.0 * (0.6 + Math.random() * 0.8), 1);
            bf.material.color.set(0x3377ee);
        });
    }

    if (activeMission === cs.rocketObj) {
        const pct = Math.round(progress * 100);
        mlBar.style.width = pct + '%';
        mlPct.textContent = t('ui.percentComplete', { pct });
        const stepIdx = Math.min(Math.floor(progress / 0.33), cs.rocketObj.mission.steps.length - 2);
        if (stepIdx !== cs.rocketObj.lastStepShown) {
            cs.rocketObj.lastStepShown = stepIdx;
            mlFact.textContent = cs.rocketObj.mission.steps[stepIdx + 1] || cs.rocketObj.mission.steps[cs.rocketObj.mission.steps.length - 1];
            mlFact.className = 'ml-fact ml-fact-new';
            setTimeout(() => { mlFact.className = 'ml-fact'; }, 600);
        }
    }

    if (cs.elapsed >= PHASE_DURATIONS.warp) {
        cs.phase = 'warpExit';
        cs.elapsed = 0;
        cinematicFlash.style.opacity = '0.7';
        setTimeout(() => { if (cinematicState) cinematicFlash.style.opacity = '0'; }, 250);
    }
}

function updateCinematicWarpExit(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.warpExit;
    const rocket = cs.rocketObj.mesh;

    const nearTarget = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    rocket.position.copy(nearTarget);

    const shakeAmt = 0.04 * (1 - progress);
    camera.position.x += (Math.random() - 0.5) * shakeAmt;
    camera.position.y += (Math.random() - 0.5) * shakeAmt;

    const fadeOut = 1 - progress;
    updateStarStreaks(rocket.position, cs.direction, fadeOut * 0.9, 4 * fadeOut);
    updateParticleTunnel(rocket.position, cs.direction, fadeOut * 0.8, dt);
    chromaticPass.uniforms.intensity.value = 0.012 * fadeOut;
    motionBlurPass.uniforms.intensity.value = 0.003 * fadeOut;
    updateEnergyWaves(dt);

    // Fade out color tint
    cinematicFlash.style.background = `rgba(40, 20, 120, ${fadeOut * 0.15})`;

    cs.rocketObj.fireMesh.material.color.lerp(new THREE.Color(0xffaa00), progress);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => bf.material.color.lerp(new THREE.Color(0xff6600), progress));
    }

    if (progress >= 1) {
        cs.phase = 'deceleration';
        cs.elapsed = 0;
        chromaticPass.enabled = false;
        motionBlurPass.enabled = false;
    }
}

function updateCinematicDeceleration(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.deceleration;
    const rocket = cs.rocketObj.mesh;

    const easeOut = 1 - (1 - progress) * (1 - progress);
    const startPos = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    const endPos = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 2.5);
    rocket.position.lerpVectors(startPos, endPos, easeOut);

    const right = new THREE.Vector3().crossVectors(cs.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const sweepAngle = progress * Math.PI * 0.6;
    const camDist = 10;
    const camPos = rocket.position.clone()
        .addScaledVector(cs.direction, -camDist * Math.cos(sweepAngle))
        .addScaledVector(right, camDist * Math.sin(sweepAngle))
        .add(new THREE.Vector3(0, 3, 0));
    camera.position.copy(camPos);
    camera.lookAt(rocket.position);

    const reverseFlame = 1 - easeOut;
    cs.rocketObj.fireMesh.scale.set(1, reverseFlame * (0.7 + Math.random() * 0.6), 1);

    if (progress >= 1) {
        cs.phase = 'flyby';
        cs.elapsed = 0;
        missionLog.classList.add('hidden');
    }
}

function updateCinematicFlyby(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.flyby;
    const targetSize = cs.rocketObj.target.size || 4;

    const planetPos = new THREE.Vector3();
    cs.rocketObj.target.mesh.getWorldPosition(planetPos);

    const orbitRadius = targetSize * 3;
    const angle = progress * Math.PI * 2;
    const camX = planetPos.x + orbitRadius * Math.cos(angle);
    const camZ = planetPos.z + orbitRadius * Math.sin(angle);
    const camY = planetPos.y + orbitRadius * 0.4 * Math.sin(progress * Math.PI);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(planetPos);

    const rocketOpacity = Math.max(0, 1 - progress * 3);
    cs.rocketObj.mesh.traverse(child => {
        if (child.material && child.material.transparent) {
            child.material.opacity = rocketOpacity;
        }
    });

    // Fade out in last 15% of flyby
    if (progress > 0.85) {
        const fadeProgress = (progress - 0.85) / 0.15;
        cinematicFlash.style.background = 'black';
        cinematicFlash.style.opacity = String(fadeProgress);
    }

    if (progress >= 1) {
        // Brief hold on black, then transition
        cinematicFlash.style.opacity = '1';
        cinematicFlash.style.background = 'black';
        setTimeout(() => {
            cinematicFlash.style.opacity = '0';
            cinematicFlash.style.background = 'white';
        }, 300);
        endCinematic(true);
    }
}

function updateCinematic(dt) {
    if (!cinematicState) return;
    cinematicState.elapsed += dt;

    switch (cinematicState.phase) {
        case 'launch':       updateCinematicLaunch(dt); break;
        case 'ascent':       updateCinematicAscent(dt); break;
        case 'warp':         updateCinematicWarp(dt); break;
        case 'warpExit':     updateCinematicWarpExit(dt); break;
        case 'deceleration': updateCinematicDeceleration(dt); break;
        case 'flyby':        updateCinematicFlyby(dt); break;
    }
}

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

// --- BACKGROUND STARS ---

const starCount = 4000;
const starPos   = new Float32Array(starCount * 3);
const starCol   = new Float32Array(starCount * 3);
const starColors = [
    [1.0, 1.0, 1.0],   // white
    [0.85, 0.92, 1.0],  // blue-white
    [1.0, 0.97, 0.85],  // warm white
    [1.0, 0.88, 0.65],  // yellow
    [1.0, 0.75, 0.55],  // orange
    [1.0, 0.65, 0.35],  // deep orange (K-type giant)
    [1.0, 0.48, 0.28],  // orange-red (M-type giant)
    [1.0, 0.35, 0.22],  // red giant
];
for (let i = 0; i < starCount; i++) {
    const r   = 2000 + Math.random() * 3000;
    const phi = Math.acos(Math.random() * 2 - 1);
    const th  = Math.random() * Math.PI * 2;
    starPos[i*3]   = r * Math.sin(phi) * Math.cos(th);
    starPos[i*3+1] = r * Math.sin(phi) * Math.sin(th);
    starPos[i*3+2] = r * Math.cos(phi);
    const sc = starColors[Math.floor(Math.random() * starColors.length)];
    starCol[i*3] = sc[0]; starCol[i*3+1] = sc[1]; starCol[i*3+2] = sc[2];
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    map: starSpriteTex,
    size: 1.5,           // fixed pixel size — no blob scaling at any zoom level
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    alphaTest: 0.01,
    depthWrite: false,
    sizeAttenuation: false,  // stars are "infinitely far" — constant apparent size is correct
})));

// --- TEXTURE LOADER ---
const textureLoader = new THREE.TextureLoader();
const sunTex = textureLoader.load('/textures/sun/diffuse_4k.jpg');

// Equirectangular star panorama background
textureLoader.load('/textures/background/stars_milky_way_8k.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
});

// --- SUN ---
const sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
        sunMap: { value: sunTex },
        time: { value: 0.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D sunMap;
        uniform float time;
        varying vec2 vUv;
        void main() {
            vec2 uv1 = vUv + vec2(time * 0.02, time * 0.005);
            vec2 uv2 = vUv + vec2(-time * 0.012, time * 0.008);
            vec4 color1 = texture2D(sunMap, uv1);
            vec4 color2 = texture2D(sunMap, uv2);
            vec4 color = mix(color1, color2, 0.3);
            float pulse = 1.0 + 0.05 * sin(time * 2.0);
            gl_FragColor = color * pulse;
        }
    `,
});
sunTex.wrapS = THREE.RepeatWrapping;
sunTex.wrapT = THREE.RepeatWrapping;
const sun = new THREE.Mesh(new THREE.SphereGeometry(35, 128, 128), sunMaterial);
scene.add(sun);
let sunCurrentSize = 35;
let sunTargetSize = 35;
let sunCurrentGlow = 100;
let sunTargetGlow = 100;
let sunCurrentHalo = 160;
let sunTargetHalo = 160;

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
sunGlow.scale.set(100, 100, 1);
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
sunHalo.scale.set(160, 160, 1);
scene.add(sunHalo);

// Galaxy view camera target (kept for galaxy view toggle)
const GCENTER = new THREE.Vector3(12000, 6000, -22000);
const galaxyObjects = [];
/* Milky Way procedural system removed — replaced by equirectangular star panorama */


// Sun label
function createLabel(text, isLarge = false) {
    const div = document.createElement('div');
    div.className = 'planet-label' + (isLarge ? ' planet-label--large' : '');
    div.textContent = text;
    return new CSS2DObject(div);
}

const bodyLabels = []; // { el: HTMLElement, key: string }

function createBodyLabel(nameKey, isLarge = false) {
    const obj = createLabel(t(`bodies.${nameKey}`) || nameKey, isLarge);
    bodyLabels.push({ el: obj.element, key: nameKey });
    return obj;
}

const sunLabel = createBodyLabel('Sun', true);
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

    const materialOptions = {
        map: textureLoader.load(data.texture),
        roughness: data.roughness ?? 0.8,
        metalness: 0.0,
    };
    if (data.normalMap) {
        materialOptions.normalMap = textureLoader.load(data.normalMap);
        materialOptions.normalScale = new THREE.Vector2(1.0, 1.0);
    }
    if (data.bumpMap) {
        materialOptions.bumpMap = textureLoader.load(data.bumpMap);
        materialOptions.bumpScale = 0.5;
    }
    if (data.specularMap) {
        // Specular map: bright = reflective. Roughness map: bright = rough.
        // We need to invert the specular map via onBeforeCompile.
        materialOptions.roughness = 0.8;
        materialOptions.metalness = 0.1;
        const specTex = textureLoader.load(data.specularMap);
        materialOptions.roughnessMap = specTex;
        materialOptions.onBeforeCompile = (shader) => {
            // Invert roughness map sample so bright specular = low roughness (shiny oceans)
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <roughnessmap_fragment>',
                `float roughnessFactor = roughness;
                 #ifdef USE_ROUGHNESSMAP
                   vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
                   roughnessFactor *= (1.0 - texelRoughness.g);
                 #endif`
            );
        };
    }
    if (data.nightMap) {
        materialOptions.emissiveMap = textureLoader.load(data.nightMap);
        materialOptions.emissive = new THREE.Color(0xffcc88);
        materialOptions.emissiveIntensity = 0.3;
    }

    const segments = data.size >= 7 ? 128 : 64;
    const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, segments, segments),
        new THREE.MeshStandardMaterial(materialOptions)
    );
    planetMesh.position.x = data.distance;
    planetMesh.userData = { name: data.name, size: data.size };
    // Apply axial tilt — ZYX order so tilt (Z) is applied before spin (Y)
    if (data.axialTilt) {
        planetMesh.rotation.order = 'ZYX';
        planetMesh.rotation.z = data.axialTilt;
    }
    orbitPivot.add(planetMesh);
    allClickable.push({ mesh: planetMesh, name: data.name, size: data.size });

    // Cloud layer
    let cloudMesh = null;
    if (data.cloudMap) {
        const cloudTex = textureLoader.load(data.cloudMap);
        cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(data.size * 1.01, 128, 128),
            new THREE.MeshStandardMaterial({
                map: cloudTex,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                roughness: 1.0,
                metalness: 0.0,
            })
        );
        planetMesh.add(cloudMesh);
    }

    // Atmosphere glow (Fresnel-based)
    if (data.hasAtmosphere) {
        const atmosphereGeo = new THREE.SphereGeometry(data.size * 1.025, 128, 128);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vec3 viewDir = normalize(-vPosition);
                    float fresnel = 1.0 - dot(viewDir, vNormal);
                    fresnel = pow(fresnel, 3.0) * intensity;
                    gl_FragColor = vec4(glowColor, fresnel);
                }
            `,
            uniforms: {
                glowColor: { value: new THREE.Color(data.atmosphereColor) },
                intensity: { value: 1.2 },
            },
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        planetMesh.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));
    }

    // Planet Label
    const label = createBodyLabel(data.name);
    label.position.set(0, data.size + 3, 0);
    planetMesh.add(label);

    // Orbit Line — elliptical when eccentricity > 0
    const e = data.eccentricity || 0;
    let orbitLine;
    if (e > 0.001) {
        const a = data.distance;
        const b = a * Math.sqrt(1 - e * e);
        const c = a * e; // focus offset from center
        const orbitPoints = [];
        for (let i = 0; i <= 200; i++) {
            const theta = (i / 200) * Math.PI * 2;
            // Ellipse centered at (-c, 0) so Sun is at focus (0, 0)
            orbitPoints.push(new THREE.Vector3(
                -c + a * Math.cos(theta),
                0,
                b * Math.sin(theta)
            ));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        orbitLine = new THREE.Line(orbitGeo,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 })
        );
        inclinationGroup.add(orbitLine);
    } else {
        const orbitPoints = [];
        for (let i = 0; i <= 200; i++) {
            const theta = (i / 200) * Math.PI * 2;
            orbitPoints.push(new THREE.Vector3(
                data.distance * Math.cos(theta),
                0,
                data.distance * Math.sin(theta)
            ));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        orbitLine = new THREE.Line(orbitGeo,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 })
        );
        inclinationGroup.add(orbitLine);
    }

    if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(data.size * 1.2, data.size * 2.2, 128);
        // Fix UV mapping for ring — map U from inner to outer radius
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        const center = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            const len = v.sub(center).length();
            const t = (len - data.size * 1.2) / (data.size * 1.0);
            uv.setXY(i, t, uv.getY(i));
        }

        const ringTex = textureLoader.load(data.ringTexture);
        const ringMat = new THREE.MeshStandardMaterial({
            map: ringTex,
            side: THREE.DoubleSide,
            transparent: true,
            roughness: 0.8,
            metalness: 0.0,
            depthWrite: false,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;

        const ringGroup = new THREE.Group();
        ringGroup.add(ringMesh);
        ringGroup.rotation.z = 0; // axial tilt now applied to planet mesh
        planetMesh.add(ringGroup);
    }

    // Moons
    const moons = [];
    if (data.moons) {
        data.moons.forEach(m => {
            const moonPivot = new THREE.Group();
            planetMesh.add(moonPivot);

            const moonMatOptions = {
                map: textureLoader.load(m.texture),
                roughness: 0.85,
                metalness: 0.0,
            };
            if (m.normalMap) {
                moonMatOptions.normalMap = textureLoader.load(m.normalMap);
                moonMatOptions.normalScale = new THREE.Vector2(1.0, 1.0);
            }
            if (m.bumpMap) {
                moonMatOptions.bumpMap = textureLoader.load(m.bumpMap);
                moonMatOptions.bumpScale = 0.5;
            }
            const mMesh = new THREE.Mesh(
                new THREE.SphereGeometry(m.size, 64, 64),
                new THREE.MeshStandardMaterial(moonMatOptions)
            );
            mMesh.position.x = m.distance + data.size;
            mMesh.userData = { name: m.name, size: m.size };
            moonPivot.add(mMesh);
            allClickable.push({ mesh: mMesh, name: m.name, size: m.size });

            if (m.isSyncFocus) {
                const marker = new THREE.Mesh(
                    new THREE.RingGeometry(0.2, 0.3, 32),
                    new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide })
                );
                marker.position.z = m.size + 0.01;
                mMesh.add(marker);

                const moonLabel = createBodyLabel(m.name);
                moonLabel.position.set(0, m.size + 2, 0);
                mMesh.add(moonLabel);
            }

            moons.push({ mesh: mMesh, pivot: moonPivot, data: m });
        });
    }

    planets.push({ mesh: planetMesh, orbitPivot, data, moons, cloudMesh });

    // Runtime scale state for mode transitions
    const planetEntry = planets[planets.length - 1];
    planetEntry.currentSize = data.size;
    planetEntry.currentDistance = data.distance;
    planetEntry.targetSize = data.size;
    planetEntry.targetDistance = data.distance;
    planetEntry._activeDistance = data.distance;
    planetEntry.orbitLine = orbitLine;
    planetEntry.inclinationGroup = inclinationGroup;
});

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
camera.position.set(0, 1000, 500);
controls.update();

// --- CLICK-TO-FOCUS ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let focusTarget = null;    // active during fly-in animation
let lockedTarget = null;   // persists to keep tracking the planet
let isFocusing = false;
let focusOrbitDist = 50;
const planetNav = document.getElementById('planet-nav');
const navLabel = document.getElementById('nav-label');
const navDots = planetNav.querySelectorAll('.nav-dot');

navDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const planetName = dot.dataset.planet;

        // If clicking already-focused planet, unfocus
        if (lockedTarget && lockedTarget.name === planetName) {
            lockedTarget = null;
            isFocusing = false;
            navDots.forEach(d => d.classList.remove('active'));
            navLabel.textContent = '';
            if (infoCard) infoCard.classList.add('hidden');
            controls.target.set(0, 0, 0);
            return;
        }

        // Find the matching clickable entry
        const entry = allClickable.find(c => c.name === planetName);
        if (entry) {
            focusOn(entry);
            renderCard(planetName);
            if (infoCard) infoCard.classList.remove('hidden');
        }
    });
});

// Info Card DOM elements
const infoCard = document.getElementById('planet-info-card');
const launchBtn = document.getElementById('launch-btn');

function renderCard(name) {
    const i18nData = tf(name, 'type') ? {
        type: tf(name, 'type'),
        fact: tf(name, 'fact'),
        gravity: tf(name, 'gravity'),
        day: tf(name, 'day'),
        year: tf(name, 'year'),
        temp: tf(name, 'temp'),
        details: tf(name, 'details'),
        wow: tf(name, 'wow'),
        emoji: tf(name, 'emoji'),
        ministats: tf(name, 'ministats'),
        statPills: tf(name, 'statPills'),
        wowStrip: tf(name, 'wowStrip'),
        learn: tf(name, 'learn'),
        explore: tf(name, 'explore'),
        game: tf(name, 'game'),
    } : null;
    const data = i18nData || celestialFacts[name] || {
        type: t('ui.celestialBody'), emoji: '⭐',
        fact: t('ui.fallbackFact'),
        ministats: [], statPills: [], wowStrip: '',
        learn: [], explore: {}
    };

    document.getElementById('info-emoji').textContent = data.emoji || '⭐';
    document.getElementById('info-name').textContent = name;
    document.getElementById('info-type').textContent = data.type;
    document.getElementById('info-ministats').innerHTML =
        (data.ministats || []).map(s => `<span class="mini-stat">${s}</span>`).join('');
    document.getElementById('info-fact').innerHTML = data.fact;
    document.getElementById('info-statpills').innerHTML =
        (data.statPills || []).map(s => `<div class="stat-pill">${s}</div>`).join('');
    document.getElementById('info-wow').innerHTML = data.wowStrip || data.wow || '';
    document.getElementById('info-questions').innerHTML =
        (data.learn || []).map(q => {
            const safeClass = (q.cls || '').replace(/[^a-z0-9-]/gi, '');
            return `
            <div class="q-card ${safeClass}">
                <div class="q-header">
                    <span class="q-label">${q.q}</span>
                    <span class="q-chevron">▼</span>
                </div>
                <div class="q-body">${q.a}</div>
            </div>
        `;
        }).join('');

    const explore = data.explore || {};
    document.getElementById('info-mission-name').textContent = explore.mission || '';
    document.getElementById('info-mission-discovery').innerHTML = explore.discovery || '';
    document.getElementById('info-scale').innerHTML = explore.scale || '';
    document.getElementById('info-whatif').innerHTML = explore.whatif || '';

    if (name === 'Earth' || name === 'Sun') {
        launchBtn.classList.add('hidden');
    } else {
        const missions = getMissionsForTarget(name);
        launchBtn.textContent = missions && missions.length > 1
            ? t('ui.chooseMissionCount', { count: missions.length })
            : t('ui.launchMission');
        launchBtn.classList.remove('hidden');
    }

    switchCardTab('overview');
    // Reset to default corner position on each open
    infoCard.style.left = '';
    infoCard.style.top = '';
    infoCard.style.right = '25px';
    infoCard.style.bottom = '25px';
    infoCard.classList.remove('hidden');
}

function switchCardTab(tabName) {
    document.querySelectorAll('#planet-info-card .tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#card-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('tab-' + tabName);
    const btn = document.querySelector(`#card-tabs [data-tab="${tabName}"]`);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}

// Delegated tab switching
document.getElementById('card-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) switchCardTab(btn.dataset.tab);
});

// Delegated question expand/collapse
document.getElementById('tab-learn').addEventListener('click', e => {
    const card = e.target.closest('.q-card');
    if (card) card.classList.toggle('open');
});

// Close button - also unfocus the planet
document.getElementById('info-card-close').addEventListener('click', () => {
    infoCard.classList.add('hidden');
    // Clear focus state
    lockedTarget = null;
    focusTarget = null;
    isFocusing = false;
    // Reset camera to default view
    navDots.forEach(d => d.classList.remove('active'));
    navLabel.textContent = '';
});

// Drag to move
(function () {
    const handle = document.getElementById('card-drag-handle');
    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    handle.addEventListener('mousedown', e => {
        if (e.target.closest('.card-close-btn')) return;
        dragging = true;
        const rect = infoCard.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        startX = e.clientX;
        startY = e.clientY;
        infoCard.style.right = 'auto';
        infoCard.style.bottom = 'auto';
        infoCard.style.left = origLeft + 'px';
        infoCard.style.top = origTop + 'px';
        infoCard.classList.add('is-dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        infoCard.style.left = (origLeft + dx) + 'px';
        infoCard.style.top  = (origTop  + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        infoCard.classList.remove('is-dragging');
    });
})();

function focusOn(meshEntry) {
    lockedTarget = meshEntry;
    focusTarget = meshEntry;
    isFocusing = true;
    focusOrbitDist = meshEntry.size * 6 + 20;

    navDots.forEach(d => d.classList.remove('active'));
    const activeDot = planetNav.querySelector(`.nav-dot[data-planet="${meshEntry.name}"]`);
    if (activeDot) { activeDot.classList.add('active'); navLabel.textContent = meshEntry.name; }

    renderCard(meshEntry.name);
}

const activeRockets = [];

function createRocket(accentColor = 0xff4444) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xf0f4ff, roughness: 0.25, metalness: 0.3 })
    );
    group.add(body);
    // Nose cone in mission color
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3 })
    );
    nose.position.y = 1.6;
    group.add(nose);
    // Side boosters
    [-1, 1].forEach(side => {
        const booster = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 1.4, 8),
            new THREE.MeshStandardMaterial({ color: 0xddddee, roughness: 0.4 })
        );
        booster.position.set(side * 0.55, -0.3, 0);
        group.add(booster);
    });
    // Exhaust flame (main)
    const fireMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.4, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    fireMesh.position.y = -1.8;
    fireMesh.rotation.x = Math.PI;
    group.add(fireMesh);
    // Booster flames
    [-1, 1].forEach(side => {
        const bf = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.7, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
        );
        bf.position.set(side * 0.55, -1.2, 0);
        bf.rotation.x = Math.PI;
        group.add(bf);
        group.boosterFlames = group.boosterFlames || [];
        group.boosterFlames.push(bf);
    });
    group.fireMesh = fireMesh;
    return group;
}

// ---- Mission Picker ----
const missionPicker = document.getElementById('mission-picker');
const missionPickerSubtitle = document.getElementById('mission-picker-subtitle');
const missionCards = document.getElementById('mission-cards');
const missionPickerClose = document.getElementById('mission-picker-close');
const countdownOverlay = document.getElementById('countdown-overlay');
const cdMission = document.getElementById('cd-mission');
const cdNumber = document.getElementById('cd-number');
const cdLabel = document.getElementById('cd-label');
const missionLog = document.getElementById('mission-log');
const mlEmoji = document.getElementById('ml-emoji');
const mlName = document.getElementById('ml-name');
const mlAgency = document.getElementById('ml-agency');
const mlTarget = document.getElementById('ml-target');
const mlBar = document.getElementById('ml-bar');
const mlPct = document.getElementById('ml-pct');
const mlFact = document.getElementById('ml-fact');
const arrivalPanel = document.getElementById('arrival-panel');
const arrEmoji = document.getElementById('arr-emoji');
const arrMission = document.getElementById('arr-mission');
const arrDiscovery = document.getElementById('arr-discovery');
const arrFunfact = document.getElementById('arr-funfact');
const arrClose = document.getElementById('arr-close');

let activeMission = null; // the currently in-flight mission object

function showMissionPicker(target) {
    const missions = getMissionsForTarget(target.name);
    if (!missions || missions.length === 0) return;
    missionPickerSubtitle.textContent = t('ui.destination', { name: target.name });
    missionCards.innerHTML = '';
    missions.forEach(m => {
        const statusLabel = m.status === 'active' ? t('ui.active') : m.status === 'planned' ? t('ui.planned') : t('ui.historical');
        const card = document.createElement('div');
        card.className = 'mission-card';
        card.innerHTML = `
            <div class="mc-top">
                <span class="mc-emoji">${m.emoji}</span>
                <div class="mc-info">
                    <div class="mc-name">${m.name}</div>
                    <div class="mc-meta">${m.type} &bull; ${m.year}</div>
                </div>
                <span class="mc-status">${statusLabel}</span>
            </div>
            <div class="mc-agency">🏛 ${m.agency} &bull; 🚀 ${m.rocket}</div>
            <div class="mc-goal">${m.steps[0]}</div>
            <button class="mc-launch-btn">Launch! 🚀</button>
        `;
        card.querySelector('.mc-launch-btn').textContent = t('ui.launchBang');
        card.querySelector('.mc-launch-btn').addEventListener('click', () => {
            hideMissionPicker();
            startCountdown(m, target);
        });
        missionCards.appendChild(card);
    });
    missionPicker.classList.remove('hidden');
}

function hideMissionPicker() {
    missionPicker.classList.add('hidden');
}

missionPickerClose.addEventListener('click', hideMissionPicker);

function startCountdown(mission, target) {
    countdownOverlay.classList.remove('hidden');
    cdMission.textContent = `${mission.emoji} ${mission.name}`;
    cdLabel.textContent = t('ui.launchingTo', { name: target.name });
    let n = 3;
    cdNumber.textContent = n;
    cdNumber.className = 'cd-number cd-pop';
    const tick = setInterval(() => {
        n--;
        if (n > 0) {
            cdNumber.textContent = n;
            cdNumber.className = 'cd-number';
            void cdNumber.offsetWidth;
            cdNumber.className = 'cd-number cd-pop';
        } else {
            cdNumber.textContent = '🚀';
            cdLabel.textContent = t('ui.liftoff');
            cdNumber.className = 'cd-number cd-liftoff';
            clearInterval(tick);
            setTimeout(() => {
                countdownOverlay.classList.add('hidden');
                doLaunch(mission, target);
            }, 900);
        }
    }, 800);
}

function doLaunch(mission, target) {
    const earthEntry = allClickable.find(c => c.name === 'Earth');
    if (!earthEntry) return;

    const rocket = createRocket(mission.color);
    const earthPos = new THREE.Vector3();
    earthEntry.mesh.getWorldPosition(earthPos);
    rocket.position.copy(earthPos);
    scene.add(rocket);

    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({ color: mission.color, transparent: true, opacity: 0.5 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    const targetPos = new THREE.Vector3();
    target.mesh.getWorldPosition(targetPos);
    const totalDist = earthPos.distanceTo(targetPos);

    const rocketObj = {
        mesh: rocket,
        target,
        mission,
        missionName: mission.name,
        fireMesh: rocket.fireMesh,
        trailGeo,
        trailLine,
        points: [earthPos.clone()],
        totalDist,
        distTraveled: 0,
        lastStepShown: -1,
    };
    activeRockets.push(rocketObj);
    activeMission = rocketObj;

    // Show mission log
    mlEmoji.textContent = mission.emoji;
    mlName.textContent = mission.name;
    mlAgency.textContent = mission.agency;
    mlTarget.textContent = target.name;
    mlBar.style.width = '0%';
    mlPct.textContent = t('ui.percentComplete', { pct: '0' });
    mlFact.textContent = mission.steps[0];
    missionLog.classList.remove('hidden');

    launchBtn.classList.add('hidden');
    // Start cinematic sequence
    startCinematic(rocketObj);
}

// --- MISSION MINI-GAME ---

let activeGameTimer = null;
let activeGameFrame = null;
let activeGameCleanup = null;

function hideMissionGame() {
    document.getElementById('mission-game-overlay').classList.add('hidden');
    ['mg-gauntlet', 'mg-hazard', 'mg-control', 'mg-slingshot', 'mg-docking', 'mg-asteroid-nav', 'mg-memory', 'mg-lander', 'mg-howtoplay', 'mg-gameover'].forEach(id =>
        document.getElementById(id).classList.add('hidden'));
    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    if (activeGameFrame) { cancelAnimationFrame(activeGameFrame); activeGameFrame = null; }
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
}

// --- HOW TO PLAY DEFINITIONS ---
const HOW_TO_PLAY = {
    slingshot: {
        icon: '🌌',
        title: 'Gravity Slingshot',
        steps: [
            { icon: '👆', text: '<strong>Drag from the yellow probe</strong> — pull back like a slingshot to set direction and power.' },
            { icon: '🪐', text: '<strong>Use planet gravity</strong> — fly near the glowing planets to curve your trajectory.' },
            { icon: '🎯', text: '<strong>Hit the green target</strong> on the right edge. You have 3 attempts.' },
            { icon: '💡', text: 'The dotted line shows your predicted path — adjust your aim before releasing!' },
        ],
    },
    docking: {
        icon: '🛸',
        title: 'Space Docking',
        steps: [
            { icon: '🚀', text: '<strong>Your ship is drifting in zero-g</strong> — gravity pulls it down toward the planet.' },
            { icon: '🔼', text: '<strong>Thrust UP</strong>: hold the bottom half of the screen, or press <strong>Space / ↑</strong>.' },
            { icon: '◀▶', text: '<strong>Steer left/right</strong>: tap the left or right edge of the screen, or press <strong>← →</strong>.' },
            { icon: '🟢', text: '<strong>Dock gently</strong> — align with the blinking port on the station and arrive slowly. Too fast = crash!' },
        ],
    },
    asteroidNav: {
        icon: '☄️',
        title: 'Asteroid Field',
        steps: [
            { icon: '🛸', text: 'Your ship flies <strong>automatically</strong> through 5 lanes. Asteroids come from the right.' },
            { icon: '👆', text: '<strong>Tap the top half</strong> to move up, <strong>tap the bottom half</strong> to move down. Or swipe up/down.' },
            { icon: '⌨️', text: 'On desktop use <strong>↑ ↓ arrow keys</strong> or <strong>W / S</strong>.' },
            { icon: '⭐', text: 'Collect <strong>stars</strong> for bonus points. You have 3 shields — survive 25 seconds to win!' },
        ],
    },
    memory: {
        icon: '🧠',
        title: 'Orbital Memory',
        steps: [
            { icon: '🔄', text: '10 cards orbit around the center — they keep <strong>moving while you play!</strong>' },
            { icon: '👆', text: '<strong>Tap a card</strong> to flip it and reveal its symbol.' },
            { icon: '🎯', text: 'Tap a <strong>second card</strong> — if symbols match, they stay revealed. If not, both flip back.' },
            { icon: '⏱️', text: 'Match all <strong>5 pairs</strong> before the timer runs out. Track the cards as they orbit!' },
        ],
    },
    lander: {
        icon: '🚀',
        title: 'Lunar Lander',
        steps: [
            { icon: '🌍', text: 'Your lander falls under <strong>planet gravity</strong> — each world pulls differently!' },
            { icon: '🔥', text: '<strong>Thrust UP</strong>: hold the bottom half of the screen, or hold <strong>Space / ↑</strong>.' },
            { icon: '◀▶', text: '<strong>Steer</strong>: tap left/right edges of screen, or press <strong>← →</strong> keys.' },
            { icon: '🟢', text: 'Land <strong>gently on the green zone</strong>. Watch your speed — if you hit too fast, you crash!' },
        ],
    },
};

function showHowToPlay(type, onStart) {
    const htp = HOW_TO_PLAY[type];
    if (!htp) { onStart(); return; }

    const el = document.getElementById('mg-howtoplay');
    document.getElementById('mg-htp-icon').textContent = htp.icon;
    document.getElementById('mg-htp-title').textContent = htp.title;
    document.getElementById('mg-htp-steps').innerHTML = htp.steps.map(s =>
        `<div class="mg-htp-step">
            <div class="mg-htp-step-icon">${s.icon}</div>
            <div class="mg-htp-step-text">${s.text}</div>
        </div>`
    ).join('');

    el.classList.remove('hidden');

    const btn = document.getElementById('mg-htp-btn');
    const handler = () => {
        btn.removeEventListener('click', handler);
        el.classList.add('hidden');
        onStart();
    };
    btn.addEventListener('click', handler);
}

function showInlineGameOver(mission, target, gameData, onRetry) {
    // Stop any running game
    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    if (activeGameFrame) { cancelAnimationFrame(activeGameFrame); activeGameFrame = null; }
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }

    // Hide all game sections
    ['mg-gauntlet', 'mg-hazard', 'mg-control', 'mg-slingshot', 'mg-docking', 'mg-asteroid-nav', 'mg-memory', 'mg-lander'].forEach(id =>
        document.getElementById(id).classList.add('hidden'));

    const el = document.getElementById('mg-gameover');
    document.getElementById('mg-go-reason').textContent = gameData.failReason || 'The mission could not be completed.';
    document.getElementById('mg-go-fact').innerHTML = `<strong>Real fact:</strong> ${gameData.realFact || ''}`;
    el.classList.remove('hidden');

    const retryBtn = document.getElementById('mg-go-retry');
    const quitBtn  = document.getElementById('mg-go-quit');

    const cleanup = () => {
        retryBtn.removeEventListener('click', retryHandler);
        quitBtn.removeEventListener('click', quitHandler);
    };

    const retryHandler = () => {
        cleanup();
        el.classList.add('hidden');
        onRetry();
    };
    const quitHandler = () => {
        cleanup();
        hideMissionGame();
        if (lockedTarget && lockedTarget.name !== 'Earth' && lockedTarget.name !== 'Sun') {
            launchBtn.classList.remove('hidden');
        }
    };

    retryBtn.addEventListener('click', retryHandler);
    quitBtn.addEventListener('click', quitHandler);
}

function launchMissionGame(mission, target) {
    const gameData = (tf(target.name, 'game') && tf(target.name, 'game') !== `celestialFacts.${target.name}.game`)
        ? tf(target.name, 'game')
        : (celestialFacts[target.name] && celestialFacts[target.name].game);
    if (!gameData) { onGameSuccess(mission, target); return; }

    document.getElementById('mg-mission-label').textContent = `${mission.emoji} ${mission.name} → ${target.name}`;

    const types = ['slingshot', 'docking', 'asteroidNav', 'memory', 'lander'];
    const type = types[Math.floor(Math.random() * types.length)];

    const badges = {
        slingshot: '🌌 Gravity Slingshot',
        docking: '🛸 Space Docking',
        asteroidNav: '☄️ Asteroid Field',
        memory: '🧠 Orbital Memory',
        lander: '🚀 Lunar Lander',
    };
    document.getElementById('mg-type-badge').textContent = badges[type] || type;

    document.getElementById('mission-game-overlay').classList.remove('hidden');

    function startGame() {
        if (type === 'slingshot')        runSlingshot(mission, target, gameData);
        else if (type === 'docking')     runDocking(mission, target, gameData);
        else if (type === 'asteroidNav') runAsteroidNav(mission, target, gameData);
        else if (type === 'memory')      runOrbitalMemory(mission, target, gameData);
        else                             runLander(mission, target, gameData);
    }

    showHowToPlay(type, startGame);
}

function onGameSuccess(mission, target) {
    hideMissionGame();
    arrEmoji.textContent = mission.emoji;
    arrMission.textContent = t('ui.arrivedAt', { name: mission.name, name2: target.name });
    arrDiscovery.textContent = '🔭 ' + mission.discovery;
    arrFunfact.textContent = mission.funFact;
    arrivalPanel.classList.remove('hidden');
}

function onGameFail(mission, target, gameData) {
    // Determine which game type is currently running so retry re-uses same type
    const runnerMap = {
        'mg-slingshot':     () => runSlingshot(mission, target, gameData),
        'mg-docking':       () => runDocking(mission, target, gameData),
        'mg-asteroid-nav':  () => runAsteroidNav(mission, target, gameData),
        'mg-memory':        () => runOrbitalMemory(mission, target, gameData),
        'mg-lander':        () => runLander(mission, target, gameData),
    };
    const activeKey = Object.keys(runnerMap).find(id => !document.getElementById(id).classList.contains('hidden'));
    const runner = runnerMap[activeKey];

    showInlineGameOver(mission, target, gameData, () => {
        if (runner) runner();
        else launchMissionGame(mission, target);
    });
}

// --- GAUNTLET ---

function runGauntlet(mission, target, gameData) {
    document.getElementById('mg-gauntlet').classList.remove('hidden');

    // Pick 4 random stages from pool (no repeats)
    const pool = [...gameData.stages];
    const stages = [];
    for (let i = 0; i < Math.min(4, pool.length); i++) {
        const idx = Math.floor(Math.random() * pool.length);
        stages.push(...pool.splice(idx, 1));
    }

    function showStage(i) {
        if (i >= stages.length) { onGameSuccess(mission, target); return; }

        const stage = stages[i];

        document.getElementById('mg-stage-track').innerHTML =
            stages.map((_, j) =>
                `<div class="stage-dot ${j < i ? 'done' : j === i ? 'active' : ''}"></div>`
            ).join('');

        document.getElementById('mg-stage-title').textContent = t('ui.stageTitle', { icon: stage.icon, i: i + 1, name: stage.name });
        document.getElementById('mg-stage-prompt').textContent = stage.prompt;
        document.getElementById('mg-timer-text').textContent = '';

        ['mg-timing-wrap', 'mg-choice-wrap', 'mg-tap-wrap'].forEach(id =>
            document.getElementById(id).classList.add('hidden'));

        if (stage.type === 'timing') runTimingStage(stage, i, mission, target, gameData, showStage);
        else if (stage.type === 'choice') runChoiceStage(stage, i, mission, target, gameData, showStage);
        else if (stage.type === 'tap') runTapStage(stage, i, mission, target, gameData, showStage);
    }

    showStage(0);
}

function runTimingStage(stage, stageIdx, mission, target, gameData, showStage) {
    document.getElementById('mg-timing-wrap').classList.remove('hidden');

    // Zone shrinks per stage: 22% → 19% → 16% → 13%
    const zoneWidth = Math.max(13, 22 - stageIdx * 3);
    const zoneLeft = 5 + Math.random() * (88 - zoneWidth);

    const zone = document.getElementById('mg-bar-zone');
    zone.style.width = zoneWidth + '%';
    zone.style.left = zoneLeft + '%';

    // Needle speeds up per stage: 1.6s → 1.4s → 1.2s → 1.0s
    const duration = Math.max(1.0, 1.6 - stageIdx * 0.2);
    const needle = document.getElementById('mg-bar-needle');
    needle.style.animation = 'none';
    needle.offsetHeight; // force reflow to restart animation
    needle.style.animation = `needleSweep ${duration}s linear infinite`;

    let fired = false;
    const fireBtn = document.getElementById('mg-fire-btn');

    const handler = () => {
        if (fired) return;
        fired = true;
        fireBtn.removeEventListener('click', handler);

        const trackRect = needle.parentElement.getBoundingClientRect();
        const needleRect = needle.getBoundingClientRect();
        const needlePct = ((needleRect.left - trackRect.left) / trackRect.width) * 100;

        needle.style.animation = 'none';
        if (needlePct >= zoneLeft && needlePct <= zoneLeft + zoneWidth) {
            setTimeout(() => showStage(stageIdx + 1), 350);
        } else {
            onGameFail(mission, target, gameData);
        }
    };

    fireBtn.addEventListener('click', handler);
    activeGameCleanup = () => fireBtn.removeEventListener('click', handler);
}

function runChoiceStage(stage, stageIdx, mission, target, gameData, showStage) {
    document.getElementById('mg-choice-wrap').classList.remove('hidden');

    const choicesEl = document.getElementById('mg-choices');
    choicesEl.innerHTML = stage.options.map((opt, i) =>
        `<button type="button" class="mg-choice-btn" data-idx="${i}">${opt}</button>`
    ).join('');

    const TIMER_MS = 5000;
    const start = Date.now();
    let done = false;

    const fill = document.getElementById('mg-timer-fill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    fill.offsetHeight;
    fill.style.transition = `width ${TIMER_MS / 1000}s linear`;
    fill.style.width = '0%';

    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    activeGameTimer = setInterval(() => {
        if (done) return;
        const remaining = Math.max(0, Math.ceil((TIMER_MS - (Date.now() - start)) / 1000));
        document.getElementById('mg-timer-text').textContent = `${remaining}s`;
        if (Date.now() - start >= TIMER_MS) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
        }
    }, 200);

    const clickHandler = e => {
        const btn = e.target.closest('.mg-choice-btn');
        if (!btn || done) return;
        done = true;
        clearInterval(activeGameTimer);
        activeGameTimer = null;
        choicesEl.removeEventListener('click', clickHandler);
        const idx = parseInt(btn.dataset.idx);
        if (idx === stage.correct) {
            setTimeout(() => showStage(stageIdx + 1), 350);
        } else {
            onGameFail(mission, target, gameData);
        }
    };
    choicesEl.addEventListener('click', clickHandler);
    activeGameCleanup = () => choicesEl.removeEventListener('click', clickHandler);
}

function runTapStage(stage, stageIdx, mission, target, gameData, showStage) {
    document.getElementById('mg-tap-wrap').classList.remove('hidden');

    const required = stage.taps || 8;
    let taps = 0;
    let done = false;
    const TIMER_MS = 6000;
    const start = Date.now();

    const countEl = document.getElementById('mg-tap-count');
    countEl.textContent = `0/${required}`;

    const fill = document.getElementById('mg-timer-fill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    fill.offsetHeight;
    fill.style.transition = `width ${TIMER_MS / 1000}s linear`;
    fill.style.width = '0%';

    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    activeGameTimer = setInterval(() => {
        if (done) return;
        const remaining = Math.max(0, Math.ceil((TIMER_MS - (Date.now() - start)) / 1000));
        document.getElementById('mg-timer-text').textContent = `${remaining}s`;
        if (Date.now() - start >= TIMER_MS) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
        }
    }, 200);

    const tapBtn = document.getElementById('mg-tap-btn');
    const tapHandler = () => {
        if (done) return;
        taps++;
        countEl.textContent = `${taps}/${required}`;
        if (taps >= required) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            tapBtn.removeEventListener('click', tapHandler);
            setTimeout(() => showStage(stageIdx + 1), 350);
        }
    };
    tapBtn.addEventListener('click', tapHandler);
    activeGameCleanup = () => tapBtn.removeEventListener('click', tapHandler);
}

// --- HAZARD RUN ---

const HAZARD_EMOJIS = {
    asteroid: '☄️', radiation_band: '⚡', storm_swirl: '🌀',
    acid_cloud: '☁️', dust_devil: '🌪️', rock: '🪨', canyon_edge: '🏔️',
    loose_debris: '🔧', loose_rock: '🪨', dust_plume: '💨', micro_debris: '🔩',
    ice_shard: '🧊', water_plume: '💧', radiation_belt: '☢️',
    magnetic_storm: '🧲', radiation_flux: '☢️', debris: '🔧',
    ancient_debris: '☄️', boulder: '🪨', crater_ejecta: '💥',
    ring_particle: '💍', moonlet: '🌑', ice_chunk: '❄️',
    methane_cloud: '🌫️', ice_particle: '❄️', wind_shear: '💨',
    ring_debris: '💍', magnetic_anomaly: '🧲',
    ice_crystal: '❄️', canyon_wall: '🏔️', surface_debris: '🔧',
    storm_band: '🌀', volcanic_plume: '🌋', lava_ejection: '🔥',
    sulfur_cloud: '🟡', solar_flare: '☀️', radiation_burst: '⚡',
    plasma_wave: '🌊', solar_radiation: '☀️', pressure_wave: '💨',
    lightning: '⚡', dust_cloud: '💨', nitrogen_geyser: '💨',
    ice_debris: '❄️', cryogenic_plume: '❄️',
};

function runHazardRun(mission, target, gameData) {
    document.getElementById('mg-hazard').classList.remove('hidden');

    const canvas = document.getElementById('mg-canvas');
    const ctx = canvas.getContext('2d');
    const CW = canvas.width;   // 370
    const CH = canvas.height;  // 170
    const LANES_Y = [CH * 0.2, CH * 0.5, CH * 0.8];
    const DURATION_MS = 20000;
    const hazardTypes = (gameData.hazards && gameData.hazards.length)
        ? gameData.hazards
        : ['asteroid', 'debris', 'radiation_band'];

    let lane = 1;
    let lives = 3;
    let invincible = false;
    let obstacles = [];
    let done = false;
    let startTime = Date.now();
    let lastSpawn = 0;

    function updateLives() {
        document.getElementById('mg-lives').textContent = '🟢'.repeat(lives) + '⚫'.repeat(3 - lives);
    }
    updateLives();

    function spawnObstacle() {
        const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        obstacles.push({
            x: CW + 24,
            lane: Math.floor(Math.random() * 3),
            emoji: HAZARD_EMOJIS[type] || '☄️',
        });
    }

    function gameLoop() {
        if (done) return;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
        document.getElementById('mg-hazard-timer').textContent = `${remaining}s`;

        // Speed increases every 5 seconds
        const speed = 2 + Math.floor(elapsed / 5000) * 0.5;

        // Spawn gap shrinks from 1200ms to 600ms over 20 seconds
        const spawnInterval = Math.max(600, 1200 - elapsed * 0.03);
        if (Date.now() - lastSpawn > spawnInterval) {
            spawnObstacle();
            lastSpawn = Date.now();
        }

        // Clear canvas
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Lane guides
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.setLineDash([6, 6]);
        LANES_Y.forEach(ly => {
            ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(CW, ly); ctx.stroke();
        });
        ctx.setLineDash([]);

        // Planet target on right
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.fillText(mission.emoji || '🪐', CW - 24, CH / 2 + 12);

        // Move + draw obstacles
        ctx.font = '20px serif';
        obstacles = obstacles.filter(o => {
            o.x -= speed;
            if (o.x < -24) return false;
            ctx.fillText(o.emoji, o.x, LANES_Y[o.lane] + 8);
            return true;
        });

        // Draw ship (blink when invincible)
        const shipX = 50;
        if (!invincible || Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.font = '24px serif';
            ctx.fillText('🛸', shipX, LANES_Y[lane] + 10);
        }

        // Collision detection
        if (!invincible) {
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const o = obstacles[i];
                if (o.lane === lane && Math.abs(o.x - shipX) < 22) {
                    obstacles.splice(i, 1);
                    lives--;
                    updateLives();
                    if (lives <= 0) {
                        done = true;
                        cancelAnimationFrame(activeGameFrame);
                        activeGameFrame = null;
                        onGameFail(mission, target, gameData);
                        return;
                    }
                    invincible = true;
                    setTimeout(() => { invincible = false; }, 1000);
                    break;
                }
            }
        }

        // Win condition
        if (elapsed >= DURATION_MS && !done) {
            done = true;
            cancelAnimationFrame(activeGameFrame);
            activeGameFrame = null;
            onGameSuccess(mission, target);
            return;
        }

        activeGameFrame = requestAnimationFrame(gameLoop);
    }

    activeGameFrame = requestAnimationFrame(gameLoop);

    // Keyboard controls
    const keyHandler = e => {
        if (done) return;
        if (e.key === 'ArrowUp')   lane = Math.max(0, lane - 1);
        if (e.key === 'ArrowDown') lane = Math.min(2, lane + 1);
    };
    document.addEventListener('keydown', keyHandler);

    // Touch/click controls
    const clickHandler = e => {
        if (done) return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < rect.height / 2) lane = Math.max(0, lane - 1);
        else lane = Math.min(2, lane + 1);
    };
    canvas.addEventListener('click', clickHandler);

    // Cleanup both listeners when game ends
    activeGameCleanup = () => {
        document.removeEventListener('keydown', keyHandler);
        canvas.removeEventListener('click', clickHandler);
    };
}

// --- MISSION CONTROL ---

function runMissionControl(mission, target, gameData) {
    document.getElementById('mg-control').classList.remove('hidden');

    const DURATION_MS = 25000;
    const SYSTEMS = ['Fuel', 'Power', 'Shields', 'Comms'];
    // Seconds for each system to drain from 100% to 0%
    const DRAIN_SECS = { Fuel: 18, Power: 22, Shields: 20, Comms: 30 };
    const BOOST_AMOUNT = 40;
    const TICK_MS = 100;

    const crisesList = (gameData.crises && gameData.crises.length >= 4)
        ? gameData.crises
        : ['Fuel depleting!', 'Power failing!', 'Shields dropping!', 'Comms lost!'];

    let values = { Fuel: 80, Power: 85, Shields: 75, Comms: 90 };
    let done = false;
    let startTime = Date.now();
    let activeCrisisSys = null;
    let nextCrisisAt = Date.now() + 2500;
    let crisisTimeoutId = null;

    const grid = document.getElementById('mg-systems-grid');
    const crisisAlert = document.getElementById('mg-crisis-alert');
    const controlTimerFill = document.getElementById('mg-control-timer-fill');
    const controlTimerText = document.getElementById('mg-control-timer-text');

    // Start overall timer animation
    controlTimerFill.style.transition = 'none';
    controlTimerFill.style.width = '100%';
    controlTimerFill.offsetHeight;
    controlTimerFill.style.transition = `width ${DURATION_MS / 1000}s linear`;
    controlTimerFill.style.width = '0%';

    function renderGrid() {
        grid.innerHTML = SYSTEMS.map(sys => {
            const v = Math.max(0, Math.round(values[sys]));
            const color = v > 40 ? '#4ade80' : v > 20 ? '#fbbf24' : '#ef4444';
            const isCrisis = activeCrisisSys === sys;
            return `<div class="mg-sys-card${isCrisis ? ' mg-sys-crisis' : ''}" data-sys="${sys}">
                <div class="mg-sys-name">${sys}</div>
                <div class="mg-sys-bar-wrap">
                    <div class="mg-sys-bar-fill" style="width:${v}%;background:${color}"></div>
                </div>
                <div class="mg-sys-pct" style="color:${color}">${v}%</div>
            </div>`;
        }).join('');
    }

    function fireCrisis() {
        const idx = Math.floor(Math.random() * SYSTEMS.length);
        activeCrisisSys = SYSTEMS[idx];
        crisisAlert.textContent = `🚨 ${crisesList[idx]}`;
        crisisAlert.classList.remove('hidden');
        // Auto-clear crisis after 4 seconds if not clicked
        crisisTimeoutId = setTimeout(() => {
            if (activeCrisisSys === SYSTEMS[idx]) {
                activeCrisisSys = null;
                crisisAlert.classList.add('hidden');
                nextCrisisAt = Date.now() + 2000 + Math.random() * 2000;
            }
        }, 4000);
    }

    const gridClickHandler = e => {
        if (done || !activeCrisisSys) return;
        const card = e.target.closest('.mg-sys-card');
        if (!card) return;
        if (card.dataset.sys === activeCrisisSys) {
            values[activeCrisisSys] = Math.min(100, values[activeCrisisSys] + BOOST_AMOUNT);
            activeCrisisSys = null;
            crisisAlert.classList.add('hidden');
            nextCrisisAt = Date.now() + 2500 + Math.random() * 2000;
        }
    };
    grid.addEventListener('click', gridClickHandler);
    activeGameCleanup = () => grid.removeEventListener('click', gridClickHandler);

    renderGrid();

    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    activeGameTimer = setInterval(() => {
        if (done) return;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
        controlTimerText.textContent = `${remaining}s`;

        // Drain all systems
        for (const sys of SYSTEMS) {
            values[sys] -= (100 / (DRAIN_SECS[sys] * 1000)) * TICK_MS;
            if (values[sys] <= 0 && !done) {
                done = true;
                clearInterval(activeGameTimer);
                activeGameTimer = null;
                if (crisisTimeoutId) { clearTimeout(crisisTimeoutId); crisisTimeoutId = null; }
                onGameFail(mission, target, gameData);
                return;
            }
        }

        // Fire crisis events
        if (Date.now() >= nextCrisisAt && !activeCrisisSys) {
            fireCrisis();
        }

        // Win condition
        if (elapsed >= DURATION_MS && !done) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            if (crisisTimeoutId) { clearTimeout(crisisTimeoutId); crisisTimeoutId = null; }
            onGameSuccess(mission, target);
            return;
        }

        renderGrid();
    }, TICK_MS);
}

// --- GRAVITY SLINGSHOT ---

function runSlingshot(mission, target, gameData) {
    document.getElementById('mg-slingshot').classList.remove('hidden');

    const canvas = document.getElementById('mg-slingshot-canvas');
    const ctx = canvas.getContext('2d');
    const CW = 370, CH = 280;
    const MAX_ATTEMPTS = 3;

    let attempts = 0;
    let done = false;
    let dragging = false;
    let dragStart = null;  // {x,y} on canvas
    let probePos = null;
    let probeVel = null;
    let launched = false;
    let won = false;

    // Starfield
    const stars = Array.from({length: 60}, () => ({
        x: Math.random() * CW, y: Math.random() * CH,
        r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.7 + 0.3
    }));

    // Gravity wells (2 planets in the middle area)
    const wells = [
        { x: CW * 0.38, y: CH * 0.32, mass: 3200, radius: 18, emoji: '🪐', color: '#c084fc' },
        { x: CW * 0.62, y: CH * 0.68, mass: 2600, radius: 14, emoji: '🌍', color: '#38bdf8' },
    ];

    // Target zone (right side)
    const target_zone = { x: CW - 28, y: CH / 2, radius: 22, emoji: mission.emoji || '⭐' };

    // Launch pad (left side)
    const launch = { x: 32, y: CH / 2 };

    function resetProbe() {
        probePos = { x: launch.x, y: launch.y };
        probeVel = { x: 0, y: 0 };
        launched = false;
        dragging = false;
        dragStart = null;
    }

    function updateAttempts() {
        const el = document.getElementById('mg-slingshot-attempts');
        if (el) el.textContent = '🟡'.repeat(MAX_ATTEMPTS - attempts) + '⚫'.repeat(attempts);
    }

    resetProbe();
    updateAttempts();

    function drawScene(aimEnd) {
        // Background
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Stars
        stars.forEach(s => {
            ctx.globalAlpha = s.a;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Gravity wells
        wells.forEach(w => {
            // Gravity field glow rings
            for (let i = 3; i > 0; i--) {
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.radius + i * 10, 0, Math.PI * 2);
                ctx.strokeStyle = w.color;
                ctx.globalAlpha = 0.04 * i;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Planet body
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.fillStyle = w.color + '33';
            ctx.fill();
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Emoji
            ctx.font = `${w.radius * 1.3}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(w.emoji, w.x, w.y);
        });

        // Target zone
        ctx.beginPath();
        ctx.arc(target_zone.x, target_zone.y, target_zone.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74,222,128,0.12)';
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target_zone.emoji, target_zone.x, target_zone.y);

        // Launch pad marker
        ctx.beginPath();
        ctx.arc(launch.x, launch.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251,191,36,0.2)';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Trajectory preview (dotted path during drag)
        if (dragging && dragStart && aimEnd && !launched) {
            const dx = launch.x - aimEnd.x;
            const dy = launch.y - aimEnd.y;
            const power = Math.min(Math.sqrt(dx*dx + dy*dy) / 80, 1);
            const vx = dx * power * 0.09;
            const vy = dy * power * 0.09;

            // Simulate dots
            let px = launch.x, py = launch.y;
            let pvx = vx, pvy = vy;
            ctx.fillStyle = 'rgba(251,191,36,0.5)';
            for (let i = 0; i < 40; i++) {
                wells.forEach(w => {
                    const ddx = w.x - px, ddy = w.y - py;
                    const dist2 = ddx*ddx + ddy*ddy;
                    const force = w.mass / (dist2 * Math.sqrt(dist2) + 0.001);
                    pvx += ddx * force * 0.003;
                    pvy += ddy * force * 0.003;
                });
                px += pvx; py += pvy;
                if (i % 3 === 0) {
                    ctx.beginPath();
                    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Aim line
            ctx.beginPath();
            ctx.moveTo(launch.x, launch.y);
            ctx.lineTo(aimEnd.x, aimEnd.y);
            ctx.strokeStyle = 'rgba(251,191,36,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Power indicator
            const powerPct = Math.round(power * 100);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Power: ${powerPct}%`, 8, 8);
        }

        // Probe
        if (probePos) {
            ctx.beginPath();
            ctx.arc(probePos.x, probePos.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Instructions overlay (before first launch)
        if (!launched && attempts === 0 && !dragging) {
            ctx.fillStyle = 'rgba(251,191,36,0.7)';
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Drag from the probe ● to aim', CW/2, CH - 20);
        }
    }

    function physicsLoop() {
        if (done) return;

        if (launched && probePos && probeVel) {
            // Apply gravity from each well
            wells.forEach(w => {
                const dx = w.x - probePos.x;
                const dy = w.y - probePos.y;
                const dist2 = dx*dx + dy*dy;
                const force = w.mass / (dist2 * Math.sqrt(dist2) + 0.001);
                probeVel.x += dx * force * 0.003;
                probeVel.y += dy * force * 0.003;
            });

            probePos.x += probeVel.x;
            probePos.y += probeVel.y;

            // Check win: entered target zone
            const dtx = probePos.x - target_zone.x;
            const dty = probePos.y - target_zone.y;
            if (Math.sqrt(dtx*dtx + dty*dty) < target_zone.radius + 4) {
                won = true;
                done = true;
                drawScene(null);
                cancelAnimationFrame(activeGameFrame);
                activeGameFrame = null;
                setTimeout(() => onGameSuccess(mission, target), 400);
                return;
            }

            // Check collision with wells
            for (const w of wells) {
                const dx = probePos.x - w.x, dy = probePos.y - w.y;
                if (Math.sqrt(dx*dx + dy*dy) < w.radius) {
                    launched = false;
                    attempts++;
                    updateAttempts();
                    if (attempts >= MAX_ATTEMPTS) {
                        done = true;
                        cancelAnimationFrame(activeGameFrame);
                        activeGameFrame = null;
                        onGameFail(mission, target, gameData);
                        return;
                    }
                    resetProbe();
                    break;
                }
            }

            // Out of bounds
            if (probePos.x > CW + 30 || probePos.x < -30 || probePos.y > CH + 30 || probePos.y < -30) {
                launched = false;
                attempts++;
                updateAttempts();
                if (attempts >= MAX_ATTEMPTS) {
                    done = true;
                    cancelAnimationFrame(activeGameFrame);
                    activeGameFrame = null;
                    onGameFail(mission, target, gameData);
                    return;
                }
                resetProbe();
            }
        }

        drawScene(null);
        activeGameFrame = requestAnimationFrame(physicsLoop);
    }

    activeGameFrame = requestAnimationFrame(physicsLoop);

    // --- Input Handling ---
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CW / rect.width;
        const scaleY = CH / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function isNearProbe(pos) {
        if (!probePos) return false;
        const dx = pos.x - probePos.x, dy = pos.y - probePos.y;
        return Math.sqrt(dx*dx + dy*dy) < 24;
    }

    function onPointerDown(e) {
        if (done || launched) return;
        e.preventDefault();
        const pos = getCanvasPos(e);
        if (isNearProbe(pos)) {
            dragging = true;
            dragStart = pos;
        }
    }

    function onPointerMove(e) {
        if (!dragging || done || launched) return;
        e.preventDefault();
        const pos = getCanvasPos(e);
        drawScene(pos);
    }

    function onPointerUp(e) {
        if (!dragging || done || launched) return;
        e.preventDefault();
        dragging = false;
        const pos = getCanvasPos(e);
        const dx = launch.x - pos.x;
        const dy = launch.y - pos.y;
        const power = Math.min(Math.sqrt(dx*dx + dy*dy) / 80, 1);
        if (power < 0.05) return; // too weak, ignore
        probeVel.x = dx * power * 0.09;
        probeVel.y = dy * power * 0.09;
        launched = true;
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp, { passive: false });

    activeGameCleanup = () => {
        canvas.removeEventListener('mousedown', onPointerDown);
        canvas.removeEventListener('mousemove', onPointerMove);
        canvas.removeEventListener('mouseup', onPointerUp);
        canvas.removeEventListener('touchstart', onPointerDown);
        canvas.removeEventListener('touchmove', onPointerMove);
        canvas.removeEventListener('touchend', onPointerUp);
    };
}

// --- SPACE DOCKING ---

function runDocking(mission, target, gameData) {
    document.getElementById('mg-docking').classList.remove('hidden');

    const canvas = document.getElementById('mg-docking-canvas');
    const ctx = canvas.getContext('2d');
    const CW = 370, CH = 260;
    const DURATION_MS = 35000;
    const FUEL_MAX = 100;

    // Gravity based on planet
    const gravityMap = {
        Moon: 0.008, Mars: 0.012, Mercury: 0.010, Venus: 0.018,
        Jupiter: 0.028, Saturn: 0.022, Uranus: 0.015, Neptune: 0.016,
        Earth: 0.016, Sun: 0.040,
    };
    const gravity = gravityMap[target.name] || 0.012;

    // Station at top center
    const station = {
        x: CW / 2,
        y: 40,
        width: 90,
        height: 18,
        portWidth: 28,
        portX: CW / 2 - 14, // center of port
    };

    // Ship state
    let ship = { x: CW / 2 + (Math.random() - 0.5) * 60, y: CH - 40, vx: (Math.random() - 0.5) * 0.4, vy: -0.2 };
    let fuel = FUEL_MAX;
    let done = false;
    let startTime = Date.now();
    let thrusting = { up: false, left: false, right: false };
    let particles = [];
    let docked = false;

    // Starfield
    const stars = Array.from({length: 50}, () => ({
        x: Math.random() * CW, y: Math.random() * CH, r: Math.random() * 1 + 0.3
    }));

    function updateHUD() {
        const fuelEl = document.getElementById('mg-dock-fuel');
        const speedEl = document.getElementById('mg-dock-speed');
        const statusEl = document.getElementById('mg-dock-status');
        if (fuelEl) fuelEl.textContent = `⛽ ${Math.max(0, Math.round(fuel))}%`;
        const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        const fuelColor = fuel > 50 ? '#4ade80' : fuel > 20 ? '#fbbf24' : '#ef4444';
        if (fuelEl) fuelEl.style.color = fuelColor;
        if (speedEl) {
            speedEl.textContent = `↕ ${spd.toFixed(1)}`;
            speedEl.style.color = spd < 1.5 ? '#4ade80' : spd < 3 ? '#fbbf24' : '#ef4444';
        }
        // Distance to dock
        const distToDock = Math.abs(ship.y - (station.y + station.height));
        if (statusEl) statusEl.textContent = distToDock < 80 ? (spd < 1.5 ? '✅ Speed OK' : '⚠️ Too Fast') : '';
    }

    function drawScene() {
        // Background
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CW; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
        for (let y = 0; y < CH; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });

        // Station body
        ctx.fillStyle = '#1e3a5f';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(station.x - station.width / 2, station.y, station.width, station.height, 4);
        ctx.fill();
        ctx.stroke();

        // Station port (gap in the bottom center)
        ctx.fillStyle = '#040a14';
        ctx.fillRect(station.portX, station.y + station.height - 4, station.portWidth, 8);

        // Port green lights
        ctx.fillStyle = docked ? '#4ade80' : (Math.floor(Date.now() / 500) % 2 === 0 ? '#4ade80' : '#166534');
        ctx.beginPath(); ctx.arc(station.portX + 2, station.y + station.height + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(station.portX + station.portWidth - 2, station.y + station.height + 2, 3, 0, Math.PI * 2); ctx.fill();

        // Station emoji
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛸', station.x, station.y + station.height / 2);

        // Port approach guide lines
        ctx.strokeStyle = 'rgba(74,222,128,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(station.portX, station.y + station.height); ctx.lineTo(station.portX, CH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(station.portX + station.portWidth, station.y + station.height); ctx.lineTo(station.portX + station.portWidth, CH); ctx.stroke();
        ctx.setLineDash([]);

        // Thrust particles
        ctx.globalAlpha = 0.7;
        particles = particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life -= 1;
            if (p.life <= 0) return false;
            ctx.globalAlpha = p.life / p.maxLife * 0.7;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            return true;
        });
        ctx.globalAlpha = 1;

        // Ship (triangle pointing up)
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(7, 9);
        ctx.lineTo(-7, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Timer bar (top of canvas)
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, DURATION_MS - elapsed);
        const frac = remaining / DURATION_MS;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, CW, 3);
        ctx.fillStyle = frac > 0.4 ? '#38bdf8' : frac > 0.2 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(0, 0, CW * frac, 3);

        // Remaining time text
        const timerEl = document.getElementById('mg-docking-timer');
        if (timerEl) timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;
    }

    function spawnThrustParticle(dir) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.5;
            particles.push({
                x: ship.x + (dir === 'left' ? 6 : dir === 'right' ? -6 : spread * 4),
                y: ship.y + (dir === 'up' ? 9 : -6),
                vx: dir === 'left' ? 1.5 + Math.random() : dir === 'right' ? -1.5 - Math.random() : spread,
                vy: dir === 'up' ? 1.5 + Math.random() : -1.2 - Math.random(),
                life: 12 + Math.random() * 8,
                maxLife: 20,
                r: 1.5 + Math.random(),
                color: dir === 'up' ? '#f97316' : '#38bdf8',
            });
        }
    }

    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }

    activeGameTimer = setInterval(() => {
        if (done) return;

        const elapsed = Date.now() - startTime;

        // Apply gravity
        ship.vy += gravity;

        // Apply thrust
        const thrustPower = 0.045;
        const fuelCost = 0.6;
        if (thrusting.up && fuel > 0) {
            ship.vy -= thrustPower * 2.5;
            fuel = Math.max(0, fuel - fuelCost * 2);
            spawnThrustParticle('up');
        }
        if (thrusting.left && fuel > 0) {
            ship.vx -= thrustPower;
            fuel = Math.max(0, fuel - fuelCost);
            spawnThrustParticle('left');
        }
        if (thrusting.right && fuel > 0) {
            ship.vx += thrustPower;
            fuel = Math.max(0, fuel - fuelCost);
            spawnThrustParticle('right');
        }

        // Speed cap
        ship.vx = Math.max(-6, Math.min(6, ship.vx));
        ship.vy = Math.max(-6, Math.min(6, ship.vy));

        ship.x += ship.vx;
        ship.y += ship.vy;

        // Clamp horizontal
        if (ship.x < 8) { ship.x = 8; ship.vx = Math.abs(ship.vx) * 0.3; }
        if (ship.x > CW - 8) { ship.x = CW - 8; ship.vx = -Math.abs(ship.vx) * 0.3; }

        // Check docking
        const portCenterX = station.portX + station.portWidth / 2;
        const portBottomY = station.y + station.height + 4;
        const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        const inPortX = Math.abs(ship.x - portCenterX) < station.portWidth / 2 + 2;
        const atPortY = Math.abs(ship.y - portBottomY) < 12;

        if (inPortX && atPortY && spd < 1.8 && !done) {
            docked = true;
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            drawScene();
            setTimeout(() => onGameSuccess(mission, target), 500);
            return;
        }

        // Crash into station wall (too fast or wrong position)
        const hitStation = ship.y < station.y + station.height + 2 && ship.y > station.y - 5 &&
            ship.x > station.x - station.width / 2 - 5 && ship.x < station.x + station.width / 2 + 5;
        if (hitStation && !done) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
            return;
        }

        // Fell off bottom
        if (ship.y > CH + 20 && !done) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
            return;
        }

        // Time out
        if (elapsed >= DURATION_MS && !done) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
            return;
        }

        // Out of fuel and drifting up with no chance
        if (fuel <= 0 && ship.vy > 0 && ship.y > CH - 20 && !done) {
            done = true;
            clearInterval(activeGameTimer);
            activeGameTimer = null;
            onGameFail(mission, target, gameData);
            return;
        }

        updateHUD();
        drawScene();
    }, 30);

    // Draw initial frame
    drawScene();

    // --- Keyboard controls ---
    const keyHandler = e => {
        if (done) return;
        const down = e.type === 'keydown';
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
            thrusting.up = down; e.preventDefault();
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            thrusting.left = down; e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            thrusting.right = down; e.preventDefault();
        }
    };
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyHandler);

    // --- Touch controls ---
    // Bottom 40% = main thrust up
    // Left third = thrust left, Right third = thrust right
    function getTouchThrust(e) {
        const rect = canvas.getBoundingClientRect();
        const touches = e.touches.length ? e.touches : e.changedTouches;
        thrusting.up = false; thrusting.left = false; thrusting.right = false;
        for (let i = 0; i < touches.length; i++) {
            const tx = (touches[i].clientX - rect.left) / rect.width;
            const ty = (touches[i].clientY - rect.top) / rect.height;
            if (ty > 0.55) thrusting.up = true;
            if (tx < 0.33) thrusting.left = true;
            if (tx > 0.67) thrusting.right = true;
        }
    }
    function clearThrust() { thrusting.up = false; thrusting.left = false; thrusting.right = false; }

    canvas.addEventListener('touchstart', e => { e.preventDefault(); getTouchThrust(e); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); getTouchThrust(e); }, { passive: false });
    canvas.addEventListener('touchend', e => { e.preventDefault(); clearThrust(); }, { passive: false });

    activeGameCleanup = () => {
        document.removeEventListener('keydown', keyHandler);
        document.removeEventListener('keyup', keyHandler);
        canvas.removeEventListener('touchstart', getTouchThrust);
        canvas.removeEventListener('touchmove', getTouchThrust);
        canvas.removeEventListener('touchend', clearThrust);
    };
}

// --- ASTEROID FIELD NAVIGATOR ---

function runAsteroidNav(mission, target, gameData) {
    document.getElementById('mg-asteroid-nav').classList.remove('hidden');

    const canvas = document.getElementById('mg-asteroid-canvas');
    const ctx = canvas.getContext('2d');
    const CW = 370, CH = 260;
    const DURATION_MS = 25000;
    const NUM_LANES = 5;
    const LANE_HEIGHT = CH / NUM_LANES;
    const LANE_CENTERS = Array.from({length: NUM_LANES}, (_, i) => LANE_HEIGHT * i + LANE_HEIGHT / 2);

    const hazardTypes = (gameData.hazards && gameData.hazards.length)
        ? gameData.hazards
        : ['asteroid', 'debris', 'radiation_band'];

    let currentLane = 2; // middle
    let targetLane = 2;
    let shipY = LANE_CENTERS[currentLane];
    let shields = 3;
    let score = 0;
    let done = false;
    let startTime = Date.now();
    let lastSpawn = 0;
    let invincible = false;
    let obstacles = [];
    let stars_bg = [];
    let collectibles = [];
    let lastCollectible = 0;

    // Scrolling starfield
    stars_bg = Array.from({length: 80}, () => ({
        x: Math.random() * CW, y: Math.random() * CH,
        r: Math.random() * 1.2 + 0.2,
        speed: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.6 + 0.2,
    }));

    // Touch swipe state
    let touchStartY = null;
    let touchStartX = null;

    function updateHUD() {
        const shEl = document.getElementById('mg-asteroid-shields');
        const scEl = document.getElementById('mg-asteroid-score');
        if (shEl) shEl.textContent = '🟢'.repeat(shields) + '⚫'.repeat(3 - shields);
        if (scEl) scEl.textContent = `★ ${score}`;
    }

    function spawnObstacle() {
        const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        const emoji = HAZARD_EMOJIS[type] || '☄️';
        // avoid bunching — pick random lane, sometimes pick multiple lanes
        const lane = Math.floor(Math.random() * NUM_LANES);
        obstacles.push({ x: CW + 28, lane, emoji, size: 18 + Math.random() * 6 });
    }

    function spawnCollectible() {
        const lane = Math.floor(Math.random() * NUM_LANES);
        collectibles.push({ x: CW + 28, lane, size: 14 });
    }

    function gameLoop() {
        if (done) return;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));

        // Update timer
        const timerEl = document.getElementById('mg-asteroid-timer');
        if (timerEl) timerEl.textContent = `${remaining}s`;

        const speed = 2.2 + (elapsed / DURATION_MS) * 3.5;
        const spawnInterval = Math.max(500, 1100 - elapsed * 0.025);

        // Spawn obstacles
        if (Date.now() - lastSpawn > spawnInterval) {
            spawnObstacle();
            // 30% chance of extra obstacle in different lane
            if (Math.random() < 0.3) {
                setTimeout(spawnObstacle, 180);
            }
            lastSpawn = Date.now();
        }

        // Spawn collectibles
        if (Date.now() - lastCollectible > 2800) {
            spawnCollectible();
            lastCollectible = Date.now();
        }

        // Smooth ship lane interpolation
        const targetY = LANE_CENTERS[targetLane];
        shipY += (targetY - shipY) * 0.18;

        // Clear canvas
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Scrolling stars
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        stars_bg.forEach(s => {
            s.x -= s.speed;
            if (s.x < -4) s.x = CW + 4;
            ctx.globalAlpha = s.a;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Lane dividers (very subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 12]);
        LANE_CENTERS.forEach((ly, i) => {
            if (i === 0) return;
            ctx.beginPath();
            ctx.moveTo(0, ly - LANE_HEIGHT / 2);
            ctx.lineTo(CW, ly - LANE_HEIGHT / 2);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Target destination on right
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mission.emoji || '🪐', CW - 20, CH / 2);

        // Move and draw collectibles
        ctx.font = '14px serif';
        collectibles = collectibles.filter(c => {
            c.x -= speed * 0.8;
            if (c.x < -20) return false;
            ctx.fillText('⭐', c.x, LANE_CENTERS[c.lane]);

            // Collect
            const shipX = 45;
            if (!invincible && c.lane === Math.round((shipY - LANE_HEIGHT/2) / LANE_HEIGHT) &&
                Math.abs(c.x - shipX) < 20 && Math.abs(LANE_CENTERS[c.lane] - shipY) < LANE_HEIGHT * 0.6) {
                score++;
                updateHUD();
                return false;
            }
            return true;
        });

        // Move and draw obstacles
        ctx.font = '20px serif';
        const shipX = 45;
        obstacles = obstacles.filter(o => {
            o.x -= speed;
            if (o.x < -28) return false;
            ctx.fillText(o.emoji, o.x, LANE_CENTERS[o.lane]);

            // Collision: ship lane matches obstacle lane and x overlaps
            if (!invincible && Math.abs(LANE_CENTERS[o.lane] - shipY) < LANE_HEIGHT * 0.55 && Math.abs(o.x - shipX) < 20) {
                shields--;
                updateHUD();
                if (shields <= 0) {
                    done = true;
                    cancelAnimationFrame(activeGameFrame);
                    activeGameFrame = null;
                    onGameFail(mission, target, gameData);
                    return false;
                }
                invincible = true;
                setTimeout(() => { invincible = false; }, 1200);
                return false;
            }
            return true;
        });

        // Draw ship (blinking when invincible)
        if (!invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.font = '22px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛸', shipX, shipY);
        }

        // Timer progress bar at top
        const frac = 1 - elapsed / DURATION_MS;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, CW, 3);
        ctx.fillStyle = frac > 0.4 ? '#38bdf8' : frac > 0.15 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(0, 0, CW * Math.max(0, frac), 3);

        // Win condition
        if (elapsed >= DURATION_MS && !done) {
            done = true;
            cancelAnimationFrame(activeGameFrame);
            activeGameFrame = null;
            onGameSuccess(mission, target);
            return;
        }

        activeGameFrame = requestAnimationFrame(gameLoop);
    }

    updateHUD();
    activeGameFrame = requestAnimationFrame(gameLoop);

    // --- Keyboard controls ---
    const keyHandler = e => {
        if (done) return;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            targetLane = Math.max(0, targetLane - 1);
            e.preventDefault();
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            targetLane = Math.min(NUM_LANES - 1, targetLane + 1);
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', keyHandler);

    // --- Touch controls: swipe or tap ---
    const touchStart = e => {
        if (done) return;
        e.preventDefault();
        const t = e.touches[0];
        touchStartY = t.clientY;
        touchStartX = t.clientX;
    };

    const touchEnd = e => {
        if (done || touchStartY === null) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        const dy = t.clientY - touchStartY;
        const dx = t.clientX - touchStartX;

        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
            // Swipe
            if (dy < 0) targetLane = Math.max(0, targetLane - 1);
            else targetLane = Math.min(NUM_LANES - 1, targetLane + 1);
        } else if (Math.abs(dy) <= 12 && Math.abs(dx) <= 12) {
            // Tap: top half = up, bottom half = down
            const rect = canvas.getBoundingClientRect();
            const ty = t.clientY - rect.top;
            if (ty < rect.height / 2) targetLane = Math.max(0, targetLane - 1);
            else targetLane = Math.min(NUM_LANES - 1, targetLane + 1);
        }
        touchStartY = null;
        touchStartX = null;
    };

    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });

    activeGameCleanup = () => {
        document.removeEventListener('keydown', keyHandler);
        canvas.removeEventListener('touchstart', touchStart);
        canvas.removeEventListener('touchend', touchEnd);
    };
}

// --- ORBITAL MEMORY MATCH ---

function runOrbitalMemory(mission, target, gameData) {
    document.getElementById('mg-memory').classList.remove('hidden');

    const canvas = document.getElementById('mg-memory-canvas');
    const ctx = canvas.getContext('2d');
    const CW = 370, CH = 300;
    const DURATION_MS = 35000;
    const ORBIT_RADIUS = 108;
    const CENTER = { x: CW / 2, y: CH / 2 };
    const CARD_W = 32, CARD_H = 32;
    const NUM_PAIRS = 5;
    const SYMBOLS = ['🌟', '🪐', '☄️', '🌙', '🚀', '🔭', '🛸', '⭐', '🌍', '💫'];
    const ORBIT_SPEED = 0.004; // radians per frame

    let done = false;
    let startTime = Date.now();
    let orbitAngle = 0;
    let pairsFound = 0;
    let flipping = false; // lock during reveal

    // Build 10 cards (5 pairs), shuffled
    const symbolSet = SYMBOLS.slice(0, NUM_PAIRS);
    const cardSymbols = [...symbolSet, ...symbolSet].sort(() => Math.random() - 0.5);

    // Each card has: angle offset on orbit, face symbol, state
    const cards = cardSymbols.map((sym, i) => ({
        angleOffset: (i / cardSymbols.length) * Math.PI * 2,
        symbol: sym,
        state: 'down',    // 'down' | 'up' | 'matched'
        flipProgress: 0,  // 0..1
        flipDir: 0,       // 1=flipping up, -1=flipping down
        glow: 0,          // glow intensity for match feedback
    }));

    let flippedCards = []; // indices of currently-face-up unmatched cards

    function getCardPos(card) {
        const a = orbitAngle + card.angleOffset;
        return {
            x: CENTER.x + Math.cos(a) * ORBIT_RADIUS,
            y: CENTER.y + Math.sin(a) * ORBIT_RADIUS,
        };
    }

    function updatePairCounter() {
        const el = document.getElementById('mg-memory-pairs');
        if (el) el.textContent = `Pairs: ${pairsFound}/${NUM_PAIRS}`;
        const timerEl = document.getElementById('mg-memory-timer');
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
        if (timerEl) timerEl.textContent = `${remaining}s`;
    }

    function drawScene() {
        // Background
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Radial glow at center
        const grd = ctx.createRadialGradient(CENTER.x, CENTER.y, 10, CENTER.x, CENTER.y, 130);
        grd.addColorStop(0, 'rgba(139,92,246,0.12)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CW, CH);

        // Orbit circle (faint)
        ctx.beginPath();
        ctx.arc(CENTER.x, CENTER.y, ORBIT_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(139,92,246,0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center emoji (mission target)
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mission.emoji || '🌌', CENTER.x, CENTER.y);

        // Draw cards
        cards.forEach((card, i) => {
            const pos = getCardPos(card);
            const cx = pos.x, cy = pos.y;

            // Scale effect for flip animation
            const scaleX = card.state === 'down' ? 1 : (card.flipProgress < 0.5 ? 1 - card.flipProgress * 2 : (card.flipProgress - 0.5) * 2);
            const absScale = Math.max(0.01, Math.abs(scaleX));

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(absScale, 1);

            const half_w = CARD_W / 2, half_h = CARD_H / 2;

            if (card.state === 'matched') {
                // Matched: faded green
                ctx.globalAlpha = 0.4 + Math.sin(card.glow) * 0.15;
                ctx.fillStyle = 'rgba(74,222,128,0.25)';
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(-half_w, -half_h, CARD_W, CARD_H, 6);
                ctx.fill(); ctx.stroke();
                ctx.font = '16px serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#4ade80';
                ctx.fillText(card.symbol, 0, 0);
                ctx.globalAlpha = 1;
            } else if (card.state === 'up' || (card.state === 'down' && card.flipProgress > 0.5)) {
                // Face up side
                ctx.fillStyle = 'rgba(139,92,246,0.3)';
                ctx.strokeStyle = '#a78bfa';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(-half_w, -half_h, CARD_W, CARD_H, 6);
                ctx.fill(); ctx.stroke();
                if (card.flipProgress > 0.5 || card.state === 'up') {
                    ctx.font = '16px serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#fff';
                    ctx.fillText(card.symbol, 0, 0);
                }
            } else {
                // Face down
                ctx.fillStyle = 'rgba(30,27,75,0.9)';
                ctx.strokeStyle = 'rgba(139,92,246,0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(-half_w, -half_h, CARD_W, CARD_H, 6);
                ctx.fill(); ctx.stroke();
                ctx.font = '14px serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(167,139,250,0.6)';
                ctx.fillText('?', 0, 0);
            }

            ctx.restore();

            // Glow update
            if (card.state === 'matched') card.glow += 0.08;
        });

        // Timer bar
        const elapsed = Date.now() - startTime;
        const frac = Math.max(0, 1 - elapsed / DURATION_MS);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, CW, 3);
        ctx.fillStyle = frac > 0.4 ? '#a78bfa' : frac > 0.15 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(0, 0, CW * frac, 3);
    }

    function animateFlips() {
        let anyAnimating = true;
        const flipSpeed = 0.08;

        cards.forEach(card => {
            if (card.state === 'up' && card.flipProgress < 1) {
                card.flipProgress = Math.min(1, card.flipProgress + flipSpeed);
            } else if (card.state === 'down' && card.flipProgress > 0) {
                card.flipProgress = Math.max(0, card.flipProgress - flipSpeed);
            }
        });
    }

    function mainLoop() {
        if (done) return;

        const elapsed = Date.now() - startTime;

        // Orbit rotation
        orbitAngle += ORBIT_SPEED;

        // Animate flips
        animateFlips();

        drawScene();
        updatePairCounter();

        // Timer check
        if (elapsed >= DURATION_MS && !done) {
            done = true;
            cancelAnimationFrame(activeGameFrame);
            activeGameFrame = null;
            onGameFail(mission, target, gameData);
            return;
        }

        activeGameFrame = requestAnimationFrame(mainLoop);
    }

    activeGameFrame = requestAnimationFrame(mainLoop);

    // --- Hit detection ---
    function handleTap(clientX, clientY) {
        if (done || flipping) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = CW / rect.width;
        const scaleY = CH / rect.height;
        const tapX = (clientX - rect.left) * scaleX;
        const tapY = (clientY - rect.top) * scaleY;

        // Find tapped card
        let tappedIdx = -1;
        let minDist = Infinity;
        cards.forEach((card, i) => {
            if (card.state !== 'down') return;
            const pos = getCardPos(card);
            const dx = tapX - pos.x, dy = tapY - pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 22 && dist < minDist) {
                minDist = dist;
                tappedIdx = i;
            }
        });

        if (tappedIdx === -1) return;

        // Flip it up
        cards[tappedIdx].state = 'up';
        cards[tappedIdx].flipProgress = 0;
        flippedCards.push(tappedIdx);

        if (flippedCards.length === 2) {
            flipping = true;
            const [a, b] = flippedCards;
            flippedCards = [];

            setTimeout(() => {
                if (cards[a].symbol === cards[b].symbol) {
                    // Match!
                    cards[a].state = 'matched';
                    cards[b].state = 'matched';
                    pairsFound++;

                    if (pairsFound >= NUM_PAIRS) {
                        done = true;
                        cancelAnimationFrame(activeGameFrame);
                        activeGameFrame = null;
                        setTimeout(() => onGameSuccess(mission, target), 400);
                        return;
                    }
                } else {
                    // No match — flip back
                    cards[a].state = 'down';
                    cards[b].state = 'down';
                }
                flipping = false;
            }, 900);
        }
    }

    const clickHandler = e => {
        e.preventDefault();
        handleTap(e.clientX, e.clientY);
    };
    const touchHandler = e => {
        e.preventDefault();
        if (e.changedTouches.length > 0) {
            handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    };

    canvas.addEventListener('click', clickHandler);
    canvas.addEventListener('touchend', touchHandler, { passive: false });

    activeGameCleanup = () => {
        canvas.removeEventListener('click', clickHandler);
        canvas.removeEventListener('touchend', touchHandler);
    };
}

// --- LUNAR LANDER ---

function runLander(mission, target, gameData) {
    document.getElementById('mg-lander').classList.remove('hidden');

    const canvas = document.getElementById('mg-lander-canvas');
    const ctx = canvas.getContext('2d');
    const CW = 370, CH = 300;
    const MAX_ATTEMPTS = 2;
    const FUEL_MAX = 100;

    // Gravity varies per destination
    const gravityMap = {
        Moon: 0.020, Mars: 0.032, Mercury: 0.027, Venus: 0.055,
        Jupiter: 0.075, Saturn: 0.065, Uranus: 0.040, Neptune: 0.045,
        Earth: 0.048, Sun: 0.120, Io: 0.025, Europa: 0.018,
        Ganymede: 0.022, Callisto: 0.020, Titan: 0.030,
        Phobos: 0.004, Deimos: 0.003,
    };
    const gravity = gravityMap[target.name] || 0.035;
    const THRUST_POWER = gravity * 2.8;
    const LATERAL_POWER = 0.030;
    const MAX_LAND_VSPEED = 1.6;
    const MAX_LAND_HSPEED = 1.0;

    // Terrain generation
    function generateTerrain() {
        const points = [];
        const segW = 30;
        const numSeg = Math.ceil(CW / segW) + 1;
        const baseY = CH - 45;
        const landZoneStart = 100 + Math.floor(Math.random() * 150);
        const landZoneEnd = landZoneStart + 44;

        let y = baseY + (Math.random() - 0.5) * 20;
        for (let i = 0; i <= numSeg; i++) {
            const x = i * segW;
            if (x >= landZoneStart && x <= landZoneEnd) {
                y = baseY; // flat landing zone
            } else {
                y += (Math.random() - 0.5) * 28;
                y = Math.max(CH - 90, Math.min(CH - 20, y));
            }
            points.push({ x, y });
        }
        return { points, landZoneStart, landZoneEnd, landY: baseY };
    }

    let terrain = generateTerrain();
    let attempts = 0;
    let done = false;

    // Ship state
    let ship = {
        x: terrain.landZoneStart + 22 + (Math.random() - 0.5) * 60,
        y: 40,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.2,
        angle: 0, // visual tilt
    };
    let fuel = FUEL_MAX;
    let thrusting = { up: false, left: false, right: false };
    let particles = [];
    let stars = Array.from({length: 55}, () => ({
        x: Math.random() * CW, y: Math.random() * (CH - 90), r: Math.random() + 0.3
    }));

    function updateHUD() {
        const fuelEl = document.getElementById('mg-lander-fuel');
        const vspEl = document.getElementById('mg-lander-vspeed');
        const attEl = document.getElementById('mg-lander-attempts');
        const fuelColor = fuel > 50 ? '#4ade80' : fuel > 20 ? '#fbbf24' : '#ef4444';
        if (fuelEl) { fuelEl.textContent = `⛽ ${Math.max(0, Math.round(fuel))}%`; fuelEl.style.color = fuelColor; }
        if (vspEl) {
            const spd = Math.abs(ship.vy);
            vspEl.textContent = `↕ ${spd.toFixed(1)}`;
            vspEl.style.color = spd < MAX_LAND_VSPEED ? '#4ade80' : spd < 3 ? '#fbbf24' : '#ef4444';
        }
        if (attEl) attEl.textContent = `Attempt ${attempts + 1}/${MAX_ATTEMPTS + 1}`;
    }

    // Get terrain y at a given x
    function getTerrainY(x) {
        const pts = terrain.points;
        for (let i = 0; i < pts.length - 1; i++) {
            if (x >= pts[i].x && x <= pts[i + 1].x) {
                const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
                return pts[i].y * (1 - t) + pts[i + 1].y * t;
            }
        }
        return CH - 45;
    }

    function resetShip() {
        terrain = generateTerrain();
        ship.x = terrain.landZoneStart + 22 + (Math.random() - 0.5) * 40;
        ship.y = 40;
        ship.vx = (Math.random() - 0.5) * 0.4;
        ship.vy = 0.2;
        ship.angle = 0;
        fuel = FUEL_MAX;
        particles = [];
        thrusting.up = false; thrusting.left = false; thrusting.right = false;
    }

    function spawnThrustParticle(dir) {
        for (let i = 0; i < 4; i++) {
            particles.push({
                x: ship.x + (Math.random() - 0.5) * 6,
                y: ship.y + 8,
                vx: (Math.random() - 0.5) * 1.5 + (dir === 'left' ? 1.5 : dir === 'right' ? -1.5 : 0),
                vy: 1.5 + Math.random() * 2,
                life: 10 + Math.random() * 8,
                maxLife: 18,
                r: 1.5 + Math.random(),
                color: Math.random() < 0.5 ? '#f97316' : '#fbbf24',
            });
        }
    }

    function drawScene() {
        // Space background
        ctx.fillStyle = '#040a14';
        ctx.fillRect(0, 0, CW, CH);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });

        // Terrain
        ctx.beginPath();
        ctx.moveTo(0, CH);
        terrain.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(CW, CH);
        ctx.closePath();
        const terrGrad = ctx.createLinearGradient(0, CH - 80, 0, CH);
        terrGrad.addColorStop(0, '#374151');
        terrGrad.addColorStop(1, '#1f2937');
        ctx.fillStyle = terrGrad;
        ctx.fill();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Landing zone markers (pulsing)
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        const lz = terrain.landZoneStart;
        const lzE = terrain.landZoneEnd;
        const landY = getTerrainY(lz + 22);

        ctx.strokeStyle = `rgba(74,222,128,${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        // Left post
        ctx.beginPath(); ctx.moveTo(lz, landY); ctx.lineTo(lz, landY - 16); ctx.stroke();
        // Right post
        ctx.beginPath(); ctx.moveTo(lzE, landY); ctx.lineTo(lzE, landY - 16); ctx.stroke();
        // Horizontal bar
        ctx.beginPath(); ctx.moveTo(lz, landY - 16); ctx.lineTo(lzE, landY - 16); ctx.stroke();
        // Zone fill
        ctx.fillStyle = `rgba(74,222,128,${0.06 + pulse * 0.04})`;
        ctx.fillRect(lz, landY - 16, lzE - lz, 16);
        // Zone label
        ctx.fillStyle = `rgba(74,222,128,${0.6 + pulse * 0.3})`;
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LAND HERE', (lz + lzE) / 2, landY - 20);

        // Thrust particles
        ctx.globalAlpha = 0.8;
        particles = particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) return false;
            ctx.globalAlpha = p.life / p.maxLife * 0.8;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            return true;
        });
        ctx.globalAlpha = 1;

        // Ship (lander shape)
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        // Body
        ctx.fillStyle = '#c4b5fd';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(10, 8);
        ctx.lineTo(0, 5);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Landing legs
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-8, 7); ctx.lineTo(-13, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(13, 12); ctx.stroke();

        // Thruster glow when thrusting
        if (thrusting.up && fuel > 0) {
            ctx.fillStyle = 'rgba(249,115,22,0.6)';
            ctx.beginPath();
            ctx.moveTo(-5, 7);
            ctx.lineTo(5, 7);
            ctx.lineTo(0, 18 + Math.random() * 6);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();

        // Fuel bar overlay at top
        const fuelFrac = fuel / FUEL_MAX;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, CW, 4);
        ctx.fillStyle = fuelFrac > 0.4 ? '#4ade80' : fuelFrac > 0.15 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(0, 0, CW * fuelFrac, 4);
    }

    function physicsLoop() {
        if (done) return;

        // Apply gravity
        ship.vy += gravity;

        // Apply thrust
        if (thrusting.up && fuel > 0) {
            ship.vy -= THRUST_POWER;
            fuel = Math.max(0, fuel - 0.8);
            spawnThrustParticle('up');
        }
        if (thrusting.left && fuel > 0) {
            ship.vx -= LATERAL_POWER;
            fuel = Math.max(0, fuel - 0.3);
            ship.angle = Math.max(-0.3, ship.angle - 0.015);
            spawnThrustParticle('left');
        }
        if (thrusting.right && fuel > 0) {
            ship.vx += LATERAL_POWER;
            fuel = Math.max(0, fuel - 0.3);
            ship.angle = Math.min(0.3, ship.angle + 0.015);
            spawnThrustParticle('right');
        }

        // Drift angle back to center
        if (!thrusting.left && !thrusting.right) {
            ship.angle *= 0.92;
        }

        // Speed limits
        ship.vx = Math.max(-5, Math.min(5, ship.vx));
        ship.vy = Math.max(-6, Math.min(8, ship.vy));

        ship.x += ship.vx;
        ship.y += ship.vy;

        // Wrap horizontal
        if (ship.x < -10) ship.x = CW + 10;
        if (ship.x > CW + 10) ship.x = -10;

        // Check terrain collision
        const terrY = getTerrainY(ship.x);
        if (ship.y + 12 >= terrY) {
            // Check if in landing zone
            const inZone = ship.x >= terrain.landZoneStart && ship.x <= terrain.landZoneEnd;
            const gentleV = Math.abs(ship.vy) < MAX_LAND_VSPEED;
            const gentleH = Math.abs(ship.vx) < MAX_LAND_HSPEED;

            if (inZone && gentleV && gentleH) {
                // SUCCESS LANDING
                ship.y = terrY - 12;
                done = true;
                cancelAnimationFrame(activeGameFrame);
                activeGameFrame = null;
                drawScene();
                setTimeout(() => onGameSuccess(mission, target), 500);
                return;
            } else {
                // CRASH
                attempts++;
                updateHUD();
                if (attempts > MAX_ATTEMPTS) {
                    done = true;
                    cancelAnimationFrame(activeGameFrame);
                    activeGameFrame = null;
                    // Crash particles
                    for (let i = 0; i < 20; i++) {
                        particles.push({
                            x: ship.x, y: ship.y,
                            vx: (Math.random() - 0.5) * 5,
                            vy: -Math.random() * 4,
                            life: 20, maxLife: 20,
                            r: 2 + Math.random() * 2,
                            color: Math.random() < 0.5 ? '#ef4444' : '#f97316',
                        });
                    }
                    drawScene();
                    setTimeout(() => onGameFail(mission, target, gameData), 300);
                    return;
                } else {
                    resetShip();
                }
            }
        }

        // Flew off top
        if (ship.y < -30) {
            attempts++;
            if (attempts > MAX_ATTEMPTS) {
                done = true;
                cancelAnimationFrame(activeGameFrame);
                activeGameFrame = null;
                onGameFail(mission, target, gameData);
                return;
            }
            resetShip();
        }

        updateHUD();
        drawScene();
        activeGameFrame = requestAnimationFrame(physicsLoop);
    }

    updateHUD();
    drawScene();
    activeGameFrame = requestAnimationFrame(physicsLoop);

    // --- Keyboard controls ---
    const keyHandler = e => {
        if (done) return;
        const down = e.type === 'keydown';
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
            thrusting.up = down; e.preventDefault();
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            thrusting.left = down; e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            thrusting.right = down; e.preventDefault();
        }
    };
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyHandler);

    // --- Touch controls ---
    // Bottom 40% center = thrust up, left 1/3 = thrust left, right 1/3 = thrust right
    function applyTouches(e) {
        const rect = canvas.getBoundingClientRect();
        thrusting.up = false; thrusting.left = false; thrusting.right = false;
        const touches = e.touches;
        for (let i = 0; i < touches.length; i++) {
            const tx = (touches[i].clientX - rect.left) / rect.width;
            const ty = (touches[i].clientY - rect.top) / rect.height;
            if (ty > 0.55) thrusting.up = true;
            if (tx < 0.3) thrusting.left = true;
            if (tx > 0.7) thrusting.right = true;
        }
    }

    canvas.addEventListener('touchstart', e => { e.preventDefault(); applyTouches(e); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); applyTouches(e); }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        thrusting.up = false; thrusting.left = false; thrusting.right = false;
    }, { passive: false });

    activeGameCleanup = () => {
        document.removeEventListener('keydown', keyHandler);
        document.removeEventListener('keyup', keyHandler);
    };
}

document.getElementById('mg-cancel-btn').addEventListener('click', () => {
    hideMissionGame();
    if (lockedTarget && lockedTarget.name !== 'Earth' && lockedTarget.name !== 'Sun') {
        launchBtn.classList.remove('hidden');
    }
});

document.getElementById('ml-relaunch-btn').addEventListener('click', () => {
    document.getElementById('mission-lost-panel').classList.add('hidden');
    if (lockedTarget) showMissionPicker(lockedTarget);
});

document.getElementById('ml-close-btn').addEventListener('click', () => {
    document.getElementById('mission-lost-panel').classList.add('hidden');
    if (lockedTarget && lockedTarget.name !== 'Earth' && lockedTarget.name !== 'Sun') {
        launchBtn.classList.remove('hidden');
    }
});

arrClose.addEventListener('click', () => {
    arrivalPanel.classList.add('hidden');
    if (focusTarget && focusTarget.name !== 'Earth' && focusTarget.name !== 'Sun') {
        launchBtn.classList.remove('hidden');
    }
});

launchBtn.addEventListener('click', () => {
    if (!focusTarget || focusTarget.name === 'Earth' || focusTarget.name === 'Sun') return;
    showMissionPicker(focusTarget);
});

const pointerDown = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (event) => {
    pointerDown.set(event.clientX, event.clientY);
});

renderer.domElement.addEventListener('pointerup', (event) => {
    if (cinematicState) return;
    // Ignore if it was a drag/swipe gesture (moved more than 10 pixels)
    const dist = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    if (dist > 10) return;

    // Orbit camera left/right when tapping screen edges (left 1/3 or right 1/3)
    const screenX = event.clientX / window.innerWidth;
    if (screenX < 0.33) {
        controls.rotateLeft(0.15);
        return;
    } else if (screenX > 0.67) {
        controls.rotateLeft(-0.15);
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = allClickable.map(c => c.mesh);
    const hits = raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
        const hit = hits[0];
        const entry = allClickable.find(c => c.mesh === hit.object);
        if (entry) focusOn(entry);
    } else if (lockedTarget) {
        // Click on empty space — unfocus
        lockedTarget = null;
        focusTarget = null;
        isFocusing = false;
        infoCard.classList.add('hidden');
        navDots.forEach(d => d.classList.remove('active'));
        navLabel.textContent = '';
    }
});

// --- KEYBOARD ORBIT CONTROLS ---
const ORBIT_ANGLE = 0.15; // radians per key press
const keyOrbitHandler = (e) => {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowLeft') {
        controls.rotateLeft(ORBIT_ANGLE);
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        controls.rotateLeft(-ORBIT_ANGLE);
        e.preventDefault();
    }
};
document.addEventListener('keydown', keyOrbitHandler);

// --- STATE & UI ---
let isSynchronous = true;
let isPaused = false;
let showLabels = true;
let simSpeed = 0.05;
let clock = 0;
let isGalaxyView = false;
let galaxyTransition = null;
const GALAXY_CAM  = new THREE.Vector3(24000, 64000, 32000);
const SOLAR_CAM   = new THREE.Vector3(0, 1000, 500);
const SOLAR_LOOK  = new THREE.Vector3(0, 0, 0);

const toggleBtn = document.getElementById('toggle-sync');
const pauseBtn = document.getElementById('pause-anim');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const toggleUiBtn = document.getElementById('toggle-ui-btn');
const uiContainer = document.getElementById('ui-container');
const cpModeTitle = document.getElementById('cp-mode-title');

document.getElementById('lang-select').addEventListener('change', e => {
    setLang(e.target.value);
    applyLocaleToDOM();
    bodyLabels.forEach(({ el, key }) => { el.textContent = t(`bodies.${key}`) || key; });
    cpModeTitle.textContent = isGalaxyView ? t('ui.galaxyView') : t('ui.solarSystem');
    if (lockedTarget) {
        navDots.forEach(d => d.classList.remove('active'));
        const activeDot = planetNav.querySelector(`.nav-dot[data-planet="${lockedTarget.name}"]`);
        if (activeDot) { activeDot.classList.add('active'); navLabel.textContent = lockedTarget.name; }
    } else {
        navDots.forEach(d => d.classList.remove('active'));
        navLabel.textContent = '';
    }
    updateChip('toggle-sync', 'pill-sync', isSynchronous, 'chip-on', '#38bdf8', t('ui.syncOn'), t('ui.syncOff'));
    updateChip('pause-anim', 'pill-pause', isPaused, 'chip-pause-on', '#fbbf24', t('ui.paused'), t('ui.running'), 'pill-pause-on');
    updateChip('toggle-labels', 'pill-labels', showLabels, 'chip-on', '#38bdf8', t('ui.labels'), t('ui.labels'));
    updateChip('toggle-galaxy-btn', 'pill-galaxy', galaxyVisible, 'chip-galaxy', '#a78bfa', t('ui.galaxy'), t('ui.galaxy'), 'pill-galaxy-on');
    if (lockedTarget && !infoCard.classList.contains('hidden')) {
        renderCard(lockedTarget.name);
    }
});

onLangChange(() => {
    if (lockedTarget && !infoCard.classList.contains('hidden')) {
        renderCard(lockedTarget.name);
    }
});

// Sync a chip button + its header status pill to a boolean state.
function updateChip(chipId, pillId, isActive, activeChipClass, activeDotColor, activeLabel, inactiveLabel, activePillClass = 'pill-on') {
    const chip = document.getElementById(chipId);
    const pill = document.getElementById(pillId);
    if (chip) {
        chip.className = `cp-chip ${isActive ? activeChipClass : 'chip-off'}`;
        chip.innerHTML = `<span class="chip-dot" style="background:${isActive ? activeDotColor : '#475569'}"></span> ${isActive ? activeLabel : inactiveLabel}`;
    }
    if (pill) pill.className = `cp-pill ${isActive ? activePillClass : 'pill-off'}`;
}

toggleUiBtn.addEventListener('click', () => {
    uiContainer.classList.toggle('hidden');
});

document.getElementById('toggle-ui-expand').addEventListener('click', () => {
    const isCollapsed = uiContainer.classList.toggle('collapsed');
    document.getElementById('toggle-ui-expand').textContent = isCollapsed ? '▴' : '▾';
});

// Allow clicking anywhere on collapsed header to expand (except pills & expand btn)
document.querySelector('.cp-header').addEventListener('click', (e) => {
    if (!uiContainer.classList.contains('collapsed')) return;
    if (e.target.closest('.cp-expand-btn') || e.target.closest('.cp-pill')) return;
    uiContainer.classList.remove('collapsed');
    document.getElementById('toggle-ui-expand').textContent = '▾';
});

// Make pills clickable to toggle their corresponding settings
document.getElementById('pill-sync').addEventListener('click', () => {
    isSynchronous = !isSynchronous;
    updateChip('toggle-sync', 'pill-sync', isSynchronous, 'chip-on', '#38bdf8', t('ui.syncOn'), t('ui.syncOff'));
});
document.getElementById('pill-pause').addEventListener('click', () => {
    isPaused = !isPaused;
    updateChip('pause-anim', 'pill-pause', isPaused, 'chip-pause-on', '#fbbf24', t('ui.paused'), t('ui.running'), 'pill-pause-on');
});
document.getElementById('pill-labels').addEventListener('click', () => {
    showLabels = !showLabels;
    labelRenderer.domElement.style.display = showLabels ? 'block' : 'none';
    updateChip('toggle-labels', 'pill-labels', showLabels, 'chip-on', '#38bdf8', t('ui.labels'), t('ui.labels'));
});
document.getElementById('pill-galaxy').addEventListener('click', () => {
    galaxyVisible = !galaxyVisible;
    galaxyObjects.forEach(o => { o.visible = galaxyVisible; });
    updateChip('toggle-galaxy-btn', 'pill-galaxy', galaxyVisible, 'chip-galaxy', '#a78bfa', t('ui.galaxy'), t('ui.galaxy'), 'pill-galaxy-on');
});

speedSlider.addEventListener('input', (e) => {
    simSpeed = parseFloat(e.target.value);
    speedVal.innerText = simSpeed.toFixed(2);
});

toggleBtn.addEventListener('click', () => {
    isSynchronous = !isSynchronous;
    updateChip('toggle-sync', 'pill-sync', isSynchronous, 'chip-on', '#38bdf8', t('ui.syncOn'), t('ui.syncOff'));
});

const toggleLabelsBtn = document.getElementById('toggle-labels');
toggleLabelsBtn.addEventListener('click', () => {
    showLabels = !showLabels;
    labelRenderer.domElement.style.display = showLabels ? 'block' : 'none';
    updateChip('toggle-labels', 'pill-labels', showLabels, 'chip-on', '#38bdf8', t('ui.labels'), t('ui.labels'));
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    updateChip('pause-anim', 'pill-pause', isPaused, 'chip-pause-on', '#fbbf24', t('ui.paused'), t('ui.running'), 'pill-pause-on');
});

document.getElementById('reset-pos').addEventListener('click', () => {
    clock = 0;
    isFocusing = false;
    focusTarget = null;
    lockedTarget = null;
    isGalaxyView = false;
    galaxyTransition = null;
    cpModeTitle.textContent = t('ui.solarSystem');
    navDots.forEach(d => d.classList.remove('active'));
    navLabel.textContent = '';
    if (infoCard) infoCard.classList.add('hidden');
    controls.target.set(0, 0, 0);
    camera.position.set(0, 1000, 500);
});

let galaxyVisible = true;
const toggleGalaxyBtn = document.getElementById('toggle-galaxy-btn');
toggleGalaxyBtn.addEventListener('click', () => {
    galaxyVisible = !galaxyVisible;
    galaxyObjects.forEach(o => { o.visible = galaxyVisible; });
    updateChip('toggle-galaxy-btn', 'pill-galaxy', galaxyVisible, 'chip-galaxy', '#a78bfa', t('ui.galaxy'), t('ui.galaxy'), 'pill-galaxy-on');
});

const galaxyBtn = document.getElementById('galaxy-view-btn');
galaxyBtn.addEventListener('click', () => {
    isGalaxyView = !isGalaxyView;
    cpModeTitle.textContent = isGalaxyView ? t('ui.galaxyView') : t('ui.solarSystem');
    if (isGalaxyView) {
        galaxyTransition = { cam: GALAXY_CAM.clone(), tgt: GCENTER.clone() };
        lockedTarget = null;
        isFocusing = false;
        if (infoCard) infoCard.classList.add('hidden');
        navDots.forEach(d => d.classList.remove('active'));
        navLabel.textContent = '';
    } else {
        galaxyTransition = { cam: SOLAR_CAM.clone(), tgt: SOLAR_LOOK.clone() };
        navDots.forEach(d => d.classList.remove('active'));
        navLabel.textContent = '';
    }
});

// --- ANIMATION ---
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        clock += simSpeed;
        sun.rotation.y += 0.005 * simSpeed;
        sunMaterial.uniforms.time.value += 0.016 * simSpeed;

        planets.forEach(p => {
            const M = clock * p.data.speed; // mean anomaly
            const ecc = p.data.eccentricity || 0;
            if (ecc > 0.001) {
                const { angle, radius } = getOrbitalPosition(M, ecc, p.data.distance);
                p.orbitPivot.rotation.y = angle;
                p.mesh.position.x = radius;
            } else {
                p.orbitPivot.rotation.y = M;
            }
            p.mesh.rotation.y += (p.data.spinRate ?? 1.0) * 0.01 * simSpeed;
            if (p.cloudMesh) {
                p.cloudMesh.rotation.y += (p.data.spinRate ?? 1.0) * 0.012 * simSpeed;
            }

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
    if (lockedTarget && !cinematicState) {
        const worldPos = new THREE.Vector3();
        lockedTarget.mesh.getWorldPosition(worldPos);

        if (isFocusing) {
            // Fly-in phase: lerp camera toward the planet
            if (!lockedTarget._camOffset) {
                lockedTarget._camOffset = camera.position.clone().sub(worldPos).normalize();
            }
            const desiredCamPos = worldPos.clone().add(lockedTarget._camOffset.clone().multiplyScalar(focusOrbitDist));
            camera.position.lerp(desiredCamPos, 0.08);
            controls.target.copy(worldPos);

            if (camera.position.distanceTo(worldPos) < focusOrbitDist * 1.1) {
                isFocusing = false;
                delete lockedTarget._camOffset;
            }
        } else {
            // Tracking phase: move camera to follow the orbiting planet
            const prevTarget = controls.target.clone();
            const offset = camera.position.clone().sub(prevTarget);
            controls.target.copy(worldPos);
            camera.position.copy(worldPos).add(offset);
        }
    }

    // --- ROCKET UPDATES ---
    if (!cinematicState) {
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
                if (activeMission === r) activeMission = null;

                // Hide mission log
                missionLog.classList.add('hidden');

                // Launch mini-game before showing arrival panel
                if (r.mission) {
                    launchMissionGame(r.mission, r.target);
                }
            } else {
                const dir = targetPos.clone().sub(r.mesh.position).normalize();
                const up = new THREE.Vector3(0, 1, 0);
                r.mesh.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(up, dir), 0.15);
                r.mesh.position.add(dir.clone().multiplyScalar(moveDist));

                // Trail
                r.points.push(r.mesh.position.clone());
                if (r.points.length > 200) r.points.shift();
                r.trailGeo.setFromPoints(r.points);

                // Flickering main flame + booster flames
                const flicker = 0.7 + Math.random() * 0.6;
                r.fireMesh.scale.set(1, flicker, 1);
                if (r.mesh.boosterFlames) r.mesh.boosterFlames.forEach(bf => bf.scale.set(1, 0.6 + Math.random() * 0.8, 1));

                // Track distance and update mission log
                r.distTraveled += moveDist;
                if (activeMission === r) {
                    const rawPct = Math.min(r.distTraveled / r.totalDist, 0.99);
                    const pct = Math.round(rawPct * 100);
                    mlBar.style.width = pct + '%';
                    mlPct.textContent = t('ui.percentComplete', { pct });
                    // Show educational steps at 0%, 33%, 66%
                    const stepIdx = Math.min(Math.floor(rawPct / 0.33), r.mission.steps.length - 2);
                    if (stepIdx !== r.lastStepShown) {
                        r.lastStepShown = stepIdx;
                        mlFact.textContent = r.mission.steps[stepIdx + 1] || r.mission.steps[r.mission.steps.length - 1];
                        mlFact.className = 'ml-fact ml-fact-new';
                        setTimeout(() => { mlFact.className = 'ml-fact'; }, 600);
                    }
                }
            }
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

    // Cinematic runs independently of pause state
    if (cinematicState) {
        const dt = 1 / 60;
        updateCinematic(dt);
    }

    controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
