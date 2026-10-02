/**
 * Autot-indeksisivu. Sama periaate kuin radat/+page.server.ts:llä:
 * `/cars` ei ole kausikohtainen (koko sanakirja kerralla), joten TÄMÄ
 * sivu tekee vain YHDEN API-kutsun eikä mitään raskasta kausi-/
 * kisahistoria-täsmäytystä — se tehdään vasta yksittäisen auton
 * tarkennussivulla (ks. autot/[carId]/+page.server.ts:n kommentti).
 *
 * PÄIVITYS (2.10.2026, käyttäjän pyyntö): `/reviews/cars` haetaan
 * RINNAN autolistan kanssa arvostelujen keskiarvo/määrä -badgea varten
 * (ks. CarCard.svelte:n `reviewAverage`/`reviewCount`-propsit). HUOM:
 * tämä listaa VAIN arvostellut autot (ks. mappers.ts:n `mapReviewList`-
 * kommentti) — loput saavat `undefined`-keskiarvon eli "Ei arvosteluja"
 * -badgen. Arvostelujen haku on "parasta yritystä" -lisätieto: jos SE
 * epäonnistuu, autolista näytetään silti ilman badgeja sen sijaan että
 * koko sivu kaatuisi.
 */
import { ApiError, fetchCarDictionary, fetchCarReviewList } from '#lib/server/api/client.ts';
import { mapCars, mapReviewList, type ReviewSummary } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const cars = mapCars(await fetchCarDictionary(fetch));

		let reviewsByCarId = new Map<number | string, ReviewSummary>();
		try {
			reviewsByCarId = mapReviewList(await fetchCarReviewList(fetch), 'carId');
		} catch (reviewError) {
			console.warn('[autot/+page.server.ts] Arvostelujen haku epäonnistui, näytetään silti autolista.', reviewError);
		}

		return {
			cars: [...cars].sort((a, b) => a.name.localeCompare(b.name, 'fi')),
			reviewsByCarId: Object.fromEntries(reviewsByCarId)
		};
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe /cars-haussa: ${String(error)}`);
	}
};
