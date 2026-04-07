# Mission Mini-Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a randomised arrival mini-game (Gauntlet / Hazard Run / Mission Control) that intercepts the rocket arrival and challenges the player — fail means mission lost and must relaunch, success reveals the existing discovery panel.

**Architecture:** The existing rocket arrival code at `main.js:1731` calls `launchMissionGame(mission, target)` instead of directly showing the arrival panel. A new `// --- MISSION MINI-GAME ---` section in `main.js` contains all game logic. Two new overlay panels in `index.html` handle the game UI and mission-lost screen. All 19 `celestialFacts` entries gain a `game{}` data block.

**Tech Stack:** Vanilla JS, Canvas 2D (Hazard Run), CSS animations (timing needle), `setInterval` / `requestAnimationFrame`, existing Three.js scene untouched.

---

## File Map

| File | Change |
|---|---|
| `index.html` | Add `#mission-game-overlay` and `#mission-lost-panel` before `</body>` |
| `src/style.css` | Add game overlay + mission-lost styles at end of file |
| `src/main.js` | (1) Add `game{}` to all 19 `celestialFacts` entries; (2) Replace lines 1731–1737 with `launchMissionGame()` call; (3) Add `// --- MISSION MINI-GAME ---` section with all game functions |

---

## Task 1 — HTML Panels

**Files:**
- Modify: `index.html` — add two panels before `</body>` (after the arrival-panel div, line 159)

- [ ] **Step 1: Add the two panels**

Find `</body>` at the end of `index.html` and insert before it:

```html
    <!-- Mission Mini-Game Overlay -->
    <div id="mission-game-overlay" class="mission-overlay hidden">
        <div class="mission-overlay-header">
            <span id="mg-mission-label"></span>
            <span id="mg-type-badge" class="mg-type-badge"></span>
        </div>

        <!-- Gauntlet section -->
        <div id="mg-gauntlet" class="mg-section hidden">
            <div class="stage-track" id="mg-stage-track"></div>
            <div id="mg-stage-title" class="mg-stage-title"></div>
            <p id="mg-stage-prompt" class="mg-stage-prompt"></p>
            <div id="mg-timing-wrap" class="mg-timing-wrap hidden">
                <div class="mg-bar-track">
                    <div id="mg-bar-zone" class="mg-bar-zone"></div>
                    <div id="mg-bar-needle" class="mg-bar-needle"></div>
                </div>
                <button id="mg-fire-btn" class="mg-fire-btn">🔥 FIRE!</button>
            </div>
            <div id="mg-choice-wrap" class="mg-choice-wrap hidden">
                <div id="mg-choices" class="mg-choices"></div>
            </div>
            <div id="mg-tap-wrap" class="mg-tap-wrap hidden">
                <div id="mg-tap-count" class="mg-tap-count">0/8</div>
                <button id="mg-tap-btn" class="mg-tap-btn">👆 TAP!</button>
            </div>
            <div class="mg-timer-row">
                <div class="mg-timer-bar"><div id="mg-timer-fill" class="mg-timer-fill"></div></div>
                <span id="mg-timer-text" class="mg-timer-text"></span>
            </div>
        </div>

        <!-- Hazard Run section -->
        <div id="mg-hazard" class="mg-section hidden">
            <canvas id="mg-canvas" width="370" height="170"></canvas>
            <div class="mg-lives-row">
                <span class="mg-lives-label">Lives:</span>
                <span id="mg-lives"></span>
                <span id="mg-hazard-timer" class="mg-hazard-timer"></span>
            </div>
            <p class="mg-hazard-hint">Press ↑↓ or tap top/bottom half to dodge</p>
        </div>

        <!-- Mission Control section -->
        <div id="mg-control" class="mg-section hidden">
            <p class="mg-control-intro">Click a system when it flashes to boost it!</p>
            <div id="mg-systems-grid" class="mg-systems-grid"></div>
            <div id="mg-crisis-alert" class="mg-crisis-alert hidden"></div>
            <div class="mg-timer-row">
                <div class="mg-timer-bar"><div id="mg-control-timer-fill" class="mg-timer-fill"></div></div>
                <span id="mg-control-timer-text" class="mg-timer-text"></span>
            </div>
        </div>
    </div>

    <!-- Mission Lost Panel -->
    <div id="mission-lost-panel" class="mission-lost hidden">
        <div class="ml-explosion">💥</div>
        <div class="ml-title">Mission Lost</div>
        <div id="ml-mission-sub" class="ml-sub"></div>
        <div id="ml-reason" class="ml-reason"></div>
        <div id="ml-real-fact" class="ml-real-fact"></div>
        <div class="ml-btn-row">
            <button id="ml-relaunch-btn" class="ml-relaunch-btn">🚀 Relaunch Mission</button>
            <button id="ml-close-btn" class="ml-close-btn">✕ Close</button>
        </div>
    </div>
```

