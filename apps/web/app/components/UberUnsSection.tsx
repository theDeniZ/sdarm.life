export default function UberUnsSection() {
  return (
    <section className="uber-uns-section" id="ueber-uns">
      <div className="uber-uns-header">
        <div className="uber-uns-eyebrow">Wer wir sind</div>
        <h2 className="uber-uns-title">
          Über <em>uns</em>
        </h2>
        <p className="uber-uns-subtitle">
          Eine Gemeinschaft, die fest im Wort Gottes verwurzelt ist — treu der Reformation, verbunden in Glaube,
          Hoffnung und Liebe.
        </p>
      </div>

      <div className="uber-uns-grid">
        <div className="uber-uns-card">
          <div className="uber-uns-card-num">01</div>
          <div className="uber-uns-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="uber-uns-card-title">Unsere Glaubensgrundlage</div>
          <p className="uber-uns-card-text">
            Wir glauben an die vollständige Autorität der Heiligen Schrift als Grundlage aller Lehre und des Lebens. Die
            Bibel ist unser einziger Maßstab für Glauben und Praxis — unveränderlich und zeitlos.
          </p>
        </div>

        <div className="uber-uns-card">
          <div className="uber-uns-card-num">02</div>
          <div className="uber-uns-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="uber-uns-card-title">Der Siebente Tag</div>
          <p className="uber-uns-card-text">
            Wir halten den biblischen Schabbat — den siebenten Tag der Woche — als heiligen Ruhetag, wie es Gott seit
            der Schöpfung eingesetzt und in den Zehn Geboten befohlen hat.
          </p>
        </div>

        <div className="uber-uns-card">
          <div className="uber-uns-card-num">03</div>
          <div className="uber-uns-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div className="uber-uns-card-title">Gemeinschaft &amp; Reformation</div>
          <p className="uber-uns-card-text">
            Als Reformationsbewegung innerhalb der Adventgemeinde setzen wir uns für eine vollständige Rückkehr zu den
            Grundsätzen der Bibel ein — in Lehre, Lebensstil und Gottesdienst.
          </p>
        </div>
      </div>

      <div className="uber-uns-quote">
        <div className="uber-uns-quote-mark">&ldquo;</div>
        <div>
          <div className="uber-uns-quote-text">
            Zur Weisung und zum Zeugnis! Wenn sie nicht nach diesem Wort reden, so ist keine Morgenröte für sie.
            <span className="uber-uns-quote-source">Jesaja 8,20</span>
          </div>
        </div>
      </div>
    </section>
  );
}
