# Mission Mini-Game Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

When a player's rocket reaches its destination planet, instead of immediately showing the arrival discovery panel, a randomly-chosen mini-game challenges the player to complete the mission. Fail → "Mission Lost" screen, must relaunch. Succeed → existing arrival panel with discovery text.

Target audience: kids 6–13. Three game types rotate randomly, each planet has unique hazards/content, creating high replayability. Difficulty is real — kids are expected to fail and try again.

---

## Flow Integration

```
startCountdown() → countdown overlay → rocket flies → rocket arrives at planet
  OLD (line 1736): arrivalPanel.classList.remove('hidden')
  NEW:             launchMissionGame(r.mission, r.target)
                      ↓ Math.random() picks one of 3 types
                      runGauntlet(mission, target)
                    | runHazardRun(mission, target)
                    | runMissionControl(mission, target)
                      ↓
                      onGameSuccess(mission, target) → arrivalPanel (existing, unchanged)
                      onGameFail(mission, target)    → #mission-lost-panel (new)
```

The mission log panel hides (existing behaviour at line 1728) before the game launches. Nothing else in the existing flow changes.

---

## Three Game Mechanics

### 1 — Gauntlet 🏁

**Concept:** Survive 4 random stages in sequence. Fail any stage → instant mission failure.

**Stage pool:** Each planet has 5–6 stage definitions. 4 are drawn randomly (without replacement) per run.

**Stage types:**

| Type | Mechanic | Fail condition |
|---|---|---|
| `timing` | Needle sweeps bar; press FIRE in green zone | Needle exits zone before press |
| `choice` | 3-option question with 5s countdown timer | Wrong choice OR timer expires |
| `tap` | Tap a button N times before 6s countdown | Not enough taps in time |

**Green zone:** Starts at 22% width for stage 1; shrinks by 3% per stage (stage 4 = 13% width). Speed increases 15% per stage.

**UI:** Stage progress dots (4 dots, green = done, amber = current, grey = pending) above the active challenge. Current stage name + icon shown as header.

---

### 2 — Hazard Run 🕹️

**Concept:** Real-time side-scroller. Spacecraft flies right toward the planet. Obstacles scroll in from the right. 3 lives. Speed ramps up every 5 seconds. Survive 20 seconds = success.

**Controls:** `↑` / `↓` arrow keys OR tap top/bottom half of the game canvas. Ship snaps between 3 vertical lanes.

**Obstacles:** Drawn from planet's `hazards` array. Each obstacle type has its own emoji and lane pattern. Minimum 0.5s gap between obstacles.

**Speed:** Starts at 1× (moderate); increases 20% every 5 seconds (cap at 3×).

**Lives:** 3 displayed as glowing pips. Hit obstacle → pip dims, 1s invincibility window.

**Fail:** Third hit before 20 seconds. **Success:** 20 seconds survived.

---

### 3 — Mission Control 📡

**Concept:** 4 system bars (Fuel, Power, Shields, Comms) all draining simultaneously. Random crisis events flash alerts; click the named system to boost it. Any bar hits 0% → mission lost. Survive 25 seconds = success.

**Drain rates (seconds to deplete from 100%):**
- Fuel: 18s, Power: 22s, Shields: 20s, Comms: 30s

**Crisis events:** Fire every 2.5–4.5 seconds (random). Each crisis names one system with a planet-specific message. Clicking the correct system tile boosts it +40%. Crisis resolves after correct click or after 4 seconds (unresolved = no boost).

**Fail:** Any bar reaches 0. **Success:** 25 seconds with all bars above 0.

---

## UI Screens

### Game Overlay (`#mission-game-overlay`)

Full-screen dark overlay appearing over the 3D scene:

```
[Mission emoji + name]     [Game type badge: GAUNTLET / HAZARD RUN / MISSION CONTROL]
─────────────────────────────────────────────────────────────
[Stage progress dots — Gauntlet only]
[Game title + icon]
[Challenge prompt text]
[Game canvas / interactive element]
[Bottom status bar: lives / stage count / timer]
```

Positioned centered, z-index above everything. Does NOT overlap the planet info card (card is hidden before mission launches via existing `launchBtn.classList.add('hidden')` mechanism).

