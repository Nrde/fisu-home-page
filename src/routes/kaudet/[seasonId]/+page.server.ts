/**
 * Yksittäisen kauden sivu: sarjataulukko + kauden koko kisalista
 * (ajetut + tulevat, tilamerkinnällä). Neljä rinnakkaista API-kutsua:
 * `organiserSummary` (sarjataulukko), `/races/{season}` (kisalista),
 * `/finishedraces/{season}` (mitkä kisat on ajettu) — sama data jota
 * etusivukin jo käyttää nykyiselle kaudelle, tässä minkä tahansa
 * `seasonId`:n mukaan — ja UUSI 25.9.2026 `/cars/season/{season}`
 * (kauden autopooli, ks. mappers.ts:n Car-kommentti).
 *
 * PÄIVITYS (26.9.2026): `/races/{season}`-kutsu käyttää nyt
 * `fetchSeasonRacesWithCarDetails`ia tavallisen `fetchSeasonRaces`:n sijaan
 * — sama endpoint, mutta palauttaa myös `poolCarIds`+`cars`-sanakirjan
 * (ks. types.ts:n `RawSeasonRacesResponse`-kommentti kahdesta muotoversiosta
 * samana päivänä). Tämä KORVAA myös erillisen `/cars/season/{seasonId}`
 * -kutsun kokonaan (`mapSeasonPool` johtaa kauden poolin näistä samoista
 * kentistä) — yksi vähemmän API-kutsu kausisivulla.
 */
import { error } from '@sveltejs/kit';
import { ApiError, fetchFinishedRaceIds, fetchOrganiserSummary, fetchSeasonRacesWithCarDetails } from '#lib/server/api/client.ts';
import { mapCurrentSeason, mapSeasonPool, mapSeasonRaceList } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const seasonId = Number(params.seasonId);
	if (!Number.isFinite(seasonId)) {
		throw error(404, `"${params.seasonId}" ei ole kelvollinen kauden tunniste.`);
	}

	try {
		const summary = await fetchOrganiserSummary(fetch, ORGANISER);
		const season = mapCurrentSeason(summary, seasonId);
		if (!season) {
			throw error(404, `Kautta ${seasonId} ei löytynyt.`);
		}

		const [racesResponse, finishedRaceIds] = await Promise.all([
			fetchSeasonRacesWithCarDetails(fetch, seasonId),
			fetchFinishedRaceIds(fetch, seasonId)
		]);

		return {
			season: { ...season, totalRaces: finishedRaceIds.length },
			races: mapSeasonRaceList(racesResponse.data, new Set(finishedRaceIds), racesResponse.cars),
			cars: mapSeasonPool(racesResponse)
		};
	} catch (err) {
		// HUOM: `ApiError`:lla on itselläänkin julkinen `status`-kenttä, joten
		// pelkkä `'status' in err` ei riitä erottamaan sitä SvelteKitin
		// omasta `error(404, ...)`:sta. Vain jälkimmäinen pitää päästää
		// läpi sellaisenaan.
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kauden haussa: ${String(err)}`);
	}
};