- [ ] **Step 2: Verify HTML is valid**

Run: `npm run dev`

Open the browser — the app should load without errors. No new elements should be visible yet (all hidden).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add mission game overlay and mission-lost panel HTML"
```

---

## Task 2 — CSS Styles

**Files:**
- Modify: `src/style.css` — append all game styles at the end of the file

- [ ] **Step 1: Append game CSS to the end of style.css**

Add after all existing styles:

```css
/* ==============================
   MISSION MINI-GAME
   ============================== */

.mission-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 420px;
    max-width: calc(100vw - 30px);
    background: linear-gradient(160deg, rgba(17,12,40,0.98) 0%, rgba(10,8,30,0.99) 100%);
    border: 2px solid rgba(251,191,36,0.5);
    border-radius: 20px;
    padding: 22px;
    z-index: 200;
    box-shadow: 0 0 60px rgba(251,191,36,0.2), 0 20px 60px rgba(0,0,0,0.8);
}
.mission-overlay.hidden { display: none; }

.mission-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}
#mg-mission-label { font-size: 13px; font-weight: 700; color: #fbbf24; }
.mg-type-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: rgba(251,191,36,0.15);
    border: 1px solid rgba(251,191,36,0.35);
    color: #fbbf24;
    padding: 3px 8px;
    border-radius: 99px;
}

.mg-section { display: block; }
.mg-section.hidden { display: none; }

