# Scale Modes & Planet Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three scale modes (Compressed, Logarithmic, Realistic) with smooth transitions, a planet navigation strip replacing `#focus-info`, and cinematic auto-pilot flight in Realistic mode.

**Architecture:** Scale presets define size/distance for each body per mode. A lerp system in the animation loop transitions all planet meshes, orbit lines, and sun sprites between modes. The nav strip is a row of colored dots in a pill-shaped bar that integrates with the existing focus system. Auto-pilot flight reuses the existing star streaks, particle tunnel, chromatic aberration, and motion blur effects.

**Tech Stack:** Three.js (existing), vanilla JS, CSS

**Spec:** `docs/superpowers/specs/2026-04-10-scale-modes-and-navigation-design.md`

---

### Task 1: Scale Mode Data & Infrastructure

**Files:**
- Modify: `src/main.js` — Add scale presets, real-world constants, and per-planet lerp state

- [ ] **Step 1: Add real-world data constants and SCALE_MODES after the `DEG` constant (line 21)**

Add right after `const DEG = Math.PI / 180;` and before the Kepler solver:

```javascript
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
let scaleTransition = null; // { from: {}, to: {}, progress: 0 }
```

- [ ] **Step 2: Add per-planet lerp state to the planets array builder**

In `src/main.js`, find where planets are pushed to the `planets` array (around line 2176 after moon creation). The planet object currently has `{ mesh, data, orbitPivot, inclinationGroup, cloudMesh, moons }`. Add runtime scale state:

After the line that pushes to `planets` array, add:

```javascript
    // Add runtime scale state for mode transitions
    const planetEntry = planets[planets.length - 1];
    planetEntry.currentSize = data.size;
    planetEntry.currentDistance = data.distance;
    planetEntry.targetSize = data.size;
    planetEntry.targetDistance = data.distance;
```

Also add Sun scale state right after the sun mesh is created (after line 1912):

```javascript
let sunCurrentSize = 35;
let sunTargetSize = 35;
let sunCurrentGlow = 100;
let sunTargetGlow = 100;
let sunCurrentHalo = 160;
let sunTargetHalo = 160;
```

- [ ] **Step 3: Verify build succeeds**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add scale mode data constants and SCALE_MODES presets"
```

---

### Task 2: Planet Navigation Strip — HTML & CSS

**Files:**
- Modify: `index.html:74` — Replace `#focus-info` with nav strip
- Modify: `src/style.css:266-284` — Replace `#focus-info` styles with nav strip styles

- [ ] **Step 1: Replace the focus-info div in index.html (line 74)**

Replace:
```html
<div id="focus-info">📍 Focused: Solar System</div>
```

With:
```html
<div id="planet-nav">
    <div class="nav-dot" data-planet="Sun"     style="--dot-color:#ffcc00" title="Sun"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Mercury" style="--dot-color:#8c8c8c" title="Mercury"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Venus"   style="--dot-color:#e8a735" title="Venus"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Earth"   style="--dot-color:#4488ff" title="Earth"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Mars"    style="--dot-color:#c1440e" title="Mars"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Jupiter" style="--dot-color:#c8a55a" title="Jupiter"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Saturn"  style="--dot-color:#e8c46a" title="Saturn"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Uranus"  style="--dot-color:#7de8e8" title="Uranus"><span class="nav-dot-circle"></span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Neptune" style="--dot-color:#3355ff" title="Neptune"><span class="nav-dot-circle"></span></div>
    <div class="nav-label" id="nav-label"></div>
</div>
```

- [ ] **Step 2: Replace `#focus-info` styles in src/style.css (lines 266-284)**

Replace the `#focus-info` block with:

```css
/* Planet Navigation Strip */
#planet-nav {
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 8px 16px;
    z-index: 100;
    user-select: none;
}

.nav-dot {
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s ease;
}

.nav-dot-circle {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--dot-color);
    display: block;
    transition: width 0.25s ease, height 0.25s ease, box-shadow 0.25s ease;
}

.nav-dot:hover .nav-dot-circle {
    width: 16px;
    height: 16px;
    box-shadow: 0 0 8px var(--dot-color);
}

.nav-dot.active .nav-dot-circle {
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px var(--dot-color), 0 0 24px var(--dot-color);
}

.nav-dot.active {
    transform: scale(1.2);
}

.nav-sep {
    color: rgba(255, 255, 255, 0.15);
    font-size: 10px;
    line-height: 1;
}

.nav-label {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
}

#planet-nav:has(.nav-dot.active) .nav-label {
    opacity: 1;
}
```

