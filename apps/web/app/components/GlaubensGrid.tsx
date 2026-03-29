import type { ReactNode } from 'react';

interface FaithCard {
  icon: ReactNode;
  title: string;
  text: string;
}

const CARDS: FaithCard[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="12,2 22,20 2,20" />
        <circle cx="12" cy="13" r="1.5" />
        <line x1="12" y1="11.5" x2="12" y2="7" />
      </svg>
    ),
    title: 'Gott, der Vater',
    text: 'Ein einziger Gott — Vater, Schöpfer, Person. Unendlich in Liebe und Weisheit, allmächtig, allgegenwärtig, unsterblich.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="4" y1="8" x2="20" y2="8" />
      </svg>
    ),
    title: 'Jesus Christus, der Sohn',
    text: 'Der Sohn Gottes, in seiner Natur eins mit dem Vater. Er starb für unsere Sünden, stand auf und vermittelt für uns.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22c-4-3-6-7-4-12 1-2 3-3 4-6 1 3 3 4 4 6 2 5 0 9-4 12z" />
        <path d="M12 22c-2-2-3-4-2-7 0-1 1-2 2-3 1 1 2 2 2 3 1 3 0 5-2 7z" />
      </svg>
    ),
    title: 'Der Heilige Geist',
    text: 'Christi Stellvertreter auf Erden — eines Sinnes mit Vater und Sohn. Er erneuert und leitet im Werk der Erlösung.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    title: 'Die Heilige Schrift',
    text: 'Altes und Neues Testament — das Wort Gottes. Vollständige Offenbarung seines Willens, unfehlbare Regel des Glaubens.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h7v11H3z" />
        <path d="M14 4h7v11h-7z" />
        <line x1="5" y1="8" x2="8" y2="8" />
        <line x1="5" y1="11" x2="8" y2="11" />
        <line x1="16" y1="8" x2="19" y2="8" />
        <line x1="16" y1="11" x2="19" y2="11" />
      </svg>
    ),
    title: 'Die Zehn Gebote',
    text: 'Das Moralgesetz aus 2. Mose 20 — Ausdruck des Willens Gottes. Unveränderlich, bindend für alle Menschen zu allen Zeiten.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="11" width="6" height="10" rx="1" />
        <path d="M12 11c0-3 2-5 2-7-1 0-4 2-4 7" />
        <path d="M12 4c0-1.5 1-2.5 1-2.5S11 2 11 4" />
      </svg>
    ),
    title: 'Der Sabbat',
    text: 'Der siebente Tag — heiliger Ruhetag Gottes. Gedächtnistag der Schöpfung, von Freitagsuntergang bis Samstagabend.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4" y1="4" x2="20" y2="20" />
      </svg>
    ),
    title: 'Sonntagsheiligung',
    text: 'Der erste Tag trägt kein biblisches Gebot der Heiligung. Wir folgen dem, was Gott tatsächlich geheiligt hat.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="2" y1="20" x2="22" y2="20" />
        <line x1="4" y1="20" x2="4" y2="10" />
        <line x1="20" y1="20" x2="20" y2="10" />
        <line x1="12" y1="20" x2="12" y2="10" />
        <polyline points="2,10 12,4 22,10" />
        <path d="M8 20v-5a4 4 0 018 0v5" />
      </svg>
    ),
    title: 'Das Zeremonialgesetz',
    text: 'Die Opfer und Zeremonien des Alten Testaments wiesen auf den Messias. Ihre Anforderungen endeten am Kreuz.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 11V8a2 2 0 00-4 0v3" />
        <path d="M14 11V6a2 2 0 00-4 0v5" />
        <path d="M10 11V8a2 2 0 00-4 0v6c0 3 2 5 6 6 4-1 6-3 6-6v-3a2 2 0 00-4 0" />
      </svg>
    ),
    title: 'Die Gnade und ihre Mittel',
    text: 'Gott bietet dem sündigen Menschen unverdient Erlösung an — durch das Wort, den Heiligen Geist und den Dienst am Evangelium.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="22" x2="12" y2="11" />
        <path d="M12 11c-3-1-6-4-6-8 3 0 6 3 6 8z" />
        <path d="M12 11c3-1 6-4 6-8-3 0-6 3-6 8z" />
      </svg>
    ),
    title: 'Die Wiedergeburt',
    text: 'Zur Errettung braucht der Mensch die Wiedergeburt. Neues Leben entsteht durch den Glauben an Jesus Christus.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2L8 10h8L12 2z" />
        <path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        <path d="M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      </svg>
    ),
    title: 'Die Taufe',
    text: 'Wiedergeborene werden durch Untertauchen getauft — im Namen des Vaters, des Sohnes und des Heiligen Geistes.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h16" />
        <path d="M4 12c0 4 4 7 8 7s8-3 8-7" />
        <path d="M9 6c0-2 1-3 3-3s3 1 3 3" />
        <line x1="12" y1="3" x2="12" y2="12" />
      </svg>
    ),
    title: 'Die Verordnung der Demut',
    text: 'Die Fußwaschung geht dem Abendmahl voraus — ein Zeichen von Demut, Gleichheit und brüderlicher Liebe in Christus.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 2h12l-2 10H8L6 2z" />
        <line x1="6" y1="7" x2="18" y2="7" />
        <line x1="10" y1="22" x2="14" y2="22" />
        <line x1="12" y1="12" x2="12" y2="22" />
      </svg>
    ),
    title: 'Das heilige Abendmahl',
    text: 'Durch ungesäuertes Brot und unvergorenen Wein gedenkt der Gläubige des Leidens und Todes Jesu Christi.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M5 6l2 7c0 1.7 1.3 3 3 3s3-1.3 3-3L15 6" />
        <path d="M21 6l-2 7c0 1.7-1.3 3-3 3s-3-1.3-3-3l2-7" />
      </svg>
    ),
    title: 'Das Untersuchungsgericht',
    text: 'Die Prophezeiung der 2300 Jahre (Dan. 8,14) endete 1844 — seither läuft das Untersuchungsgericht im Himmel.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11v5h4l8 4V7L8 11H4z" />
        <line x1="16" y1="7" x2="16" y2="17" />
        <path d="M19 9c1 1 1 4 0 6" />
      </svg>
    ),
    title: 'Die gegenwärtige Wahrheit',
    text: 'Die dreifache Engelsbotschaft (Offb. 14) bereitet eine besondere Gruppe von 144 000 auf Christi Wiederkunft vor.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="14" y2="12" />
      </svg>
    ),
    title: 'Die Gabe der Prophezeiung',
    text: 'In den letzten Tagen wurde die Prophetengabe erneuert — nicht als Ersatz der Bibel, sondern als Führung zu ihrer rechten Auslegung.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="12" r="5" />
        <circle cx="16" cy="12" r="5" />
      </svg>
    ),
    title: 'Die Ehe',
    text: 'Die Ehe ist Gottes Entwurf: ein Mann, eine Frau, ein Leben. Eine Gemeinschaft, die Gott selbst eingesetzt und gesegnet hat.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22c0 0-8-4-8-12 5 0 8 3 8 3s3-3 8-3c0 8-8 12-8 12z" />
        <line x1="12" y1="22" x2="12" y2="13" />
      </svg>
    ),
    title: 'Gesundheits- und Kleiderreform',
    text: 'Der Körper ist Tempel des Heiligen Geistes. Natürliche Lebensweise und bescheidene Kleidung sind Ausdruck des Charakters.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9,12 11,14 15,10" />
      </svg>
    ),
    title: 'Haltung zur irdischen Regierung',
    text: 'Der Christ gehorcht gerechten Gesetzen. Wo menschliche Gesetze Gottes Gesetz widersprechen, gehorcht er Gott.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="10" y1="4" x2="14" y2="4" />
        <polyline points="9,22 9,13 15,13 15,22" />
      </svg>
    ),
    title: 'Der Leib Christi, seine Gemeinde',
    text: 'Die Gemeinde Christi ist sichtbar und organisiert. Sie nimmt durch die Taufe auf und kann aus gegebenem Anlass ausschließen.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12V22H4V12" />
        <path d="M22 7H2v5h20V7z" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
      </svg>
    ),
    title: 'Zehnten und Gaben',
    text: 'Zehnten und Gaben zur Unterstützung des Predigtamtes zu geben ist Pflicht und Ausdruck der Dankbarkeit des Christen.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
        <line x1="12" y1="20" x2="12" y2="14" />
        <polyline points="9,17 12,14 15,17" />
      </svg>
    ),
    title: 'Das zweite Kommen Christi',
    text: 'Christus kommt buchstäblich, persönlich, sichtbar und weltweit zurück. Die Gnadenzeit endet kurz zuvor.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <line x1="8" y1="22" x2="8" y2="13" />
        <line x1="16" y1="22" x2="16" y2="13" />
        <line x1="8" y1="16" x2="16" y2="16" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="10" y1="3.5" x2="14" y2="3.5" />
      </svg>
    ),
    title: 'Natur des Menschen und Zustand der Toten',
    text: 'Beim Tod fällt der Mensch in einen Schlaf — bewusstlos. Er bleibt im Grab bis zur Auferstehung bei Christi Wiederkunft.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="5" y1="2" x2="19" y2="2" />
        <line x1="5" y1="22" x2="19" y2="22" />
        <path d="M5 2l7 9 7-9" />
        <path d="M5 22l7-9 7 9" />
      </svg>
    ),
    title: 'Das Millennium',
    text: 'Tausend Jahre nach der Wiederkunft: die Gerechten mit Gott im Himmel, die Erde verlassen und öde.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="10" y1="4" x2="14" y2="4" />
      </svg>
    ),
    title: 'Die neue Erde',
    text: 'Nach dem Feuer der Läuterung macht Gott alles neu. Die neue Erde wird das ewige Heim der Erlösten.',
  },
];

export default function GlaubensGrid() {
  return (
    <section className="glaubens-section">
      <div className="glaubens-header">
        <div className="glaubens-eyebrow">Grundlagen</div>
        <h2 className="glaubens-title">
          Punkte unseres <em>Glaubens</em>
        </h2>
      </div>
      <div className="glaubens-grid">
        {CARDS.map((card, i) => (
          <div key={i} className="uber-uns-card">
            <div className="uber-uns-card-top">
              <div className="uber-uns-card-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="uber-uns-card-icon">{card.icon}</div>
            </div>
            <div className="uber-uns-card-title">{card.title}</div>
            <p className="uber-uns-card-text">{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