/* Stage progress dots (Gauntlet) */
.stage-track { display: flex; gap: 5px; margin-bottom: 12px; }
.stage-dot { flex: 1; height: 5px; border-radius: 99px; background: rgba(255,255,255,0.08); }
.stage-dot.done { background: #4ade80; }
.stage-dot.active { background: #fbbf24; animation: stagePulse 1s ease-in-out infinite; }
@keyframes stagePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.mg-stage-title { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 6px; }
.mg-stage-prompt { font-size: 12px; color: #94a3b8; line-height: 1.55; margin-bottom: 14px; }

/* Timing bar */
.mg-bar-track {
    height: 24px;
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    position: relative;
    overflow: hidden;
    margin-bottom: 12px;
}
.mg-bar-zone {
    position: absolute;
    top: 0;
    height: 100%;
    background: rgba(74,222,128,0.25);
    border-left: 2px solid #4ade80;
    border-right: 2px solid #4ade80;
}
.mg-bar-needle {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: #fff;
    border-radius: 99px;
    box-shadow: 0 0 8px #fff;
    animation: needleSweep 1.6s linear infinite;
}
@keyframes needleSweep { 0% { left: 0%; } 100% { left: 96%; } }
.mg-fire-btn {
    width: 100%;
    padding: 13px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #f97316, #ef4444);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    box-shadow: 0 0 20px rgba(239,68,68,0.4);
    transition: filter 0.1s;
}
.mg-fire-btn:hover { filter: brightness(1.15); }
.mg-fire-btn:active { transform: scale(0.97); }

/* Choice */
.mg-choices { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
.mg-choice-btn {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(99,102,241,0.35);
    background: rgba(99,102,241,0.12);
    color: #a5b4fc;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
}
.mg-choice-btn:hover { background: rgba(99,102,241,0.25); color: #c7d2fe; }

/* Tap */
.mg-tap-wrap { text-align: center; margin-bottom: 12px; }
#mg-tap-count { font-size: 32px; font-weight: 800; color: #fbbf24; margin-bottom: 10px; }
.mg-tap-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 0 20px rgba(109,40,217,0.5);
    transition: transform 0.08s, filter 0.08s;
    user-select: none;
    -webkit-user-select: none;
}
.mg-tap-btn:active { transform: scale(0.95); filter: brightness(1.2); }

/* Shared timer row */
.mg-timer-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.mg-timer-bar { flex: 1; height: 5px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
.mg-timer-fill { height: 100%; border-radius: 99px; background: #fbbf24; width: 100%; }
.mg-timer-text { font-size: 11px; color: #fbbf24; font-weight: 700; white-space: nowrap; }

/* Hazard Run */
#mg-canvas {
    display: block;
    width: 100%;
    height: 170px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 8px;
}
.mg-lives-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
.mg-lives-label { font-weight: 600; }
#mg-lives { font-size: 16px; flex: 1; }
#mg-hazard-timer { font-size: 11px; color: #fbbf24; font-weight: 700; }
.mg-hazard-hint { font-size: 10px; color: #475569; margin-top: 5px; font-style: italic; }

/* Mission Control */
.mg-control-intro { font-size: 11px; color: #64748b; margin-bottom: 10px; }
.mg-systems-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.mg-sys-card {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 9px 10px;
    cursor: pointer;
    transition: background 0.15s;
}
.mg-sys-card:hover { background: rgba(255,255,255,0.05); }
.mg-sys-crisis {
    border-color: rgba(239,68,68,0.6) !important;
    background: rgba(239,68,68,0.1) !important;
    animation: crisisPulse 0.5s ease-in-out infinite;
}
@keyframes crisisPulse { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 12px rgba(239,68,68,0.5); } }
.mg-sys-name { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 5px; font-weight: 700; }
.mg-sys-bar-wrap { height: 6px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; margin-bottom: 4px; }
.mg-sys-bar-fill { height: 100%; border-radius: 99px; transition: width 0.1s ease; }
.mg-sys-pct { font-size: 11px; font-weight: 700; }
.mg-crisis-alert {
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.5);
    border-radius: 8px;
    padding: 8px 12px;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: #f87171;
    margin-bottom: 8px;
    animation: alertFlash 0.8s ease-in-out infinite;
}
.mg-crisis-alert.hidden { display: none; }
@keyframes alertFlash { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

/* ==============================
   MISSION LOST PANEL
   ============================== */

.mission-lost {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    max-width: calc(100vw - 30px);
    background: linear-gradient(160deg, rgba(17,12,40,0.98) 0%, rgba(10,8,30,0.99) 100%);
    border: 2px solid rgba(239,68,68,0.5);
    border-radius: 20px;
    padding: 24px;
    z-index: 200;
    box-shadow: 0 0 60px rgba(239,68,68,0.2), 0 20px 60px rgba(0,0,0,0.8);
}
.mission-lost.hidden { display: none; }
.ml-explosion { font-size: 56px; text-align: center; margin-bottom: 12px; animation: mlShake 0.4s ease-in-out infinite; }
@keyframes mlShake { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-4deg) scale(1.08); } 75% { transform: rotate(4deg) scale(1.08); } }
.ml-title { font-size: 26px; font-weight: 800; color: #ef4444; text-align: center; margin-bottom: 4px; }
.ml-sub { font-size: 11px; color: #64748b; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
.ml-reason {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    color: #fca5a5;
    font-style: italic;
    text-align: center;
    margin-bottom: 10px;
}
.ml-real-fact {
    background: rgba(251,191,36,0.08);
    border: 1px solid rgba(251,191,36,0.25);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 11px;
    line-height: 1.55;
    color: #fde68a;
    margin-bottom: 16px;
}
.ml-real-fact strong { color: #fbbf24; }
.ml-btn-row { display: flex; gap: 8px; }
.ml-relaunch-btn {
    flex: 1;
    padding: 11px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    box-shadow: 0 0 14px rgba(109,40,217,0.4);
}
.ml-relaunch-btn:hover { filter: brightness(1.1); }
.ml-close-btn {
    padding: 11px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    background: rgba(255,255,255,0.05);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
}
.ml-close-btn:hover { background: rgba(255,255,255,0.1); }
```

- [ ] **Step 2: Verify no visual regressions**

With `npm run dev` running, confirm the existing planet card, tabs, countdown, and mission picker still look correct. Nothing new should be visible.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add mission game overlay and mission-lost panel CSS"
```

---

## Task 3 — Game Data: Sun, Mercury, Venus, Moon, Mars

**Files:**
- Modify: `src/main.js` — add `game{}` block to 5 `celestialFacts` entries

- [ ] **Step 1: Add game data to Sun entry**

Find the Sun entry's closing `},` (after `explore: { ... },`) and add before it:

```js
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
```

- [ ] **Step 2: Add game data to Mercury entry**

Find the Mercury entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 3: Add game data to Venus entry**

Find the Venus entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 4: Add game data to Moon entry**

Find the Moon entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 5: Add game data to Mars entry**

Find the Mars entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 6: Verify & commit**

```bash
git add src/main.js
git commit -m "feat: add mission game data for Sun, Mercury, Venus, Moon, Mars"
```

---

## Task 4 — Game Data: Phobos, Deimos, Jupiter, Io, Europa

**Files:**
- Modify: `src/main.js` — add `game{}` to 5 more entries

- [ ] **Step 1: Add game data to Phobos**

Find the Phobos entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 2: Add game data to Deimos**

Find the Deimos entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 3: Add game data to Jupiter**

Find the Jupiter entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 4: Add game data to Io**

Find the Io entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 5: Add game data to Europa**

Find the Europa entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add mission game data for Phobos, Deimos, Jupiter, Io, Europa"
```

---

## Task 5 — Game Data: Ganymede, Callisto, Saturn, Titan, Uranus, Titania, Neptune, Triton

**Files:**
- Modify: `src/main.js` — add `game{}` to final 8 entries

- [ ] **Step 1: Add game data to Ganymede**

Find the Ganymede entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 2: Add game data to Callisto**

Find the Callisto entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 3: Add game data to Saturn**

Find the Saturn entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 4: Add game data to Titan**

Find the Titan entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 5: Add game data to Uranus**

Find the Uranus entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 6: Add game data to Titania**

Find the Titania entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 7: Add game data to Neptune**

Find the Neptune entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 8: Add game data to Triton**

Find the Triton entry's closing `},` and add before it:

```js
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
```

- [ ] **Step 9: Commit**

```bash
git add src/main.js
git commit -m "feat: add mission game data for Ganymede, Callisto, Saturn, Titan, Uranus, Titania, Neptune, Triton — all 19 bodies complete"
```

---

## Task 6 — Core Game Engine + Integration

**Files:**
- Modify: `src/main.js` — add new section + hook into arrival at line ~1731

- [ ] **Step 1: Add the core game engine functions**

Find the line `arrClose.addEventListener('click', () => {` in `main.js` and add the following new section **before** it:

```js
// --- MISSION MINI-GAME ---

let activeGameTimer = null;
let activeGameFrame = null;
let activeGameCleanup = null;

function hideMissionGame() {
    document.getElementById('mission-game-overlay').classList.add('hidden');
    ['mg-gauntlet', 'mg-hazard', 'mg-control'].forEach(id =>
        document.getElementById(id).classList.add('hidden'));
    if (activeGameTimer) { clearInterval(activeGameTimer); activeGameTimer = null; }
    if (activeGameFrame) { cancelAnimationFrame(activeGameFrame); activeGameFrame = null; }
    if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
}

function launchMissionGame(mission, target) {
    const gameData = celestialFacts[target.name] && celestialFacts[target.name].game;
    if (!gameData) { onGameSuccess(mission, target); return; }

    document.getElementById('mg-mission-label').textContent = `${mission.emoji} ${mission.name} → ${target.name}`;

    const types = ['gauntlet', 'hazard', 'control'];
    const type = types[Math.floor(Math.random() * types.length)];

    const badges = { gauntlet: '🏁 GAUNTLET', hazard: '🕹️ HAZARD RUN', control: '📡 MISSION CONTROL' };
    document.getElementById('mg-type-badge').textContent = badges[type];

    document.getElementById('mission-game-overlay').classList.remove('hidden');

    if (type === 'gauntlet')      runGauntlet(mission, target, gameData);
    else if (type === 'hazard')   runHazardRun(mission, target, gameData);
    else                          runMissionControl(mission, target, gameData);
}

function onGameSuccess(mission, target) {
    hideMissionGame();
    arrEmoji.textContent = mission.emoji;
    arrMission.textContent = `${mission.name} has arrived at ${target.name}!`;
    arrDiscovery.textContent = '🔭 ' + mission.discovery;
    arrFunfact.textContent = mission.funFact;
    arrivalPanel.classList.remove('hidden');
}

function onGameFail(mission, target, gameData) {
    hideMissionGame();
    document.getElementById('ml-mission-sub').textContent = `${mission.name} · ${target.name} · ${mission.year}`;
    document.getElementById('ml-reason').textContent = gameData.failReason;
    document.getElementById('ml-real-fact').innerHTML = `<strong>Real fact:</strong> ${gameData.realFact}`;
    document.getElementById('mission-lost-panel').classList.remove('hidden');
}

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

```

- [ ] **Step 2: Hook into the arrival point**

Find this block at line ~1731:
```js
            // Show arrival celebration panel
            if (r.mission) {
                arrEmoji.textContent = r.mission.emoji;
                arrMission.textContent = `${r.mission.name} has arrived at ${r.target.name}!`;
                arrDiscovery.textContent = '🔭 ' + r.mission.discovery;
                arrFunfact.textContent = r.mission.funFact;
                arrivalPanel.classList.remove('hidden');
            }
```

Replace it with:
```js
            // Launch mini-game before showing arrival panel
            if (r.mission) {
                launchMissionGame(r.mission, r.target);
            }
```

- [ ] **Step 3: Verify basic wiring**

Run `npm run dev`. Launch a mission to any planet. After the rocket arrives, the `#mission-game-overlay` should appear (it may be empty/broken since game functions aren't added yet, but it should show). No console errors for the wiring itself.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add core game engine - launchMissionGame, onGameSuccess, onGameFail, integration hook"
```

---

## Task 7 — Gauntlet Mechanic

**Files:**
- Modify: `src/main.js` — add Gauntlet functions after the `// --- MISSION MINI-GAME ---` section

- [ ] **Step 1: Add all Gauntlet functions**

Add after `onGameFail()` and before the `ml-relaunch-btn` listener:

```js
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

        // Progress dots
        document.getElementById('mg-stage-track').innerHTML =
            stages.map((_, j) =>
                `<div class="stage-dot ${j < i ? 'done' : j === i ? 'active' : ''}"></div>`
            ).join('');

        document.getElementById('mg-stage-title').textContent = `${stage.icon} Stage ${i + 1}: ${stage.name}`;
        document.getElementById('mg-stage-prompt').textContent = stage.prompt;
        document.getElementById('mg-timer-text').textContent = '';

        // Hide all mechanic wrappers
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

    // Zone shrinks by 3% per stage: 22% → 19% → 16% → 13%
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

        // Read needle position relative to track
        const trackRect = needle.parentElement.getBoundingClientRect();
        const needleRect = needle.getBoundingClientRect();
        const needlePct = ((needleRect.left - trackRect.left) / trackRect.width) * 100;

        if (needlePct >= zoneLeft && needlePct <= zoneLeft + zoneWidth) {
            needle.style.animation = 'none';
            setTimeout(() => showStage(stageIdx + 1), 350);
        } else {
            needle.style.animation = 'none';
            onGameFail(mission, target, gameData);
        }
    };

    fireBtn.addEventListener('click', handler);
}

function runChoiceStage(stage, stageIdx, mission, target, gameData, showStage) {
    document.getElementById('mg-choice-wrap').classList.remove('hidden');

    const choicesEl = document.getElementById('mg-choices');
    choicesEl.innerHTML = stage.options.map((opt, i) =>
        `<button class="mg-choice-btn" data-idx="${i}">${opt}</button>`
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
}
```

- [ ] **Step 2: Test Gauntlet**

Run `npm run dev`. Launch a mission. When the Gauntlet game type is selected (random — try a few launches or temporarily force `const type = 'gauntlet'` in `launchMissionGame` for testing):

- 4 stage dots appear at top
- Each stage shows icon, name, prompt
- Timing stage: needle sweeps, fire button works, hit = next stage, miss = Mission Lost
- Choice stage: 3 buttons appear with 5s countdown, correct choice = next stage, wrong = Mission Lost
- Tap stage: tap count increases, reach target = next stage, time out = Mission Lost
- Completing all 4 stages shows the arrival panel

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add Gauntlet mechanic with timing, choice, and tap stages"
```

---

## Task 8 — Hazard Run Mechanic

**Files:**
- Modify: `src/main.js` — add `runHazardRun()` after the Gauntlet functions

- [ ] **Step 1: Add the Hazard Run function**

Add after `runTapStage()`:

```js
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
    const CW = canvas.width;   // 370 — intrinsic canvas pixels
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

        // Spawn obstacles: gap shrinks from 1200ms to 600ms over 20 seconds
        const spawnInterval = Math.max(600, 1200 - elapsed * 0.03);
        if (Date.now() - lastSpawn > spawnInterval) {
            spawnObstacle();
            lastSpawn = Date.now();
        }

        // Clear
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
        if (elapsed >= DURATION_MS) {
            done = true;
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
    activeGameCleanup = () => document.removeEventListener('keydown', keyHandler);

    // Touch/click controls (tap top or bottom half of canvas)
    canvas.addEventListener('click', e => {
        if (done) return;
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < rect.height / 2) lane = Math.max(0, lane - 1);
        else lane = Math.min(2, lane + 1);
    });
}
```

- [ ] **Step 2: Test Hazard Run**

Temporarily force `const type = 'hazard'` in `launchMissionGame()` to test. Launch a mission:

- Canvas appears with dark background, lane guides, planet emoji on right
- Spacecraft (🛸) visible in middle lane
- Obstacles scroll in from the right
- Arrow keys ↑↓ change lanes
- Tapping top/bottom half of canvas changes lanes
- After 3 hits: Mission Lost screen appears
- After 20 seconds without dying: arrival panel appears
- Remove the forced type override when done testing

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add Hazard Run mechanic with canvas rendering, lane dodging, lives system"
```

---

## Task 9 — Mission Control Mechanic

**Files:**
- Modify: `src/main.js` — add `runMissionControl()` after `runHazardRun()`

- [ ] **Step 1: Add the Mission Control function**

Add after `runHazardRun()`:

```js
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

    const grid = document.getElementById('mg-systems-grid');
    const crisisAlert = document.getElementById('mg-crisis-alert');
    const controlTimerFill = document.getElementById('mg-control-timer-fill');
    const controlTimerText = document.getElementById('mg-control-timer-text');

    // Animate the overall timer bar
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
        setTimeout(() => {
            if (activeCrisisSys === SYSTEMS[idx]) {
                activeCrisisSys = null;
                crisisAlert.classList.add('hidden');
                nextCrisisAt = Date.now() + 2000 + Math.random() * 2000;
            }
        }, 4000);
    }

    grid.addEventListener('click', e => {
        if (done || !activeCrisisSys) return;
        const card = e.target.closest('.mg-sys-card');
        if (!card) return;
        if (card.dataset.sys === activeCrisisSys) {
            values[activeCrisisSys] = Math.min(100, values[activeCrisisSys] + BOOST_AMOUNT);
            activeCrisisSys = null;
            crisisAlert.classList.add('hidden');
            nextCrisisAt = Date.now() + 2500 + Math.random() * 2000;
        }
    });

    renderGrid();

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
            onGameSuccess(mission, target);
            return;
        }

        renderGrid();
    }, TICK_MS);
}
```

- [ ] **Step 2: Test Mission Control**

Temporarily force `const type = 'control'` in `launchMissionGame()`. Launch a mission:

- 4 system cards appear (Fuel, Power, Shields, Comms) with colored bars
- Bars drain over time (Fuel fastest at 18s, Comms slowest at 30s)
- Every ~3 seconds a crisis alert flashes in red below the grid
- Clicking the correct (flashing) system card boosts it +40%
- Clicking the wrong system does nothing
- Any bar reaching 0% → Mission Lost screen
- Surviving 25 seconds → arrival panel
- Remove the forced type when done testing

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add Mission Control mechanic with system drain, crisis events, and boost"
```

---

## Task 10 — Final Verification

**Files:**
- Read-only verification, possible small fixes

- [ ] **Step 1: Remove any forced type from launchMissionGame**

Confirm `launchMissionGame()` in `src/main.js` uses `Math.random()` for type selection, not a forced value. If there's any test override left from Tasks 7–9, remove it.

- [ ] **Step 2: Full end-to-end test — all 3 game types**

Run `npm run dev`. Launch the Juno mission to Jupiter multiple times until you see all 3 game types rotate. For each:

| Game Type | Test pass | Test fail |
|---|---|---|
| Gauntlet | Complete all 4 stages → arrival panel shows | Miss timing / wrong choice / time out on tap → Mission Lost appears |
| Hazard Run | Survive 20s without losing all lives → arrival panel | Lose 3 lives → Mission Lost appears |
| Mission Control | All bars above 0 for 25s → arrival panel | Any bar hits 0 → Mission Lost appears |

- [ ] **Step 3: Test Mission Lost flow**

On any Mission Lost screen:
- "🚀 Relaunch Mission" → Mission picker opens for same planet ✓
- "✕ Close" → panel hides, launch button reappears ✓

- [ ] **Step 4: Test mobile layout**

In Chrome DevTools mobile viewport (390px wide): game overlay panels should be full-width, tap top/bottom of canvas works for Hazard Run lane switching.

- [ ] **Step 5: Verify no console errors**

Check browser console — no TypeErrors, no "cannot read property of null", no animation conflicts.

- [ ] **Step 6: Final commit**

```bash
git add src/main.js src/style.css index.html
git commit -m "feat: complete mission mini-game — 3-type randomised arrival challenge for all 19 planets"
```

---

## Self-Review

**Spec coverage:**
- ✅ 3 game types randomised — `launchMissionGame()` Task 6
- ✅ Gauntlet: 4 stages from pool of 5–6, timing/choice/tap — Task 7
- ✅ Timing zone shrinks per stage (22%→19%→16%→13%) — Task 7
- ✅ Hazard Run: 20s, 3 lives, speed ramps every 5s, planet-specific hazards — Task 8
- ✅ Mission Control: 4 systems, drain rates, crisis events, 25s win — Task 9
- ✅ Mission Lost: fail reason + real fact + relaunch/close buttons — Task 6
- ✅ Relaunch calls existing `showMissionPicker()` — Task 6
- ✅ Success shows existing `arrivalPanel` — Task 6
- ✅ `game{}` data for all 19 bodies — Tasks 3–5
- ✅ Integration at line 1731 (replaces 6-line arrival block) — Task 6
- ✅ `hideMissionGame()` cleans up timers, frames, and document listeners — Task 6

**Placeholder scan:** None. All stage data, hazard arrays, crisis messages, and game logic contain specific values.

**Type consistency:**
- `launchMissionGame(mission, target)` → calls `runGauntlet/runHazardRun/runMissionControl(mission, target, gameData)` ✓
- `onGameSuccess/onGameFail(mission, target, gameData)` consistent across all callers ✓
- `activeGameTimer`, `activeGameFrame`, `activeGameCleanup` referenced consistently ✓
- `HAZARD_EMOJIS` defined before `runHazardRun` uses it ✓
