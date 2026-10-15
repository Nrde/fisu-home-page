/**
 * Kuljettajan profiilisivu — koko ura yhdeltä `/drivers/{organiser}/
 * {driverId}/career`-kutsulta (kaudet + kisat + valmiit tilastot).
 */
import { error } from '@sveltejs/kit';
import { ApiError, fetchDriverCareer } from '#lib/server/api/client.ts';
import { mapDriverCareer } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

const ORGANISER = 'fisu';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const driverId = Number(params.driverId);
	if (!Number.isFinite(driverId)) {
		throw error(404, `"${params.driverId}" ei ole kelvollinen kuljettajan tunniste.`);
	}

	try {
		const career = mapDriverCareer(await fetchDriverCareer(fetch, ORGANISER, driverId));
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
