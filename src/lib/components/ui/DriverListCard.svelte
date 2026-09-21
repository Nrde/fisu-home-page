<script lang="ts">
	/**
	 * DriverListCard — /kuljettajat-indeksisivun kuljettajakortti. Sama
	 * "koko kortti on yksi linkki" -periaate kuin TrackCard/SeasonCard.
	 *
	 * HUOM: EI näytä kokonaispisteitä "ranking"-mielessä (ks. mappers.ts:n
	 * DriverListEntry.careerPoints-kommentti — eri kausien pistejärjestelmät
	 * eivät välttämättä ole keskenään vertailukelpoisia) — pisteet ovat
	 * tässä vain kontekstitietoa, ei kortin järjestysperuste.
	 *
	 * PÄIVITYS (22.9.2026, käyttäjän palaute): aiempi malli ("1 kausi ·
	 * 38 kilpailua · Paras tulos P7" yhdellä `flex-wrap`-rivillä pisteellä
	 * erotettuna) näytti "bändiltä" ja saattoi rivittyä rumasti kesken
	 * lauseen kapealla kortilla. Tilalle KIINTEÄ 3-sarakkeinen ruudukko —
	 * jokainen kortti näyttää AINA samalta (sama asettelu vaikka jokin
	 * arvo puuttuisi — puuttuva arvo näytetään "–":na, ei piilotettuna
	 * solu), värikoodattu arvo isommalla
	 * fontilla + pieni versaalilabel alla, sama "arvo+label"-periaate
	 * kuin StatTile.svelte:ssä mutta kortin sisäisenä pienoisversiona.
	 * "Paras tulos" nimettiin uudelleen "Paras sijoitus"iksi, ja "P"-
	 * etuliite (esim. "P7") poistettiin — pelkkä numero riittää kun
	 * labelissa lukee jo "sijoitus".
	 *
	 * PÄIVITYS (22.9.2026, toinen kierros käyttäjän palautteesta): arvo
	 * KESKITETTY labelin yläpuolelle (oli vasemmassa reunassa), solujen
	 * väliä kavennettu ja "paras sijoitus" lyhennetty "paras sija":ksi —
	 * käyttäjän oma ehdotus kun täyden sanan mahduttaminen yhdelle
	 * riville kapealla kortilla osoittautui hankalaksi luotettavasti
	 * kaikilla leveyksillä.
	 */
	let {
		driverId,
		name,
		seasonsCount,
		careerRaces,
		careerBestFinish
	}: {
		driverId: number;
		name: string;
		seasonsCount: number;
		careerRaces?: number;
		careerBestFinish?: number;
	} = $props();
</script>

<a class="driver-card" href="/kuljettajat/{driverId}">
	<h3 class="driver-card__name">{name}</h3>
	<div class="driver-card__stats">
		<div class="stat" data-accent="info">
			<span class="stat__value">{seasonsCount}</span>
			<span class="stat__label">{seasonsCount === 1 ? 'kausi' : 'kautta'}</span>
		</div>
		<div class="stat" data-accent="warning">
			<span class="stat__value">{careerRaces ?? '–'}</span>
			<span class="stat__label">kilpailua</span>
		</div>
		<div class="stat" data-accent="special">
			<span class="stat__value">{careerBestFinish ?? '–'}</span>
			<span class="stat__label">paras sija</span>
		</div>
	</div>
</a>

<style>
	.driver-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition:
			border-color var(--duration-fast) var(--ease-out-quart),
			transform var(--duration-fast) var(--ease-out-quart);
	}

	.driver-card:hover {
		border-color: var(--color-info);
		transform: translateY(-2px);
	}

	.driver-card__name {
		font-size: var(--font-size-lg);
		font-weight: 800;
	}

	/* KIINTEÄ 3 saraketta — sama määrä soluja JOKAISELLA kortilla vaikka
	   `careerRaces`/`careerBestFinish` puuttuisivat (puuttuva arvo näkyy
	   "–":na markupissa yllä), jotta kortit rivittyvät siististi eivätkä
	   näytä eripituisilta riippuen siitä mitä dataa kullakin kuljettajalla
	   sattuu olemaan. */
	.driver-card__stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-1);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1em;
		min-width: 0;
		text-align: center;
	}

	.stat__value {
		font-size: var(--font-size-lg);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.stat[data-accent='info'] .stat__value {
		color: var(--color-info);
	}
	.stat[data-accent='warning'] .stat__value {
		color: var(--color-warning);
	}
	.stat[data-accent='special'] .stat__value {
		color: var(--color-special);
	}

	.stat__label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-faint);
		/* Estää labelin katkaisemasta korttia rivittymällä rumasti kesken
		   sanan kapealla leveydellä — "paras sijoitus" on näistä kolmesta
		   pisin, joten se saa tarvittaessa rivittyä SANOJEN välistä. */
		overflow-wrap: normal;
	}
</style>
