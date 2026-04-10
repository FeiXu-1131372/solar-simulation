# Scale Modes & Planet Navigation — Design Spec

## Overview

Add three scale modes (Compressed, Logarithmic, Realistic) and a planet navigation strip that replaces the current `#focus-info` bar. In Realistic mode, navigating between planets triggers a cinematic auto-pilot flight reusing existing warp effects.

## 1. Planet Navigation Strip

### Replaces `#focus-info`

The existing `📍 Focused: Solar System` bar at the top becomes a horizontal row of clickable planet dots.

### Layout

```
 ☀  ·  ☿  ·  ♀  ·  [🌍]  ·  ♂  ·  ♃  ·  ♄  ·  ⛢  ·  ♆
                     Earth
```

### Behavior

- 9 colored circles (Sun + 8 planets), ordered by distance from Sun
- Each dot uses the planet's characteristic color:
  - Sun: `#ffcc00`, Mercury: `#8c8c8c`, Venus: `#e8a735`, Earth: `#4488ff`
  - Mars: `#c1440e`, Jupiter: `#c8a55a`, Saturn: `#e8c46a`, Uranus: `#7de8e8`, Neptune: `#3355ff`
- Focused planet: enlarged (1.5×), glow ring, name label shown below
- Unfocused planets: small (~12px), hover shows tooltip with name
- Click any dot → camera flies to that planet + opens info card
- Click focused dot again or background → unfocus to full system view
- Separator dots (·) between planets, muted color
- Semi-transparent dark background (`rgba(0,0,0,0.5)`), rounded pill shape
- Centered horizontally, positioned at top of viewport (same as current `#focus-info`)

### Moons

Moons are not shown in the nav strip. Clicking a planet focuses on the planet; moons are accessible by clicking them in the 3D scene.

## 2. Scale Mode Toggle

### Location

Added to the existing "View" section in `#ui-container` control panel, below Labels/Galaxy toggles.

### UI

A cycle button that rotates through three modes:

```
🔭 Compressed  →  🔭 Logarithmic  →  🔭 Realistic  → (cycle)
```

Styled as a `cp-chip` consistent with existing toggle buttons.

### Mode Definitions

#### Compressed (current behavior)

Existing planet sizes and distances. Artistic spacing optimized for visual clarity. This is the fallback/default.

| Body | Size | Distance |
|------|------|----------|
| Sun | 35 | 0 |
| Mercury | 1.5 | 55 |
| Venus | 3.8 | 98 |
| Earth | 4.0 | 135 |
| Mars | 2.1 | 195 |
| Jupiter | 14.5 | 350 |
| Saturn | 12.0 | 500 |
| Uranus | 7.5 | 700 |
| Neptune | 7.2 | 900 |

#### Logarithmic

Sizes and distances use `k × log₁₀(real_value_km)`. Tuned so the full system is visible but proportions are much more realistic.

Constants: `SIZE_K = 8.0`, `DIST_K = 8.0`

| Body | Real Radius (km) | Log Size | Real Dist (km) | Log Dist |
|------|-------------------|----------|-----------------|----------|
| Sun | 696,340 | 46.8 | 0 | 0 |
| Mercury | 2,440 | 27.1 | 57,900,000 | 62.1 |
| Venus | 6,052 | 30.3 | 108,200,000 | 64.3 |
| Earth | 6,371 | 30.4 | 149,600,000 | 65.4 |
| Mars | 3,390 | 28.2 | 227,900,000 | 66.9 |
| Jupiter | 69,911 | 38.8 | 778,600,000 | 71.1 |
| Saturn | 58,232 | 38.1 | 1,433,500,000 | 73.3 |
| Uranus | 25,362 | 35.3 | 2,872,500,000 | 75.7 |
| Neptune | 24,622 | 35.1 | 4,495,100,000 | 77.3 |

#### Realistic

True-to-life size ratios (Earth radius = 4.0 reference) and true AU-proportional distances (Earth distance = 135 reference).

| Body | Size | Distance |
|------|------|----------|
| Sun | 437 | 0 |
| Mercury | 1.53 | 52 |
| Venus | 3.80 | 98 |
| Earth | 4.0 | 135 |
| Mars | 2.13 | 206 |
| Jupiter | 43.9 | 702 |
| Saturn | 36.6 | 1,288 |
| Uranus | 15.9 | 2,591 |
| Neptune | 15.4 | 4,060 |

