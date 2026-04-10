# Mobile Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile layout (≤480px) to move navigation to a bottom tab bar with planet emojis, shrink the info card with scrollable content, and consolidate the settings panel into the tab bar.

**Architecture:** Hybrid approach — add minimal HTML (emoji spans, name labels, settings item, divider) to the existing `#planet-nav`, then use CSS media queries to transform it into a bottom tab bar on mobile. JS changes handle settings popup toggle, card-close-before-navigate behavior, and i18n for nav names.

**Tech Stack:** Vanilla HTML/CSS/JS, existing i18n system (`t()` and `tf()` functions from `src/i18n/index.js`)

---

### Task 1: Add Mobile Navigation HTML Elements

**Files:**
- Modify: `index.html:80-99`

- [ ] **Step 1: Add emoji and name spans inside each nav-dot, plus settings item and divider**

Replace the entire `#planet-nav` block (lines 80-99) with:

```html
<div id="planet-nav">
    <div class="nav-dot" data-planet="Sun"     style="--dot-color:#ffcc00" title="Sun"><span class="nav-dot-circle"></span><span class="nav-emoji">☀️</span><span class="nav-name">Sun</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Mercury" style="--dot-color:#8c8c8c" title="Mercury"><span class="nav-dot-circle"></span><span class="nav-emoji">🪨</span><span class="nav-name">Mercury</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Venus"   style="--dot-color:#e8a735" title="Venus"><span class="nav-dot-circle"></span><span class="nav-emoji">🔥</span><span class="nav-name">Venus</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Earth"   style="--dot-color:#4488ff" title="Earth"><span class="nav-dot-circle"></span><span class="nav-emoji">🌍</span><span class="nav-name">Earth</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Mars"    style="--dot-color:#c1440e" title="Mars"><span class="nav-dot-circle"></span><span class="nav-emoji">🔴</span><span class="nav-name">Mars</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Jupiter" style="--dot-color:#c8a55a" title="Jupiter"><span class="nav-dot-circle"></span><span class="nav-emoji">🪐</span><span class="nav-name">Jupiter</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Saturn"  style="--dot-color:#e8c46a" title="Saturn"><span class="nav-dot-circle"></span><span class="nav-emoji">💍</span><span class="nav-name">Saturn</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Uranus"  style="--dot-color:#7de8e8" title="Uranus"><span class="nav-dot-circle"></span><span class="nav-emoji">🧊</span><span class="nav-name">Uranus</span></div>
    <span class="nav-sep">·</span>
    <div class="nav-dot" data-planet="Neptune" style="--dot-color:#3355ff" title="Neptune"><span class="nav-dot-circle"></span><span class="nav-emoji">🔵</span><span class="nav-name">Neptune</span></div>
    <span class="nav-divider"></span>
    <div class="nav-dot nav-settings" id="nav-settings-btn"><span class="nav-emoji">⚙️</span><span class="nav-name" data-i18n="ui.settings">Settings</span></div>
    <div class="nav-label" id="nav-label"></div>
</div>
```

Note: The emojis match the existing i18n `emoji` field per planet (from `src/i18n/en.js`). The `.nav-name` text is the English default; it will be updated by JS on load for i18n. The settings item has `data-i18n="ui.settings"` for localization.

- [ ] **Step 2: Verify desktop renders unchanged**

Open the app in a desktop browser (width > 480px). The new `.nav-emoji`, `.nav-name`, and `.nav-divider` elements should not be visible (they will be hidden by CSS in the next task). For now, they may briefly appear — that's expected until we add the CSS.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add emoji, name, settings elements to planet nav HTML"
```

---

### Task 2: Hide New Elements on Desktop, Style Bottom Tab Bar on Mobile

**Files:**
- Modify: `src/style.css:295-426` (nav section and first mobile media query)

- [ ] **Step 1: Add desktop-hide rules for new elements**

Add immediately after the `.nav-label` / `#planet-nav:has(...)` rules (after line 372, before the mobile media query):

```css
/* Hidden on desktop, shown on mobile */
.nav-emoji,
.nav-name,
.nav-divider {
    display: none;
}
```

- [ ] **Step 2: Verify desktop is unchanged**

Open in desktop browser. The nav bar should look identical to before — colored dots in a pill shape, no emojis or text visible.

