# Planet Rendering Realism Upgrade

**Date:** 2026-04-10
**Status:** Approved

## Problem

The solar system simulation renders planets and the sun using 640x640 square PNG images wrapped onto Three.js spheres. These textures are not equirectangular projections (wrong 1:1 aspect ratio instead of 2:1), causing visible seams and gaps when viewed from certain angles. The sun texture is a front-facing photograph, not a sphere-wrappable map. Additionally, materials lack depth (no normal/specular maps), there are no atmospheric effects, and the procedural galaxy background looks artificial.

## Solution Overview

Three-part upgrade:

1. **Texture Replacement** — Replace all textures with scientifically accurate 4K equirectangular maps from Solar System Scope (CC-BY 4.0, based on NASA data)
2. **Material & Shader Upgrades** — Add normal maps, specular maps, atmosphere effects, cloud layers, bloom post-processing
3. **Galaxy Background Upgrade** — Replace 30K-particle procedural system with an 8K equirectangular star panorama

## 1. Texture Replacement

### Source

Primary: [Solar System Scope Textures](https://www.solarsystemscope.com/textures/) (CC-BY 4.0)
Backup: [NASA SVS Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/) (public domain)
Fallback for AI-generated: Gemini Nano Banana Pro (`gemini-3-pro-image-preview`) if any NASA/SSS textures are insufficient.

### Texture Matrix

| Body     | Diffuse | Normal | Specular | Clouds | Notes                  |
|----------|---------|--------|----------|--------|------------------------|
| Sun      | Yes     | --     | --       | --     | Emissive shader        |
| Mercury  | Yes     | Yes    | --       | --     | Crater detail          |
| Venus    | Yes     | --     | --       | --     | Atmosphere texture     |
| Earth    | Yes     | Yes    | Yes      | Yes    | 3-layer system         |
| Mars     | Yes     | Yes    | --       | --     | Terrain detail         |
| Jupiter  | Yes     | --     | --       | --     | Gas giant, smooth      |
| Saturn   | Yes     | --     | --       | --     | + ring alpha texture   |
| Uranus   | Yes     | --     | --       | --     | Gas giant, smooth      |
| Neptune  | Yes     | --     | --       | --     | Gas giant, smooth      |
| Moon     | Yes     | Yes    | --       | --     | Crater detail          |

### Resolution Strategy

- Download 8K (8192x4096) source textures from Solar System Scope
- Downscale to 4K (4096x2048) for production use — balances quality vs load time
- Provide 2K (2048x1024) fallback for slower connections/mobile
- All textures must be 2:1 aspect ratio equirectangular projection

## 2. Material & Shader Upgrades

### Sun

- Material: `MeshBasicMaterial` with emissive map (unaffected by scene lighting)
- Animated UV offset to simulate surface convection movement
- Pulsing emissive intensity for subtle breathing effect
- Post-processing: `THREE.UnrealBloomPass` for radiant glow

### Rocky Planets (Mercury, Mars, Moon)

- Material: `MeshStandardMaterial` with `map` + `normalMap`
- Per-planet roughness tuning:
  - Mercury: high roughness (~0.9) — dry, cratered
  - Mars: moderate roughness (~0.7) — dusty terrain
  - Moon: high roughness (~0.85) — cratered regolith

### Venus

- Base sphere: `MeshStandardMaterial` with atmosphere diffuse map, low roughness (~0.4)
- Atmosphere shell: second sphere at 1.02x radius with semi-transparent material (`opacity: 0.4`)

### Earth (3-layer system)

- **Layer 1 — Surface:** `MeshStandardMaterial` with diffuse + normal + specular maps
  - Specular map makes oceans reflective, land matte
  - Use `roughnessMap` (inverted specular) for PBR workflow
- **Layer 2 — Clouds:** Separate slightly-larger transparent sphere with cloud texture
  - `MeshStandardMaterial` with `map` (cloud texture), `transparent: true`, `opacity: 0.6`
  - Rotates independently (slightly faster than surface) for realism
- **Layer 3 — Atmosphere:** Third sphere with Fresnel-based shader
  - Glows blue at the edges (limb), transparent at center
  - Simulates atmospheric scattering

### Gas Giants (Jupiter, Saturn, Uranus, Neptune)

- Material: `MeshStandardMaterial` with diffuse map
- Lower roughness (~0.5) for smoother gaseous appearance
- Saturn: add `THREE.RingGeometry` with alpha-transparent ring texture
  - Custom shader or double-sided material for correct ring rendering
  - Ring shadow on planet (stretch goal)

### General Rendering

- Increase sphere segments: 128x128 for sun and large planets, 64x64 for smaller bodies
- Add `THREE.UnrealBloomPass` to renderer post-processing pipeline
  - Primarily affects sun, but provides subtle edge glow on all bright objects
  - Configurable bloom strength, radius, and threshold

## 3. Galaxy Background Upgrade

### Current State

- 22,000 scattered star particles (radius 2000-5000 units)
- Canvas-generated 2048x2048 galaxy disc texture on a flat plane at (12000, 6000, -22000)
- 8,000 Milky Way band star particles
- Galactic centre glow sprite
- Total: ~30K particles + canvas texture generation

### New Approach

**Replace with equirectangular panorama texture as `scene.background`:**

- Primary: Solar System Scope 8K Stars + Milky Way texture (8192x4096)
- Backup: NASA SVS Deep Star Maps 2020 (4096x2048, 1.7 billion Gaia DR2 stars)
- Implementation: `texture.mapping = THREE.EquirectangularReflectionMapping; scene.background = texture;`

**Simplify procedural layers:**

- Remove: 22,000 background scattered stars (replaced by texture)
- Remove: Canvas-generated galaxy disc plane + galactic centre sprite + haze (replaced by texture)
- Keep (reduced): ~3,000-5,000 bright "hero" star particles overlaid for sparkle/depth
- Keep (reduced): Smaller set of Milky Way band stars for added dimensionality

**Performance:**

- Net improvement: single background texture draw call replaces 30K particles + canvas generation
- 8K texture: ~128MB VRAM uncompressed; provide 4K fallback (~32MB) for mobile

## File Structure

```
public/
  textures/
    sun/
      diffuse_4k.jpg
    mercury/
      diffuse_4k.jpg
      normal_4k.jpg
    venus/
      diffuse_4k.jpg
    earth/
      diffuse_4k.jpg
      normal_4k.jpg
      specular_4k.jpg
      clouds_4k.jpg
    mars/
      diffuse_4k.jpg
      normal_4k.jpg
    jupiter/
      diffuse_4k.jpg
    saturn/
      diffuse_4k.jpg
      ring_4k.png
    uranus/
      diffuse_4k.jpg
    neptune/
      diffuse_4k.jpg
    moon/
      diffuse_4k.jpg
      normal_4k.jpg
    background/
      stars_milky_way_8k.jpg
      stars_milky_way_4k.jpg  (mobile fallback)
```

## Attribution

Solar System Scope textures require CC-BY 4.0 attribution. Add to the app footer or an about/credits section:

> Planet textures by Solar System Scope (solarsystemscope.com/textures), licensed under CC BY 4.0.

## Success Criteria

- No visible seams or gaps on any planet from any viewing angle
- Earth shows reflective oceans, cloud layer, and blue atmospheric limb glow
- Sun radiates visible bloom glow
- Rocky planets show visible surface depth from normal maps
- Saturn has visible rings with alpha transparency
- Background shows photorealistic Milky Way starfield
- Performance: equal or better than current (fewer draw calls from background simplification)
