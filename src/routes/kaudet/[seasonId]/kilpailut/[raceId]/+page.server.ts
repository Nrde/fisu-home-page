/**
 * Yksittäisen kisan tulossivu. HUOM: `seasonId`-reittiparametria EI
 * tarvita KISAN OMAAN datahakuun (`/results/race/{id}` ei ota kausi-
 * id:tä, kisa-id yksin riittää) — alun perin se oli mukana URL:ssa VAIN
 * "← Takaisin kauteen" -breadcrumb-linkkiä varten (ks. +page.svelte).
 *
 * UUSI 25.9.2026: `seasonId`:tä käytetään myös kauden autopoolin hakuun
 * (`/cars/season/{seasonId}`) — käytetään NYT (26.9.2026) VAIN tason 4
 * fallbackina (ks. mappers.ts:n `RaceCarResolution`-kommentti), ei enää
 * ainoana autotietona.
 *
 * PÄIVITYS (26.9.2026, `car_assignments` tuli käyttöön): sivu hakee nyt
 * MYÖS `/cars/race/{season}/{race}` (`fetchRaceCars`) — tälle KISALLE jo
 * ratkaistut per-kuljettaja autot + koko kisan varaosa-auto. Jokaiselle
 * tulosriville liitetään `resolveDriverCar`:n ratkaisema auto
 * (`attachRaceCars`), ja sivun ylälaidan `CarList` näyttää tämän kisan
 * TODELLISET käytetyt autot (`raceCarsUnion`) — vasta jos NIITÄ ei ole
 * yhtään (ei tarkoita "ei autoa", ks. types.ts:n `RawRaceListEntry.cars`-
 * kommentti), pudotaan takaisin kauden koko pooliin, käyttäjän ohjeen
 * mukaisesti ("fall back to the season-level pool display"). `seasonId`
 * EI tässä ole yhtä luotettavasti validoitu kuin `raceId` (ei aiemmin
 * tarvinnut olla, ks. yllä) — jos se ei jostain syystä olisikaan kelvollinen
 * numero, molemmat autohaut ohitetaan hiljaisesti eikä kaadeta koko sivua
 * sen takia, koska autotieto on tällä sivulla lisätietoa, ei pääsisältöä.
 */
import { ApiError, fetchRaceCars, fetchRaceResult, fetchSeasonCarPool } from '#lib/server/api/client.ts';
import {
	attachRaceCars,
	mapCars,
	mapLatestRaceResult,
	mapRaceCars,
	raceCarsUnion,
	type Car,
	type RaceCarResolution
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const EMPTY_RACE_CAR_RESOLUTION: RaceCarResolution = { byDriverId: new Map() };

export const load: PageServerLoad = async ({ params, fetch }) => {
	const raceId = Number(params.raceId);
	if (!Number.isFinite(raceId)) {
		throw new ApiError(`"${params.raceId}" ei ole kelvollinen kilpailun tunniste.`);
	}

	try {
		const seasonId = Number(params.seasonId);
		const hasSeasonId = Number.isFinite(seasonId);

		const [rawResult, seasonPool, raceCarResolution] = await Promise.all([
			fetchRaceResult(fetch, raceId),
			hasSeasonId ? fetchSeasonCarPool(fetch, seasonId).then(mapCars) : Promise.resolve<Car[]>([]),
			hasSeasonId
				? fetchRaceCars(fetch, seasonId, raceId).then(mapRaceCars)
				: Promise.resolve(EMPTY_RACE_CAR_RESOLUTION)
		]);

		const result = attachRaceCars(mapLatestRaceResult(raceId, rawResult), raceCarResolution, seasonPool);
		const raceCars = raceCarsUnion(raceCarResolution);

		return { result, seasonId: params.seasonId, cars: raceCars.length > 0 ? raceCars : seasonPool };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kisatulosten haussa: ${String(err)}`);
	}
};
