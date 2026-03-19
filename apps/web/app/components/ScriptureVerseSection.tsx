export default function ScriptureVerseSection() {
  return (
    <a href="/schaetze" className="scripture-verse-link">
      <section className="scripture-verse">
        <div className="scripture-verse-inner">
          <div className="scripture-verse-accent">
            <div className="scripture-verse-bar" />
            <div className="scripture-verse-glyph">&ldquo;</div>
          </div>
          <div className="scripture-verse-body">
            <div className="scripture-verse-eyebrow">Wort der Woche</div>
            <p className="scripture-verse-text">
              Hier ist die Geduld der Heiligen,
              <br />
              die da halten die Gebote Gottes
              <br />
              und den Glauben an Jesus.
            </p>
            <div className="scripture-verse-ref">Offenbarung 14,12</div>
          </div>
        </div>
      </section>
    </a>
  );
}
