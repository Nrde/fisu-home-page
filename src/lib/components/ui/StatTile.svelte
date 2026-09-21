<script lang="ts">
	/**
	 * StatTile — iso "by the numbers" -tilastoluku, animoituna laskurina
	 * kun kortti vierähtää näkyviin (ks. suunnitelman luku 7).
	 *
	 * TS-huomio: `value: number` tarkoittaa että TypeScript pakottaa
	 * kutsujan antamaan oikeasti numeron, ei esim. "1234"-merkkijonoa.
	 * Tämä kiinnijää jo kääntöaikana editorissasi, ei vasta ajossa.
	 */
	import { inView } from '#lib/actions/inView.ts';

	let {
		value,
		label,
		context,
		align = 'start'
	}: {
		value: number;
		label: string;
		/** Valinnainen pieni konteksti-rivi, esim. "P3 sarjassa, 14 kilpailua" */
		context?: string;
		/**
		 * 'start' (oletus, ennallaan): luku+label vasemmassa reunassa,
		 * vaihtuu riviksi kun laatta on tarpeeksi leveä (ks. @container
		 * (min-width: 280px) alla). 'center' (käyttäjän pyyntö 22.9.2026,
		 * kuljettajaprofiilin tiiviimpi moniruutuinen tilastorivi): luku
		 * KESKITETTY labelin YLÄPUOLELLE, AINA pinottuna — ei koskaan
		 * vaihda rivi-layoutiin edes leveällä laatalla, koska keskitetty
		 * pino+rivi-layout yhdessä näyttäisi epäjohdonmukaiselta. Muut
		 * käyttöpaikat (esim. etusivun "Yhteisö numeroina") EIVÄT anna
		 * tätä proppia, joten niiden ulkoasu ei muutu.
		 */
		align?: 'start' | 'center';
	} = $props();

	// $state = reaktiivinen tila. Aloitetaan nollasta ja animoidaan kohti
	// oikeaa arvoa kun kortti tulee näkyviin — ei ennen, jotta efekti
	// näkyy myös palatessa sivulle uudelleen scrollaamalla.
	let displayValue = $state(0);

	function animateTo(target: number) {
		const durationMs = 1200;
		const start = performance.now();
		const from = 0;

		function tick(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / durationMs, 1);
			// ease-out-expo, sama käyrä kuin CSS-tokenissa --ease-out-expo
			const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
			displayValue = Math.round(from + (target - from) * eased);

			if (progress < 1) {
				requestAnimationFrame(tick);
			}
		}

		requestAnimationFrame(tick);
	}
</script>