- [ ] **Step 3: Replace the mobile `#planet-nav` styles in the `@media (max-width: 480px)` block**

In the first media query block (starting at line 375), replace the existing `#planet-nav`, `.nav-dot-circle`, and `.nav-sep` mobile rules (lines 402-413) with the full tab bar transformation:

```css
    #planet-nav {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        transform: none;
        flex-wrap: nowrap;
        justify-content: space-around;
        gap: 0;
        background: rgba(10, 14, 30, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0;
        padding: 6px 2px 14px;
        padding-bottom: max(14px, env(safe-area-inset-bottom));
    }
    .nav-dot {
        flex-direction: column;
        align-items: center;
        gap: 2px;
        width: 36px;
        opacity: 0.5;
        transition: opacity 0.25s ease;
    }
    .nav-dot.active {
        opacity: 1;
        transform: none;
    }
    .nav-dot-circle {
        display: none;
    }
    .nav-emoji {
        display: block;
        font-size: 18px;
        line-height: 1.2;
    }
    .nav-dot.active .nav-emoji {
        font-size: 20px;
    }
    .nav-name {
        display: block;
        font-size: 7px;
        color: #aaa;
        line-height: 1;
        white-space: nowrap;
    }
    .nav-dot.active .nav-name {
        color: #a78bfa;
        font-weight: 700;
    }
    .nav-sep {
        display: none;
    }
    .nav-divider {
        display: block;
        width: 1px;
        height: 28px;
        background: rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
        align-self: center;
    }
    .nav-label {
        display: none;
    }
    .nav-settings {
        opacity: 0.8;
    }
```

- [ ] **Step 4: Verify mobile tab bar renders correctly**

Open in a mobile viewport (≤ 480px width, or browser DevTools responsive mode). The planet nav should now appear as a full-width tab bar at the bottom of the screen with emojis and text labels.

- [ ] **Step 5: Commit**

```bash
git add src/style.css
git commit -m "feat(mobile): transform planet nav into bottom tab bar with emojis"
```

---

### Task 3: Restyle Info Card for Mobile

**Files:**
- Modify: `src/style.css:716-732` (second mobile media query for info card)

- [ ] **Step 1: Replace the mobile info card styles**

Replace the second `@media (max-width: 480px)` block (lines 716-732) with:

```css
@media (max-width: 480px) {
    .info-card {
        bottom: 58px;
        bottom: calc(58px + env(safe-area-inset-bottom, 0px));
        left: 8px;
        right: 8px;
        width: auto;
        max-height: 35vh;
        padding: 12px;
        border-radius: 16px;
        scrollbar-width: thin;
        scrollbar-color: rgba(139,92,246,0.4) transparent;
    }
    .info-card::-webkit-scrollbar {
        display: block;
        width: 4px;
    }
    .info-card::-webkit-scrollbar-track {
        background: transparent;
    }
    .info-card::-webkit-scrollbar-thumb {
        background: rgba(139,92,246,0.4);
        border-radius: 2px;
    }
    .card-header {
        cursor: default;
        gap: 8px;
        margin-bottom: 6px;
    }
    .card-header:active {
        cursor: default;
    }
    .planet-emoji {
        font-size: 28px;
    }
    .planet-title h2 {
        font-size: 16px;
    }
    .tabs {
        margin-bottom: 8px;
    }
    .tab-btn {
        font-size: 10px;
        padding: 5px 2px;
    }
}
```

- [ ] **Step 2: Verify the card renders above the tab bar with scrollbar**

Open mobile viewport, click a planet to show the info card. It should sit above the bottom tab bar, show a thin purple scrollbar when content overflows, and be noticeably smaller than before.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat(mobile): compact info card with visible scrollbar above tab bar"
```

---

### Task 4: Restyle Settings Panel for Mobile

**Files:**
- Modify: `src/style.css:375-426` (first mobile media query — `#ui-container` section)

- [ ] **Step 1: Update mobile `#ui-container` styles in the first media query**

Replace the existing mobile `#ui-container` and `.cp-body` rules (lines 376-385) with:

