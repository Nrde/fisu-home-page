/**
 * Autot-indeksisivu. Sama periaate kuin radat/+page.server.ts:llä:
 * `/cars` ei ole kausikohtainen (koko sanakirja kerralla), joten TÄMÄ
 * sivu tekee vain YHDEN API-kutsun eikä mitään raskasta kausi-/
 * kisahistoria-täsmäytystä — se tehdään vasta yksittäisen auton
 * tarkennussivulla (ks. autot/[carId]/+page.server.ts:n kommentti).
 */
import { ApiError, fetchCarDictionary } from '#lib/server/api/client.ts';
import { mapCars } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const cars = mapCars(await fetchCarDictionary(fetch));
		return { cars: [...cars].sort((a, b) => a.name.localeCompare(b.name, 'fi')) };
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe /cars-haussa: ${String(error)}`);
	}
};
