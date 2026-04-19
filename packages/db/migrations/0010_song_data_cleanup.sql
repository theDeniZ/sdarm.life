-- ═══════════════════════════════════════════════════════════════════════════
-- 0010 — Song data cleanup
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Этот файл — единая миграция данных, собранная из серии правок песенников,
-- сделанных и протестированных на локальной D1. Применение на проде через CI
-- приведёт удалённую базу к тому же состоянию.
--
-- НЕ меняет схему — только данные в таблицах songs и song_parts.
--
-- Покрытые песенники:
--   1 — Псалмы Сиона (русский,    525 песен)
--   2 — Reformation Hymnal (англ., 700 песен)
--   4 — Zions-Lieder (немецкий,    705 песен)
--   6 — Breezify (тестовый,        1 песня — Amazing Grace)
--
-- Структура файла (применяется по порядку):
--
--   Часть A  — Нормализация апострофов в Zions-Lieder
--              (заменили 3 разных неправильных символа: ‘ ` ´ → ’)
--   Часть B  — Песня 661 "Du großer Gott": припев, повторённый в каждом
--              куплете, вынесен в отдельный chorus part
--   Часть C  — 19 песен Zions-Lieder: тот же тип ошибки (refrain inline) —
--              вынесли refrain в chorus, переразметили sort_order
--   Часть D  — 20 заголовков Zions-Lieder с пунктуацией в конце (.,;) —
--              обрезаны; 3 особых случая поправлены вручную
--   Часть E  — Песни 667 "Lobe den Herrn" и 681 "Von guten Mächten":
--              refrain хранился как повторяющиеся куплеты-дубликаты —
--              превращён в один chorus part, лишние удалены
--   Часть F  — Песня 371 "Jerusalem, mein himmlisch Heim": убран артефакт
--              "- -" перед строкой "Die, schöner du"
--   Часть G  — Песня 360 "Ein lieblicher Gedanke": битый UTF-8
--              "kr??stallnen" → "kristallnen"
--   Часть H  — Песня 220 "Mein Jesus nimmt die Sünder an": автор был встроен
--              в текст последнего куплета markdown-курсивом
--              (_Nach E. B. Woltersdorf._) — вынесен в поле songs.author
--   Часть I  — Песня 659 v3: убран двойной подчёрк в слове ("Bald__ wird")
--   Часть J  — 7 немецких песен: убран пробел перед "?" (французская
--              типографика, не используется в немецком)
--   Часть K  — 3 русских псалма: убраны пробелы перед "," "!" ".."
--   Часть L  — 18 песен Zions-Lieder с прямым ASCII-апострофом ' (U+0027)
--              в lyrics + titles — заменён на типографически правильный
--              ’ (U+2019), как в остальной книге
--   Часть M  — Breezify "Amazing Grace": labels "Verse 1"/"Verse 2" заменены
--              на "1"/"2" (нормализация под convention остальных книг)
--   Часть N  — Reformation Hymnal: 3 песни с запятой без пробела после
--              исправлены
--   Часть O  — 525 заголовков Псалмов Сиона: переведены из CAPS в нормальный
--              регистр (sentence case) с капитализацией религиозных
--              имён собственных (Бог, Господь, Тебе, Творец, Христов,
--              Господень и т.д.)
--
-- Что НЕ сделано (требует ручной работы по оригиналу песенника):
--   • 5 песен Zions-Lieder (#44, #74, #221, #274, #301) без куплета 1 —
--     текст потерян при импорте, восстановить из БД нельзя
--   • 3 русских псалма (#11, #266, #460) с подозрительно коротким Refren —
--     возможно обрезаны
--   • Дубликаты номеров: Псалмы Сиона #4 (×2, #469 пропущен),
--     Zions-Lieder #309 (×2, #310 пропущен) — возможно один из дублей
--     должен быть на пропущенном номере
--   • Песни Zions-Lieder #578, #581 с битыми немецкими кавычками
--     ( , , вместо „ ") — нужно правильно распознать оригинальные кавычки
--
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ A — Нормализация апострофов в Zions-Lieder
-- ═══════════════════════════════════════════════════════════════════════════
-- Затронуто: 196 песен (28% от 705 в Zions-Lieder).
-- 3 разных неправильных символа использовались как апостроф:
--   ‘  U+2018  LEFT SINGLE QUOTATION MARK  (зеркальный, открывающая кавычка)
--   `  U+0060  GRAVE ACCENT (backtick)
--   ´  U+00B4  ACUTE ACCENT
-- Все заменены на ’ (U+2019, RIGHT SINGLE QUOTATION MARK) — типографически
-- правильный апостроф элизии в немецком языке.

UPDATE songs SET title = REPLACE(REPLACE(REPLACE(title, '‘', '’'), '`', '’'), '´', '’')
WHERE songbook_id = 4 AND (title LIKE '%‘%' OR title LIKE '%`%' OR title LIKE '%´%');

UPDATE song_parts SET lyrics = REPLACE(REPLACE(REPLACE(lyrics, '‘', '’'), '`', '’'), '´', '’')
WHERE song_id IN (SELECT id FROM songs WHERE songbook_id = 4)
  AND (lyrics LIKE '%‘%' OR lyrics LIKE '%`%' OR lyrics LIKE '%´%');


-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ B — Песня 661 "Du großer Gott"
-- ═══════════════════════════════════════════════════════════════════════════
-- Каждый из 4 куплетов содержал внутри себя одинаковый припев "Refrain: ..."
-- Вынесли припев в отдельный chorus part (sort_order 1, label "Refrain"),
-- куплеты переразметили на sort_order 0, 2, 3, 4.

UPDATE song_parts SET lyrics = 'Du großer Gott, wenn ich die Welt betrachte,
die du geschaffen durch dein Allmachtswort,
wenn ich auf alle jene Wesen achte,
die du regierst und nährest fort und fort.'
WHERE id = 10580;

UPDATE song_parts SET sort_order = 2, lyrics = 'Blick’ ich empor zu jenen lichten Welten
und seh’ der Sterne unzählbare Schar,
wie Sonn’ und Mond im lichten Äther zelten,
gleich goldnen Schiffen hehr und wunderbar.'
WHERE id = 10581;

UPDATE song_parts SET sort_order = 3, lyrics = 'Wenn mir der Herr in seinem Wort begegnet,
wenn ich die großen Gnadentaten seh’,
wie er das Volk des Eigentums gesegnet,
wie er’s geliebt, begnadigt je und je.'
WHERE id = 10582;

UPDATE song_parts SET sort_order = 4, lyrics = 'Und seh’ ich Jesum auf der Erde wandeln
in Knechtsgestalt, voll Lieb’ und großer Huld,
wenn ich im Geiste seh’ sein göttlich Handeln,
am Kreuz bezahlen vieler Sünder Schuld.'
WHERE id = 10583;

INSERT INTO song_parts (song_id, type, label, sort_order, lyrics)
VALUES (2555, 'chorus', 'Refrain', 1, 'Dann jauchzt mein Herz dir, großer Herrscher, zu:
Wie groß bist du! Wie groß bist du!
Dann jauchzt mein Herz dir, großer Herrscher, zu:
Wie groß bist du! Wie groß bist du!');

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ C — 19 песен Zions-Lieder с встроенным refrain
-- ═══════════════════════════════════════════════════════════════════════════
-- Та же ошибка что в #661: припев был частью каждого куплета.
-- Затронутые песни: 74, 193, 194, 265, 267, 439, 652, 660, 662, 663, 664,
--                   665, 669, 670, 673, 674, 675, 677, 679
--
-- Особые случаи:
--   #660 v4 — припев был дублирован дважды; взяли стандартный вариант
--   #674 v3 — припев в этом куплете "Dich" вместо "Ihn" (последний куплет
--             в первом лице — особенность гимна); chorus берёт стандартный
--             "Ihn"-вариант; отличие v3 потеряно при автоматизации
--   #74    — у песни вообще нет куплета 1 (labels 2 и 3 без 1) — это
--             отдельный пре-существующий баг, не правлен здесь


-- ─────────────────────────────────────────────────────────────
-- Song 74 (id=2608) "Forsche die Bibel" — has only 2 verses (labels 2,3)
UPDATE song_parts SET lyrics = 'Forsche die Bibel, die heil’ge Bibel!
Neheme den Weg des Heil’s in acht!
Bis wir die gold’ne Stadt erreichen,
Glaub, was der Herr im Wort dir sagt!' WHERE id = 10797;
UPDATE song_parts SET sort_order = 2, lyrics = 'Forsche die Bibel, die heil’ge Bibel!
So wirst du stark durch Gottes Macht.
Dann führ’ Verirrte liebend zum Heiland,
tu’, was die heil’ge Bibel sagt!' WHERE id = 10798;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2608, 'chorus', 'Refrain', 1,
'Such’ in der Schrift, der Herr befiehlt es;
Bitte von Ihm für dich und mich;
Klopf an die offne Tür der Gnade,
Gott beut Vergebung williglich!');

-- ─────────────────────────────────────────────────────────────
-- Song 193 (id=2035) "Bald die Abendschatten ziehen"
UPDATE song_parts SET lyrics = 'Bald die Abendschatten ziehen,
Messen dir die Laufbahn ab;
Bald die Lebenskräfte fliehen,
Und der Tod zieht dich ins Grab.' WHERE id = 8368;
UPDATE song_parts SET sort_order = 2, lyrics = 'Bald wird die Posaune tönen,
rufen zu dem Weltgericht.
Komm, lass dich mit Gott versöhnen,
da noch Jesus Heil verspricht.' WHERE id = 8369;
UPDATE song_parts SET sort_order = 3, lyrics = 'Schrecklich, wer kein Überwinder,
nicht mit Gott im Frieden steht
und der endlich stirbt als Sünder,
mit den Sündern untergeht.' WHERE id = 8370;
UPDATE song_parts SET sort_order = 4, lyrics = 'Holde Liebe und Erlösung
steh’n uns jetzt noch völlig frei;
weiche nicht in der Versuchung,
ob der Kampf auch heftig sei.' WHERE id = 8371;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2035, 'chorus', 'Refrain', 1,
'Bist auch du bereit? Bist auch du bereit?
Gottes Geist ruft leise: Noch ist’s Zeit!
Bist auch du bereit? Bist auch du bereit?
Zaudre nicht mehr länger, komme noch heut’!');

-- ─────────────────────────────────────────────────────────────
-- Song 194 (id=2036) "Freundlich ruft Jesus"
UPDATE song_parts SET lyrics = 'Freundlich ruft Jesus zum Feste dir,
ladet dich ein durch Sein Wort schon hier.
Wie wird es sein, Freund, mit dir und mir,
wenn der König kommt?' WHERE id = 8372;
UPDATE song_parts SET sort_order = 2, lyrics = 'Blutiges Haupt, bis zum Tod verhöhnt,
Du bist mit lauterem Gold gekrönt,
Göttlich entzückend wird der Moment,
wenn der König kommt.' WHERE id = 8373;
UPDATE song_parts SET sort_order = 3, lyrics = 'Hochzeitlich prangend im weißen Kleid
will uns Sein Auge sehn zu der Zeit.
O, wohl für uns, wenn wir sind bereit,
wenn der König kommt.' WHERE id = 8374;
UPDATE song_parts SET sort_order = 4, lyrics = 'Endlos die traurige Trennungszeit,
wenn der verlorene bitter schreit.
Schreckliche Stunde der Ängstlichkeit,
wenn der König kommt.' WHERE id = 8375;
UPDATE song_parts SET sort_order = 5, lyrics = 'Herr, gib uns Kraft;
schenk` uns Gnad` und Licht,
Dich zu erwarten zum Weltgericht;
Furchtlos zu schauen Dein Angesicht,
wenn der König kommt.' WHERE id = 8376;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2036, 'chorus', 'Refrain', 1,
'Wenn der König kommt, Bruder, wenn der König kommt;
wie wird es sein mit dir und mir,
wenn der König kommt?');

-- ─────────────────────────────────────────────────────────────
-- Song 265 (id=2115) "Dein zu sein, o Heiland!"
UPDATE song_parts SET lyrics = 'Dein zu sein o Heiland, lehre mich dein Gesetz, dein Gesetz;
Deinen Willen tu ich williglich, hilf mir Kämpfen stets.' WHERE id = 8720;
UPDATE song_parts SET sort_order = 2, lyrics = 'Weltvergnügen ist mir kein Gewinn, ohne dich, ohne dich;
Deinetwillen geb ich alles hin, denn Du starbst für mich.' WHERE id = 8721;
UPDATE song_parts SET sort_order = 3, lyrics = 'Alle Erdenfreuden leg ich ab, nur allein, nur allein
Sollst Du, Heiland hier mein Schild und Stab, und mein Tröster sein.' WHERE id = 8722;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2115, 'chorus', 'Refrain', 1,
'Völlig dein, völlig dein
Mache Herr mich völlig dein
Ohne Schein, völlig dein,
Lass mich dienen dir allein');

-- ─────────────────────────────────────────────────────────────
-- Song 267 (id=2117) "Mich verlangt nicht nach Schätzen"
UPDATE song_parts SET lyrics = 'Mich verlangt nicht nach Schätzen, nicht nach Ehre der Welt;
Denn mein Sinn und Verlangen hab ich höher gestellt.
Ja, ich wünsche nur eines: Meinen Jesum zu sehn
Und im Buche des Lebens meinen Namen zu sehn.' WHERE id = 8728;
UPDATE song_parts SET sort_order = 2, lyrics = 'Zwar die Last meiner Sünden, O, sie drückte so sehr!
Ihrer waren so viele wie des Sandes am Meer;
Doch im Blute des Lammes meine Rettung ich seh,
Wär die Sünde auch Blutrot, soll sie werden wie Schnee.' WHERE id = 8729;
UPDATE song_parts SET sort_order = 3, lyrics = 'O, die Stadt meines Gottes, wie verlangt mich dahin,
Wo auf sonnigen Höhen neue Freuden stets blühn!
O, das Glück der Erlösten auf den Himmlischen Höhn,
Die im Buche des Lebens einst verzeichnet dort stehn.' WHERE id = 8730;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2117, 'chorus', 'Refrain', 1,
'O, die Freude so schön!
Auf den himmlischen Höhn
In dem Buche des Lebens stets verzeichnet zu steh’n.');

-- ─────────────────────────────────────────────────────────────
-- Song 439 (id=2308) "Wenn der Heiland"
UPDATE song_parts SET lyrics = 'Wenn der Heiland, wenn der Heiland
als König erscheint,
und die Seinen als Erlöste
im Himmel vereint;' WHERE id = 9539;
UPDATE song_parts SET sort_order = 2, lyrics = 'Und die Kindlein, und die Kindlein
zieht er an die Brust,
die ihm kindlich ihre Herzen
hier schenkten voll Lust.' WHERE id = 9540;
UPDATE song_parts SET sort_order = 3, lyrics = 'Drum ihr Großen und ihr Kleinen,
gebt Jesu das Herz!
Er macht selig, er macht herrlich,
er führt himmelwärts!' WHERE id = 9541;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2308, 'chorus', 'Refrain', 1,
'O, dann werden sie glänzen,
wie Sterne so rein,
in des Heilandes Krone
als Edelgestein.');

-- ─────────────────────────────────────────────────────────────
-- Song 652 (id=2545) "Mit dem Schatten Seiner Hand" (uses "Chor:")
UPDATE song_parts SET lyrics = 'Wenn des Lebens Stürme tosen,
Wenn der Stärkste kaum hält Stand,
Will ich ganz getrost mich bergen
In den Schatten Seiner Hand.' WHERE id = 10551;
UPDATE song_parts SET sort_order = 2, lyrics = 'Wenn der Trübsal Last mich beuget,
Daran auch erkenn’ ich Ihn;
Denn die Trübsal soll mich prüfen,
Soll mich näher zu Ihm ziehn.' WHERE id = 10552;
UPDATE song_parts SET sort_order = 3, lyrics = 'Wenn Versuchung rings mich locket,
Wenn der Feind mit listig bräut,
Schafft Er mir aus den Gefahren
Nur noch größre Kraft und Freud’.' WHERE id = 10553;
UPDATE song_parts SET sort_order = 4, lyrics = 'Mögen drum die Stürme tosen
Und die Wellen brausend gehen,
Meine Seele soll nicht zagen,
Soll getrost auf Jesum sehn.' WHERE id = 10554;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2545, 'chorus', 'Refrain', 1,
'Er bedeckt mich,
Er bedeckt mich,
Dass kein Sturm je stört noch schreckt mich,
Er bedeckt mich,
Er bedeckt mich
Mit dem Schatten Seiner Hand.');

-- ─────────────────────────────────────────────────────────────
-- Song 660 (id=2554) "Dort auf Golgatha stand" — v4 had refrain twice
UPDATE song_parts SET lyrics = 'Dort auf Golgatha stand einst ein alt’ raues Kreuz,
stets ein Sinnbild von Leiden und Weh;
doch ich liebe das Kreuz, denn dort hing einst der Herr;
und in ihm ich das Gotteslamm seh’.' WHERE id = 10576;
UPDATE song_parts SET sort_order = 2, lyrics = 'Dieses alt’ raue Kreuz, von der Welt so verhöhnt,
zieht mich wunderbar mächtiglich an;
hat doch dort Gottes Lamm, das vom Thron zu uns kam,
für uns Sünder Genüge getan.' WHERE id = 10577;
UPDATE song_parts SET sort_order = 3, lyrics = 'In dem alt’ rauen Kreuz, an dem Jesus einst starb
und sein göttliches Blut für mich gab,
seh’ ich Wunder der Schönheit, denn dort an dem Kreuz
er Vergebung und Heil mir erwarb.' WHERE id = 10578;
UPDATE song_parts SET sort_order = 4, lyrics = 'Diesem alt’ rauen Kreuz bleib’ auf immer ich treu,
trage williglich Schande und Hohn.
Einstens ruft er mich heim, wo ich ewig darf schaun
seine Herrlichkeit vor Gottes Thron.' WHERE id = 10579;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2554, 'chorus', 'Refrain', 1,
'Schätzen werd’ ich das Kreuz, das alt’ raue Kreuz;
bis ich Jesum erblick’ auf dem Thron.
Ich will halten mich fest, an dem Kreuz;
einst erhalt’ ich dafür eine Kron’.');

-- ─────────────────────────────────────────────────────────────
-- Song 662 (id=2556) "Für mich gingst du nach Golgatha"
UPDATE song_parts SET lyrics = 'Für mich gingst du nach Golgatha,
für mich hast du das Kreuz getragen,
für mich ertrugst du Spott und Hohn,
für mich hast du dich lassen schlagen.' WHERE id = 10584;
UPDATE song_parts SET sort_order = 2, lyrics = 'Für mich trugst du die Dornenkron’,
für mich warst du von Gott verlassen.
Auf dir lag alle Schuld der Welt,
auch meine Schuld; ich kann’s nicht fassen.' WHERE id = 10585;
UPDATE song_parts SET sort_order = 3, lyrics = 'Herr Jesus Christus, alle Schuld hast du
für immer mir vergeben.
Du hast mich froh und frei gemacht,
du schenkst mir neues, ew’ges Leben.' WHERE id = 10586;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2556, 'chorus', 'Refrain', 1,
'Herr, deine Liebe ist so groß,
dass ich sie nie begreifen kann,
doch danken will ich dir dafür.
Herr, deine Liebe ist so groß,
dass ich sie nie begreifen kann.
Ich bete dich an.');

-- ─────────────────────────────────────────────────────────────
-- Song 663 (id=2557) "Einst strahlt ewiges Licht"
UPDATE song_parts SET lyrics = 'Einst strahlt ewiges Licht aus des Herrn Angesicht,
wenn ich Jesus in Herrlichkeit seh’.
Alles Dunkel der Nacht weicht der himmlischen Pracht,
wenn ich Jesus in Herrlichkeit seh’.' WHERE id = 10587;
UPDATE song_parts SET sort_order = 2, lyrics = 'Alles irdische Glück, lass ich freudig zurück,
wenn ich Jesus in Herrlichkeit seh’.
Und was hier ich entbehr, will ich droben nicht mehr,
wenn ich Jesus in Herrlichkeit seh’.' WHERE id = 10588;
UPDATE song_parts SET sort_order = 3, lyrics = 'War der Weg auch nicht leicht, doch mein Ziel ist erreicht,
wenn ich Jesus in Herrlichkeit seh’.
Und mein herrlichster Lohn ist Verklärung im Sohn,
wenn ich Jesus in Herrlichkeit seh’.' WHERE id = 10589;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2557, 'chorus', 'Refrain', 1,
'Ist mein Lauf hier vollendet, mein Leben vorbei,
ruh’ ich aus in der himmlischen Höh’.
Und was hier mir verwehrt, find ich droben verklärt,
wenn ich Jesus in Herrlichkeit seh.');

-- ─────────────────────────────────────────────────────────────
-- Song 664 (id=2558) "Ich werde ihn immer lieben"
UPDATE song_parts SET lyrics = 'Der Herr hat viel für mich getan,
ich werde ihn immer lieben;
er leitet mich auf rechter Bahn,
ich werde ihn immer lieben.' WHERE id = 10590;
UPDATE song_parts SET sort_order = 2, lyrics = 'Er steht mir alle Tage bei,
ich werde ihn immer lieben;
und seine Gnade macht mich frei,
ich werde ihn immer lieben.' WHERE id = 10591;
UPDATE song_parts SET sort_order = 3, lyrics = 'Und ob ihn alle Welt vergisst,
ich werde ihn immer lieben;
mein bester Freund ist Jesus Christ,
ich werde ihn immer lieben.' WHERE id = 10592;
UPDATE song_parts SET sort_order = 4, lyrics = 'Er rettet mich bei Tag und Nacht,
ich werde ihn immer lieben;
stets fühl’ ich seines Geistes Macht,
ich werde ihn immer lieben.' WHERE id = 10593;
UPDATE song_parts SET sort_order = 5, lyrics = 'Ob hier im dunkeln Tränental,
ich werde ihn immer lieben;
ob dort im lichten Freudensaal,
ich werde ihn immer lieben.' WHERE id = 10594;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2558, 'chorus', 'Refrain', 1,
'Ich werde ihn immer lieben, den Heiland, den Heiland!
Ich werde ihn immer lieben, denn er tat so viel für mich.');

-- ─────────────────────────────────────────────────────────────
-- Song 665 (id=2559) "Gnade, die Jesus uns zugewandt"
UPDATE song_parts SET lyrics = 'Gnade, die Jesus uns zugewandt,
die unsre Schuld und Sünde bedeckt,
strömet von Golgatha weit ins Land,
dort hat dein Heiland den Tod geschmeckt.' WHERE id = 10595;
UPDATE song_parts SET sort_order = 2, lyrics = 'Hoffnungslos, trostlos und arm bist du,
einsam, von kalten Wogen umtost.
Hier ist die Hilfe, so greif doch zu!
Jesus gibt Zuflucht, gibt echten Trost.' WHERE id = 10596;
UPDATE song_parts SET sort_order = 3, lyrics = 'Flecken der Sünde, tief eingebrannt,
was wäschst sie weg, vertilgt diese Spur?
Sieh, Jesu Blut wird dir heut genannt,
hier ist die Rettung, die Hilfe nur.' WHERE id = 10597;
UPDATE song_parts SET sort_order = 4, lyrics = 'Jesus, er starb doch an deiner Statt,
darum kann Gott auch dir verzeihn.
Nichts andres macht deine Seele satt!
Willst du nicht heute begnadigt sein?' WHERE id = 10598;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2559, 'chorus', 'Refrain', 1,
'Gnade, Gnade, Gnade vergibt dir und reinigt dich;
Gottes Gnade bringt Errettung für dich und mich.');

-- ─────────────────────────────────────────────────────────────
-- Song 669 (id=2563) "Gott wird behüten dich!"
UPDATE song_parts SET lyrics = 'Sei nicht verzagt, was auch geschieht,
Gott wird behüten dich.
Traue der Liebe, die dich zieht,
Gott wird behüten dich.' WHERE id = 10619;
UPDATE song_parts SET sort_order = 2, lyrics = 'Wenn Erdennot am Herzen zehrt,
Gott wird behüten dich.
Wenn Sorge dein Gemüt beschwert,
Gott wird behüten dich.' WHERE id = 10620;
UPDATE song_parts SET sort_order = 3, lyrics = 'Was du bedarfst, er wird’s versehn,
Gott wird behüten dich.
Er kann dein Sehnen wohl verstehn,
Gott wird behüten dich.' WHERE id = 10621;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2563, 'chorus', 'Refrain', 1,
'Gott wird behüten dich von Tag zu Tag,
was kommen mag.
Er wird behüten dich,
Gott wird behüten dich, ja, dich.');

-- ─────────────────────────────────────────────────────────────
-- Song 670 (id=2565) "Gott wird dich tragen"
UPDATE song_parts SET lyrics = 'Gott wird dich tragen, drum sei nicht verzagt,
treu ist der Hüter, der über dich wacht.
Stark ist der Arm, der dein Leben gelenkt,
Gott ist ein Gott, der der Seinen Gedenkt.' WHERE id = 10627;
UPDATE song_parts SET sort_order = 2, lyrics = 'Gott wird dich tragen, wenn einsam du gehst;
Gott wird dich hören, wenn weinend du flehst.
Glaub’ es, wie bang dir der Morgen auch graut,
Gott ist ein Gott, dem man kühnlich vertraut.' WHERE id = 10628;
UPDATE song_parts SET sort_order = 3, lyrics = 'Gott wird dich tragen durch Tage der Not;
Gott wird dir beistehn in Alter und Tod.
Fest steht das Wort, ob auch alles zerstäubt,
Gott ist ein Gott, der in Ewigkeit bleibt.' WHERE id = 10629;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2565, 'chorus', 'Refrain', 1,
'Gott wird dich tragen mit Händen so lind.
Er hat dich lieb, wie ein Vater sein Kind.
Das steht dem Glauben wie Felsen so fest:
Gott ist ein Gott, der uns nimmer verlässt.');

-- ─────────────────────────────────────────────────────────────
-- Song 673 (id=2568) "Jesus ruft freundlich"
UPDATE song_parts SET lyrics = 'Jesus ruft freundlich Verlorne nach Haus,
Jesus ruft heut, Jesus ruft heut.
Kommt aus dem Dunkel der Sünde heraus,
jetzt, wo er Gnade dir beut!' WHERE id = 10638;
UPDATE song_parts SET sort_order = 2, lyrics = 'Jesus schenkt müden Erquickung und Ruh,
schenket sie heut, schenket sie heut.
Bring ihm die Sorgen; o eile herzu!
Stillt er doch gerne dein Leid!' WHERE id = 10639;
UPDATE song_parts SET sort_order = 3, lyrics = 'Jesus, erlocket und nötigt dich heut,
hör ihn noch heut, hör ihn noch heut.
Wer an ihn glaubet, hat Frieden und Freud.
Eile zum Retter noch heut!' WHERE id = 10640;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2568, 'chorus', 'Refrain', 1,
'Jesus ruft heut, Jesus ruft heut,
Jesus, er rufet, er rufet so freundlich dich heut!');

-- ─────────────────────────────────────────────────────────────
-- Song 674 (id=2569) "Nieder zur Erden" — v3 had "Dich" variant; chorus uses standard "Ihn"
UPDATE song_parts SET lyrics = 'Nieder zur Erden, um ein Mensch zu werden,
kam der allmächtge Gott, zu enden unsre Not.
Er ward verstoßen und sein Blut vergossen.
Er ward gehorsam bis zum bittern Tod.' WHERE id = 10641;
UPDATE song_parts SET sort_order = 2, lyrics = 'Auf welchen Wegen kommt uns Gott entegegen,
dass er in finstrer Nacht uns wieder hoffen macht!
Freundlich und gnädig, aller Pracht entledigt,
klopft er, Erlösung bringend, an mein Herz.' WHERE id = 10642;
UPDATE song_parts SET sort_order = 3, lyrics = 'Ohne zu klagen, ließ er sich zerschlagen,
gab er sein Leben hin, auf dass er uns gewinn.
Wer kann’s erfassen: Gott sich selbst verlassen!
Nun weiß ich, du bist’s, der da spricht: Ich bin.' WHERE id = 10643;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2569, 'chorus', 'Refrain', 1,
'Ihn will ich lieben, will ihn anbeten,
mein Licht, mein Leben, mein ganzes Heil.
Der größe Schöpfer ward mein Erlöser,
und Gottes Gnade ward mir zu teil.');

-- ─────────────────────────────────────────────────────────────
-- Song 675 (id=2570) "O Gott, dir sei Ehre"
UPDATE song_parts SET lyrics = 'O Gott, dir sei Ehre, der Großes getan!
Du liebtest die Welt, nahmst der Sünder dich an!
Dein Sohn hat sein Leben zum Opfer geweiht.
Der Himmel steht offen zur ewigen Freud.' WHERE id = 10644;
UPDATE song_parts SET sort_order = 2, lyrics = 'O große Erlösung, erkauft durch sein Blut!
Dem Sünder, der glaubt, kommt sie heute zu gut!
Die volle Vergebung wird jedem zu teil,
der Jesus erfasset, das göttliche Heil.' WHERE id = 10645;
UPDATE song_parts SET sort_order = 3, lyrics = 'Wie groß ist sein Lieben! Wie groß ist sein Tun!
Wie groß unsre Freude, in Jesus zu ruhn!
Doch größer und reiner und höher wird’s sein,
wenn jubelnd und schauend wir droben ziehn ein.' WHERE id = 10646;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2570, 'chorus', 'Refrain', 1,
'Preist den Herrn! Preist den Herrn!
Erde, hör’ diesen Schall!
Preist den Herrn! Preist den Herrn!
Völker, freuet euch all!
O kommt zu dem Vater, in Jesus wir nah’n,
und gebt ihm die Ehre, der Großes getan!');

-- ─────────────────────────────────────────────────────────────
-- Song 677 (id=2572) "Sieh, hier bin ich mein König"
UPDATE song_parts SET lyrics = 'Sieh, hier bin ich, mein König, ich weihe mich dir,
nimm, gebrauche mich, Herr, wo du willst.
Ach, ich weiß, nichts, was Wert hat, ist irgend an mir,
nichts, wenn du mich nicht selber erfüllst.' WHERE id = 10650;
UPDATE song_parts SET sort_order = 2, lyrics = 'Sieh, hier bin ich, mein König, mein Herze, das brennt,
dir zu dienen, wo du es begehrst,
gib, dass völlig dein Geist vom Verlangen mich trennt,
mir zu nehmen, was du nicht gewährst.' WHERE id = 10651;
UPDATE song_parts SET sort_order = 3, lyrics = 'Sieh, hier bin ich, mein König, und ist meine Hand
nicht geschickt für den vordersten Streit,
so verzäune die Lücken und bessre das Land
doch durch mich, denn ich bin dir geweiht.' WHERE id = 10652;
UPDATE song_parts SET sort_order = 4, lyrics = 'Sieh, hier bin ich, mein König, ob niemand es weiß,
wenn dein Auge nur über mir wacht,
wenn ich da, wo ich steh, tu nach deinem Geheiß,
bin ich glücklich bei Tag und Nacht.' WHERE id = 10653;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2572, 'chorus', 'Refrain', 1,
'Mach, was klein dir, mir klein, was dir groß ist, mir groß,
dass ich folge dir, Jesus allein.
Mach vom eigenen Sinn, von mir selber mich los,
lass ein brauchbares Werkzeug mich sein.');

-- ─────────────────────────────────────────────────────────────
-- Song 679 (id=2574) "Trauend den Verheißungen"
UPDATE song_parts SET lyrics = 'Trauend den Verheißungen in Gottes Wort,
lasst erschallen Lob und Ehre immerfort;
fröhlich singend wandre ich von Ort zu Ort,
trauend den Verheißungen des Herrn.' WHERE id = 10658;
UPDATE song_parts SET sort_order = 2, lyrics = 'Trauend den Verheißungen, die fest bestehn,
kann im Sturm des Zweifels ich nie untergehn;
auf dem Fels des Wortes kann ich sicher stehn,
trauend den Vergeißungen des Herrn.' WHERE id = 10659;
UPDATE song_parts SET sort_order = 3, lyrics = 'Trauend den Verheißungen, die er mir gab,
schreit’ ich mutig weiter an dem Wanderstab;
wohlgemut, weil diesen Trost ich bei mir hab’;
trauend den Verheißungen des Herrn.' WHERE id = 10660;
INSERT INTO song_parts (song_id, type, label, sort_order, lyrics) VALUES (2574, 'chorus', 'Refrain', 1,
'Trauend, trauend, trauend den Verheißungen des treuen Gottes;
trauend, trauend, ich traue den Verheißungen des Herrn.');

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ D — Заголовки Zions-Lieder с пунктуацией в конце
-- ═══════════════════════════════════════════════════════════════════════════
-- 20 заголовков заканчивались на "." "," ";" — артефакт импорта (точка
-- от первой строки текста копировалась в title). Обрезано через RTRIM.
--
-- 3 особых случая правлены вручную:
--   #9   — title был "O, wie freu'n wir uns der. . ." (обрезано посередине);
--          восстановлено по первой строке lyrics: "O, wie freu'n wir uns der Stunde"
--   #301 — title был "allen Gästen, die da kommen," (фрагмент, lowercase);
--          реально это гимн "O selig Haus" К.Й.Ф. Шпитты
--   #600 — title был "Macht hoch die Tür;" (точка с запятой от первой
--          строки lyrics); полное классическое название "Macht hoch die Tür"

-- ─────────────────────────────────────────────────────────────
-- Title cleanup: 20 Zions-Lieder titles ending with . , ;
-- Special cases first, then bulk RTRIM for the rest.

-- №9: title was truncated mid-word with ". . ."; first line of lyrics is "O, wie freu’n wir uns der Stunde"
UPDATE songs SET title = 'O, wie freu’n wir uns der Stunde' WHERE id = 2625;

-- №301: title was a fragment ("allen Gästen, die da kommen,") but the song is "O selig Haus" by K.J.P. Spitta
UPDATE songs SET title = 'O selig Haus' WHERE id = 2156;

-- №600: trailing semicolon copied from first line of lyrics
UPDATE songs SET title = 'Macht hoch die Tür' WHERE id = 2488;

-- Bulk: remove trailing . , ; from the other 17 titles
UPDATE songs SET title = RTRIM(title, '.,;') WHERE id IN (
  1933, 1964, 1974, 2094, 2174, 2178, 2228, 2296, 2299,
  2333, 2458, 2512, 2523, 2528, 2541, 2544, 2548
);

-- ─────────────────────────────────────────────────────────────
-- Refrain was stored as repeated verses with labels 1, 3, 5, 7, 9.
-- Convert first occurrence to chorus, relabel real verses 1-4, delete duplicates.
UPDATE song_parts SET type = 'chorus', label = 'Refrain', sort_order = 0 WHERE id = 10605;
UPDATE song_parts SET label = '1', sort_order = 1 WHERE id = 10606;
DELETE FROM song_parts WHERE id = 10607;
UPDATE song_parts SET label = '2', sort_order = 2 WHERE id = 10608;
DELETE FROM song_parts WHERE id = 10609;
UPDATE song_parts SET label = '3', sort_order = 3 WHERE id = 10610;
DELETE FROM song_parts WHERE id = 10611;
UPDATE song_parts SET label = '4', sort_order = 4 WHERE id = 10612;
DELETE FROM song_parts WHERE id = 10613;

-- ─────────────────────────────────────────────────────────────
-- Song 681 (id=2577) "Von guten Mächten":
-- Refrain was stored as repeated verses with labels 2, 4, 6, 8.
-- Convert label 2 to chorus, relabel/sort the real verses, delete duplicates.
UPDATE song_parts SET type = 'chorus', label = 'Refrain' WHERE id = 10668;
UPDATE song_parts SET label = '2', sort_order = 2 WHERE id = 10669;
DELETE FROM song_parts WHERE id = 10670;
UPDATE song_parts SET label = '3', sort_order = 3 WHERE id = 10671;
DELETE FROM song_parts WHERE id = 10672;
UPDATE song_parts SET label = '4', sort_order = 4 WHERE id = 10673;
DELETE FROM song_parts WHERE id = 10674;

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ E — Песни 667 и 681: refrain как повторяющиеся куплеты
-- ═══════════════════════════════════════════════════════════════════════════
-- Другая разновидность той же проблемы: припев хранился НЕ внутри куплетов,
-- а как отдельные verse-записи с тем же текстом, повторяющиеся между
-- настоящими куплетами.
--
--   #667 "Lobe den Herrn, meine Seele!" — было 9 verse-частей, из которых
--        labels 1, 3, 5, 7, 9 — это один и тот же текст припева.
--        Конвертировано: chorus "Refrain" + 4 куплета (1..4)
--
--   #681 "Von guten Mächten" — было 8 verse-частей, labels 2, 4, 6, 8 —
--        дубликаты припева. Конвертировано: 1 verse + chorus + 3 verse-а


-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ F — Песня 371 "Jerusalem, mein himmlisch Heim"
-- ═══════════════════════════════════════════════════════════════════════════
-- Перед строкой "Die, schöner du, denn Edens Land" был артефакт "- -"
-- (видимо, разделитель из исходного файла, который не должен был попасть в
-- финальный текст). Заменён на двойной перевод строки (визуальный разрыв
-- между секциями хоровой аранжировки).
--
-- Песня корректно хранится как ОДИН длинный verse — это choral arrangement
-- с внутренними повторами ("Jerusalem, Jerusalem", "Wie hold, wie hold"
-- и т.п.), не строфический гимн.

UPDATE song_parts SET lyrics = REPLACE(lyrics, '
- -Die, schöner du', '

Die, schöner du') WHERE id = 9239;


-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ G — Песня 360: битый UTF-8
-- ═══════════════════════════════════════════════════════════════════════════
-- В куплете 2 был артефакт битой кодировки: "kr??stallnen" вместо
-- "kristallnen" (от "kristallen" — кристальный). ?? — replacement character.

UPDATE song_parts SET lyrics = REPLACE(lyrics, 'kr??stallnen', 'kristallnen') WHERE id = 9189;

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ H — Песня 220: автор был встроен в текст
-- ═══════════════════════════════════════════════════════════════════════════
-- В конце последнего куплета "Mein Jesus nimmt die Sünder an" был встроен
-- атрибут авторства как markdown-курсив: "_Nach E. B. Woltersdorf._"
-- Вынесено: текст из lyrics удалён, поле songs.author заполнено.

UPDATE songs SET author = 'Nach E. B. Woltersdorf' WHERE id = 2066;
UPDATE song_parts SET lyrics = REPLACE(lyrics, '
_Nach E. B. Woltersdorf._', '') WHERE id = 8511;

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ I — Песня 659: двойной подчёрк
-- ═══════════════════════════════════════════════════════════════════════════
-- В 3-м куплете "Zünde an dein Feuer" было "Bald__ wird" — двойной подчёрк
-- посреди слова. Вероятно артефакт markdown-bold или OCR. Удалён.

UPDATE song_parts SET lyrics = REPLACE(lyrics, 'Bald__ wird', 'Bald wird') WHERE id = 10570;

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ J — Пробел перед "?" в немецких песнях (французская типографика)
-- ═══════════════════════════════════════════════════════════════════════════
-- Во французской типографике пишут "слово ?" с неразрывным пробелом перед
-- знаком вопроса. В немецкой — без пробела. 7 песен Zions-Lieder содержали
-- этот ошибочный пробел: 34, 44, 147, 204, 440, 455, 468.
-- Песни 578 и 581 (тоже Zions-Lieder, тот же тип ошибки) НЕ затронуты —
-- у них дополнительно сломаны немецкие кавычки , , вместо „ ", и нужна
-- ручная правка кавычек заодно.

UPDATE song_parts SET lyrics = REPLACE(lyrics, ' ?', '?')
  WHERE song_id IN (1984, 2048, 2198, 2309, 2310, 2326, 2340)
    AND lyrics LIKE '% ?%';

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ K — Пробел перед знаками препинания в Псалмах Сиона
-- ═══════════════════════════════════════════════════════════════════════════
-- 3 русских псалма содержали ошибочные пробелы перед пунктуацией:
--   #10  "Вселенная и твердь небес"  — " ," (пробел перед запятой)
--   #225 "В жизненном море"         — " .." (пробел перед двоеточием/многоточием)
--   #325 "Стражи на стенах Сиона"   — " !" (пробел перед восклицанием)

UPDATE song_parts SET lyrics = REPLACE(lyrics, ' ,', ',')
  WHERE song_id = 10 AND lyrics LIKE '% ,%';
UPDATE song_parts SET lyrics = REPLACE(lyrics, ' !', '!')
  WHERE song_id = 325 AND lyrics LIKE '% !%';
UPDATE song_parts SET lyrics = REPLACE(lyrics, ' ..', '..')
  WHERE song_id = 225 AND lyrics LIKE '% ..%';

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ L — Прямой ASCII-апостроф ' (U+0027) в Zions-Lieder
-- ═══════════════════════════════════════════════════════════════════════════
-- 16 песен в lyrics + 2 заголовка использовали прямой апостроф ', тогда как
-- вся остальная книга — типографически правильный ’ (U+2019). Нормализовано.
-- Это ОТДЕЛЬНОЕ от Части A исправление — там были ‘ ` ´, здесь '.

UPDATE songs SET title = REPLACE(title, '''', '’') WHERE songbook_id = 4 AND title LIKE '%''%';
UPDATE song_parts SET lyrics = REPLACE(lyrics, '''', '’')
  WHERE song_id IN (SELECT id FROM songs WHERE songbook_id = 4) AND lyrics LIKE '%''%';

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ M — Breezify "Amazing Grace": нормализация labels
-- ═══════════════════════════════════════════════════════════════════════════
-- В тестовом песеннике Breezify (id=6, единственная песня — Amazing Grace)
-- использовались labels "Verse 1", "Chorus", "Verse 2" — нестандартно.
-- Все остальные песенники (Псалмы Сиона, Reformation Hymnal, Zions-Lieder)
-- используют просто "1", "2", "3" для verse и "Refrain"/"Refren" для chorus.

UPDATE song_parts SET label = '1' WHERE id = 10913;       -- было "Verse 1"
UPDATE song_parts SET label = 'Refrain' WHERE id = 10914; -- было "Chorus"
UPDATE song_parts SET label = '2' WHERE id = 10915;       -- было "Verse 2"

-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ N — Reformation Hymnal: запятая без пробела
-- ═══════════════════════════════════════════════════════════════════════════
-- В английском песеннике 3 песни содержали запятые без пробела после:
--   #56  "My Maker and My King"           — "My God,Thy"     → "My God, Thy"
--   #385 "When I Can Read My Title Clear" — "(the storm,It"  → "(the storm, It"
--   #594 "Joy By and By"                  — "joy,joy"        → "joy, joy"

UPDATE song_parts SET lyrics = REPLACE(lyrics, 'My God,Thy', 'My God, Thy') WHERE id = 2383;
UPDATE song_parts SET lyrics = REPLACE(lyrics, '(the storm,It', '(the storm, It') WHERE id = 3725;
UPDATE song_parts SET lyrics = REPLACE(lyrics, 'joy,joy', 'joy, joy') WHERE id = 4599;


-- ═══════════════════════════════════════════════════════════════════════════
-- ЧАСТЬ O — Псалмы Сиона: 525 заголовков из CAPS в нормальный регистр
-- ═══════════════════════════════════════════════════════════════════════════
-- Все заголовки русских псалмов были в верхнем регистре (например
-- "БОЖЕ, МЫ ПОЕМ ТЕБЕ"). Конвертированы через JS-скрипт (toLowerCase + ручная
-- капитализация) в sentence case с капитализацией:
--   • первой буквы заголовка
--   • первой буквы после знаков сентенц-конца (. ! ? ;)
--   • религиозных имён собственных в любых формах:
--     Бог, Господь, Иисус, Христос, Дух, Святой, Творец, Агнец, Спаситель,
--     Искупитель, Отец, Всевышний, Сын, Сион, Голгофа, Иерусалим, Вифлеем,
--     Едем, Эдем + все падежные формы
--   • прилагательных от имён собственных:
--     Христов, Господень, Божий + все формы
--   • местоимений 2 лица единственного числа (обращение к Богу):
--     Ты, Тебе, Тебя, Тобой, Твой и т.д.
--
-- SQLite lower()/upper() НЕ работают на кириллице (только ASCII), поэтому
-- генерация UPDATEs выполнена в Node.js (toLowerCase Unicode-aware) и
-- результат хардкодится здесь — все 525 заголовков как явные UPDATEs.
--
-- Образцы:
--   "БОЖЕ, МЫ ПОЕМ ТЕБЕ"               → "Боже, мы поем Тебе"
--   "СЛАВЬТЕ БОГА! СЛАВЬТЕ В ПЕСНОПЕНЬЯХ" → "Славьте Бога! Славьте в песнопеньях"
--   "ТЕБЯ, ГОСПОДЬ, ТЕБЯ МЫ СЛАВИМ"    → "Тебя, Господь, Тебя мы славим"
--   "ПОЮ ТВОРЦУ Я ПЕСНЬ ХВАЛЫ"         → "Пою Творцу я песнь хвалы"
--   "О СЛАВЕ БОЖЬЕЙ"                   → "О славе Божьей"
--   "О, ВОИН ХРИСТОВ"                  → "О, воин Христов"
--   "СЛЫШИТЕ ЛЬ ГОСПОДЕНЬ ПРИЗЫВ?"     → "Слышите ль Господень призыв?"

UPDATE songs SET title = 'Боже, мы поем Тебе' WHERE id = 1;
UPDATE songs SET title = 'Коль славен' WHERE id = 2;
UPDATE songs SET title = 'Славьте Бога! Славьте в песнопеньях' WHERE id = 3;
UPDATE songs SET title = 'Богу пойте и хвалу несите!' WHERE id = 4;
UPDATE songs SET title = 'Забудем горе и томленье' WHERE id = 469;
UPDATE songs SET title = 'Бог наш – чудный промыслитель' WHERE id = 5;
UPDATE songs SET title = 'Тебя, Господь, Тебя мы славим' WHERE id = 6;
UPDATE songs SET title = 'Славьте Бога всей вселенной' WHERE id = 7;
UPDATE songs SET title = 'Пою Творцу я песнь хвалы' WHERE id = 8;
UPDATE songs SET title = 'О славе Божьей' WHERE id = 9;
UPDATE songs SET title = 'Вселенная и твердь небес' WHERE id = 10;
UPDATE songs SET title = 'Громко Бога прославляйте' WHERE id = 11;
UPDATE songs SET title = 'Чудный, дивный, Боже вечный' WHERE id = 12;
UPDATE songs SET title = 'Бог наш между нами' WHERE id = 13;
UPDATE songs SET title = 'На юг, на запад, на восток' WHERE id = 14;
UPDATE songs SET title = 'Вечносущий Бог Святой' WHERE id = 15;
UPDATE songs SET title = 'Господи, Боже, склони свои взоры' WHERE id = 16;
UPDATE songs SET title = 'Каждый день и каждый час' WHERE id = 17;
UPDATE songs SET title = 'В жизни и всяком дыханьи' WHERE id = 18;
UPDATE songs SET title = 'Бог есть любовь. (1)' WHERE id = 19;
UPDATE songs SET title = 'Мой Бог мне жизн и сила' WHERE id = 20;
UPDATE songs SET title = 'Когда я устремляю взоры' WHERE id = 21;
UPDATE songs SET title = 'Господь – мой друг' WHERE id = 22;
UPDATE songs SET title = 'Бог – Отец любвеобильный' WHERE id = 23;
UPDATE songs SET title = 'Всем сердцем и душой' WHERE id = 24;
UPDATE songs SET title = 'Земля трепещет' WHERE id = 25;
UPDATE songs SET title = 'Воскликните Господу, вся земля пс. 99' WHERE id = 26;
UPDATE songs SET title = 'Радость и благодаренье' WHERE id = 27;
UPDATE songs SET title = 'Дайте мне библию' WHERE id = 28;
UPDATE songs SET title = 'О, придите, стар и млад' WHERE id = 29;
UPDATE songs SET title = 'О, слово Божье' WHERE id = 30;
UPDATE songs SET title = 'О, книга Божья, Ты – маяк' WHERE id = 31;
UPDATE songs SET title = 'В слове Божьем ищи утешенье' WHERE id = 32;
UPDATE songs SET title = 'И3мученный жизнью суровой' WHERE id = 33;
UPDATE songs SET title = 'При чтеньи слова Божья часто' WHERE id = 34;
UPDATE songs SET title = 'Люблю читать я книгу' WHERE id = 35;
UPDATE songs SET title = 'Блажен и счастлив' WHERE id = 36;
UPDATE songs SET title = 'Вот наслаждение благое' WHERE id = 37;
UPDATE songs SET title = 'Сердцем гордым я смирился' WHERE id = 38;
UPDATE songs SET title = 'В час полночный близ потока' WHERE id = 39;
UPDATE songs SET title = 'Библия много света нам открыла' WHERE id = 40;
UPDATE songs SET title = 'Я познал в твоем писаньи' WHERE id = 41;
UPDATE songs SET title = 'Открой мне очи, Боже мой' WHERE id = 42;
UPDATE songs SET title = 'Господь закон свой чудный' WHERE id = 43;
UPDATE songs SET title = 'Слушай! Ангельские хоры' WHERE id = 44;
UPDATE songs SET title = 'Большая звезда на небе взошла' WHERE id = 45;
UPDATE songs SET title = 'Слушай, вся земля' WHERE id = 46;
UPDATE songs SET title = 'Хвалу Иисусу я желаю' WHERE id = 47;
UPDATE songs SET title = 'Слепой, несчастный вартимей' WHERE id = 48;
UPDATE songs SET title = 'Тихая ночь, дивная ночь' WHERE id = 49;
UPDATE songs SET title = 'Однажды пришел ко Христу никодим' WHERE id = 50;
UPDATE songs SET title = 'Я зрю и вижу в умиленьи' WHERE id = 51;
UPDATE songs SET title = 'Что сделать Иисусу?' WHERE id = 52;
UPDATE songs SET title = 'Сколько горьких раскаяний' WHERE id = 53;
UPDATE songs SET title = 'Буду петь любовь Христа' WHERE id = 54;
UPDATE songs SET title = 'Я умер за Тебя' WHERE id = 55;
UPDATE songs SET title = 'В час полночный в гефсиманьи' WHERE id = 56;
UPDATE songs SET title = 'Пойте, братья, песнь хваленья' WHERE id = 57;
UPDATE songs SET title = 'О, как хотелось бы все снова' WHERE id = 58;
UPDATE songs SET title = 'Христос из мертвых ожил' WHERE id = 59;
UPDATE songs SET title = 'В темном гробу' WHERE id = 60;
UPDATE songs SET title = 'Христос воскрес!' WHERE id = 61;
UPDATE songs SET title = 'Знаю, жив мой Искупитель (1)' WHERE id = 62;
UPDATE songs SET title = 'О, воскресший, о, воскресший' WHERE id = 63;
UPDATE songs SET title = 'Христос воскрес! О, слава' WHERE id = 64;
UPDATE songs SET title = 'Я знаю, жив мой Искупитель (ii)' WHERE id = 65;
UPDATE songs SET title = 'Ожил Христос Спаситель' WHERE id = 66;
UPDATE songs SET title = 'Господь – Иисус Христос' WHERE id = 67;
UPDATE songs SET title = 'Радость, радость пусть обильно' WHERE id = 68;
UPDATE songs SET title = 'Ты, Господь, моя скала' WHERE id = 69;
UPDATE songs SET title = 'О, неужели в плоти тленной' WHERE id = 70;
UPDATE songs SET title = 'Возвещать Твое спасенье' WHERE id = 71;
UPDATE songs SET title = 'Нет искупления ни в ком' WHERE id = 72;
UPDATE songs SET title = 'Кто может дать надежду на спасенье?' WHERE id = 73;
UPDATE songs SET title = 'Мы все уповаем на скалу' WHERE id = 74;
UPDATE songs SET title = 'Великий врач души моей' WHERE id = 75;
UPDATE songs SET title = 'Небесный луч в душе моей' WHERE id = 76;
UPDATE songs SET title = 'Христова кровь, стекавшая с креста' WHERE id = 77;
UPDATE songs SET title = 'Христос – мне щит' WHERE id = 78;
UPDATE songs SET title = 'Господь Спаситель, грешных друг!' WHERE id = 79;
UPDATE songs SET title = 'Великий день, великий час' WHERE id = 80;
UPDATE songs SET title = 'Сильный еммануил' WHERE id = 81;
UPDATE songs SET title = 'Он знает все' WHERE id = 82;
UPDATE songs SET title = 'В руках Христа могучих' WHERE id = 83;
UPDATE songs SET title = 'Я знаю чудесное имя' WHERE id = 84;
UPDATE songs SET title = 'Добрый пастырь призывает' WHERE id = 85;
UPDATE songs SET title = 'Господь нас всех к себе влечет' WHERE id = 86;
UPDATE songs SET title = 'Славно имя Иисуса' WHERE id = 87;
UPDATE songs SET title = 'Где Бог в сердцах живет' WHERE id = 88;
UPDATE songs SET title = 'Как дивно имя "Иисус"' WHERE id = 89;
UPDATE songs SET title = 'Всем сердцем я люблю Тебя, Спаситель' WHERE id = 90;
UPDATE songs SET title = 'Покрытый ранами' WHERE id = 91;
UPDATE songs SET title = 'В царстве звездном' WHERE id = 92;
UPDATE songs SET title = 'Мир талантами гордится' WHERE id = 93;
UPDATE songs SET title = 'В борьбе с вражьей силой' WHERE id = 94;
UPDATE songs SET title = 'Господь – наш вождь' WHERE id = 95;
UPDATE songs SET title = 'Не найдешь нигде' WHERE id = 96;
UPDATE songs SET title = 'Сохрани от заблужденья' WHERE id = 97;
UPDATE songs SET title = 'Свято, чтимо это место' WHERE id = 98;
UPDATE songs SET title = 'Дверь откройте' WHERE id = 99;
UPDATE songs SET title = 'Всевышний Бог наш и Отец' WHERE id = 100;
UPDATE songs SET title = 'Боже, здесь Твое мы стадо' WHERE id = 101;
UPDATE songs SET title = 'Отче наш, Твои мы дети' WHERE id = 102;
UPDATE songs SET title = 'Отец людей, Отец небесный' WHERE id = 103;
UPDATE songs SET title = 'О, как рады мы собраться' WHERE id = 104;
UPDATE songs SET title = 'В долине греха я...' WHERE id = 105;
UPDATE songs SET title = 'О, пребудь средь нас, Спаситель' WHERE id = 106;
UPDATE songs SET title = 'Приди, о Дух Святой' WHERE id = 107;
UPDATE songs SET title = 'Приди с высот небесных' WHERE id = 108;
UPDATE songs SET title = 'Пред Твоим лицом' WHERE id = 109;
UPDATE songs SET title = 'Творец мой и Господь!' WHERE id = 110;
UPDATE songs SET title = 'Христос Спаситель, к нам приди' WHERE id = 111;
UPDATE songs SET title = 'Ты веди меня, о, Отче' WHERE id = 112;
UPDATE songs SET title = 'Господь, к Тебе я прихожу' WHERE id = 113;
UPDATE songs SET title = 'Будь милосерд, о, Боже мой' WHERE id = 114;
UPDATE songs SET title = 'Пошли мне силы, Боже мой' WHERE id = 115;
UPDATE songs SET title = 'Научи молиться' WHERE id = 116;
UPDATE songs SET title = 'К Тебе, Господь, мой Дух взывает' WHERE id = 117;
UPDATE songs SET title = 'Я люблю Тебя, Боже' WHERE id = 118;
UPDATE songs SET title = 'Не пройди меня, Спаситель' WHERE id = 119;
UPDATE songs SET title = 'Возьми меня за руки' WHERE id = 120;
UPDATE songs SET title = 'Пребудь в нас с благодатью' WHERE id = 121;
UPDATE songs SET title = 'О, Господь, благодарим' WHERE id = 122;
UPDATE songs SET title = 'Иисус среди скорбей' WHERE id = 123;
UPDATE songs SET title = 'О, слава в вышних Богу' WHERE id = 124;
UPDATE songs SET title = 'Да будет Тебе' WHERE id = 125;
UPDATE songs SET title = 'За все Тебя, Господь, благодарю я' WHERE id = 126;
UPDATE songs SET title = 'О, дивный мой Спаситель' WHERE id = 127;
UPDATE songs SET title = 'Что мой грех мне может смыть?' WHERE id = 128;
UPDATE songs SET title = 'Господь есть мой свет и я не страшусь' WHERE id = 129;
UPDATE songs SET title = 'Слышу я – вновь раздаются' WHERE id = 130;
UPDATE songs SET title = 'Хвала Христу!' WHERE id = 131;
UPDATE songs SET title = 'Чудные минуты' WHERE id = 132;
UPDATE songs SET title = 'От власти греха' WHERE id = 133;
UPDATE songs SET title = 'Умолкни, суета забот' WHERE id = 134;
UPDATE songs SET title = 'В сей день Святой' WHERE id = 135;
UPDATE songs SET title = 'Суббота, данная нам Богом' WHERE id = 136;
UPDATE songs SET title = 'Как сладок день Святой' WHERE id = 137;
UPDATE songs SET title = 'От сна проснувшись рано' WHERE id = 138;
UPDATE songs SET title = 'Боже, пред лицом Твоим' WHERE id = 139;
UPDATE songs SET title = 'От сна восстав' WHERE id = 140;
UPDATE songs SET title = 'День Святой, Ты – радость мне!' WHERE id = 141;
UPDATE songs SET title = 'Как приятно, как чудесно' WHERE id = 142;
UPDATE songs SET title = 'Шесть рабочих дней недели' WHERE id = 143;
UPDATE songs SET title = 'Я знаю место лишь одно' WHERE id = 144;
UPDATE songs SET title = 'Боже, зри, Твои мы дети' WHERE id = 145;
UPDATE songs SET title = 'Зри на нас, о, Боже, свыше' WHERE id = 146;
UPDATE songs SET title = 'В день отрадный' WHERE id = 147;
UPDATE songs SET title = 'Воспряньте от забот' WHERE id = 148;
UPDATE songs SET title = 'Всю неделю' WHERE id = 149;
UPDATE songs SET title = 'С радостным чувством встречаем' WHERE id = 150;
UPDATE songs SET title = 'После суетной недели' WHERE id = 151;
UPDATE songs SET title = 'Когда создал Бог мир' WHERE id = 152;
UPDATE songs SET title = 'Тебе, предвечный, день сей посвящаем' WHERE id = 153;
UPDATE songs SET title = 'Любвеобильный наш Отец' WHERE id = 154;
UPDATE songs SET title = 'Покой и мир блаженный' WHERE id = 155;
UPDATE songs SET title = 'Памятными Бог соделал чудеса' WHERE id = 156;
UPDATE songs SET title = 'Как кратки все ж прекрасные мгновенья' WHERE id = 157;
UPDATE songs SET title = 'Я – венец творенья' WHERE id = 158;
UPDATE songs SET title = 'Взгляните, как сегодня' WHERE id = 159;
UPDATE songs SET title = 'Субботний день Святого ликованья' WHERE id = 160;
UPDATE songs SET title = 'В день Твой субботний' WHERE id = 161;
UPDATE songs SET title = 'Субботний день, Господом данный' WHERE id = 162;
UPDATE songs SET title = 'Чудный, Святой день' WHERE id = 163;
UPDATE songs SET title = 'Аллилуия, день субботний' WHERE id = 164;
UPDATE songs SET title = 'Прекрасный день пришел' WHERE id = 165;
UPDATE songs SET title = 'О, день покоя, счастья' WHERE id = 166;
UPDATE songs SET title = 'В день субботнего покоя' WHERE id = 167;
UPDATE songs SET title = 'Ключ воды живой' WHERE id = 168;
UPDATE songs SET title = 'Странствуя здесь на чужбине' WHERE id = 169;
UPDATE songs SET title = 'Утихни, разум мой' WHERE id = 170;
UPDATE songs SET title = 'Сей день сотворил Господь' WHERE id = 171;
UPDATE songs SET title = 'Святой день господень' WHERE id = 172;
UPDATE songs SET title = 'Прекрасный день господний' WHERE id = 173;
UPDATE songs SET title = 'Ближе, мой Бог, к Тебе' WHERE id = 174;
UPDATE songs SET title = 'Буду петь' WHERE id = 175;
UPDATE songs SET title = 'Стремлюсь к Тебе' WHERE id = 176;
UPDATE songs SET title = 'Господь! Кто может пребывать?' WHERE id = 177;
UPDATE songs SET title = 'Кто хочет и3 вас быть блаженным всегда' WHERE id = 178;
UPDATE songs SET title = 'Что может быть блаженней' WHERE id = 179;
UPDATE songs SET title = 'Господь, я – Твой отныне' WHERE id = 180;
UPDATE songs SET title = 'Хочу Спасителя прославить' WHERE id = 181;
UPDATE songs SET title = 'Нет в жизни большей радости' WHERE id = 182;
UPDATE songs SET title = 'О, Искупитель мой!' WHERE id = 183;
UPDATE songs SET title = 'Господь – моя жизнь' WHERE id = 184;
UPDATE songs SET title = 'Пусть жизнь моя, как яркий свет' WHERE id = 185;
UPDATE songs SET title = 'Господь, душа моя к Тебе стремится' WHERE id = 186;
UPDATE songs SET title = 'С каждым часом ближе' WHERE id = 187;
UPDATE songs SET title = 'За Тобой, о, мой Спаситель' WHERE id = 188;
UPDATE songs SET title = 'Господь ведет меня всегда' WHERE id = 189;
UPDATE songs SET title = 'Лишь за Тобой, Спаситель' WHERE id = 190;
UPDATE songs SET title = 'Если путь Твой мрачный' WHERE id = 191;
UPDATE songs SET title = 'Верь так просто, как дитя' WHERE id = 192;
UPDATE songs SET title = 'О, вера божия Святая' WHERE id = 193;
UPDATE songs SET title = 'Верить' WHERE id = 194;
UPDATE songs SET title = 'Вера есть сила народа' WHERE id = 195;
UPDATE songs SET title = 'Если огорченье' WHERE id = 196;
UPDATE songs SET title = 'Людям волей всеблагою' WHERE id = 197;
UPDATE songs SET title = 'Сокрой свое горе' WHERE id = 198;
UPDATE songs SET title = 'Если Твой Дух утомится' WHERE id = 199;
UPDATE songs SET title = 'Ах, если б мог Ты верить' WHERE id = 200;
UPDATE songs SET title = 'Посмотри, вот дом высоко' WHERE id = 201;
UPDATE songs SET title = 'Не унывай, когда тернист Твой путь' WHERE id = 202;
UPDATE songs SET title = 'В житейском челне' WHERE id = 203;
UPDATE songs SET title = 'Весть отрады' WHERE id = 204;
UPDATE songs SET title = 'Просите, и дано вам будет' WHERE id = 205;
UPDATE songs SET title = 'Жизнь часто мрачна, сера' WHERE id = 206;
UPDATE songs SET title = 'Если крест тяжел порою' WHERE id = 207;
UPDATE songs SET title = 'И холод, и вьюга, и зной' WHERE id = 208;
UPDATE songs SET title = 'О, душа надейся' WHERE id = 209;
UPDATE songs SET title = 'Кто б Ты ни был' WHERE id = 210;
UPDATE songs SET title = 'Несется ангел чудный' WHERE id = 211;
UPDATE songs SET title = 'Иди, куда ведет Тебя' WHERE id = 212;
UPDATE songs SET title = 'Грозно буря жизни стонет' WHERE id = 213;
UPDATE songs SET title = 'Когда порой изнемогаешь' WHERE id = 214;
UPDATE songs SET title = 'Помнишь ли, мой друг' WHERE id = 215;
UPDATE songs SET title = 'И если не поймешь теперь' WHERE id = 216;
UPDATE songs SET title = 'Хоть темен жизни небосклон' WHERE id = 217;
UPDATE songs SET title = 'Если бури жизни стонут' WHERE id = 218;
UPDATE songs SET title = 'Бодрый Духом' WHERE id = 219;
UPDATE songs SET title = 'Вперед чрез все страданья' WHERE id = 220;
UPDATE songs SET title = 'Когда порой мой Дух изнемогает' WHERE id = 221;
UPDATE songs SET title = 'Друзья, мы бодрыми шагами' WHERE id = 222;
UPDATE songs SET title = 'Есть жизнь и во взгляде на крест христов' WHERE id = 223;
UPDATE songs SET title = 'Дружной, радостной семьею' WHERE id = 224;
UPDATE songs SET title = 'В жизненном море' WHERE id = 225;
UPDATE songs SET title = 'О, братья! Здесь Господь наш сам' WHERE id = 226;
UPDATE songs SET title = 'Кто побеждает' WHERE id = 227;
UPDATE songs SET title = 'Когда Божий мир' WHERE id = 228;
UPDATE songs SET title = 'Не ропщи Ты на страданье' WHERE id = 229;
UPDATE songs SET title = 'Блажен, кто с верою' WHERE id = 230;
UPDATE songs SET title = 'В борьбе наш щит' WHERE id = 231;
UPDATE songs SET title = 'Господь мой – путь' WHERE id = 232;
UPDATE songs SET title = 'Если мрак греховной бури' WHERE id = 233;
UPDATE songs SET title = 'Пускай шумят морские волны' WHERE id = 234;
UPDATE songs SET title = 'Если больно Тебе' WHERE id = 235;
UPDATE songs SET title = 'Научи меня, Боже, молиться' WHERE id = 236;
UPDATE songs SET title = 'Любить, любить' WHERE id = 237;
UPDATE songs SET title = 'Когда Тебя Твой Дух смущает' WHERE id = 238;
UPDATE songs SET title = 'Чем я воздам Тебе, Спаситель' WHERE id = 239;
UPDATE songs SET title = 'О, Боже, Боже, дай мне силы' WHERE id = 240;
UPDATE songs SET title = 'Если б мудрость' WHERE id = 241;
UPDATE songs SET title = 'Я хочу, мой Спаситель, любить' WHERE id = 242;
UPDATE songs SET title = 'Господь, Тебя люблю' WHERE id = 243;
UPDATE songs SET title = 'Всем умом Тебя, всем помышленьем' WHERE id = 244;
UPDATE songs SET title = 'Мы – верные слуги христовы' WHERE id = 245;
UPDATE songs SET title = 'Одна листва, но нет плода' WHERE id = 246;
UPDATE songs SET title = 'Добровольцы мы!' WHERE id = 247;
UPDATE songs SET title = 'С гренландии' WHERE id = 248;
UPDATE songs SET title = 'Слуги христовы' WHERE id = 249;
UPDATE songs SET title = 'О, Дух свидетелей христовых' WHERE id = 250;
UPDATE songs SET title = 'О, Божий раб, иди на труд' WHERE id = 251;
UPDATE songs SET title = 'Слышите ль господень призыв?' WHERE id = 252;
UPDATE songs SET title = 'Богу слава и хваленье' WHERE id = 253;
UPDATE songs SET title = 'Воспряньте, братья' WHERE id = 254;
UPDATE songs SET title = 'С берегов далеких стран' WHERE id = 255;
UPDATE songs SET title = 'Все к труду! Вы господень народ' WHERE id = 256;
UPDATE songs SET title = 'Верные слуги Господа' WHERE id = 257;
UPDATE songs SET title = 'Иди в виноградник' WHERE id = 258;
UPDATE songs SET title = 'Великую пользу в труде' WHERE id = 259;
UPDATE songs SET title = 'Воины христовы, выйдем смело в бой' WHERE id = 260;
UPDATE songs SET title = 'Вперед, Божий раб!' WHERE id = 261;
UPDATE songs SET title = 'О, где же жнецы?' WHERE id = 262;
UPDATE songs SET title = 'Воины рати христовой' WHERE id = 263;
UPDATE songs SET title = 'Все к труду, все к труду! О, вы, слуги Творца' WHERE id = 264;
UPDATE songs SET title = 'Кто с слезами сеет, радость, пожинает' WHERE id = 265;
UPDATE songs SET title = 'О, воин христов' WHERE id = 266;
UPDATE songs SET title = 'Шел сеятель с зернами' WHERE id = 267;
UPDATE songs SET title = 'Вспомним, братья' WHERE id = 268;
UPDATE songs SET title = 'Дни жизни' WHERE id = 269;
UPDATE songs SET title = 'Воины христовы' WHERE id = 270;
UPDATE songs SET title = 'Стражи Сиона, вы громче трубите' WHERE id = 271;
UPDATE songs SET title = 'Неверья ночь все обняла' WHERE id = 272;
UPDATE songs SET title = 'Господь за нас: мы устоим' WHERE id = 273;
UPDATE songs SET title = 'Господь Спаситель, Ты свой труд' WHERE id = 274;
UPDATE songs SET title = 'Мир погибающий нас окружает' WHERE id = 275;
UPDATE songs SET title = 'Я вас призвал' WHERE id = 276;
UPDATE songs SET title = 'Над землею и морями' WHERE id = 277;
UPDATE songs SET title = 'С небес лазурных ангел сходит' WHERE id = 278;
UPDATE songs SET title = 'О, смертный, внимай' WHERE id = 279;
UPDATE songs SET title = 'И для нас пора настала' WHERE id = 280;
UPDATE songs SET title = 'Народы, люди, племена' WHERE id = 281;
UPDATE songs SET title = 'Во всех краях земли' WHERE id = 282;
UPDATE songs SET title = 'Путь ко спасенью' WHERE id = 283;
UPDATE songs SET title = 'Слышишь весть, что раздается?' WHERE id = 284;
UPDATE songs SET title = 'Иисус Спаситель, умер Ты за всех' WHERE id = 285;
UPDATE songs SET title = 'Во святилище небесном' WHERE id = 286;
UPDATE songs SET title = 'О, дети божии, взирайте!' WHERE id = 287;
UPDATE songs SET title = 'Простерты его руки' WHERE id = 288;
UPDATE songs SET title = 'Места нет для Иисуса' WHERE id = 289;
UPDATE songs SET title = 'О, Дух гордыни' WHERE id = 290;
UPDATE songs SET title = 'Богатство мира, друг, не вечно' WHERE id = 291;
UPDATE songs SET title = 'Прохожий у дверей стоит' WHERE id = 292;
UPDATE songs SET title = 'Куда, усталый путник мой' WHERE id = 293;
UPDATE songs SET title = 'Иди за мной, иди моей тропою!' WHERE id = 294;
UPDATE songs SET title = 'Два пути перед Тобою' WHERE id = 295;
UPDATE songs SET title = 'Ласково, нежно Спаситель взывает' WHERE id = 296;
UPDATE songs SET title = 'За Христом последуй' WHERE id = 297;
UPDATE songs SET title = 'Хозяин добрый и радушный' WHERE id = 298;
UPDATE songs SET title = 'К Тебе, о, друг' WHERE id = 299;
UPDATE songs SET title = 'Я знаю ручей' WHERE id = 300;
UPDATE songs SET title = 'Слушай, мой друг' WHERE id = 301;
UPDATE songs SET title = 'Вдали от отчизны' WHERE id = 302;
UPDATE songs SET title = 'Пора Тебе уж пробудиться' WHERE id = 303;
UPDATE songs SET title = 'Вот пред Тобою два пути' WHERE id = 304;
UPDATE songs SET title = 'Вестью дивною' WHERE id = 305;
UPDATE songs SET title = 'Пробудись от сна, друг бедный' WHERE id = 306;
UPDATE songs SET title = 'Приди ко мне, мой друг' WHERE id = 307;
UPDATE songs SET title = 'Вернись, вернись!' WHERE id = 308;
UPDATE songs SET title = 'О, друг мой, грешник бедный' WHERE id = 309;
UPDATE songs SET title = 'Ты скорбел не раз жестоко' WHERE id = 310;
UPDATE songs SET title = 'Друг, поверь словам господним' WHERE id = 311;
UPDATE songs SET title = 'Я слышу нежный зов Христа' WHERE id = 312;
UPDATE songs SET title = 'Таков, как есмь, исполнен зла' WHERE id = 313;
UPDATE songs SET title = 'О, слово дорогое' WHERE id = 314;
UPDATE songs SET title = 'Все, кто сердцем убежденный' WHERE id = 315;
UPDATE songs SET title = 'С упованьем и верою взглянь на Христа' WHERE id = 316;
UPDATE songs SET title = 'Был верный пророк даниил' WHERE id = 317;
UPDATE songs SET title = 'К свободе призваны' WHERE id = 318;
UPDATE songs SET title = 'Христос, пришед в наш мир, учил' WHERE id = 319;
UPDATE songs SET title = 'Слышите, злобу мы будим' WHERE id = 320;
UPDATE songs SET title = 'Наш Господь и Творец всеблагой' WHERE id = 321;
UPDATE songs SET title = 'Сторож, скажи' WHERE id = 322;
UPDATE songs SET title = 'Какой ужасный мрак' WHERE id = 323;
UPDATE songs SET title = 'Вот мрак покроет землю' WHERE id = 324;
UPDATE songs SET title = 'Стражи на стенах Сиона' WHERE id = 325;
UPDATE songs SET title = 'Стражи верные вещают' WHERE id = 326;
UPDATE songs SET title = 'О друг, открой же очи' WHERE id = 327;
UPDATE songs SET title = 'Вавилона повелитель' WHERE id = 328;
UPDATE songs SET title = 'Вам, племена, языки и народы' WHERE id = 329;
UPDATE songs SET title = 'Все наблюдайте знаки' WHERE id = 330;
UPDATE songs SET title = 'Раздается весть благая' WHERE id = 331;
UPDATE songs SET title = 'Люди мира о вселенной' WHERE id = 332;
UPDATE songs SET title = 'О, смотрите!, время потоком льет' WHERE id = 333;
UPDATE songs SET title = 'Валтасар пир устроил' WHERE id = 334;
UPDATE songs SET title = 'В день, когда труба господня' WHERE id = 335;
UPDATE songs SET title = 'Быть может, и в час' WHERE id = 336;
UPDATE songs SET title = 'Рассветает свет с востока' WHERE id = 337;
UPDATE songs SET title = 'О, подумай, друг, об этом' WHERE id = 338;
UPDATE songs SET title = 'Владыка жизни у дверей' WHERE id = 339;
UPDATE songs SET title = 'Не знает никто' WHERE id = 340;
UPDATE songs SET title = 'Внемли, вот весть Господь дает' WHERE id = 341;
UPDATE songs SET title = 'Когда ж пробьет нам час?' WHERE id = 342;
UPDATE songs SET title = 'День господень наступает' WHERE id = 343;
UPDATE songs SET title = 'Пред нами, братья, иордан' WHERE id = 344;
UPDATE songs SET title = 'Как быстро день за днем летит' WHERE id = 345;
UPDATE songs SET title = 'В день последний воскресенья' WHERE id = 346;
UPDATE songs SET title = 'Затрубит труба господня' WHERE id = 347;
UPDATE songs SET title = 'Скоро наш Искупитель придет' WHERE id = 348;
UPDATE songs SET title = 'Громко трубите' WHERE id = 349;
UPDATE songs SET title = 'В вечной родине Святой' WHERE id = 350;
UPDATE songs SET title = 'Томлюсь я в хижине телесной' WHERE id = 351;
UPDATE songs SET title = 'В чудный край, дивный край' WHERE id = 352;
UPDATE songs SET title = 'По волнам земных невзгод' WHERE id = 353;
UPDATE songs SET title = 'Как стремлюсь я' WHERE id = 354;
UPDATE songs SET title = 'Не богатство земное' WHERE id = 355;
UPDATE songs SET title = 'Я стремлюсь лишь к жизни вечной' WHERE id = 356;
UPDATE songs SET title = 'О, брат, мой куда так стремишься?' WHERE id = 357;
UPDATE songs SET title = 'Вся тварь, и небо, и земля' WHERE id = 358;
UPDATE songs SET title = 'Над кристальною рекою' WHERE id = 359;
UPDATE songs SET title = 'Я – странник на земле' WHERE id = 360;
UPDATE songs SET title = 'Кто мне укажет путь?' WHERE id = 361;
UPDATE songs SET title = 'К небесам, к небесам' WHERE id = 362;
UPDATE songs SET title = 'Хочу домой' WHERE id = 363;
UPDATE songs SET title = 'Вот в пристани небесной' WHERE id = 364;
UPDATE songs SET title = 'Как дивны мудрые пути' WHERE id = 365;
UPDATE songs SET title = 'Быть вместе со Христом' WHERE id = 366;
UPDATE songs SET title = 'Мы под охраною Бога плывем' WHERE id = 367;
UPDATE songs SET title = 'Источник вечной жизни' WHERE id = 368;
UPDATE songs SET title = 'Выйди из родного края' WHERE id = 369;
UPDATE songs SET title = 'На пути к чудной родине Святой' WHERE id = 370;
UPDATE songs SET title = 'В земных предметах нет отрады' WHERE id = 371;
UPDATE songs SET title = 'Кто, кто сии?' WHERE id = 372;
UPDATE songs SET title = 'Я читал описание града' WHERE id = 373;
UPDATE songs SET title = 'Верой мы ожидаем страну' WHERE id = 374;
UPDATE songs SET title = 'Обетование Христа' WHERE id = 375;
UPDATE songs SET title = 'Свет после мрака' WHERE id = 376;
UPDATE songs SET title = 'Теперь нам скорби неизбежны' WHERE id = 377;
UPDATE songs SET title = 'О, город вечной красоты!' WHERE id = 378;
UPDATE songs SET title = 'Есть вечной радости страна' WHERE id = 379;
UPDATE songs SET title = 'Верных Богу ожидает' WHERE id = 380;
UPDATE songs SET title = 'Я знаю святую обитель' WHERE id = 381;
UPDATE songs SET title = 'О, как радостно нам слышать' WHERE id = 382;
UPDATE songs SET title = 'Песнь споем о стране' WHERE id = 383;
UPDATE songs SET title = 'Чудные, райские нивы' WHERE id = 384;
UPDATE songs SET title = 'Мы у источника спасенья' WHERE id = 385;
UPDATE songs SET title = 'Как невеста' WHERE id = 386;
UPDATE songs SET title = 'Хоть я странник' WHERE id = 387;
UPDATE songs SET title = 'Будьте бодры' WHERE id = 388;
UPDATE songs SET title = 'Господь израиля призвал' WHERE id = 389;
UPDATE songs SET title = 'В чудесном символе жены' WHERE id = 390;
UPDATE songs SET title = 'О, нет, никто' WHERE id = 391;
UPDATE songs SET title = 'Стройно шествуем' WHERE id = 392;
UPDATE songs SET title = 'Вестник Божий, облеченный' WHERE id = 393;
UPDATE songs SET title = 'Через волны океана' WHERE id = 394;
UPDATE songs SET title = 'У реки, у иордана' WHERE id = 395;
UPDATE songs SET title = 'Я стою у иордана' WHERE id = 396;
UPDATE songs SET title = 'Вот и славный час крещенья' WHERE id = 397;
UPDATE songs SET title = 'Я принял сие крещенье' WHERE id = 398;
UPDATE songs SET title = 'Блаженный день, в который я' WHERE id = 399;
UPDATE songs SET title = 'Ликуй, пой в восторге' WHERE id = 400;
UPDATE songs SET title = 'Ты нам свои веленья' WHERE id = 401;
UPDATE songs SET title = 'Хвала Тебе, Отец благой' WHERE id = 402;
UPDATE songs SET title = 'Блажен, кто в смерть Христа крещен' WHERE id = 403;
UPDATE songs SET title = 'Я милосердие постиг' WHERE id = 404;
UPDATE songs SET title = 'О, Боже, с любовью' WHERE id = 405;
UPDATE songs SET title = 'Господь, Ты полн смиренья' WHERE id = 406;
UPDATE songs SET title = 'Смотри, Творец небес' WHERE id = 407;
UPDATE songs SET title = 'Спаситель, мы собрались вновь' WHERE id = 408;
UPDATE songs SET title = 'Для рук христианина' WHERE id = 409;
UPDATE songs SET title = 'Смотрите, Агнец Божий' WHERE id = 410;
UPDATE songs SET title = 'Уж близок был страданий час' WHERE id = 411;
UPDATE songs SET title = 'Страданья час' WHERE id = 412;
UPDATE songs SET title = 'Боже, на Твоей вечери' WHERE id = 413;
UPDATE songs SET title = 'Боже, Тобою мы собраны снова' WHERE id = 414;
UPDATE songs SET title = 'Благодарим Тебя, наш Бог' WHERE id = 415;
UPDATE songs SET title = 'Принесите десятины' WHERE id = 416;
UPDATE songs SET title = 'С дарами все предстали' WHERE id = 417;
UPDATE songs SET title = 'Пусть этот дар' WHERE id = 418;
UPDATE songs SET title = 'О, Боже добрый' WHERE id = 419;
UPDATE songs SET title = 'Спаситель мой, к Тебе иду' WHERE id = 420;
UPDATE songs SET title = 'Отец небесный, о, внемли' WHERE id = 421;
UPDATE songs SET title = 'Господь, врагов моих так много' WHERE id = 422;
UPDATE songs SET title = 'С Спасителем в сердце' WHERE id = 423;
UPDATE songs SET title = 'Спаситель, Ты – свет жизни' WHERE id = 424;
UPDATE songs SET title = 'Снова туманный вечер настает' WHERE id = 425;
UPDATE songs SET title = 'Я устал, пошли покой!' WHERE id = 426;
UPDATE songs SET title = 'Я с именем Твоим' WHERE id = 427;
UPDATE songs SET title = 'Кто юн душой' WHERE id = 428;
UPDATE songs SET title = 'Блажен тот дом' WHERE id = 429;
UPDATE songs SET title = 'Как любящ Господь!' WHERE id = 430;
UPDATE songs SET title = 'Юность, с кротостью смиренной' WHERE id = 431;
UPDATE songs SET title = 'Бог есть любовь (ii)' WHERE id = 432;
UPDATE songs SET title = 'Юность жизни – дар бесценный' WHERE id = 433;
UPDATE songs SET title = 'Юноши, слышите ль?' WHERE id = 434;
UPDATE songs SET title = 'Учитесь, юноши и дети' WHERE id = 435;
UPDATE songs SET title = 'Дети, поспешите' WHERE id = 436;
UPDATE songs SET title = 'Маленькие капли' WHERE id = 437;
UPDATE songs SET title = 'Дети малые, внимайте!' WHERE id = 438;
UPDATE songs SET title = 'Друг, помни о создателе' WHERE id = 439;
UPDATE songs SET title = 'Любит мой Иисус меня' WHERE id = 440;
UPDATE songs SET title = 'Хоть я малое дитя' WHERE id = 441;
UPDATE songs SET title = 'Не суди другого' WHERE id = 442;
UPDATE songs SET title = 'Там с высот небесных' WHERE id = 443;
UPDATE songs SET title = 'Мой Христос Спаситель' WHERE id = 444;
UPDATE songs SET title = 'Славьте, народы' WHERE id = 445;
UPDATE songs SET title = 'Как люблю я Иисуса!' WHERE id = 446;
UPDATE songs SET title = 'Осанна!' WHERE id = 447;
UPDATE songs SET title = 'Христос, приди!' WHERE id = 448;
UPDATE songs SET title = 'Не хорошо быть человеку одному' WHERE id = 449;
UPDATE songs SET title = 'Не хорошо быть одному' WHERE id = 450;
UPDATE songs SET title = 'О, Господь, благослови' WHERE id = 451;
UPDATE songs SET title = 'За щедрый дар, что нам дал вновь' WHERE id = 452;
UPDATE songs SET title = 'Хвалу, Господь, Тебе приносим' WHERE id = 453;
UPDATE songs SET title = 'Верно Божье изреченье' WHERE id = 454;
UPDATE songs SET title = 'Спокойно спи' WHERE id = 455;
UPDATE songs SET title = 'Спи тихим безмятежным сном' WHERE id = 456;
UPDATE songs SET title = 'Дорогие мгновенья' WHERE id = 457;
UPDATE songs SET title = 'Итак, расстанемся с Тобой' WHERE id = 458;
UPDATE songs SET title = 'Как хорошо и как приятно' WHERE id = 459;
UPDATE songs SET title = 'Как быстро время пролетело' WHERE id = 460;
UPDATE songs SET title = 'Торжествуйте, сестры, братья!' WHERE id = 461;
UPDATE songs SET title = 'Боже, здесь стоит Твой раб' WHERE id = 462;
UPDATE songs SET title = 'Бог с Тобой, доколе встретимся' WHERE id = 463;
UPDATE songs SET title = 'Мы посвящаем этот дом' WHERE id = 464;
UPDATE songs SET title = 'Истина, любовь Святая' WHERE id = 465;
UPDATE songs SET title = 'Благодарю Тебя, Господь' WHERE id = 466;
UPDATE songs SET title = 'Вперед, вперед идем мы в новый год' WHERE id = 467;
UPDATE songs SET title = 'Тяжкую годину' WHERE id = 468;
UPDATE songs SET title = 'Да, Бог был благ!' WHERE id = 470;
UPDATE songs SET title = 'Доныне с нами Бог пребыл' WHERE id = 471;
UPDATE songs SET title = 'Вот светлая весна пришла' WHERE id = 472;
UPDATE songs SET title = 'О, чудная пора' WHERE id = 473;
UPDATE songs SET title = 'После зимы, после холода' WHERE id = 474;
UPDATE songs SET title = 'Склонилось солнце' WHERE id = 475;
UPDATE songs SET title = 'Снова осень наступила' WHERE id = 476;
UPDATE songs SET title = 'Лист деревьев увядает' WHERE id = 477;
UPDATE songs SET title = 'Хвалите Господа все народы' WHERE id = 478;
UPDATE songs SET title = 'Как усталый путник' WHERE id = 479;
UPDATE songs SET title = 'Воспойте Господу новую песнь' WHERE id = 480;
UPDATE songs SET title = 'Вся земля прославь' WHERE id = 481;
UPDATE songs SET title = 'Отче наш (i)' WHERE id = 482;
UPDATE songs SET title = 'Все небо славит' WHERE id = 483;
UPDATE songs SET title = 'Предвечный Бог' WHERE id = 484;
UPDATE songs SET title = 'Господь есть мой свет и спасенье мое' WHERE id = 485;
UPDATE songs SET title = 'В беспредельный эфир' WHERE id = 486;
UPDATE songs SET title = 'Отче наш (ii)' WHERE id = 487;
UPDATE songs SET title = 'Готово сердце мое, Боже' WHERE id = 488;
UPDATE songs SET title = 'Се, стою я у дверей' WHERE id = 489;
UPDATE songs SET title = 'Господь, Господь, Ты – щит' WHERE id = 490;
UPDATE songs SET title = 'Господь – мой пастырь' WHERE id = 491;
UPDATE songs SET title = 'Возвожу очи мои к горам' WHERE id = 492;
UPDATE songs SET title = 'О, Господь, мой Искупитель' WHERE id = 493;
UPDATE songs SET title = 'Услышь, Христос, мое моленье' WHERE id = 494;
UPDATE songs SET title = 'О, Ты, кого хвалить не смею!' WHERE id = 495;
UPDATE songs SET title = 'Молю Тебя, Господь, прости' WHERE id = 496;
UPDATE songs SET title = 'Господи, не в ярости Твоей' WHERE id = 497;
UPDATE songs SET title = 'Аллилуйя, аллилуйя!' WHERE id = 498;
UPDATE songs SET title = 'Стучася, у двери Твоей я стою' WHERE id = 499;
UPDATE songs SET title = '"приди ко мне", - Господь зовет' WHERE id = 500;
UPDATE songs SET title = 'Тесны ворота, узок тот путь' WHERE id = 501;
UPDATE songs SET title = 'О, человек, смотри!' WHERE id = 502;
UPDATE songs SET title = 'Как счастлив я' WHERE id = 503;
UPDATE songs SET title = 'Плыви, мой челн!' WHERE id = 504;
UPDATE songs SET title = 'О, друг, торопись' WHERE id = 505;
UPDATE songs SET title = 'Все вперед, работники Христа!' WHERE id = 506;
UPDATE songs SET title = 'О, церковь Божья, ободрись!' WHERE id = 507;
UPDATE songs SET title = 'Братья, вперед!' WHERE id = 508;
UPDATE songs SET title = 'Восстань, восстань!' WHERE id = 509;
UPDATE songs SET title = 'Славьте Бога с торжеством!' WHERE id = 510;
UPDATE songs SET title = 'Знамя церкви' WHERE id = 511;
UPDATE songs SET title = 'Вперед, во имя Бога!' WHERE id = 512;
UPDATE songs SET title = 'Сеется семя' WHERE id = 513;
UPDATE songs SET title = 'Блаженны вы, друзья и братья' WHERE id = 514;
UPDATE songs SET title = 'Три дара чудесных' WHERE id = 515;
UPDATE songs SET title = 'Там, где Иисус распятым был' WHERE id = 516;
UPDATE songs SET title = 'Мыслю я о стране' WHERE id = 517;
UPDATE songs SET title = 'Субботний мир, как дорог Ты!' WHERE id = 518;
UPDATE songs SET title = 'Вставайте, проснитесь!' WHERE id = 519;
UPDATE songs SET title = 'Сегодня день Святой' WHERE id = 520;
UPDATE songs SET title = 'Забудь мирское и субботу чти' WHERE id = 521;
UPDATE songs SET title = 'Сион наш прекрасен' WHERE id = 522;
UPDATE songs SET title = 'Иерусалим, мой дом родной!' WHERE id = 523;
UPDATE songs SET title = 'Славный час венчанья наступил' WHERE id = 524;
UPDATE songs SET title = 'О, отчизна, край отрадный' WHERE id = 525;