```css
    #ui-container {
        position: fixed;
        top: auto;
        bottom: 58px;
        bottom: calc(58px + env(safe-area-inset-bottom, 0px));
        left: 8px;
        right: 8px;
        width: auto;
        max-width: none;
        border-radius: 16px;
        border-top: none;
        z-index: 110;
    }
    #ui-container.hidden {
        transform: translateY(20px);
        opacity: 0;
        pointer-events: none;
    }
    .cp-body {
        max-height: 45vh;
    }
```

- [ ] **Step 2: Hide the floating toggle button on mobile**

Add to the first mobile media query:

```css
    .floating-btn {
        display: none;
    }
```

- [ ] **Step 3: Move fullscreen button to top-right on mobile**

Replace the existing `.fullscreen-btn` mobile rule (lines 419-424) with:

```css
    .fullscreen-btn {
        top: 15px;
        right: 15px;
        bottom: auto;
        left: auto;
        width: 36px;
        height: 36px;
    }
```

- [ ] **Step 4: Update help text position above tab bar**

Replace the existing `.info-help` mobile rule (lines 392-400) with:

```css
    .info-help {
        bottom: 62px;
        bottom: calc(62px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        font-size: 10px;
        text-align: center;
        white-space: nowrap;
    }
```

- [ ] **Step 5: Verify all elements position correctly**

Open mobile viewport:
- Floating toggle button should be hidden
- Fullscreen button should be in top-right corner
- Help text should be above the tab bar
- Settings panel (if opened) should appear as overlay above tab bar

- [ ] **Step 6: Commit**

```bash
git add src/style.css
git commit -m "feat(mobile): restyle settings panel, reposition fullscreen btn and help text"
```

---

### Task 5: Wire Up Settings Toggle and Navigation Behavior in JS

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add settings toggle handler**

Find the existing `toggleUiBtn` click handler (around line 5199-5201). After it, add a mobile settings toggle handler:

```javascript
// Mobile: settings button in tab bar
const navSettingsBtn = document.getElementById('nav-settings-btn');
if (navSettingsBtn) {
    navSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close info card if open
        if (infoCard && !infoCard.classList.contains('hidden')) {
            infoCard.classList.add('hidden');
        }
        uiContainer.classList.toggle('hidden');
    });
}
```

- [ ] **Step 2: Modify nav dot click handler to close card before navigating**

Find the nav dot click handler (around line 2422-2451). Inside the handler, before the `focusOn` / `startAutoPilot` call block (around line 2441), add card-closing logic. The updated section (inside `if (entry) { ... }`) should be:

```javascript
        if (entry) {
            // Close info card first on mobile, then navigate
            if (infoCard && !infoCard.classList.contains('hidden') && window.innerWidth <= 480) {
                infoCard.classList.add('hidden');
            }
            // Close settings panel if open on mobile
            if (window.innerWidth <= 480 && !uiContainer.classList.contains('hidden')) {
                uiContainer.classList.add('hidden');
            }
            if (currentScaleMode === 'realistic') {
                startAutoPilot(entry);
            } else {
                focusOn(entry);
            }
            renderCard(planetName);
            if (infoCard) infoCard.classList.remove('hidden');
        }
```

- [ ] **Step 3: Close settings panel when tapping outside on mobile**

Add after the settings toggle handler:

```javascript
// Close settings popup when tapping outside on mobile
if (window.innerWidth <= 480) {
    document.addEventListener('click', (e) => {
        if (!uiContainer.classList.contains('hidden') &&
            !uiContainer.contains(e.target) &&
            !navSettingsBtn.contains(e.target)) {
            uiContainer.classList.add('hidden');
        }
    });
}
```

- [ ] **Step 4: Update mobile auto-collapse to use `hidden` instead of just `collapsed`**

Find the auto-collapse block (around line 5203-5205):

```javascript
if (window.innerWidth <= 480) {
    uiContainer.classList.add('collapsed');
```

Change it to also add `hidden` so the panel starts hidden on mobile:

```javascript
if (window.innerWidth <= 480) {
    uiContainer.classList.add('collapsed');
    uiContainer.classList.add('hidden');
```

- [ ] **Step 5: Verify settings toggle works**

