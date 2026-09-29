/**
 * Kuljettajien reittauksen kehityssivu — UUSI 28.9.2026, käyttäjän pyyntö.
 * Yksi kevyt kutsu (`/cache/race_chart_data.json`, valmiiksi laskettu
 * tiedosto, ei tietokantakysely per pyyntö, ks. client.ts:n
 * `fetchRaceChartData`-kommentti) riittää sekä animoituun "rating race"
 * -kaavioon (RaceChart.svelte) ETTÄ tavalliseen nykyisen sijoituksen
 * listaan (viimeisimmän framen `standings`) — ei kahta erillistä hakua.
 */
import { ApiError, fetchRaceChartData } from '#lib/server/api/client.ts';
import { mapRaceChartData } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const raceChart = mapRaceChartData(await fetchRaceChartData(fetch));
		return { raceChart };
	} catch (err) {
		if (err instanceof ApiError) throw err;
		throw new ApiError(`Odottamaton virhe rating datan haussa: ${String(err)}`);
	}
};
