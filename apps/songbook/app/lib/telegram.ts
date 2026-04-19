'use client';

/**
 * Telegram Mini App integration helpers.
 *
 * Loaded by the SDK script in `app/[locale]/layout.tsx` (telegram-web-app.js).
 * Inside Telegram, `window.Telegram.WebApp` is populated; outside Telegram
 * (regular browser visit), it stays undefined and our helpers degrade gracefully.
 *
 * Surfaces we use:
 *   - isMiniApp()      → quick check at render time
 *   - useTelegramApp() → React hook that returns the typed WebApp + theme + ready()
 *   - useBackButton()  → wires the system Back button to a callback
 *   - cloudStorage     → tiny CloudStorage wrapper with localStorage fallback
 *
 * Theme sync is done via CSS variables on document.documentElement so any
 * styled rule can read them with var(--tg-theme-bg-color) etc.
 */

import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TelegramBackButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: Error | null, value?: string) => void): void;
  removeItem(key: string, cb?: (err: Error | null, ok?: boolean) => void): void;
  getKeys(cb: (err: Error | null, keys?: string[]) => void): void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string; user?: { id: number; first_name?: string } };
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  ready(): void;
  expand(): void;
  close(): void;
  openTelegramLink(url: string): void;
  BackButton: TelegramBackButton;
  CloudStorage: TelegramCloudStorage;
  onEvent(event: 'themeChanged' | 'viewportChanged', cb: () => void): void;
  offEvent(event: 'themeChanged' | 'viewportChanged', cb: () => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

// ── Detection ────────────────────────────────────────────────────────────────

/** Cheap, render-time check — does NOT require the SDK hook. */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

/** True only when the page is hosted inside a Telegram client (initData present). */
export function isMiniApp(): boolean {
  const tg = getTelegramWebApp();
  return !!tg && tg.initData.length > 0;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current WebApp instance + a `ready` flag.
 * Calls `ready()` and `expand()` on first mount, syncs theme params to CSS variables.
 */
export function useTelegramApp(): { webApp: TelegramWebApp | null; isMiniApp: boolean } {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tg.ready();
    tg.expand();
    setWebApp(tg);

    const sync = () => syncThemeToCss(tg.themeParams);
    sync();
    tg.onEvent('themeChanged', sync);
    return () => tg.offEvent('themeChanged', sync);
  }, []);

  return { webApp, isMiniApp: webApp ? webApp.initData.length > 0 : false };
}

function syncThemeToCss(params: TelegramThemeParams): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(params)) {
    if (v) root.style.setProperty(`--tg-theme-${k.replace(/_/g, '-')}`, v);
  }
}

// ── BackButton ───────────────────────────────────────────────────────────────

/**
 * Show the Telegram system Back button while mounted; hide on unmount.
 * Calls the provided handler on tap. No-op outside Telegram.
 */
export function useBackButton(onBack: () => void, deps: unknown[] = []): void {
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tg.BackButton.show();
    tg.BackButton.onClick(onBack);
    return () => {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    };
  }, deps);
}

// ── CloudStorage with localStorage fallback ──────────────────────────────────

const CS_PREFIX = 'breezify:';

export const cloudStorage = {
  async get(key: string): Promise<string | null> {
    const tg = getTelegramWebApp();
    if (tg) {
      return new Promise((resolve) => {
        tg.CloudStorage.getItem(key, (_err, value) => resolve(value ?? null));
      });
    }
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CS_PREFIX + key);
  },

  async set(key: string, value: string): Promise<void> {
    const tg = getTelegramWebApp();
    if (tg) {
      return new Promise((resolve) => {
        tg.CloudStorage.setItem(key, value, () => resolve());
      });
    }
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CS_PREFIX + key, value);
  },

  async remove(key: string): Promise<void> {
    const tg = getTelegramWebApp();
    if (tg) {
      return new Promise((resolve) => {
        tg.CloudStorage.removeItem(key, () => resolve());
      });
    }
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(CS_PREFIX + key);
  },

  async keys(): Promise<string[]> {
    const tg = getTelegramWebApp();
    if (tg) {
      return new Promise((resolve) => {
        tg.CloudStorage.getKeys((_err, k) => resolve(k ?? []));
      });
    }
    if (typeof window === 'undefined') return [];
    return Object.keys(window.localStorage)
      .filter((k) => k.startsWith(CS_PREFIX))
      .map((k) => k.slice(CS_PREFIX.length));
  },
};

// ── Deep-link parsing ────────────────────────────────────────────────────────

/**
 * Parses `Telegram.WebApp.initDataUnsafe.start_param`.
 * Currently understands `song_{id}` only (e.g. `song_42`).
 */
export function getStartParam(): { type: 'song'; id: number } | null {
  const tg = getTelegramWebApp();
  const raw = tg?.initDataUnsafe.start_param;
  if (!raw) return null;
  const m = raw.match(/^song_(\d+)$/);
  if (m) return { type: 'song', id: parseInt(m[1], 10) };
  return null;
}
