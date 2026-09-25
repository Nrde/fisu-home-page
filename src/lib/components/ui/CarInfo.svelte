<script lang="ts">
	/**
	 * Näyttää kauden/kisan autotiedon. Käytetään SEKÄ kausisivulla ETTÄ
	 * yksittäisen kisan sivulla (käyttäjän pyyntö 25.9.2026) — sama
	 * komponentti kelpaa molempiin, koska sääntö on identtinen: jos
	 * kauden autopoolissa on TASAN yksi auto, se koskee jokaista
	 * kuljettajaa/kisaa koko kaudella (ks. mappers.ts:n SeasonCarInfo-
	 * kommentti), joten kisasivukin voi näyttää sen ilman omaa erillistä
	 * per-kisa-hakua. Useamman auton kausilla EI tiedetä ketä ajoi mitä
	 * (`car_assignments`-taulu tyhjä) — näytetään silloin vain koko pooli
	 * ilman per-kuljettaja-väitettä.
	 *
	 * HUOM (ks. DriverCard.svelte:n vastaava kommentti): propsit ovat
	 * TARKOITUKSELLA litteitä primitiivi-/objektityyppejä, ei importattu
	 * `SeasonCarInfo`/`Car`-tyyppejä suoraan `$lib/server/api/mappers.ts`
	 * ista — SvelteKit estää `$lib/server/*`-importit selainpuolen
	 * komponenteista, joten tämä tiedosto ei koskaan viittaa siihen edes
	 * tyyppinä.
	 *
	 * Renderöi TYHJÄÄ jos poolissa ei ole yhtään autoa (kausi jolle
	 * autodataa ei ole vielä syötetty ylläpidossa) — ei näytetä tyhjää
	 * osiota turhaan.
	 */
	import Badge from './Badge.svelte';

	type CarSummary = { id: number; name: string; manufacturer?: string; class?: string };

	let { pool, singleCar }: { pool: CarSummary[]; singleCar?: CarSummary } = $props();
</script>

{#if singleCar}
	<div class="car-info">
		<Badge accent="special">Auto</Badge>
		<span class="car-info__name">{singleCar.name}</span>
		{#if singleCar.class}
			<span class="car-info__extra">{singleCar.class}</span>
		{/if}
	</div>
{:else if pool.length > 1}
	<div class="car-info">
		<Badge accent="info">Kauden autot</Badge>
		<span class="car-info__extra">{pool.map((car) => car.name).join(', ')}</span>
	</div>
{/if}

<style>
	.car-info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.car-info__name {
		font-weight: 700;
	}

	.car-info__extra {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}
</style>
