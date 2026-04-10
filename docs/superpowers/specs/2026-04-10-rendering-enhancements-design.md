# Rendering Enhancements — Sun Animation, Night Lights, Missing Normal Maps

**Date:** 2026-04-10
**Status:** Approved

## Problem

Three visual polish items remain after the main rendering realism upgrade:
1. The sun surface is static — no sense of movement or energy
2. Earth has no city lights visible on the dark side
3. Mercury, Mars, and Moon lack normal maps (Solar System Scope doesn't provide them)

## Enhancement 1: Sun UV Animation

Replace the sun's `MeshBasicMaterial` with a `ShaderMaterial` that:
- Slowly offsets UV coordinates over time to simulate surface convection
- Applies a subtle pulsing intensity (sinusoidal, ~5% variation) for a breathing effect
- Uses the existing `sunTex` (4K equirectangular) as the base texture
- Receives a `time` uniform updated each frame from the animation loop

The shader should sample the texture at `uv + vec2(time * 0.02, time * 0.005)` for a slow horizontal drift with slight vertical drift. The pulse uses `1.0 + 0.05 * sin(time * 2.0)`.

## Enhancement 2: Earth Night Lights

- Download `8k_earth_nightmap.jpg` from Solar System Scope, downscale to 4K
- Store at `public/textures/earth/nightmap_4k.jpg`
- Add to Earth's planetData: `nightMap: '/textures/earth/nightmap_4k.jpg'`
- In the material builder, when `data.nightMap` is present:
  - Set `emissiveMap` to the nightmap texture
  - Set `emissive` to `new THREE.Color(0xffcc88)` (warm city light tint)
  - Set `emissiveIntensity` to `0.3`
- No custom shader needed — Three.js lighting naturally makes the emissive glow visible on the dark side and washed out on the lit side

## Enhancement 3: Normal Maps for Mercury, Mars, Moon

**Source:** Planet Pixel Emporium (https://planetpixelemporium.com/) — free bump maps available for Mercury, Mars, and Moon.

**Approach:** Download bump map textures and use Three.js `bumpMap` property on `MeshStandardMaterial` (natively supported, no conversion needed).

- Download Mercury bump map, store at `public/textures/mercury/bump_4k.jpg`
- Download Mars bump map, store at `public/textures/mars/bump_4k.jpg`
- Download Moon bump map, store at `public/textures/moon/bump_4k.jpg`
- Add `bumpMap` property to planetData entries for Mercury, Mars, Moon
- In the material builder, when `data.bumpMap` is present:
  - Set `bumpMap` to loaded texture
  - Set `bumpScale` to `0.5` (adjustable per planet)

The existing `normalMap` code path remains for Earth (which has a proper normal map).

## File Structure Changes

```
public/textures/
  earth/
    nightmap_4k.jpg  (NEW)
  mercury/
    bump_4k.jpg      (NEW)
  mars/
    bump_4k.jpg      (NEW)
  moon/
    bump_4k.jpg      (NEW)
```

## Code Changes

All in `src/main.js`:
- Sun mesh creation (~line 1105): replace MeshBasicMaterial with ShaderMaterial
- Animation loop (~line 2365): update sun shader `time` uniform
- planetData array (~lines 18-43): add `nightMap` for Earth, `bumpMap` for Mercury/Mars/Moon
- Planet material builder (~lines 1190-1217): add `emissiveMap`/`bumpMap` handling

## Success Criteria

- Sun surface visibly drifts/convects with a subtle pulsing glow
- Earth shows warm city lights on the dark side, naturally fading on the lit side
- Mercury, Mars, and Moon show visible surface terrain depth from bump maps
- No performance regression
