# Cinematic Rocket Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instant, invisible rocket travel with a cinematic 4-phase cutscene (launch, ascent+warp entry, hyperspace, flyby arrival) with dramatic camera angles and visual effects.

**Architecture:** A state machine (`cinematicState`) drives the animation loop instead of the current constant-speed rocket movement. Each phase has its own camera behavior and visual effects. Post-processing shaders (chromatic aberration, motion blur) plug into the existing EffectComposer pipeline. A skip button allows bypassing the entire cinematic at any time.

**Tech Stack:** Three.js (existing), EffectComposer + ShaderPass (new import), BufferGeometry particle systems, CSS overlays for flash/skip UI.

**Spec:** `docs/superpowers/specs/2026-04-10-cinematic-rocket-journey-design.md`

---

## File Structure

All changes are in existing files. No new files are created (the project uses a single `src/main.js` + `src/style.css` + `index.html` structure).

| File | Changes |
|------|---------|
| `src/main.js` | Add ShaderPass import; add cinematic state machine, phase update functions, particle systems, star streaks, post-processing shaders; modify `doLaunch()`, rocket animation loop, camera tracking |
| `src/style.css` | Add `.cinematic-skip-btn`, `.cinematic-flash-overlay` styles |
| `index.html` | Add skip button element and flash overlay div |

---

### Task 1: Add Skip Button and Flash Overlay to HTML/CSS

**Files:**
- Modify: `index.html:168` (after mission-log div)
- Modify: `src/style.css` (append at end)

- [ ] **Step 1: Add skip button and flash overlay HTML elements**

In `index.html`, add after the closing `</div>` of `mission-log` (line 168), before the Arrival Celebration comment:

```html
    <!-- Cinematic Skip Button -->
    <button id="cinematic-skip" class="cinematic-skip-btn hidden">Skip &gt;&gt;</button>
    <!-- Cinematic Flash Overlay -->
    <div id="cinematic-flash" class="cinematic-flash-overlay"></div>
```

- [ ] **Step 2: Add CSS styles for skip button and flash overlay**

Append to the end of `src/style.css`:

```css
/* --- CINEMATIC ROCKET JOURNEY --- */
.cinematic-skip-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    z-index: 1000;
    backdrop-filter: blur(4px);
    transition: all 0.2s;
    font-family: inherit;
}
.cinematic-skip-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
}
.cinematic-skip-btn.hidden {
    display: none;
}
.cinematic-flash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 999;
    transition: none;
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev` (if not already running)
Open the app. The skip button should be invisible (has `hidden` class). The flash overlay should be invisible (opacity 0). No visual change to existing behavior.

- [ ] **Step 4: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: add cinematic skip button and flash overlay HTML/CSS"
```

---

### Task 2: Add ShaderPass Import and Post-Processing Shaders

**Files:**
- Modify: `src/main.js:1-7` (imports)
- Modify: `src/main.js:1016-1024` (after EffectComposer setup)

- [ ] **Step 1: Add ShaderPass import**

In `src/main.js`, after line 7 (the UnrealBloomPass import), add:

```javascript
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
```

- [ ] **Step 2: Create chromatic aberration shader and add to composer**

In `src/main.js`, after line 1024 (`composer.addPass(bloomPass);`), add:

```javascript
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
```

- [ ] **Step 3: Verify no rendering regressions**

Open the app in browser. The solar system should render exactly as before — both new passes are disabled by default. Check that bloom still works, planets render correctly, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add chromatic aberration and motion blur shader passes"
```

---

### Task 3: Create Star Streak System

**Files:**
- Modify: `src/main.js` (add after the cinematic post-processing code from Task 2)

Star streaks are line segments radiating from the camera's forward direction, used during warp entry/hyperspace/exit phases.

- [ ] **Step 1: Create the star streak geometry and helper functions**

Add after the motion blur pass code:

```javascript
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
    const phi = Math.random() * 0.8 + 0.1; // cone spread 0.1–0.9 radians
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
```

- [ ] **Step 2: Verify no visual changes**

Star streaks start hidden (`visible = false`). Open the app — no streaks should appear. Check console for errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add star streak line segment system for warp effects"
```

---

### Task 4: Create Particle Tunnel System

**Files:**
- Modify: `src/main.js` (add after star streak code from Task 3)

The particle tunnel creates a cylinder of glowing particles around the rocket's trajectory during warp.

- [ ] **Step 1: Create particle tunnel geometry and update function**

Add after the star streak code:

```javascript
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
```

- [ ] **Step 2: Verify no visual changes**

Tunnel starts hidden. Open app — no particles. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add particle tunnel system for warp hyperspace effect"
```

