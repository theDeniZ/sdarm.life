'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'sdarm-theme';
const EVENT = 'sdarm:toggle-theme';

export default function ThemeProvider() {
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
