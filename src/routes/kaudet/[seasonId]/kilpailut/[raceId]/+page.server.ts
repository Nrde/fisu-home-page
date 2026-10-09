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
import {
	ApiError,
	fetchOrganiserSummary,
	fetchRaceCars,
	fetchRaceResult,
	fetchSeasonCarPool,
	fetchSeasonRaces,
	fetchTracks
} from '#lib/server/api/client.ts';
import {
	attachRaceCars,
	findTrackIdByName,
	mapCars,
	mapCurrentSeason,
	mapLatestRaceResult,
	mapRaceCars,
	mapTracks,
	raceCarsUnion,
	type Car,
	type RaceCarResolution
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO (sama huomio kuin muualla): organisaation tunnus on kovakoodattu
// koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

const EMPTY_RACE_CAR_RESOLUTION: RaceCarResolution = { byDriverId: new Map() };

export const load: PageServerLoad = async ({ params, fetch }) => {
	const raceId = Number(params.raceId);
	if (!Number.isFinite(raceId)) {
		throw new ApiError(`"${params.raceId}" ei ole kelvollinen kilpailun tunniste.`);
	}

	try {
		const seasonId = Number(params.seasonId);
		const hasSeasonId = Number.isFinite(seasonId);

		/**
		 * UUSI 9.10.2026 (API-tiimin muotouudistus — ks. mappers.ts:n
		 * `mapLatestRaceResult`-kommentti täydestä taustasta): `/results/
		 * race/{roundId}` EI ANNA ENÄÄ trackName/seasonName-merkkijonoja,
		 * joten ne pitää resolvoida ERIKSEEN: `seasonRaces` (`/races/
		 * {season}`, sisältää `track`-nimen per kisa) + `organiserSummary`
		 * (sisältää `seasonName`:n per kausi, ks. `mapCurrentSeason`).
		 * `tracks` (`/tracks`, KOKO ratatietokanta) haetaan MYÖS tätä
		 * sivua varten UUTENA — tarvitaan "Radan sivulle →" -linkin
		 * trackId:n NIMEEN perustuvaan täsmäytykseen (`findTrackIdByName`),
		 * koska API:n OMA `trackId` tässä/`/races/{season}`:ssa on NYT eri
		 * id-avaruudessa kuin `/tracks`:n `trackid` (ks. types.ts:n
		 * `RawRaceResultResponse`-kommentti) — ei siis voi käyttää suoraan.
		 */
		const [rawResult, seasonRaces, organiserSummary, tracks, seasonPool, raceCarResolution] = await Promise.all([
			fetchRaceResult(fetch, raceId),
			hasSeasonId ? fetchSeasonRaces(fetch, seasonId) : Promise.resolve([]),
			fetchOrganiserSummary(fetch, ORGANISER),
			fetchTracks(fetch).then(mapTracks),
			hasSeasonId ? fetchSeasonCarPool(fetch, seasonId).then(mapCars) : Promise.resolve<Car[]>([]),
			hasSeasonId
				? fetchRaceCars(fetch, seasonId, raceId).then(mapRaceCars)
				: Promise.resolve(EMPTY_RACE_CAR_RESOLUTION)
		]);

		// `Number(race.id)`: `race.id` tulee livenä merkkijonona (ks. mappers.ts:n `RawRaceListEntry.id`-kommentti).
		const raceListEntry = seasonRaces.find((race) => Number(race.id) === raceId);
		const trackName = raceListEntry?.track ?? 'Tuntematon rata';
		const seasonName = (hasSeasonId ? mapCurrentSeason(organiserSummary, seasonId)?.name : undefined) ?? params.seasonId;

		const result = attachRaceCars(
			{
				...mapLatestRaceResult(raceId, rawResult, { trackName, seasonName }),
				trackId: findTrackIdByName(tracks, trackName)
			},
			raceCarResolution,
			seasonPool
		);
		const raceCars = raceCarsUnion(raceCarResolution);

		return { result, seasonId: params.seasonId, cars: raceCars.length > 0 ? raceCars : seasonPool };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe kisatulosten haussa: ${String(err)}`);
	}
};
