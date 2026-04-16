'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'sdarm-theme';
const EVENT = 'sdarm:toggle-theme';

function getStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export default function ThemeProvider() {
  useEffect(() => {
    // Apply stored theme on mount (before first paint)
    const stored = getStored();
    if (stored) apply(stored);

    // Listen for toggle events dispatched by the secret trigger
    function onToggle() {
      const current = document.documentElement.getAttribute('data-theme');
      apply(current === 'light' ? 'dark' : 'light');
    }

    window.addEventListener(EVENT, onToggle);
    return () => window.removeEventListener(EVENT, onToggle);
  }, []);

  return null;
}
