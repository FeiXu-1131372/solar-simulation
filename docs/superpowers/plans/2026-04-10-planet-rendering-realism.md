# Planet Rendering Realism Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace low-quality 640x640 square planet textures with 4K equirectangular maps, upgrade materials with normal/specular/atmosphere effects, add bloom post-processing, and replace the procedural starfield with a photorealistic panorama background.

**Architecture:** Three-phase upgrade to `src/main.js`: (1) download and wire new textures, (2) upgrade materials and add atmosphere/cloud layers, (3) replace background system and add bloom. All changes are in a single file (`src/main.js`) plus new texture assets in `public/textures/`.

**Tech Stack:** Three.js 0.183.2, Vite 8, vanilla JS. Post-processing via `three/examples/jsm/postprocessing/`.

---

### Task 1: Download and Organize Texture Assets

**Files:**
- Create: `public/textures/sun/diffuse_4k.jpg`
- Create: `public/textures/mercury/diffuse_4k.jpg`, `normal_4k.jpg`
- Create: `public/textures/venus/diffuse_4k.jpg`
- Create: `public/textures/earth/diffuse_4k.jpg`, `normal_4k.jpg`, `specular_4k.jpg`, `clouds_4k.jpg`
- Create: `public/textures/mars/diffuse_4k.jpg`, `normal_4k.jpg`
- Create: `public/textures/jupiter/diffuse_4k.jpg`
- Create: `public/textures/saturn/diffuse_4k.jpg`, `ring_4k.png`
- Create: `public/textures/uranus/diffuse_4k.jpg`
- Create: `public/textures/neptune/diffuse_4k.jpg`
- Create: `public/textures/moon/diffuse_4k.jpg`, `normal_4k.jpg`
- Create: `public/textures/background/stars_milky_way_8k.jpg`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p public/textures/{sun,mercury,venus,earth,mars,jupiter,saturn,uranus,neptune,moon,background}
```

- [ ] **Step 2: Download textures from Solar System Scope**

Download all available textures from https://www.solarsystemscope.com/textures/. The site provides 8K and 2K versions. Download the 8K versions and downscale to 4K (4096x2048) using sips/ImageMagick.

Required downloads (use the 8K equirectangular versions):
- Sun: `2k_sun.jpg` (sun only comes in 2K on SSS — use as-is or find 4K alternative)
- Mercury: `8k_mercury.jpg`
- Venus: `8k_venus_atmosphere.jpg` (the cloud-covered surface view)
- Earth: `8k_earth_daymap.jpg`, `8k_earth_normal_map.jpg`, `8k_earth_specular_map.jpg`, `8k_earth_clouds.jpg`
- Mars: `8k_mars.jpg`
- Jupiter: `8k_jupiter.jpg`
- Saturn: `8k_saturn.jpg`, `8k_saturn_ring_alpha.png`
- Uranus: `2k_uranus.jpg` (only 2K available)
- Neptune: `2k_neptune.jpg` (only 2K available)
- Moon: `8k_moon.jpg`
- Background: `8k_stars_milky_way.jpg`

- [ ] **Step 3: Downscale 8K textures to 4K**

For each 8K texture (8192x4096), downscale to 4096x2048:

```bash
# Example for each 8K texture:
sips -z 2048 4096 downloaded_8k_file.jpg --out public/textures/earth/diffuse_4k.jpg
```

Apply to all 8K downloads. For textures already at 2K (sun, uranus, neptune), copy directly — they're already the best available resolution.

- [ ] **Step 4: Verify all textures are correct aspect ratio**

```bash
for f in public/textures/**/*.jpg public/textures/**/*.png; do
  sips -g pixelWidth -g pixelHeight "$f"
