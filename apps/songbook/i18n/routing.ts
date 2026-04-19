import { defineRouting } from 'next-intl/routing';

// Songbook is English-only — it's the surface for the @BreezifyBot Telegram Mini App,
// which itself is English-only per apps/bot/CLAUDE.md.
// We intentionally don't import locales from @sdarm/i18n: that package keeps DE+EN
// for the other public apps (web, events, treasures) and we don't want to touch them.
export const SONGBOOK_LOCALES = ['en'] as const;
export type SongbookLocale = (typeof SONGBOOK_LOCALES)[number];

export const routing = defineRouting({
  locales: SONGBOOK_LOCALES,
  defaultLocale: 'en',
});
