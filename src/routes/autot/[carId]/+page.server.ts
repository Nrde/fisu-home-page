/**
 * Yksittäisen auton tarkennussivu — UUSI 2026-09-25, käyttäjän pyyntö
 * (kausi-/kisasivun autolinkkien kohde). API:lla EI ole "yksi auto id:llä"
 * -endpointia (toisin kuin radoilla, ks. `/track/{trackId}`) — haetaan
 * siis KOKO autosanakirja (`/cars`) ja etsitään `params.carId`:tä vastaava
 * rivi, sama kuvio kuin `/radat/[trackid]`:lla `fetchTracks`:n kanssa.
 */
import { error } from '@sveltejs/kit';
import { ApiError, fetchCarDictionary } from '#lib/server/api/client.ts';
import { mapCars } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const carId = Number(params.carId);
	if (!Number.isFinite(carId)) {
		throw error(404, `"${params.carId}" ei ole kelvollinen auton tunniste.`);
	}

	try {
		const cars = mapCars(await fetchCarDictionary(fetch));
		const car = cars.find((c) => c.id === carId);
		if (!car) {
			throw error(404, `Autoa ${carId} ei löytynyt.`);
		}

		return { car };
	} catch (err) {
		// HUOM: sama 404-läpipäästö kuin `/radat/[trackid]`:ssa — `ApiError`
		// kantaa myös julkista `status`-kenttää, joten se pitää sulkea pois
		// erikseen ennen `'status' in err` -tarkistusta.
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe auton haussa: ${String(err)}`);
	}
};
