# Planet Knowledge Card — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Redesign the existing planet info card from a flat, static text panel into a rich, tabbed "planet profile" card aimed at kids aged 6–13. The new card should be genuinely educational (chemistry, physics, astronomy) while staying fun, accessible, and interactive enough to reward curiosity.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Target audience | Broad: ages 6–13 | Accessible language, rich enough for older kids to grow into |
| Interactivity | Tabs + expandable questions | Enough structure to explore without overwhelming |
| Visual style | Playful: large emoji hero, pill tabs, stat chips | Feels like a game/app, not a textbook |
| Color system | Consistent purple/violet palette | Unified space aesthetic; no per-planet color theming |
| Tab structure | Overview / Learn / Explore | Separation of quick stats, science depth, and discovery context |

---

## Card Architecture

### Header
- Large planet emoji (44px, with purple glow drop-shadow)
- Planet name (bold, 22px)
- Type badge (e.g. "Gas Giant", uppercase, violet)
- Mini-stat pills row: moons count · orbit duration · position from Sun

### Tabs (pill-shaped, full-width row)
Three tabs: `📋 Overview` | `🧠 Learn` | `🚀 Explore`

Active tab: purple gradient fill + glow shadow  
Inactive tab: low-opacity purple tint, violet text

### Card Shell
- Dark glass: `linear-gradient(160deg, rgba(17,12,40,0.97), rgba(10,8,30,0.99))`
- Border: `2px solid rgba(139,92,246,0.45)`
- Border-radius: 20px
- Box shadow: dual-layer (purple glow + deep dark)

---

## Tab Content: Overview

**Purpose:** Quick hook — fun intro sentence + at-a-glance stats

**Elements:**
1. `fact-text` — 2–3 sentence engaging description, uses bold for the key numbers/facts
2. `stat-pills` — horizontal pill chips, each with an emoji prefix:
   - Day length, Temperature, Size comparison, Notable feature, Gravity feel
3. `wow-strip` — amber/yellow highlight box with one extra mind-blowing fact

---

## Tab Content: Learn (🧠)

**Purpose:** Structured science education through curiosity-driven exploration

**Elements:**
1. Short intro prompt: "Tap a question you're curious about 👇"
2. Four expandable question cards, color-coded by subject:

| Color | Subject | Emoji | Question type |
|---|---|---|---|
| Blue | Physics | ⚛️ | Forces, energy, motion, pressure, temperature |
| Green | Chemistry | 🧪 | Composition, reactions, elements, compounds |
| Amber | Astronomy | 🔭 | Orbits, moons, formation, history, scale |
| Pink | Life/Survival | 🌱 | Habitability, what-would-happen, alien life |

**Question card behavior:**
- Collapsed by default; tapping header expands the answer
- Chevron (▼) rotates to (▲) when open
- Answer text: 3–5 sentences, uses `<strong>` for key terms, `<em>` for scientific terms
- Multiple cards can be open simultaneously

**Answer writing rules:**
- Lead with the relatable hook, then introduce the science term
- Always name the concept (e.g., "Physics calls this a *persistent anticyclone*")
- End with a surprising consequence or connection

---

## Tab Content: Explore (🚀)

**Purpose:** Real-world context — missions, scale, and imaginative scenarios

**Elements (in order):**

1. **Real Mission** — orange accent box
   - Spacecraft name + agency + year range
   - 2-sentence key discovery from that mission

2. **Scale Challenge** — purple accent box
   - Relatable size comparison using everyday objects (grapes, basketballs, doors)
   - Always phrased as a physical thing the kid can do ("try holding a grape next to a basketball")

3. **What If...?** — pink accent box
   - One imaginative "what if" scenario grounded in real science
   - Phrased to invite wonder, not fear

4. **Launch button** — red/orange gradient, full-width
   - Text: "🚀 Read About [Mission Name]"
   - (Links to NASA/ESA mission page — existing behavior preserved)

---

## Data Model Changes

Each entry in `celestialFacts` gains three new fields alongside existing ones:

```js
{
  // existing fields preserved as-is:
  type, fact, gravity, day, year, temp, details, wow,

  // new fields:
  emoji: '🪐',                  // hero emoji for the card header
  ministats: ['95 moons', '11.8yr orbit', '5th from Sun'],  // 3 mini-stat pills

  statPills: [                   // overview tab stat chips (5 max)
    '⚡ 9.9 hr day',
    '🌡️ −108°C clouds',
    '🌍 1,300 Earths fit',
    '🔴 Storm: 350+ yrs',
    '💪 2.5× Earth gravity',
  ],

  wowStrip: 'Jupiter has the shortest day of any planet...',  // overview wow fact

  learn: [                       // 4 expandable question cards
    { cls: 'q-physics', q: '⚛️ Why is Jupiter\'s storm still going?', a: '...' },
    { cls: 'q-chem',    q: '🧪 What is Jupiter made of?',             a: '...' },
    { cls: 'q-astro',   q: '🔭 Why does Jupiter have so many moons?', a: '...' },
    { cls: 'q-life',    q: '🌱 What would happen if you fell in?',     a: '...' },
  ],

  explore: {
    mission:   'Juno Spacecraft (NASA, 2016–)',
    discovery: 'Juno discovered Jupiter\'s stripes go 3,000 km deep...',
    scale:     'If Earth were a grape, Jupiter would be a basketball...',
    whatif:    'What if Jupiter were hollow? You could fit 1,300 Earths inside...',
  }
}
```

All existing fields (`gravity`, `day`, `year`, `temp`, `details`) are kept for backwards compatibility but are no longer displayed in the main card UI. They remain available for any future use.

---

## Planets to Cover

All entries in `celestialFacts` get the full new data treatment:

**Planets:** Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune  
**Moons:** Moon (Earth's), Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Titania, Triton

Each body gets its own `emoji`, `ministats`, `statPills`, `wowStrip`, four `learn` questions, and `explore` block — 21 entries total.

---

## Implementation Scope

### Files changed
| File | Change |
|---|---|
| `index.html` | Replace `#planet-info-card` inner HTML with new tab structure |
| `src/style.css` | Replace `.info-card` block with new card styles; add tab, q-card, explore styles |
| `src/main.js` | Expand `celestialFacts` with new fields; rewrite `focusOn()` to render tabs; add tab-switch and question-expand event logic |

### Files NOT changed
- Scene setup, camera, lighting, orbit controls
- Galaxy view logic
- Milky Way rendering
- Star field, planet meshes, orbit lines
- Label renderer
- All button event listeners except the launch button

### New JS behavior (all in `main.js`)
- `renderCard(name)` — replaces current `focusOn()` card-population logic; builds header + tabs HTML from data
- Tab switching: delegated click listener on `.tabs` container → toggle `.active` on panels and buttons
- Question expand: delegated click listener on `#tab-learn` → toggle `.open` on `.q-card`

---

## Spec Self-Review

- **Placeholders:** None. All 4 mockup planets (Jupiter, Venus, Mars, Saturn) have complete data; remaining 17 entries to be written during implementation.
- **Consistency:** Tab structure matches mockup exactly. Data model fields match what `renderCard()` will consume.
- **Scope:** Implementation is self-contained to the card UI — no scene/3D code touched.
- **Ambiguity:** "Backwards compatibility" for old fields is explicit. Launch button behavior (external link) preserved as-is.
