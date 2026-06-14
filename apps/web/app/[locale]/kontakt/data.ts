// Single source of truth for congregation data lives in @sdarm/ui.
// This file re-exports for backward compatibility within apps/web.

export type { Location, CountryCode } from '@sdarm/ui';
export { LOCATIONS, COUNTRY_NAMES, locationsByCountry, googleMapsUrl } from '@sdarm/ui';