<article class="stat-tile" data-align={align} use:inView={() => animateTo(value)}>
	<div class="stat-tile__inner">
		<p class="stat-tile__value">{displayValue.toLocaleString('fi-FI')}</p>
		<div class="stat-tile__text">
			<p class="stat-tile__label">{label}</p>
			{#if context}
				<p class="stat-tile__context">{context}</p>
			{/if}
		</div>
	</div>
</article>

<style>
	@layer components {
		.stat-tile {
			--density-scale: 1;

			/*
			 * Tämä container-type on ERI asia kuin .fluid-grid[data-density]
			 * -mekanismi tuolla alempana (se on style query, kyselee
			 * custom propertyn ARVOA). Tämä on kokoon perustuva query:
			 * tekee .stat-tilesta itsestään query-containerin, jotta
			 * .stat-tile__text voi kysyä TÄMÄN yhden laatan omaa
			 * leveyttä — ei koko gridin tai koko sivun leveyttä.
			 * Ilman tätä @container (min-width: ...) ei toimisi alla.
			 */
			container-type: inline-size;

			/*
			 * display:flex + align-items:center TÄSSÄ (ei vain
			 * .stat-tile__inneriin) keskittää sisällön koko laatan
			 * KORKEUDEN mukaan, ei vain sisällön oman korkeuden mukaan.
			 * Tällä on väliä kun grid-rivi venyttää laatikot samaan
			 * korkeuteen (esim. naapurilaatikossa on pidempi konteksti-
			 * rivi) — ilman tätä sisältö jäisi laatikon yläreunaan ja
			 * alle jäisi tyhjää tilaa.
			 */
			display: flex;
			align-items: center;
			padding: calc(var(--space-4) * var(--density-scale));
			border-radius: var(--radius-lg);
			background: var(--color-surface);
			border: 1px solid var(--color-surface-border);
		}

		/*
		 * HUOM: container-elementti (.stat-tile) ei voi kysellä omaa
		 * kokoaan @containerilla ja tyylittää itseään sen perusteella —
		 * kysely näkee vain containerin JÄLKELÄISET, ei containeria
		 * itseään. Siksi rivi/pino-vaihto tehdään .stat-tile__inner
		 * -kääre-elementtiin, joka on containerin lapsi.
		 */
		.stat-tile__inner {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			/* .stat-tile on nyt itsekin flex-container (ks. yllä), joten
			   tämä kääre on sen flex-lapsi — width: 100% varmistaa että
			   se käyttää koko käytettävissä olevan leveyden eikä vain
			   kutistu sisältönsä mittaiseksi. */
			width: 100%;
		}

		/* min-width: 0 on tässä tärkeä: ilman sitä flex-lapsi ei koskaan
		   kutistu tekstiä pienemmäksi, jolloin rivi-tilassa numero voisi
		   työntää tekstin ulos näkyvistä sen sijaan että teksti rivittyisi
		   siististi omaan tilaansa. */
		.stat-tile__text {
			min-width: 0;
		}

		/* Tiheys valuu container style queryn kautta vanhemmalta
		   (esim. .fluid-grid[data-density="compact"]) — ks. suunnitelman
		   luku 3.4.2. Ei tarvitse omaa data-density-proppia jokaiselle
		   StatTilelle erikseen. */
		@container style(--density: compact) {
			.stat-tile {
				--density-scale: 0.75;
			}
		}
		@container style(--density: spacious) {
			.stat-tile {
				--density-scale: 1.25;
			}
		}

		/*
		 * Kun laatta on leveä (esim. vain yksi rivi laatikoita ja
		 * gridi venyttää ne täyteen leveyteen), luku ja teksti asettuvat
		 * rinnakkain pystysuunnassa keskitettynä sen sijaan että laatta
		 * jäisi turhan korkeaksi ja oikea reuna tyhjäksi. Kapealla
		 * laatalla (mobiili, tiheä gridi, spacious/compact-pienennys)
		 * pinoaminen pysyy ennallaan — tämä on kokoon perustuva query,
		 * eli täysin erillinen yllä olevasta density-style querystä.
		 *
		 * HUOM raja-arvosta: kokoon perustuva @container mittaa
		 * containerin SISÄLTÖLEVEYDEN (padding pois laskettuna), ei
		 * koko laatan ulkoreunaa. .stat-tilen padding on ~1.5rem
		 * per puoli, eli ~3rem (48px) menee "hukkaan" ennen kuin
		 * tämä raja edes näkee sitä — siksi raja on paljon pienempi
		 * kuin miltä laatan näennäinen leveys antaisi olettaa.
		 *
		 * Raja on tarkoituksella melko korkea (280px sisältöleveyttä,
		 * eli n. 330px+ laatan ulkoreunaa). Kokeilin ensin paljon
		 * matalampaa rajaa (180px) — se laukesi jo tavallisella 4
		 * laatan työpöytäriveillä, mutta silloin iso luku (esim.
		 * "32 406") vei rivi-tilassa niin paljon tilaa että otsikko
		 * puristui rumasti ("AJETTUA KIER-ROSTA" katkolla). Nyt
		 * rivi-layout aktivoituu vain kun tilaa on oikeasti riittävästi
		 * (esim. harvempi sarakemäärä tai hyvin leveä näyttö) — muuten
		 * pinottu layout on turvallisempi eikä näytä rikkinäiseltä.
		 */
		@container (min-width: 280px) {
			.stat-tile[data-align='start'] .stat-tile__inner {
				flex-direction: row;
				align-items: center;
				gap: var(--space-4);
			}
			.stat-tile[data-align='start'] .stat-tile__text {
				margin-top: 0;
			}
		}

		/* 'center': luku keskitetty labelin yläpuolelle, pysyy AINA
		   pinottuna (ei ota osaa yllä olevaan rivi-layout-kyselyyn, ks.
		   [data-align='start']-rajaus siinä). */
		.stat-tile[data-align='center'] {
			justify-content: center;
			text-align: center;
		}
		.stat-tile[data-align='center'] .stat-tile__inner {
			align-items: center;
		}
	}

	.stat-tile__value {
		font-size: var(--font-size-stat);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		background: linear-gradient(135deg, var(--color-text) 0%, var(--color-info) 120%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.stat-tile__text {
		margin-top: var(--space-2);
	}

	.stat-tile__label {
		font-size: var(--font-size-base);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}

	.stat-tile__context {
		margin-top: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--color-text-faint);
	}
</style>
