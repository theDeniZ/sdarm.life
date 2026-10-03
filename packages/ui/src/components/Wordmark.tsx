/**
 * The SDARM.life wordmark — the one markup every React surface renders.
 * Face, weight, tracking and the gold italic ".life" come from styles/wordmark.css;
 * size and the colour of "SDARM" are inherited from the element it sits in.
 * `decorative` hides it from assistive tech where it only repeats the page's
 * own name (the corner of a projector slide).
 */
export default function Wordmark({ className, decorative }: { className?: string; decorative?: boolean }) {
  return (
    <span className={className ? `wordmark ${className}` : 'wordmark'} aria-hidden={decorative || undefined}>
      SDARM<span className="wordmark__life">.life</span>
    </span>
  );
}
