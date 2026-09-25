/**
 * Yksittäisen kisan tulossivu. HUOM: `seasonId`-reittiparametria EI
 * tarvita KISAN OMAAN datahakuun (`/results/race/{id}` ei ota kausi-
 * id:tä, kisa-id yksin riittää) — alun perin se oli mukana URL:ssa VAIN
 * "← Takaisin kauteen" -breadcrumb-linkkiä varten (ks. +page.svelte).
 *
 * UUSI 25.9.2026: `seasonId`:tä käytetään NYT myös kauden autopoolin
 * hakuun (`/cars/season/{seasonId}`) — jos poolissa on tasan yksi auto,
 * se koskee JOKAISTA tämän kauden kisaa (myös tätä), joten kisasivukin
 * voi näyttää sen ilman `car_assignments`-taulua (joka on toistaiseksi
 * tyhjä). Näytetään aina KOKO pooli klikattavina linkkeinä (ks. mappers.ts:n
 * Car-kommentti ja `<CarList>`-komponentti) — kun poolissa sattuu olemaan
 * vain yksi auto, tämä näyttää automaattisesti vain sen yhden. `seasonId`
 * EI tässä ole yhtä luotettavasti validoitu kuin `raceId` (ei aiemmin
 * tarvinnut olla, ks. yllä) — jos se ei jostain syystä olisikaan kelvollinen
 * numero, autopoolin haku ohitetaan hiljaisesti eikä kaadeta koko sivua sen
 * takia, koska autotieto on tällä sivulla lisätietoa, ei pääsisältöä.
 */
import { ApiError, fetchRaceResult, fetchSeasonCarPool } from '#lib/server/api/client.ts';
import { mapCars, mapLatestRaceResult, type Car } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const raceId = Number(params.raceId);
	if (!Number.isFinite(raceId)) {
		throw new ApiError(`"${params.raceId}" ei ole kelvollinen kilpailun tunniste.`);
	}

	try {
		const seasonId = Number(params.seasonId);

		const [result, cars] = await Promise.all([
			fetchRaceResult(fetch, raceId).then((raw) => mapLatestRaceResult(raceId, raw)),
			Number.isFinite(seasonId)
				? fetchSeasonCarPool(fetch, seasonId).then(mapCars)
				: Promise.resolve<Car[]>([])
		]);

		return { result, seasonId: params.seasonId, cars };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kisatulosten haussa: ${String(err)}`);
	}
};
