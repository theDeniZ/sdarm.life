# Breezify Bot — Conventions

Persistent rules for `@sdarm/bot`. **Read this before any change to `apps/bot/`.**
This file overrides anything in the parent CLAUDE.md or general defaults — when there's a conflict, the bot rules win.

## Visual & language

1. **English only.** No Russian, no German. The bot has a single locale.
   No `/lang` command, no language menu, no per-user language preference.

2. **No standard emojis ever — Unicode glyphs only.** Anywhere: buttons, headers, body, errors, logs.
   - **Forbidden**: anything pictographic, colored on a typical platform, or rendered as a system emoji. Examples: 📚 🔍 🎵 🌐 ✉️ 🎸 📝 🏠 🌍 ⚠ ⏳ ◀️ ▶️ 🇷🇺 🇬🇧 ✍️ 📖 🎶 ▶ ◀ (with `\uFE0F` variation selector)
   - **Allowed glyphs** (verified to render as plain text on Telegram desktop + iOS):
     - Punctuation / structure: `·` `—` `–` `‹` `›` `«` `»` `№` `©` `±`
     - Arrows: `→` `←` `↑` `↓` `⟶` `⟵` `↗` `↘`
     - Geometry: `◆` `◇` `◈` `■` `□` `▲` `△` `▼` `▽` `●` `○`
     - Decorative (use sparingly as accents): `★` `☆` `❖` `✦` `✧` `✓` `✗`
   - **Before adding a new glyph**: test how it renders on iOS — Apple aggressively pictographizes anything that *looks* like a symbol. If it shows up colored/emoji-style, drop it.
   - Decoration belongs in typography (bold/italic, line breaks, separators), not pictograms.
   - **Custom Telegram Premium emoji** are allowed only after we ship a designed sticker pack with stable IDs. Until then, stick to the Unicode list above.

3. **Counts use `· N`, never `(N)`.** Example: `Songbook · 320` not `Songbook (320)`.

4. **Buttons must not duplicate body text.** If the message lists items, the keyboard offers actions on those items, not the same items as buttons.

5. **Main menu**: full-width buttons, one per row. No side-by-side primary actions.
   Pagination is the only place where horizontal grouping makes sense (`[ ‹ ] [ 3/22 ] [ › ]`).

6. **Back-navigation always uses `‹`** (e.g. `‹ Menu`, `‹ Back`). Pagination prev/next use the same `‹` and `›` glyphs.

7. **About page** replaces any "Developer" / "Contact" button. Contains a short bot description and the contact link inside (URL button to the maintainer's Telegram).

8. **Tone**: minimal, calm, hierarchy via bold/italic. No exclamation marks, no decorative ASCII lines (`─── Title ───` etc.).

## Behavior

- **Errors give a path forward.** Every error message has a retry button or a contact link — no dead-end "try again later" with no action.
- **Repeated content (e.g. same chorus N times) renders once**, then `— Chorus —` markers for repeats. Don't print the same block multiple times.
- **Long-message hints surface at the top, not buried at the end.**

## Code

- **Single source for the chord regex** lives at `format.ts → CHORD_RE` / `CHORD_RE_GLOBAL`. Never inline `/\[[A-G]…\]/` in other files.
- **Single pagination constant** `PAGE_SIZE` in `bot.ts`. Used for songbook lists, in-book search, and global search alike.
- **Callback payloads >64 bytes** (UTF-8 queries, anything dynamic) must go through `cb-store.ts` — store under a short id, embed only the id in `callback_data`.
- **Bounded callback regex digit counts** (id ≤ 7 digits, page ≤ 4 digits) so `parseInt` is safe without a separate range check.
- **Use `GrammyError instanceof`** for error-class checks, never string `.includes()` on `err.message`.
- **No hardcoded URLs.** External links (contact, etc.) come from env vars (`CONTACT_URL`).