done
```

Expected: all diffuse/normal/specular/cloud maps should be 2:1 ratio (e.g., 4096x2048 or 2048x1024). The ring texture and background may differ.

- [ ] **Step 5: Commit texture assets**

```bash
git add public/textures/
git commit -m "assets: add 4K equirectangular planet textures from Solar System Scope"
```

---

### Task 2: Update planetData and Texture Loading

**Files:**
- Modify: `src/main.js:18-43` (planetData array)
- Modify: `src/main.js:1054-1057` (texture loader section)

- [ ] **Step 1: Update planetData texture paths**

Replace the `planetData` array (lines 18-43) to point to new texture paths and include normal/specular metadata:

```js
const planetData = [
    { name: 'Mercury', distance: 60,  size: 2.2,  speed: 0.02,  inclination: 7.00 * DEG,
      texture: '/textures/mercury/diffuse_4k.jpg', normalMap: '/textures/mercury/normal_4k.jpg',
      roughness: 0.9 },
    { name: 'Venus',   distance: 95,  size: 3.6,  speed: 0.015, inclination: 3.39 * DEG,
      texture: '/textures/venus/diffuse_4k.jpg',
      roughness: 0.4, hasAtmosphere: true, atmosphereColor: 0xffa500 },
    { name: 'Earth',   distance: 135, size: 4.0,  speed: 0.012, inclination: 0.00 * DEG,
      texture: '/textures/earth/diffuse_4k.jpg', normalMap: '/textures/earth/normal_4k.jpg',
      specularMap: '/textures/earth/specular_4k.jpg', cloudMap: '/textures/earth/clouds_4k.jpg',
      roughness: 0.5, hasAtmosphere: true, atmosphereColor: 0x4488ff,
      moons: [
        { name: 'Moon', distance: 8, size: 1.0, speed: 0.04,
          texture: '/textures/moon/diffuse_4k.jpg', normalMap: '/textures/moon/normal_4k.jpg',
          isSyncFocus: true }
    ]},
    { name: 'Mars',    distance: 175, size: 3.2,  speed: 0.010, inclination: 1.85 * DEG,
      texture: '/textures/mars/diffuse_4k.jpg', normalMap: '/textures/mars/normal_4k.jpg',
      roughness: 0.7,
      moons: [
        { name: 'Phobos', distance: 5,   size: 0.5, speed: 0.08, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Deimos', distance: 7.5, size: 0.4, speed: 0.06, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Jupiter', distance: 280, size: 14.5, speed: 0.006, inclination: 1.30 * DEG,
      texture: '/textures/jupiter/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Io',       distance: 20, size: 1.2, speed: 0.05, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Europa',   distance: 25, size: 1.1, speed: 0.04, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Ganymede', distance: 30, size: 1.5, speed: 0.03, texture: '/textures/moon/diffuse_4k.jpg' },
        { name: 'Callisto', distance: 36, size: 1.4, speed: 0.02, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Saturn',  distance: 380, size: 12.0, speed: 0.004, inclination: 2.49 * DEG,
      texture: '/textures/saturn/diffuse_4k.jpg',
      roughness: 0.5, hasRings: true, ringTexture: '/textures/saturn/ring_4k.png',
      moons: [
        { name: 'Titan', distance: 25, size: 2.0, speed: 0.03, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Uranus',  distance: 480, size: 7.5,  speed: 0.003, inclination: 0.77 * DEG,
      texture: '/textures/uranus/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Titania', distance: 15, size: 0.8, speed: 0.05, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
    { name: 'Neptune', distance: 560, size: 7.2,  speed: 0.002, inclination: 1.77 * DEG,
      texture: '/textures/neptune/diffuse_4k.jpg',
      roughness: 0.5,
      moons: [
        { name: 'Triton', distance: 15, size: 1.0, speed: 0.04, texture: '/textures/moon/diffuse_4k.jpg' }
    ]},
];
```

- [ ] **Step 2: Update sun and moon texture paths**

Replace lines 1055-1057:

```js
// --- TEXTURE LOADER ---
const textureLoader = new THREE.TextureLoader();
const sunTex = textureLoader.load('/textures/sun/diffuse_4k.jpg');
```

Remove the standalone `moonTex` load — moons now load their own textures from `data.texture` in the moon loop.

- [ ] **Step 3: Verify the app still renders**

```bash
npm run dev
```

Open in browser, verify all planets display with new textures. No seams should be visible.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: wire 4K equirectangular planet textures"
```

---

### Task 3: Upgrade Planet Materials (Normal Maps, Specular, Roughness)

**Files:**
- Modify: `src/main.js:1449-1456` (planet mesh creation)
- Modify: `src/main.js:1526-1529` (moon mesh creation)

- [ ] **Step 1: Upgrade planet material creation**

Replace the planet mesh creation block (lines 1449-1456) with enhanced materials:

```js
    const materialOptions = {
        map: textureLoader.load(data.texture),
        roughness: data.roughness ?? 0.8,
        metalness: 0.0,
    };
    if (data.normalMap) {
        materialOptions.normalMap = textureLoader.load(data.normalMap);
        materialOptions.normalScale = new THREE.Vector2(1.0, 1.0);
    }
    if (data.specularMap) {
        // Use inverted specular as roughness map — shiny oceans, matte land
        const specTex = textureLoader.load(data.specularMap);
        materialOptions.roughnessMap = specTex;
        materialOptions.roughness = 1.0; // roughnessMap modulates this
        materialOptions.metalness = 0.1;
    }

    const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 128, 128),
        new THREE.MeshStandardMaterial(materialOptions)
    );
```

- [ ] **Step 2: Upgrade moon material creation**

Replace the moon mesh creation (lines 1526-1529):

```js
            const moonMatOptions = {
                map: textureLoader.load(m.texture),
                roughness: 0.85,
                metalness: 0.0,
            };
            if (m.normalMap) {
                moonMatOptions.normalMap = textureLoader.load(m.normalMap);
                moonMatOptions.normalScale = new THREE.Vector2(1.0, 1.0);
            }
            const mMesh = new THREE.Mesh(
                new THREE.SphereGeometry(m.size, 64, 64),
                new THREE.MeshStandardMaterial(moonMatOptions)
            );
```

- [ ] **Step 3: Verify normal maps show surface depth**

```bash
npm run dev
```

Zoom into Earth, Mercury, Mars, Moon — surface should show visible bumps/terrain from normal maps. Earth's oceans should appear shinier than land.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: add normal maps, specular maps, and per-planet roughness"
```

---

### Task 4: Add Earth Cloud Layer and Atmosphere Effects

**Files:**
- Modify: `src/main.js` — after planet mesh creation (inside the `planetData.forEach` loop, after `orbitPivot.add(planetMesh)`)
- Modify: `src/main.js:2620-2641` (animation loop — add cloud rotation)

- [ ] **Step 1: Add cloud and atmosphere layers inside the planet creation loop**

Add this block right after `orbitPivot.add(planetMesh);` (after line 1459), inside the `planetData.forEach` loop:

```js
    // Cloud layer
    let cloudMesh = null;
    if (data.cloudMap) {
        const cloudTex = textureLoader.load(data.cloudMap);
        cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(data.size * 1.01, 128, 128),
            new THREE.MeshStandardMaterial({
                map: cloudTex,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                roughness: 1.0,
                metalness: 0.0,
            })
        );
        planetMesh.add(cloudMesh);
    }

    // Atmosphere glow (Fresnel-based)
    let atmosphereMesh = null;
    if (data.hasAtmosphere) {
        const atmosphereGeo = new THREE.SphereGeometry(data.size * 1.025, 128, 128);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vec3 viewDir = normalize(-vPosition);
                    float fresnel = 1.0 - dot(viewDir, vNormal);
                    fresnel = pow(fresnel, 3.0) * intensity;
                    gl_FragColor = vec4(glowColor, fresnel);
                }
            `,
            uniforms: {
                glowColor: { value: new THREE.Color(data.atmosphereColor) },
                intensity: { value: 1.2 },
            },
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        planetMesh.add(atmosphereMesh);
    }
```

- [ ] **Step 2: Store cloud mesh reference in planet data for animation**

Update the `planets.push(...)` at line 1552 to include `cloudMesh`:

```js
    planets.push({ mesh: planetMesh, orbitPivot, data, moons, cloudMesh });
```

- [ ] **Step 3: Add cloud rotation in the animation loop**

In the animation loop (inside the `planets.forEach` block, after `p.mesh.rotation.y += 0.01 * simSpeed;` at line 2626), add:

```js
            if (p.cloudMesh) {
                p.cloudMesh.rotation.y += 0.012 * simSpeed;
            }
```

- [ ] **Step 4: Verify atmosphere and clouds**

```bash
npm run dev
```

Earth should show: blue atmospheric glow at the limb, semi-transparent cloud layer rotating independently. Venus should show orange atmospheric glow.

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: add Earth cloud layer and Fresnel atmosphere glow for Earth/Venus"
```

---

### Task 5: Upgrade Sun Rendering

**Files:**
- Modify: `src/main.js:1060` (sun mesh creation)
- Modify: `src/main.js:2622` (sun rotation in animation loop)

- [ ] **Step 1: Replace sun mesh with enhanced material**

Replace the sun mesh line (line 1060):

```js
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(35, 128, 128),
    new THREE.MeshBasicMaterial({
        map: sunTex,
        emissive: new THREE.Color(0xffaa33),
        emissiveMap: sunTex,
        emissiveIntensity: 0.4,
    })
);
scene.add(sun);
```

Note: `MeshBasicMaterial` does not support `emissive` — we need `MeshStandardMaterial` for that, but then lighting affects it. Instead, keep `MeshBasicMaterial` for the base and rely on the existing sprite glow system + bloom (Task 7) for the radiant effect. The key fix is using the proper 4K equirectangular texture. So simplify to:

```js
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(35, 128, 128),
    new THREE.MeshBasicMaterial({ map: sunTex })
);
scene.add(sun);
```

The main improvement is: (a) 128 segments instead of 64, (b) proper equirectangular 4K texture instead of 640x640 photo.

- [ ] **Step 2: Verify sun renders without seams**

```bash
npm run dev
```

Zoom into the sun — it should display the new equirectangular texture with no visible seam. The existing glow sprites should still work.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: upgrade sun to 128-segment sphere with 4K equirectangular texture"
```

---

### Task 6: Upgrade Saturn Rings with Texture

**Files:**
- Modify: `src/main.js:1476-1517` (Saturn rings section)

- [ ] **Step 1: Replace procedural ring bands with textured ring**

Replace the entire Saturn rings block (lines 1476-1517) with a textured ring:

```js
    if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(data.size * 1.2, data.size * 2.2, 128);
        // Fix UV mapping for ring geometry — map U from inner to outer radius
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        const center = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i);
            const len = v.sub(center).length();
            const t = (len - data.size * 1.2) / (data.size * 1.0);
            uv.setXY(i, t, uv.getY(i));
        }

        const ringTex = textureLoader.load(data.ringTexture);
        ringTex.rotation = Math.PI / 2;
        const ringMat = new THREE.MeshStandardMaterial({
            map: ringTex,
            side: THREE.DoubleSide,
            transparent: true,
            roughness: 0.8,
            metalness: 0.0,
            depthWrite: false,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;

        const ringGroup = new THREE.Group();
        ringGroup.add(ringMesh);
        ringGroup.rotation.z = 0.47; // ~27 degrees axial tilt
        planetMesh.add(ringGroup);
    }
```

- [ ] **Step 2: Verify Saturn rings**

```bash
npm run dev
```

Saturn should show textured rings with alpha transparency instead of solid colored bands.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: replace procedural Saturn rings with textured ring geometry"
```

---

### Task 7: Add Bloom Post-Processing

**Files:**
- Modify: `src/main.js:1-4` (imports)
- Modify: `src/main.js:980-985` (renderer setup area — add composer)
- Modify: `src/main.js:2735` (render call — switch to composer)
- Modify: `src/main.js:2740-2744` (resize handler)

- [ ] **Step 1: Add post-processing imports**

Add these imports after the existing Three.js imports (after line 4):

```js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
```

- [ ] **Step 2: Set up the EffectComposer**

Add this right after the renderer setup (after line 985, before the CSS2D renderer):

```js
// --- POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,   // strength — subtle, mostly affects the sun
    0.6,   // radius
    0.85   // threshold — only bright things bloom
);
composer.addPass(bloomPass);
```

- [ ] **Step 3: Replace renderer.render with composer.render**

Replace line 2735:

```js
// Old: renderer.render(scene, camera);
composer.render();
```

- [ ] **Step 4: Update resize handler**

In the resize handler (lines 2740-2744), add composer resize:

```js
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
```

- [ ] **Step 5: Verify bloom effect**

```bash
npm run dev
```

The sun should radiate a soft glow outward. Other bright objects get a subtle edge bloom. The effect should be subtle, not overwhelming.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add UnrealBloomPass post-processing for sun glow"
```

---

### Task 8: Replace Background with Equirectangular Star Panorama

**Files:**
- Modify: `src/main.js:1000-1052` (background stars — remove/reduce)
- Modify: `src/main.js:1106-1414` (Milky Way system — remove)
- Add: background texture loading (near texture loader section)

- [ ] **Step 1: Load and set equirectangular background**

Add this right after the texture loader section (after `const textureLoader = new THREE.TextureLoader();`), replacing the old `sunTex` and `moonTex` lines:

```js
const textureLoader = new THREE.TextureLoader();
const sunTex = textureLoader.load('/textures/sun/diffuse_4k.jpg');

// Equirectangular star panorama background
textureLoader.load('/textures/background/stars_milky_way_8k.jpg', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
});
```

- [ ] **Step 2: Reduce background stars from 22,000 to 4,000 hero stars**

Replace the star count and adjust the block (lines 1017-1052):

```js
const starCount = 4000;
const starPos   = new Float32Array(starCount * 3);
const starCol   = new Float32Array(starCount * 3);
const starColors = [
    [1.0, 1.0, 1.0],
    [0.85, 0.92, 1.0],
    [1.0, 0.97, 0.85],
    [1.0, 0.88, 0.65],
    [1.0, 0.75, 0.55],
    [1.0, 0.65, 0.35],
    [1.0, 0.48, 0.28],
    [1.0, 0.35, 0.22],
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
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    alphaTest: 0.01,
    depthWrite: false,
    sizeAttenuation: false,
})));
```

- [ ] **Step 3: Remove the procedural Milky Way system**

Delete the following blocks entirely:
- Lines 1106-1117: Galactic coordinate constants (`GCENTER`, `GNORMAL`, `GTANGENT`, `GBITANGENT`, `GRADIUS`)
- Lines 1118-1317: `createGalaxyTexture()` function (all 7 passes)
- Lines 1319-1332: `galaxyDiscPlane` mesh creation
- Lines 1335-1348: `galacticCentreSprite`
- Lines 1351-1362: `hazePlane`
- Lines 1364-1414: Galactic band stars

Replace the entire block from line 1106 to line 1414 with:

```js
// Galaxy objects array kept for galaxy-view toggle compatibility
const galaxyObjects = [];
```

**Important:** The galaxy view toggle (around line 2600) references `galaxyObjects` and `GCENTER`/`GALAXY_CAM`. Search for all references to these variables and update accordingly. The galaxy view button may need to be disabled or the camera targets adjusted since the procedural galaxy disc is removed.

- [ ] **Step 4: Update galaxy view references**

Search for `GCENTER`, `GALAXY_CAM`, `galaxyObjects`, `galaxyDiscPlane`, `galacticCentreSprite`, `hazePlane`, `bandStars` throughout the file and either remove or stub out any references. The galaxy view toggle should still work but may need adjusted camera targets since the disc plane no longer exists at a specific location.

If `GALAXY_CAM` points toward `GCENTER`, keep those constants defined but remove the mesh objects:

```js
// Galaxy view camera target (kept for galaxy view toggle)
const GCENTER = new THREE.Vector3(12000, 6000, -22000);
const galaxyObjects = [];
```

- [ ] **Step 5: Remove the standalone moonTex variable**

The old `const moonTex = textureLoader.load('/moon.png');` (line 1057) should be removed since moons now load textures from their own `m.texture` property.

- [ ] **Step 6: Verify background renders correctly**

```bash
npm run dev
```

The background should show a photorealistic Milky Way star panorama. The 4,000 hero stars should sparkle over the texture. No black background visible.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: replace procedural background with 8K equirectangular star panorama"
```

---

### Task 9: Delete Old Texture Files

**Files:**
- Delete: `public/sun.png`, `public/mercury.png`, `public/venus.png`, `public/earth.png`, `public/mars.png`, `public/jupiter.png`, `public/saturn.png`, `public/uranus.png`, `public/neptune.png`, `public/moon.png`

- [ ] **Step 1: Remove old texture files**

```bash
rm public/sun.png public/mercury.png public/venus.png public/earth.png public/mars.png public/jupiter.png public/saturn.png public/uranus.png public/neptune.png public/moon.png
```

- [ ] **Step 2: Verify nothing references old paths**

```bash
grep -rn "'/sun.png\|'/earth.png\|'/moon.png\|'/mercury.png\|'/venus.png\|'/mars.png\|'/jupiter.png\|'/saturn.png\|'/uranus.png\|'/neptune.png" src/
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old 640x640 planet texture files"
```

---

### Task 10: Add Attribution

**Files:**
- Modify: `index.html` — add attribution in footer or credits area

- [ ] **Step 1: Add CC-BY 4.0 attribution**

Find the footer or credits section in `index.html` and add:

```html
<div class="texture-credits" style="position:fixed;bottom:4px;right:8px;font-size:10px;color:rgba(255,255,255,0.3);pointer-events:none;z-index:1;">
  Textures: <a href="https://www.solarsystemscope.com/textures/" style="color:rgba(255,255,255,0.4);pointer-events:auto;" target="_blank">Solar System Scope</a> (CC BY 4.0)
</div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "chore: add Solar System Scope texture attribution (CC-BY 4.0)"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Full visual test**

```bash
npm run dev
```

Check all success criteria:
1. No visible seams or gaps on any planet from any viewing angle
2. Earth shows reflective oceans, cloud layer rotating independently, and blue atmospheric limb glow
3. Venus shows orange atmospheric glow
4. Sun has bloom glow radiating outward
5. Rocky planets (Mercury, Mars, Moon) show visible surface depth from normal maps
6. Saturn has textured rings with alpha transparency
7. Background shows photorealistic Milky Way starfield with sparkle overlay
8. Performance is smooth (equal or better than before)
9. Galaxy view toggle still works

- [ ] **Step 2: Test at different zoom levels**

Zoom very close to each planet — textures should hold up at close range. Zoom far out — background should look seamless.

- [ ] **Step 3: Final commit if any tweaks needed**

```bash
git add -A
git commit -m "fix: final rendering tweaks from visual QA"
```
