'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

interface DetailBlock {
  text: string;
  refs?: string;
}

interface Article {
  num: string;
  title: string;
  titleEl: ReactNode;
  body: string;
  refs: string;
  detail?: DetailBlock[];
}

const ARTICLES: Article[] = [
  {
    num: '01',
    title: 'Gott, der Vater',
    titleEl: (
      <>
        Gott, der <em>Vater</em>
      </>
    ),
    body: 'Es gibt nur einen Gott, den ewigen Vater, den Schöpfer, eine Persönlichkeit, ein geistiges Wesen, unendlich in Liebe und Weisheit, allmächtig, allgegenwärtig, allwissend, unsterblich.',
    refs: '2Mo 20,2 · Jes 45,5–12 · Joh 4,24 · Ps 139,1–12',
    detail: [
      {
        text: 'Die Bibel offenbart einen Gott aus drei göttlichen Persönlichkeiten: Vater, Sohn und Heiliger Geist — in Einheit handelnd. Gott ist ewig, unsterblich, unsichtbar, allgegenwärtig, allwissend, allmächtig, unveränderlich, heilig, gerecht, barmherzig und Liebe.',
        refs: '5Mo 6,4 · 1Kor 8,4 · 1Mo 1,26 · 2Kor 13,13 · Eph 2,18 · Ps 90,2 · 1Tim 1,17 · Ps 139,7–12 · Joh 3,16 · 1Joh 4,8',
      },
      {
        text: 'Der Vater ist die erste Person der Gottheit. Durch Christus und den Heiligen Geist ist er Schöpfer und Erhalter aller Dinge. Er ist Vater für alle, die Christus als persönlichen Erlöser annehmen und seinen Geboten gehorchen. Das auffallendste Merkmal des Vaters — und das Herzstück des Erlösungsplans — ist seine Liebe.',
        refs: 'Mt 3,17; 11,25 · Joh 15,1 · Hebr 1,1–3 · Kol 1,14–16 · Mt 5,48 · Joh 1,12–13 · Röm 8,15–17 · Joh 3,16 · 1Joh 4,8–13',
      },
    ],
  },
  {
    num: '02',
    title: 'Jesus Christus, der Sohn',
    titleEl: (
      <>
        Jesus Christus, der <em>Sohn</em>
      </>
    ),
    body: 'Jesus Christus ist der Sohn Gottes, in seiner Natur eins mit dem ewigen Vater. Durch Christus wurde alles geschaffen. Er starb für unsere Sünden am Kreuz, stand vom Tode wieder auf und fuhr hinauf zum Vater, um für uns zu vermitteln.',
    refs: 'Hebr 1,1–3 · Kol 1,15–17 · Joh 1,14 · 1Tim 2,5 · Hebr 7,25',
    detail: [
      {
        text: 'Jesus Christus ist der Sohn Gottes, in seiner Natur eins mit dem ewigen Vater. Durch Christus wurde alles geschaffen. Er behielt die göttliche Natur, nahm die menschliche Natur an — ohne Sünde. Er starb für unsere Sünden am Kreuz, stand vom Tode wieder auf und fuhr hinauf zum Vater, um für uns zu vermitteln.',
        refs: 'Hebr 1,1–3.5 · Kol 1,15–17 · Mt 1,18–23 · Joh 1,14 · 1Tim 2,5; 3,16 · Hebr 7,25 · Joh 14,6 · Apg 4,12',
      },
    ],
  },
  {
    num: '03',
    title: 'Der Heilige Geist',
    titleEl: (
      <>
        Der Heilige <em>Geist</em>
      </>
    ),
    body: 'Der Heilige Geist ist Christi Stellvertreter auf Erden und ist eines Sinnes mit dem Vater und dem Sohn. Er ist der Erneuerer im Werk der Erlösung. Diese drei Persönlichkeiten — Vater, Sohn und Heiliger Geist — bilden die Gottheit.',
    refs: 'Joh 3,5–8 · Joh 14,16.26 · 2Kor 13,14 · Mt 28,19',
    detail: [
      {
        text: 'Der Heilige Geist, Stellvertreter Christi und des Vaters, ist die dritte Person der Gottheit. Er ist, neben Christus, die größte aller Gaben Gottes für den Menschen. Das erste Werk des Heiligen Geistes ist es, uns unserer Sünden zu überführen und uns zu Christus zu führen.',
        refs: 'Joh 14,16–18; 16,8 · Mt 28,19–20 · 1Joh 3,24; 4,12–13 · Eph 3,16–17 · Röm 8,9–11',
      },
      {
        text: 'Durch den Heiligen Geist ist Christus allen Menschen erreichbar. Unsere Einheit mit Christus durch den Heiligen Geist ist das Pfand für unsere Auferstehung. Bevor jemand die Gaben des Geistes empfängt, muss er zuerst die Frucht des Heiligen Geistes in seinem Leben offenbaren.',
        refs: 'Röm 8,9–11 · Joh 11,25–26 · 1Joh 4,13 · Eph 1,13–14 · Gal 5,22–25 · 1Kor 12,7–11',
      },
    ],
  },
  {
    num: '04',
    title: 'Die Heilige Schrift',
    titleEl: (
      <>
        Die Heilige <em>Schrift</em>
      </>
    ),
    body: 'Die Heilige Schrift, bestehend aus dem Alten und Neuen Testament, ist das Wort Gottes. Sie entstand durch göttliche Eingebung, enthält die vollständige Offenbarung des Willens Gottes und ist die einzige unfehlbare Regel des Glaubens und der Praxis.',
    refs: 'Joh 5,39 · 2Pet 1,19–21 · 2Tim 3,15–17 · Mt 22,29',
    detail: [
      {
        text: 'Die Heilige Schrift, Gottes Schreiben der Liebe, erklärt den Ursprung, den Fall und die Erlösung der Menschheit. Sie beinhaltet die völlig ausreichende Offenbarung des Willens Gottes — unser einziger unfehlbarer Maßstab des Glaubens und der Taten. Daher muss unser Stand vor Gott und unsere Beziehung zueinander auf einem „So spricht der Herr" gegründet sein.',
        refs: 'Joh 5,39 · Ps 89,35 · Mt 22,29 · Lk 24,44–45 · Ps 119,104–105 · Jes 8,20 · 2Tim 3,15–17 · Joh 8,32; 17,17',
      },
      {
        text: 'Durch die Hilfe des Heiligen Geistes erklärt sich die Bibel selbst und braucht keine menschliche Überlieferung, um sie auszulegen. Wenn wir im Einklang mit der Heiligen Schrift leben, gehören uns die Verheißungen und Segnungen des Herrn.',
        refs: 'Jes 28,10; 34,16 · 2Pet 1,19–21 · Joh 16,13 · Lk 11,28 · Mt 4,4; 7,24–25 · Joh 6,63',
      },
    ],
  },
  {
    num: '05',
    title: 'Die Zehn Gebote',
    titleEl: (
      <>
        Die Zehn <em>Gebote</em>
      </>
    ),
    body: 'Das Moralgesetz, die Zehn Gebote aus 2. Mose 20, sind der Ausdruck des Willens Gottes. Es umfasst die Pflichten gegenüber Gott und dem Nächsten, bleibt unveränderlich und für alle Menschen zu allen Zeiten verbindlich.',
    refs: 'Mt 5,17–20 · 1Joh 2,3–6 · Röm 2,13',
    detail: [
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
    num: '06',
    title: 'Der Sabbat',
    titleEl: (
      <>
        Der <em>Sabbat</em>
      </>
    ),
    body: 'Das vierte Gebot fordert die Beobachtung des siebenten Tags — des Sabbat. Er ist ein heiliger Ruhetag, der an die Schöpfung erinnert und Neuschöpfung, Erlösung und Heiligung bedeutet.',
    refs: '1Mo 2,1–3 · 2Mo 20,8–11 · Hes 20,12 · Mk 2,28',
    detail: [
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
    num: '07',
    title: 'Die Sonntagsheiligung',
    titleEl: (
      <>
        Die <em>Sonntagsheiligung</em>
      </>
    ),
    body: 'Der erste Tag der Woche, allgemein Sonntag genannt, war im Altertum der Anbetung der Sonne geweiht. In der Heiligen Schrift findet sich kein biblisches Fundament für die Sonntagsheiligung.',
    refs: 'Mt 15,9.13',
    detail: [
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
    num: '08',
    title: 'Das Zeremonialgesetz',
    titleEl: (
      <>
        Das <em>Zeremonialgesetz</em>
      </>
    ),
    body: 'Das Zeremonialgesetz des Alten Testaments wies auf den Messias. Es kennzeichnete das Werk Christi, und seine Anforderungen endeten am Kreuz.',
    refs: 'Hebr 10,1.9–10 · Kol 2,14.16 · Gal 4,10–11',
    detail: [
      {
        text: 'Das Zeremonialgesetz des Alten Testaments, dem jüdischen Volk eingeschärft, wies auf den Messias. Es kennzeichnete das Werk Christi, und seine Anforderungen endeten am Kreuz. Dieses Zeremonialgesetz — einschließlich der Zeremonial-Sabbate und jüdischen Feste — darf nicht mit dem Moralgesetz und dem Sabbat des vierten Gebotes verwechselt werden.',
        refs: 'Hebr 10,1.9–10 · Kol 2,14.16 · Gal 4,10–11',
      },
    ],
  },
  {
    num: '09',
    title: 'Die Gnade und ihre Mittel',
    titleEl: (
      <>
        Die <em>Gnade</em> und ihre Mittel
      </>
    ),
    body: 'Gnade bedeutet „unverdiente Gunst". Gott beweist seine Liebe, indem er dem sündigen Menschen unverdient Erlösung vom Tode durch Jesus Christus anbietet.',
    refs: 'Röm 10,13–18 · Joh 14,26 · 2Kor 5,17–20 · Apg 2,38–42',
    detail: [
      {
        text: 'Gnade bedeutet „unverdiente Gunst". Der Mensch muss die Folgen der Sünde — den Tod — tragen. Gott beweist seine Liebe, indem er dem sündigen Menschen unverdient Erlösung vom Tode durch Jesus Christus anbietet. Die Erlösung geschieht, wenn Sünder zu Christus gezogen werden durch: a) das Wort Gottes, b) den Heiligen Geist, c) den Evangeliumsdienst.',
        refs: 'Röm 10,13–18 · Joh 14,26; 16,13 · 2Kor 5,17–20 · Apg 2,38–42',
      },
    ],
  },
  {
    num: '10',
    title: 'Die Wiedergeburt',
    titleEl: (
      <>
        Die <em>Wiedergeburt</em>
      </>
    ),
    body: 'Um der Sünde und ihren Folgen zu entfliehen, muss der Mensch die Erfahrung der Wiedergeburt machen — eine Lebensumwandlung. Das neue Leben kommt durch den Glauben an Jesus Christus.',
    refs: 'Mt 1,21 · Joh 3,3 · Röm 2,4 · 1Pet 1,22 · Gal 2,20',
    detail: [
      {
        text: 'Um der Sünde und ihren Folgen zu entfliehen, muss der Mensch die Erfahrung der Wiedergeburt machen — eine Lebensumwandlung. Wenn Menschen Buße tun und dem Geist erlauben, auf ihre Herzen einzuwirken, verlangen sie nach einem gehorsamen Leben nach dem Willen Gottes. Die Schrift nennt diese Erfahrung „Wiedergeburt". Das neue Leben kommt durch den Glauben an Jesus Christus.',
        refs: 'Mt 1,21 · Joh 3,3 · Röm 2,4 · Joh 16,8 · Apg 2,37–38 · 1Joh 2,3.6 · Joh 16,13 · 1Pet 1,22 · Gal 2,20 · Hebr 12,2 · Röm 1,17 · Phil 4,13',
      },
    ],
  },
  {
    num: '11',
    title: 'Die Taufe',
    titleEl: (
      <>
        Die <em>Taufe</em>
      </>
    ),
    body: 'Diejenigen, die das zurechnungsfähige Alter erreicht haben und die Wiedergeburt erlebt haben, sollten durch Untertauchen im Namen des Vaters, des Sohnes und des Heiligen Geistes getauft werden.',
    refs: 'Apg 2,38 · Mk 16,16 · Röm 6,3–9 · Kol 2,12',
    detail: [
      {
        text: 'Diejenigen, die das zurechnungsfähige Alter erreicht haben und die Wiedergeburt erlebt haben, sollten durch Untertauchen im Namen des Vaters, des Sohnes und des Heiligen Geistes getauft werden. Dies stellt den Tod, das Begräbnis und die Auferstehung Christi dar sowie den Tod des „alten Selbst" und die Auferstehung des „neuen Selbst" zu einem erneuerten Leben in Christus.',
        refs: 'Apg 2,38 · Mk 16,16 · Röm 6,3–9 · Kol 2,12',
      },
    ],
  },
  {
    num: '12',
    title: 'Die Verordnung der Demut',
    titleEl: (
      <>
        Die Verordnung der <em>Demut</em>
      </>
    ),
    body: 'Die Fußwaschung ist eine Verordnung der Demut, welche dem heiligen Abendmahl vorausgeht. Christus setzte diese Verordnung ein, um Demut, Gleichheit, brüderliche Liebe und Einigkeit in Christus zu lehren.',
    refs: 'Joh 13,1–17 · Mt 5,23–24',
    detail: [
      {
        text: 'Die Fußwaschung ist eine Verordnung der Demut, welche dem heiligen Abendmahl vorausgeht. Christus setzte diese Verordnung ein und übergab sie der christlichen Gemeinde, um Demut, Gleichheit, brüderliche Liebe und Einigkeit in Christus zu lehren. Eine Versöhnung unter den Gläubigen soll dieser Praxis vorausgehen.',
        refs: 'Joh 13,1–17 · Mt 5,23–24',
      },
    ],
  },
  {
    num: '13',
    title: 'Das heilige Abendmahl',
    titleEl: (
      <>
        Das heilige <em>Abendmahl</em>
      </>
    ),
    body: 'Wenn Gläubige ungesäuertes Brot und unvergorenen Wein nehmen — als Sinnbilder des Leibes und Blutes Christi —, gedenken sie seiner Leiden und seines Todes.',
    refs: 'Mt 26,26–28 · 1Kor 10,16–17 · 1Kor 11,23–29',
    detail: [
      {
        text: 'Wenn Gläubige ungesäuertes Brot und unvergorenen Wein nehmen — als Sinnbilder des Leibes und Blutes Christi —, gedenken sie seiner Leiden und seines Todes. Die Bedeutung dieser Verordnung zeigt an, dass nur Mitglieder, die in gutem und regelmäßigem Verhältnis zum Leib Christi stehen, teilnehmen dürfen.',
        refs: 'Mt 26,26–28 · 1Kor 10,16–17; 12,20 · Lk 22,11 · 1Kor 11,23–29',
      },
    ],
  },
  {
    num: '14',
    title: 'Das Untersuchungsgericht',
    titleEl: (
      <>
        Das <em>Untersuchungsgericht</em>
      </>
    ),
    body: 'Die Prophezeiung der 2300 Abend und Morgen aus Daniel 8,14 endete im Jahre 1844, als das Untersuchungsgericht begann. Es betrifft die Prüfung der himmlischen Aufzeichnungen über alle, die sich zu Gott bekannt haben.',
    refs: 'Pred 12,14 · Dan 7,9–10 · Offb 14,6–7 · Mt 22,11–14',
    detail: [
      {
        text: 'Die Prophezeiung der 2300 Abend und Morgen (Jahre) aus Daniel 8,14 endete im Jahre 1844, als die „Reinigung des Heiligtums" oder das Untersuchungsgericht begann. Dieses Gericht betrifft die Prüfung der himmlischen Aufzeichnungen über alle, die sich zu Gott bekannt haben — durch alle Zeitalter hindurch. Das Ergebnis dieser Untersuchung bestimmt das Schicksal jeder Seele: ewiges Leben oder ewiger Tod.',
        refs: 'Pred 12,14 · Dan 7,9–10 · Lk 20,35 · Offb 14,6–7; 22,12 · Mt 22,11–14',
      },
    ],
  },
  {
    num: '15',
    title: 'Die gegenwärtige Wahrheit',
    titleEl: (
      <>
        Die gegenwärtige <em>Wahrheit</em>
      </>
    ),
    body: 'Die dreifache Engelsbotschaft aus Offenbarung 14,6–12 ist gegenwärtige Wahrheit. Diese Botschaft bereitet eine besondere Gruppe — die 144.000 — auf das zweite Kommen Christi vor.',
    refs: 'Offb 7,1–4 · Offb 14,1–12 · Offb 18,1–4',
    detail: [
      {
        text: 'Die dreifache Engelsbotschaft aus Offenbarung 14,6–12 und die Botschaft des anderen Engels aus Offenbarung 18,1–4 sind gegenwärtige Wahrheit. Diese Botschaft bereitet eine besondere Gruppe — die 144.000 — auf das zweite Kommen Christi vor.',
        refs: 'Hes 9,1–7 · Offb 7,1–4; 14,1–12; 18,1–4',
      },
    ],
  },
  {
    num: '16',
    title: 'Die Gabe der Prophezeiung',
    titleEl: (
      <>
        Die Gabe der <em>Prophezeiung</em>
      </>
    ),
    body: 'In diesen letzten Tagen wurde die Gabe der Prophezeiung in Christi Gemeinde wiederhergestellt. Diese Gabe dient nicht als Ersatz für die Bibel, sondern als Führer des Überrests Gottes.',
    refs: '4Mo 12,6 · Am 3,7 · Eph 4,8–11 · 1Thess 5,20–21',
    detail: [
      {
        text: 'In diesen letzten Tagen wurde die Gabe der Prophezeiung in Christi Gemeinde wiederhergestellt, wie Gott es in Apostelgeschichte 2,17–21 verheißen hat. Diese Gabe dient nicht als Ersatz für oder Ergänzung zur Bibel, sondern als Führer und Kennzeichen des Überrests Gottes. Die inspirierten Schriften lenken die Aufmerksamkeit auf die biblischen Grundsätze als Fundament unseres Glaubens und Lebens und schützen uns vor falscher Auslegung der Schrift.',
        refs: '4Mo 12,6 · 2Chr 20,20 · Spr 29,18 · Hos 12,13 · Am 3,7 · Eph 4,8–11 · 1Thess 5,20–21',
      },
    ],
  },
  {
    num: '17',
    title: 'Die Ehe',
    titleEl: (
      <>
        Die <em>Ehe</em>
      </>
    ),
    body: 'Die Ehe wurde von Gott eingesetzt und von Christus geehrt, um zwei Menschen lebenslang zu binden. Scheidung zur Wiederheirat sowie Verbindungen mit Ungläubigen widersprechen den göttlichen Grundsätzen der Ehe.',
    refs: 'Lk 16,18 · Röm 7,1–3 · 1Kor 7,11.39 · 2Kor 6,14',
    detail: [
      {
        text: 'Die Ehe wurde von Gott eingesetzt und von Christus geehrt, um zwei Menschen lebenslang zu binden. Scheidung zur Wiederheirat, leichtfertige standesamtliche Ehe sowie Verbindungen mit Ungläubigen widersprechen den göttlichen Grundsätzen der Ehe.',
        refs: 'Lk 16,18 · Röm 7,1–3 · 1Kor 7,11.39 · 2Kor 6,14',
      },
    ],
  },
  {
    num: '18',
    title: 'Gesundheits- und Kleiderreform',
    titleEl: (
      <>
        <em>Gesundheits-</em> und Kleiderreform
      </>
    ),
    body: 'Weil eines Christen Körper der Tempel des Heiligen Geistes ist, schützen Gläubige ihre Gesundheit durch Befolgen der Naturgesetze, Meiden schädlicher Nahrung und Üben der Mäßigung.',
    refs: '1Kor 3,16–17 · Phil 4,5',
    detail: [
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
    num: '19',
    title: 'Haltung zur irdischen Regierung',
    titleEl: (
      <>
        Haltung zur <em>irdischen</em> Regierung
      </>
    ),
    body: 'Christen müssen göttliche und menschliche Autorität respektieren und alle gerechten irdischen Gesetze befolgen. Wenn jedoch menschliches Gesetz dem Gesetz Gottes widerspricht, muss der Christ entscheiden: Gott oder Menschen gehorchen.',
    refs: 'Mt 22,21 · Röm 13,3–7 · 1Pet 2,17 · Apg 5,29',
    detail: [
      {
        text: 'Christen müssen göttliche und menschliche Autorität respektieren und gewissenhaft alle gerechten irdischen Gesetze befolgen. Wenn jedoch menschliches Gesetz dem Gesetz Gottes widerspricht, muss der Christ persönlich entscheiden: Gott oder Menschen gehorchen? Das christliche Gewissen verbietet die Beteiligung an politischer Tätigkeit.',
        refs: 'Mt 22,21 · Röm 13,3–7 · 1Pet 2,17 · Apg 5,29 · 2Kor 6,14–17 · Jes 8,12',
      },
    ],
  },
  {
    num: '20',
    title: 'Der Leib Christi, seine Gemeinde',
    titleEl: (
      <>
        Der Leib Christi, seine <em>Gemeinde</em>
      </>
    ),
    body: 'Die Gemeinde Christi ist ein sichtbarer und organisierter Leib. Die Gemeinde überträgt Autorität auf gewählte Amtsträger, nicht um zu herrschen, sondern um zu dienen und den Leib Christi aufzubauen.',
    refs: 'Joh 10,16 · 1Kor 12,12–27 · Eph 4,11–16 · Mt 18,15–18',
    detail: [
      {
        text: 'Die Gemeinde Christi ist ein sichtbarer und organisierter Leib — keine zerstreuten Einzelgänger. Die Gemeinde überträgt Autorität auf gewählte Amtsträger, nicht um über die Gemeinschaft zu herrschen, sondern um ihr zu dienen und den Leib Christi aufzubauen. Sie hat die Vollmacht, Mitglieder durch Taufe und Bekenntnis aufzunehmen und andere bei Bedarf auszuschließen.',
        refs: 'Joh 10,16; 11,52 · 1Kor 10,17; 12,12–27 · Eph 4,11–16 · Offb 1,20 · Mt 16,19; 18,15–18 · 1Kor 5,11.13',
      },
    ],
  },
  {
    num: '21',
    title: 'Zehnten und Gaben',
    titleEl: (
      <>
        <em>Zehnten</em> und Gaben
      </>
    ),
    body: 'Zehnten und Gaben zur Unterstützung des Predigtamtes und zur Verkündigung des Evangeliums zu geben ist die Pflicht des Christen.',
    refs: 'Mal 3,7–10 · Mt 23,23 · 1Kor 9,14 · 2Kor 9,6–7',
    detail: [
      {
        text: 'Alles gehört Gott. Wir sind Verwalter, die Rechenschaft ablegen über unsere Güter, Fähigkeiten, Zeit und Ressourcen. Die Pflicht, den Zehnten zurückzugeben — ein Zehntel aller Einnahmen — ist die Anerkennung seiner Eigentümerschaft. Das Zurückhalten des Zehnten übertritt das achte Gebot.',
        refs: 'Ps 24,1 · 1Chr 29,11–12 · 1Kor 4,1–2 · Mt 25,14–30 · 3Mo 27,30–33 · Mt 23,23 · 1Kor 9,14 · Mal 3,8–9',
      },
      {
        text: 'Über den Zehnten hinaus sind die übrigen neun Zehntel für freiwillige Unterstützung des Werkes Gottes bestimmt, gemäß unserer Liebe zu ihm. Großzügigkeit spiegelt unsere Liebe zu Gott wider und schafft geistliches Leben in der Gemeinschaft.',
        refs: 'Mal 3,10–11 · 2Mo 25,2 · 5Mo 16,16–17 · Spr 3,9–10; 11,24–25 · 2Kor 9,6–7',
      },
    ],
  },
  {
    num: '22',
    title: 'Das zweite Kommen Christi',
    titleEl: (
      <>
        Das <em>zweite</em> Kommen Christi
      </>
    ),
    body: 'Die menschliche Gnadenzeit endet kurz vor dem zweiten Kommen Christi, welches buchstäblich, persönlich, sichtbar, hörbar und weltweit sein wird.',
    refs: 'Lk 17,29–30 · 2Thess 1,6–10 · Mt 24,27.31 · Joh 14,1–3 · Apg 1,9–11',
    detail: [
      {
        text: 'Die menschliche Gnadenzeit endet kurz vor dem zweiten Kommen Christi, welches buchstäblich, persönlich, sichtbar, hörbar und weltweit sein wird.',
        refs: 'Lk 13,23–25; 17,29–30 · Jes 11,4; 66,15 · 2Thess 1,6–10 · Mt 24,27.31 · Joh 14,1–3 · Apg 1,9–11 · 1Thess 4,15–17 · Offb 1,7',
      },
    ],
  },
  {
    num: '23',
    title: 'Natur des Menschen und Zustand der Toten',
    titleEl: (
      <>
        Natur des Menschen und Zustand der <em>Toten</em>
      </>
    ),
    body: 'Der Mensch ist von Natur aus sterblich, kann aber durch die Verheißung Christi bei seiner Wiederkunft Unsterblichkeit erlangen. Beim Tod fallen Gerechte wie Gottlose in einen Schlaf — einen Zustand der Bewusstlosigkeit, bis zur Auferstehung.',
    refs: '1Mo 2,7 · Hiob 4,17 · Pred 9,5–6 · Joh 5,28–29 · 1Kor 15,53–54',
    detail: [
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
    num: '24',
    title: 'Das Millennium',
    titleEl: (
      <>
        Das <em>Millennium</em>
      </>
    ),
    body: 'Nach dem zweiten Kommen Christi folgt eine Periode von tausend Jahren. Während dieser Zeit sind die Gerechten mit Gott im Himmel, während die Gottlosen im Staub der verwüsteten Erde verbleiben.',
    refs: 'Offb 20,4–5 · Jes 24,1–6 · 1Kor 6,2–3 · Mal 4,1.3',
    detail: [
      {
        text: 'Nach dem zweiten Kommen Christi folgt eine Periode von tausend Jahren — allgemein das Millennium genannt. Während dieser Zeit sind die Gerechten mit Gott im Himmel, während die Gottlosen im Staub der verwüsteten Erde verbleiben. Während die Erde wüst liegt, richten die Gerechten die Gottlosen. Am Ende des Millenniums werden die Gottlosen auferstehen, um vom Feuer verzehrt zu werden.',
        refs: 'Joh 14,3 · Offb 7,9; 14,1; 20,4–5 · Jes 24,1–6 · Jer 4,23–27 · 1Kor 6,2–3 · Joh 5,29 · Mal 4,1.3 · Mt 10,28 · 2Pet 3,7–10 · Ps 37,10',
      },
    ],
  },
  {
    num: '25',
    title: 'Die neue Erde',
    titleEl: (
      <>
        Die <em>neue</em> Erde
      </>
    ),
    body: 'Nachdem die Erde durch das Feuer von Sünde gereinigt ist, wird Gott alle Dinge neu machen und die Schönheit Edens auf Erden wiederherstellen. Diese neue Erde wird das ewige Heim der Erlösten, mit Gott als dem obersten Herrscher.',
    refs: '2Pet 3,13 · Offb 21,1–7 · Mt 5,5 · 1Kor 2,9',
    detail: [
      {
        text: 'Nachdem die Erde am Ende des Millenniums durch Feuer gereinigt ist, wird die Verheißung einer neuen Erde erfüllt. Die Erde wird erlöst und in ihren ursprünglichen paradiesischen Zustand wiederhergestellt. Alle Dinge werden neu gemacht. Die Verheißung an Abraham umfasst die ganze Erde, nicht nur Kanaan.',
        refs: '2Pet 3,13 · Offb 21,1–7; 22,1–5 · Jes 65,17–25; 11,1–11 · 1Mo 12,7; 17,7–8 · Hebr 11,9–10.13–16 · Mt 5,5 · Ps 37,11.29',
      },
      {
        text: 'Auf der neuen Erde wird es kein Leid mehr geben, denn das Erste ist vergangen. Sünde und ihr Urheber werden nicht mehr existieren. Gottes Volk wird freie Gemeinschaft mit dem Vater und dem Sohn genießen — und jeden Sabbat werden alle vor Gott zusammenkommen.',
        refs: 'Offb 21,4; 22,3–5 · Jes 66,22–23 · Dan 7,27 · 1Kor 2,9',
      },
    ],
  },
];

export default function GlaubensLongRead() {
  const [activeNum, setActiveNum] = useState('01');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const detailInnerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveNum(entry.target.getAttribute('data-num') ?? '01');
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    articleRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function scrollTo(num: string) {
    const el = articleRefs.current.get(num);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function toggle(num: string) {
    // Accordion: only one item open at a time.
    // When opening a new item, close any previously open one.
    // If the closing item is above the viewport, compensate scroll so the
    // current view doesn't jump.
    setExpanded((prev) => {
      const alreadyOpen = prev.has(num);

      if (!alreadyOpen) {
        // Close all currently open items, compensating scroll for any above viewport
        prev.forEach((openNum) => {
          const innerEl = detailInnerRefs.current.get(openNum);
          const articleEl = articleRefs.current.get(openNum);
          if (innerEl && articleEl) {
            const articleBottom = articleEl.getBoundingClientRect().bottom;
            if (articleBottom <= 0) {
              // Entire article is above viewport — compensate scroll instantly
              window.scrollBy({ top: -innerEl.offsetHeight, behavior: 'instant' as ScrollBehavior });
            }
          }
        });
        return new Set([num]);
      } else {
        // Clicking the open item toggles it closed
        return new Set<string>();
      }
    });
  }

  return (
    <section className="glr-section">
      <div className="glr-body">
        {/* Sticky left nav */}
        <nav className="glr-nav" aria-label="Glaubenspunkte Navigation">
          {ARTICLES.map((a) => (
            <button
              key={a.num}
              className={`glr-nav__item${activeNum === a.num ? ' glr-nav__item--active' : ''}`}
              onClick={() => scrollTo(a.num)}
              title={a.title}
            >
              <span className="glr-nav__num">{a.num}</span>
              <span className="glr-nav__label">{a.title}</span>
            </button>
          ))}
        </nav>

        {/* Articles */}
        <div className="glr-list">
          {ARTICLES.map((a) => {
            const isOpen = expanded.has(a.num);
            return (
              <article
                key={a.num}
                className="glr-item"
                data-num={a.num}
                id={`glr-${a.num}`}
                ref={(el) => {
                  if (el) articleRefs.current.set(a.num, el);
                  else articleRefs.current.delete(a.num);
                }}
              >
                <div className="glr-item__num">{a.num}</div>
                <h3 className="glr-item__title">{a.titleEl}</h3>
                <p className="glr-item__body">{a.body}</p>
                <p className="glr-item__refs">{a.refs}</p>

                {a.detail && a.detail.length > 0 && (
                  <>
                    <button
                      className={`glr-item__trigger${isOpen ? ' glr-item__trigger--open' : ''}`}
                      onClick={() => toggle(a.num)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Schließen' : 'Ausführlichere Darstellung'}
                    >
                      <svg className="glr-item__trigger-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <line
                          x1="12"
                          y1="4"
                          x2="12"
                          y2="20"
                          stroke="currentColor"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                        <line
                          x1="4"
                          y1="12"
                          x2="20"
                          y2="12"
                          stroke="currentColor"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    <div className={`glr-item__detail${isOpen ? ' glr-item__detail--open' : ''}`}>
                      <div
                        className="glr-item__detail__inner"
                        ref={(el) => {
                          if (el) detailInnerRefs.current.set(a.num, el);
                          else detailInnerRefs.current.delete(a.num);
                        }}
                      >
                        <div className="glr-item__detail__content">
                          {a.detail.map((block, i) => (
                            <div key={i} className="glr-item__detail-block">
                              <p className="glr-item__body">{block.text}</p>
                              {block.refs && <p className="glr-item__refs">{block.refs}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
