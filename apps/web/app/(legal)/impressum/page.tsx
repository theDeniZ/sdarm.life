export const runtime = 'edge';

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Impressum – sdarm.life',
};

export default function ImpressumPage() {
  return (
    <main className="page legal-page">
      <Link href="/" className="legal-back">← Zurück zur Startseite</Link>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Gemeinschaft der Siebenten-Tags-Adventisten Reformationsbewegung e.&nbsp;V.<br />
        Eisenbahnstr. 6<br />
        D-65439 Flörsheim/M
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:info@sdarm.life">info@sdarm.life</a><br />
        Website: <a href="https://sdarm.life">sdarm.life</a>
      </p>

      <h2>Vereinsregister</h2>
      <p>
        Registergericht: Amtsgericht Wiesbaden<br />
        Registernummer: VR 6992
      </p>

      <h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
      <p>
        Sergei Galuscinshi<br />
        Eisenbahnstr. 6, D-65439 Flörsheim/M
      </p>

      <h2>Übergeordnete Organisation</h2>
      <p>
        Generalkonferenz der STA-REF<br />
        <a href="https://www.sdarm.org" target="_blank" rel="noopener noreferrer">www.sdarm.org</a>
      </p>
    </main>
  );
}
