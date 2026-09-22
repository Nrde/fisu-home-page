/**
 * Kaudet-indeksisivu. KEVYT: `organiserSummary` riittää sarjataulukoihin
 * (kausien nimet + sarjajohtajat) — sama data jota etusivukin jo hakee, ei
 * mitään raskasta per-kausi-kisahakua (se tehdään vasta yksittäisen
 * kauden sivulla, ks. kaudet/[seasonId]/+page.server.ts).
 *
 * Käyttäjän pyyntö 22.9.2026: haetaan NYT myös `/seasons/{organiser}/
 * current` (sama kutsu jota etusivu käyttää `pickDisplaySeasonId`:ä
 * varten) jotta `mapSeasonList` tietää MIKÄ kausi (jos mikään) on juuri
 * nyt käynnissä — sitä käytetään päättelemään mitkä listan kausista ovat
 * "päättyneitä" (kaikki muut paitsi käynnissä oleva), ks. `SeasonListEntry.
 * isOver`:in kommentti mappers.ts:ssä. Rinnakkainen kutsu, ei lisää
 * kokonaislatausaikaa merkittävästi.
 */
import { ApiError, fetchCurrentSeason, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import { mapSeasonList } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO (sama huomio kuin muualla): organisaation tunnus on kovakoodattu
// koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [summary, currentSeasonInfo] = await Promise.all([
			fetchOrganiserSummary(fetch, ORGANISER),
			fetchCurrentSeason(fetch, ORGANISER)
		]);
		// Sama `Number(...)`-varaus kuin `pickDisplaySeasonId`:ssä: API
		// antaa `data.id`:n MERKKIJONONA vaikka `organiserSummary`:n
		// `seasonId` on numero.
		const ongoingSeasonId = currentSeasonInfo.data ? Number(currentSeasonInfo.data.id) : undefined;
		return { seasons: mapSeasonList(summary, ongoingSeasonId) };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe kausilistan haussa: ${String(error)}`);
	}
};
