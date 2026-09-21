<script lang="ts">
	/**
	 * RaceResultRow — YKSITTÄISEN KILPAILUN tuloslistan rivi
	 * (sijoitus + aikaero kärkeen, ei kauden kokonaispisteitä).
	 *
	 * Sama ListRow-pohja kuin DriverCard.svelte:ssä (ks. sen
	 * kommentti) — vain `meta`- ja `badge`-snippettien sisältö
	 * vaihtuu domain-kohtaisesti.
	 *
	 * HUOM (käyttäjän spekin mukaan päivitetty 20.9.2026):
	 * - `gapDisplay` on jo valmiiksi muotoiltu mappers.ts:ssä
	 *   ("+M:SS.sss" tai "+N kierrosta") — tämä komponentti ei enää
	 *   tee mitään muotoilua itse, vain näyttää sen.
	 * - `bestLapTime` näytetään JOKAISELLE kuljettajalle omana rivinään
	 *   (kuljettajan OMA paras kierros tässä kisassa). Koko kisan
	 *   nopeimman kierroksen ajanut kuljettaja (`fastestLap`, pääteltynä
	 *   mappers.ts:ssä vertaamalla kaikkien bestLapTime-arvoja) EI enää
	 *   saa erillistä badgea ("Nopein kierros koko kisassa" poistettu
	 *   käyttäjän pyynnöstä 21.9.2026 turhana) — merkintä näkyy nyt VAIN
	 *   kahtena hillitympänä korostuksena: sijoituslohkon oma taustaväri
	 *   (`positionAccent`) ja PB-tekstin eri väri (`metaSecondaryAccent`).
	 * - Voittajan (position 1) kokonaisaikaa EI näytetä, koska API ei
	 *   sitä tarjoa (vain muiden ero siihen) — tiedossa oleva rajoitus,
	 *   ks. mappers.ts:n RaceResultEntry.gapDisplay-kommentti.
	 */
	import ListRow from './ListRow.svelte';

	let {
		position,
		displayPosition,
		name,
		gapDisplay,
		bestLapTime,
		fastestLap = false,
		featured = false,
		positionChange,
		dnf = false
	}: {
		position: number;
		/** "=" jos jakaa sijoituksen edellisen rivin kanssa, muuten position merkkijonona — ks. mappers.ts:n computeDisplayPositions. */
		displayPosition: string;
		name: string;
		/** Valmiiksi muotoiltu ero kärkeen, esim. "+20.857" tai "+1 kierros" — undefined voittajalle */
		gapDisplay?: string;
		/** Kuljettajan oma paras kierrosaika tässä kisassa, esim. "1:27.480" */
		bestLapTime?: string;
		/** Ajoi KOKO KISAN nopeimman kierroksen (eri asia kuin oma bestLapTime) */
		fastestLap?: boolean;
		featured?: boolean;
		/**
		 * Sijoja voitettu (positiivinen) tai hävitty (negatiivinen)
		 * aika-ajoista maaliin — ks. mappers.ts:n RaceResultEntry.
		 * `undefined` jos dataa ei ole (esim. aika-ajo ajamatta), jolloin
		 * ilmaisinta ei näytetä ollenkaan. Käyttäjän pyyntö 21.9.2026:
		 * näytetään AINA nimirivin oikeassa reunassa (ei vain silloin kun
		 * "Sijoja voitettu/hävitty" -lajittelu on valittuna) — päätetty
		 * koska tieto on hyödyllistä riippumatta senhetkisestä
		 * näyttöjärjestyksestä eikä vie merkittävästi tilaa.
		 */
		positionChange?: number;
		/**
		 * Kuljettaja ei ajanut maaliin (DNF) — ks. mappers.ts:n
		 * RaceResultEntry.dnf-kommentti. Käyttäjän valitsema ratkaisu
		 * 21.9.2026 (vaihtoehto 3 kolmesta ehdotuksesta): sijoituslaatikko
		 * saa punertavan korostuksen JA nimirivin oikeaan reunaan tulee
		 * pieni "DNF"-tunniste — `gapDisplay`/`bestLapTime` EIVÄT piiloudu
		 * (käyttäjän oma perustelu: ne kertovat millä kierroksella
		 * kuljettaja keskeytti ja määrittävät DNF-kuljettajien keskinäisen
		 * järjestyksen, joten ne pysyvät hyödyllisinä siitä huolimatta).
		 */
		dnf?: boolean;
	} = $props();

	/* HUOM (käyttäjän palaute 21.9.2026): pelkkä numero, ei enää "P"-etuliitettä. */
	const positionLabel = $derived(displayPosition === '=' ? '=' : String(position));
