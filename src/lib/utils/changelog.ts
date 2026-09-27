/**
 * Jäsentää `src/lib/content/changelog.md`:n sivuston omaan muutoslokiin
 * (footerin "Muutosloki"-linkki, ks. Footer.svelte ja ChangelogDialog.svelte).
 * UUSI 27.9.2026, käyttäjän pyynnöstä.
 *
 * Tarkoituksella EI täyttä Markdown-parseria/uutta riippuvuutta — muoto on
 * rajattu kahteen rivityyppiin (ks. changelog.md:n oma kommentti):
 *   `## PP.K.VVVV HH:MM`  -> uusi julkaisu, sama pvm/klo-muoto kuin API:n
 *                            omissa kisapäivämäärissä, joten `parseHelsinki
 *                            DateTime` (jo olemassa, ks. helsinkiTime.ts)
 *                            kelpaa AIVAN SELLAISENAAN eikä päivämäärän
 *                            jäsentämistä tarvinnut keksiä uudelleen.
 *   `- teksti`            -> yksi muutoskohta edellisen otsikon alla.
 * Tiedoston OMA järjestys (uusin ylimpänä) on totuus, ei järjestetä
 * uudelleen täällä.
 */
import { parseHelsinkiDateTime } from './helsinkiTime.ts';
import changelogSource from '../content/changelog.md?raw';

export interface ChangelogEntry {
	/** `undefined` VAIN jos otsikkorivin pvm/klo ei jostain syystä jäsenny — rivi näytetään silti, otsikko jää tyhjäksi ennemmin kuin kaataa koko lokin. */
	date: Date | undefined;
	items: string[];
}

export function parseChangelog(source: string): ChangelogEntry[] {
	const entries: ChangelogEntry[] = [];
	let current: ChangelogEntry | undefined;

	for (const line of source.split('\n')) {
		const headingMatch = line.match(/^##\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+(\d{1,2}:\d{2})/);
		if (headingMatch) {
			current = { date: parseHelsinkiDateTime(headingMatch[1], headingMatch[2]), items: [] };
			entries.push(current);
			continue;
		}

		const itemMatch = line.match(/^-\s+(.+)/);
		if (itemMatch && current) {
			current.items.push(itemMatch[1].trim());
		}
	}

	return entries;
}

/** Koko jäsennetty muutosloki, uusin ensin — ladataan/jäsennetään KERRAN moduulin lataushetkellä, ei joka kutsulla. */
export const changelogEntries: ChangelogEntry[] = parseChangelog(changelogSource);

/** Uusimman julkaisun ajankohta — footerin "Julkaistu ..." -tekstiä varten. `undefined` jos tiedosto on (virheellisesti) tyhjä TAI ensimmäisen otsikon pvm/klo ei jäsentynyt. */
export const latestChangelogDate: Date | undefined = changelogEntries[0]?.date;

/** Sama pvm+klo-muoto kaikkialla missä muutoslokin ajankohta näytetään (footer, dialogin otsikot) — esim. "27.9.2026 klo 16.00". */
export function formatChangelogDate(date: Date): string {
	const day = new Intl.DateTimeFormat('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
	const time = new Intl.DateTimeFormat('fi-FI', { hour: '2-digit', minute: '2-digit' }).format(date);
	return `${day} klo ${time}`;
}
