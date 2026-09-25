<script lang="ts">
	/**
	 * Auton tarkennussivu. HUOM: ei "← Takaisin"-linkkiä otsikon yllä kuten
	 * muilla tarkennussivuilla (radat/[trackid], kaudet/[seasonId]/...) —
	 * autoille ei (vielä) ole omaa indeksisivua johon linkittää, tänne
	 * tullaan AINA kausi-/kisasivun auto-linkistä (ks. CarList.svelte).
	 * Jos/kun `/autot`-indeksisivu joskus rakennetaan, linkki lisätään
	 * silloin samalla periaatteella kuin muillakin tarkennussivuilla.
	 */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const car = $derived(data.car);
</script>

<svelte:head>
	<title>{car.name} — Autot — FISU</title>
	<meta name="description" content="{car.name} — auton tiedot." />
</svelte:head>

<section class="page-grid section">
	<h1 class="car-name">{car.name}</h1>
	{#if car.manufacturer}
		<p class="car-manufacturer">{car.manufacturer}</p>
	{/if}

	{#if car.class || car.sim || car.notes}
		<div class="car-facts">
			{#if car.class}
				<p class="car-facts__item">
					<span class="car-facts__label">Luokka</span>
					<span class="car-facts__value">{car.class}</span>
				</p>
			{/if}
			{#if car.sim}
				<p class="car-facts__item">
					<span class="car-facts__label">Simulaattori</span>
					<span class="car-facts__value">{car.sim}</span>
				</p>
			{/if}
			{#if car.notes}
				<p class="car-facts__item car-facts__item--notes">
					<span class="car-facts__label">Lisätiedot</span>
					<span class="car-facts__value">{car.notes}</span>
				</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.car-name {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.car-manufacturer {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.car-facts {
		margin-top: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.car-facts__item {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4em;
	}

	.car-facts__item--notes {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2em;
	}

	.car-facts__label {
		font-weight: 700;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.car-facts__label::after {
		content: ':';
	}

	.car-facts__item--notes .car-facts__label::after {
		content: '';
	}

	.car-facts__value {
		font-weight: 700;
	}

	.car-facts__item--notes .car-facts__value {
		font-weight: 400;
		color: var(--color-text-muted);
		line-height: 1.5;
	}
</style>
