'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  songbookUrl?: string;
}

interface SunData {
  todaySunrise: number; // ms since midnight Berlin time
  todaySunset: number;
  tomorrowSunrise: number;
  tomorrowSunset: number;
}

interface ClockState {
  label: string;
  sublabel: string;
  timeVal: string;
  progress: number; // 0 → 1
}

const CIRC = 2 * Math.PI * 76; // ≈ 477.52
const LAT = 48.8922;
const LNG = 8.6944;
const TZ = 'Europe/Berlin';

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

function computeClock(sun: SunData, now: number, dow: number): ClockState {
  const { todaySunrise, todaySunset, tomorrowSunrise } = sun;
  const isNight = now >= todaySunset || now < todaySunrise;

  if (dow === 5 || dow === 6) {
    const label = dow === 5 ? 'Bis Schabbat' : 'Schabbat endet';
    const diff = Math.max(0, todaySunset - now);
    const dayLen = todaySunset - todaySunrise;
    const progress = Math.min(1, Math.max(0, (now - todaySunrise) / dayLen));
    return { label, sublabel: fmtRemaining(diff), timeVal: msToHHMM(todaySunset), progress };
  }

  if (!isNight) {
    const diff = Math.max(0, todaySunset - now);
    const dayLen = todaySunset - todaySunrise;
    const progress = Math.min(1, Math.max(0, (now - todaySunrise) / dayLen));
    return { label: 'Bis Sonnenuntergang', sublabel: fmtRemaining(diff), timeVal: msToHHMM(todaySunset), progress };
  }

  // Night
  const nightLen = 86400000 - todaySunset + tomorrowSunrise;
  const nightElap = now >= todaySunset ? now - todaySunset : 86400000 - todaySunset + now;
  const progress = Math.min(1, Math.max(0, nightElap / nightLen));
  const diff = now >= todaySunset ? 86400000 - now + tomorrowSunrise : Math.max(0, tomorrowSunrise - now);
  return { label: 'Bis Sonnenaufgang', sublabel: fmtRemaining(diff), timeVal: msToHHMM(tomorrowSunrise), progress };
}

export default function Footer({
  config,
  apiUrl = 'https://api.sdarm.life/api/v1',
  songbookUrl = 'https://songs.sdarm.life',
}: FooterProps) {
  const facebookUrl = config?.facebook_url ?? '#';
  const whatsappUrl = config?.whatsapp_url ?? '#';
  const instagramUrl = config?.instagram_url ?? '#';
  const youtubeUrl = config?.youtube_url ?? '#';
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'ok' | 'error' | 'conflict'>('idle');
  const [sunData, setSunData] = useState<SunData | null>(null);
  const [clock, setClock] = useState<ClockState>({
    label: 'Untergang',
    sublabel: '…',
    timeVal: '–:––',
    progress: 0,
  });

  useEffect(() => {
    async function fetchSun() {
      try {
        const base = `https://api.sunrisesunset.io/json?lat=${LAT}&lng=${LNG}&timezone=${TZ}`;
        const [todayRes, tomorrowRes] = await Promise.all([
          fetch(`${base}&date=today`),
          fetch(`${base}&date=tomorrow`),
        ]);
        const [todayData, tomorrowData] = await Promise.all([
          todayRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
          tomorrowRes.json() as Promise<{ results: { sunrise: string; sunset: string } }>,
        ]);
        setSunData({
          todaySunrise: parseTimeToMs(todayData.results.sunrise),
          todaySunset: parseTimeToMs(todayData.results.sunset),
          tomorrowSunrise: parseTimeToMs(tomorrowData.results.sunrise),
          tomorrowSunset: parseTimeToMs(tomorrowData.results.sunset),
        });
      } catch {
        // silently fail — clock stays at placeholder
      }
    }
    fetchSun();
  }, []);

  useEffect(() => {
    if (!sunData) return;
    function tick() {
      const now = nowMs();
      const dow = new Date().getDay();
      setClock(computeClock(sunData!, now, dow));
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [sunData]);

  async function handleSubscribe() {
    if (!email) return;
    setSubStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

  const dashOffset = CIRC * (1 - clock.progress);

  return (
    <footer className="site-footer">
      <div className="footer-map" />
      <div className="footer-map-tip">
        Wir freuen uns,
        <br />
        dich hier zu sehen!
      </div>

      <div className="footer-inner">
        {/* Column 1: contact + subscribe */}
        <div className="footer-contact">
          <h3 className="footer-heading">
            In Kontakt
            <br />
            bleiben
          </h3>
          <div className="footer-info">
            Reformierte Adventisten
            <br />
            Deutschland &amp; Österreich
          </div>
          <div className="footer-social">
            <a href={facebookUrl} title="Facebook" target="_blank" rel="noopener noreferrer">
              fb
            </a>
            <a href={whatsappUrl} title="WhatsApp" target="_blank" rel="noopener noreferrer">
              wa
            </a>
            <a href={instagramUrl} title="Instagram" target="_blank" rel="noopener noreferrer">
              ig
            </a>
            <a href={youtubeUrl} title="YouTube" target="_blank" rel="noopener noreferrer">
              yt
            </a>
          </div>
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
              placeholder="E-Mail für Newsletter"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subStatus === 'loading'}
            />
            <button className="footer-subscribe" type="submit" disabled={subStatus === 'loading'}>
              {subStatus === 'loading' ? '…' : 'Abonnieren'}
            </button>
          </form>
          {subStatus === 'ok' && <p className="f-sub-ok">Vielen Dank für Ihre Anmeldung!</p>}
          {subStatus === 'conflict' && <p className="f-sub-err">Diese E-Mail ist bereits registriert.</p>}
          {subStatus === 'error' && <p className="f-sub-err">Fehler. Bitte versuchen Sie es später.</p>}
        </div>

        {/* Column 2: nav links */}
        <div className="footer-nav">
          <div className="footer-nav-title">Navigation</div>
          <div className="footer-nav-links">
            <Link href="/#neuigkeiten">Neuigkeiten</Link>
            <a href={songbookUrl}>Liederbuch</a>
            <Link href="/about">Über uns</Link>
            <Link href="/#produkte">Produkte</Link>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
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
            </svg>
            <div className="sunset-clock-inner">
              <div className="sunset-time-label">Untergang</div>
              <div className="sunset-time-value">{clock.timeVal}</div>
              <div className="sunset-countdown">{clock.sublabel}</div>
            </div>
          </div>
          <div className="sunset-footer-text">
            <div className="sunset-footer-label">{clock.label}</div>
            <div className="sunset-footer-location">Pforzheim, Baden-Württemberg</div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">© 2026 SDARM.life — Siebenten-Tags-Adventisten Reformationsbewegung</span>
        <span className="footer-copy">Alle Rechte vorbehalten</span>
      </div>
    </footer>
  );
}
