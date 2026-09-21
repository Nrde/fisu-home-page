/**
 * Kuljettajan profiilisivu — koko ura yhdeltä `/drivers/{organiser}/
 * {driverId}/career`-kutsulta (kaudet + kisat + valmiit tilastot).
 */
import { error } from '@sveltejs/kit';
import { ApiError, fetchDriverCareer } from '#lib/server/api/client.ts';
import { mapDriverCareer } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const driverId = Number(params.driverId);
	if (!Number.isFinite(driverId)) {
		throw error(404, `"${params.driverId}" ei ole kelvollinen kuljettajan tunniste.`);
	}

	try {
		const career = mapDriverCareer(await fetchDriverCareer(fetch, ORGANISER, driverId));
		return { career };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kuljettajan uran haussa: ${String(err)}`);
	}
};