---

### Task 5: Create Energy Wave System

**Files:**
- Modify: `src/main.js` (add after particle tunnel code from Task 4)

Pulsing energy rings that expand outward from the rocket during warp.

- [ ] **Step 1: Create energy wave pool and update function**

Add after the particle tunnel code:

```javascript
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
```

- [ ] **Step 2: Verify no visual changes**

No waves spawn without being called. Open app — no rings. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add energy wave ring system for warp pulsing effect"
```

---

### Task 6: Create Cinematic State Machine and Phase Functions

**Files:**
- Modify: `src/main.js` (add after the energy wave code from Task 5)

This is the core state machine that drives the entire cinematic. Each phase has an update function that controls camera position, rocket movement, and visual effects.

- [ ] **Step 1: Add cinematic state machine and DOM references**

Add after the energy wave code:

```javascript
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
    // Store camera state for skip/restore
    preCinematicCamera = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        controlsTarget: controls.target.clone(),
    };
    controls.enabled = false;

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

    // Show skip button
    cinematicSkipBtn.classList.remove('hidden');

    // Position camera for low-angle launch shot
    const camOffset = direction.clone().multiplyScalar(-3)
        .add(new THREE.Vector3(0, -1.5, 0))
        .add(new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(2));
    camera.position.copy(earthPos).add(camOffset);
    camera.lookAt(earthPos.clone().add(new THREE.Vector3(0, 2, 0)));
}

function endCinematic(skipToGame) {
    if (!cinematicState) return;
    const { rocketObj } = cinematicState;

    // Clean up effects
    updateStarStreaks(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
    updateParticleTunnel(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
    clearEnergyWaves();
    chromaticPass.enabled = false;
    chromaticPass.uniforms.intensity.value = 0;
    motionBlurPass.enabled = false;
    motionBlurPass.uniforms.intensity.value = 0;
    cinematicFlash.style.opacity = '0';

    // Remove rocket and trail
    scene.remove(rocketObj.mesh);
    scene.remove(rocketObj.trailLine);
    const idx = activeRockets.indexOf(rocketObj);
    if (idx !== -1) activeRockets.splice(idx, 1);
    if (activeMission === rocketObj) activeMission = null;

    // Hide mission log and skip button
    missionLog.classList.add('hidden');
    cinematicSkipBtn.classList.add('hidden');

    // Restore camera to orbit destination planet
    const targetPos = new THREE.Vector3();
    rocketObj.target.mesh.getWorldPosition(targetPos);
    const orbitDist = (rocketObj.target.size || 4) * 3;
    camera.position.copy(targetPos).add(new THREE.Vector3(orbitDist, orbitDist * 0.5, orbitDist));
    controls.target.copy(targetPos);
    controls.enabled = true;

    // Set locked target to destination
    lockedTarget = rocketObj.target;
    isFocusing = false;

    cinematicState = null;
    preCinematicCamera = null;
    waveSpawnTimer = 0;

    if (skipToGame) {
        launchMissionGame(rocketObj.mission, rocketObj.target);
    }
}

// Skip button handler
cinematicSkipBtn.addEventListener('click', () => endCinematic(true));
// Keyboard skip: Escape or Space
document.addEventListener('keydown', (e) => {
    if (cinematicState && (e.key === 'Escape' || e.key === ' ')) {
        e.preventDefault();
        endCinematic(true);
    }
});
```

- [ ] **Step 2: Add the phase update functions**

Add immediately after the skip handler code:

```javascript
function updateCinematicLaunch(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.launch;
    const rocket = cs.rocketObj.mesh;

    // Ease-in acceleration: slow start
    const easeIn = progress * progress;

    // Rocket rises along direction
    const liftDist = easeIn * 8;
    rocket.position.copy(cs.earthPos).addScaledVector(cs.direction, liftDist);

    // Rocket vibration during ignition (first 0.5s)
    if (cs.elapsed < 0.5) {
        const jitter = (1 - cs.elapsed / 0.5) * 0.02;
        rocket.position.x += (Math.random() - 0.5) * jitter;
        rocket.position.z += (Math.random() - 0.5) * jitter;
    }

    // Orient rocket along direction
    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(up, cs.direction), 0.2
    );

    // Camera: tilt upward tracking launch
    const camLookTarget = rocket.position.clone().add(cs.direction.clone().multiplyScalar(3));
    camera.lookAt(camLookTarget);

    // Camera shake on ignition
    if (cs.elapsed < 0.3) {
        const shakeAmt = 0.03 * (1 - cs.elapsed / 0.3);
        camera.position.x += (Math.random() - 0.5) * shakeAmt;
        camera.position.y += (Math.random() - 0.5) * shakeAmt;
    }

    // Exhaust particle burst at ignition (first 0.5s) — reuse energy wave system
    // as expanding orange rings at the rocket base
    if (cs.elapsed < 0.5) {
        waveSpawnTimer += dt;
        if (waveSpawnTimer >= 0.1) {
            waveSpawnTimer = 0;
            const basePos = rocket.position.clone().addScaledVector(cs.direction, -2);
            const wave = spawnEnergyWave(basePos, cs.direction);
            // Override color to orange for exhaust
            if (energyWaves.length > 0) {
                energyWaves[energyWaves.length - 1].mesh.material.color.set(0xff8800);
            }
        }
        updateEnergyWaves(dt);
    }

    // Scale flame intensity
    const flameScale = 0.5 + progress * 1.5;
    cs.rocketObj.fireMesh.scale.set(1, flameScale * (0.7 + Math.random() * 0.6), 1);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => bf.scale.set(1, flameScale * (0.6 + Math.random() * 0.8), 1));
    }

    if (cs.elapsed >= PHASE_DURATIONS.launch) {
        clearEnergyWaves(); // Clean up exhaust burst before ascent
        cs.phase = 'ascent';
        cs.elapsed = 0;
    }
}

