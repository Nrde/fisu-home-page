<script lang="ts">
	/**
	 * Kuljettajat-indeksi. Aakkosjärjestyksessä (fi-FI) — EI uran
	 * kokonaispisteiden mukaan, ks. mappers.ts:n DriverListEntry.
	 * careerPoints-kommentti siitä miksi se ei ole luotettava ranking-
	 * peruste eri kausien välillä.
	 *
	 * Käyttäjän pyyntö 22.9.2026: hakukenttä (nimen KOKO merkkijonosta,
	 * ei vain alusta — esim. "timo" löytää myös "ArTIMOn") + kaudittainen
	 * pikasuodatin (yksi kausi kerrallaan, "S3"..."S19"-tyyppiset napit).
	 * Molemmat suodattimet toimivat YHDESSÄ (AND, ei OR) — haku rajaa
	 * ensin nimen mukaan, kausivalinta sen jälkeen osallistumisen mukaan.
	 *
	 * PÄIVITYS (22.9.2026, käyttäjän palaute): oletusjärjestys vaihdettu
	 * SUKUNIMEN mukaiseksi (oli koko nimen mukainen, mikä käytännössä
	 * järjesti ETUNIMEN mukaan) + pieni nappi vaihtamaan sukunimi/etunimi
	 * -järjestykseen SegmentedControlilla (sama komponentti kuin muualla
	 * sivustolla näkymän vaihtoon). `sortKey`: kahden OSAN nimissä
	 * ("Etunimi Sukunimi") sukunimi on VIIMEINEN välilyönnillä erotettu
	 * osa — yhden osan nimillä (ei tunnettua sukunimeä) käytetään koko
	 * nimeä molemmissa tiloissa. Tasapelit (esim. sama sukunimi) ratkeavat
	 * koko nimen mukaan sekundäärisenä vertailuna, jotta järjestys on aina
	 * deterministinen eikä vain "sukunimen mukaan, muuten mielivaltainen".
	 *
	 * PÄIVITYS (22.9.2026, toinen kierros): kausisuodatin oli aiemmin
	 * rivi lyhyitä pillerinappeja (S3, S4, ... S19) joissa koko kauden
	 * nimi näkyi vain hover-title-attribuutista. Käyttäjä valitsi kahdesta
	 * vaihtoehdosta jälkimmäisen: tyylikäs DROPDOWN jossa koko kauden nimi
	 * on aina näkyvissä (ei vain hoverilla) — natiivi <select>, koska
	 * kausia voi olla parikymmentä ja natiivi valikko skaalautuu siihen
	 * ilman erillistä avattava/sulje-logiikkaa tai ulkopuolelle klikkauksen
	 * käsittelyä. "Kaikki kaudet" on oma vaihtoehtonsa `undefined`-arvolle
	 * (tyhjä suodatin).
	 */
	import DriverListCard from '#lib/components/ui/DriverListCard.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	// HUOM: <select>-elementillä EI ole HTML "value"-attribuuttia (vain
	// option-elementeillä on "selected") — Svelten `value={...}` + oma
	// onchange-käsittelijä EI siis toimi luotettavasti selectin kanssa,
	// koska Svelte ei osaa asettaa sitä DOM-propertyna pelkän attribuutin
	// kautta (huomattiin Playwright-testissä: valinta ei pysynyt). Siksi
	// tässä `bind:value` (Svelten oma kaksisuuntainen sidonta, joka TIETÄÄ
	// select-elementin erikoistapauksen). bind:value vaatii stringin
	// (natiivi <select> ei tunne numeroita), joten tila on string ja
	// '' tarkoittaa "Kaikki kaudet" — muunnos numeroksi tehdään vasta
	// suodatuksessa.
	let selectedSeasonIdStr = $state('');
	const selectedSeasonId = $derived(selectedSeasonIdStr === '' ? undefined : Number(selectedSeasonIdStr));
	let sortMode = $state<'surname' | 'firstname'>('surname');

	function surnameOf(name: string): string {
		const parts = name.trim().split(/\s+/);
		return parts.length > 1 ? parts[parts.length - 1] : name;
	}

	function sortKey(name: string): string {
		return sortMode === 'surname' ? surnameOf(name) : name;
	}

	const filteredDrivers = $derived.by(() => {
		const query = search.trim().toLocaleLowerCase('fi');

		return data.drivers
			.filter((driver) => query === '' || driver.name.toLocaleLowerCase('fi').includes(query))
			.filter((driver) => selectedSeasonId === undefined || driver.seasonIds.includes(selectedSeasonId))
			.sort((a, b) => {
				const primary = sortKey(a.name).localeCompare(sortKey(b.name), 'fi');
				return primary !== 0 ? primary : a.name.localeCompare(b.name, 'fi');
			});
	});

</script>

<svelte:head>
	<title>Kuljettajat — FISU</title>
	<meta name="description" content="FISU:n kaikki kuljettajat ja heidän uransa." />
</svelte:head>

