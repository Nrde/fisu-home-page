/**
 * Radat-indeksisivu. HUOM: `/tracks`-endpoint EI ole organisaatio- tai
 * kausikohtainen (sama ratatietokanta kaikille) — tämä sivu tekee siis
 * VAIN YHDEN API-kutsun, ei mitään raskasta kisahistoria-täsmäytystä
 * (se tehdään vasta yksittäisen radan tarkennussivulla, ks.
 * radat/[trackid]/+page.server.ts:n kommentti).
 */
import { ApiError, fetchTracks } from '#lib/server/api/client.ts';
import { mapTracks } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const tracks = mapTracks(await fetchTracks(fetch));
		return { tracks };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe /tracks-haussa: ${String(error)}`);
	}
};
