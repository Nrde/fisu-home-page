/**
 * Kuljettajan profiilisivu — koko ura yhdeltä `/drivers/{organiser}/
 * {driverId}/career`-kutsulta (kaudet + kisat + valmiit tilastot).
 */
import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { ApiError, fetchDriverCareer } from '#lib/server/api/client.ts';
import { mapDriverCareer, type DriverCareer } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

// Lyhennetty (2 kautta 18:sta) esimerkkidata käyttäjän 21.9.2026
// liittämästä oikeasta Panu Artimo -payloadista (driverId 732) —
// täysi versio olisi turhan pitkä kehitystilan varadataksi, kaksi
// kautta riittää näyttämään sivun rakenteen (useampi kausi, eri
// tulokset, DNF, puuttuva startingPosition).
const MOCK_DRIVER_CAREER: DriverCareer = {
	driverId: 732,
	driverName: 'Panu Artimo',
	careerStats: {
		racesEntered: 69,
		bestResult: 7,
		wins: 0,
		podiums: 0,
		poles: 0,
		fastestLaps: 0,
		dnfs: 10,
		dnfPct: 14.5,
		averagePosition: 17.99
	},
	seasons: [
		{
			seasonId: 168,
			seasonName: 'S19 - Pappa Betalar II',
			stats: {
				racesEntered: 5,
				bestResult: 9,
				wins: 0,
				podiums: 0,
				poles: 0,
				fastestLaps: 0,
				dnfs: 2,
				dnfPct: 40,
				averagePosition: 11.2
			},
			races: [
				{
					raceId: 878,
					raceName: 'Thruxton 1990',
					position: 14,
					points: 27,
					gapDisplay: '+1 kierros',
					bestLapTime: '1:29.650',
					positionChange: -2,
					win: false,
					podium: false,
					pole: false,
					fastestLap: false,
					dnf: false
				},
				{
					raceId: 879,
					raceName: 'Circuite del Jarama',
					position: 10,
					points: 31,
					gapDisplay: '+1 kierros',
					bestLapTime: '1:41.254',
					positionChange: -7,
					win: false,
					podium: false,
					pole: false,
					fastestLap: false,
					dnf: false
				},
				{
					raceId: 881,
					raceName: 'Sonoma Raceway long',
					position: 11,
					points: 0,
					gapDisplay: '+46 kierrosta',
					bestLapTime: '1:33.988',
					positionChange: 0,
					win: false,
					podium: false,
					pole: false,
					fastestLap: false,
					dnf: true
				}
			]
		},
		{
			seasonId: 96,
			seasonName: 'FiSU Season 9: Legendaarista!',
			stats: {
				racesEntered: 5,
				bestResult: 10,
				wins: 0,
				podiums: 0,
				poles: 0,
				fastestLaps: 0,
				dnfs: 0,
				dnfPct: 0,
				averagePosition: 15
			},
			races: [
				{
					raceId: 456,
					raceName: 'Ahvenisto',
					position: 19,
					points: 24,
					gapDisplay: '+2 kierrosta',
					bestLapTime: '1:32.547',
					positionChange: 1,
					win: false,
					podium: false,
					pole: false,
					fastestLap: false,
					dnf: false
				},
				{
					raceId: 460,
					raceName: 'Biķernieki (Ring of Skill)',
					position: 10,
					points: 41,
					gapDisplay: '+38.298',
					bestLapTime: '1:48.825',
					positionChange: 0,
					win: false,
					podium: false,
					pole: false,
					fastestLap: false,
					dnf: false
				}
			]
		}
	]
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const driverId = Number(params.driverId);
	if (!Number.isFinite(driverId)) {
		throw error(404, `"${params.driverId}" ei ole kelvollinen kuljettajan tunniste.`);
	}

	try {
		const career = mapDriverCareer(await fetchDriverCareer(fetch, ORGANISER, driverId));
		return { career, isMockData: false };
	} catch (err) {
		if (dev) {
			console.warn(
				`[kuljettajat/[driverId]/+page.server.ts] Uran haku epäonnistui kehitystilassa — käytetään esimerkkidataa.`,
				err
			);
			if (driverId !== MOCK_DRIVER_CAREER.driverId) {
				throw error(
					404,
					`Kuljettajaa ${driverId} ei löytynyt (kehitystilan esimerkkidatassa on vain kuljettaja ${MOCK_DRIVER_CAREER.driverId}).`
				);
			}
			return { career: MOCK_DRIVER_CAREER, isMockData: true };
		}
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kuljettajan uran haussa: ${String(err)}`);
	}
};
