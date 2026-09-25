<script lang="ts">
	/**
	 * CarList — korvaa aiemman CarInfo.svelte:n (25.9.2026, käyttäjän
	 * palaute: "get rid of the only text styling", "kauden autot" -teksti
	 * pois, autojen NIMET riittävät). Käytetään SEKÄ kausisivulla ETTÄ
	 * yksittäisen kisan sivulla — sama pooli, sama näyttötapa kummallakin
	 * (ks. mappers.ts:n Car-kommentti): kun poolissa on vain yksi auto,
	 * tämä näyttää automaattisesti vain sen yhden, koska se renderöi
	 * JOKAISEN poolin auton samalla tavalla eikä tarvitse enää erillistä
	 * "yksi auto" vs. "monta autoa" -erikoistapausta komponentin sisällä.
	 *
	 * Tyyli mukailee sivuston muiden korttien ("saman fiiliksen", käyttäjän
	 * sanoin) yleistä kaavaa — pinta + reunus + pyöristys + hoverissa VAIN
	 * reunaväri (EI translateY-nostoa, ks. TrackCard.svelte/DriverListCard.
	 * svelte:n vastaavat kommentit samasta käyttäjän palautteesta 22.9.2026)
	 * — muttei ole identtinen DriverCard/ListRow-riviin: autoilla ei ole
	 * sijoitusta/pisteitä joita varten tarvittaisiin ListRow'n sijoitus-
	 * lohko, joten tämä on oma, yksinkertaisempi "nimikortti"-komponenttinsa
	 * (lähempänä TrackCard/DriverListCard:in "koko kortti on yksi linkki"
	 * -periaatetta kuin ListRow:ta).
	 *
	 * Koko kortti on `<a>`-linkki `/autot/{id}`:hen (auton tarkennussivu,
	 * UUSI 25.9.2026) — käyttäjän pyyntö: kausi-/kisasivun autoista pitää
	 * päästä klikkaamaan yksittäisen auton tietoihin.
	 *
	 * Renderöi TYHJÄÄ jos poolissa ei ole yhtään autoa (kausi jolle
	 * autodataa ei ole vielä syötetty ylläpidossa) — ei näytetä tyhjää
	 * osiota turhaan.
	 */
	type CarSummary = { id: number; name: string; manufacturer?: string; class?: string };

	let { cars }: { cars: CarSummary[] } = $props();
</script>

{#if cars.length > 0}
	<div class="car-list">
		{#each cars as car (car.id)}
			<a class="car-list__item" href="/autot/{car.id}">
				<span class="car-list__name">{car.name}</span>
				{#if car.manufacturer || car.class}
					<span class="car-list__meta">
						{[car.manufacturer, car.class].filter(Boolean).join(' · ')}
					</span>
				{/if}
			</a>
		{/each}
	</div>
{/if}

<style>
	.car-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.car-list__item {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	/* Sama periaate kuin TrackCard/DriverListCard/ListRow:ssa — VAIN
	   reunaväri hoverissa, ei nostoa (käyttäjän palaute 22.9.2026, ks.
	   TrackCard.svelte:n kommentti: nosto aiheutti häiritsevän sisällön
	   siirtymän). */
	.car-list__item:hover {
		border-color: var(--color-info);
	}

	.car-list__name {
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.car-list__meta {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-weight: 600;
	}
</style>
