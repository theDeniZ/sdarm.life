'use client';

/**
 * Bootstraps Telegram Mini App integration on the page:
 *   - Calls Telegram.WebApp.ready()/expand() and syncs theme params to CSS
 *   - Adds `tg-mini-app` class to <html> so CSS can hide our own chrome
 *     (navbar, reader toolbar, sidebar) — Telegram already provides framing
 *   - Wires the system Back button to close the Mini App (returns user to chat)
 *
 * Outside Telegram (regular browser), all of this is a no-op.
 */

import { useEffect } from 'react';
import { getTelegramWebApp, useBackButton, useTelegramApp } from '../lib/telegram';

const MINI_APP_CLASS = 'tg-mini-app';

export default function TelegramBoot() {
  const { webApp, isMiniApp } = useTelegramApp();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isMiniApp) root.classList.add(MINI_APP_CLASS);
    return () => {
      root.classList.remove(MINI_APP_CLASS);
    };
  }, [isMiniApp]);

  // System Back button → close the Mini App (user returns to bot chat).
  // This is a fine default for the song reader — future enhancement could
  // call window.history.back() first when there's in-app history to walk.
  useBackButton(
    () => {
      const tg = getTelegramWebApp();
      tg?.close();
    },
    [webApp?.initData],
  );

  return null;
}