Open mobile viewport:
- Tap ⚙️ in tab bar → settings panel appears above tab bar
- Tap ⚙️ again → settings panel closes
- Tap outside settings panel → it closes
- Open info card, then tap ⚙️ → info card closes, settings opens

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(mobile): wire up settings toggle and close-card-before-navigate behavior"
```

---

### Task 6: Add i18n Support for Nav Names

**Files:**
- Modify: `src/main.js`
- Modify: `src/i18n/en.js`
- Modify: `src/i18n/zh.js`
- Modify: `src/i18n/ta.js`
- Modify: `src/i18n/si.js`

- [ ] **Step 1: Add `ui.settings` key to all i18n files**

In `src/i18n/en.js`, find the `ui:` section and add:

```javascript
settings: 'Settings',
```

In `src/i18n/zh.js`, find the `ui:` section and add:

```javascript
settings: '设置',
```

In `src/i18n/ta.js`, find the `ui:` section and add:

```javascript
settings: 'அமைப்புகள்',
```

In `src/i18n/si.js`, find the `ui:` section and add:

```javascript
settings: 'සැකසීම්',
```

- [ ] **Step 2: Add a function to update nav names from i18n**

In `src/main.js`, find the area near the `applyLocaleToDOM` usage (around line 5157). Add a helper function before the language change handler:

```javascript
function updateNavNames() {
    document.querySelectorAll('#planet-nav .nav-dot[data-planet]').forEach(dot => {
        const nameSpan = dot.querySelector('.nav-name');
        if (nameSpan) {
            const planetKey = dot.dataset.planet;
            const translated = t(`bodies.${planetKey}`);
            // Strip emoji prefix if present (e.g. "☀ 太阳" → "太阳")
            nameSpan.textContent = translated ? translated.replace(/^[^\p{L}]+/u, '').trim() : planetKey;
        }
    });
    // Update settings label
    const settingsName = document.querySelector('.nav-settings .nav-name');
    if (settingsName) settingsName.textContent = t('ui.settings') || 'Settings';
}
```

- [ ] **Step 3: Call `updateNavNames()` on initial load and language change**

Add `updateNavNames();` call:
1. After the initial `applyLocaleToDOM()` call (find with grep — it's called early in the app init)
2. Inside the language change handler (`document.getElementById('lang-select').addEventListener('change', ...)` around line 5154), add `updateNavNames();` after the `applyLocaleToDOM();` call on line 5156

Also add it inside the `onLangChange` callback (around line 5176):

```javascript
onLangChange(() => {
    updateNavNames();
    if (lockedTarget && !infoCard.classList.contains('hidden')) {
```

- [ ] **Step 4: Verify i18n works**

Open mobile viewport:
- Default language: nav names show in correct language
- Switch language via settings → nav names update immediately
- Chinese: 太阳, 水星, 金星, 地球, etc.
- English: Sun, Mercury, Venus, Earth, etc.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/i18n/en.js src/i18n/zh.js src/i18n/ta.js src/i18n/si.js
git commit -m "feat(mobile): add i18n support for tab bar planet names and settings label"
```

---

### Task 7: Final Testing and Polish

**Files:**
- Potentially adjust: `src/style.css`, `src/main.js`

- [ ] **Step 1: Test complete mobile flow**

Open the app in mobile viewport (375px width for iPhone SE, 430px for iPhone 15 Pro Max):

1. Default state: bottom tab bar visible with all planet emojis + labels, no overlapping elements at top
2. Tap Earth emoji → camera focuses on Earth, Earth tab highlighted (full opacity, purple label)
3. Tap Earth in 3D scene → info card appears above tab bar, scrollable content with visible scrollbar
4. Scroll info card content → scrollbar visible and functional
5. Switch tabs in card (概览 → 学习 → 探索) → content changes within card
6. Tap Mars in tab bar → info card closes, camera moves to Mars
7. Tap ⚙️ → settings popup appears above tab bar
8. Change language → nav names update
9. Tap outside settings → popup closes
10. Tap fullscreen button (top-right) → works correctly

- [ ] **Step 2: Test desktop is unaffected**

Open the app at full desktop width (> 480px):

1. Nav bar at top center with colored dots, no emojis or text visible
2. Info card at bottom-right, 370px wide, full-height scrollable
3. Control panel at top-left with floating toggle button
4. Fullscreen button at bottom-left

- [ ] **Step 3: Fix any issues found**

Apply targeted fixes for any issues found in steps 1-2.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete mobile layout redesign with bottom tab bar"
```
