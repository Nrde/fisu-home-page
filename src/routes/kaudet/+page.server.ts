/**
 * Kaudet-indeksisivu. KEVYT: pelkkä `organiserSummary` riittää (kausien
 * nimet + sarjajohtajat) — sama data jota etusivukin jo hakee, ei
 * mitään raskasta per-kausi-kisahakua (se tehdään vasta yksittäisen
 * kauden sivulla, ks. kaudet/[seasonId]/+page.server.ts).
 */
import { dev } from '$app/env';
import { ApiError, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import { mapSeasonList, type SeasonListEntry } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO (sama huomio kuin muualla): organisaation tunnus on kovakoodattu
// koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

const MOCK_SEASONS: SeasonListEntry[] = [
	{ id: 161, name: 'S18 — Jidé Rallye Revival Series', driversCount: 12, leaderName: 'Anssi Hyytiäinen', leaderPoints: 362 },
	{ id: 148, name: 'S17 — GT3 Endurance Cup', driversCount: 18, leaderName: 'Ville Lyttinen', leaderPoints: 410 },
	{ id: 132, name: 'S16 — Rallycross Winter Series', driversCount: 9, leaderName: 'Simo Holm', leaderPoints: 288 }
];

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const summary = await fetchOrganiserSummary(fetch, ORGANISER);
		return { seasons: mapSeasonList(summary), isMockData: false };
	} catch (error) {
		// Sama periaate kuin muualla sivustolla — mock VAIN kehitystilassa.
		if (dev) {
			console.warn(
				'[kaudet/+page.server.ts] organiserSummary-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.',
				error
			);
			return { seasons: MOCK_SEASONS, isMockData: true };
		}
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe kausilistan haussa: ${String(error)}`);
	}
};