- [ ] **Step 3: Update mobile responsive styles (lines 306-309)**

Replace the `#focus-info` media query block with:

```css
@media (max-width: 600px) {
    #planet-nav {
        padding: 6px 10px;
        gap: 4px;
        top: 10px;
    }
    .nav-dot-circle {
        width: 9px;
        height: 9px;
    }
}
```

- [ ] **Step 4: Verify build and visual**

Run: `npx vite build`
Expected: Build succeeds. The nav strip appears as a pill-shaped bar of colored dots at top center.

- [ ] **Step 5: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: add planet navigation strip HTML and CSS"
```

---

### Task 3: Navigation Strip — JavaScript Integration

**Files:**
- Modify: `src/main.js` — Wire nav dots to the existing focus system, replace focusInfoEl references

- [ ] **Step 1: Replace all focusInfoEl references**

In `src/main.js`, the variable `focusInfoEl` is defined at line 2243:
```javascript
const focusInfoEl = document.getElementById('focus-info');
```

Replace with:
```javascript
const planetNav = document.getElementById('planet-nav');
const navLabel = document.getElementById('nav-label');
const navDots = planetNav.querySelectorAll('.nav-dot');
```

Then find every use of `focusInfoEl` and replace:

1. In `focusOn()` (around line 2400):
   Replace `focusInfoEl.textContent = ...` and `focusInfoEl.style.opacity = ...` with:
   ```javascript
   // Update nav strip active state
   navDots.forEach(d => d.classList.remove('active'));
   const activeDot = planetNav.querySelector(`.nav-dot[data-planet="${meshEntry.name}"]`);
   if (activeDot) {
       activeDot.classList.add('active');
       navLabel.textContent = meshEntry.name;
   }
   ```

2. In the unfocus/reset sections (around lines 4873-4875, 5020-5021, and the galaxy view handler around 5038):
   Replace `focusInfoEl.textContent = ...` and `focusInfoEl.style.opacity = ...` with:
   ```javascript
   navDots.forEach(d => d.classList.remove('active'));
   navLabel.textContent = '';
   ```

3. In the language change handler (around line 4920-4926), remove focusInfoEl updates (the nav strip uses planet names which don't need i18n since they're proper nouns).

- [ ] **Step 2: Add click handlers for nav dots**

Add after the nav element references:

```javascript
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
```

- [ ] **Step 3: Sync nav strip when clicking planets in 3D scene**

The existing click handler (around line 4864) already calls `focusOn()`. Since we updated `focusOn()` in Step 1 to set the active nav dot, this already works. Verify by checking that `focusOn()` updates the nav strip.

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: wire planet navigation strip to focus system"
```

---

### Task 4: Scale Mode Toggle Button

**Files:**
- Modify: `index.html:52-58` — Add scale toggle to View section
- Modify: `src/style.css` — Add scale chip styles
- Modify: `src/main.js` — Add click handler for scale cycling

- [ ] **Step 1: Add scale toggle button in index.html**

In the View section (after line 56, after the galaxy toggle row), add:

```html
<button id="scale-mode-btn" class="cp-chip chip-scale">
    <span class="chip-dot" style="background:#f59e0b"></span> 🔭 Compressed
</button>
```

- [ ] **Step 2: Add chip-scale style in src/style.css**

Add after the existing `.chip-galaxy` styles (around line 1490):

```css
.chip-scale {
    background: rgba(245, 158, 11, 0.10) !important;
    color: #f59e0b !important;
    border-color: rgba(245, 158, 11, 0.25) !important;
    width: 100%;
    justify-content: center;
    margin-top: 4px;
}
.chip-scale:hover {
    background: rgba(245, 158, 11, 0.18) !important;
}
```

