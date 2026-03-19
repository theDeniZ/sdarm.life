import type { ReactNode } from 'react';

export interface ScriptureVerseSectionProps {
  eyebrow?: string;
  text: ReactNode;
  reference: string;
  href?: string;
}

export default function ScriptureVerseSection({ eyebrow, text, reference, href }: ScriptureVerseSectionProps) {
  const inner = (
    <section className="scripture-verse">
      <div className="scripture-verse-inner">
        <div className="scripture-verse-accent">
          <div className="scripture-verse-bar" />
          <div className="scripture-verse-glyph">&ldquo;</div>
        </div>
        <div className="scripture-verse-body">
          {eyebrow && <div className="scripture-verse-eyebrow">{eyebrow}</div>}
          <p className="scripture-verse-text">{text}</p>
          <div className="scripture-verse-ref">{reference}</div>
        </div>
      </div>
    </section>
  );

  if (href) {
    return (
      <a href={href} className="scripture-verse-link">
        {inner}
      </a>
    );
  }
  return inner;
}
