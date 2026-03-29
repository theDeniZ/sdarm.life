# Design Audit Rules

Rules and standards derived from auditing existing UI components. Use this document when building or reviewing UI to ensure visual and behavioural consistency.

---

## Строгий UI/UX Аудит — Инструкция для ИИ-агента

**Роль агента:** Senior UI/UX Дизайнер и безжалостный технический аудитор. Задача — проанализировать все CSS/HTML, компоненты и разметку этого проекта на строгое соответствие фундаментальным правилам дизайна. Никаких поблажек и компромиссов.

Пройтись по всем файлам проекта (включая стили и компоненты). Выдать структурированный список конкретных файлов и строк кода, где нарушены правила ниже. Для каждого нарушения предоставить:
1. Описание проблемы (почему это выглядит плохо).
2. Точный CSS/HTML код для исправления в соответствии со строгими правилами дизайна.

### Критерий A — Правило пропорций 60-30-10

Проверить используемые цвета и их распределение:

- **60% (Доминанта/Фон):** Основной фон сайта должен занимать большую часть пространства и быть глубоким тёмным оттенком.
- **30% (Вторичный цвет):** Карточки, панели навигации и контейнеры должны визуально отделяться от фона, но не забирать на себя лишнее внимание.
- **10% (Акцент):** Только кнопки (CTA), активные ссылки и важные интерактивные элементы имеют право на яркий, привлекающий внимание цвет.
- **КРИТИЧЕСКАЯ ОШИБКА:** Акцентный цвет используется для фона больших неинтерактивных блоков или длинного текста — это ломает визуальную иерархию.

### Критерий B — Строгие правила Dark Mode

Проверить все HEX, RGB и HSL значения в стилях проекта:

- **Запрет на чистый чёрный:** Любое использование `#000000`, `rgb(0,0,0)` или `hsl(0,0%,0%)` для фонов — критическая ошибка. Требуется замена на тёмно-серые или глубокие оттенки с цветовым подтоном (например, `#121212` или `#0B0F19`).
- **Запрет на чистый белый текст:** Использование `#FFFFFF` или `rgb(255,255,255)` для основного параграфного текста — ошибка. Требуется замена на `rgba(255,255,255,0.87)` или светло-серые оттенки (`#E0E0E0`, `#F3F4F6`), чтобы избежать эффекта «гало» и усталости глаз.
- **Глубина интерфейса (Elevation):** В тёмной теме глубина должна достигаться **высветлением фона** элемента (карточки, плавающие меню, модальные окна), а не только `box-shadow` — тени растворяются на тёмном фоне и не работают.

### Критерий C — WCAG Контрастность и Доступность

Вычислить математическую контрастность между текстом и фоном во всех текстовых узлах:

- **Основной мелкий текст:** Контраст с фоном — строго не менее **4.5:1**.
- **Крупные заголовки:** Контраст не менее **3:1**.
- **КРИТИЧЕСКАЯ ОШИБКА:** Тёмно-серый текст на чёрном/тёмном фоне не читается. Любые места, не проходящие стандарт WCAG AA — требуют немедленного исправления.

### Критерий D — Воздух и сетка (Negative Space / Spacing)

Проанализировать все `margin`, `padding`, `gap` и типографику во всём проекте:

- **Системность и шаг сетки:** Отступы должны подчиняться строгой математической шкале, кратной 4px или 8px (4 / 8 / 16 / 24 / 32 / 48 / 64px).
- **Иерархия пространства:** Расстояние между логическими блоками (секция от секции) должно быть визуально **больше**, чем расстояние внутри блока (заголовок–текст внутри карточки). Это закон близости.
- **Интерлиньяж:** `line-height` для основного текста — `1.5`–`1.6`. Если текст «слипается» — это ошибка.
- **КРИТИЧЕСКАЯ ОШИБКА:** Случайные «мусорные» значения отступов (например, `margin: 13px`, `padding: 17px`) или полное отсутствие воздуха (элементы упираются в края экрана без `padding`).

---

## 1. Buttons

### Interactive reveal buttons (e.g. quote-save-btn)

- Hidden by default: `opacity: 0; transform: translateY(-3px)`
- Revealed on parent hover via `.parent:hover .btn` selector — never on the button's own hover
- Transition: `all 0.3s ease`
- On mobile (≤768px): always visible (`opacity: 1; transform: translateY(0)`)
- Size: 28×28px minimum tap target for icon-only buttons
- Shape: circular (`border-radius: 50%`)
- Background: `rgba(10, 9, 7, 0.65)` + `backdrop-filter: blur(8px)`
- Border: `1px solid rgba(201, 169, 110, 0.22)` (gold at low opacity)
- Icon color: `rgba(201, 169, 110, 0.6)` at rest → `var(--gold)` on hover
- Hover background: `rgba(201, 169, 110, 0.14)`
- Hover border: `rgba(201, 169, 110, 0.5)`
- Icon size inside 28px button: 11×11px (SVG `stroke`, not fill)

### Download / action buttons (e.g. qsm-download)

- Minimum height: 36px; horizontal padding: 1rem
- Border: `1px solid rgba(201, 169, 110, 0.22)`
- Background: `rgba(201, 169, 110, 0.07)` at rest
- Hover: `linear-gradient(135deg, rgba(201,169,110,0.22) 0%, rgba(201,169,110,0.13) 100%)`
- Hover color: `var(--gold)`
- Hover border: `rgba(201, 169, 110, 0.55)`
- Icon inside button: 16×16px SVG

### Format / toggle buttons (e.g. qsm-fmt)

- Include both an icon and a text label stacked vertically (`flex-direction: column`)
- Inactive: `rgba(201,169,110,0.38)` color, `rgba(201,169,110,0.15)` border
- Active: `rgba(201,169,110,0.09)` background, `rgba(201,169,110,0.42)` border, `rgba(201,169,110,0.82)` color
- Hover (non-active): border `rgba(201,169,110,0.26)`, color `rgba(201,169,110,0.55)`
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
2. Radial glow at center (`accent + '18'`, radius = `max(w,h) * 0.55`)
3. Grain noise: per-pixel random offset ±18 via `ImageData`
4. Decorative light blobs at top edge (radial gradients, `accent + '22'`)
5. Large decorative quote mark `"` at center — bold Georgia, `accent + '12'`
6. Quote text — italic Georgia, centered, word-wrapped to `w * 0.78` (or `0.7` for wide)
7. Reference line — Georgia (non-italic), `accent` color, prefixed with `—`
8. Watermark `SDARM.life` — bottom-center, `accent + '55'`

### Typography in canvas

| Element | Story | Square | Wide |
|---------|-------|--------|------|
| Quote font size | 68px | 62px | 52px |
| Line height | 96px | 88px | 74px |
| Reference font size | 44px | 40px | 34px |
| Watermark font size | 30px | 28px | 24px |

- Font: `Georgia, serif` — not the web fonts (Cormorant etc.) as canvas cannot load `@import` fonts
- Text alignment: always centered
- Quote mark size: 320px (story) / 260px (square) / 200px (wide)

### Download

- Format: JPEG, quality 0.85 (`canvas.toDataURL('image/jpeg', 0.85)`)
- Filename pattern: `SDARM.life_{fmt}.jpg` (e.g. `SDARM.life_square.jpg`)
- Re-render the canvas at full resolution immediately before export (do not rely on the preview render)

---

## 5. Preview area

- Background matches the active theme for visual context
- Dark: `#0d0a07` / Vanilla: `#f1eada` / Sand: `#cec1a8` / Mahagoni: `#584738`
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
