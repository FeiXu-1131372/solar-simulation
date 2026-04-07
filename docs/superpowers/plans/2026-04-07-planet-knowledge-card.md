# Planet Knowledge Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static planet info card with a tabbed, educational "planet profile" featuring Overview / Learn / Explore tabs with rich chemistry, physics, and astronomy content for kids aged 6–13.

**Architecture:** Replace the inner HTML, CSS, and JS card-population logic entirely. The new card uses a `renderCard(name)` function that builds from `celestialFacts` data, which gains `emoji`, `ministats`, `statPills`, `wowStrip`, `learn[]`, and `explore{}` fields. Tab switching and question expand/collapse use delegated event listeners.

**Tech Stack:** Vanilla JS, Three.js (untouched for 3D), CSS custom properties, `innerHTML` for dynamic content.

---

## File Map

| File | Change |
|---|---|
| `index.html` | Replace `#planet-info-card` inner HTML with tabbed skeleton |
| `src/style.css` | Remove old `.info-card` block; add new card, tab, q-card, explore styles |
| `src/main.js` | Add new data fields to all 21 `celestialFacts` entries; replace `focusOn()` card DOM code with `renderCard()` + `switchCardTab()`; remove unused DOM constants; add delegated listeners |

---

## Task 1 — HTML Card Skeleton

**Files:**
- Modify: `index.html:57-84`

- [ ] **Step 1: Replace the card HTML**

In `index.html`, replace the entire `#planet-info-card` div (lines 57–84) with:

```html
    <div id="planet-info-card" class="info-card hidden">
        <!-- Header -->
        <div class="card-header">
            <div class="planet-emoji" id="info-emoji">🌍</div>
            <div class="planet-title">
                <h2 id="info-name">Planet</h2>
                <div id="info-type" class="type-badge">Type</div>
                <div id="info-ministats" class="mini-stats"></div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs" id="card-tabs">
            <button class="tab-btn active" data-tab="overview">📋 Overview</button>
            <button class="tab-btn" data-tab="learn">🧠 Learn</button>
            <button class="tab-btn" data-tab="explore">🚀 Explore</button>
        </div>

        <!-- Overview Panel -->
        <div class="tab-panel active" id="tab-overview">
            <p class="fact-text" id="info-fact"></p>
            <div class="stat-pills" id="info-statpills"></div>
            <div class="wow-strip" id="info-wow"></div>
        </div>

        <!-- Learn Panel -->
        <div class="tab-panel" id="tab-learn">
            <p class="learn-intro">Tap a question you're curious about 👇</p>
            <div id="info-questions"></div>
        </div>

        <!-- Explore Panel -->
        <div class="tab-panel" id="tab-explore">
            <div class="explore-section">
                <div class="explore-label" style="color:#fb923c;">🚀 Real Mission</div>
                <div class="mission-badge">
                    <div class="rocket-icon">🛸</div>
                    <div class="mission-info">
                        <div id="info-mission-name" class="mission-name"></div>
                        <p id="info-mission-discovery"></p>
                    </div>
                </div>
            </div>
            <div class="explore-section">
                <div class="explore-label" style="color:#a78bfa;">📏 Scale Challenge</div>
                <div class="scale-box" id="info-scale"></div>
            </div>
            <div class="explore-section">
                <div class="explore-label" style="color:#ec4899;">💭 What If...?</div>
                <div class="whatif-box" id="info-whatif"></div>
            </div>
            <button id="launch-btn" class="launch-btn hidden"></button>
        </div>
    </div>
```

- [ ] **Step 2: Verify HTML loads without errors**

Run: `npm run dev`

Open the app. The card should not appear (it's hidden). No console errors. Clicking a planet will show a broken card until Task 3 — that's expected.

---

## Task 2 — Card CSS

**Files:**
- Modify: `src/style.css:340-484`

- [ ] **Step 1: Remove old card styles and replace**

In `src/style.css`, delete everything from `/* ---- Planet Info Card ---- */` (line 340) through the end of `.launch-btn.hidden` (line 484). Replace with:

```css
/* ---- Planet Info Card ---- */
.info-card {
    position: absolute;
    bottom: 25px;
    right: 25px;
    width: 370px;
    max-height: 85vh;
    overflow-y: auto;
    z-index: 95;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
    scrollbar-width: none;
    background: linear-gradient(160deg, rgba(17,12,40,0.97) 0%, rgba(10,8,30,0.99) 100%);
    border: 2px solid rgba(139,92,246,0.45);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 0 40px rgba(109,40,217,0.25), 0 20px 60px rgba(0,0,0,0.7);
}
.info-card::-webkit-scrollbar { display: none; }

.info-card.hidden {
    transform: translateY(calc(100% + 40px));
    opacity: 0;
    pointer-events: none;
}

/* Header */
.card-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
}
.planet-emoji {
    font-size: 44px;
    line-height: 1;
    filter: drop-shadow(0 0 12px rgba(167,139,250,0.4));
    flex-shrink: 0;
}
.planet-title h2 {
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    line-height: 1.1;
    margin: 0 0 3px 0;
}
.type-badge {
    font-size: 10px;
    color: #a78bfa;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 6px;
}
.mini-stats {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}
.mini-stat {
    font-size: 9px;
    color: #7c6aab;
    background: rgba(124,58,237,0.12);
    border: 1px solid rgba(124,58,237,0.25);
    padding: 2px 7px;
    border-radius: 99px;
    font-weight: 600;
}

/* Tabs */
.tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
}
.tab-btn {
    flex: 1;
    background: rgba(124,58,237,0.1);
    border: 1px solid rgba(124,58,237,0.2);
    color: #7c6aab;
    font-size: 11px;
    font-weight: 700;
    padding: 7px 4px;
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', system-ui, sans-serif;
}
.tab-btn.active {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    border-color: rgba(167,139,250,0.5);
    color: #fff;
    box-shadow: 0 0 14px rgba(109,40,217,0.4);
}
.tab-btn:hover:not(.active) {
    background: rgba(124,58,237,0.18);
    color: #a78bfa;
}

/* Tab panels */
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* Overview tab */
.fact-text {
    font-size: 13.5px;
    line-height: 1.65;
    color: #e2e8f0;
    margin: 0 0 14px 0;
}
.stat-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
}
.stat-pill {
    background: rgba(124,58,237,0.15);
    border: 1px solid rgba(167,139,250,0.25);
    padding: 5px 11px;
    border-radius: 99px;
    font-size: 11px;
    color: #c4b5fd;
    font-weight: 600;
}
.wow-strip {
    background: linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06));
    border: 1px solid rgba(251,191,36,0.3);
    border-radius: 10px;
    padding: 10px 13px;
    font-size: 12px;
    line-height: 1.5;
    color: #fde68a;
    font-weight: 500;
}
.wow-strip:empty { display: none; }

/* Learn tab */
.learn-intro {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 12px;
    line-height: 1.5;
}
.q-card {
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
    cursor: pointer;
}
.q-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    user-select: none;
    gap: 8px;
}
.q-label { flex: 1; }
.q-chevron {
    transition: transform 0.25s;
    font-size: 10px;
    opacity: 0.7;
    flex-shrink: 0;
}
.q-card.open .q-chevron { transform: rotate(180deg); }
.q-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), padding 0.2s;
    font-size: 12px;
    line-height: 1.6;
    padding: 0 12px;
}
.q-card.open .q-body { max-height: 300px; padding: 0 12px 11px; }

/* Physics — blue */
.q-physics .q-header { background: rgba(59,130,246,0.12); color: #93c5fd; border: 1px solid rgba(59,130,246,0.25); }
.q-physics .q-body  { background: rgba(59,130,246,0.07); color: #bfdbfe; border: 1px solid rgba(59,130,246,0.15); border-top: none; }
/* Chemistry — green */
.q-chem .q-header   { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.25); }
.q-chem .q-body     { background: rgba(16,185,129,0.07); color: #a7f3d0; border: 1px solid rgba(16,185,129,0.15); border-top: none; }
/* Astronomy — amber */
.q-astro .q-header  { background: rgba(245,158,11,0.12); color: #fcd34d; border: 1px solid rgba(245,158,11,0.25); }
.q-astro .q-body    { background: rgba(245,158,11,0.07); color: #fde68a; border: 1px solid rgba(245,158,11,0.15); border-top: none; }
/* Life/Survival — pink */
.q-life .q-header   { background: rgba(244,114,182,0.12); color: #f9a8d4; border: 1px solid rgba(244,114,182,0.25); }
.q-life .q-body     { background: rgba(244,114,182,0.07); color: #fbcfe8; border: 1px solid rgba(244,114,182,0.15); border-top: none; }

/* Explore tab */
.explore-section { margin-bottom: 12px; }
.explore-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    margin-bottom: 5px;
}
.mission-badge {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(251,146,60,0.1);
    border: 1px solid rgba(251,146,60,0.25);
    border-radius: 10px;
    padding: 10px 12px;
}
.rocket-icon { font-size: 24px; flex-shrink: 0; padding-top: 2px; }
.mission-info { font-size: 12px; line-height: 1.5; }
.mission-name { font-weight: 800; color: #fb923c; font-size: 13px; margin-bottom: 3px; }
.mission-info p { color: #cbd5e1; margin: 0; }
.scale-box {
    background: rgba(139,92,246,0.1);
    border: 1px solid rgba(139,92,246,0.25);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12px;
    color: #c4b5fd;
    line-height: 1.55;
}
.whatif-box {
    background: rgba(236,72,153,0.08);
    border: 1px solid rgba(236,72,153,0.2);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12px;
    color: #f9a8d4;
    line-height: 1.55;
}

/* Launch button */
.launch-btn {
    width: 100%;
    margin-top: 4px;
    background: linear-gradient(135deg, #f97316, #ef4444);
    color: white;
    border: none;
    padding: 11px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif;
    box-shadow: 0 4px 14px rgba(239,68,68,0.3);
    transition: all 0.2s;
}
.launch-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.launch-btn:active { transform: translateY(0); }
.launch-btn.hidden { display: none; }

/* Mobile */
@media (max-width: 480px) {
    .info-card {
        bottom: 70px;
        right: 15px;
        width: calc(100% - 30px);
        padding: 16px;
    }
}
```

- [ ] **Step 2: Verify styling**

With `npm run dev` still running, click a planet. The new card should slide up from the bottom-right with the purple border and dark glass look. Tabs appear but switching them does nothing yet (JS not wired up). That's expected.

- [ ] **Step 3: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: replace planet card HTML and CSS with tabbed layout"
```

---

## Task 3 — renderCard() Function + Event Wiring

**Files:**
- Modify: `src/main.js` (lines ~814–858)

- [ ] **Step 1: Replace the DOM constants block and focusOn() card code**

Find and replace this block in `main.js` (lines 814–858):

```js
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
        const missions = missionData[meshEntry.name];
        launchBtn.textContent = missions && missions.length > 1 ? `🚀 Choose Mission (${missions.length})` : `🚀 Launch Mission`;
        launchBtn.classList.remove('hidden');
    }
}
```

Replace with:

```js
// Info Card — kept as variables because galaxy-view and reset buttons reference infoCard,
// and launchBtn's addEventListener is wired below.
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
    document.getElementById('info-name').textContent = name === 'Sun' ? '☀ Sun' : name;
    document.getElementById('info-type').textContent = data.type;
    document.getElementById('info-ministats').innerHTML =
        (data.ministats || []).map(s => `<span class="mini-stat">${s}</span>`).join('');
    document.getElementById('info-fact').innerHTML = data.fact;
    document.getElementById('info-statpills').innerHTML =
        (data.statPills || []).map(s => `<div class="stat-pill">${s}</div>`).join('');
    document.getElementById('info-wow').innerHTML = data.wowStrip || data.wow || '';
    document.getElementById('info-questions').innerHTML =
        (data.learn || []).map(q => `
            <div class="q-card ${q.cls}">
                <div class="q-header">
                    <span class="q-label">${q.q}</span>
                    <span class="q-chevron">▼</span>
                </div>
                <div class="q-body">${q.a}</div>
            </div>
        `).join('');

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
```

- [ ] **Step 2: Verify tabs and expand work**

Run `npm run dev`, click a planet (e.g. Jupiter). The card opens with Overview tab active. Click 🧠 Learn tab — shows "Tap a question you're curious about 👇" with empty space (data not added yet). Click 🚀 Explore — shows empty orange/purple/pink boxes. Click a different tab and back — switching works. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add renderCard(), switchCardTab(), delegated tab/question listeners"
```