function updateCinematicAscent(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.ascent;
    const rocket = cs.rocketObj.mesh;

    // Rocket accelerates further
    const accelDist = 8 + progress * progress * 15;
    rocket.position.copy(cs.earthPos).addScaledVector(cs.direction, accelDist);

    // Orient rocket
    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(up, cs.direction), 0.3
    );

    // Camera swings to chase cam position (behind and above)
    const right = new THREE.Vector3().crossVectors(cs.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const chaseCamOffset = cs.direction.clone().multiplyScalar(-6)
        .add(new THREE.Vector3(0, 3, 0))
        .add(right.clone().multiplyScalar(1.5));
    const desiredCamPos = rocket.position.clone().add(chaseCamOffset);
    camera.position.lerp(desiredCamPos, 0.08);
    camera.lookAt(rocket.position.clone().addScaledVector(cs.direction, 5));

    // Flame effect
    const flicker = 0.7 + Math.random() * 0.6;
    cs.rocketObj.fireMesh.scale.set(1, 2.0 * flicker, 1);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => bf.scale.set(1, 1.5 * (0.6 + Math.random() * 0.8), 1));
    }

    // Warp entry effects in last 0.3s
    if (progress > 0.7) {
        const warpProgress = (progress - 0.7) / 0.3;

        // Flash
        cinematicFlash.style.opacity = String(warpProgress * 0.8);

        // Screen shake
        const shakeAmt = warpProgress * 0.05;
        camera.position.x += (Math.random() - 0.5) * shakeAmt;
        camera.position.y += (Math.random() - 0.5) * shakeAmt;

        // Star streaks begin
        updateStarStreaks(rocket.position, cs.direction, warpProgress * 0.5, 0.5 + warpProgress * 2);

        // Chromatic aberration begins
        chromaticPass.enabled = true;
        chromaticPass.uniforms.intensity.value = warpProgress * 0.01;

        // Engine color shift to blue-white
        cs.rocketObj.fireMesh.material.color.lerp(new THREE.Color(0x4488ff), warpProgress * 0.5);
    }

    if (cs.elapsed >= PHASE_DURATIONS.ascent) {
        cs.phase = 'warp';
        cs.elapsed = 0;
        // Flash peak then fade
        cinematicFlash.style.opacity = '0.8';
        setTimeout(() => { if (cinematicState && cinematicState.phase === 'warp') cinematicFlash.style.opacity = '0'; }, 200);
    }
}

