export const runtime = 'edge';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – sdarm.life',
};

export default function DatenschutzPage() {
  return (
    <main className="page legal-page">
      <h1>Datenschutzerklärung</h1>

      <h2>Verantwortlicher</h2>
      <p>
        Gemeinschaft der Siebenten-Tags-Adventisten Reformationsbewegung e.&nbsp;V.
        <br />
        Eisenbahnstr. 6, D-65439 Flörsheim/M
        <br />
        E-Mail: <a href="mailto:info@sdarm.life">info@sdarm.life</a>
      </p>

      <h2>Newsletter</h2>
      <p>
        Wenn Sie unseren Newsletter abonnieren, speichern wir Ihre E-Mail-Adresse sowie den Zeitpunkt der Anmeldung. Die
        Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können das
        Abonnement jederzeit über den Abmeldelink in jeder Newsletter-E-Mail widerrufen.
      </p>

      <h2>Cookies</h2>
      <p>
        Diese Website setzt keine eigenen Cookies. Cloudflare kann als technischer Dienstleister ein funktional
        notwendiges Cookie (<code>__cf_bm</code>) zum Schutz vor automatisierten Zugriffen setzen. Dieses Cookie
        erfordert keine Einwilligung (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO).
      </p>

      <h2>Hosting &amp; Analyse</h2>
      <p>
        Diese Website wird über Cloudflare Pages gehostet. Cloudflare kann dabei technische Zugriffsdaten (z.&nbsp;B.
        IP-Adresse, Zeitpunkt des Abrufs) verarbeiten. Websitestatistiken werden über Cloudflare Web Analytics erfasst —
        cookiefrei, ohne Nutzerprofile und ohne personenbezogene Daten.{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Cloudflare
        </a>
        .
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer gespeicherten
        Daten sowie das Recht auf Datenübertragbarkeit. Wenden Sie sich dazu an{' '}
        <a href="mailto:info@sdarm.life">info@sdarm.life</a>.
      </p>
    </main>
  );
}