---

## Task 4 — Data: Sun, Mercury, Venus, Earth

**Files:**
- Modify: `src/main.js` — `celestialFacts` entries for Sun, Mercury, Venus, Earth

- [ ] **Step 1: Add new fields to the Sun entry**

Find `'Sun': {` in `celestialFacts` and add these fields before the closing `},`:

```js
        emoji: '☀️',
        ministats: ['Center of Solar System', '4.6 billion years old', '1 million Earths fit inside'],
        statPills: ['🔥 5,500°C surface', '⭐ 15M°C core', '💥 Nuclear fusion', '🌟 4.6B years old', '☀️ 8 min light to Earth'],
        wowStrip: 'Every second, the Sun fuses 600 million tonnes of hydrogen into helium — and that energy is what makes plants grow, weather happen, and life exist on Earth!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How does the Sun actually make energy?', a: 'Deep in the Sun\'s core, <strong>nuclear fusion</strong> smashes hydrogen atoms together to create helium — releasing enormous energy described by Einstein\'s equation <em>E=mc²</em>. The core reaches 15 million °C. The energy takes 100,000 years to travel from the core to the surface, then just 8 minutes to reach Earth!' },
            { cls: 'q-chem', q: '🧪 What is the Sun made of?', a: 'About <strong>73% hydrogen (H)</strong> and <strong>25% helium (He)</strong>, with tiny amounts of oxygen, carbon, and iron. Hydrogen is the simplest element — just 1 proton and 1 electron. The Sun is essentially a perfectly controlled hydrogen-to-helium converter that has been running for 4.6 billion years!' },
            { cls: 'q-astro', q: '🔭 How long will the Sun last?', a: 'Another <strong>5 billion years</strong>! Then it swells into a red giant, engulfing Mercury and Venus (and possibly Earth). After that it collapses into a <em>white dwarf</em> — an Earth-sized cinder that glows for trillions of years. Our Sun will outlive anything humans have ever built by an unimaginable amount.' },
            { cls: 'q-life', q: '🌱 What would happen if the Sun disappeared right now?', a: 'You\'d have <strong>8 minutes</strong> of normal life — that\'s how long light takes to reach Earth. Then total darkness. Temperatures would drop to −18°C in a week, −73°C in a year. All photosynthesis would stop. Oceans would eventually freeze. Only creatures near deep-sea hydrothermal vents might survive long-term.' },
        ],
        explore: {
            mission: 'Parker Solar Probe (NASA, 2018–present)',
            discovery: 'Parker got closer to the Sun than any spacecraft ever — just <strong>6.2 million km away</strong>! It discovered "switchbacks" — sudden reversals in the magnetic field that shoot particles to incredible speeds — and measured why the solar wind accelerates as it leaves the Sun.',
            scale: 'If the Sun were the size of a <strong>front door (2 metres tall)</strong>, Earth would be a 2-cent coin sitting about <strong>215 metres away</strong> — the length of 2 football fields. That\'s how much empty space is around us!',
            whatif: '<strong>What if the Sun were replaced by a black hole of the same mass?</strong> Earth would stay in its orbit — gravity would be identical! But in 8 minutes total darkness would fall, temperatures would plummet, and all life would end within weeks. The black hole itself would be invisible, just 3 km across.',
        },
```

- [ ] **Step 2: Add new fields to the Mercury entry**

Find `'Mercury': {` and add before its closing `},`:

```js
        emoji: '🪨',
        ministats: ['0 moons', '88-day orbit', '1st from Sun'],
        statPills: ['🌡️ −180°C nights', '🔥 430°C days', '⏱️ 59-Earth-day day', '🌑 No atmosphere', '🏃 Fastest orbit'],
        wowStrip: 'Mercury\'s "year" (88 days) is shorter than its "day" (59 Earth days). A planet where the year ends before the day does!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why are Mercury\'s days and nights so extreme?', a: 'Without an atmosphere, there\'s nothing to hold heat at night or block it during the day. Earth\'s atmosphere acts like a <strong>blanket</strong>. Mercury has no blanket — so the sunny side hits <strong>430°C</strong> and the dark side drops to <strong>−180°C</strong>. That\'s a 610°C swing! The same reason a desert cools fast at night — remove the atmosphere, make it 1,000× more extreme.' },
            { cls: 'q-chem', q: '🧪 Why does Mercury have no atmosphere?', a: 'Two reasons: First, Mercury\'s <strong>gravity is weak</strong> (37% of Earth\'s) — it can\'t hold onto gas molecules that move fast enough to escape. Second, the <em>solar wind</em> (charged particles streaming from the Sun) blasts away any gas that builds up. No atmosphere means no weather, no erosion by air — just bare rock and billions of craters.' },
            { cls: 'q-astro', q: '🔭 Why does Mercury move so fast around the Sun?', a: '<em>Kepler\'s Second Law</em>: objects orbit faster when they\'re closer to what they\'re orbiting. Mercury is the closest planet to the Sun, so it races around at <strong>47 km/s</strong> — 6× faster than Earth! A rocket needs just 11 km/s to escape Earth\'s gravity. Mercury laps that speed just from being close to the Sun.' },
            { cls: 'q-life', q: '🌱 Is there anything surprising hiding on Mercury?', a: 'Yes! Despite being the Sun\'s closest neighbour, there is <strong>water ice</strong> in Mercury\'s polar craters — places permanently in shadow where the Sun never reaches, staying at −200°C forever. NASA\'s MESSENGER spacecraft confirmed this in 2012. Ice, right next to the scorching Sun!' },
        ],
        explore: {
            mission: 'MESSENGER (NASA, 2004–2015)',
            discovery: 'MESSENGER confirmed <strong>water ice in Mercury\'s permanently shadowed polar craters</strong>. It also found Mercury\'s iron core takes up 85% of the planet\'s radius — something huge must have knocked most of the outer layers off billions of years ago!',
            scale: 'Mercury is only slightly bigger than our Moon. If Earth were a basketball, Mercury would be a large marble (3.5 cm). They\'re actually similar in size — but Mercury is much denser, with a massive iron core.',
            whatif: '<strong>What if you lived right on Mercury\'s day-night boundary?</strong> The terminator line moves so slowly you could walk at 3 km/h and keep pace with it — staying in permanent twilight forever, neither scorching nor freezing. Walking speed could keep you in perpetual dusk on Mercury!',
        },
```

- [ ] **Step 3: Add new fields to the Venus entry**

Find `'Venus': {` and add before its closing `},`:

```js
        emoji: '🔥',
        ministats: ['0 moons', '225-day orbit', '2nd from Sun'],
        statPills: ['🌡️ 464°C (melts lead!)', '🔄 Spins backwards', '⏱️ Day longer than year', '💨 96% CO₂ atmosphere', '🌧️ Sulfuric acid rain'],
        wowStrip: 'Because Venus spins backwards, the <strong>Sun rises in the west and sets in the east</strong> there — everything flipped compared to Earth!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Venus hotter than Mercury even though it\'s farther from the Sun?', a: 'The <strong>greenhouse effect</strong>! Venus has a super-thick atmosphere of CO₂ (carbon dioxide). Sunlight gets in and heats the surface, but the heat can\'t escape — trapped like inside a car on a summer day. This <em>runaway greenhouse effect</em> heats Venus to <strong>464°C</strong> — hot enough to melt lead! Mars shows the opposite: too thin an atmosphere, too cold.' },
            { cls: 'q-chem', q: '🧪 What is Venus\'s atmosphere made of?', a: 'About <strong>96% carbon dioxide (CO₂)</strong> and 3.5% nitrogen — with clouds of <em>sulfuric acid (H₂SO₄)</em>. Yes, it literally rains acid! The acid evaporates before hitting the ground (it\'s too hot down there), creating a thick yellow haze. The surface pressure is 90× Earth\'s — like being 900 metres underwater.' },
            { cls: 'q-astro', q: '🔭 Why does Venus spin backwards and so slowly?', a: 'Scientists think a <strong>giant asteroid collision</strong> billions of years ago knocked Venus\'s spin into reverse. It now rotates "retrograde" — opposite to most planets. It also spins incredibly slowly: one Venus day = <strong>243 Earth days</strong>. But its year (orbit) is only 225 days — so a day is literally longer than a year!' },
            { cls: 'q-life', q: '🌱 Could anything survive on Venus?', a: 'The surface is brutal: 464°C, crushing pressure, acid clouds. But in Venus\'s upper atmosphere (~50 km up), temperatures reach a manageable 60°C. Scientists found hints of <em>phosphine gas (PH₃)</em> there in 2020 — on Earth, phosphine is made by living things. Could microscopic life float in Venus\'s clouds? We don\'t know yet — it\'s one of science\'s biggest open questions!' },
        ],
        explore: {
            mission: 'Magellan (NASA, 1989–1994)',
            discovery: 'Magellan used <strong>radar to map 98% of Venus\'s surface</strong> through its thick clouds — discovering over 1,600 volcanoes! Some may still be active today. A new ESA mission (EnVision) will arrive in the 2030s to find out.',
            scale: 'Venus is almost a <strong>twin of Earth</strong> in size — 95% of Earth\'s diameter. Identical size, completely different destiny. One has oceans, rainforests, and life; the other is a hellscape at 464°C. The difference is almost entirely atmospheric chemistry.',
            whatif: '<strong>What if Earth swapped atmospheres with Venus?</strong> Our oceans would boil away in months. The surface would hit 400°C+. The CO₂ atmosphere would trap heat in a runaway feedback loop. Every building would be crushed by the pressure. That\'s what a runaway greenhouse effect looks like — a warning from our nearest neighbour.',
        },
```

- [ ] **Step 4: Add new fields to the Earth entry**

Find `'Earth': {` and add before its closing `},`:

```js
        emoji: '🌍',
        ministats: ['1 major moon', '365.25-day orbit', '3rd from Sun'],
        statPills: ['🌊 71% covered in ocean', '🌡️ 15°C average', '💨 78% nitrogen air', '🧲 Protective magnetic field', '🌈 Only known life!'],
        wowStrip: 'Earth is the <strong>densest planet</strong> in the solar system — despite being only the 5th largest. Its heavy iron core makes the whole planet weigh 5.97 × 10²⁴ kg!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Earth the perfect temperature for life?', a: 'Earth sits in the <em>"Goldilocks Zone"</em> — not too close to the Sun, not too far. But distance alone isn\'t enough! Earth\'s atmosphere has just enough CO₂ (0.04%) to act as a gentle warming blanket, keeping average temperature at <strong>15°C</strong>. Mars has too little greenhouse effect (too cold). Venus has too much (too hot). Earth got it just right — for now.' },
            { cls: 'q-chem', q: '🧪 What is Earth\'s atmosphere made of?', a: '<strong>78% nitrogen (N₂)</strong>, 21% oxygen (O₂), 0.9% argon, 0.04% carbon dioxide. The oxygen is almost entirely produced by plants and photosynthetic bacteria — early Earth had almost no oxygen! <em>Life literally changed Earth\'s chemistry</em> over billions of years, creating the air we breathe today.' },
            { cls: 'q-astro', q: '🔭 How does the Moon keep Earth\'s climate stable?', a: 'Without the Moon\'s gravity, Earth\'s axial tilt would wobble chaotically between 0° and 85° over millions of years — causing catastrophic climate swings: ice ages then scorching heat, over and over. The Moon acts as a <strong>gravitational anchor</strong>, keeping our tilt stable at ~23.5°. That stability is one reason life had time to evolve into complex forms.' },
            { cls: 'q-life', q: '🌱 What makes Earth special enough for life?', a: 'A remarkable combination: <strong>liquid water</strong>, a stable temperature range, a <em>magnetic field</em> blocking radiation, an ozone layer filtering UV, plate tectonics recycling nutrients, and a large Moon for stability. It\'s a long checklist! Scientists think conditions like these might be rare — making Earth one of the most special places in the galaxy.' },
        ],
        explore: {
            mission: 'International Space Station (ISS, NASA/ESA/JAXA/Roscosmos, 1998–present)',
            discovery: 'Astronauts discovered that <strong>the human body loses 1–2% of bone mass per month</strong> in microgravity — critical data for planning missions to Mars. The ISS also watches Earth from 400 km up, tracking climate change, wildfires, and hurricanes in real time.',
            scale: 'Earth\'s circumference is <strong>40,075 km</strong>. At 100 km/h (motorway speed), driving around Earth non-stop would take 17 days. The ISS orbits Earth every 90 minutes — moving at 28,000 km/h. Astronauts see 16 sunrises every single day!',
            whatif: '<strong>What if Earth\'s axis were perfectly upright?</strong> No seasons at all — everywhere would get the same sunlight year-round. The poles would be permanently cold, the equator permanently hot, and the middle zones would have eternal spring. No summer holidays — but also no brutal winters!',
        },
```

- [ ] **Step 5: Verify in browser**

Click Sun, Mercury, Venus, Earth in the simulation. Each should show the Overview tab with stat pills and a wow strip, the Learn tab with 4 expandable questions (blue/green/amber/pink), and the Explore tab with the mission box, scale challenge, and what-if scenario. Expand a few questions to confirm smooth animation.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add rich knowledge card data for Sun, Mercury, Venus, Earth"
```

---

## Task 5 — Data: Moon, Mars, Phobos, Deimos

**Files:**
- Modify: `src/main.js` — `celestialFacts` entries for Moon, Mars, Phobos, Deimos

- [ ] **Step 1: Add new fields to the Moon entry**

Find `'Moon': {` and add before its closing `},`:

```js
        emoji: '🌕',
        ministats: ['Orbits Earth', '27.3-day orbit', '384,400 km away'],
        statPills: ['🌊 Controls Earth\'s tides', '🌡️ −183°C to 127°C', '↔️ Drifting 3.8 cm/yr', '🚶 6 human landings', '🔄 Same face always'],
        wowStrip: 'Billions of years ago, the Moon was <strong>10× closer to Earth</strong> — tides were 1,000× stronger, and a day on Earth was only 6 hours long! The Moon\'s tidal drag has been slowly braking Earth\'s spin ever since.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does the Moon control Earth\'s ocean tides?', a: 'The Moon\'s gravity pulls on Earth\'s water, creating a bulge on the side closest to the Moon. Surprisingly, there\'s also a bulge on the <em>opposite</em> side — that water is being "left behind" as Earth gets tugged toward the Moon. As Earth rotates, these two bulges sweep around the planet, creating <strong>two high tides per day</strong> at most locations. It\'s pure gravity in action!' },
            { cls: 'q-chem', q: '🧪 What is the Moon made of — and where did it come from?', a: 'The Moon\'s crust is rich in oxygen, silicon, magnesium, and aluminium — similar to Earth\'s mantle. Scientists think a <strong>Mars-sized body called "Theia"</strong> smashed into early Earth 4.5 billion years ago. The blast shot material into orbit, which clumped together to form the Moon. That\'s why Moon rocks look almost identical to Earth\'s mantle rocks!' },
            { cls: 'q-astro', q: '🔭 Why do we always see the same side of the Moon?', a: 'This is called <em>synchronous rotation</em> — the Moon takes exactly as long to spin once (27.3 days) as it takes to orbit Earth (27.3 days). This isn\'t a coincidence: <strong>Earth\'s gravity slowed the Moon\'s spin</strong> until they matched, billions of years ago. The same thing happens to most large moons — it\'s the universe\'s way of "locking" orbiting bodies in sync.' },
            { cls: 'q-life', q: '🌱 Could humans live on the Moon permanently?', a: 'Challenging but possible! The Moon has no atmosphere (need a pressurised habitat), extreme temperature swings, and radiation. But there\'s <strong>water ice at the poles</strong>, which can be split into hydrogen (rocket fuel) and oxygen (breathable air). NASA\'s Artemis programme is working on lunar bases. The Moon could be humanity\'s first permanent off-Earth home!' },
        ],
        explore: {
            mission: 'Apollo 11 (NASA, July 1969) — First humans on the Moon',
            discovery: 'Neil Armstrong and Buzz Aldrin spent 2.5 hours on the surface, collecting <strong>21.5 kg of Moon rocks</strong>. Analysis showed the Moon formed from Earth\'s own material after a giant collision. They left laser reflectors we still bounce lasers off today to measure the Moon\'s exact distance!',
            scale: 'The Moon is <strong>384,400 km away</strong>. That sounds far, but all 8 planets in the solar system could fit in the gap between Earth and the Moon with room to spare — the planets lined up total about 380,000 km, just inside the gap!',
            whatif: '<strong>What if Earth had no Moon?</strong> Almost no tides. Earth\'s axis would wobble wildly (0°–85°) over millions of years, causing climate chaos. Days would be shorter (6–8 hours). Without a stable climate, complex life might never have evolved. We may owe our very existence to that rocky companion in the sky.',
        },
