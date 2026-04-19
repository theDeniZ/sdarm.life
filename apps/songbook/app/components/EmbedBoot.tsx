'use client';

/**
 * Embed mode for the songbook.
 *
 * Adds an `embed` class to <html> when EITHER:
 *   1. The URL carries `?embed=1`, OR
 *   2. The page is open inside a Telegram client
 *      (window.Telegram.WebApp.initData is non-empty)
 *
 * Stylesheets use the class to strip everything except the song content
 * (`.reader-content`) so the page renders as a clean, single-purpose view.
 *
 * The Telegram check is the safety net — if a locale redirect or any in-app
 * navigation drops the `?embed=1` query param, we still know we're inside the
 * bot's Mini App and keep the chrome hidden.
 *
 * Outside Telegram and without `?embed=1`, this is a complete no-op and the
 * regular site (with full navigation) is unaffected.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const EMBED_CLASS = 'embed';

interface TelegramWebApp {
  initData: string;
  ready?: () => void;
  expand?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function detectTelegram(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.Telegram?.WebApp?.initData?.length;
}

export default function EmbedBoot() {
  const params = useSearchParams();
  const queryEmbed = params.get('embed') === '1';
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    setIsTelegram(detectTelegram());
    // Tell Telegram we're ready so it can show the page. Idempotent.
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
  }, []);

  const isEmbed = queryEmbed || isTelegram;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isEmbed) root.classList.add(EMBED_CLASS);
    return () => {
      root.classList.remove(EMBED_CLASS);
    };
  }, [isEmbed]);

  return null;
}
