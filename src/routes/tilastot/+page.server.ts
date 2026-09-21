/**
 * Tilastot-sivu. Käyttää UUTTA (22.9.2026, käyttäjän liittämä API-
 * kenttäkartta) `/stats/organiser/{organiser}/complete`-endpointtia,
 * joka antaa yhdellä raskaalla mutta pitkään cachetulla kutsulla
 * kaiken: leaderboardit, ratakohtainen kisamäärä ja kausitrendit.
 *
 * Ratakohtaisen kisamäärän NIMET (ja kuvakartat) eivät sisälly
 * itse stats-vastaukseen (vain `trackId`-avaimet), joten haetaan
 * RINNAN myös `/tracks` ja yhdistetään ne `mapTrackUsage`:ssa —
 * kaksi kutsua yhdessä `Promise.all`:ssa, ei peräkkäin.
 */
import { dev } from '$app/env';
import { ApiError, fetchStatsComplete, fetchTracks } from '#lib/server/api/client.ts';
import {
	mapCommunityLeaderboards,
	mapSeasonTrends,
	mapTrackUsage,
	mapTracks,
	type CommunityLeaderboards,
	type SeasonTrendEntry,
	type TrackUsageEntry
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

// Kehitystilan varadata — samat kuljettajat (nimet + id:t) kuin
// kuljettajat/+page.server.ts:n MOCK_DRIVERS, jotta linkit
// /kuljettajat/{driverId}:hin osoittavat samoihin mock-profiileihin
// eivätkä 404:ään kehitystilassa.
const MOCK_LEADERBOARDS: CommunityLeaderboards = {
	mostWins: [
		{ driverId: 1023, name: 'Ville Lyttinen', races: 31, wins: 11, podiums: 19, poles: 9, fastestLaps: 7 },
		{ driverId: 617, name: 'Anssi Hyytiäinen', races: 38, wins: 9, podiums: 22, poles: 6, fastestLaps: 10 },
		{ driverId: 580, name: 'Esa Mikkola', races: 54, wins: 6, podiums: 25, poles: 4, fastestLaps: 5 },
		{ driverId: 732, name: 'Panu Artimo', races: 69, wins: 2, podiums: 14, poles: 3, fastestLaps: 4 }
	],
	mostPodiums: [
		{ driverId: 580, name: 'Esa Mikkola', races: 54, wins: 6, podiums: 25, poles: 4, fastestLaps: 5 },
		{ driverId: 617, name: 'Anssi Hyytiäinen', races: 38, wins: 9, podiums: 22, poles: 6, fastestLaps: 10 },
		{ driverId: 1023, name: 'Ville Lyttinen', races: 31, wins: 11, podiums: 19, poles: 9, fastestLaps: 7 },
		{ driverId: 732, name: 'Panu Artimo', races: 69, wins: 2, podiums: 14, poles: 3, fastestLaps: 4 }
	],
	mostPoles: [
		{ driverId: 1023, name: 'Ville Lyttinen', races: 31, wins: 11, podiums: 19, poles: 9, fastestLaps: 7 },
		{ driverId: 617, name: 'Anssi Hyytiäinen', races: 38, wins: 9, podiums: 22, poles: 6, fastestLaps: 10 },
		{ driverId: 580, name: 'Esa Mikkola', races: 54, wins: 6, podiums: 25, poles: 4, fastestLaps: 5 },
		{ driverId: 732, name: 'Panu Artimo', races: 69, wins: 2, podiums: 14, poles: 3, fastestLaps: 4 }
	],
	mostFastestLaps: [
		{ driverId: 617, name: 'Anssi Hyytiäinen', races: 38, wins: 9, podiums: 22, poles: 6, fastestLaps: 10 },
		{ driverId: 1023, name: 'Ville Lyttinen', races: 31, wins: 11, podiums: 19, poles: 9, fastestLaps: 7 },
		{ driverId: 580, name: 'Esa Mikkola', races: 54, wins: 6, podiums: 25, poles: 4, fastestLaps: 5 },
		{ driverId: 732, name: 'Panu Artimo', races: 69, wins: 2, podiums: 14, poles: 3, fastestLaps: 4 }
	]
};

// Samat kaksi rataa kuin radat/+page.server.ts:n MOCK_TRACKS, jotta
// nimet+kuvat löytyvät yhdistettäessä — plus yksi tuntematon trackId
// havainnollistamaan "6 rataa puuttuu /tracks-taulusta" -tilannetta.
const MOCK_TRACK_USAGE: TrackUsageEntry[] = [
	{ trackId: 'ahvenisto', trackName: 'Ahvenisto Race Circuit', imageUrl: 'https://simu.fi/images/tracks/ahvenisto.svg', raceCount: 14 },
	{ trackId: 'lemans_91', trackName: 'Circuit de la Sarthe', imageUrl: 'https://simu.fi/images/tracks/lemans_91.svg', raceCount: 9 },
	{ trackId: 'hockenheimring', raceCount: 3 }
];
const MOCK_RACES_WITH_UNKNOWN_TRACK = 12;

const MOCK_SEASON_TRENDS: SeasonTrendEntry[] = [
	{ seasonId: 168, seasonName: 'S19 — Pappa Betalar II', driverCount: 14, raceCount: 3 },
	{ seasonId: 161, seasonName: 'S18 — Jidé Rallye Revival Series', driverCount: 18, raceCount: 8 },
	{ seasonId: 154, seasonName: 'S17 — Endurance Classics', driverCount: 16, raceCount: 6 },
	{ seasonId: 147, seasonName: 'S16 — Touring Car Trophy', driverCount: 12, raceCount: 7 }
];

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [stats, tracks] = await Promise.all([fetchStatsComplete(fetch, ORGANISER), fetchTracks(fetch)]);
		const mappedTracks = mapTracks(tracks);

		return {
			leaderboards: mapCommunityLeaderboards(stats),
			trackUsage: mapTrackUsage(stats, mappedTracks),
			racesWithUnknownTrack: stats.trackStats.racesWithUnknownTrack,
			seasonTrends: mapSeasonTrends(stats),
			isMockData: false
		};
	} catch (error) {
		if (dev) {
			console.warn(
				'[tilastot/+page.server.ts] /stats/.../complete-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.',
				error
			);
			return {
				leaderboards: MOCK_LEADERBOARDS,
				trackUsage: MOCK_TRACK_USAGE,
				racesWithUnknownTrack: MOCK_RACES_WITH_UNKNOWN_TRACK,
				seasonTrends: MOCK_SEASON_TRENDS,
				isMockData: true
			};
		}
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe tilastojen haussa: ${String(error)}`);
	}
};
