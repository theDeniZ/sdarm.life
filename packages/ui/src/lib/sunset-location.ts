import { useCallback, useEffect, useState } from 'react';
import { LOCATIONS } from '../data/locations';

export const LOCATION_KEY = 'sdarm_sunset_location';

export const DEFAULT_COORDS = { lat: 48.8922, lng: 8.6944 };

/** Where ?screenshotLocation= puts the clock, whatever name it carries. */
const SCREENSHOT_COORDS = { lat: 48.895, lng: 8.681, slug: 'pforzheim' };

/** Fired on window after a pick, so every consumer on the page follows it. */
const CHANGE_EVENT = 'sdarm:sunset-location';

export interface StoredLocation {
  lat: number;
  lng: number;
  name: string;
  slug?: string;
}

export type PickLocation = (loc: { lat: number; lng: number; name: string; slug?: string }) => void;

export function readStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocation>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number' || typeof parsed.name !== 'string') {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng, name: parsed.name, slug: parsed.slug };
  } catch {
    return null;
  }
}

export function writeStoredLocation(loc: StoredLocation): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch {
    // ignore — quota / private mode
  }
}

export function findLocationSlug(name: string): string | undefined {
  const lower = name.toLowerCase();
  const match = LOCATIONS.find(
    (l) =>
      l.city.toLowerCase() === lower ||
      lower.includes(l.city.toLowerCase()) ||
      (l.cityFull && lower.includes(l.cityFull.toLowerCase())),
  );
  return match?.slug;
}

/**
 * The visitor's sunset location, shared by the home page's sunset card and the
 * footer map's marker. The server render and the first client render use the
 * default; the stored pick is restored after mount (the server has no
 * localStorage). A pick is stored and announced on `window`, so the other
 * consumer on the same page moves with it, and the `storage` event carries it
 * across tabs. `?screenshotLocation=` pins the location for screenshot tests.
 */
export function useSunsetLocation(defaultName: string): [StoredLocation, PickLocation] {
  const [current, setCurrent] = useState<StoredLocation>(() => ({ ...DEFAULT_COORDS, name: defaultName }));

  useEffect(() => {
    const screenshotLocation = new URLSearchParams(window.location.search).get('screenshotLocation');
    if (screenshotLocation) {
      setCurrent({ ...SCREENSHOT_COORDS, name: screenshotLocation });
      return;
    }

    const sync = () => {
      const saved = readStoredLocation();
      if (saved) setCurrent(saved);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCATION_KEY) sync();
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const pick = useCallback<PickLocation>((loc) => {
    const next: StoredLocation = {
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
      slug: loc.slug ?? findLocationSlug(loc.name),
    };
    setCurrent(next);
    writeStoredLocation(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [current, pick];
}
