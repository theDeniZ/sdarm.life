/**
 * The site's wordmark, set as the navbar logo in `packages/ui` is: «SDARM» in
 * Cormorant Garamond 700, «.life» in its italic. One component for every
 * place the projector shows it — the console header, the corner of every
 * slide and the black-out screen — so it is identical everywhere; only the
 * colour of «.life» (`--wordmark-accent`) follows the theme.
 */
export default function Wordmark({ className, decorative }: { className?: string; decorative?: boolean }) {
  return (
    <span className={`sdarm-wordmark${className ? ` ${className}` : ''}`} aria-hidden={decorative || undefined}>
      SDARM<span>.life</span>
    </span>
  );
}
