/**
 * Yksittäisen kisan tulossivu. HUOM: `seasonId`-reittiparametria EI
 * tarvita itse datahakuun (`/results/race/{id}` ei ota kausi-id:tä,
 * kisa-id yksin riittää) — se on mukana URL:ssa VAIN "← Takaisin
 * kauteen" -breadcrumb-linkkiä varten (ks. +page.svelte).
 */
import { ApiError, fetchRaceResult } from '#lib/server/api/client.ts';
import { mapLatestRaceResult } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const raceId = Number(params.raceId);
	if (!Number.isFinite(raceId)) {
		throw new ApiError(`"${params.raceId}" ei ole kelvollinen kilpailun tunniste.`);
	}

	try {
		const result = mapLatestRaceResult(raceId, await fetchRaceResult(fetch, raceId));
		return { result, seasonId: params.seasonId };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kisatulosten haussa: ${String(err)}`);
	}
};
