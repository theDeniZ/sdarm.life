'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export interface FooterConfig {
  donation_url?: string | null;
  facebook_url?: string | null;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
}

interface FooterProps {
  config?: FooterConfig;
  apiUrl?: string;
  webUrl?: string;
  songbookUrl?: string;
  eventsUrl?: string;
  treasuresUrl?: string;
  locale?: string;
}

interface SunData {
  todaySunrise: number;
  todaySunset: number;
  tomorrowSunrise: number;
  tomorrowSunset: number;
}

interface ClockState {
  label: string;
  sublabel: string;
  timeVal: string;
  progress: number;
  sunDay?: string;
}

const CIRC = 2 * Math.PI * 76;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
}

function extractCityName(r: NominatimResult): string {
  const a = r.address;
  if (!a) return r.display_name.split(',')[0];
  return a.city || a.town || a.village || a.municipality || a.county || a.state || r.display_name.split(',')[0];
}

function extractDropdownLabel(r: NominatimResult): string {
  const a = r.address;
  const city = extractCityName(r);
  const postcode = a?.postcode;
  const country = a?.country || '';
  const countryCode = a?.country_code?.toUpperCase() || '';

  // For US/CA/AU show "City, State" — country is too broad
  const stateCountries = ['us', 'ca', 'au'];
  if (a?.state && a.country_code && stateCountries.includes(a.country_code)) {
    const prefix = postcode ? `${postcode} · ` : '';
    return `${prefix}${city}, ${a.state}`;
  }

  // Postal code search: show "10115 · Berlin, Germany"
  if (postcode && postcode === r.display_name.split(',')[0].trim()) {
    return city !== postcode ? `${postcode} · ${city}, ${countryCode}` : `${postcode}, ${country}`;
  }

  return country ? `${city}, ${country}` : city;
}
const DEFAULT_LAT = 48.8922;
const DEFAULT_LNG = 8.6944;
const LOCATION_KEY = 'sdarm_sunset_location';

function getBrowserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Berlin';
  }
}

function parseTimeToMs(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  let [h] = time.split(':').map(Number);
  const m = Number(time.split(':')[1]);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return (h * 3600 + m * 60) * 1000;
}

