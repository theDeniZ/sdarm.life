/* Where the lesson and the Bible come from.
 *
 * The original page fetched app.sdarm.org straight from the browser. That hands
 * every reader's IP to a third party on page load, which docs/dsgvo.md forbids
 * outright, so both files now travel through our own Worker
 * (apps/api/src/routes/sbl.ts), which fetches upstream server-side and caches
 * the answer at the edge. Nothing else about the payload changes: what arrives
 * here is byte-for-byte the JSON app.sdarm.org serves.
 */

export function quarterUrl(apiUrl: string, lang: string, year: number, quarter: number): string {
  return `${apiUrl}/sbl/quarter/${lang}/${year}/${quarter}`;
}

export function bibleUrl(apiUrl: string, version: string): string {
  return `${apiUrl}/sbl/bible/${version}`;
}
