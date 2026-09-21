/**
 * Radat-indeksisivu. HUOM: `/tracks`-endpoint EI ole organisaatio- tai
 * kausikohtainen (sama ratatietokanta kaikille) — tämä sivu tekee siis
 * VAIN YHDEN API-kutsun, ei mitään raskasta kisahistoria-täsmäytystä
 * (se tehdään vasta yksittäisen radan tarkennussivulla, ks.
 * radat/[trackid]/+page.server.ts:n kommentti).
 */
import { dev } from '$app/env';
import { ApiError, fetchTracks } from '#lib/server/api/client.ts';
import { mapTracks, type Track } from '#lib/server/api/mappers.ts';
import type { PageServerLoad } from './$types';

// Kehitystilan varadata — sama kaksi rataa kuin käyttäjän 21.9.2026
// liittämässä oikeassa API-esimerkissä, jotta kehitystilassa (jossa
// api2.simu.fi ei ole tavoitettavissa tässä hiekkalaatikossa) näkee
// oikeasti miltä sivu näyttää.
const MOCK_TRACKS: Track[] = [
	{
		id: 'lemans_91',
		name: 'Circuit de la Sarthe',
		location: 'Le Mans, Ranska',
		length: '13,6 km',
		turns: 32,
		elevation: '37m',
		built: '1923',
		builtExtra: '1990 (nro 10)',
		lapRecord: '3:27:47',
		lapRecordDriver: 'Eddie Irvine',
		lapRecordCar: 'Toyota TS010 (1993)',
		info: 'Yksi legendaarisimmista radoista Nürburgringin, Monacon ja Indianapolisin ohella. Rataa on muutettu 14 kertaa (viimeksi v. 2018) lähinnä turvallisuuden parantamiseksi.',
		// HUOM (22.9.2026): kuvatiedoston nimi ARVATTU samalla
		// trackid+".svg"-konventiolla kuin käyttäjän vahvistama esimerkki
		// ("jarama.svg") — ei erikseen vahvistettu juuri tälle radalle,
		// mutta gracefully degradoituu (piilottuu) jos väärin.
		imageUrl: 'https://simu.fi/images/tracks/lemans_91.svg'
	},
	{
		id: 'ahvenisto',
		name: 'Ahvenisto Race Circuit',
		location: 'Hämeenlinna, Suomi',
		length: '2.840km',
		turns: 10,
		elevation: '32m',
		built: '1967',
		lapRecord: '1:28,533 (2017)',
		lapRecordDriver: 'Mathias Hertén',
		lapRecordCar: 'Legends Ford -34 Sedan',
		info: 'Suomen vanhin ja ehkäpä legendaarisin moottorirata joka tunnetaan erittäin teknisenä ja haastavana ratana joka vaatii kuljettajilta kunnioitusta.',
		imageUrl: 'https://simu.fi/images/tracks/ahvenisto.svg'
	}
];

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const tracks = mapTracks(await fetchTracks(fetch));
		return { tracks, isMockData: false };
	} catch (error) {
		// Sama periaate kuin etusivun +page.server.ts:ssä — mock VAIN
		// kehitystilassa, tuotannossa virhe heitetään eteenpäin.
		if (dev) {
			console.warn(
				`[radat/+page.server.ts] /tracks-haku epäonnistui kehitystilassa — käytetään esimerkkidataa.`,
				error
			);
			return { tracks: MOCK_TRACKS, isMockData: true };
		}
		if (error instanceof ApiError) throw error;
		throw new ApiError(`Odottamaton virhe /tracks-haussa: ${String(error)}`);
	}
};