```

- [ ] **Step 2: Add new fields to the Mars entry**

Find `'Mars': {` and add before its closing `},`:

```js
        emoji: '🔴',
        ministats: ['2 moons', '687-day orbit', '4th from Sun'],
        statPills: ['🔴 Iron oxide surface (rust!)', '🌡️ −63°C average', '⏱️ 24.6 hr day', '🏔️ 22 km volcano', '💨 Thin CO₂ atmosphere'],
        wowStrip: 'Olympus Mons is so tall (22 km!) that if you stood at its base, <strong>the summit would be below the horizon</strong> — you can\'t see the top from the bottom because the mountain is wider than the curvature of Mars!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is gravity on Mars so much weaker than Earth?', a: 'Gravity depends on <strong>mass</strong>. Mars has only about 10.7% of Earth\'s mass — it\'s simply much smaller and lighter. Less mass = weaker gravitational pull. On Mars, you\'d weigh about <em>38% of your Earth weight</em>. A 50 kg person would feel like only 19 kg — you could jump nearly 3× higher than on Earth!' },
            { cls: 'q-chem', q: '🧪 Why is Mars red? What\'s iron oxide?', a: 'Mars is covered in <strong>iron oxide (Fe₂O₃)</strong> — the same thing as rust on an old bike! Billions of years ago, Mars had liquid water. Water + iron minerals + oxygen reacted to form rust all over the surface. When Martian winds blow, red dust fills the sky — even making sunsets appear <em>blue</em> (dust scatters light differently than on Earth).' },
            { cls: 'q-astro', q: '🔭 Why is Olympus Mons 3× taller than Everest?', a: 'On Earth, tectonic plates move — so a volcanic hotspot creates a chain of islands or mountains (like Hawaii). On Mars, <strong>the plates don\'t move</strong>. The same volcanic hotspot kept erupting in the same spot for billions of years, piling lava higher and higher. Result: Olympus Mons at 22 km — 3× taller than Everest, wider than the state of Arizona.' },
            { cls: 'q-life', q: '🌱 Did Mars ever have water — and could life have existed?', a: 'Yes! Mars has dried-up riverbeds, ancient lake basins, and polar ice caps of water and CO₂ ice. About <strong>3–4 billion years ago</strong>, Mars had liquid water on its surface. NASA\'s Perseverance rover is hunting for ancient microbial fossils in old lake sediments right now. Whether life started there — we\'re still searching!' },
        ],
        explore: {
            mission: 'Perseverance Rover (NASA, landed Feb 18, 2021)',
            discovery: 'Perseverance found that Mars had a <strong>long-lasting lake system</strong> in Jezero Crater. It also flew Ingenuity — the <em>first powered aircraft ever flown on another planet</em>! Ingenuity made over 70 flights before retiring.',
            scale: 'Mars is about <strong>half the width of Earth</strong>. If Earth were a basketball, Mars would be a tennis ball. But Mars has almost the same <em>land surface area</em> as Earth — because Earth is 71% ocean. Same land area, half the diameter!',
            whatif: '<strong>What if you sneezed on Mars?</strong> In the thin atmosphere, your sneeze cloud would drift further. The CO₂ air is unbreathable (you\'d need a suit), it\'s freezing, and intense UV radiation would hit you instantly — there\'s no ozone layer to protect you. Even stepping outside requires a full spacesuit.',
        },
```

- [ ] **Step 3: Add new fields to the Phobos entry**

Find `'Phobos': {` and add before its closing `},`:

```js
        emoji: '🪨',
        ministats: ['Mars\'s inner moon', '8-hour orbit', 'Doomed in ~50 million years'],
        statPills: ['⏱️ 8-hour orbit', '📏 26×22×18 km', '💥 Spiraling toward Mars', '🕳️ 9 km wide crater', '🏙️ City-sized moon'],
        wowStrip: 'Phobos is so close to Mars that it orbits faster than Mars rotates — from the Martian surface, it <strong>rises in the west and sets in the east</strong>, twice a day! Only Phobos and Deimos do this in our solar system.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Phobos spiraling toward Mars?', a: '<em>Tidal forces</em>! Mars\'s gravity stretches Phobos slightly, creating a bulge. The interaction between Mars\'s gravity and this bulge gradually slows Phobos down, stealing its orbital energy. As it loses energy, it sinks closer. In <strong>~50 million years</strong>, it\'ll get so close that tidal forces rip it apart — creating a ring around Mars like Saturn\'s rings!' },
            { cls: 'q-chem', q: '🧪 What is Phobos made of?', a: 'Phobos appears to be made of <em>carbonaceous chondrite</em> — dark, carbon-rich rock similar to certain asteroids. It\'s incredibly dark, reflecting only <strong>7% of light</strong> (darker than coal!). Its density is so low it might be 25–35% empty space — like a rubble pile barely held together by its own weak gravity. A captured asteroid, possibly!' },
            { cls: 'q-astro', q: '🔭 How big is the giant crater on Phobos?', a: 'The <strong>Stickney crater</strong> is 9 km wide — on a moon only 26 km across! The impact nearly shattered Phobos entirely. Its surface is covered in strange grooves radiating from Stickney — scientists think these are <em>fractures</em> caused by the same massive impact, like cracks spreading across a car windshield.' },
            { cls: 'q-life', q: '🌱 Could Phobos be useful as a space base?', a: 'Yes! Scientists have proposed using Phobos as a <strong>staging post for Mars exploration</strong>. Astronauts on Phobos could control Mars rovers in real-time (no signal delay — just 6,000 km away). Its almost-zero gravity makes landing and leaving very easy. It could also serve as a fuel depot using Martian atmosphere.' },
        ],
        explore: {
            mission: 'MMX — Martian Moons eXploration (JAXA, launching 2026, arrives 2027)',
            discovery: 'No spacecraft has landed on Phobos yet. MMX will be the first — collecting surface samples and returning them to Earth in 2031. Previous Mars orbiters (MRO, Mars Express) photographed it in detail, revealing its low density and strange groove system.',
            scale: 'Phobos is about <strong>26 km long</strong> — roughly the size of a medium city. If it floated above Paris, it would stretch from one side of the city to the other. Its gravity is so weak you could throw a ball into orbit around it with your arm!',
            whatif: '<strong>What happens when Phobos breaks apart?</strong> In 50 million years, tidal forces shatter Phobos into millions of pieces that spread into a ring around Mars. For hundreds of millions of years, Mars would have spectacular rings — visible from Earth through a telescope. The ring will then slowly rain down onto the Martian surface.',
        },
```

- [ ] **Step 4: Add new fields to the Deimos entry**

Find `'Deimos': {` and add before its closing `},`:

```js
        emoji: '🪨',
        ministats: ['Mars\'s outer moon', '30-hour orbit', 'Slowly drifting away'],
        statPills: ['⏱️ 30-hour orbit', '📏 15×12×11 km', '⭐ Looks like a star from Mars', '🥔 Potato-shaped', '🔭 Discovered 1877'],
        wowStrip: 'From Mars\'s surface, Deimos looks almost exactly like a <strong>bright star</strong> — so small it doesn\'t appear as a disc. Ancient Martian astronomers (if they existed) might never have guessed it was a moon!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why might Deimos escape from Mars entirely?', a: 'Unlike Phobos (spiraling IN), Deimos is slowly spiraling <strong>outward</strong>. Tidal interactions gradually pump energy into Deimos\'s orbit, pushing it further away — the same process that makes our Moon drift from Earth. Eventually, Deimos could escape Mars\'s gravity entirely and become a tiny asteroid orbiting the Sun independently.' },
            { cls: 'q-chem', q: '🧪 What is Deimos made of?', a: 'Like Phobos, Deimos appears to be made of dark, <em>carbonaceous</em> material — reflecting only about 7% of sunlight, like a lump of charcoal in space. Its surface is <strong>smoother than Phobos\'s</strong> — ancient craters have been gradually filled in by dust sliding down crater walls over billions of years. Very little is known about its internal structure.' },
            { cls: 'q-astro', q: '🔭 Where did Mars\'s moons come from?', a: 'Two main theories: <strong>(1) captured asteroids</strong> from the asteroid belt, or (2) debris from a giant impact on Mars. Their dark composition matches carbonaceous asteroids, supporting capture. But their near-circular orbits are strange for captured objects — most captured bodies end up in wild elliptical orbits. The origin is still scientifically debated!' },
            { cls: 'q-life', q: '🌱 What would it be like to visit Deimos?', a: 'Deimos\'s gravity is so weak (0.003 m/s²) that you could <strong>escape it with a running jump</strong> — every step would send you floating. A 70 kg person would weigh just 0.2 kg on Deimos. You\'d need to anchor yourself with tethers constantly. It would feel more like spacewalking than walking on a world.' },
        ],
        explore: {
            mission: 'MMX — Martian Moons eXploration (JAXA, launching 2026)',
            discovery: 'Deimos has never had a dedicated spacecraft visit it. Mars Reconnaissance Orbiter photographed it in detail in 2009, confirming its smooth surface. MMX will observe Deimos on its way to Phobos. Most of what we know comes from remote observation.',
            scale: 'Deimos is only about <strong>15 km long</strong> — smaller than Manhattan island (21 km). Its gravity is so weak you\'d weigh less than a sheet of paper. Escape velocity is just 5.6 m/s — slower than a professional baseball pitch. Throw hard and you\'re in orbit!',
            whatif: '<strong>What if you threw a ball on Deimos?</strong> The escape velocity is only 5.6 metres per second — faster than a slow jog. Any throw harder than that and the ball escapes into space forever. If you accidentally jumped too hard, so would you! Every movement would have to be very, very gentle.',
        },
```

- [ ] **Step 5: Verify in browser**

Click Moon, Mars, Phobos, and Deimos. All three tabs should work for each. The Explore tab for Phobos and Deimos will show the "🚀 Launch Mission" button (since they\'re in missionData via MMX).

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add rich knowledge card data for Moon, Mars, Phobos, Deimos"
```

---

## Task 6 — Data: Jupiter, Io, Europa, Ganymede, Callisto

**Files:**
- Modify: `src/main.js` — `celestialFacts` entries for Jupiter, Io, Europa, Ganymede, Callisto

- [ ] **Step 1: Add new fields to Jupiter**

Find `'Jupiter': {` and add before its closing `},`:

