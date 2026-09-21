/**
 * Yksittäisen kauden sivu: sarjataulukko + kauden koko kisalista
 * (ajetut + tulevat, tilamerkinnällä). Kolme rinnakkaista API-kutsua:
 * `organiserSummary` (sarjataulukko), `/races/{season}` (kisalista) ja
 * `/finishedraces/{season}` (mitkä kisat on ajettu) — sama data jota
 * etusivukin jo käyttää nykyiselle kaudelle, tässä minkä tahansa
 * `seasonId`:n mukaan.
 */
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import {
	ApiError,
	fetchFinishedRaceIds,
	fetchOrganiserSummary,
	fetchSeasonRaces
} from '#lib/server/api/client.ts';
import {
	mapCurrentSeason,
	mapSeasonRaceList,
	type CurrentSeason,
	type SeasonRaceListEntry
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

const MOCK_SEASON: CurrentSeason = {
	id: 161,
	name: 'S18 — Jidé Rallye Revival Series',
	totalRaces: 6,
	standings: [
		{ driverId: 1, displayPosition: '1', position: 1, name: 'Anssi Hyytiäinen', points: 362, bestFinish: 1, racesCount: 6 },
		{ driverId: 2, displayPosition: '2', position: 2, name: 'Ville Lyttinen', points: 341, bestFinish: 2, racesCount: 6 },
		{ driverId: 3, displayPosition: '=', position: 2, name: 'Simo Holm', points: 341, bestFinish: 4, racesCount: 5 },
		{ driverId: 4, displayPosition: '4', position: 4, name: 'Matti Meikäläinen', points: 276, racesCount: 6 },
		{ driverId: 5, displayPosition: '5', position: 5, name: 'Jari Järvinen', points: 251, racesCount: 4 },
		{ driverId: 6, displayPosition: '6', position: 6, name: 'Pekka Peltola', points: 233, racesCount: 1 }
	]
};

const MOCK_RACES: SeasonRaceListEntry[] = [
	{ raceId: 872, raceNumber: 1, trackName: 'Ahvenisto', date: new Date('2026-03-14T17:00:00Z'), finished: true },
	{ raceId: 874, raceNumber: 2, trackName: 'Botniaring', date: new Date('2026-04-11T17:00:00Z'), finished: true },
	{ raceId: 876, raceNumber: 3, trackName: 'Alastaro', date: new Date('2026-05-16T17:00:00Z'), finished: true },
	{ raceId: 877, raceNumber: 4, trackName: 'Kemora', date: new Date('2026-06-20T17:00:00Z'), finished: true },
	{ raceId: 878, raceNumber: 5, trackName: 'Ruuhimäki', date: new Date('2026-07-25T17:00:00Z'), finished: true },
	{ raceId: 879, raceNumber: 6, trackName: 'Rally de Finlande — Ouninpohja', date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), finished: false }
];

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
			races: mapSeasonRaceList(races, new Set(finishedRaceIds)),
			isMockData: false
		};
	} catch (err) {
		// HUOM: sama periaate kuin radat/[trackid]/+page.server.ts:ssä —
		// `ApiError`:lla on itselläänkin julkinen `status`-kenttä, joten
		// pelkkä `'status' in err` ei riitä erottamaan sitä SvelteKitin
		// omasta `error(404, ...)`:sta. Vain jälkimmäinen pitää päästää
		// läpi sellaisenaan (ei ole API-virhe jota mock-data korjaisi).
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;

		if (dev) {
			console.warn(
				`[kaudet/[seasonId]/+page.server.ts] Kausihaku epäonnistui kehitystilassa — käytetään esimerkkidataa.`,
				err
			);
			if (seasonId !== MOCK_SEASON.id) {
				throw error(404, `Kautta ${seasonId} ei löytynyt (kehitystilan esimerkkidatassa on vain kausi ${MOCK_SEASON.id}).`);
			}
			return { season: MOCK_SEASON, races: MOCK_RACES, isMockData: true };
		}
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kauden haussa: ${String(err)}`);
	}
};
