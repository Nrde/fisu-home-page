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
import { ApiError, fetchStatsComplete, fetchTracks } from '#lib/server/api/client.ts';
import { mapCommunityLeaderboards, mapSeasonTrends, mapTrackUsage, mapTracks } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [stats, tracks] = await Promise.all([fetchStatsComplete(fetch, ORGANISER), fetchTracks(fetch)]);
		const mappedTracks = mapTracks(tracks);

		return {
			leaderboards: mapCommunityLeaderboards(stats),
			trackUsage: mapTrackUsage(stats, mappedTracks),
			racesWithUnknownTrack: stats.trackStats.racesWithUnknownTrack,
			seasonTrends: mapSeasonTrends(stats)
		};
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe tilastojen haussa: ${String(error)}`);
	}
};
