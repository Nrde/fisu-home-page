/**
 * Yksittäisen radan tarkennussivu. Kaksi osaa:
 *
 * 1) Itse ratatiedot — haetaan KOKO `/tracks`-lista ja etsitään
 *    `params.trackid`:tä vastaava (ei tiedossa olevaa "yhden radan"
 *    endpointia, ks. client.ts:n fetchTracks-kommentti).
 *
 * 2) FISU:n oma kisahistoria tällä radalla — RASKAS N+1-ratkaisu: haetaan
 *    ORGANISAATION KAIKKI kaudet (`organiserSummary`, 1 kutsu) ja sen
 *    jälkeen JOKAISEN kauden kisalista erikseen (`/races/{season}`, N
 *    kutsua — yksi per kausi), ja täsmäytetään radan NIMI kisalistan
 *    `track`-nimikenttään (ks. mappers.ts:n `matchTrackRaceHistory`).
 *    HISTORIA: 22.9.2026–9.10.2026 täsmäytys oli TARKKA `trackId`-vertailu
 *    (backend antoi `trackId`:n joka täsmäsi `/tracks`:n `trackid`:hen).
 *    PALAUTETTU NIMEEN 9.10.2026, API-tiimin id-migraation sivuvaikutuksena:
 *    `/races/{season}`:n `trackId` on nyt eri id-avaruudessa kuin `/tracks`:n
 *    `trackid`, eivätkä ne enää täsmää mitenkään (ks. types.ts:n
 *    `RawRaceResultResponse`-kommentti) — nimet täsmäävät edelleen.
 *    Itse N+1-hakukuvio (yksi kutsu per kausi) EI muuttunut, vain
 *    täsmäytystapa. Tehdään TARKOITUKSELLA vain tällä yksittäisen radan
 *    sivulla, ei radat-indeksissä, koska N+1 kutsua on liikaa listasivulle
 *    mutta hyväksyttävä yhdelle tarkennussivulle.
 */
import { error } from '@sveltejs/kit';
import {
	ApiError,
	fetchCarDictionary,
	fetchOrganiserSummary,
	fetchSeasonRaces,
	fetchTrackCarReviews,
	fetchTrackReviews,
	fetchTracks
} from '#lib/server/api/client.ts';
import {
	mapCars,
	mapReviewTarget,
	mapTrackCarReviews,
	mapTracks,
	matchTrackRaceHistory,
	type ReviewTarget,
	type TrackRaceHistoryEntry
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

/** Yhdistelmäarvostelu + auton nimi "parhaat autot tällä radalla" -listaa varten (ks. +page.svelte). */
export interface TrackComboReview {
	carId: number;
	carName: string;
	count: number;
	average?: number;
}

// TODO (sama huomio kuin +page.server.ts:ssä): organisaation tunnus on
// kovakoodattu koska sivusto näyttää vain FISUn dataa.
const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ params, fetch }) => {
	try {
		const tracks = mapTracks(await fetchTracks(fetch));
		const track = tracks.find((t) => t.id === params.trackid);
		if (!track) {
			throw error(404, `Rataa "${params.trackid}" ei löytynyt.`);
		}

		// Kisahistoria on "parasta yritystä" -lisätieto — jos SEN haku
		// epäonnistuu, näytetään silti itse ratatiedot tyhjällä
		// historialla sen sijaan että koko sivu kaatuisi.
		let raceHistory: TrackRaceHistoryEntry[] = [];
		try {
			const summary = await fetchOrganiserSummary(fetch, ORGANISER);
			const seasonRaceLists = await Promise.all(
				// `Number(season.seasonId)`: tulee NYT livenä merkkijonona (ks.
				// mappers.ts:n `RawSeasonSummary.seasonId`-kommentti).
				summary.map(async (season) => {
					const seasonId = Number(season.seasonId);
					return {
						seasonId,
						seasonName: season.seasonName,
						races: await fetchSeasonRaces(fetch, seasonId)
					};
				})
			);
			// UUSI 9.10.2026: nimeen perustuva täsmäytys palautettiin käyttöön
			// (`track.id` ei enää toimisi, ks. mappers.ts:n matchTrackRaceHistory-kommentti).
			raceHistory = matchTrackRaceHistory(track.name, seasonRaceLists);
		} catch (historyError) {
			console.warn(
				`[radat/[trackid]/+page.server.ts] Kisahistorian haku epäonnistui, näytetään silti ratatiedot.`,
				historyError
			);
		}

		// Arvostelut (oma + yhdistelmät tällä radalla) ovat "parasta yritystä"
		// -lisätietoa (UUSI 2.10.2026, käyttäjän pyyntö) — epäonnistuminen
		// ei kaada sivua, sama periaate kuin kisahistorian haussa yllä.
		let reviews: ReviewTarget | undefined;
		let comboReviews: TrackComboReview[] = [];
		try {
			const [rawReviews, rawCarReviews, rawCarDictionary] = await Promise.all([
				fetchTrackReviews(fetch, track.id),
				fetchTrackCarReviews(fetch, track.id),
				fetchCarDictionary(fetch)
			]);
			reviews = mapReviewTarget(rawReviews);
			const carNamesById = new Map(mapCars(rawCarDictionary).map((car) => [car.id, car.name]));
			comboReviews = mapTrackCarReviews(rawCarReviews)
				.map((entry) => ({
					carId: entry.carId,
					carName: carNamesById.get(entry.carId) ?? `Auto ${entry.carId}`,
					count: entry.summary.count,
					average: entry.summary.average
				}))
				// Parhaat autot ylimpänä — "ei vielä keskiarvoa" (average undefined,
				// käytännössä ei pitäisi esiintyä koska lista sisältää VAIN
				// arvostellut yhdistelmät) hännille jos joskus silti esiintyisi.
				.sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
		} catch (reviewError) {
			console.warn(`[radat/[trackid]/+page.server.ts] Arvostelujen haku epäonnistui, näytetään silti ratatiedot.`, reviewError);
		}

		return { track, raceHistory, reviews, comboReviews };
	} catch (err) {
		// HUOM: 404 (yllä heitetty `error(404, ...)`) pitää päästää LÄPI
		// sellaisenaan — se EI ole API-virhe, vaan oikea "sivua ei ole".
		// TÄRKEÄÄ: pelkkä `'status' in err` EI riitä tunnistamaan sitä,
		// koska myös `ApiError` kantaa julkista `status`-kenttää — se
		// pitää siis sulkea pois erikseen.
		if (!(err instanceof ApiError) && err && typeof err === 'object' && 'status' in err) throw err;
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe radan haussa: ${String(err)}`);
	}
};
