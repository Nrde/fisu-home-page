/**
 * Kierrosaikojen jäsennys — JAETTU apufunktio, koska sekä palvelin­puoli
 * (`server/api/mappers.ts`, koko kisan nopeimman kierroksen päättely)
 * ETTÄ selainpuoli (`+page.svelte`:n "järjestä nopeimman kierroksen
 * mukaan" -nappi) tarvitsevat SAMAN vertailulogiikan. Tämä tiedosto EI
 * ole `server/`-kansiossa, joten SvelteKit sallii sen tuonnin myös
 * `.svelte`-komponenteista (palvelin-vain-koodia ei saa tuoda sieltä).
 */

/**
 * Muuntaa kuljettajan parhaan kierrosajan ("M:SS.sss" tai "SS.sss")
 * sekunneiksi VERTAILUA VARTEN — ei näyttöä varten (näyttöön käytetään
 * suoraan alkuperäistä merkkijonoa sellaisenaan). `undefined` jos arvo
 * puuttuu tai on jostain syystä lukukelvoton, jotta se ei voi vahingossa
 * "voittaa" vertailua puuttuvalla datalla.
 */
export function parseLapTimeSeconds(raw: string | undefined): number | undefined {
	if (!raw) return undefined;

	const match = raw.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
	if (!match) return undefined;

	const minutes = match[1] ? Number(match[1]) : 0;
	const seconds = Number(match[2]);
	return minutes * 60 + seconds;
}
