<script lang="ts">
	/** Auton tarkennussivu. */
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const car = $derived(data.car);

	// Sama muotoiluperiaate kuin muualla sivustolla (fi-FI, Intl.DateTimeFormat).
	function formatDate(date: Date | undefined): string | undefined {
		if (!date) return undefined;
		return new Intl.DateTimeFormat('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}
</script>

<svelte:head>
	<title>{car.name} — Autot — FISU</title>
	<meta name="description" content="{car.name} — auton tiedot, kaudet ja kilpailut." />
</svelte:head>

<section class="page-grid section">
	<a href="/autot" class="link back-link">← Kaikki autot</a>

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

	<!--
		Tulossa-huomautus: käyttäjän mainitsema tuleva ominaisuus (25.9.2026)
		— auton ja radan yhdistelmän arviointi kuljettajapalautteen
		perusteella. Ei toiminnallisuutta vielä, pelkkä maininta ettei tämä
		ole unohdettu.
	-->
	<p class="car-upcoming">
		Tulossa: auton ja radan yhdistelmän arviointi kuljettajapalautteen perusteella.
	</p>

	<div class="season-history">
		<h2 class="season-history__title">Kaudet ja kilpailut</h2>
		{#if data.seasonHistory.length === 0}
			<p class="season-history__empty">
				Ei löydetty kausia joilla tämä auto olisi ollut käytössä.
			</p>
		{:else}
			<ul class="season-history__list">
				{#each data.seasonHistory as season (season.seasonId)}
					<li class="season-history__season">
						<a href="/kaudet/{season.seasonId}" class="link season-history__season-name">{season.seasonName}</a>
						{#if !season.exclusive}
							<p class="season-history__note">
								Kaudella käytössä useampi auto — ei tiedossa mitkä kilpailut ajettiin juuri tällä autolla.
							</p>
						{:else if season.races.length > 0}
							<ul class="season-history__races">
								{#each season.races as race (race.raceId)}
									<li class="season-history__race">
										{#if race.finished}
											<a href="/kaudet/{season.seasonId}/kilpailut/{race.raceId}" class="link"
												>{race.trackName}</a
											>
										{:else}
											<span>{race.trackName}</span>
										{/if}
										{#if formatDate(race.date)}
											<span class="season-history__race-date">{formatDate(race.date)}</span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.back-link {
		display: inline-block;
		margin-bottom: var(--space-6);
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

	.car-upcoming {
		margin-top: var(--space-4);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		font-style: italic;
	}

	.season-history {
		margin-top: var(--space-8);
	}

	.season-history__title {
		font-size: var(--font-size-lg);
		font-weight: 800;
		margin-bottom: var(--space-4);
	}

	.season-history__empty {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
		max-width: 60ch;
	}

	/* `reset.css` nollaa vain marginaalin, ei `<ul>`:n oletuspaddingia/
	   pisteitä — sama tunnettu korjaus kuin muuallakin sivustolla. */
	.season-history__list,
	.season-history__races {
		list-style: none;
		padding: 0;
	}

	.season-history__list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.season-history__season {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.season-history__season-name {
		font-weight: 700;
	}

	.season-history__note {
		margin-top: var(--space-1);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	.season-history__races {
		margin-top: var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.season-history__race {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
		padding-left: var(--space-3);
		font-size: var(--font-size-sm);
	}

	.season-history__race-date {
		color: var(--color-text-faint);
		font-variant-numeric: tabular-nums;
	}
</style>
