# UI Audit

Rules and standards derived from auditing existing UI components. Use this command when building or reviewing UI to ensure visual and behavioural consistency across the dark museum design system.

---

## Role

Act as a senior UI/UX designer and strict technical auditor. Analyse all CSS, HTML, and components in the project against the criteria below. No exceptions or compromises.

Walk through all project files (styles and components). Produce a structured list of specific files and line numbers where the rules below are violated. For each violation provide:
1. Description of the problem (why it looks wrong).
2. The exact CSS/HTML fix that satisfies the strict design rules.

---

## Criterion A — 60-30-10 Proportion Rule

Check used colours and their distribution:

- **60% (Dominant / Background):** The main site background must occupy the largest area and be a deep dark tone.
- **30% (Secondary):** Cards, nav panels, and containers must be visually distinct from the background without competing for attention.
- **10% (Accent):** Only CTA buttons, active links, and important interactive elements may use the bright accent colour.
- **Critical error:** Accent colour applied to large non-interactive block backgrounds or long text — breaks visual hierarchy.

---

## Criterion B — Strict Dark Mode Rules

Check all HEX, RGB, and HSL values in project styles:

- **No pure black:** Any use of `#000000`, `rgb(0,0,0)`, or `hsl(0,0%,0%)` for backgrounds is a critical error. Replace with dark greys or deep tones with a colour undertone (e.g. `#121212` or `#0B0F19`).
- **No pure white text:** `#FFFFFF` or `rgb(255,255,255)` for body text is an error. Replace with `rgba(255,255,255,0.87)` or light greys (`#E0E0E0`, `#F3F4F6`) to avoid the halo effect and eye strain.
- **Interface depth (Elevation):** In dark theme, depth must be achieved by **lightening the background** of elevated elements (cards, floating menus, modals) — not only via `box-shadow`, which dissolves on dark surfaces and is ineffective.

---

## Criterion C — WCAG Contrast and Accessibility

Calculate the mathematical contrast ratio between text and background for all text nodes:

- **Body / small text:** Contrast with background must be at least **4.5:1**.
- **Large headings:** Contrast must be at least **3:1**.
- **Critical error:** Any dark grey text on a black/dark background that fails WCAG AA requires immediate correction.

---

## Criterion D — Whitespace and Grid (Negative Space / Spacing)

Analyse all `margin`, `padding`, `gap`, and typography values across the project:

- **Grid system:** Spacing must follow a strict mathematical scale in multiples of 4px or 8px (4 / 8 / 16 / 24 / 32 / 48 / 64px).
- **Space hierarchy:** Distance between logical blocks (section to section) must be visually **larger** than distance within a block (heading–text inside a card). This is the law of proximity.
- **Line height:** `line-height` for body text must be `1.5`–`1.6`. Text that appears cramped is an error.
- **Critical error:** Arbitrary "magic" spacing values (e.g. `margin: 13px`, `padding: 17px`) or the complete absence of breathing room (elements flush to the screen edge without padding).

---

## 1. Buttons

### Interactive reveal buttons (e.g. quote-save-btn)

- Hidden by default: `opacity: 0; transform: translateY(-3px)`
- Revealed on parent hover via `.parent:hover .btn` selector — never on the button's own hover
- Transition: `all 0.3s ease`
- Mobile (≤768px): always visible (`opacity: 1; transform: translateY(0)`)
- Size: 28×28px minimum tap target for icon-only buttons
- Shape: circular (`border-radius: 50%`)
- Background: `rgba(10, 9, 7, 0.65)` + `backdrop-filter: blur(8px)`
- Border: `1px solid rgba(201, 169, 110, 0.22)` (gold at low opacity)
- Icon colour: `rgba(201, 169, 110, 0.6)` at rest → `var(--gold)` on hover
- Hover background: `rgba(201, 169, 110, 0.14)`
- Hover border: `rgba(201, 169, 110, 0.5)`
- Icon size inside 28px button: 11×11px (SVG `stroke`, not fill)

### Download / action buttons (e.g. qsm-download)

- Minimum height: 36px; horizontal padding: 1rem
- Border: `1px solid rgba(201, 169, 110, 0.22)`
- Background: `rgba(201, 169, 110, 0.07)` at rest
- Hover: `linear-gradient(135deg, rgba(201,169,110,0.22) 0%, rgba(201,169,110,0.13) 100%)`
- Hover colour: `var(--gold)`
- Hover border: `rgba(201, 169, 110, 0.55)`
- Icon inside button: 16×16px SVG

### Format / toggle buttons (e.g. qsm-fmt)

- Include both an icon and a text label stacked vertically (`flex-direction: column`)
- Inactive: `rgba(201,169,110,0.38)` colour, `rgba(201,169,110,0.15)` border
- Active: `rgba(201,169,110,0.09)` background, `rgba(201,169,110,0.42)` border, `rgba(201,169,110,0.82)` colour
- Hover (non-active): border `rgba(201,169,110,0.26)`, colour `rgba(201,169,110,0.55)`
- Icon is a bordered rectangle representing the format shape; `border-radius: 1px`
- Label text: `letter-spacing: 0.05em; text-transform: uppercase`