- [ ] **Step 3: Add scale mode cycle handler in src/main.js**

Add near the other button handlers (around line 4990):

```javascript
const scaleModeBtn = document.getElementById('scale-mode-btn');
const SCALE_ORDER = ['compressed', 'logarithmic', 'realistic'];
const SCALE_LABELS = { compressed: '🔭 Compressed', logarithmic: '🔭 Logarithmic', realistic: '🔭 Realistic' };

scaleModeBtn.addEventListener('click', () => {
    const idx = SCALE_ORDER.indexOf(currentScaleMode);
    const nextMode = SCALE_ORDER[(idx + 1) % SCALE_ORDER.length];
    setScaleMode(nextMode);
});

function setScaleMode(mode) {
    currentScaleMode = mode;
    scaleModeBtn.innerHTML = `<span class="chip-dot" style="background:#f59e0b"></span> ${SCALE_LABELS[mode]}`;

    const preset = SCALE_MODES[mode];

    // Set target sizes and distances for all planets
    planets.forEach(p => {
        const target = preset[p.data.name];
        if (target) {
            p.targetSize = target.size;
            p.targetDistance = target.distance;
        }
    });

    // Set Sun targets
    const sunPreset = preset.Sun;
    if (sunPreset) {
        sunTargetSize = sunPreset.size;
        // Scale glow/halo proportionally to sun size
        const sunScale = sunPreset.size / 35; // 35 is the base compressed size
        sunTargetGlow = 100 * sunScale;
        sunTargetHalo = 160 * sunScale;
    }

    // Start transition
    scaleTransition = { active: true };
}
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add index.html src/style.css src/main.js
git commit -m "feat: add scale mode toggle button with cycle handler"
```

---

### Task 5: Scale Transition Lerping in Animation Loop

**Files:**
- Modify: `src/main.js` — Add lerp logic to animate(), update planet meshes, orbit lines, sun

- [ ] **Step 1: Add scale lerp logic at the top of the animate() function**

In the `animate()` function (around line 5052), add right after `if (!isPaused) {` and before the planet loop:

```javascript
        // --- SCALE MODE LERPING ---
        if (scaleTransition && scaleTransition.active) {
            const lerpSpeed = 0.04; // ~1.5s to complete
            let allDone = true;

            // Lerp Sun
            sunCurrentSize = THREE.MathUtils.lerp(sunCurrentSize, sunTargetSize, lerpSpeed);
            sunCurrentGlow = THREE.MathUtils.lerp(sunCurrentGlow, sunTargetGlow, lerpSpeed);
            sunCurrentHalo = THREE.MathUtils.lerp(sunCurrentHalo, sunTargetHalo, lerpSpeed);

            if (Math.abs(sunCurrentSize - sunTargetSize) > 0.01) {
                allDone = false;
            } else {
                sunCurrentSize = sunTargetSize;
                sunCurrentGlow = sunTargetGlow;
                sunCurrentHalo = sunTargetHalo;
            }

            // Apply Sun scale (geometry scale, not recreate)
            const sunScaleFactor = sunCurrentSize / 35;
            sun.scale.setScalar(sunScaleFactor);
            sunGlow.scale.set(sunCurrentGlow, sunCurrentGlow, 1);
            sunHalo.scale.set(sunCurrentHalo, sunCurrentHalo, 1);

            // Lerp planets
            planets.forEach(p => {
                p.currentSize = THREE.MathUtils.lerp(p.currentSize, p.targetSize, lerpSpeed);
                p.currentDistance = THREE.MathUtils.lerp(p.currentDistance, p.targetDistance, lerpSpeed);

                if (Math.abs(p.currentSize - p.targetSize) > 0.01 ||
                    Math.abs(p.currentDistance - p.targetDistance) > 0.1) {
                    allDone = false;
                } else {
                    p.currentSize = p.targetSize;
                    p.currentDistance = p.targetDistance;
                }

                // Apply size via scale (original geometry is data.size)
                const sizeScale = p.currentSize / p.data.size;
                p.mesh.scale.setScalar(sizeScale);

                // Apply distance — update mesh position within orbit pivot
                // (Kepler solver sets position.x each frame, so we override data.distance)
                p._activeDistance = p.currentDistance;

                // Update label position
                const label = p.mesh.children.find(c => c.isCSS2DObject);
                if (label) label.position.set(0, p.currentSize + 3, 0);
            });

            if (allDone) {
                scaleTransition.active = false;
            }
        }
```

