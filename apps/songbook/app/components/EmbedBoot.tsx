'use client';

/**
 * Embed mode for the songbook.
 *
 * When the page URL carries `?embed=1`, we add an `embed` class to <html>.
 * Stylesheets use this class to hide the navbar / sidebar / reader toolbar so
 * the page renders as a clean, standalone song view — meant for opening from
 * the @BreezifyBot Telegram bot.
 *
 * Outside of `?embed=1`, this is a complete no-op and the regular site
 * (with full navigation) is unaffected.
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const EMBED_CLASS = 'embed';

export default function EmbedBoot() {
  const params = useSearchParams();
  const isEmbed = params.get('embed') === '1';

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
