import Image from 'next/image';

export default function AboutSection() {
  return (
    <div id="ueber-uns" className="section-block">
      <div className="section-label">Über uns</div>
      <div>
        <div className="about-grid">
          <a className="img16" href="https://sdarm.life" style={{ position: 'relative' }}>
            <Image
              src="https://images.unsplash.com/photo-1438232992991-995b671e5cdf?w=800&q=85&fit=crop"
              alt="Gemeinde betet"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </a>
          <div className="about-text" style={{ alignSelf: 'center' }}>
            <p>
              sdarm.life ist der lokale Onlineauftritt der Siebenten-Tags-Adventisten
              Reformationsbewegung in Deutschland — Teil der weltweiten Gemeinschaft unter{' '}
              <a href="https://sdarm.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)' }}>
                sdarm.org
              </a>
              .
            </p>
            <p>
              Unsere Gemeinde entstand als Ort der geistlichen Erneuerung — für Menschen, die
              biblische Wahrheit, den Sabbat und die Botschaft der Reformation ernst nehmen.
            </p>
            <a
              href="https://sdarm.org/about-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="red-link"
            >
              Mehr erfahren → sdarm.org
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
