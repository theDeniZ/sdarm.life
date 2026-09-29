import { details, emailDocument, headline, legalFooter, row, small } from './layout';

// Internal notification to info@sdarm.life for a free-book request from the
// treasures site. German only (one reader), no subscription footer. Every value
// is visitor input and goes through `details()`, which escapes it.

export interface BookRequestFields {
	name: string;
	email: string;
	phone?: string;
	land: string;
	street: string;
	plz: string;
	city: string;
	religion?: string;
	books: string[];
	wish?: string;
}

export function bookRequestSubject(f: Pick<BookRequestFields, 'name' | 'land'>): string {
	return `Buchanfrage von ${f.name} (${f.land})`;
}

export function bookRequestEmail(f: BookRequestFields): string {
	const rows: [string, string][] = [
		['Name', f.name],
		['E-Mail', f.email],
		['Telefon', f.phone ?? '—'],
		['Land', f.land],
		['Straße', f.street],
		['PLZ', f.plz],
		['Stadt', f.city],
		['Hintergrund', f.religion ?? '—'],
		['Bücher', f.books.join(', ')],
		['Wunsch', f.wish ?? '—'],
	];
	return emailDocument({
		locale: 'de',
		title: bookRequestSubject(f),
		body: row(
			`${headline('Neue *Buchanfrage*')}${details(rows, 32)}${small('Eine Antwort auf diese E-Mail geht direkt an die anfragende Person.', 24)}`,
		),
		footer: legalFooter('de'),
	});
}
