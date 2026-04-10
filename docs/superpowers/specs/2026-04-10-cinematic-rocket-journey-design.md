# Cinematic Rocket Journey — Design Spec

## Overview

Replace the current instant, hard-to-notice rocket travel animation with a cinematic 4-phase cutscene sequence. The camera follows the rocket through multiple dramatic angles, a hyperspace warp effect bridges the journey, and a flyby arrival showcases the destination planet before transitioning to the mini-game.

**Core goals:**
- Make the rocket journey feel like a movie scene, not a UI transition
- Normalize all journey durations to ~7 seconds regardless of distance
- Add dramatic visual effects (warp, particles, screen shake, chromatic aberration)
- Always-available skip button for users who want to jump to the mini-game

## Current State (Problems)

- Rocket moves at constant speed; nearby planets arrive in <1 second
- Camera does NOT follow the rocket — stays locked on the origin planet
- Rocket is tiny (0.3-0.4 unit radius) and invisible at interplanetary distances
- No deceleration or approach phase — instant arrival
- Only visual feedback is a thin trail line and a mission log progress bar
- Flame flicker is the only animation on the rocket itself

### Key code locations
| Component | File | Lines |
|-----------|------|-------|
| Rocket creation (`createRocket`) | src/main.js | ~1596-1641 |
| Launch sequence (`doLaunch`) | src/main.js | ~1734-1780 |
| Rocket animation loop | src/main.js | ~4293-4349 |
| Mission data (steps, speeds) | src/main.js | ~805-950 |
| Camera tracking logic | src/main.js | ~4266-4291 |

## Design

### Phase 1: Launch & Liftoff (~1.5 seconds)

**Camera:**
- Start with a low-angle shot looking up at the rocket sitting on Earth's surface
- Slight camera shake on ignition (small random offset, decaying over ~0.3s)
- Camera tilts upward tracking the rocket as it lifts off Earth
- Smooth transition — use quaternion slerp or similar for camera rotation

**Rocket behavior:**
- Rocket starts stationary, engines ignite after ~0.3s delay
- Slow initial acceleration (ease-in curve)
- Rocket vibrates subtly during ignition (small random position jitter, ~0.02 units)

**Visual effects:**
- Exhaust particle burst at base on ignition — orange/yellow particles spreading outward and fading
- Engine glow intensifies from dim to full brightness over ~0.5s
- Existing flame flicker continues but scale increases during liftoff
- Flame trail begins recording positions

**Implementation notes:**
- Detach camera from OrbitControls during cinematic (disable controls, restore after)
- Store pre-cinematic camera state (position, target, controls state) for skip/restore
- Use a phase state machine: `{ phase: 'launch', elapsed: 0, totalDuration: 1.5 }`

### Phase 2: Ascent & Warp Entry (~1.0 second)

**Camera:**
- Swing from low-angle to chase cam position (behind and above rocket)
- Camera accelerates to match rocket speed
- Brief dramatic pause (~0.2s) before warp engages — rocket and camera hold position

**Rocket behavior:**
- Continues accelerating away from Earth
- Earth visibly shrinks in the background
- Rocket orientation stays pointed along trajectory (existing quaternion slerp)

**Visual effects — warp entry moment:**
- Bright white flash (full-screen overlay, opacity 0→0.8→0 over ~0.3s)
- Screen shake (stronger than launch, ~0.05 unit amplitude, ~0.3s decay)
- Stars begin elongating into streaks (stretch star sprites or add streak geometry radiating from vanishing point)
- Chromatic aberration effect — RGB channel offset via a custom ShaderPass added to the existing EffectComposer pipeline (project already uses EffectComposer + UnrealBloomPass)
- Engine glow color shifts from orange to blue/white
- Sound cue point (if audio is added later)

**Implementation notes:**
- Star streaks can be implemented as a set of thin line geometries radiating from the camera's forward direction, fading in with increasing length
- Chromatic aberration: add a ShaderPass to the existing EffectComposer pipeline with a simple RGB offset shader. Enable/disable it by toggling the pass's `enabled` property per phase.
- The "pause before warp" gives the user a beat to anticipate the jump

### Phase 3: Warp / Hyperspace (~1.5 seconds)

**Camera:**
- Side tracking shot — camera positioned to the side of the rocket, flying alongside
- Slight continuous drift and rotation for dynamism (sinusoidal offset on camera position)
- Camera distance from rocket stays constant

**Rocket behavior:**
- Rocket position interpolates from near-Earth to near-destination over this phase
- Actual Three.js position moves along the trajectory at whatever rate needed to cover the distance in 1.5s
- Rocket mesh stays at a fixed screen-space size (scale rocket up as needed to compensate for any LOD issues)

**Visual effects:**
- Full star streaks — long lines radiating from center/vanishing point, cycling brightness
- Glowing particle tunnel — ring of particles around the trajectory path, scrolling past the rocket to convey speed. Use a particle system (Three.js Points with BufferGeometry) with particles arranged in concentric rings that move backward past the camera
- Motion blur — directional blur ShaderPass added to EffectComposer, blurring along the camera's forward vector
- Color shift — overall scene tint shifts to blue/purple (modify scene fog color or add a colored overlay)
- Pulsing energy waves — periodic bright rings that expand outward from the rocket, fading as they grow (torus geometries with additive blending, spawned every ~0.3s)

**Educational facts:**
- Mission log panel remains visible during warp
- Facts from the mission's `steps` array display at 0%, 33%, 66% progress through the warp phase
- Facts fade in with existing animation

