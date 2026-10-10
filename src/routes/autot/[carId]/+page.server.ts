/**
 * Yksittäisen auton tarkennussivu — UUSI 2026-09-25, käyttäjän pyyntö
 * (kausi-/kisasivun autolinkkien kohde). API:lla EI ole "yksi auto id:llä"
 * -endpointia (toisin kuin radoilla, ks. `/track/{trackId}`) — haetaan
 * siis KOKO autosanakirja (`/cars`) ja etsitään `params.carId`:tä vastaava
 * rivi, sama kuvio kuin `/radat/[trackid]`:lla `fetchTracks`:n kanssa.
 *
 * "Kaudet ja kilpailut" -osio (UUSI, käyttäjän pyyntö: "each car lists
 * the seasons and races they have been part of") on RASKAS "parasta
 * yritystä" -lisätieto, samalla periaatteella kuin radan tarkennussivun
 * kisahistoria: haetaan organisaation KAIKKI kaudet, sitten JOKAISEN
 * kauden autopooli erikseen (N+1), ja kaikille kausille joilla tämä auto
 * esiintyy poolissa vielä kauden koko kisalista (`/races/{season}`).
 * Kausille joilla tämä auto oli AINOA poolissa (`exclusive`, ks.
 * mappers.ts:n `matchCarSeasons`-kommentti) näytetään KOKO lista — muilla
 * suodatetaan vain kisat joiden omassa `carIds`-kentässä tämä auto
 * nimenomaisesti mainitaan (KORJAUS 10.10.2026, käyttäjän raportti:
 * esim. /autot/20 näytti "ei tiedossa mitkä kilpailut" -viestin vaikka
 * kisakohtainen tieto oli JO `/races/{season}`-vastauksessa valmiina —
 * aiempi oletus tässä kommentissa, että tarkka ratkaisu vaatisi erillisen
 * `/cars/race/{season}/{race}`-kutsun PER kisa, oli virheellinen: per-kisa
 * `carIds` tulee ILMAISEKSI samassa `/races/{season}`-kutsussa joka tehdään
 * tällä sivulla joka tapauksessa). Epäonnistuminen TÄSSÄ ei kaada koko
 * sivua — itse auton perustiedot näytetään silti.
 */
import { error } from '@sveltejs/kit';
import {
	ApiError,
	fetchCarDictionary,
	fetchCarReviews,
	fetchFinishedRaceIds,
	fetchOrganiserSummary,
	fetchSeasonCarPool,
	fetchSeasonRaces
} from '#lib/server/api/client.ts';
import {
	mapCars,
	mapReviewTarget,
	mapSeasonRaceList,
	matchCarSeasons,
	type CarSeasonMatch,
	type ReviewTarget,
	type SeasonRaceListEntry
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export interface CarSeasonHistoryEntry extends CarSeasonMatch {
	races: SeasonRaceListEntry[];
}

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

		let seasonHistory: CarSeasonHistoryEntry[] = [];
		try {
			const summary = await fetchOrganiserSummary(fetch, ORGANISER);
			const seasonPools = await Promise.all(
				// `Number(season.seasonId)`: tulee NYT livenä merkkijonona (ks.
				// mappers.ts:n `RawSeasonSummary.seasonId`-kommentti).
				summary.map(async (season) => {
					const seasonId = Number(season.seasonId);
					return {
						seasonId,
						seasonName: season.seasonName,
						pool: mapCars(await fetchSeasonCarPool(fetch, seasonId))
					};
				})
			);
			const matches = matchCarSeasons(carId, seasonPools);

			seasonHistory = await Promise.all(
				matches.map(async (match) => {
					const [races, finishedRaceIds] = await Promise.all([
						fetchSeasonRaces(fetch, match.seasonId),
						fetchFinishedRaceIds(fetch, match.seasonId)
					]);

					// `exclusive` kaudella TIEDÄMME auton olleen mukana JOKAISESSA
					// kisassa (ks. matchCarSeasons-kommentti) — näytetään koko lista.
					// Useamman auton kaudella `/races/{season}`:n JOKAISELLA kisalla
					// on OMA `carIds`-kenttänsä (käyttäjän raportti 10.10.2026: tieto
					// on jo tässä samassa vastauksessa, ei tarvitse erillistä
					// per-kisa-kutsua kuten tämän tiedoston yläkommentti aiemmin
					// oletti) — suodatetaan näytölle VAIN kisat joiden `carIds`
					// mainitsee tämän auton nimenomaisesti. Tyhjä/puuttuva `carIds`
					// EI tarkoita "ei tätä autoa" (ks. types.ts:n
					// RawRaceListEntry.carIds-kommentti) — se vain jätetään
					// suodatuksen ulkopuolelle, ei näytetä arvaamalla.
					const relevantRaces = match.exclusive
						? races
						: races.filter((race) => (race.carIds ?? []).map(Number).includes(carId));

					return {
						...match,
						races: mapSeasonRaceList(relevantRaces, new Set(finishedRaceIds))
					};
				})
			);
		} catch (historyError) {
			console.warn(
				`[autot/[carId]/+page.server.ts] Kausi-/kisahistorian haku epäonnistui, näytetään silti auton tiedot.`,
				historyError
			);
		}

		// Arvostelut ovat "parasta yritystä" -lisätieto (UUSI 2.10.2026,
		// käyttäjän pyyntö) — epäonnistuminen ei saa kaataa koko sivua,
		// samalla periaatteella kuin kausi-/kisahistoria yllä.
		let reviews: ReviewTarget | undefined;
		try {
			reviews = mapReviewTarget(await fetchCarReviews(fetch, carId));
		} catch (reviewError) {
			console.warn(`[autot/[carId]/+page.server.ts] Arvostelujen haku epäonnistui, näytetään silti auton tiedot.`, reviewError);
		}

		return { car, seasonHistory, reviews };
	} catch (err) {
		// HUOM: sama 404-läpipäästö kuin `/radat/[trackid]`:ssa — `ApiError`
		// kantaa myös julkista `status`-kenttää, joten se pitää sulkea pois
		// erikseen ennen `'status' in err` -tarkistusta.
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe auton haussa: ${String(err)}`);
	}
};