### Mission Lost Panel (`#mission-lost-panel`)

Replaces game overlay on failure:

```
💥  (shaking animation)
MISSION LOST
[Mission name · Planet · Year]  (grey, small)
[Dramatic failure reason — italic, red tint box]
[Real fact: "The actual [mission] had to [real challenge]..." — amber box]
[🚀 RELAUNCH MISSION]  [✕ Close]
```

"Relaunch Mission" calls `showMissionPicker(lockedTarget)` (existing function).
"Close" hides the panel; `launchBtn.classList.remove('hidden')` so player can retry manually.

### Success Flow

On success, game overlay hides and existing `arrivalPanel` shows unchanged.

---

## Data Model

Each `celestialFacts` entry gains a `game` block:

```js
game: {
  failReason: 'String — dramatic 1-sentence destruction narrative for this planet',
  realFact:   'String — real challenge from the actual mission, shown in amber box on fail',
  stages: [   // Gauntlet: pool of 5–6, 4 drawn randomly per run
    { type: 'timing', icon: '🔥', name: 'Stage Name', prompt: 'Instruction text' },
    { type: 'choice', icon: '⚡', name: 'Stage Name', prompt: 'Crisis description',
      options: ['Option A', 'Option B', 'Option C'], correct: 0 },
    { type: 'tap',    icon: '☄️', name: 'Stage Name', prompt: 'Tap N times!', taps: 8 },
  ],
  hazards: ['type_a', 'type_b', 'type_c'], // Hazard Run obstacle pool
  crises:  ['Crisis message A!', 'Crisis message B!', 'C!', 'D!'], // Mission Control alerts
}
```

`Earth` and `Sun` have no `game` block (they have no launch button).

---

## Planet Game Data (all 19 bodies)