**Implementation notes:**
- The particle tunnel is the most complex effect. Start with ~200-500 particles in a cylinder around the path, each with a velocity moving backward. Recycle particles that pass behind the camera.
- Star streaks: create ~100 line segments from random positions, each stretching along the camera's forward vector. Animate length and brightness.
- Consider performance: all particle effects should use BufferGeometry with position attributes updated per frame, not individual meshes.

### Phase 4: Warp Exit & Flyby Arrival (~3.0 seconds)

**Sub-phase 4a: Warp Drop (~0.5s)**
- Flash + screen shake on warp exit (same as entry but reversed)
- Star streaks rapidly shorten back to points
- Chromatic aberration fades out
- Particle tunnel dissipates (particles spread outward and fade)
- Color tint returns to normal

**Sub-phase 4b: Deceleration (~0.5s)**
- Camera sweeps past the rocket (moves from behind to in front)
- Rocket visibly decelerates (ease-out curve)
- Reverse-thrust glow — front-facing engine effect (orange glow at nose, or flip the exhaust direction briefly)
- Destination planet visible and growing in frame

**Sub-phase 4c: Planet Flyby Orbit (~2.0s)**
- Camera detaches from rocket and orbits the destination planet once
- Smooth circular or elliptical path around the planet
- Planet fills a significant portion of the frame
- Rocket parks in orbit (or fades out)
- Existing planet details (textures, bump maps, atmosphere) are showcased

**Transition to mini-game:**
- After the orbit completes, camera settles into the mini-game starting position
- Brief fade or dissolve transition (~0.3s)
- Mini-game launches as it does currently (`launchMissionGame()`)

**Implementation notes:**
- The flyby orbit can use a simple parametric circle: `camera.position.x = planet.x + radius * cos(t)`, `camera.position.z = planet.z + radius * sin(t)`, with `camera.lookAt(planet.position)`
- Orbit radius should be ~2-3x the planet's visual radius for a good framing
- The rocket mesh and all cinematic effects (particles, streaks, tunnel) should be cleaned up before mini-game starts

### Skip Button

- Always visible during the cinematic, positioned bottom-right corner
- Subtle styling: semi-transparent background, small text ("Skip" or "Skip >>")
- On click:
  1. Immediately stop all cinematic phases
  2. Clean up all cinematic effects (particles, streaks, overlays, tunnel)
  3. Remove rocket mesh and trail
  4. Position camera at the destination planet (same as end of Phase 4c)
  5. Launch mini-game immediately
- Keyboard shortcut: Escape or Space to skip

### CSS styling for skip button
```css
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
}
.cinematic-skip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}
```

## State Machine

The cinematic is driven by a state machine that replaces the current simple rocket animation loop:

```
IDLE → LAUNCH → ASCENT → WARP → WARP_EXIT → DECELERATION → FLYBY → COMPLETE
                                                                        ↓
                                                                   mini-game
Any state → SKIP → COMPLETE (cleanup + jump to mini-game)
```

Each state tracks:
- `phase`: current phase enum
- `elapsed`: time spent in current phase (seconds)
- `duration`: total duration of current phase
- `progress`: elapsed / duration (0-1), used for easing curves

The animate loop checks `if (cinematicState)` and delegates to phase-specific update functions instead of the current linear rocket movement code.

## Camera Management

**During cinematic:**
- Disable OrbitControls (`controls.enabled = false`)
- Store current camera state (position, quaternion, controls target)
- Camera is fully scripted per-phase

**After cinematic (or skip):**
- Re-enable OrbitControls
- Set camera to orbit the destination planet (similar to existing planet-lock behavior)
- Set `lockedTarget` to the destination planet

## Performance Considerations

- All particle effects use `BufferGeometry` with pooled particles (no per-frame allocations)
- Star streaks: ~100 line segments, updated per frame via buffer attribute
- Particle tunnel: ~200-500 points, recycled when behind camera
- Energy waves: max 5 active torus geometries at once, oldest removed when new one spawns
- Post-processing (chromatic aberration, motion blur): add lightweight ShaderPass instances to the existing EffectComposer pipeline, toggled on/off per phase
- Screen shake: simple camera position offset, no physics simulation
- Total additional GPU load should be modest — the solar system already renders planets, stars, orbits, and bloom

## What Changes in Existing Code

1. **Rocket animation loop** (src/main.js ~4293-4349): Replace constant-speed movement with cinematic state machine dispatch
2. **`doLaunch()` function** (~1734-1780): Initialize cinematic state instead of just adding rocket to `activeRockets`
3. **Camera tracking** (~4266-4291): Add cinematic camera override that takes priority over planet-lock tracking
4. **`createRocket()` function** (~1596-1641): Dynamically scale rocket based on camera distance each frame so it maintains a readable screen-space size during all phases
5. **New code**: Cinematic phase functions, particle systems (tunnel, energy waves), star streak system, screen overlay effects (flash, chromatic aberration), skip button UI
6. **Mission log**: Keep visible during warp phase, hide during launch/arrival phases when it would overlap with dramatic moments

## Out of Scope

- Audio/sound effects (can be added later as a separate enhancement)
- Per-planet unique cinematics (same sequence for all destinations)
- User camera control during cinematic (fully scripted, skip is the only interaction)
- Changes to the mini-games themselves
- Changes to the countdown sequence (3-2-1 stays as-is)
