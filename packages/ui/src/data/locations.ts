// Shared canonical list of all SDARM congregations across DE/AT/CH.
// Used by both the Kontakt page (apps/web) and the CommunityMap (footer).

export type CountryCode = 'DE' | 'AT' | 'CH';

export interface Location {
  slug: string;
  city: string;
  street: string;
  postal: string;
  cityFull?: string;
  country: CountryCode;
  region?: string;
  lat: number;
  lng: number;
  description?: { de: string; en: string };
  photoKeys?: string[];
}

export const COUNTRY_NAMES: Record<CountryCode, { de: string; en: string }> = {
  DE: { de: 'Deutschland', en: 'Germany' },
  AT: { de: 'Österreich', en: 'Austria' },
  CH: { de: 'Schweiz', en: 'Switzerland' },
};

export const LOCATIONS: Location[] = [
  // ── Deutschland ──
  { slug: 'essen', city: 'Essen', street: 'Bochumer Landstr. 222', postal: '45276', country: 'DE', region: 'Nordrhein-Westfalen', lat: 51.4556, lng: 7.0116 },
  { slug: 'frankfurt', city: 'Frankfurt', cityFull: 'Flörsheim am Main', street: 'Eisenbahnstraße 6', postal: '65439', country: 'DE', region: 'Hessen', lat: 50.0237, lng: 8.4358 },
  { slug: 'karlsruhe', city: 'Karlsruhe', street: 'Silcherstr. 21', postal: '76185', country: 'DE', region: 'Baden-Württemberg', lat: 49.0069, lng: 8.4037 },
  { slug: 'landshut', city: 'Landshut', street: 'Ottostraße 21', postal: '84030', country: 'DE', region: 'Bayern', lat: 48.5400, lng: 12.1500 },
  { slug: 'muenchen', city: 'München', street: 'Altostraße 40', postal: '81245', country: 'DE', region: 'Bayern', lat: 48.1351, lng: 11.5820 },
  { slug: 'bad-emstal', city: 'Bad Emstal', street: 'Kasseler Str. 48', postal: '34308', country: 'DE', region: 'Hessen', lat: 51.2667, lng: 9.2917 },
  { slug: 'pfinztal', city: 'Pfinztal', street: 'Selmnitzstraße 19', postal: '76327', country: 'DE', region: 'Baden-Württemberg', lat: 48.9333, lng: 8.5500 },
  { slug: 'stuttgart', city: 'Stuttgart', cityFull: 'Ostfildern', street: 'Heumadener Str. 16', postal: '73760', country: 'DE', region: 'Baden-Württemberg', lat: 48.7300, lng: 9.2333 },

  // ── Österreich ──
  { slug: 'wien', city: 'Wien', street: 'Gutheil-Schoder-Gasse 10', postal: '1100', country: 'AT', lat: 48.2082, lng: 16.3738 },
  { slug: 'salzburg', city: 'Salzburg', street: 'Bergstrasse 22', postal: '5020', country: 'AT', lat: 47.8095, lng: 13.0550 },
  { slug: 'graz', city: 'Graz', street: 'Spitzäckerweg 51B', postal: '8055', country: 'AT', region: 'Steiermark', lat: 47.0707, lng: 15.4395 },
  { slug: 'wolfern', city: 'Wolfern', street: 'Tavernstrasse 19', postal: '4493', country: 'AT', region: 'Oberösterreich', lat: 48.0667, lng: 14.3667 },

  // ── Schweiz ──
  { slug: 'genf', city: 'Genève', cityFull: 'Grand-Lancy', street: 'Chemin du Clos 20', postal: '1212', country: 'CH', lat: 46.1791, lng: 6.1190 },
];

export function locationsByCountry(): Record<CountryCode, Location[]> {
  return LOCATIONS.reduce(
    (acc, loc) => {
      acc[loc.country].push(loc);
      return acc;
    },
    { DE: [], AT: [], CH: [] } as Record<CountryCode, Location[]>,
  );
}

export function googleMapsUrl(loc: Location): string {
  const q = `${loc.street}, ${loc.postal} ${loc.cityFull ?? loc.city}, ${COUNTRY_NAMES[loc.country].en}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