```js
        emoji: '🪐',
        ministats: ['95 known moons', '11.8-year orbit', '5th from Sun'],
        statPills: ['🌍 1,300 Earths fit inside', '⚡ 9.9-hour day', '🌡️ −108°C cloud tops', '🔴 Storm: 350+ years', '💪 2.5× Earth gravity'],
        wowStrip: 'Jupiter spins so fast that its equator <strong>bulges outward</strong> — it\'s noticeably fatter in the middle than at the poles. You can actually see this through a basic telescope!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why has Jupiter\'s Great Red Spot been going for 350 years?', a: 'On Earth, storms die when they hit land. Jupiter has <strong>no solid surface</strong> — it\'s gas all the way down! Without land to stop it, the storm just keeps spinning. Jupiter\'s internal heat keeps pumping energy in, like a never-ending engine. Scientists call it a <em>persistent anticyclone</em> — a self-sustaining high-pressure vortex.' },
            { cls: 'q-chem', q: '🧪 What is Jupiter actually made of?', a: 'About <strong>90% hydrogen (H₂)</strong> and <strong>10% helium (He)</strong> — the same ingredients as the Sun. But deep inside, the pressure is so extreme that hydrogen transforms into a <em>metal</em> — it conducts electricity like copper wire. This "metallic hydrogen" generates Jupiter\'s magnetic field, which is <strong>20,000× stronger than Earth\'s</strong>.' },
            { cls: 'q-astro', q: '🔭 Why does Jupiter have so many moons?', a: 'Jupiter\'s enormous <strong>gravity acts like a giant vacuum cleaner</strong> in space — it captures passing asteroids and comets into orbit. It has <strong>95 confirmed moons</strong>, including Ganymede (bigger than Mercury!), Europa (hidden ocean!), and Io (400+ active volcanoes). Jupiter is basically a mini solar system all by itself.' },
            { cls: 'q-life', q: '🌱 What would happen if you fell into Jupiter?', a: 'There\'s no ground — you\'d just sink deeper and deeper. First, <strong>600 km/h winds</strong> would shred your spacecraft. Then increasing pressure would crush it like a tin can. Then heat would melt everything. Eventually your remains would dissolve into the planet itself. Jupiter is the ultimate gas trap — no solid bottom, just increasingly extreme conditions.' },
        ],
        explore: {
            mission: 'Juno Spacecraft (NASA, orbiting Jupiter since 2016)',
            discovery: 'Juno discovered that Jupiter\'s coloured bands go <strong>3,000 km deep</strong> — not just surface paint! It also found enormous cyclone storms at each pole arranged in perfect geometric patterns — a hexagon of storms, like a cosmic flower.',
            scale: 'If Earth were a <strong>grape</strong>, Jupiter would be a <strong>basketball</strong>. The Sun would be a <strong>door</strong>. Try holding a grape next to a basketball — that\'s us compared to Jupiter. Now imagine the door across the room being the Sun.',
            whatif: '<strong>What if Jupiter were hollow?</strong> You could fit <em>1,300 planet Earths</em> inside with room to rattle around. The hollow shell would still weigh more than everything else in the solar system combined — except the Sun. Jupiter contains 71% of all planetary mass in our solar system.',
        },
```

- [ ] **Step 2: Add new fields to Io**

Find `'Io': {` and add before its closing `},`:

```js
        emoji: '🌋',
        ministats: ['Jovian moon', '1.77-day orbit', 'Most volcanic world'],
        statPills: ['🌋 400+ active volcanoes', '🔥 Lava lakes on surface', '🧀 Yellow-orange surface', '💨 Sulfur dioxide atmosphere', '⚡ Tidal squeeze heating'],
        wowStrip: 'Io is the most volcanically active body in the entire solar system — more eruptions than Earth, all other planets, and all other moons <strong>combined</strong>. Its surface is constantly being repaved with fresh lava.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Io have so many volcanoes?', a: '<em>Tidal heating</em>! Io is caught between Jupiter\'s massive gravity and the pulls of Europa and Ganymede. These forces constantly <strong>squeeze and stretch Io</strong> — like kneading dough. The friction generates enormous heat in Io\'s interior, melting rock and fuelling hundreds of volcanoes. The same tidal forces act on Earth\'s Moon, but Io experiences them 10,000× more intensely.' },
            { cls: 'q-chem', q: '🧪 Why is Io yellow and orange?', a: 'Io\'s surface is covered in <strong>sulphur (S)</strong> and <strong>sulphur dioxide (SO₂)</strong> in various colours depending on temperature — yellow, orange, red, and white. When sulphur cools rapidly, it\'s yellow. Hotter sulphur goes orange or red. SO₂ frost appears white. Io is basically a giant sulphur chemistry laboratory constantly stirred by volcanic eruptions!' },
            { cls: 'q-astro', q: '🔭 How high do Io\'s volcanic plumes shoot?', a: 'Io\'s largest volcano, Pele, shoots plumes up to <strong>300 km high</strong> — 30× the height of Earth\'s atmosphere! Because Io has low gravity and only a thin SO₂ atmosphere, material travels enormous distances. Voyager 1 discovered these plumes in 1979 — the first active volcanoes ever found beyond Earth. It was a complete scientific surprise.' },
            { cls: 'q-life', q: '🌱 Could anything live on Io?', a: 'Io\'s surface is drenched in Jupiter\'s radiation (equivalent to <strong>3,600 chest X-rays per day</strong>), covered in toxic sulphur compounds, and constantly erupting. It\'s one of the most hostile places in the solar system. However, some scientists speculate about microbial life far underground, below the volcanism and radiation — very unlikely, but not completely impossible.' },
        ],
        explore: {
            mission: 'Galileo (NASA, 1995–2003) + Juno extended mission flybys (2023–present)',
            discovery: 'Galileo confirmed Io\'s tidal heating and mapped hundreds of volcanic features. Juno\'s extended mission has now flown within 1,500 km of Io — the closest any spacecraft has been — photographing active lava lakes and erupting plumes in stunning detail.',
            scale: 'Io is almost exactly the <strong>same size as our Moon</strong>. Same size, completely different reality: our Moon is geologically dead and quiet; Io is the most volcanically violent world we know. The difference is entirely due to where they orbit.',
            whatif: '<strong>What if you stood on Io\'s surface (without protection)?</strong> Jupiter would fill 20° of sky — enormous! Radiation from Jupiter\'s magnetic field equivalent to 3,600 X-rays would hit you immediately. Volcanic gases would be toxic. The ground could literally erupt beneath you. An unprotected person would last less than a minute.',
        },
```

- [ ] **Step 3: Add new fields to Europa**

Find `'Europa': {` and add before its closing `},`:

```js
        emoji: '🧊',
        ministats: ['Jovian moon', '3.55-day orbit', 'Hidden ocean beneath ice'],
        statPills: ['🌊 Ocean: 2× all Earth\'s oceans', '❄️ Ice shell 10–30 km thick', '🎯 Top alien life candidate', '⚡ Tidal heating', '🔵 Smoothest world in solar system'],
        wowStrip: 'Europa\'s subsurface ocean may contain <strong>twice as much liquid water as all of Earth\'s oceans combined</strong> — hidden beneath miles of ice. It\'s one of the best places in the solar system to search for alien life!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How can there be a liquid ocean under miles of ice?', a: '<em>Tidal heating!</em> Like Io, Europa is squeezed by Jupiter\'s gravity and nearby moons. This generates heat in Europa\'s interior — enough to keep a massive ocean <strong>liquid beneath its icy crust</strong>. The ice shell (10–30 km thick) acts as an insulating blanket. Below it, the ocean is thought to be ~100 km deep — and has been liquid for billions of years.' },
            { cls: 'q-chem', q: '🧪 What is the ocean under Europa\'s ice made of?', a: 'Probably <strong>saltwater</strong> — similar to Earth\'s oceans, with dissolved minerals from the rocky seafloor. Europa\'s surface has reddish-brown streaks that appear to be salt minerals (like magnesium sulphate) brought up from the ocean through cracks in the ice. The ocean chemistry might actually resemble Earth\'s early oceans — when life first appeared here!' },
            { cls: 'q-astro', q: '🔭 Why is Europa\'s surface so smooth?', a: 'Europa has almost <strong>no impact craters</strong> — its surface is constantly renewed! The ice shell moves and flexes, cracking and refreezing. New ice wells up from below, erasing old craters. At large scales, Europa is the smoothest body in the solar system. If scaled to the size of a bowling ball, it would be smoother than the ball.' },
            { cls: 'q-life', q: '🌱 Could alien life exist in Europa\'s ocean?', a: 'This is one of science\'s biggest open questions! Life needs liquid water, energy, and chemistry — Europa has all three. At its seafloor, <em>hydrothermal vents</em> heated by tidal energy could support ecosystems — just like on Earth\'s ocean floor, where life thrives without any sunlight. NASA\'s <strong>Europa Clipper</strong> (launched 2024, arriving 2030) will fly by Europa 50 times to investigate.' },
        ],
        explore: {
            mission: 'Europa Clipper (NASA, launched Oct 2024, arrives Jupiter 2030)',
            discovery: 'Hubble Space Telescope detected what appear to be <strong>water vapour plumes erupting from Europa\'s south pole</strong> — meaning the ocean is venting into space! If confirmed, a spacecraft could fly through these plumes and sample ocean chemistry without even landing on the ice.',
            scale: 'Europa is slightly smaller than our Moon. But its ocean contains <strong>2× as much liquid water as all Earth\'s oceans combined</strong> — because it\'s ~100 km deep. Earth\'s deepest ocean trench (Mariana, 11 km) would fit inside Europa\'s ocean 9 times over.',
            whatif: '<strong>What if Europa\'s ice cracked open?</strong> Ocean water would instantly freeze in space. But just before it did, any life near the crack would be exposed to vacuum — briefly. Some Earth microbes can survive brief space exposure. If Europa life is similarly tough, it could be the first alien life we ever detected — spraying into space to meet us.',
        },
```

- [ ] **Step 4: Add new fields to Ganymede**

Find `'Ganymede': {` and add before its closing `},`:

