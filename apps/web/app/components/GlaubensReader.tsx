'use client';

import { useEffect, useRef, useState } from 'react';

interface Article {
  id: string;
  num: number;
  title: string;
  body: { text: string; refs?: string }[];
}

const ARTICLES: Article[] = [
  {
    id: 'gott-vater',
    num: 1,
    title: 'Gott, der Vater',
    body: [
      {
        text: 'Es gibt nur einen Gott, den ewigen Vater, den Schöpfer, eine Persönlichkeit, ein geistiges Wesen, unendlich in Liebe und Weisheit, allmächtig, allgegenwärtig, allwissend, unsterblich.',
        refs: '2Mo 20,2 · Jes 45,5–12.18.20–22 · Joh 4,24 · Ps 139,1–12',
      },
    ],
  },
  {
    id: 'jesus-christus',
    num: 2,
    title: 'Jesus Christus, der Sohn',
    body: [
      {
        text: 'Jesus Christus ist der Sohn Gottes, in seiner Natur eins mit dem ewigen Vater. Durch Christus wurde alles geschaffen. Er behielt die göttliche Natur, nahm die menschliche Natur an — ohne Sünde. Er starb für unsere Sünden am Kreuz, stand vom Tode wieder auf und fuhr hinauf zum Vater, um für uns zu vermitteln.',
        refs: 'Hebr 1,1–3.5 · Kol 1,15–17 · Mt 1,18–23 · Joh 1,14 · 1Tim 2,5; 3,16 · Hebr 7,25 · Joh 14,6 · Apg 4,12',
      },
    ],
  },
  {
    id: 'heiliger-geist',
    num: 3,
    title: 'Der Heilige Geist',
    body: [
      {
        text: 'Der Heilige Geist ist Christi Stellvertreter auf Erden und ist eines Sinnes mit dem Vater und dem Sohn. Er ist der Erneuerer im Werk der Erlösung. Diese drei Persönlichkeiten — Vater, Sohn und Heiliger Geist — bilden die Gottheit.',
        refs: 'Joh 3,5–8; 14,16.26; 16,7–13 · 1Kor 2,10–11 · 2Kor 13,14 · Mt 28,19',
      },
    ],
  },
  {
    id: 'heilige-schrift',
    num: 4,
    title: 'Die Heilige Schrift',
    body: [
      {
        text: 'Die Heilige Schrift, bestehend aus dem Alten und Neuen Testament, ist das Wort Gottes. Sie entstand durch göttliche Eingebung, enthält die vollständige Offenbarung des Willens Gottes und ist die einzige unfehlbare Regel des Glaubens und der Praxis.',
        refs: 'Joh 5,39 · 2Pet 1,19–21 · 2Tim 3,15–17 · Lk 11,28; 16,29.31 · Mt 22,29 · Joh 10,35',
      },
    ],
  },
  {
    id: 'zehn-gebote',
    num: 5,
    title: 'Die Zehn Gebote',
    body: [
      {
        text: 'Das Moralgesetz, die Zehn Gebote aus 2. Mose 20,1–17, sind der Ausdruck des Willens Gottes. Es umfasst die Pflichten gegenüber Gott und dem Nächsten, bleibt unveränderlich und für alle Menschen zu allen Zeiten verbindlich und hat Vorrang vor menschlichen Gesetzen.',
        refs: 'Mt 5,17–20; 7,21; 19,17; 22,36–40 · 1Joh 2,3–6; 5,1–3 · Röm 2,13',
      },
      {
        text: 'Das Übertreten eines Gebotes bedeutet Sünde. Die Sünde hat den Tod als Lohn. Erlösung kommt durch Christus, nicht durch Gesetzeserfüllung — sie befähigt jedoch zum Gehorsam und befreit von der Verdammnis.',
        refs: 'Joh 8,11 · Hebr 10,26',
      },
    ],
  },
  {
    id: 'sabbat',
    num: 6,
    title: 'Der Sabbat',
    body: [
      {
        text: 'Das vierte Gebot des Moralgesetzes Gottes fordert die Beobachtung des siebenten Tags — des Sabbat. Er ist ein heiliger Ruhetag, der an die Schöpfung erinnert und Neuschöpfung, Erlösung und Heiligung bedeutet. Er ist ein geistliches Einsetzen, dem Gottesdienst und dem Bibelstudium gewidmet.',
        refs: '1Mo 2,1–3 · 2Mo 20,1–17 · Hes 20,12 · Jes 58,13–14 · Mk 2,28 · Hebr 4,1–10',
      },
      {
        text: 'Die wahre Sabbatbeobachtung erfordert das Aufhören jeder weltlichen Arbeit von Freitagsuntergang bis Samstagabend. Die Vorbereitungen müssen vor Sabbatbeginn abgeschlossen sein.',
        refs: '3Mo 23,32 · 2Mo 16,22–23 · Lk 23,54 · Mk 16,1',
      },
      {
        text: 'Da Christus und die Apostel — sowohl vor als auch nach der Kreuzigung und Auferstehung — den Sabbat gehalten haben, ist und bleibt er der wahre Ruhetag.',
        refs: 'Lk 23,56 · Apg 13,42.44; 16,13; 17,2; 18,4; 22,12; 25,7–8',
      },
    ],
  },
  {
    id: 'sonntagsheiligung',
    num: 7,
    title: 'Die Sonntagsheiligung',
    body: [
      {
        text: 'Der erste Tag der Woche, allgemein Sonntag genannt, war im Altertum der Anbetung der Sonne geweiht. Als das Christentum von den apostolischen Lehren abwich, wich der siebente Tag dem ersten Tag der Woche. Der Sonntag wurde — zusammen mit anderen heidnischen Bräuchen — von der christlichen Kirche übernommen.',
        refs: 'Mt 15,9.13',
      },
      {
        text: 'In der Heiligen Schrift findet sich kein biblisches Fundament für die Sonntagsheiligung.',
      },
    ],
  },
  {
    id: 'zeremonialgesetz',
    num: 8,
    title: 'Das Zeremonialgesetz',
    body: [
      {
        text: 'Das Zeremonialgesetz des Alten Testaments, dem jüdischen Volk eingeschärft, wies auf den Messias. Es kennzeichnete das Werk Christi, und seine Anforderungen endeten am Kreuz. Dieses Zeremonialgesetz — einschließlich der Zeremonial-Sabbate und jüdischen Feste — darf nicht mit dem Moralgesetz und dem Sabbat des vierten Gebotes verwechselt werden.',
        refs: 'Hebr 10,1.9–10 · Kol 2,14.16 · Gal 4,10–11',
      },
    ],
  },
  {
    id: 'gnade',
    num: 9,
    title: 'Die Gnade und ihre Mittel',
    body: [
      {
        text: 'Gnade bedeutet „unverdiente Gunst". Der Mensch muss die Folgen der Sünde — den Tod — tragen. Gott beweist seine Liebe, indem er dem sündigen Menschen unverdient Erlösung vom Tode durch Jesus Christus anbietet. Die Erlösung geschieht, wenn Sünder zu Christus gezogen werden durch: a) das Wort Gottes, b) den Heiligen Geist, c) den Evangeliumsdienst.',
        refs: 'Röm 10,13–18 · Joh 14,26; 16,13 · 2Kor 5,17–20 · Apg 2,38–42',
      },
    ],
  },
  {
    id: 'wiedergeburt',
    num: 10,
    title: 'Die Wiedergeburt',
    body: [
      {
        text: 'Um der Sünde und ihren Folgen zu entfliehen, muss der Mensch die Erfahrung der Wiedergeburt machen — eine Lebensumwandlung. Wenn Menschen Buße tun und dem Geist erlauben, auf ihre Herzen einzuwirken, verlangen sie nach einem gehorsamen Leben nach dem Willen Gottes. Die Schrift nennt diese Erfahrung „Wiedergeburt". Das neue Leben kommt durch den Glauben an Jesus Christus.',
        refs: 'Mt 1,21 · Joh 3,3 · Röm 2,4 · Joh 16,8 · Apg 2,37–38 · 1Joh 2,3.6 · Joh 16,13 · 1Pet 1,22 · Gal 2,20 · Hebr 12,2 · Röm 1,17 · Phil 4,13',
      },
    ],
  },
  {
    id: 'taufe',
    num: 11,
    title: 'Die Taufe',
    body: [
      {
        text: 'Diejenigen, die das zurechnungsfähige Alter erreicht haben und die Wiedergeburt erlebt haben, sollten durch Untertauchen im Namen des Vaters, des Sohnes und des Heiligen Geistes getauft werden. Dies stellt den Tod, das Begräbnis und die Auferstehung Christi dar sowie den Tod des „alten Selbst" und die Auferstehung des „neuen Selbst" zu einem erneuerten Leben in Christus.',
        refs: 'Apg 2,38 · Mk 16,16 · Röm 6,3–9 · Kol 2,12',
      },
    ],
  },
  {
    id: 'verordnung-demut',
    num: 12,
    title: 'Die Verordnung der Demut',
    body: [
      {
        text: 'Die Fußwaschung ist eine Verordnung der Demut, welche dem heiligen Abendmahl vorausgeht. Christus setzte diese Verordnung ein und übergab sie der christlichen Gemeinde, um Demut, Gleichheit, brüderliche Liebe und Einigkeit in Christus zu lehren. Eine Versöhnung unter den Gläubigen soll dieser Praxis vorausgehen.',
        refs: 'Joh 13,1–17 · Mt 5,23–24',
      },
    ],
  },
  {
    id: 'abendmahl',
    num: 13,
    title: 'Das heilige Abendmahl',
    body: [
      {
        text: 'Wenn Gläubige ungesäuertes Brot und unvergorenen Wein nehmen — als Sinnbilder des Leibes und Blutes Christi —, gedenken sie seiner Leiden und seines Todes. Die Bedeutung dieser Verordnung zeigt an, dass nur Mitglieder, die in gutem und regelmäßigem Verhältnis zum Leib Christi stehen, teilnehmen dürfen.',
        refs: 'Mt 26,26–28 · 1Kor 10,16–17; 12,20 · Lk 22,11 · 1Kor 11,23–29',
      },
    ],
  },
  {
    id: 'untersuchungsgericht',
    num: 14,
    title: 'Das Untersuchungsgericht',
    body: [
      {
        text: 'Die Prophezeiung der 2300 Abend und Morgen (Jahre) aus Daniel 8,14 endete im Jahre 1844, als die „Reinigung des Heiligtums" oder das Untersuchungsgericht begann. Dieses Gericht betrifft die Prüfung der himmlischen Aufzeichnungen über alle, die sich zu Gott bekannt haben — durch alle Zeitalter hindurch. Das Ergebnis dieser Untersuchung bestimmt das Schicksal jeder Seele: ewiges Leben oder ewiger Tod.',
        refs: 'Pred 12,14 · Dan 7,9–10 · Lk 20,35 · Offb 14,6–7; 22,12 · Mt 22,11–14',
      },
    ],
  },
  {
    id: 'gegenwart-wahrheit',
    num: 15,
    title: 'Die gegenwärtige Wahrheit',
    body: [
      {
        text: 'Die dreifache Engelsbotschaft aus Offenbarung 14,6–12 und die Botschaft des anderen Engels aus Offenbarung 18,1–4 sind gegenwärtige Wahrheit. Diese Botschaft bereitet eine besondere Gruppe — die 144.000 — auf das zweite Kommen Christi vor.',
        refs: 'Hes 9,1–7 · Offb 7,1–4; 14,1–12; 18,1–4',
      },
    ],
  },
  {
    id: 'gabe-prophezeiung',
    num: 16,
    title: 'Die Gabe der Prophezeiung',
    body: [
      {
        text: 'In diesen letzten Tagen wurde die Gabe der Prophezeiung in Christi Gemeinde wiederhergestellt, wie Gott es in Apostelgeschichte 2,17–21 verheißen hat. Diese Gabe dient nicht als Ersatz für oder Ergänzung zur Bibel, sondern als Führer und Kennzeichen des Überrests Gottes. Die inspirierten Schriften lenken die Aufmerksamkeit auf die biblischen Grundsätze als Fundament unseres Glaubens und Lebens und schützen uns vor falscher Auslegung der Schrift.',
        refs: '4Mo 12,6 · 2Chr 20,20 · Spr 29,18 · Hos 12,13 · Am 3,7 · Eph 4,8–11 · 1Thess 5,20–21',
      },
    ],
  },
  {
    id: 'ehe',
    num: 17,
    title: 'Die Ehe',
    body: [
      {
        text: 'Die Ehe wurde von Gott eingesetzt und von Christus geehrt, um zwei Menschen lebenslang zu binden. Scheidung zur Wiederheirat, leichtfertige standesamtliche Ehe sowie Verbindungen mit Ungläubigen widersprechen den göttlichen Grundsätzen der Ehe.',
        refs: 'Lk 16,18 · Röm 7,1–3 · 1Kor 7,11.39 · 2Kor 6,14',
      },
    ],
  },
  {
    id: 'gesundheit',
    num: 18,
    title: 'Gesundheits- und Kleiderreform',
    body: [
      {
        text: 'Weil eines Christen Körper der Tempel des Heiligen Geistes ist, werden sie ihre Gesundheit schützen wollen. Gläubige schützen ihre Gesundheit, indem sie den Gesetzen der Natur folgen, gesundheitsschädliche Nahrungsmittel meiden, unnatürliche Gewohnheiten ablegen und Mäßigung üben.',
        refs: '1Kor 3,16–17 · Phil 4,5',
      },
      {
        text: 'Die Beschaffenheit der Kleidung zeugt vom Charakter. Bescheidenheit und Selbstrespekt erfordern, dass wir von unanständigen Moden der Welt Abstand halten.',
        refs: '1Pet 3,1–5 · Jes 3,16–24 · 1Kor 11,15 · 1Tim 2,9',
      },
    ],
  },
  {
    id: 'regierung',
    num: 19,
    title: 'Haltung zur irdischen Regierung',
    body: [
      {
        text: 'Christen müssen göttliche und menschliche Autorität respektieren und gewissenhaft alle gerechten irdischen Gesetze befolgen. Wenn jedoch menschliches Gesetz dem Gesetz Gottes widerspricht, muss der Christ persönlich entscheiden: Gott oder Menschen gehorchen? Das christliche Gewissen verbietet die Beteiligung an politischer Tätigkeit.',
        refs: 'Mt 22,21 · Röm 13,3–7 · 1Pet 2,17 · Apg 5,29 · 2Kor 6,14–17 · Jes 8,12',
      },
    ],
  },
  {
    id: 'gemeinde',
    num: 20,
    title: 'Der Leib Christi, seine Gemeinde',
    body: [
      {
        text: 'Die Gemeinde Christi ist ein sichtbarer und organisierter Leib — keine zerstreuten Einzelgänger. Die Gemeinde überträgt Autorität auf gewählte Amtsträger, nicht um über die Gemeinschaft zu herrschen, sondern um ihr zu dienen und den Leib Christi aufzubauen. Sie hat die Vollmacht, Mitglieder durch Taufe und Bekenntnis aufzunehmen und andere bei Bedarf auszuschließen.',
        refs: 'Joh 10,16; 11,52 · 1Kor 10,17; 12,12–27 · Eph 4,11–16 · Offb 1,20 · Mt 16,19; 18,15–18 · 1Kor 5,11.13',
      },
    ],
  },
  {
    id: 'zehnten',
    num: 21,
    title: 'Zehnten und Gaben',
    body: [
      {
        text: 'Zehnten und Gaben zur Unterstützung des Predigtamtes und zur Verkündigung des Evangeliums zu geben ist die Pflicht des Christen.',
        refs: 'Mal 3,7–10 · Mt 23,23 · 1Kor 9,14 · 2Kor 9,6–7 · Hebr 7,8',
      },
    ],
  },
  {
    id: 'wiederkunft',
    num: 22,
    title: 'Das zweite Kommen Christi',
    body: [
      {
        text: 'Die menschliche Gnadenzeit endet kurz vor dem zweiten Kommen Christi, welches buchstäblich, persönlich, sichtbar, hörbar und weltweit sein wird.',
        refs: 'Lk 13,23–25; 17,29–30 · Jes 11,4; 66,15 · 2Thess 1,6–10 · Mt 24,27.31 · Joh 14,1–3 · Apg 1,9–11 · 1Thess 4,15–17 · Offb 1,7',
      },
    ],
  },
  {
    id: 'zustand-toten',
    num: 23,
    title: 'Natur des Menschen und Zustand der Toten',
    body: [
      {
        text: 'Der Mensch wurde von Gottes Hand als eine lebendige Seele erschaffen. Durch Ungehorsam wurde er von der Quelle des Lebens getrennt. Daher ist er von Natur aus sterblich, kann aber durch die Verheißung Christi bei seiner Wiederkunft tatsächlich Unsterblichkeit erlangen.',
        refs: '1Mo 2,7; 3,22–24 · Hiob 4,17 · 1Joh 2,25 · Joh 11,25–26 · Röm 2,7 · 2Tim 1,10 · 1Kor 15,53–54',
      },
      {
        text: 'Beim Tod fallen Gerechte wie Gottlose in einen Schlaf — einen Zustand der Bewusstlosigkeit, Stille und Untätigkeit. Die Toten verbleiben im Grab bis zur gerechten oder ungerechten Auferstehung. Die Gottlosen befinden sich nicht an einem Ort der Qual, sondern werden bis zum Gerichtstag aufbewahrt. Die Gerechten sind nicht im Himmel, sondern erwarten die Auferstehung aus dem Grab bei Christi Wiederkunft.',
        refs: 'Pred 9,5–6.10 · Ps 6,5; 89,48; 146,4 · Offb 20,13 · 2Pet 2,9 · Joh 5,28–29 · Dan 12,13 · Apg 2,29.34 · 2Tim 4,7–8',
      },
    ],
  },
  {
    id: 'millennium',
    num: 24,
    title: 'Das Millennium',
    body: [
      {
        text: 'Nach dem zweiten Kommen Christi folgt eine Periode von tausend Jahren — allgemein das Millennium genannt. Während dieser Zeit sind die Gerechten mit Gott im Himmel, während die Gottlosen im Staub der verwüsteten Erde verbleiben. Während die Erde wüst liegt, richten die Gerechten die Gottlosen. Am Ende des Millenniums werden die Gottlosen auferstehen, um vom Feuer verzehrt zu werden.',
        refs: 'Joh 14,3 · Offb 7,9; 14,1; 20,4–5 · Jes 24,1–6 · Jer 4,23–27 · 1Kor 6,2–3 · Joh 5,29 · Mal 4,1.3 · Mt 10,28 · 2Pet 3,7–10 · Ps 37,10',
      },
    ],
  },
  {
    id: 'neue-erde',
    num: 25,
    title: 'Die neue Erde',
    body: [
      {
        text: 'Nachdem die Erde durch das Feuer von Sünde gereinigt ist, wird Gott „alle Dinge neu machen" und die Schönheit Edens auf Erden wiederherstellen. Diese neue Erde wird das ewige Heim der Erlösten, mit Gott als dem obersten Herrscher durch die endlose Zeit der Ewigkeit.',
        refs: '2Pet 3,13 · Offb 21,1–7 · Mt 5,5 · 1Kor 2,9',
      },
    ],
  },
];

