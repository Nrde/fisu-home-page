/**
 * Etusivun data. TILANNE (20.9.2026): KAIKKI NELJÄ osiota hakevat nyt
 * oikeasti API:sta — "Sarjataulukko", "Yhteisö numeroina", "Tuleva
 * kilpailu" ja "Viimeisimmät tulokset". Kaikki raakamuodot on
 * vahvistettu API-tsätin kanssa (ks. `types.ts`/`mappers.ts`:n
 * kommentit) paitsi muutama nimenomaisesti merkitty ARVAUS (kierros-
 * numero, kausi- ja kisajärjestykset) joita ei ole koodin puolesta
 * taattu — nämä ovat kuitenkin parhaita saatavilla olevia tulkintoja,
 * eivät sokkoarvauksia.
 *
 * Haku etenee kahdessa aallossa koska toinen aalto tarvitsee ensimmäisen
 * tuloksia (mikä kausi näytetään): 1) organiserSummary + stats +
 * "käynnissä oleva kausi" rinnakkain, 2) sen kauden kisalista +
 * ajettujen kisojen id:t rinnakkain, 3) tarvittaessa vielä viimeisimmän
 * ajetun kisan tulokset. KAIKKI tämä on saman try/catchin sisällä: jos
 * MIKÄ TAHANSA osa epäonnistuu, virhe heitetään eteenpäin (ei
 * esimerkkidataa — mock-fallback poistettu 22.9.2026 käyttäjän pyynnöstä).
 */
import {
	ApiError,
	fetchCurrentSeason,
	fetchFinishedRaceIds,
	fetchOrganiserStats,
	fetchOrganiserSummary,
	fetchRaceResult,
	fetchSeasonRaces
} from '#lib/server/api/client.ts';
import {
	mapCommunityStats,
	mapCurrentSeason,
	mapLatestRaceResult,
	mapUpcomingRace,
	pickDisplaySeasonId,
	pickLatestFinishedRaceId
} from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// TODO organisaation tunnus on kovakoodattu tässä koska sivusto näyttää
// vain FISUn omaa dataa — jos joskus tarvitaan useampi organisaatio
// samalta sivustolta, tämä siirtyy esim. reitin parametriksi. HUOM:
// `/seasons/{organiser}/current` toimii JUURI NYT vain 'fisu':lle
// (vahvistettu API-tsätiltä) — jos organisaatio joskus muuttuu
// parametriksi, tämä rajoitus on hyvä pitää mielessä.
const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Aalto 1: mitä kautta näytetään ja sen sarjataulukko/yhteisöluvut.
		const [summary, stats, currentSeasonInfo] = await Promise.all([
			fetchOrganiserSummary(fetch, ORGANISER),
			fetchOrganiserStats(fetch, ORGANISER),
			fetchCurrentSeason(fetch, ORGANISER)
		]);

		const seasonId = pickDisplaySeasonId(summary, currentSeasonInfo);
		const currentSeason = mapCurrentSeason(summary, seasonId);
		if (!currentSeason) {
			// Diagnostiikka mukaan virheviestiin (näkyy console.warnissa alla
			// dev-tilassa) — kertoo SUORAAN oliko ongelma tyhjä summary,
			// current-season-haku, vai ettei seasonId täsmännyt mihinkään
			// summaryn kauteen, sen sijaan että pitäisi arvata.
			throw new ApiError(
				`organiserSummary ei sisältänyt yhtään kautta. Diagnostiikka: ` +
					`summary.length=${summary.length}, ` +
					`summary-kausien id:t=[${summary.map((s) => s.seasonId).join(', ')}], ` +
					`currentSeasonInfo.data=${JSON.stringify(currentSeasonInfo.data)}, ` +
					`valittu seasonId=${seasonId}`
			);
		}

		// Aalto 2: näytettävän kauden kisalista + ajetut kisat.
		const [races, finishedRaceIds] = await Promise.all([
			fetchSeasonRaces(fetch, currentSeason.id),
			fetchFinishedRaceIds(fetch, currentSeason.id)
		]);

		const upcomingRace = mapUpcomingRace(races, new Set(finishedRaceIds));

		// Aalto 3: viimeisimmän ajetun kisan tulokset, jos kaudella on
		// ajettu yhtään kisaa (uuden kauden alussa ei välttämättä ole).
		const latestFinishedRaceId = pickLatestFinishedRaceId(finishedRaceIds);
		const latestRaceResult = latestFinishedRaceId
			? mapLatestRaceResult(latestFinishedRaceId, await fetchRaceResult(fetch, latestFinishedRaceId))
			: undefined;

		return {
			// `totalRaces` liitetään tässä (ei mapCurrentSeason:ssa, ks. sen
			// kommentti CurrentSeason-tyypissä) — `finishedRaceIds.length` on
			// jo haettu Aalto 2:ssa upcomingRacea varten, joten tämä on
			// ILMAINEN, ei uusi API-kutsu.
			currentSeason: {
				...currentSeason,
				totalRaces: finishedRaceIds.length,
				// `currentSeasonInfo.data` on jo haettu Aalto 1:ssä
				// `pickDisplaySeasonId`:ä varten — `!== null` kertoo suoraan
				// oliko TÄMÄ kausi oikeasti käynnissä vai fallback-valittu
				// viimeisin päättynyt (ks. CurrentSeason.isOngoing-kommentti).
				isOngoing: currentSeasonInfo.data !== null
			},
			communityStats: mapCommunityStats(stats),
			upcomingRace,
			latestRaceResult
		};
	} catch (error) {
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe etusivun datan haussa: ${String(error)}`);
	}
};