```js
        emoji: '🌙',
        ministats: ['Jovian moon', '7.15-day orbit', 'Largest moon in the solar system'],
        statPills: ['🏆 Bigger than Mercury!', '🧲 Own magnetic field', '🌌 Has its own auroras', '🌊 Subsurface ocean', '📏 5,268 km diameter'],
        wowStrip: 'Ganymede is bigger than Mercury and Pluto! If it orbited the Sun instead of Jupiter, it would be classified as a <strong>planet</strong>. It\'s the only moon with its own magnetic field — giving it spectacular auroras!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How does Ganymede have its own magnetic field?', a: 'Ganymede has a <strong>liquid iron core</strong> that generates a magnetic field — just like Earth! This makes it the <em>only moon in the solar system</em> with its own magnetosphere. It carves out a small bubble within Jupiter\'s massive magnetic field, creating its own protected zone — and its own spectacular auroras visible from the Hubble Space Telescope.' },
            { cls: 'q-chem', q: '🧪 What is Ganymede made of?', a: 'About <strong>50% water ice and 50% rocky material</strong> (silicates and iron), arranged in layers like Earth: iron core → rocky mantle → icy outer layer. Scientists also think there\'s a <em>saltwater ocean</em> sandwiched between ice layers deep inside — different layers of ice at different pressures and temperatures, creating an alien geology unlike anywhere else.' },
            { cls: 'q-astro', q: '🔭 Why is Ganymede so much bigger than other moons?', a: 'When Jupiter formed 4.6 billion years ago, it was surrounded by a disk of gas and dust — a mini solar system. Ganymede formed from this disk, accumulating material over millions of years. Because Jupiter was so massive, its gravity gathered enormous amounts of material, letting Ganymede grow into the <strong>largest moon in the entire solar system</strong>.' },
            { cls: 'q-life', q: '🌱 Could life hide in Ganymede\'s hidden ocean?', a: 'Ganymede\'s ocean is sandwiched between <strong>layers of ice</strong> — not in contact with rock. On Earth, we think life started at hydrothermal vents where water meets rock, releasing minerals. If Ganymede\'s ocean doesn\'t touch rock, it might lack those key minerals. ESA\'s JUICE mission (arriving 2034) will orbit Ganymede specifically to answer this.' },
        ],
        explore: {
            mission: 'JUICE — JUpiter ICy moons Explorer (ESA, launched 2023, arrives 2031)',
            discovery: 'Hubble confirmed Ganymede\'s auroras in 2015, proving its magnetic field. JUICE will be the <strong>first spacecraft ever to orbit a moon other than our own</strong>! It will map Ganymede\'s magnetic field, ocean, and surface in unprecedented detail.',
            scale: 'Ganymede\'s diameter is <strong>5,268 km</strong> — larger than Mercury (4,879 km) but smaller than Mars (6,779 km). If it orbited the Sun, it would easily be a planet. The Voyager team briefly debated reclassifying it before deciding moons are moons!',
            whatif: '<strong>What if Ganymede were a planet?</strong> It would be the 8th planet in our solar system, orbiting the Sun beyond Mars. Its icy surface would be cold tundra with spectacular auroras at the poles. It\'s large enough to have a thin atmosphere. We\'d definitely have sent a rover there by now!',
        },
```

- [ ] **Step 5: Add new fields to Callisto**

Find `'Callisto': {` and add before its closing `},`:

```js
        emoji: '☄️',
        ministats: ['Jovian moon', '16.7-day orbit', 'Most cratered world'],
        statPills: ['☄️ Surface saturated with craters', '🌑 4-billion-year-old surface', '🥶 No tidal heating', '🌊 Possible subsurface ocean', '📸 Solar system\'s time capsule'],
        wowStrip: 'Callisto\'s surface is so old and so covered in craters that scientists call it "saturated" — there\'s <strong>literally no room for new craters</strong> without overlapping old ones. It\'s a 4-billion-year record of asteroid hits!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Callisto so geologically inactive compared to the other Galilean moons?', a: 'The key is <strong>distance from Jupiter</strong>. Io, Europa, and Ganymede are close enough for significant tidal heating — which drives geological activity. Callisto is much farther out, so tidal heating is minimal. Without internal heat, its geology froze billions of years ago, preserving a perfect fossil record of the solar system\'s most violent early period.' },
            { cls: 'q-chem', q: '🧪 What is Callisto made of?', a: 'Roughly equal parts <strong>rock and water ice</strong>, mixed together — not as well separated into layers as Ganymede. Its dark surface comes from carbon-rich material deposited by comets and asteroids over billions of years. The bright spots in craters are <em>freshly exposed ice</em> that hasn\'t darkened yet — like fresh snow showing through an old, dirty snowfield.' },
            { cls: 'q-astro', q: '🔭 What is the "Late Heavy Bombardment"?', a: 'About <strong>3.9 billion years ago</strong>, the solar system went through a chaotic period when giant planets (especially Jupiter) shifted orbits, sending countless asteroids crashing into planets and moons. Callisto\'s crater-saturated surface is one of the best records of this violent era. Earth was also bombarded, but plate tectonics erased all evidence.' },
            { cls: 'q-life', q: '🌱 Could Callisto be a future human outpost?', a: 'Possibly! Callisto might have a <strong>thin subsurface ocean</strong> — kept liquid by radioactive decay rather than tidal heating. It also has a critical advantage: it\'s outside Jupiter\'s intense radiation belts (unlike Io, Europa, and Ganymede). This makes it the <em>safest</em> of Jupiter\'s large moons for future human visits or fuel-mining bases.' },
        ],
        explore: {
            mission: 'Galileo (NASA, 1995–2003) + JUICE (ESA, will fly by Callisto)',
            discovery: 'Galileo\'s magnetic measurements hinted that <strong>Callisto might have a subsurface ocean</strong>. Close-up images revealed its strange surface — ancient multi-ring impact basins, bright ice patches, and terrain so saturated with craters it looks like a golf ball.',
            scale: 'Callisto is almost the <strong>same size as Mercury</strong>. If you could see it from above Jupiter\'s clouds, it would appear 4× larger than our Moon appears from Earth. From Earth, Callisto is visible as a tiny moving dot through even a basic telescope on a clear night.',
            whatif: '<strong>What if Earth had no plate tectonics (like Callisto)?</strong> Every crater would remain forever — never erased. The Chicxulub crater (dinosaur-killer impact, 66 million years ago, 180 km wide) would still be a prominent scar. The entire 4-billion-year history of asteroid hits would be permanently written on Earth\'s surface, just like Callisto\'s face.',
        },
```

- [ ] **Step 6: Verify in browser**

Click Jupiter, Io, Europa, Ganymede, Callisto. All Learn tabs should have 4 working expandable questions. All Explore tabs should populate fully.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: add rich knowledge card data for Jupiter and its four Galilean moons"
```

---

## Task 7 — Data: Saturn, Titan

**Files:**
- Modify: `src/main.js` — `celestialFacts` entries for Saturn, Titan

- [ ] **Step 1: Add new fields to Saturn**

Find `'Saturn': {` and add before its closing `},`:

```js
        emoji: '💍',
        ministats: ['146 known moons', '29.4-year orbit', '6th from Sun'],
        statPills: ['🛁 Less dense than water!', '💍 Rings 282,000 km wide', '⏱️ 10.7-hour day', '🌡️ −138°C cloud tops', '🌕 146 moons (and counting)'],
        wowStrip: 'Saturn\'s rings are <strong>282,000 km wide</strong> — nearly the distance from Earth to the Moon — yet they\'re thinner than a 10-story building. Scale that down to a sheet of paper and it would be wider than a football pitch!',
        learn: [
            { cls: 'q-physics', q: '⚛️ How can Saturn float in water?', a: 'An object floats if it\'s <strong>less dense than water</strong>. Saturn is made of gas (hydrogen and helium) and is so huge yet so light that its average density is only <em>0.687 g/cm³</em> — water is 1.0. So yes, if you had a bathtub big enough, Saturn would bob on top! It\'s the only planet in our solar system less dense than water.' },
            { cls: 'q-chem', q: '🧪 What are Saturn\'s rings actually made of?', a: 'About <strong>90–95% water ice</strong>, plus chunks of rock and dust. Particles range from tiny ice grains (like snowflakes) to boulders the size of houses. The rings likely formed when a moon or comet got too close and was <em>ripped apart by tidal forces</em>. The debris spread into the rings we see today — and they\'re only 10–100 metres thick at most!' },
            { cls: 'q-astro', q: '🔭 How did Saturn end up with 146 moons?', a: 'Saturn\'s <strong>massive gravity</strong> captures passing space objects into orbit. It also has a ring system that clumps together to form tiny "moonlets." Some moons, like <em>Titan</em>, are ancient — formed with Saturn. Others are recently captured asteroids. Scientists discover new tiny moons almost every year. Saturn keeps adding to its collection!' },
            { cls: 'q-life', q: '🌱 Could Titan — Saturn\'s biggest moon — have alien life?', a: 'Titan is one of the most exciting places in the solar system! It has <strong>lakes, rivers, and rain</strong> — but made of liquid methane (CH₄) instead of water. Its thick orange atmosphere resembles early Earth\'s. NASA\'s <em>Dragonfly</em> mission (launching 2028) will fly a helicopter on Titan, searching for chemical signs of life in the 2030s!' },
        ],
        explore: {
            mission: 'Cassini-Huygens (NASA/ESA, orbited Saturn 2004–2017)',
            discovery: 'Cassini discovered that Enceladus (a small moon) has <strong>geysers of water ice shooting into space</strong> — revealing a liquid ocean beneath its surface. Cassini ended its mission by diving into Saturn\'s atmosphere in a heroic "Grand Finale" after 13 years of discoveries.',
            scale: 'Saturn\'s rings span <strong>282,000 km</strong>. The Moon orbits Earth at 384,000 km. So Saturn\'s rings are almost as wide as the Earth-Moon gap — yet barely thicker than a tall building! Thin as a razor blade stretched across a football field.',
            whatif: '<strong>What if Saturn\'s rings disappeared?</strong> They\'re actually slowly doing just that — "ring rain" particles are constantly being pulled into Saturn. Scientists estimate the rings could completely disappear in <em>100 million years</em>. In cosmic time, we\'re incredibly lucky to exist right now when they\'re still here to admire.',
        },