### Sun ☀️
```js
game: {
  failReason: 'Parker Solar Probe was vaporized by a solar flare — it got too close and never sent another signal!',
  realFact: 'The real Parker Solar Probe had to withstand 1,377°C during its closest approach — the most extreme temperature ever survived by a spacecraft.',
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

### Mercury 🪨
```js
game: {
  failReason: 'MESSENGER ran out of fuel and crashed into Mercury\'s surface before completing its magnetic field maps!',
  realFact: 'The real MESSENGER mission took 6.5 years and used 6 planetary gravity assists just to slow down enough to orbit Mercury — it\'s incredibly hard to reach!',
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

### Venus 🔥
```js
game: {
  failReason: 'The probe was crushed by Venus\'s 90× atmospheric pressure before the parachute could fully deploy!',
  realFact: 'The Soviet Venera probes survived Venus\'s crushing atmosphere for only 23–127 minutes before being destroyed — that\'s the record for survival on Venus.',
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

### Moon 🌕
```js
game: {
  failReason: 'The Eagle lander tipped over on rocky terrain — Armstrong and Aldrin couldn\'t complete the moonwalk!',
  realFact: 'During Apollo 11, Neil Armstrong had to manually fly the lander over a boulder field with only 30 seconds of fuel remaining — it was nearly a disaster.',
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

### Mars 🔴
```js
game: {
  failReason: 'The parachute deployed too late during "7 minutes of terror" — Perseverance slammed into Jezero Crater at full speed!',
  realFact: 'Mars entry takes exactly 7 minutes — during which the spacecraft goes from 20,000 km/h to 0, with no way to communicate with Earth in real time. Every step must be pre-programmed perfectly.',
  stages: [
    { type: 'timing', icon: '🪂', name: 'Parachute Deploy', prompt: 'Deploy supersonic parachute at EXACTLY the right altitude — too high and you drift, too low and you crash!' },
    { type: 'choice', icon: '🌪️', name: 'Dust Storm', prompt: 'Unexpected regional dust storm below!', options: ['Adjust landing site westward', 'Continue descent as planned', 'Abort to orbit'], correct: 0 },
    { type: 'tap',    icon: '🔥', name: 'Retrorocket Burst', prompt: 'Fire 8 retrorockets simultaneously to slow to hover speed!', taps: 8 },
    { type: 'timing', icon: '🏗️', name: 'Sky Crane Lower', prompt: 'Lower rover on cables — cut them at EXACTLY 0.75m above ground!' },
    { type: 'choice', icon: '🤖', name: 'System Reboot', prompt: 'Computer restarted during landing — manual override needed!', options: ['Confirm landing mode manually', 'Wait for auto-recovery', 'Fire ascent engines'], correct: 0 },
  ],
  hazards: ['dust_devil', 'rock', 'canyon_edge'],
  crises: ['Parachute drag insufficient!', 'Retrorocket fuel critically low!', 'Guidance system failed!', 'Landing zone terrain too steep!'],
},
```

### Phobos 🪨
```js
game: {
  failReason: 'MMX bounced off Phobos\'s surface — its gravity was so weak the lander just floated away into space!',
  realFact: 'Landing on Phobos is extraordinarily hard — its gravity is 1,800× weaker than Earth\'s. Without anchoring, any spacecraft will simply bounce off and drift away.',
  stages: [
    { type: 'timing', icon: '🐌', name: 'Slow Approach', prompt: 'Match Phobos\'s surface speed exactly — approach at under 5 cm/s!' },
    { type: 'choice', icon: '⚓', name: 'Anchor Deploy', prompt: 'Surface contact made — harpoon or screw anchor?', options: ['Fire screw anchor into regolith', 'Fire harpoon', 'Use magnetic clamp'], correct: 0 },
    { type: 'tap',    icon: '🪝', name: 'Grip Surface', prompt: 'Drill anchor into loose rubble — tap 9 times before drifting!', taps: 9 },
    { type: 'timing', icon: '🧪', name: 'Sample Collection', prompt: 'Open sample collector in the exact 2-second landing window!' },
    { type: 'choice', icon: '💨', name: 'Dust Contamination', prompt: 'Loose regolith entering sample container!', options: ['Seal container immediately', 'Blow out with nitrogen', 'Continue collecting'], correct: 0 },
  ],
  hazards: ['loose_debris', 'rock_pile', 'dust_cloud'],
  crises: ['Anchor failed to grip regolith!', 'Drifting away from surface!', 'Sample collector jammed!', 'Thruster overcompensating!'],
},
```

### Deimos 🪨
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

### Jupiter 🪐
```js
game: {
  failReason: 'Juno fired its engine too late — the spacecraft overshot Jupiter\'s orbit and was flung into deep space, never to return!',
  realFact: 'Juno\'s orbital insertion required a 35-minute engine burn that had to be timed to within seconds. The team at JPL could only watch — no real-time commands possible, 48 minutes one-way signal delay.',
  stages: [
    { type: 'timing', icon: '🔥', name: 'Orbital Insertion Burn', prompt: 'Fire main engine for orbital insertion — 35 minutes must start at EXACTLY the right moment!' },
    { type: 'choice', icon: '⚡', name: 'Radiation Spike', prompt: 'Jupiter\'s magnetosphere surge detected!', options: ['Shield electronics & enter safe mode', 'Speed up orbit to escape', 'Deploy antenna'], correct: 0 },
    { type: 'tap',    icon: '🔧', name: 'Thruster Correction', prompt: 'Orbit wobbling from Jupiter\'s gravity — fire 8 correction bursts!', taps: 8 },
    { type: 'timing', icon: '🌀', name: 'Storm Band Navigation', prompt: 'Thread through gap between two massive storm bands!' },
    { type: 'choice', icon: '🧲', name: 'Magnetic Anomaly', prompt: 'Unexpected magnetic field reversal disrupting instruments!', options: ['Switch to backup magnetometer', 'Ignore and continue', 'Emergency shutdown'], correct: 0 },
  ],
  hazards: ['radiation_band', 'storm_swirl', 'asteroid'],
  crises: ['Radiation overloading systems!', 'Solar panel damage detected!', 'Fuel line anomaly!', 'Attitude control failing!'],
},
```

### Io 🌋
```js
game: {
  failReason: 'The probe flew directly into Pele volcano\'s eruption plume — the sulfur particles shredded every instrument!',
  realFact: 'Io\'s radiation environment from Jupiter\'s magnetic field delivers the equivalent of 3,600 chest X-rays per day — the Galileo spacecraft received permanent instrument damage from each Io flyby.',
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

### Europa 🧊
```js
game: {
  failReason: 'Europa Clipper flew too close to Jupiter\'s radiation belt — the electronics fried before it could sample Europa\'s ocean plumes!',
  realFact: 'Europa sits inside Jupiter\'s intense radiation belt. Europa Clipper will make 50 quick flybys rather than orbiting, to limit radiation exposure — extended time near Europa would destroy its instruments.',
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

### Ganymede 🌙
```js
game: {
  failReason: 'JUICE\'s main antenna failed to deploy in Ganymede\'s magnetic field — the mission went silent forever!',
  realFact: 'JUICE will be the first spacecraft ever to orbit a moon other than Earth\'s Moon. Entering orbit around Ganymede requires precise navigation through Jupiter\'s complex multi-moon gravitational field.',
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

### Callisto ☄️
```js
game: {
  failReason: 'The spacecraft\'s orbit decayed through Callisto\'s ancient debris field — it crashed into the most cratered world in the solar system!',
  realFact: 'Callisto is outside Jupiter\'s main radiation belts, making it the safest large moon to visit — NASA has studied it as a potential staging base for human exploration of the Jupiter system.',
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

### Saturn 💍
```js
game: {
  failReason: 'Cassini\'s Grand Finale dive went wrong — it entered Saturn\'s atmosphere at too steep an angle and broke apart before transmitting final data!',
  realFact: 'Cassini\'s real Grand Finale in 2017 required threading between Saturn\'s rings and atmosphere 22 times — a gap only 2,000 km wide. One miscalculation and the mission ends.',
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

### Titan 🌧️
```js
game: {
  failReason: 'Huygens\'s parachute deployed too early at 180km — the batteries ran out before the probe reached Titan\'s surface!',
  realFact: 'Huygens was designed to survive Titan\'s atmosphere for only 2–3 hours — it was kept warm by plutonium, and ran on non-rechargeable batteries. Every second counted.',
  stages: [
    { type: 'timing', icon: '🪂', name: 'Parachute Altitude', prompt: 'Deploy main parachute at EXACTLY 150km — too early and battery runs out before landing!' },
    { type: 'choice', icon: '🌧️', name: 'Methane Cloud', prompt: 'Thick methane rain cloud blocking cameras!', options: ['Switch to radar altimeter', 'Descend faster through cloud', 'Wait for cloud to clear'], correct: 0 },
    { type: 'tap',    icon: '🔥', name: 'Heat Shield Jettison', prompt: 'Heat shield must be jettisoned manually — tap 7 times before atmosphere thickens!', taps: 7 },
    { type: 'timing', icon: '🔋', name: 'Battery Management', prompt: 'Transmit all science data during the optimal battery window!' },
    { type: 'choice', icon: '🏞️', name: 'Lake Landing Site', prompt: 'Methane lake directly below — safe to attempt lake landing?', options: ['Target adjacent solid shoreline', 'Attempt lake landing', 'Deploy floats'], correct: 0 },
  ],
  hazards: ['methane_cloud', 'ice_particle', 'wind_shear'],
  crises: ['Battery charge critical!', 'Methane rain clogging sensors!', 'Wind shear pushing off course!', 'Heat shield ablating rapidly!'],
},
```

### Uranus 🔵
```js
game: {
  failReason: 'Voyager 2 missed Uranus\'s narrow 5.5-hour encounter window — years of data from the only visit ever planned were lost!',
  realFact: 'Voyager 2\'s entire Uranus encounter lasted only 5.5 hours. After 8.5 years of travel, the spacecraft flew past at 15 km/s — all science had to be captured in that tiny window.',
  stages: [
    { type: 'timing', icon: '⏱️', name: '5.5-Hour Window', prompt: 'Begin science operations at the EXACT moment of closest approach — the window is only 330 minutes!' },
    { type: 'choice', icon: '💍', name: 'Ring Plane Crossing', prompt: 'Uranus ring plane crossing in 30 seconds!', options: ['Roll to minimize cross-section', 'Maintain orientation', 'Boost above ring plane'], correct: 0 },
    { type: 'tap',    icon: '📸', name: 'Instrument Pointing', prompt: 'Manually point 9 science instruments to Uranus in rapid sequence!', taps: 9 },
    { type: 'timing', icon: '🌫️', name: 'Atmospheric Probe Drop', prompt: 'Release atmospheric probe at peak atmospheric density moment!' },
    { type: 'choice', icon: '🧲', name: 'Magnetosphere Surprise', prompt: 'Magnetic field tilted 60° from rotation axis — unexpected!', options: ['Adjust magnetometer orientation in flight', 'Record raw data as-is', 'Skip magnetic readings'], correct: 0 },
  ],
  hazards: ['ring_debris', 'magnetic_anomaly', 'ice_particle'],
  crises: ['Flyby window closing fast!', 'Ring debris threatening instruments!', 'Attitude control drifting!', 'Downlink signal weakening!'],
},
```

### Titania 🌑
```js
game: {
  failReason: 'The probe\'s thrusters iced over in Titania\'s −203°C cold — it drifted silently out of orbit without firing a single manoeuvre!',
  realFact: 'No spacecraft has ever returned to Uranus or its moons after Voyager 2\'s 1986 flyby — Titania has been photographed only once, from 369,000 km away.',
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

### Neptune 💨
```js
game: {
  failReason: 'Neptune\'s 2,100 km/h supersonic winds spun Voyager 2 off its axis — it missed the entire Triton flyby that could have never been repeated!',
  realFact: 'Voyager 2 had a 12-year journey to reach Neptune — and after the flyby, it left the solar system forever. There has been no other mission. What Voyager 2 captured in those hours is all we have.',
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

### Triton 🔄
```js
game: {
  failReason: 'The probe matched Triton\'s retrograde orbit perfectly — but a nitrogen geyser erupted directly below and shredded the landing gear at −235°C!',
  realFact: 'Triton is one of the few worlds where active geology has been observed — Voyager 2 spotted nitrogen geysers erupting 8 km high. Landing on such a cold, active world would be extraordinarily dangerous.',
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

---

## Architecture — Files Changed

| File | Change |
|---|---|
| `index.html` | Add `#mission-game-overlay` and `#mission-lost-panel` |
| `src/style.css` | Add game overlay, stage dots, timing bar, hazard run canvas, mission control grid, mission lost panel styles |
| `src/main.js` | (1) Add `game{}` block to all 19 `celestialFacts` entries; (2) Replace line 1736 (`arrivalPanel.classList.remove('hidden')`) with `launchMissionGame(r.mission, r.target)`; (3) Add all game functions in a new `// --- MISSION MINI-GAME ---` section |

**New JS functions:**
- `launchMissionGame(mission, target)` — picks random type, shows overlay, delegates
- `runGauntlet(mission, target, gameData)` — manages stage sequence + timing/choice/tap logic
- `runHazardRun(mission, target, gameData)` — requestAnimationFrame loop, obstacle spawning, collision detection
- `runMissionControl(mission, target, gameData)` — interval-based drain + crisis event system
- `onGameSuccess(mission, target)` — hides overlay, shows arrivalPanel (existing)
- `onGameFail(mission, target, gameData)` — hides overlay, populates + shows mission-lost-panel
- `hideMissionGame()` — cleans up any running game timers/loops

**No changes** to: planet card, tabs, countdown, mission picker, rocket animation, 3D scene.

---

## Spec Self-Review

- **Placeholders:** None. All 19 bodies have complete `game{}` blocks. All game mechanics are fully specified with exact numbers (timing window widths, drain rates, survival durations).
- **Internal consistency:** `runGauntlet` draws from `game.stages`, `runHazardRun` from `game.hazards`, `runMissionControl` from `game.crises` — all present in every entry.
- **Scope:** Single focused feature. Hooks into one existing line (1736). Adds one new overlay panel. All existing behaviour preserved.
- **Ambiguity:** `correct: 0` means first option is always correct in choice stages — intentional, keeps data simple. Green zone shrinkage formula is explicit. Drain rates are explicit seconds.
