<script lang="ts">
	/**
	 * ReviewBadge — pieni "★ 3.9 (7)" -pilleri listakorteille (CarCard/
	 * TrackCard) — UUSI 2.10.2026, käyttäjän pyyntö arvostelujen
	 * näyttämisestä "perus ei-dynaamisen datan" rinnalla. `undefined`
	 * `average` (ei yhtään arvostelua vielä) näyttää hillityn "Ei
	 * arvosteluja" -tekstin sen sijaan että piilottaisi koko badgen —
	 * käyttäjä näkee tällöin SUORAAN että kohdetta ei ole vielä arvioitu,
	 * ei vain arvaa puuttuuko tieto vai onko se nolla.
	 */
	let { average, count }: { average?: number; count: number } = $props();
</script>

{#if average !== undefined}
	<span class="review-badge" data-accent="warning">
		★ {average.toLocaleString('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
		<span class="review-badge__count">({count})</span>
	</span>
{:else}
	<span class="review-badge review-badge--empty">Ei arvosteluja</span>
{/if}

<style>
	.review-badge {
		--accent: var(--color-warning);

		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.2em 0.65em;
		border-radius: var(--radius-full);
		background: color-mix(in oklch, var(--accent) 16%, var(--color-surface));
		border: 1px solid color-mix(in oklch, var(--accent) 32%, transparent);
		color: var(--accent);
		font-size: clamp(0.78rem, 0.68rem + 0.6cqi, 0.9rem);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.review-badge__count {
		color: color-mix(in oklch, var(--accent) 70%, var(--color-text-muted));
		font-weight: 600;
	}

	.review-badge--empty {
		--accent: var(--color-text-faint);
		color: var(--color-text-faint);
		font-weight: 600;
	}
</style>