function msToHHMM(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtRemaining(diffMs: number): string {
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function nowMs(): number {
  const d = new Date();
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000;
}

function computeClock(sun: SunData, now: number, dow: number, clockT: (key: string) => string): ClockState {
  const DAY_MS = 86400000;

  const { todaySunrise, todaySunset, tomorrowSunrise, tomorrowSunset } = sun;

  const isFriday = dow === 5;
  const isSaturday = dow === 6;

  const isBeforeSunrise = now < todaySunrise;
  const isAfterSunset = now >= todaySunset;
  const isNight = isAfterSunset || isBeforeSunrise;

  const sunDay = isFriday ? clockT('friday') : isSaturday ? clockT('saturday') : '';

  const calcProgress = (remaining: number, total: number) => Math.min(1, Math.max(0, remaining / total));

  if (isFriday && !isAfterSunset) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);
    return {
      label: clockT('untilSabbath'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  if ((isFriday && isAfterSunset) || (isSaturday && !isAfterSunset)) {
    let total: number;
    let remaining: number;
    let endTimeVal: number;

    if (isFriday) {
      // Sabbath started at today's sunset, ends at tomorrow's sunset (crosses midnight)
      total = DAY_MS - todaySunset + tomorrowSunset;
      remaining = Math.max(0, DAY_MS - now + tomorrowSunset);
      endTimeVal = tomorrowSunset;
    } else {
      // Saturday: period from yesterday's sunset (~DAY_MS ago) to today's sunset
      total = DAY_MS;
      remaining = Math.max(0, todaySunset - now);
      endTimeVal = todaySunset;
    }

    return {
      label: clockT('sabbathEnds'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(endTimeVal),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  if (!isNight) {
    const total = todaySunset - todaySunrise;
    const remaining = Math.max(0, todaySunset - now);
    return {
      label: clockT('untilSunset'),
      sublabel: fmtRemaining(remaining),
      timeVal: msToHHMM(todaySunset),
      progress: calcProgress(remaining, total),
      sunDay,
    };
  }

  const total = DAY_MS - todaySunset + tomorrowSunrise;
  const remaining = isAfterSunset ? DAY_MS - now + tomorrowSunrise : Math.max(0, tomorrowSunrise - now);

  return {
    label: clockT('untilSunrise'),
    sublabel: fmtRemaining(remaining),
    timeVal: msToHHMM(tomorrowSunrise),
    progress: calcProgress(remaining, total),
    sunDay,
  };
}

async function fetchSunData(lat: number, lng: number, tz?: string): Promise<SunData> {
  const base = `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}&timezone=${encodeURIComponent(tz ?? getBrowserTz())}`;
  const [todayRes, tomorrowRes] = await Promise.all([fetch(`${base}&date=today`), fetch(`${base}&date=tomorrow`)]);
  const [todayData, tomorrowData] = await Promise.all([
    todayRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
    tomorrowRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
  ]);
  return {
    todaySunrise: parseTimeToMs(todayData.results.sunrise),
    todaySunset: parseTimeToMs(todayData.results.sunset),
    tomorrowSunrise: parseTimeToMs(tomorrowData.results.sunrise),
    tomorrowSunset: parseTimeToMs(tomorrowData.results.sunset),
  };
}

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  webUrl = 'https://sdarm.life',
  songbookUrl = 'https://songs.sdarm.life',
  eventsUrl = 'https://events.sdarm.life',
  treasuresUrl = 'https://treasures.sdarm.life',
  locale = 'de',
}: FooterProps) {
  const t = useTranslations('common.footer');
  const clockT = useTranslations('common.clock');
  const navT = useTranslations('common.nav');

  const facebookUrl = config?.facebook_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';
  const whatsappUrl = config?.whatsapp_url ?? '#';

  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');
  const [sunData, setSunData] = useState<SunData | null>(null);
  const [locationName, setLocationName] = useState(clockT('defaultLocation'));
  const [locationInput, setLocationInput] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clock, setClock] = useState<ClockState>({
    label: clockT('sunset'),
    sublabel: '…',
    timeVal: '–:––',
    progress: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) {
        const { lat, lng, name, tz } = JSON.parse(saved) as { lat: number; lng: number; name: string; tz?: string };
        setLocationName(name);
        fetchSunData(lat, lng, tz)
          .then(setSunData)
          .catch(() => {});
        return;
      }
    } catch {
      // ignore
    }
    fetchSunData(DEFAULT_LAT, DEFAULT_LNG)
      .then(setSunData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sunData) return;
    function tick() {
      const now = nowMs();
      const dow = new Date().getDay();
      setClock(computeClock(sunData!, now, dow, clockT));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sunData, clockT]);

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: locale }),
      });
      if (res.status === 409) {
        setSubStatus('conflict');
        return;
      }
      if (!res.ok) throw new Error();
      setSubStatus('ok');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  }

  useEffect(() => {
    if (locationInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=jsonv2&limit=3&addressdetails=1`
        );
        const data = (await res.json()) as NominatimResult[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silently fail
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [locationInput]);

  async function applyLocation(result: NominatimResult) {
    const name = extractCityName(result);
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const tz = getBrowserTz();
    try {
      const data = await fetchSunData(lat, lng, tz);
      setSunData(data);
      setLocationName(name);
      setLocationInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      try {
        localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng, name, tz }));
      } catch {
        // ignore
      }
    } catch {
      // silently fail
    }
  }

  async function handleLocationChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (suggestions.length > 0) {
      await applyLocation(suggestions[0]);
      return;
    }
    if (!locationInput.trim()) return;
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=jsonv2&limit=1&addressdetails=1`
      );
      const results = (await geo.json()) as NominatimResult[];
      if (!results.length) return;
      await applyLocation(results[0]);
    } catch {
      // silently fail
    }
  }

  // Ring shows ELAPSED progress: fills up as time passes (empty at start, full when period ends)
  const elapsed = 1 - clock.progress;
  const dashOffset = CIRC * (1 - elapsed); // = CIRC * clock.progress
  // Dot at the leading edge of the fill, going clockwise from 12 o'clock
  const R = 76;
  const CX = 90;
  const CY = 90;
  const angle = elapsed * 2 * Math.PI;
  const dotX = CX + R * Math.cos(angle);
  const dotY = CY + R * Math.sin(angle);

  return (
    <footer className="site-footer">
      <div className="footer-map" />

      <div className="footer-inner-wrap">
        {/* Column 1: contact + subscribe */}
        <div className="footer-contact">
          <h3 className="footer-heading">{t.rich('stayInTouch', { em: (chunks) => <em>{chunks}</em> })}</h3>
          <div className="footer-info">
            <a href="mailto:info@sdarm.life">info@sdarm.life</a>
          </div>

          <div className="footer-social">
            <a href={instagramUrl} title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={youtubeUrl} title="YouTube" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href={whatsappUrl} title="WhatsApp" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </a>
            <a href={facebookUrl} title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
          </div>

          <div className="footer-form-label">{t('newsletter')}</div>
          <form
            className="footer-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
          >
            <input
              className="footer-input"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button className="footer-subscribe" type="submit" disabled={subStatus === 'loading'} aria-label="Subscribe">
              {subStatus === 'loading' ? (
                <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" strokeDasharray="28" strokeDashoffset="10" style={{ animation: 'footer-spin 0.8s linear infinite' }} /></svg>
              ) : (
                <svg viewBox="0 0 16 16" aria-hidden="true"><line x1="2" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" /></svg>
              )}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">{t('subscribeSuccess')}</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">{t('subscribeDuplicate')}</p>}
          {subStatus === 'error' && <p className="f-sub-err">{t('subscribeError')}</p>}
        </div>

        {/* Column 2: nav links */}
        <div className="footer-nav">
          <div className="footer-nav-links">
            <Link href={`${webUrl}/#neuigkeiten`}>{navT('news')}</Link>
            <Link href={songbookUrl}>{navT('songs')}</Link>
            <Link href={eventsUrl}>{navT('events')}</Link>
            <Link href={treasuresUrl}>{navT('treasures')}</Link>
            <Link href={`${webUrl}/about`}>{navT('about')}</Link>
            <Link href={`${webUrl}/#kontakt`}>{navT('contact')}</Link>
          </div>
        </div>

        {/* Column 3: sunset clock */}
        <div className="footer-sunset">
          <div className="sunset-clock-wrap">
            <svg className="sunset-svg" viewBox="0 0 180 180">
              <circle className="sunset-ring-track" cx="90" cy="90" r="76" />
              <circle
                className="sunset-ring-fill"
                cx="90"
                cy="90"
                r="76"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
              />
              {clock.progress > 0 && clock.progress < 1 && (
                <>
                  <circle className="sunset-ring-dot" cx={dotX} cy={dotY} r="5" />
                  <circle className="sunset-ring-dot-glow" cx={dotX} cy={dotY} r="9" />
                </>
              )}
            </svg>
            <div className="sunset-clock-inner">
              <div className="sunset-time-value">
                {clock.timeVal === '–:––' ? (
                  clock.timeVal
                ) : (
                  <>
                    {clock.timeVal.split(':')[0]}
                    <span className="sunset-colon">:</span>
                    {clock.timeVal.split(':')[1]}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="sunset-footer-text">
            <div className="sunset-footer-location">{locationName}</div>
            <div className="sunset-footer-label">{clock.label}</div>
            <div className="sunset-location-wrap">
              <form className="sunset-location-form" onSubmit={handleLocationChange}>
                <input
                  type="text"
                  className="sunset-location-input"
                  placeholder={t('locationPlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                <button type="submit" className="sunset-location-btn" aria-label={t('locationUpdateAria')}>
                  <svg viewBox="0 0 13 13" aria-hidden="true"><line x1="1.5" y1="6.5" x2="11" y2="6.5" /><polyline points="7.5,3 11,6.5 7.5,10" /></svg>
                </button>
              </form>
              {showSuggestions && suggestions.length > 0 && (
                <ul className="sunset-suggestions">
                  {suggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="sunset-suggestion-item"
                        onMouseDown={() => applyLocation(s)}
                      >
                        {extractDropdownLabel(s)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-bottom-logo">
          SDARM<span>.life</span>
        </span>
        <span className="footer-copy">{t('copyright', { year: new Date().getFullYear() })}</span>
        <div className="footer-legal">
          <Link href={`${webUrl}/impressum`}>{navT('imprint')}</Link>
          <span>·</span>
          <Link href={`${webUrl}/datenschutz`}>{navT('privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}
