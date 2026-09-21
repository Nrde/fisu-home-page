/**
 * Yksittäisen kauden sivu: sarjataulukko + kauden koko kisalista
 * (ajetut + tulevat, tilamerkinnällä). Kolme rinnakkaista API-kutsua:
 * `organiserSummary` (sarjataulukko), `/races/{season}` (kisalista) ja
 * `/finishedraces/{season}` (mitkä kisat on ajettu) — sama data jota
 * etusivukin jo käyttää nykyiselle kaudelle, tässä minkä tahansa
 * `seasonId`:n mukaan.
 */
import { error } from '@sveltejs/kit';
import {
	ApiError,
	fetchFinishedRaceIds,
	fetchOrganiserSummary,
	fetchSeasonRaces
} from '#lib/server/api/client.ts';
import { mapCurrentSeason, mapSeasonRaceList } from '#lib/server/api/mappers.ts';
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

		const [races, finishedRaceIds] = await Promise.all([
			fetchSeasonRaces(fetch, seasonId),
			fetchFinishedRaceIds(fetch, seasonId)
		]);

		return {
			season: { ...season, totalRaces: finishedRaceIds.length },
			races: mapSeasonRaceList(races, new Set(finishedRaceIds))
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
