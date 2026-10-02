/**
 * Radat-indeksisivu. HUOM: `/tracks`-endpoint EI ole organisaatio- tai
 * kausikohtainen (sama ratatietokanta kaikille) — tämä sivu tekee siis
 * VAIN YHDEN API-kutsun, ei mitään raskasta kisahistoria-täsmäytystä
 * (se tehdään vasta yksittäisen radan tarkennussivulla, ks.
 * radat/[trackid]/+page.server.ts:n kommentti).
 *
 * PÄIVITYS (2.10.2026, käyttäjän pyyntö): `/reviews/tracks` haetaan
 * RINNAN ratalistan kanssa, sama periaate kuin autot/+page.server.ts:ssä
 * — "parasta yritystä" -lisätieto, ei kaada sivua jos epäonnistuu.
 */
import { ApiError, fetchTrackReviewList, fetchTracks } from '#lib/server/api/client.ts';
import { mapReviewList, mapTracks, type ReviewSummary } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const tracks = mapTracks(await fetchTracks(fetch));

		let reviewsByTrackId = new Map<number | string, ReviewSummary>();
		try {
			reviewsByTrackId = mapReviewList(await fetchTrackReviewList(fetch), 'trackId');
		} catch (reviewError) {
			console.warn('[radat/+page.server.ts] Arvostelujen haku epäonnistui, näytetään silti ratalista.', reviewError);
		}

		return { tracks, reviewsByTrackId: Object.fromEntries(reviewsByTrackId) };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe /tracks-haussa: ${String(error)}`);
	}
};