export default function GlaubensReader() {
  const [activeId, setActiveId] = useState<string>(ARTICLES[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());

  // IntersectionObserver — update active TOC item as user scrolls
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { root: content, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    articleRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Sync active TOC item into view in sidebar — scroll only within .grd-toc, never the page
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.grd-toc-item[data-id="${activeId}"]`);
    if (!el) return;
    const toc = el.closest<HTMLElement>('.grd-toc');
    if (!toc) return;
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const { scrollTop, clientHeight } = toc;
    if (elTop < scrollTop || elBottom > scrollTop + clientHeight) {
      toc.scrollTo({ top: Math.max(0, elTop - clientHeight / 3), behavior: 'smooth' });
    }
  }, [activeId]);

  function scrollTo(id: string) {
    const el = articleRefs.current.get(id);
    if (!el || !contentRef.current) return;
    contentRef.current.scrollTo({ top: el.offsetTop - 32, behavior: 'smooth' });
    setActiveId(id);
  }

  return (
    <div className="grd">
      {/* Toolbar — top bar with toggle + title */}
      <div className="grd-toolbar">
        <button
          className="grd-toolbar__toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Inhaltsverzeichnis umschalten"
        >
          <svg viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="2" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="grd-toolbar__title">25 Punkte unseres Glaubens</span>
      </div>

      {/* Body: sidebar + content side by side */}
      <div className="grd-layout">
        {/* Left sidebar */}
        <aside className={`grd-sidebar${sidebarOpen ? '' : ' grd-sidebar--collapsed'}`}>
          <div className="grd-sidebar__inner">
            <div className="grd-sidebar__header">
              <div className="grd-sidebar__eyebrow">25 Punkte</div>
              <div className="grd-sidebar__title">Grundlagen unseres Glaubens</div>
            </div>
            <div className="grd-sidebar__toc-label">Inhalt</div>
            <nav className="grd-toc" aria-label="Inhaltsverzeichnis">
              {ARTICLES.map((a) => (
                <button
                  key={a.id}
                  className={`grd-toc-item${activeId === a.id ? ' grd-toc-item--active' : ''}`}
                  data-id={a.id}
                  onClick={() => scrollTo(a.id)}
                >
                  <span className="grd-toc-item__num">{String(a.num).padStart(2, '0')}</span>
                  <span className="grd-toc-item__title">{a.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="grd-content" ref={contentRef}>
          {ARTICLES.map((a) => (
            <article
              key={a.id}
              id={a.id}
              className="grd-article"
              ref={(el) => {
                if (el) articleRefs.current.set(a.id, el);
                else articleRefs.current.delete(a.id);
              }}
            >
              <div className="grd-article__num">{String(a.num).padStart(2, '0')}</div>
              <h2 className="grd-article__title">{a.title}</h2>
              {a.body.map((block, i) => (
                <div key={i} className="grd-article__block">
                  <p className="grd-article__text">{block.text}</p>
                  {block.refs && <p className="grd-article__refs">{block.refs}</p>}
                </div>
              ))}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