```

- [ ] **Step 2: Add new fields to Titan**

Find `'Titan': {` and add before its closing `},`:

```js
        emoji: '🌧️',
        ministats: ['Saturnian moon', '15.9-day orbit', 'Only moon with a thick atmosphere'],
        statPills: ['🌡️ −179°C surface', '🧡 Thick orange haze sky', '🌊 Methane lakes & rivers', '💨 Nitrogen atmosphere', '🦅 Humans could fly with wings!'],
        wowStrip: 'Titan is the only moon with a dense atmosphere — and it\'s <strong>thicker than Earth\'s</strong>! The air pressure at Titan\'s surface is 1.5× Earth\'s, and the gravity is so low that humans could literally fly by flapping strap-on wings.',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why could humans actually fly on Titan with wings?', a: 'Two factors combine: (1) Titan\'s gravity is only <strong>14% of Earth\'s</strong> — you\'d weigh 1/7 of normal. (2) Titan\'s atmosphere is <strong>1.5× denser than Earth\'s</strong>. Flying requires generating lift, which depends on air density and wingspan. Low gravity + thick air = even large flapping wings could lift a person. NASA\'s Dragonfly helicopter mission exploits exactly this!' },
            { cls: 'q-chem', q: '🧪 Why does Titan have methane lakes instead of water lakes?', a: 'At −179°C, water is frozen as solid as rock. But at that temperature, <strong>methane (CH₄) and ethane (C₂H₆)</strong> can be liquid! Titan has a complete "methane water cycle": it evaporates from lakes, forms clouds, rains down, flows in rivers, and pools in seas. Ligeia Mare — a methane sea — is <strong>500 km wide</strong>, comparable to Lake Superior on Earth!' },
            { cls: 'q-astro', q: '🔭 What makes Titan\'s orange haze?', a: 'Titan\'s atmosphere contains nitrogen (N₂) and methane (CH₄). Sunlight and charged particles from Saturn\'s magnetosphere break apart methane molecules. The fragments recombine into complex organic molecules called <em>"tholins"</em> — long chains that form the <strong>orange haze</strong> blanketing Titan. This same chemistry may have occurred on early Earth before life began!' },
            { cls: 'q-life', q: '🌱 Could alien life exist on Titan — but not as we know it?', a: 'Most life on Earth uses liquid water. Titan doesn\'t have liquid water on its surface. But could life use <strong>liquid methane instead</strong>? Scientists have theorised about "methane-based life" that would breathe hydrogen instead of oxygen and eat organic molecules from the atmosphere. It would be completely alien to us — but Titan has all the ingredients to try.' },
        ],
        explore: {
            mission: 'Huygens Probe (ESA, landed Jan 14, 2005) + Dragonfly (NASA, launching 2028)',
            discovery: 'Huygens descended through Titan\'s atmosphere for 2.5 hours, photographing <strong>drainage channels, shorelines, and rounded pebbles</strong> of water ice — clear signs of flowing liquid. It was the most distant soft landing ever achieved. Dragonfly will fly to dozens of sites in the 2030s.',
            scale: 'Titan is <strong>larger than Mercury</strong>! If it orbited the Sun instead of Saturn, it would be called a planet. Its methane sea (Ligeia Mare) is the size of Lake Superior. You could literally sail a boat across an alien moon\'s methane lake.',
            whatif: '<strong>What if humans visited Titan?</strong> You\'d need a warm suit (−179°C) but not a pressure suit — air pressure is fine. You could breathe with an oxygen supply. You could fly with wings! But organic haze would block sunlight, solar panels wouldn\'t work well, and the methane everywhere would be deeply alien. It\'s one of the most strangely accessible otherworldly places in the solar system.',
        },
```

- [ ] **Step 3: Verify in browser**

Click Saturn and Titan. All tabs should populate fully and questions should expand smoothly.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add rich knowledge card data for Saturn and Titan"
```

---

## Task 8 — Data: Uranus, Titania, Neptune, Triton

**Files:**
- Modify: `src/main.js` — `celestialFacts` entries for Uranus, Titania, Neptune, Triton

- [ ] **Step 1: Add new fields to Uranus**

Find `'Uranus': {` and add before its closing `},`:

```js
        emoji: '🔵',
        ministats: ['28 known moons', '84-year orbit', '7th from Sun'],
        statPills: ['↔️ 98° axial tilt (spins sideways!)', '🔵 Methane blue-green colour', '❄️ −195°C atmosphere', '💎 Diamond rain possible', '⏱️ 17.2-hour day'],
        wowStrip: 'Deep inside Uranus, the pressure is so extreme that scientists think carbon atoms are crushed into <strong>actual diamonds</strong> — which then "rain" downward through the ice layers. Uranus might literally rain diamonds!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Uranus spin completely on its side?', a: 'Scientists believe a <strong>massive collision with an Earth-sized object</strong> billions of years ago knocked Uranus completely sideways. Its axial tilt is 98° — meaning it essentially rolls around the Sun on its side. This creates the solar system\'s most extreme seasons: each pole gets <strong>42 years of continuous sunlight</strong>, then 42 years of total darkness!' },
            { cls: 'q-chem', q: '🧪 What gives Uranus its blue-green colour?', a: '<strong>Methane gas (CH₄)</strong> in Uranus\'s upper atmosphere. Methane absorbs red wavelengths of sunlight and reflects blue-green wavelengths back to our eyes. The more methane, the bluer the planet. Saturn (less methane) looks yellow-brown; Uranus (more methane) looks blue-green; Neptune (even more methane) is an even deeper, richer blue.' },
            { cls: 'q-astro', q: '🔭 Why is Uranus called an "ice giant"?', a: 'Unlike Jupiter and Saturn (mostly hydrogen and helium gas), Uranus\'s interior contains large amounts of <strong>water (H₂O), methane (CH₄), and ammonia (NH₃)</strong> — compressed into a hot, dense fluid (not quite ice, not quite liquid). Astronomers call these "ices," hence "ice giant." At extreme pressures inside Uranus, these materials behave unlike anything on Earth.' },
            { cls: 'q-life', q: '🌱 What\'s this about diamond rain inside Uranus?', a: 'At <strong>6 million atmospheres of pressure</strong> inside Uranus, carbon atoms (from methane) get squished so tightly they form diamonds. These diamonds are thought to "rain" downward through the ice layers toward the core. Scientists recreated this in the lab using powerful lasers! It\'s a real physical process, not science fiction — just happening on a scale too extreme to imagine.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Jan 24, 1986) — the only spacecraft to visit Uranus',
            discovery: 'Voyager 2 discovered <strong>10 new moons and 2 new rings</strong> during its 5.5-hour flyby. It found Uranus has a strange off-centre magnetic field — tilted 60° from its rotation axis. A dedicated Uranus orbiter mission was recommended as NASA\'s top planetary priority by the 2022 Decadal Survey.',
            scale: 'Uranus is about <strong>4× wider than Earth</strong>. If Earth were a tennis ball, Uranus would be a basketball. But despite being bigger, Uranus is actually less massive than Neptune — it\'s puffier and less dense. Its dark, narrow rings are very different from Saturn\'s bright ones.',
            whatif: '<strong>What if Uranus\'s tilt were like Earth\'s (23°)?</strong> It would have normal seasonal cycles — gentle spring, summer, autumn, winter — repeating every 84 years. Poles wouldn\'t experience decades-long darkness. Scientists believe the tilting collision also stripped away internal heat, making Uranus the coldest-atmosphered planet even though Neptune is farther from the Sun.',
        },
```

- [ ] **Step 2: Add new fields to Titania**

Find `'Titania': {` and add before its closing `},`:

```js
        emoji: '🌑',
        ministats: ['Uranus\'s largest moon', '8.7-day orbit', '788 km radius'],
        statPills: ['🏔️ Canyon longer than the USA', '❄️ −203°C surface', '🌑 Half rock, half ice', '☄️ Ancient cratered terrain', '📏 Messina Chasmata: 1,500 km'],
        wowStrip: 'Titania has canyons (called "chasmata") that stretch <strong>thousands of kilometres</strong> — some longer than the entire United States! They formed when the moon\'s interior froze and expanded, cracking the crust like a cooling shell.',
        learn: [
            { cls: 'q-physics', q: '⚛️ How did Titania\'s enormous canyons form?', a: 'When Titania formed, its interior was warm and partly liquid. As it cooled, the water ice froze solid. But <strong>ice is less dense than liquid water — it expands when it freezes</strong>. This expansion cracked and stretched Titania\'s crust, creating enormous rift valleys. Similar to the East African Rift on Earth — but on a moon, frozen in time billions of years ago.' },
            { cls: 'q-chem', q: '🧪 What is Titania made of?', a: 'About <strong>50% water ice and 50% rock</strong> (silicate minerals and carbon compounds) — similar to other large icy moons. Its dark surface comes from carbon-rich material deposited by comets over billions of years. The bright spots inside craters are <em>freshly exposed ice</em> that hasn\'t been darkened yet — like white chalk through old, weathered rock.' },
            { cls: 'q-astro', q: '🔭 How was Titania discovered?', a: 'Titania was discovered by <strong>William Herschel on January 11, 1787</strong> — just 6 years after he discovered Uranus itself! He spotted it through his handmade telescope in his garden. Titania is named after a character in Shakespeare\'s <em>A Midsummer Night\'s Dream</em>. All of Uranus\'s 28 moons are named after Shakespeare or Alexander Pope characters.' },
            { cls: 'q-life', q: '🌱 Could Titania have conditions for life?', a: 'It\'s very cold (−203°C) and far from the Sun, so liquid water on the surface is impossible. But scientists have wondered whether there could be a thin <strong>subsurface ocean</strong> — kept just warm enough by radioactive decay in Titania\'s rocky core. With so little data (only Voyager 2 has ever flown past), Titania remains one of the least-explored large moons in the solar system.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Jan 24, 1986) — the only spacecraft to image Titania',
            discovery: 'Voyager 2 photographed about <strong>40% of Titania\'s surface</strong> during its quick flyby, revealing the Messina Chasmata canyon system, ancient craters, and a mix of old and young terrain. No spacecraft has returned in the 40 years since.',
            scale: 'Titania is <strong>1,578 km in diameter</strong> — about the width of India. Its canyon Messina Chasmata is 1,500 km long. If that canyon were on Earth, it would stretch from London to Moscow — deeper than the Grand Canyon, wider than most rivers.',
            whatif: '<strong>What if you stood in Titania\'s canyon?</strong> Uranus would hang in the sky as a spectacular pale blue disc, about 5× the apparent size of our Moon. Gravity is only 38% of Earth\'s — you\'d feel light. The canyon walls around you would stretch 5 km deep — like standing at the bottom of a crack while clouds are above you. And utterly silent.',
        },
```

