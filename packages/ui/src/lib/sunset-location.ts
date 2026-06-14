import { LOCATIONS } from '../data/locations';

export const LOCATION_KEY = 'sdarm_sunset_location';

export const DEFAULT_COORDS = { lat: 48.8922, lng: 8.6944 };

export interface StoredLocation {
  lat: number;
  lng: number;
  name: string;
  slug?: string;
}

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
