/**
 * Kaudet-indeksisivu. KEVYT: pelkkä `organiserSummary` riittää (kausien
 * nimet + sarjajohtajat) — sama data jota etusivukin jo hakee, ei
 * mitään raskasta per-kausi-kisahakua (se tehdään vasta yksittäisen
 * kauden sivulla, ks. kaudet/[seasonId]/+page.server.ts).
 */
import { ApiError, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import { mapSeasonList } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO (sama huomio kuin muualla): organisaation tunnus on kovakoodattu
// koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const summary = await fetchOrganiserSummary(fetch, ORGANISER);
		return { seasons: mapSeasonList(summary) };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe kausilistan haussa: ${String(error)}`);
	}
};