<section class="page-grid section">
	<h1 class="section__title">Kuljettajat</h1>

	<div class="filters">
		<div class="filters__row">
			<div class="search-wrap">
				<input
					class="search-input"
					type="search"
					placeholder="Hae nimellä…"
					aria-label="Hae kuljettajaa nimellä"
					bind:value={search}
				/>
				{#if search !== ''}
					<button type="button" class="search-clear" aria-label="Tyhjennä haku" onclick={() => (search = '')}>
						✕
					</button>
				{/if}
			</div>
			<SegmentedControl
				label="Järjestystapa"
				bind:value={sortMode}
				options={[
					{ value: 'surname', label: 'Sukunimi' },
					{ value: 'firstname', label: 'Etunimi' }
				]}
			/>
		</div>

		{#if data.seasons.length > 0}
			<div class="season-select-wrap">
				<select class="season-select" aria-label="Suodata kaudella" bind:value={selectedSeasonIdStr}>
					<option value="">Kaikki kaudet</option>
					{#each data.seasons as season (season.seasonId)}
						<option value={String(season.seasonId)}>{season.seasonName}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	{#if filteredDrivers.length === 0}
		<p class="empty">Ei kuljettajia näillä suodattimilla.</p>
	{:else}
		<div class="fluid-grid" data-minsize="300px" data-gap="4">
			{#each filteredDrivers as driver (driver.driverId)}
				<DriverListCard
					driverId={driver.driverId}
					name={driver.name}
					seasonsCount={driver.seasonsCount}
					careerRaces={driver.careerRaces}
					careerBestFinish={driver.careerBestFinish}
				/>
			{/each}
		</div>
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.section__title {
		font-size: var(--font-size-xl);
		font-weight: 800;
		margin-bottom: var(--space-6);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.filters__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.search-wrap {
		position: relative;
		flex: 1 1 16rem;
		max-width: 24rem;
	}

	.search-input {
		width: 100%;
		/* Tilaa oikeaan reunaan omalle ✕-napillemme (ks. alla) niin se ei
		   mene tekstin päälle kun hakukenttä täyttyy. */
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: 600;
		transition: border-color var(--duration-fast) var(--ease-out-quart);
		/*
		 * BUGIKORJAUS 22.9.2026 (käyttäjän palaute: oma ✕-nappi ei näkynyt
		 * Firefoxissa): type="search" -kentät saavat selaimen OMAN natiivin
		 * ulkoasun (-moz-appearance: searchfield Firefoxissa, -webkit-
		 * appearance: searchfield WebKit/Chromessa) — natiivi widget
		 * piirtyy omana "chrome"-kerroksenaan JOKA VOI PEITTÄÄ absoluutti-
		 * sesti sijoitetut sisarukset (kuten alla oleva .search-clear-nappi)
		 * riippumatta tavallisesta DOM-pino/z-index-järjestyksestä. Chromessa
		 * tämä ei näkynyt koska sen natiivi chrome sattuu jättämään tilaa,
		 * mutta Firefoxin oma widget peitti napin kokonaan. `appearance:
		 * none` (+ vendor-etuliitteet) poistaa natiivin chromen täysin, jotta
		 * kenttä on pelkkä tavallinen laatikko jonka päälle oma nappimme
		 * piirtyy luotettavasti KAIKISSA selaimissa.
		 */
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}

	.search-input::placeholder {
		color: var(--color-text-faint);
		font-weight: 400;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-info);
	}

	/* Piilotetaan selaimen OMA type="search"-tyhjennysnappi (WebKit/
	   Chrome näyttävät sellaisen automaattisesti) ettei se näy kahdesti
	   oman ✕-nappimme kanssa päällekkäin. */
	.search-input::-webkit-search-cancel-button {
		display: none;
	}

	.search-clear {
		position: absolute;
		right: var(--space-2);
		top: 50%;
		translate: 0 -50%;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: var(--radius-full);
		color: var(--color-text-faint);
		font-size: 0.8rem;
		line-height: 1;
		transition:
			background var(--duration-fast) var(--ease-out-quart),
			color var(--duration-fast) var(--ease-out-quart);
	}

	.search-clear:hover {
		background: var(--color-surface-border);
		color: var(--color-text);
	}

	/* Käyttäjän valinta (22.9.2026): pillerinappien sijaan tyylikäs
	   dropdown jossa kauden KOKO nimi on aina näkyvissä — ei enää vain
	   hover-title-attribuutissa. Natiivi <select> (ei omaa avattava/
	   sulje-komponenttia) koska kausia voi olla parikymmentä ja natiivi
	   valikko hoitaa skaalautumisen, näppäimistökäytön ja mobiilin
	   omat pyörivät valitsimensa ilmaiseksi. Oma nuoli-SVG korvaa
	   selaimen oletusnuolen niin ulkoasu pysyy yhtenäisenä muun sivuston
	   pillerimäisen "surface"-visuaalin kanssa. */
	.season-select-wrap {
		position: relative;
		max-width: 20rem;
	}

	.season-select {
		width: 100%;
		appearance: none;
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-4);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: 700;
		cursor: pointer;
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	.season-select:hover {
		border-color: var(--color-info);
	}

	.season-select:focus {
		outline: none;
		border-color: var(--color-info);
	}

	/* Oma pudotusnuoli taustakuvana — pysyy paikallaan riippumatta
	   valitun tekstin pituudesta, eikä vaadi ylimääräistä elementtiä
	   joka häiritsisi <select>:in oman klikkausalueen laajuutta. */
	.season-select-wrap::after {
		content: '';
		position: absolute;
		right: var(--space-4);
		top: 50%;
		width: 0.6em;
		height: 0.6em;
		translate: 0 -70%;
		border-right: 2px solid var(--color-text-faint);
		border-bottom: 2px solid var(--color-text-faint);
		rotate: 45deg;
		pointer-events: none;
	}

	.empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}
</style>
