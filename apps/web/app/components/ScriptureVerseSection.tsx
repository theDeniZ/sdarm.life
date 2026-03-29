import { ScriptureVerseSection as SharedScriptureVerseSection } from '@sdarm/ui';

export default function ScriptureVerseSection({ href }: { href?: string }) {
  return (
    <SharedScriptureVerseSection
      eyebrow="Wort der Woche"
      text={
        <>
          Hier ist die Geduld der Heiligen,
          <br />
          die da halten die Gebote Gottes
          <br />
          und den Glauben an Jesus.
        </>
      }
      reference="Offenbarung 14,12"
      href={href}
    />
  );
}