- [ ] **Step 2: Update the orbit animation to use _activeDistance**

In the planet animation loop (around line 5062), replace the Kepler orbit code:

Replace:
```javascript
            const M = clock * p.data.speed;
            const ecc = p.data.eccentricity || 0;
            if (ecc > 0.001) {
                const { angle, radius } = getOrbitalPosition(M, ecc, p.data.distance);
                p.orbitPivot.rotation.y = angle;
                p.mesh.position.x = radius;
            } else {
                p.orbitPivot.rotation.y = M;
            }
```

With:
```javascript
            const M = clock * p.data.speed;
            const ecc = p.data.eccentricity || 0;
            const dist = p._activeDistance ?? p.data.distance;
            if (ecc > 0.001) {
                const { angle, radius } = getOrbitalPosition(M, ecc, dist);
                p.orbitPivot.rotation.y = angle;
                p.mesh.position.x = radius;
            } else {
                p.orbitPivot.rotation.y = M;
                p.mesh.position.x = dist;
            }
```

- [ ] **Step 3: Regenerate orbit lines when scale mode changes**

Add to the `setScaleMode()` function, after setting targets:

```javascript
    // Regenerate orbit line geometries
    planets.forEach(p => {
        const target = preset[p.data.name];
        if (!target) return;

        // Remove old orbit line
        if (p.orbitLine) {
            p.inclinationGroup.remove(p.orbitLine);
            if (p.orbitLine.geometry) p.orbitLine.geometry.dispose();
        }

        // Create new orbit line at target distance
        const e = p.data.eccentricity || 0;
        const d = target.distance;
        if (e > 0.001) {
            const a = d;
            const b = a * Math.sqrt(1 - e * e);
            const c = a * e;
            const pts = [];
            for (let i = 0; i <= 200; i++) {
                const theta = (i / 200) * Math.PI * 2;
                pts.push(new THREE.Vector3(-c + a * Math.cos(theta), 0, b * Math.sin(theta)));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            p.orbitLine = new THREE.Line(geo,
                new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 }));
        } else {
            p.orbitLine = new THREE.Mesh(
                new THREE.TorusGeometry(d, 0.15, 4, 200),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 })
            );
            p.orbitLine.rotation.x = Math.PI / 2;
        }
        p.inclinationGroup.add(p.orbitLine);
    });
```

This requires storing `orbitLine` and `inclinationGroup` on each planet object. Add these when creating planets (in the planet creation loop, store references):

```javascript
    // Store references for scale mode transitions
    planetEntry.orbitLine = orbitLine; // the orbit line mesh/line created earlier
    planetEntry.inclinationGroup = inclinationGroup;
```

- [ ] **Step 4: Initialize _activeDistance on planet creation**

In the planet creation code, after adding to the planets array:

```javascript
    planetEntry._activeDistance = data.distance;
```

