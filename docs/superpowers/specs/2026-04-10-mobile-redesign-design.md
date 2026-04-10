# Mobile Layout Redesign

## Summary

Redesign the mobile layout (≤480px) to move navigation to the bottom, shrink and reposition the info card, and consolidate the settings panel into the tab bar. Uses a hybrid approach: minimal HTML additions with CSS media query transformations.

## Current Problems

- Navigation bar at the top overlaps the 3D viewport and competes with the control panel
- Info card takes ~50% of the screen, obscuring the planet
- Control panel in the top-left adds clutter and overlaps with the nav bar
- No visible scrollbar on the info card content

## Design Decisions

### 1. Bottom Tab Bar (replaces top nav dots)

**What:** Transform `#planet-nav` into an iOS-style tab bar fixed at the bottom of the screen on mobile.

**HTML changes:**
- Add emoji content (`<span class="nav-emoji">`) inside each `.nav-dot` element (Sun ☀️, Mercury 🪨, Venus 🌕, Earth 🌍, Mars 🔴, Jupiter 🟤, Saturn 💍, Uranus 🧊, Neptune 🔵)
- Add a label `<span class="nav-name">` inside each `.nav-dot` with the planet's localized name (populated via the existing i18n system, same as `.nav-label`)
- Add a settings item at the end: `<div class="nav-dot nav-settings" data-planet="settings">` with ⚙️ emoji and 设置 label
- Add a vertical divider `<span class="nav-divider">` before the settings item

**CSS changes (mobile only):**
- `#planet-nav`: reposition to `bottom: 0; left: 0; right: 0; top: auto;`, remove `transform`, change to full-width bar with `border-radius: 0`, `border-top` instead of full border, `background: rgba(10,14,30,0.95)`, `backdrop-filter: blur(12px)`
- `.nav-dot`: change to vertical flex column layout (`flex-direction: column; align-items: center`), width ~36px
- `.nav-dot-circle`: hide on mobile (`display: none`)
- `.nav-emoji`: show on mobile (`display: block`), hide on desktop. Font-size 18px, 20px when active
- `.nav-name`: show on mobile (`display: block; font-size: 7px`), hide on desktop. Active state: `color: #a78bfa; font-weight: 700`
- `.nav-sep`: remains hidden on mobile (already `display: none`)
- `.nav-divider`: `width: 1px; height: 28px; background: rgba(255,255,255,0.1)` on mobile, hidden on desktop
- `.nav-label` (floating label below dots): hidden on mobile since names are inline
- Inactive planets: `opacity: 0.5`
- Tab bar padding: `6px 2px 14px` (extra bottom for safe area on notched phones)

**Desktop:** All new elements (`.nav-emoji`, `.nav-name`, `.nav-divider`) are `display: none`. Existing dot-based nav is unchanged.

### 2. Compact Info Card with Scrollbar

**What:** Reduce the info card to a fixed height with visible scrollbar, positioned above the tab bar.

**CSS changes (mobile only):**
- `.info-card`: `bottom: 58px` (above tab bar), `left: 8px; right: 8px; width: auto`, `max-height: 35vh`, `padding: 12px`, `border-radius: 16px`
- `.info-card` scrollable area: `overflow-y: auto; scrollbar-width: thin` (instead of `none`)
- Remove `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` on mobile — show a thin scrollbar
- WebKit scrollbar styling for mobile: thin track with `rgba(139,92,246,0.4)` thumb
- `.planet-emoji`: reduce from 44px to 28px
- `.planet-title h2`: reduce from 22px to 16px
- `.card-header`: reduce gap from 14px to 8px, margin-bottom from 14px to 6px
- `.tab-btn`: reduce padding, font-size to 10px
- `.tabs`: reduce margin-bottom to 8px

### 3. Settings as Tab Bar Popup

**What:** Tapping ⚙️ in the tab bar shows the `#ui-container` as a popup overlay above the tab bar.

**CSS changes (mobile only):**
- `#ui-container`: reposition to `bottom: 58px; left: 8px; right: 8px; top: auto`, change `max-width: none`, add `border-radius: 16px`, remove `border-top` accent, match info card styling
- `#ui-container.hidden`: change transform to `translateY(20px)` instead of `translateX(-100%)` for bottom-up appearance

**JS changes:**
- Settings nav dot click handler: toggle `#ui-container` visibility. Opening settings closes the info card if open (and vice versa — only one overlay at a time).
- Close `#ui-container` when tapping outside or tapping ⚙️ again

**Desktop:** No changes to `#ui-container` behavior.

### 4. Navigation Behavior

**JS changes:**
- When a planet is tapped in the tab bar while the info card is open: close the info card first, then navigate the camera to the new planet
- When a planet is tapped in the 3D scene: open the info card, highlight the planet in the tab bar
- Close button (✕) on card: slide card down, return focus to 3D scene

### 5. Other Mobile Adjustments

- Fullscreen button: move to top-right corner (`top: 12px; right: 12px`) since bottom-left now conflicts with the tab bar
- Help text: reposition above the tab bar (`bottom: 62px`) 
- Floating toggle button (`#toggle-ui-btn`): hide on mobile since settings is now in the tab bar

## Architecture

No new files. All changes are in:
- `index.html` — add emoji/name spans inside nav dots, add settings nav item and divider
- `src/style.css` — modify the two `@media (max-width: 480px)` blocks (or consolidate into one)
- `src/main.js` — add settings toggle handler, modify planet-tap behavior to close card first

## Testing

- Verify on 375px width (iPhone SE) and 430px width (iPhone 15 Pro Max)
- Test with info card open: scroll content, switch tabs, close card
- Test planet switching: tap planet in tab bar while card is open, confirm card closes then camera moves
- Test settings popup: open/close, verify controls still work
- Test that desktop layout is completely unaffected
- Test safe area on notched phones (bottom padding)
