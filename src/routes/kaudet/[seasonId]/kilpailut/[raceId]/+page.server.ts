/**
 * Yksittäisen kisan tulossivu. HUOM: `seasonId`-reittiparametria EI
 * tarvita itse datahakuun (`/results/race/{id}` ei ota kausi-id:tä,
 * kisa-id yksin riittää) — se on mukana URL:ssa VAIN "← Takaisin
 * kauteen" -breadcrumb-linkkiä varten (ks. +page.svelte).
 */
import { dev } from '$app/env';
import { ApiError, fetchRaceResult } from '#lib/server/api/client.ts';
import { mapLatestRaceResult, type LatestRaceResult } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const MOCK_RACE_RESULT: LatestRaceResult = {
	raceId: 878,
	trackName: 'Ruuhimäki',
	seasonName: 'S18 — Jidé Rallye Revival Series',
	results: [
		{
			driverId: 2,
			displayPosition: '1',
			position: 1,
			name: 'Ville Lyttinen',
			bestLapTime: '1:27.480',
			fastestLap: false,
			positionChange: 1,
			dnf: false
		},
		{
			driverId: 1,
			displayPosition: '2',
			position: 2,
			name: 'Anssi Hyytiäinen',
			gapDisplay: '+20.857',
			bestLapTime: '1:27.670',
			fastestLap: true,
			positionChange: -1,
			dnf: false
		},
		{
			driverId: 3,
			displayPosition: '3',
			position: 3,
			name: 'Simo Holm',
			gapDisplay: '+1:13.018',
			bestLapTime: '1:28.746',
			fastestLap: false,
			positionChange: 0,
			dnf: false
		},
		{
			driverId: 10,
			displayPosition: '4',
			position: 4,
			name: 'Joni Vähäkuopus',
			gapDisplay: '+25 kierrosta',
			bestLapTime: undefined,
			fastestLap: false,
			positionChange: undefined,
			dnf: true
		}
	]
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const raceId = Number(params.raceId);
	if (!Number.isFinite(raceId)) {
		throw new ApiError(`"${params.raceId}" ei ole kelvollinen kilpailun tunniste.`);
	}

	try {
		const result = mapLatestRaceResult(raceId, await fetchRaceResult(fetch, raceId));
		return { result, seasonId: params.seasonId, isMockData: false };
	} catch (err) {
		if (dev) {
			console.warn(
				`[kaudet/[seasonId]/kilpailut/[raceId]/+page.server.ts] Kisatulosten haku epäonnistui kehitystilassa — käytetään esimerkkidataa.`,
				err
			);
			return { result: MOCK_RACE_RESULT, seasonId: params.seasonId, isMockData: true };
		}
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kisatulosten haussa: ${String(err)}`);
	}
};
