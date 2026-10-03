/**
 * The SDARM.life wordmark for the API's HTML outputs: the email layout and the
 * OG card. The API cannot load @sdarm/ui's styles/wordmark.css, so this mirrors
 * it inline: Cormorant Garamond Bold with 0.04em between the letters of "SDARM",
 * ".life" in Bold Italic, untracked, in gold. Tracking is written in px
 * (0.04 × size) because not every mail client resolves em in letter-spacing.
 *
 * Where Cormorant is missing (mail clients) the stack falls to Georgia, then
 * Times New Roman, in the same weight and italic.
 */
export const WORDMARK_FONT = "'Cormorant Garamond',Georgia,'Times New Roman',serif";

export interface WordmarkOptions {
	/** Font size in px. */
	size: number;
	/** Colour of "SDARM": the surface's primary text colour. */
	strong: string;
	/** Colour of ".life": the brand gold for the surface's theme. */
	gold: string;
	/** Optional classes, e.g. the email's light-scheme colour swaps. */
	strongClass?: string;
	goldClass?: string;
}

/** Two inline spans — "SDARM" and ".life" — ready to place in a link or a flex row. */
export function wordmarkHtml(o: WordmarkOptions): string {
	const cls = (c?: string) => (c ? ` class="${c}"` : '');
	const face = `font-family:${WORDMARK_FONT};font-size:${o.size}px;font-weight:700;`;
	const tracking = Math.round(o.size * 0.04 * 100) / 100;
	return (
		`<span${cls(o.strongClass)} style="${face}font-style:normal;letter-spacing:${tracking}px;color:${o.strong};">SDARM</span>` +
		`<span${cls(o.goldClass)} style="${face}font-style:italic;letter-spacing:0;color:${o.gold};">.life</span>`
	);
}