</script>

<ListRow
	{position}
	{positionLabel}
	{name}
	{featured}
	positionAccent={dnf ? 'danger' : fastestLap ? 'highlight' : 'default'}
	metaAccent="warning"
	metaSecondaryAccent={fastestLap ? 'highlight' : 'muted'}
>
	{#snippet meta()}
		{gapDisplay}
	{/snippet}
	{#snippet metaSecondary()}
		{#if bestLapTime}
			PB: {bestLapTime}
		{/if}
	{/snippet}
	{#snippet nameTrailing()}
		{#if dnf || positionChange !== undefined}
			<span class="name-trailing-group">
				{#if dnf}
					<span class="dnf-badge">DNF</span>
				{/if}
				{#if positionChange !== undefined}
					<span
						class="position-change"
						data-direction={positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'flat'}
					>
						{#if positionChange > 0}
							<span class="position-change__icon">▲</span><span class="position-change__value"
								>{positionChange}</span
							>
						{:else if positionChange < 0}
							<span class="position-change__icon">▼</span><span class="position-change__value"
								>{Math.abs(positionChange)}</span
							>
						{:else}
							<span class="position-change__icon">─</span>
						{/if}
					</span>
				{/if}
			</span>
		{/if}
	{/snippet}
</ListRow>

<style>
	/* Kääre DNF-tunnisteelle JA sijoitusmuutos-ilmaisimelle, jotta ne
	   asettuvat siististi vierekkäin nimirivin oikeaan reunaan silloin
	   kun molemmat ovat läsnä samalla rivillä. */
	.name-trailing-group {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	/*
	 * DNF-tunniste — käyttäjän valitsema ratkaisu 21.9.2026 (vaihtoehto 3):
	 * pieni, selvästi punertava "DNF"-teksti nimirivin oikeassa reunassa.
	 * Yhdistetty sijoituslaatikon omaan punertavaan korostukseen (ks.
	 * ListRow.svelte:n `[data-accent='danger']`) — kaksi hillittyä
	 * korostusta, sama periaate kuin aiemmin sovittu "nopein kierros"
	 * -merkintä (laatikon väri + tekstin väri, ei erillistä isoa badgea).
	 */
	.dnf-badge {
		font-size: clamp(0.75rem, 0.64rem + 1cqi, 0.9rem);
		font-weight: 800;
		letter-spacing: 0.03em;
		color: var(--color-danger);
		text-transform: uppercase;
	}

	/*
	 * Sijoitusmuutos-ilmaisin (aika-ajoista voitetut/hävityt sijat) —
	 * käyttäjän pyyntö 21.9.2026: ▲ (vihreä) = nousi, ▼ (punainen) = laski,
	 * ─ = ei muutosta. Numero kertoo MONTAKO sijaa (esim. "▲2"), paitsi
	 * ─:lle jolle numero olisi aina 0 eikä siis lisäisi tietoa.
	 */
	.position-change {
		display: inline-flex;
		align-items: center;
		/*
		 * Käyttäjän palaute 21.9.2026 (kuvakaappaus): kolmion ja luvun
		 * väli oli liian tiukka — 0.5rem kasvattaa sitä selvästi ilman
		 * että ilmaisin muuttuu kömpelön leveäksi.
		 */
		gap: 0.5rem;
		font-size: clamp(0.85rem, 0.72rem + 1.4cqi, 1.05rem);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/*
	 * Käyttäjän palaute 21.9.2026 (kuvakaappaus): ▲/▼-glyyfit renderöityvät
	 * useimmissa fonteissa VISUAALISESTI korkeampina kuin numerot samalla
	 * font-sizellä (niiden oma "em-neliö" käyttää enemmän pystytilaa kuin
	 * numeromerkin varsinainen muoto) — pienempi oma font-size (0.7em
	 * vanhemman `.position-change`:n koosta) saa kolmion näyttämään
	 * luonnollisemman kokoiselta luvun rinnalla, käyttäjän itse ehdottama
	 * korjaus ("kolmion kokoa pitää tiputtaa / numeron kokoa kasvattaa").
	 */
	.position-change__icon {
		font-size: 0.7em;
		line-height: 1;
	}

	.position-change[data-direction='up'] {
		color: var(--color-success);
	}

	.position-change[data-direction='down'] {
		color: var(--color-danger);
	}

	.position-change[data-direction='flat'] {
		color: var(--color-text-faint);
	}
</style>