function updateCinematicWarp(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.warp;
    const rocket = cs.rocketObj.mesh;

    // Interpolate rocket position from near-Earth to near-destination
    const warpStart = cs.earthPos.clone().addScaledVector(cs.direction, 25);
    const warpEnd = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    rocket.position.lerpVectors(warpStart, warpEnd, progress);

    // Orient rocket
    const up = new THREE.Vector3(0, 1, 0);
    rocket.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(up, cs.direction));

    // Camera: side tracking shot with sinusoidal drift
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

    // Full effects
    updateStarStreaks(rocket.position, cs.direction, 0.9, 4 + Math.sin(cs.elapsed * 3) * 1);
    updateParticleTunnel(rocket.position, cs.direction, 0.8, dt);
    chromaticPass.uniforms.intensity.value = 0.012 + Math.sin(cs.elapsed * 4) * 0.003;
    motionBlurPass.enabled = true;
    motionBlurPass.uniforms.intensity.value = 0.003;
    motionBlurPass.uniforms.direction.value.set(0.5, 0.0); // horizontal blur

    // Energy waves
    waveSpawnTimer += dt;
    if (waveSpawnTimer >= 0.3) {
        waveSpawnTimer = 0;
        spawnEnergyWave(rocket.position.clone(), cs.direction);
    }
    updateEnergyWaves(dt);

    // Color tint (modify tunnel color to shift blue→purple)
    const purpleShift = Math.sin(progress * Math.PI) * 0.3;
    tunnelMat.uniforms.color.value.setRGB(0.27 + purpleShift, 0.33, 1.0);

    // Flame
    const flicker = 0.7 + Math.random() * 0.6;
    cs.rocketObj.fireMesh.scale.set(1, 2.5 * flicker, 1);
    cs.rocketObj.fireMesh.material.color.set(0x4488ff);
    if (rocket.boosterFlames) {
        rocket.boosterFlames.forEach(bf => {
            bf.scale.set(1, 2.0 * (0.6 + Math.random() * 0.8), 1);
            bf.material.color.set(0x3377ee);
        });
    }

    // Mission log progress updates
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
        // Warp exit flash
        cinematicFlash.style.opacity = '0.7';
        setTimeout(() => { if (cinematicState) cinematicFlash.style.opacity = '0'; }, 250);
    }
}

function updateCinematicWarpExit(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.warpExit;
    const rocket = cs.rocketObj.mesh;

    // Rocket is near destination, hold position
    const nearTarget = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    rocket.position.copy(nearTarget);

    // Camera shake (decaying)
    const shakeAmt = 0.04 * (1 - progress);
    camera.position.x += (Math.random() - 0.5) * shakeAmt;
    camera.position.y += (Math.random() - 0.5) * shakeAmt;

    // Fade out effects
    const fadeOut = 1 - progress;
    updateStarStreaks(rocket.position, cs.direction, fadeOut * 0.9, 4 * fadeOut);
    updateParticleTunnel(rocket.position, cs.direction, fadeOut * 0.8, dt);
    chromaticPass.uniforms.intensity.value = 0.012 * fadeOut;
    motionBlurPass.uniforms.intensity.value = 0.003 * fadeOut;
    updateEnergyWaves(dt);

    // Reset flame color
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

    // Ease-out deceleration toward target
    const easeOut = 1 - (1 - progress) * (1 - progress);
    const startPos = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 5);
    const endPos = cs.targetPos.clone().addScaledVector(cs.direction, -(cs.rocketObj.target.size || 4) * 2.5);
    rocket.position.lerpVectors(startPos, endPos, easeOut);

    // Camera sweeps from behind to in front
    const right = new THREE.Vector3().crossVectors(cs.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const sweepAngle = progress * Math.PI * 0.6; // sweep ~108 degrees
    const camDist = 10;
    const camPos = rocket.position.clone()
        .addScaledVector(cs.direction, -camDist * Math.cos(sweepAngle))
        .addScaledVector(right, camDist * Math.sin(sweepAngle))
        .add(new THREE.Vector3(0, 3, 0));
    camera.position.copy(camPos);
    camera.lookAt(rocket.position);

    // Reverse thrust: reduce flame
    const reverseFlame = 1 - easeOut;
    cs.rocketObj.fireMesh.scale.set(1, reverseFlame * (0.7 + Math.random() * 0.6), 1);

    if (progress >= 1) {
        cs.phase = 'flyby';
        cs.elapsed = 0;
        // Hide mission log for planet showcase
        missionLog.classList.add('hidden');
    }
}