- [ ] **Step 3: Add new fields to Neptune**

Find `'Neptune': {` and add before its closing `},`:

```js
        emoji: '💨',
        ministats: ['16 known moons', '165-year orbit', '8th from Sun'],
        statPills: ['💨 2,100 km/h winds (fastest!)', '💙 Vivid cobalt blue', '🌡️ −200°C', '⏱️ 16.1-hour day', '🔭 Predicted by maths before seen!'],
        wowStrip: 'Neptune was <strong>discovered mathematically</strong> before anyone ever saw it! Astronomers noticed Uranus\'s orbit was slightly wrong — they calculated exactly where a hidden planet must be, pointed a telescope there, and found Neptune the same night. Maths discovered a planet!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why does Neptune have the strongest winds in the solar system?', a: 'Neptune receives almost <strong>900× less sunlight than Earth</strong>, yet its winds reach 2,100 km/h — supersonic! The energy comes from inside: Neptune generates <em>2.6× more heat</em> than it receives from the Sun. This internal heat (left over from Neptune\'s formation), combined with rapid rotation and no warm equatorial zone, creates these extreme jet streams.' },
            { cls: 'q-chem', q: '🧪 Why is Neptune such an intense blue?', a: 'Like Uranus, Neptune contains <strong>methane (CH₄)</strong> which absorbs red light and reflects blue. But Neptune is <em>more intensely blue</em> than Uranus — scientists believe there\'s another, still-unidentified absorber in Neptune\'s atmosphere making it that vivid cobalt colour. What that substance is remains an open question — genuinely one of the solar system\'s unsolved mysteries.' },
            { cls: 'q-astro', q: '🔭 How was Neptune discovered using only mathematics?', a: 'In 1845–46, mathematicians Le Verrier and Adams independently calculated that a <strong>hidden planet</strong> must be gravitationally pulling Uranus off its predicted orbit. Le Verrier sent his prediction to the Berlin Observatory. That same night, astronomers aimed their telescope at the calculated position and <em>found Neptune within 1°</em>. One of the greatest predictions in the history of science.' },
            { cls: 'q-life', q: '🌱 Could anything survive Neptune\'s conditions?', a: 'Neptune is an ice giant — its interior contains hot, dense "ices" (water, methane, ammonia) at extreme pressure. Some scientists speculate that at certain pressure-temperature layers inside Neptune, there could be <strong>liquid water</strong>. Whether life could exist there is wildly speculative — but the chemistry isn\'t inherently hostile to basic organic molecules. We know very little about ice giant interiors.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Aug 25, 1989) — the only spacecraft to visit Neptune',
            discovery: 'Voyager 2 discovered Neptune\'s Great Dark Spot (a storm the size of Earth), found <strong>6 new moons</strong>, confirmed the ring system, and photographed Triton\'s nitrogen geysers — the coldest active "volcanic" activity ever found. Neptune completed its first full orbit since discovery in <strong>2011!</strong>',
            scale: 'Neptune is <strong>4× wider than Earth</strong>. But it\'s so far away (30× the Earth-Sun distance) that even powerful telescopes barely show it as a blue disc. Voyager 2 took <strong>12 years to reach Neptune</strong> after launch — and it was moving at 56,000 km/h.',
            whatif: '<strong>What if you hovered at Neptune\'s cloud tops?</strong> The 2,100 km/h winds would be faster than a rifle bullet. The Sun would be a very bright star — 900× dimmer than on Earth, but still the brightest thing in the sky. The sky would be vivid dark blue. And Triton would rise in the west — it orbits backwards.',
        },
```

- [ ] **Step 4: Add new fields to Triton**

Find `'Triton': {` and add before its closing `},`:

```js
        emoji: '🔄',
        ministats: ['Neptune\'s largest moon', '5.88-day retrograde orbit', 'Doomed in ~3.6 billion years'],
        statPills: ['🔄 Orbits backwards!', '❄️ −235°C (near absolute zero)', '🌋 Active nitrogen geysers', '☄️ Captured Kuiper Belt Object', '💥 Future ring system'],
        wowStrip: 'At −235°C, Triton is one of the <strong>coldest objects in the solar system</strong> — just 38°C above absolute zero (the coldest anything can physically be). Yet despite this, it has active geysers shooting nitrogen gas 8 km into space!',
        learn: [
            { cls: 'q-physics', q: '⚛️ Why is Triton slowly spiraling into Neptune?', a: 'Triton orbits <strong>backwards</strong> (retrograde) — opposite to Neptune\'s rotation. Tidal forces between Neptune and Triton always work against Triton\'s orbit, gradually slowing it and stealing orbital energy. As it loses energy, it sinks closer. In about <strong>3.6 billion years</strong>, it crosses the Roche limit and Neptune\'s gravity rips it apart — creating spectacular rings!' },
            { cls: 'q-chem', q: '🧪 What are Triton\'s nitrogen geysers made of?', a: 'Triton\'s surface is covered in frozen <strong>nitrogen (N₂) ice</strong>. As sunlight hits the dark sub-surface material, it absorbs heat and warms the nitrogen just below the surface. The nitrogen turns to gas and erupts through weak spots in the ice — like a geyser, but powered by sunlight at −235°C. It shoots <em>dark nitrogen plumes 8 km high</em>. The coldest active "volcanic" activity ever found!' },
            { cls: 'q-astro', q: '🔭 Where did Triton actually come from?', a: 'Triton orbits the wrong way, on a tilted path — strongly suggesting it wasn\'t born with Neptune. Scientists believe Triton was once a large <em>Kuiper Belt Object</em> — like Pluto! Billions of years ago, it passed too close to Neptune and was gravitationally captured. The capture probably destroyed Neptune\'s original moon system — Triton\'s arrival reshaped everything.' },
            { cls: 'q-life', q: '🌱 Could Triton have a hidden ocean?', a: 'Despite being the coldest world with active geysers, some scientists think Triton might have a <strong>subsurface liquid ocean</strong> — kept warm by tidal heating (as its orbit slowly decays) plus radioactive decay in its rocky core. Pluto — Triton\'s likely twin — is now thought to have a subsurface ocean. If Pluto has one, Triton might too. We won\'t know until we send a spacecraft.' },
        ],
        explore: {
            mission: 'Voyager 2 (NASA, flew by Aug 25, 1989) — the only spacecraft to observe Triton',
            discovery: 'Voyager 2 photographed Triton\'s active <strong>nitrogen geysers</strong> — completely unexpected on such a cold world. It revealed a young, constantly-refreshed surface, and a pinkish colour from complex organic molecules (<em>tholins</em>) created by radiation hitting nitrogen and methane. No spacecraft has returned in 35+ years.',
            scale: 'Triton is <strong>2,706 km across</strong> — about the width of the continental United States from coast to coast. At −235°C, a cup of water left on its surface would freeze solid in milliseconds. Yet geysers shoot gas 8 km high from that same frozen surface — a world of extremes at the edge of the solar system.',
            whatif: '<strong>What if Triton breaks apart into a ring in 3.6 billion years?</strong> Tidal forces rip it apart near the Roche limit. The resulting ring would be spectacular — far more massive than Saturn\'s current rings. For millions of years, Neptune would have the most dramatic ring system in the solar system, visible as a bright band from Earth — before it slowly rains down.',
        },
```

- [ ] **Step 5: Verify all planets in browser**

Click every planet and moon in the simulation. Every card should:
- Open with correct emoji, name, type badge, and mini-stat pills
- Show populated stat pills and wow strip in Overview tab
- Show 4 expandable questions in Learn tab (click to expand, click again to collapse)
- Show mission, scale, and what-if content in Explore tab
- Preserve working launch button behaviour (opens mission picker for non-Earth/Sun bodies)

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add rich knowledge card data for Uranus, Titania, Neptune, Triton — all 21 bodies complete"
```

---

## Task 9 — Final Polish + Mobile Check

**Files:**
- Modify: `src/style.css` (mobile breakpoint only if needed)

- [ ] **Step 1: Test on mobile viewport**

In Chrome DevTools (F12), switch to iPhone 14 viewport (390×844). Click a planet. Verify:
- Card appears at bottom, full width
- Tabs are tappable and fit on one row
- Question cards expand without overflow
- Explore tab content fits without horizontal scroll

If the tabs wrap or overflow, update the mobile breakpoint in `src/style.css`:

```css
@media (max-width: 480px) {
    .info-card {
        bottom: 70px;
        right: 15px;
        width: calc(100% - 30px);
        padding: 16px;
    }
    .tab-btn { font-size: 10px; padding: 6px 2px; }
}
```

- [ ] **Step 2: Verify galaxy view and reset still hide the card**

Click "🌌 Galaxy View" — card should hide. Click "🪐 Solar System" — card stays hidden until clicking a planet. Click "Reset View" — card hides. No console errors.

- [ ] **Step 3: Final commit**

```bash
git add src/style.css src/main.js
git commit -m "feat: complete planet knowledge card redesign — tabbed, educational, kids-friendly"
```

---

## Self-Review

**Spec coverage:**
- ✅ Playful style (emoji hero, pill tabs, stat chips) — Tasks 1 & 2
- ✅ 3 tabs: Overview / Learn / Explore — Tasks 1 & 3
- ✅ 4 expandable colour-coded questions per body (physics/chemistry/astronomy/life) — Tasks 4–8
- ✅ Scale challenge and What If scenario per body — Tasks 4–8
- ✅ Real mission + key discovery per body — Tasks 4–8
- ✅ All 21 celestial bodies — Sun, 8 planets, 12 moons — Tasks 4–8
- ✅ Launch button behaviour preserved — Task 3
- ✅ `infoCard` variable preserved for galaxy-view and reset references — Task 3
- ✅ No 3D/scene code touched — entire plan stays in HTML/CSS/JS card code

**Placeholders:** None. All 21 entries have complete data. All functions show complete code.

**Type consistency:** `renderCard(name: string)` is called from `focusOn(meshEntry)` using `meshEntry.name`. `switchCardTab(tabName: string)` is called from both `renderCard()` and the delegated tab listener using `btn.dataset.tab`. `data.learn[]` entries have `{cls, q, a}` — exactly what the innerHTML template reads.