### Transition Animation

When switching modes, all planet sizes and positions lerp smoothly over ~1.5 seconds using `THREE.MathUtils.lerp` in the animation loop. The Sun mesh, planet meshes, orbit line geometries, and moon positions all interpolate simultaneously.

Store target values per planet when mode changes. Each frame, lerp current toward target. Once within epsilon, snap to final value.

### Camera Adjustment

- **Compressed → Logarithmic**: Camera pulls back slightly to accommodate wider spacing
- **Any → Realistic**: Camera stays at current focus planet (if focused) or pulls way back to show the inner solar system. The nav strip becomes essential for navigating.
- Logarithmic mode default camera: `(0, 1000, 500)` (same as compressed)
- Realistic mode default camera: `(0, 1200, 600)` if unfocused

### Sun Rendering in Realistic Mode

At size 437, the Sun dominates the scene. The Sun glow sprite and halo scale with the Sun mesh. The bloom pass threshold keeps the Sun glowing without washing out the scene. The near clip plane (0.1) and logarithmic depth buffer already handle the scale range.

### Orbit Lines in Scale Modes

Orbit line geometries are regenerated when switching modes — elliptical paths recalculated with new `distance` values (semi-major axes). The `eccentricity` values remain the same across all modes.

## 3. Auto-Pilot Flight (Realistic Mode)

### Trigger

Clicking a planet in the navigation strip while in Realistic mode and the target is far enough away (distance > 200 units from camera).

### Phases

#### Lift-off (0.5s)
- Camera pulls back from current focus to 2× orbit distance
- Star streaks fade in: `updateStarStreaks(camPos, direction, intensity * t, 0.5)`
- `motionBlurPass.enabled = true`, intensity ramps from 0 to 0.3

#### Warp (1–3s, proportional to log of travel distance)
- Duration: `1.0 + Math.log10(distance) * 0.5` seconds, capped at 3s
- Camera position lerps along straight line from origin to target
- Full effects:
  - `updateStarStreaks(camPos, direction, 0.9, 4)`
  - `updateParticleTunnel(camPos, direction, 0.8, dt)`
  - `chromaticPass.enabled = true`, intensity `0.012`
  - `motionBlurPass` intensity `0.5`

#### Arrival (0.5s)
- `cinematicFlash` fires (opacity 0.8, fade out over 200ms)
- All effects ramp down to 0 and disable
- Camera settles into standard focus orbit around target planet
- Info card opens for the target planet

### Skip

Pressing Escape or Space during flight skips to arrival instantly (calls `endCinematic`-like cleanup).

### Non-Realistic Modes

In Compressed and Logarithmic modes, clicking the nav strip uses the existing smooth camera lerp (`camera.position.lerp(target, 0.08)`) — no cinematic effects.

## 4. Data Architecture

### Scale Presets Object

```javascript
const SCALE_MODES = {
    compressed: {
        Sun:     { size: 35,    distance: 0 },
        Mercury: { size: 1.5,   distance: 55 },
        Venus:   { size: 3.8,   distance: 98 },
        Earth:   { size: 4.0,   distance: 135 },
        Mars:    { size: 2.1,   distance: 195 },
        Jupiter: { size: 14.5,  distance: 350 },
        Saturn:  { size: 12.0,  distance: 500 },
        Uranus:  { size: 7.5,   distance: 700 },
        Neptune: { size: 7.2,   distance: 900 },
    },
    logarithmic: { /* computed from log10(real_km) * K */ },
    realistic:   { /* computed from true ratios */ },
};
```

### Per-Planet Runtime State

Each planet object gets `targetSize`, `targetDistance`, and `currentSize`, `currentDistance` for lerping during transitions.

## 5. Files Modified

- `index.html` — Replace `#focus-info` with nav strip HTML, add scale toggle to control panel
- `src/main.js` — Scale mode logic, transition lerping, auto-pilot flight system, nav strip interactivity
- `src/style.css` — Nav strip styles, scale toggle button styles

## 6. What Stays the Same

- All existing controls (sync, pause, speed, labels, galaxy, reset)
- Planet info card behavior (opens on click in 3D scene or nav strip)
- Orbit mechanics (eccentricity, Kepler solver, inclinations, axial tilts, spin rates)
- All educational content and i18n
- Moon rendering and behavior
- Existing cinematic rocket journey (mission mini-game) — separate system, no conflicts
