# Solar System Simulation

An interactive 3D solar system simulator built with [Three.js](https://threejs.org/). Explore all 8 planets, their moons, and real space missions — complete with educational content, mini-games, and cinematic warp effects.

## Features

- **Accurate 3D Solar System** — All 8 planets with high-res 4K textures (diffuse, normal, bump, specular maps), axial tilts, and elliptical orbits solved via Kepler's equation
- **Real Orbital Positions** — Planets and moons are placed at their astronomically accurate positions based on the current date, using J2000.0 epoch orbital elements
- **Moons** — Earth's Moon (with synchronous rotation), Mars' Phobos & Deimos, Jupiter's Galilean moons, Saturn's Titan, and more
- **3 Scale Modes** — Toggle between Compressed (visual), Logarithmic, and Realistic scales with smooth animated transitions
- **Click-to-Focus** — Click any celestial body to fly the camera to it and lock tracking
- **Auto-Pilot Warp** — In realistic scale, travel between planets with cinematic star streaks, particle tunnel, chromatic aberration, and motion blur effects
- **Space Missions** — Launch 20+ real historical and planned missions (Voyager, Cassini, Mars rovers, etc.) with animated rockets and trajectory trails
- **Mini-Games** — 5 arcade-style games tied to missions: Gravity Slingshot, Space Docking, Asteroid Field Navigator, Orbital Memory Match, and Lunar Lander
- **Educational Content** — Fact cards with physics, chemistry, astronomy Q&A for every celestial body
- **Multilingual** — Full translations in English, Chinese (Simplified), Tamil, and Sinhala
- **Cinematic Launch Sequences** — Multi-phase rocket launch animations with camera choreography
- **Galaxy View** — Zoom out to see the entire solar system from afar
- **Responsive Controls** — Mouse drag to orbit, scroll to zoom, keyboard arrows, touch support on mobile

## Tech Stack

- **[Three.js](https://threejs.org/)** — 3D rendering, post-processing (bloom, chromatic aberration, motion blur)
- **[Vite](https://vite.dev/)** — Build tool and dev server
- **Vanilla JS** — No framework, single-file architecture
- **CSS2DRenderer** — HTML labels overlaid on the 3D scene
- **Custom Shaders** — Sun surface animation, Fresnel atmosphere glow, star streaks, particle tunnel

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/FeiXu-1131372/solar-simulation.git
cd solar-simulation

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Orbit camera | Click + drag | Touch + drag |
| Zoom | Scroll wheel | Pinch |
| Focus on planet | Click planet or nav dot | Tap planet or nav dot |
| Rotate view | Arrow keys / click screen edges | Tap screen edges |
| Toggle UI panel | Hamburger menu button | Hamburger menu button |

## Project Structure

```
solar-simulation/
├── index.html          # Main HTML with UI containers
├── src/
│   ├── main.js         # Core application (scene, planets, animation, missions, games)
│   ├── style.css       # All UI styling
│   └── i18n/           # Internationalization
│       ├── index.js    # Locale management & translation functions
│       ├── en.js       # English
│       ├── zh.js       # Chinese (Simplified)
│       ├── ta.js       # Tamil
│       └── si.js       # Sinhala
├── public/
│   └── textures/       # 4K planet textures (diffuse, normal, bump, specular, clouds)
├── package.json
└── vite.config.js
```

## License

This project is for educational purposes.
