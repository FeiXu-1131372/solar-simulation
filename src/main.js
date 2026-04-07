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
        wowStrip: 'Mercury\'s "year" (88 days) is shorter than its "day" (59 Earth days). A planet where the year ends before the day does!',
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
            { cls: 'q-chem', q: '🧪 What is Venus\'s atmosphere made of?', a: 'About <strong>96% carbon dioxide (CO₂)</strong> and 3.5% nitrogen — with clouds of <em>sulfuric acid (H₂SO₄)</em>. Yes, it rains acid! The acid evaporates before hitting the ground (too hot). The surface pressure is <strong>90× Earth\'s</strong> — like being 900 metres underwater.' },
            { cls: 'q-astro', q: '🔭 Why does Venus spin backwards and so slowly?', a: 'Scientists think a <strong>giant asteroid collision</strong> billions of years ago knocked Venus\'s spin into reverse. It now rotates "retrograde" — opposite to most planets. It also spins incredibly slowly: one Venus day = <strong>243 Earth days</strong>. Its year (orbit) is only 225 days — so a day is literally longer than a year!' },
            { cls: 'q-life', q: '🌱 Could anything survive on Venus?', a: 'The surface is brutal: 464°C, crushing pressure, acid clouds. But in Venus\'s upper atmosphere (~50 km up), temperatures reach a manageable 60°C. Scientists found hints of <em>phosphine gas (PH₃)</em> there in 2020 — on Earth, phosphine is made by living things. Could microscopic life float in Venus\'s clouds? We don\'t know — it\'s one of science\'s biggest open questions!' },
        ],
        explore: {
            mission: 'Magellan (NASA, 1989–1994)',
            discovery: 'Magellan used <strong>radar to map 98% of Venus\'s surface</strong> through its thick clouds — discovering over 1,600 volcanoes! Some may still be active today. A new ESA mission (EnVision) is planned for the 2030s to find out.',
            scale: 'Venus is almost a <strong>twin of Earth</strong> in size — 95% of Earth\'s diameter. Same size, completely different destiny. One has oceans, rainforests, and life; the other is a hellscape at 464°C. The difference is almost entirely atmospheric chemistry.',
            whatif: '<strong>What if Earth swapped atmospheres with Venus?</strong> Our oceans would boil away in months. The surface would hit 400°C+. The CO₂ would trap heat in a runaway loop. Every building would be crushed by the pressure. That\'s what a runaway greenhouse effect looks like — a warning from our nearest neighbour.',
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

// --- BACKGROUND STARS ---
// Circular soft-glow sprite — prevents the default square fragment shape
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

const starCount = 22000;
const starPos   = new Float32Array(starCount * 3);
const starCol   = new Float32Array(starCount * 3);
const starColors = [
    [1.0, 1.0, 1.0],   // white
    [0.85, 0.92, 1.0],  // blue-white
    [1.0, 0.97, 0.85],  // warm white
    [1.0, 0.88, 0.65],  // yellow
    [1.0, 0.75, 0.55],  // orange
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

// Galaxy disc — 5-pass canvas render with blur technique for photorealistic look
function createGalaxyTexture(size = 2048) {
    const cx = size / 2, cy = size / 2;
    const R  = size * 0.44;
    const sl = R * 0.30;
    const ARMS = 4;

    // Place one star. armOnly=true forces it onto a spiral arm (no inter-arm scatter).
    // scatter controls arm width in radians (smaller = tighter, more defined arms).
    function placeStar(armOnly, scatter) {
        const r     = Math.min(-sl * Math.log(Math.max(1 - Math.random(), 1e-6)), R);
        const normR = r / R;
        const arm   = Math.floor(Math.random() * ARMS);
        const logSp = Math.log(r / (R * 0.025) + 1) * 1.65;
        // Inside the core (normR < 0.13) always scatter uniformly — bulge has no arms
        const inCore = normR < 0.13;
        const theta  = (!armOnly || inCore)
            ? Math.random() * Math.PI * 2
            : (arm / ARMS) * Math.PI * 2 + logSp + (Math.random() - 0.5) * scatter;
        return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta), normR, inArm: armOnly && !inCore };
    }

    // Draw N pixel-stars into an offscreen ImageData, return the canvas
    function pixelPass(count, armOnly, scatter, colorFn) {
        const oc = document.createElement('canvas');
        oc.width = oc.height = size;
        const octx = oc.getContext('2d');
        const img  = octx.getImageData(0, 0, size, size);
        const d    = img.data;
        for (let i = 0; i < count; i++) {
            const s = placeStar(armOnly, scatter);
            const col = colorFn(s.normR, s.inArm);
            if (!col) continue;
            const sx = Math.round(s.x), sy = Math.round(s.y);
            if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
            const idx = (sy * size + sx) * 4;
            d[idx]   = Math.min(255, d[idx]   + col[0]);
            d[idx+1] = Math.min(255, d[idx+1] + col[1]);
            d[idx+2] = Math.min(255, d[idx+2] + col[2]);
            d[idx+3] = Math.min(255, d[idx+3] + col[3]);
        }
        octx.putImageData(img, 0, 0);
        return oc;
    }

    // Composite an offscreen canvas onto ctx with optional blur (CSS filter, one-shot)
    function blit(src, blurPx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(src, 0, 0);
        ctx.restore();
    }

    // ── Main canvas ─────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // ── Pass 1 · Arm haze — arm-only, heavily blurred ───────────────────────
    // Stars ONLY placed on spiral arms, then blurred ~16px. The blur smears
    // arm stars into a continuous soft glow that follows the spiral shape.
    // Inter-arm space stays dark → high contrast spiral structure.
    blit(pixelPass(
        100000, true, 0.18,          // arm-only, tight scatter (≈10°)
        (nr, arm) => {
            if (nr < 0.13) return [255, 215, 130, 22 + Math.random() * 30]; // core: warm
            if (!arm)       return null;
            return [80, 125, 245, 18 + Math.random() * 25];                  // arm: dim blue
        }
    ), Math.round(size * 0.008));

    // ── Pass 2 · Arm glow — arm-only, medium blur ───────────────────────────
    // Brighter arm stars with tighter scatter and less blur → the spiral arms
    // light up as distinct glowing bands (the dominant visual feature).
    blit(pixelPass(
        90000, true, 0.10,           // very tight scatter (≈6°) = narrow sharp arms
        (nr, arm) => {
            if (nr < 0.13) return [255, 200, 80, 60 + Math.random() * 80];  // core: orange
            if (!arm)       return null;
            return [95, 150, 255, 75 + Math.random() * 95];                  // arm: bright blue
        }
    ), Math.round(size * 0.0022));

    // ── Pass 3 · Sharp detail — 95% arm, no blur ────────────────────────────
    // Crisp unblurred pixel stars for fine detail. 95% land in arms so the
    // inter-arm space is nearly empty, maximising contrast.
    blit(pixelPass(
        110000, true, 0.13,          // arm-only sharp (≈7°)
        (nr, arm) => {
            if (nr < 0.13) {
                return [255, 218 + nr * 150, 128 + nr * 200, 90 + Math.random() * 90];
            }
            if (!arm) return null;
            return [110 + Math.random()*145, 158 + Math.random()*97, 255, 115 + Math.random()*120];
        }
    ), 0);

    // ── Pass 4 · Round hero stars — arc() circles, zero square artefacts ───
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3200; i++) {
        const s  = placeStar(true, 0.15);
        const sz = 1.0 + Math.random() * 3.2;
        const gs = sz * (2.2 + Math.random() * 2.0);
        let rv, gv, bv;
        if (s.inArm && s.normR > 0.13) { rv = 155+Math.random()*100; gv = 198+Math.random()*57; bv = 255; }
        else if (s.normR < 0.22)        { rv = 255; gv = 228+s.normR*75; bv = 158+s.normR*88; }
        else                             { rv = gv = bv = 218+Math.random()*37; }
        // soft glow halo
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, gs);
        g.addColorStop(0,   `rgba(${rv},${gv},${bv},0.62)`);
        g.addColorStop(0.38,`rgba(${rv},${gv},${bv},0.18)`);
        g.addColorStop(1,   `rgba(${rv},${gv},${bv},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, gs, 0, Math.PI * 2); ctx.fill();
        // bright round core
        ctx.fillStyle = `rgba(${rv},${gv},${bv},0.96)`;
        ctx.beginPath(); ctx.arc(s.x, s.y, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // ── Pass 5 · Central bulge gradient ─────────────────────────────────────
    const bulge = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.24);
    bulge.addColorStop(0.00, 'rgba(255, 250, 220, 0.98)');
    bulge.addColorStop(0.18, 'rgba(255, 212,  98, 0.72)');
    bulge.addColorStop(0.45, 'rgba(200,  88,  18, 0.30)');
    bulge.addColorStop(0.78, 'rgba( 88,  25,   4, 0.09)');
    bulge.addColorStop(1.00, 'rgba(  0,   0,   0, 0)');
    ctx.fillStyle = bulge;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4; // sharper when viewed at an angle
    return tex;
}

// Single textured quad — replaces 180k GPU points with 2 triangles
const galaxyDiscPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(GRADIUS * 2.2, GRADIUS * 2.2),
    new THREE.MeshBasicMaterial({
        map: createGalaxyTexture(2048),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })
);
galaxyDiscPlane.position.copy(GCENTER);
galaxyDiscPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), GNORMAL);
scene.add(galaxyDiscPlane);
const galaxyObjects = [galaxyDiscPlane];

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
galacticCentreSprite.scale.set(6000, 6000, 1);
scene.add(galacticCentreSprite);
galaxyObjects.push(galacticCentreSprite);

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
galaxyObjects.push(hazePlane);

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
const launchBtn = document.getElementById('launch-btn');

function renderCard(name) {
    const data = celestialFacts[name] || {
        type: 'Celestial Body', emoji: '⭐',
        fact: 'A fascinating object in our solar system.',
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
        const missions = missionData[name];
        launchBtn.textContent = missions && missions.length > 1
            ? `🚀 Choose Mission (${missions.length})`
            : `🚀 Launch Mission`;
        launchBtn.classList.remove('hidden');
    }

    switchCardTab('overview');
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

function focusOn(meshEntry) {
    lockedTarget = meshEntry;
    focusTarget = meshEntry;
    isFocusing = true;
    focusOrbitDist = meshEntry.size * 6 + 20;

    if (focusInfoEl) {
        focusInfoEl.textContent = `📍 Focused: ${meshEntry.name}`;
        focusInfoEl.style.opacity = '1';
    }

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
    const missions = missionData[target.name];
    if (!missions || missions.length === 0) return;
    missionPickerSubtitle.textContent = `Destination: ${target.name}`;
    missionCards.innerHTML = '';
    missions.forEach(m => {
        const statusLabel = m.status === 'active' ? '🟢 Active' : m.status === 'planned' ? '🟡 Planned' : '⚪ Historical';
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
    cdLabel.textContent = `Launching to ${target.name}`;
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
            cdLabel.textContent = 'LIFTOFF!';
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
    mlPct.textContent = '0% complete';
    mlFact.textContent = mission.steps[0];
    missionLog.classList.remove('hidden');

    launchBtn.classList.add('hidden');
}

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

let galaxyVisible = true;
const toggleGalaxyBtn = document.getElementById('toggle-galaxy-btn');
toggleGalaxyBtn.addEventListener('click', () => {
    galaxyVisible = !galaxyVisible;
    galaxyObjects.forEach(o => { o.visible = galaxyVisible; });
    toggleGalaxyBtn.textContent = galaxyVisible ? '🌌 Hide Galaxy' : '🌌 Show Galaxy';
    toggleGalaxyBtn.classList.toggle('secondary', !galaxyVisible);
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
            if (activeMission === r) activeMission = null;

            // Hide mission log
            missionLog.classList.add('hidden');

            // Show arrival celebration panel
            if (r.mission) {
                arrEmoji.textContent = r.mission.emoji;
                arrMission.textContent = `${r.mission.name} has arrived at ${r.target.name}!`;
                arrDiscovery.textContent = '🔭 ' + r.mission.discovery;
                arrFunfact.textContent = r.mission.funFact;
                arrivalPanel.classList.remove('hidden');
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
                mlPct.textContent = pct + '% complete';
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
