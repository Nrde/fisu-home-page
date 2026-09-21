/**
 * Kuljettajat-indeksisivu. KEVYT: `organiserSummary` riittää (sama data
 * jota etusivu/kaudet-sivut jo hakevat) — aggregoidaan kuljettajakohtaisesti
 * mapDriverList:llä, ks. sen kommentti mappers.ts:ssä. Sama vastaus
 * antaa myös kausilistan (mapSeasonFilterOptions) kaudittaista
 * pikasuodatinta varten (käyttäjän pyyntö 22.9.2026) — ei tarvitse toista
 * API-kutsua.
 */
import { ApiError, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import { mapDriverList, mapSeasonFilterOptions } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const summary = await fetchOrganiserSummary(fetch, ORGANISER);
		return { drivers: mapDriverList(summary), seasons: mapSeasonFilterOptions(summary) };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe kuljettajalistan haussa: ${String(error)}`);
	}
};