- [ ] **Step 5: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add scale transition lerping in animation loop"
```

---

### Task 6: Camera Adjustment on Scale Change

**Files:**
- Modify: `src/main.js` — Adjust camera when switching modes

- [ ] **Step 1: Add camera adjustment to setScaleMode()**

Add at the end of `setScaleMode()`:

```javascript
    // Adjust camera for new scale
    if (!lockedTarget) {
        // Not focused on any planet — pull camera to see the system
        const camPositions = {
            compressed:  new THREE.Vector3(0, 1000, 500),
            logarithmic: new THREE.Vector3(0, 1000, 500),
            realistic:   new THREE.Vector3(0, 1200, 600),
        };
        const targetCam = camPositions[mode];
        // Smooth transition via galaxy transition system
        galaxyTransition = { cam: targetCam.clone(), tgt: new THREE.Vector3(0, 0, 0) };
    }
    // If focused on a planet, the tracking system auto-adjusts
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: adjust camera position on scale mode change"
```

---

### Task 7: Auto-Pilot Flight (Realistic Mode)

**Files:**
- Modify: `src/main.js` — Add auto-pilot flight state machine reusing existing effects

- [ ] **Step 1: Add auto-pilot state and flight function**

Add near the other cinematic state variables (around line 1394):

```javascript
let autoPilotState = null; // { phase, elapsed, from, to, target, duration }
```

Add the flight launcher function:

```javascript
function startAutoPilot(targetEntry) {
    const fromPos = camera.position.clone();
    const toWorldPos = new THREE.Vector3();
    targetEntry.mesh.getWorldPosition(toWorldPos);

    const travelDist = fromPos.distanceTo(toWorldPos);
    if (travelDist < 200) {
        // Too close, use normal focus
        focusOn(targetEntry);
        return;
    }

    const duration = Math.min(3.0, 1.0 + Math.log10(travelDist) * 0.5);
    const direction = toWorldPos.clone().sub(fromPos).normalize();

    autoPilotState = {
        phase: 'liftoff',
        elapsed: 0,
        from: fromPos,
        to: toWorldPos,
        target: targetEntry,
        direction: direction,
        duration: duration,
        liftoffDuration: 0.5,
        arrivalDuration: 0.5,
    };

    // Disable orbit controls during flight
    controls.enabled = false;
}
```

- [ ] **Step 2: Add auto-pilot update in animation loop**

Add after the existing camera tracking block (around line 5115), before `composer.render()`:

```javascript
    // --- AUTO-PILOT FLIGHT ---
    if (autoPilotState) {
        const ap = autoPilotState;
        const dt = 0.016; // ~60fps frame time
        ap.elapsed += dt;

        // Recalculate target position (planet moves while we fly)
        ap.target.mesh.getWorldPosition(ap.to);
        ap.direction = ap.to.clone().sub(ap.from).normalize();
        const orbitDist = (ap.target.size || 10) * 6 + 20;

        if (ap.phase === 'liftoff') {
            const t = Math.min(ap.elapsed / ap.liftoffDuration, 1.0);
            // Pull back and start effects
            updateStarStreaks(camera.position, ap.direction, t * 0.5, 0.5 + t);
            motionBlurPass.enabled = true;
            motionBlurPass.uniforms.intensity.value = t * 0.3;

            if (t >= 1.0) {
                ap.phase = 'warp';
                ap.elapsed = 0;
            }
        } else if (ap.phase === 'warp') {
            const t = Math.min(ap.elapsed / ap.duration, 1.0);
            // Ease-in-out interpolation
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            // Move camera along path
            const arrivePos = ap.to.clone().add(ap.direction.clone().multiplyScalar(-orbitDist));
            camera.position.lerpVectors(ap.from, arrivePos, ease);
            controls.target.lerpVectors(ap.from, ap.to, ease);

            // Full effects
            updateStarStreaks(camera.position, ap.direction, 0.9, 4 + Math.sin(ap.elapsed * 3));
            updateParticleTunnel(camera.position, ap.direction, 0.8, dt);
            chromaticPass.enabled = true;
            chromaticPass.uniforms.intensity.value = 0.012;
            motionBlurPass.uniforms.intensity.value = 0.5;

            if (t >= 1.0) {
                ap.phase = 'arrival';
                ap.elapsed = 0;
                cinematicFlash.style.opacity = '0.8';
                setTimeout(() => { cinematicFlash.style.opacity = '0'; }, 200);
            }
        } else if (ap.phase === 'arrival') {
            const t = Math.min(ap.elapsed / ap.arrivalDuration, 1.0);
            // Fade out effects
            updateStarStreaks(camera.position, ap.direction, (1 - t) * 0.9, 4 * (1 - t));
            updateParticleTunnel(camera.position, ap.direction, (1 - t) * 0.8, dt);
            chromaticPass.uniforms.intensity.value = 0.012 * (1 - t);
            motionBlurPass.uniforms.intensity.value = 0.5 * (1 - t);

            if (t >= 1.0) {
                // Clean up effects
                chromaticPass.enabled = false;
                chromaticPass.uniforms.intensity.value = 0;
                motionBlurPass.enabled = false;
                motionBlurPass.uniforms.intensity.value = 0;
                updateStarStreaks(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
                updateParticleTunnel(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);

                // Focus on target planet
                controls.enabled = true;
                focusOn(ap.target);
                renderCard(ap.target.name);
                if (infoCard) infoCard.classList.remove('hidden');

                autoPilotState = null;
            }
        }
    }
```

- [ ] **Step 3: Add skip handler for auto-pilot (Escape/Space)**

In the existing keydown handler (around line 1515), add before or alongside the existing cinematic skip:

```javascript
    if (autoPilotState && (e.key === 'Escape' || e.key === ' ')) {
        // Skip to arrival
        chromaticPass.enabled = false;
        chromaticPass.uniforms.intensity.value = 0;
        motionBlurPass.enabled = false;
        motionBlurPass.uniforms.intensity.value = 0;
        updateStarStreaks(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
        updateParticleTunnel(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, 0);
        cinematicFlash.style.opacity = '0';

        controls.enabled = true;
        focusOn(autoPilotState.target);
        renderCard(autoPilotState.target.name);
        if (infoCard) infoCard.classList.remove('hidden');

        autoPilotState = null;
        e.preventDefault();
        return;
    }
```

- [ ] **Step 4: Update nav strip click handler to use auto-pilot in Realistic mode**

In the nav dot click handler (from Task 3 Step 2), replace the `focusOn(entry)` call with:

```javascript
        // Find the matching clickable entry
        const entry = allClickable.find(c => c.name === planetName);
        if (entry) {
            if (currentScaleMode === 'realistic') {
                startAutoPilot(entry);
            } else {
                focusOn(entry);
            }
            renderCard(planetName);
            if (infoCard) infoCard.classList.remove('hidden');
        }
```

- [ ] **Step 5: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add auto-pilot cinematic flight for realistic scale mode"
```

---

### Task 8: Final Integration & Polish

**Files:**
- Modify: `src/main.js` — Edge cases, sun label position, ring scaling
- Modify: `src/style.css` — Minor polish

- [ ] **Step 1: Scale Saturn rings with planet size**

In the scale lerp section of animate(), after applying planet size scale, add ring awareness:

```javascript
                // Scale rings if present (they're children of the mesh)
                // Rings already scale with mesh.scale since they're children — no extra code needed
```

Actually, since rings are children of `planetMesh` and we're using `mesh.scale.setScalar()`, the rings automatically scale. Verify this visually.

- [ ] **Step 2: Update Sun label position for scale modes**

The Sun label is positioned at `(0, 42, 0)` (line 1981). When the Sun scales, the label needs to move. Add to the scale lerp section:

```javascript
            // Update Sun label position
            if (sunLabel) sunLabel.position.set(0, sunCurrentSize + 7, 0);
```

- [ ] **Step 3: Prevent auto-pilot during existing cinematic (mission rocket)**

In `startAutoPilot()`, add at the top:

```javascript
    if (cinematicState) return; // Don't start during mission cinematic
```

In the nav dot click handler, also prevent clicks during auto-pilot:

```javascript
        if (autoPilotState) return; // Already flying
```

- [ ] **Step 4: Update focusOrbitDist for scale modes**

In `focusOn()`, the orbit distance is `meshEntry.size * 6 + 20`. In Realistic mode, Jupiter is size 44, giving orbit distance 284 — this is fine. But the Sun at 437 would give 2642, which may be too far. Cap it:

```javascript
    focusOrbitDist = Math.min(meshEntry.size * 6 + 20, 300);
```

- [ ] **Step 5: Full build and visual test**

Run: `npx vite build && npx vite preview`
Test:
1. Nav strip appears at top with colored dots
2. Clicking dots focuses on planets
3. Scale toggle cycles through Compressed → Logarithmic → Realistic
4. Planets smoothly resize and reposition during transitions
5. In Realistic mode, clicking a distant planet triggers cinematic flight
6. Pressing Escape skips the flight
7. Sun scales appropriately with glow/halo in each mode

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/style.css
git commit -m "feat: polish scale modes, ring scaling, and edge cases"
```
