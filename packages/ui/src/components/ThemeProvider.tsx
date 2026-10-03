'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'sdarm-theme';
const EVENT = 'sdarm:toggle-theme';

export default function ThemeProvider() {
  // Normally a no-op: ThemeScript has already applied the stored theme before
  // first paint. But a not-found response is served as Next's error shell
  // (<html id="__next_error__">) and the whole document is rendered on the
  // client, where an inline <script> never runs — so every 404 came up dark for
  // a visitor who had chosen light.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if ((stored === 'dark' || stored === 'light') && document.documentElement.getAttribute('data-theme') !== stored) {
        document.documentElement.setAttribute('data-theme', stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onToggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }

    window.addEventListener(EVENT, onToggle);
    return () => window.removeEventListener(EVENT, onToggle);
  }, []);

  return null;
}
