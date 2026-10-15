/**
 * Kuljettajan profiilisivu — koko ura yhdeltä `/drivers/{organiser}/
 * {driverId}/career`-kutsulta (kaudet + kisat + valmiit tilastot).
 */
import { error } from '@sveltejs/kit';
import { ApiError, fetchDriverCareer, fetchOrganiserSummary } from '#lib/server/api/client.ts';
import { mapDriverCareer } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const driverId = Number(params.driverId);
	if (!Number.isFinite(driverId)) {
		throw error(404, `"${params.driverId}" ei ole kelvollinen kuljettajan tunniste.`);
	}

	try {
		// KORJAUS 15.10.2026 (käyttäjän raportti: kuljettajan kaudet väärässä
		// järjestyksessä, esim. alkoi S9:stä ja päättyi S8½:een): `/drivers/
		// {organiser}/{id}/career`:n OMA `seasons`-taulukkojärjestys seuraa
		// `seasonId`:n ARVOA, joka ei enää ole kronologinen 9.10.2026 id-
		// migraation jälkeen (ks. mappers.ts:n `mapSeasonList`/
		// `mapSeasonFilterOptions`:n 10.10.2026-kommentit SAMASTA juurisyystä
		// `organiserSummary`:n puolella). `organiserSummary`:n OMA taulukko-
		// järjestys ON sen sijaan luotettavasti kronologinen (uusin ensin,
		// käsin tarkistettu) — haetaan se tässä RINNAN ja käytetään
		// `mapDriverCareer`:ssa kaudet-taulukon uudelleenjärjestykseen,
		// sen sijaan että luotettaisiin career-endpointin omaan järjestykseen.
		const [rawCareer, organiserSummary] = await Promise.all([
			fetchDriverCareer(fetch, ORGANISER, driverId),
			fetchOrganiserSummary(fetch, ORGANISER)
		]);
		const chronologicalSeasonIds = organiserSummary.map((season) => Number(season.seasonId));

		const career = mapDriverCareer(rawCareer, chronologicalSeasonIds);
		return { career };
	} catch (err) {
		// KORJAUS 15.10.2026 (käyttäjän raportti: kaikki kuljettajasivut
		// päätyivät 500:aan): `ApiError` on OMA luokkamme, ei SvelteKitin
		// `error()`-apurilla luotu `HttpError` — SvelteKit tunnistaa VAIN
		// jälkimmäisen oikean HTTP-statuksen antamiseen, pelkkä `throw err`
		// näytti SIKSI AINA geneerisen "500 Internal Error" -sivun ApiErrorin
		// omasta `.status`-kentästä riippumatta, mikä piilotti todellisen
		// virheen (esim. backendin tilapäinen 503/404) käyttäjältä.
		if (err instanceof ApiError) throw error(err.status ?? 500, err.message);
		throw error(500, `Odottamaton virhe kuljettajan uran haussa: ${String(err)}`);
	}
};
