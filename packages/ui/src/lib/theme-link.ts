'use client';

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/**
 * Append `?theme=<value>` (or `&theme=<value>` if a query string is already
 * present) to a URL so a cross-app navigation can carry the active theme.
 *
 * Each subdomain has its own `localStorage`, so the only way to keep the
 * theme stable as the user walks across `sdarm.life`, `songs.sdarm.life`,
 * `events.sdarm.life`, and `treasures.sdarm.life` without cookies is to
 * include the theme in the URL. The destination app's `ThemeScript` reads
 * the param before first paint, writes it to its own `localStorage`, and
 * strips it from the URL via `history.replaceState`.
 */
export function withTheme(url: string, theme: Theme): string {
  if (!url || url === '#' || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}theme=${theme}`;
}

/**
 * Subscribe to the current `data-theme` value on `<html>`. The hook reflects
 * runtime toggles via a MutationObserver, so cross-app links stay in sync
 * with the user's most recent choice.
 */
export function useCurrentTheme(): Theme {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    const sync = () => {
      const v = document.documentElement.getAttribute('data-theme');
      setTheme(v === 'light' ? 'light' : 'dark');
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}