---

## 2. Modals and overlays

### Overlay

- `position: fixed; inset: 0; z-index: 9000`
- Background: `rgba(4, 3, 2, 0.88)`
- `backdrop-filter: blur(22px) saturate(1.2)`
- Hidden: `opacity: 0; pointer-events: none`
- Open: `opacity: 1; pointer-events: all`
- Transition: `opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Clicking the overlay closes the modal (click on panel stops propagation)

### Panel (fullscreen modal)

- `display: flex; flex-direction: column; width: 100%; height: 100%`
- No border-radius, no shadow — the overlay is the container
- Top section (preview): `flex: 1; min-height: 0; overflow: hidden` — takes all available space
- Bottom section (controls): `flex-shrink: 0` — fixed height strip

### Close button

- `position: fixed; top: 1.1rem; right: 1.1rem`
- Circular, 36×36px
- Uses `::before` pseudo-element with `content: '×'` — no separate icon element
- Same dark glass style as reveal buttons
- Hover: `color: rgba(201,169,110,0.9); border-color: rgba(201,169,110,0.45)`
- Keyboard: `Escape` key must also close the modal

### Controls strip

- Single `flex` row: `justify-content: space-between; align-items: center`
- Padding: `0.9rem 1.25rem`
- Top border: `1px solid rgba(201, 169, 110, 0.07)`
- Mobile (≤600px): wrap allowed, padding reduced to `0.7rem 1rem 0.9rem`

---

## 3. Theme swatches

- Size: 24×24px circles (`border-radius: 50%`)
- Border at rest: `1.5px solid rgba(201,169,110,0.18)`
- Border active: `rgba(201,169,110,0.85)` — gold ring signals selection
- Transparent/pattern theme: `conic-gradient` checkerboard `#888 / #ddd`, 8×8px tile
- No label text — title attribute provides tooltip

---

## 4. Canvas image generation (QuoteShareModal)

When generating shareable images on `<canvas>`:

### Layer order (bottom to top)

1. Linear gradient background (`bg1` → `bg2`, diagonal)
2. Radial glow at centre (`accent + '18'`, radius = `max(w,h) * 0.55`)
3. Grain noise: per-pixel random offset ±18 via `ImageData`
4. Decorative light blobs at top edge (radial gradients, `accent + '22'`)
5. Large decorative quote mark `"` at centre — bold Georgia, `accent + '12'`
6. Quote text — italic Georgia, centred, word-wrapped to `w * 0.78` (or `0.7` for wide)
7. Reference line — Georgia (non-italic), `accent` colour, prefixed with `—`
8. Watermark `SDARM.life` — bottom-centre, `accent + '55'`

### Typography in canvas

| Element | Story | Square | Wide |
|---------|-------|--------|------|
| Quote font size | 68px | 62px | 52px |
| Line height | 96px | 88px | 74px |
| Reference font size | 44px | 40px | 34px |
| Watermark font size | 30px | 28px | 24px |

- Font: `Georgia, serif` — not the web fonts (Cormorant etc.) as canvas cannot load `@import` fonts
- Text alignment: always centred
- Quote mark size: 320px (story) / 260px (square) / 200px (wide)

### Download

- Format: JPEG, quality 0.85 (`canvas.toDataURL('image/jpeg', 0.85)`)
- Filename pattern: `SDARM.life_{fmt}.jpg` (e.g. `SDARM.life_square.jpg`)
- Re-render the canvas at full resolution immediately before export (do not rely on the preview render)

---

## 5. Preview area

- Background matches the active theme for visual context
- Dark: `#0d0a07` / Vanilla: `#f1eada` / Sand: `#cec1a8` / Mahogany: `#584738`
- Canvas displayed at `max-width: 88%; max-height: 88%` — inset breathing room
- Canvas shadow: `0 16px 80px rgba(0,0,0,0.8)`
- `object-fit: contain` behaviour via CSS (`display: block; margin: auto`)

---

## 6. Verse / quote data

- Verses are static arrays in `NewsSection.tsx`, keyed by locale (`de` / `en`)
- Active verse rotates daily: `(year * 366 + month * 31 + day) % verses.length`
- Minimum 3 verses per locale — ensures daily rotation is meaningful
- Do not fetch verses from the API — they are content, not dynamic data

---

## 7. Known gaps to address

| Issue | Location | Fix |
|-------|----------|-----|
| `transparent` theme exists in CSS but not in `THEMES` object | `QuoteShareModal.tsx:14`, `globals.css:1074` | Either remove the CSS or add `transparent` to `THEMES` with a PNG export variant |
| Canvas uses `Georgia` instead of brand fonts | `QuoteShareModal.tsx:72,81` | Load brand fonts via `FontFace` API before rendering canvas |
| Only 3 verses per locale | `NewsSection.tsx:7` | Expand to at least 7 (one per day of the week) to avoid repetition |
