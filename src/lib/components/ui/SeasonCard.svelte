<script lang="ts">
	/**
	 * SeasonCard — /kaudet-indeksisivun kausikortti. Sama "koko kortti on
	 * yksi linkki" -periaate kuin TrackCard.svelte:ssä.
	 */
	let {
		id,
		name,
		driversCount,
		leaderName,
		leaderPoints
	}: {
		id: number;
		name: string;
		driversCount: number;
		leaderName?: string;
		leaderPoints?: number;
	} = $props();
</script>

<a class="season-card" href="/kaudet/{id}">
	<h3 class="season-card__name">{name}</h3>
	<p class="season-card__meta">{driversCount} {driversCount === 1 ? 'kuljettaja' : 'kuljettajaa'}</p>
	{#if leaderName !== undefined}
		<div class="season-card__leader">
			<span class="season-card__leader-label">Sarjajohtaja</span>
			<span class="season-card__leader-name">{leaderName}</span>
			{#if leaderPoints !== undefined}
				<span class="season-card__leader-points">{leaderPoints} pistettä</span>
			{/if}
		</div>
	{/if}
</a>

<style>
	.season-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	/*
	 * Käyttäjän palaute 22.9.2026 (TrackCard.svelte:n yhteydessä, mutta
	 * käyttäjä koki saman kaikilla kortti-tyyppisillä komponenteilla):
	 * `translateY(-2px)`-nosto hoverissa poistettu — jäljellä pelkkä
	 * reunaväri, ks. TrackCard.svelte:n vastaava kommentti perusteluineen.
	 */
	.season-card:hover {
		border-color: var(--color-info);
	}

	.season-card__name {
		font-size: var(--font-size-lg);
		font-weight: 800;
	}

	.season-card__meta {
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.season-card__leader {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--color-surface-border);
	}

	.season-card__leader-label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-faint);
		flex-basis: 100%;
	}

	.season-card__leader-name {
		font-weight: 800;
	}

	.season-card__leader-points {
		color: var(--color-warning);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>