function updateCinematicFlyby(dt) {
    const cs = cinematicState;
    const progress = cs.elapsed / PHASE_DURATIONS.flyby;
    const targetSize = cs.rocketObj.target.size || 4;

    // Get live planet position (it may be orbiting)
    const planetPos = new THREE.Vector3();
    cs.rocketObj.target.mesh.getWorldPosition(planetPos);

    // Camera orbits the planet
    const orbitRadius = targetSize * 3;
    const angle = progress * Math.PI * 2; // full orbit
    const camX = planetPos.x + orbitRadius * Math.cos(angle);
    const camZ = planetPos.z + orbitRadius * Math.sin(angle);
    const camY = planetPos.y + orbitRadius * 0.4 * Math.sin(progress * Math.PI); // arc up then down
    camera.position.set(camX, camY, camZ);
    camera.lookAt(planetPos);

    // Fade rocket out
    const rocketOpacity = Math.max(0, 1 - progress * 3);
    cs.rocketObj.mesh.traverse(child => {
        if (child.material && child.material.transparent) {
            child.material.opacity = rocketOpacity;
        }
    });

    if (progress >= 1) {
        // Cinematic complete — transition to mini-game
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
```

- [ ] **Step 3: Verify no visual changes**

The cinematic state machine exists but nothing calls `startCinematic()` yet. Open app — everything should work identically to before.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add cinematic state machine with all phase update functions"
```

---

### Task 7: Wire Up doLaunch() to Start Cinematic

**Files:**
- Modify: `src/main.js:1734-1780` (`doLaunch` function)

Replace the current `doLaunch` to initialize the cinematic instead of the old constant-speed rocket movement.

- [ ] **Step 1: Modify doLaunch to trigger cinematic**

In `src/main.js`, replace the `doLaunch` function (lines 1734-1780) with:

```javascript
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
```

- [ ] **Step 2: Modify the animate loop to use cinematic**

In the animate function (around line 4236), add a `dt` calculation and call `updateCinematic`. Find the line `function animate() {` and the `requestAnimationFrame(animate);` after it, and add the dt tracking. Also, skip the old rocket update logic when cinematic is active.

Replace the `// --- ROCKET UPDATES ---` section (lines 4293-4349) with:

```javascript
    // --- ROCKET UPDATES ---
    const dt = 1 / 60; // fixed timestep for consistency
    // NOTE: The old non-cinematic rocket code stays inside if(!isPaused),
    // but we DON'T check isPaused for cinematicState — see Step 3b below.
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
```

- [ ] **Step 3: Skip camera tracking during cinematic**

Find the `// --- CONTINUOUS PLANET TRACKING ---` section (line 4266). Wrap the entire `if (lockedTarget)` block so it only runs when there's no cinematic:

Change:
```javascript
    // --- CONTINUOUS PLANET TRACKING ---
    if (lockedTarget) {
```

To:
```javascript
    // --- CONTINUOUS PLANET TRACKING ---
    if (lockedTarget && !cinematicState) {
```

- [ ] **Step 3b: Move cinematic update outside the isPaused block**

The cinematic should run even when the simulation is paused. After the closing `}` of the `if (!isPaused) { ... }` block (which contains planet updates, camera tracking, and the old rocket code), but before `controls.update();`, add:

```javascript
    // Cinematic runs independently of pause state
    if (cinematicState) {
        const dt = 1 / 60;
        updateCinematic(dt);
    }
```

This ensures the cinematic plays smoothly regardless of the pause toggle.

- [ ] **Step 4: Test the full cinematic flow**

Run the app. Click on a planet, go to the Explore tab, select a mission, and launch. You should see:
1. Low-angle camera looking up at the rocket on Earth
2. Camera swings to chase cam, warp flash fires
3. Side tracking shot through hyperspace with star streaks, particle tunnel, energy waves
4. Warp exit with flash, deceleration pass
5. Camera orbits the destination planet
6. Mini-game starts

Test the skip button (click or press Escape during any phase). Verify it jumps cleanly to the mini-game.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: wire up cinematic state machine to doLaunch and animate loop"
```

---

### Task 8: Dynamic Rocket Scaling and Polish

**Files:**
- Modify: `src/main.js` (cinematic phase functions)

The rocket is tiny (0.3-0.4 unit radius) which works at close range but may need scaling during different cinematic phases.

- [ ] **Step 1: Add dynamic rocket scaling to each phase**

In the `startCinematic` function, after `cinematicSkipBtn.classList.remove('hidden');`, add:

```javascript
    // Scale rocket up for cinematic visibility
    rocketObj.mesh.scale.set(2, 2, 2);
```

In the `endCinematic` function, before `scene.remove(rocketObj.mesh);`, add:

```javascript
    // Reset rocket scale
    rocketObj.mesh.scale.set(1, 1, 1);
```

- [ ] **Step 2: Reset flame colors in endCinematic**

In the `endCinematic` function, before `scene.remove(rocketObj.mesh);`, add:

```javascript
    // Reset flame colors (may have been changed to blue during warp)
    rocketObj.fireMesh.material.color.set(0xffaa00);
    if (rocketObj.mesh.boosterFlames) {
        rocketObj.mesh.boosterFlames.forEach(bf => bf.material.color.set(0xff6600));
    }
```

- [ ] **Step 3: Ensure rocket opacity is reset in endCinematic**

In the `endCinematic` function, before `scene.remove(rocketObj.mesh);`, add:

```javascript
    // Reset rocket opacity (may have been faded during flyby)
    rocketObj.mesh.traverse(child => {
        if (child.material) {
            child.material.opacity = child.material._originalOpacity ?? child.material.opacity;
        }
    });
```

And in `startCinematic`, after scaling, store original opacities:

```javascript
    // Store original opacities for flyby fade-out
    rocketObj.mesh.traverse(child => {
        if (child.material) {
            child.material._originalOpacity = child.material.opacity;
        }
    });
```

- [ ] **Step 4: Test full flow again**

Launch a mission, watch the full cinematic, verify rocket is visible throughout. Skip mid-cinematic — verify no leftover blue flames or faded materials on subsequent launches. Launch a second mission — verify it works cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: add dynamic rocket scaling and material cleanup for cinematic"
```

---

### Task 9: Hide Orbit Controls UI During Cinematic

**Files:**
- Modify: `src/main.js` (startCinematic and endCinematic)

During the cinematic, the user shouldn't be able to click planets or interact with the info card.

- [ ] **Step 1: Hide info card and disable raycasting during cinematic**

In `startCinematic`, after `controls.enabled = false;`, add:

```javascript
    // Hide planet info card during cinematic
    if (infoCard) infoCard.classList.add('hidden');
```

In `endCinematic`, before `controls.enabled = true;`, add:

```javascript
    // Close any planet info card
    if (infoCard) infoCard.classList.add('hidden');
```

- [ ] **Step 2: Guard the raycaster click handler against cinematic state**

Find the click/pointer handler that triggers planet focus (search for `raycaster.setFromCamera`). At the top of that handler function, add an early return:

```javascript
    if (cinematicState) return;
```

- [ ] **Step 3: Test**

During the cinematic, click around the screen. Verify no planet info cards appear and no planet gets focused. After cinematic ends, verify clicking planets works normally.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: disable planet interaction during cinematic sequence"
```

---

### Task 10: Final Integration Testing and Edge Cases

**Files:**
- Modify: `src/main.js` (if fixes needed)

- [ ] **Step 1: Test all planets**

Launch missions to at least 3 different planets (one close like Moon, one mid like Mars, one far like Jupiter/Saturn). Verify:
- Cinematic plays fully for each
- Camera angles look correct
- Planet flyby showcases the correct planet at the correct position
- Mini-game launches correctly after flyby
- Skip works at every phase

- [ ] **Step 2: Test edge cases**

1. Launch a mission, skip immediately (within first 0.5s)
2. Launch a mission, let it complete, then launch another mission
3. Launch a mission while the simulation is paused (`isPaused = true`) — the cinematic should still run since it uses its own `dt`
4. Resize the browser window during a cinematic

Fix any issues found.

- [ ] **Step 3: Test skip keyboard shortcuts**

Press Escape during cinematic — should skip. Press Space during cinematic — should skip. Press these keys when NO cinematic is active — should not interfere with normal behavior.

- [ ] **Step 4: Commit any fixes**

```bash
git add src/main.js src/style.css index.html
git commit -m "fix: address cinematic edge cases and integration issues"
```

Only commit if there were actual changes. If everything worked, skip this step.
