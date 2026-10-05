<script lang="ts">
	/**
	 * ReviewSummarySection — auton/radan/yhdistelmän TARKENNUSSIVUN
	 * arvostelulohko: keskiarvo + jakauma (5→1 palkkeina) + kommentilliset
	 * arvostelut. UUSI 2.10.2026. `count === 0` näytetään omana tilanaan
	 * ("ei vielä arvosteluja") sen sijaan että näytettäisiin tyhjä jakauma-
	 * ruudukko — API:n oma huomautus: tämä EI ole virhetila (ks.
	 * mappers.ts:n ReviewSummary-kommentti).
	 */
	let {
		title = 'Arvostelut',
		count,
		average,
		distribution,
		notes
	}: {
		title?: string;
		count: number;
		average?: number;
		distribution: Record<string, number>;
		notes: { score: number; note: string; updatedAt: string }[];
	} = $props();

	/**
	 * API:n `updatedAt` on muotoa "2026-10-02 18:20:11" — EI ISO 8601,
	 * joten `new Date(raw)`:n varaan EI voi luottaa yhtenäisesti kaikissa
	 * JS-moottoreissa (sama tunnettu kompastuskivi kuin muuallakin tässä
	 * koodikannassa, ks. helsinkiTime.ts:n kommentti). Puretaan siis
	 * KÄSIN pelkäksi "pp.k.vvvv"-näyttömuodoksi — aikavyöhykkeen tarkkuus
	 * ei ole tärkeää tässä (pelkkä "milloin arvosteltiin" -tieto), joten
	 * täyttä Helsinki-offsetin laskentaa (ks. parseHelsinkiDateTime) ei
	 * tarvita.
	 */
	function formatReviewDate(raw: string): string {
		const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (!match) return raw;
		const [, year, month, day] = match;
		return `${Number(day)}.${Number(month)}.${year}`;
	}

	const maxDistributionCount = $derived(Math.max(1, ...Object.values(distribution)));
</script>

<div class="review-summary">
	<h2 class="review-summary__title">{title}</h2>

	{#if count === 0}
		<p class="review-summary__empty">Ei vielä arvosteluja — ole ensimmäinen!</p>
	{:else}
		<div class="review-summary__headline">
			<span class="review-summary__average">★ {average?.toLocaleString('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
			<span class="review-summary__count">{count} {count === 1 ? 'arvostelu' : 'arvostelua'}</span>
		</div>

		<div class="review-summary__distribution">
			{#each [5, 4, 3, 2, 1] as score (score)}
				{@const scoreCount = distribution[String(score)] ?? 0}
				<div class="review-summary__bar-row">
					<span class="review-summary__bar-label">{score} ★</span>
					<div class="review-summary__bar-track">
						<div class="review-summary__bar-fill" style="width: {(scoreCount / maxDistributionCount) * 100}%"></div>
					</div>
					<span class="review-summary__bar-count">{scoreCount}</span>
				</div>
			{/each}
		</div>

		{#if notes.length > 0}
			<ul class="review-summary__notes">
				{#each notes as entry, index (index)}
					<li class="review-summary__note">
						<span class="review-summary__note-score">★ {entry.score}</span>
						<p class="review-summary__note-text">{entry.note}</p>
						<span class="review-summary__note-date">{formatReviewDate(entry.updatedAt)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.review-summary {
		/* KORJAUS 5.10.2026: `--space-10` ei ole olemassa tokens.css:ssä
		   (ks. radat/[trackid]/+page.svelte:n `.combo-reviews`-kommentti
		   samasta bugista) — tuntemattoman muuttujan `var()` ilman
		   fallbackia teki `margin-top`:sta invalidin eli käytännössä 0.
		   Korjattu `--space-8`:ksi. */
		margin-top: var(--space-8);
	}

	.review-summary__title {
		margin-bottom: var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.review-summary__empty {
		color: var(--color-text-faint);
	}

	.review-summary__headline {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.review-summary__average {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		color: var(--color-warning);
	}

	.review-summary__count {
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.review-summary__distribution {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-width: 28rem;
		margin-bottom: var(--space-6);
	}

	.review-summary__bar-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.review-summary__bar-label {
		flex: 0 0 2.5rem;
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.review-summary__bar-track {
		flex: 1 1 auto;
		height: 0.5rem;
		border-radius: var(--radius-full);
		background: var(--color-surface);
		overflow: hidden;
	}

	.review-summary__bar-fill {
		height: 100%;
		background: var(--color-warning);
		border-radius: var(--radius-full);
		transition: width 0.3s ease-out;
	}

	.review-summary__bar-count {
		flex: 0 0 1.5rem;
		text-align: right;
		color: var(--color-text-faint);
		font-variant-numeric: tabular-nums;
	}

	/* `reset.css` nollaa vain marginaalin, ei `<ul>`:n oletuspaddingia/pisteitä — sama tunnettu korjaus kuin muuallakin sivustolla. */
	.review-summary__notes {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.review-summary__note {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.review-summary__note-score {
		color: var(--color-warning);
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.review-summary__note-text {
		margin-top: var(--space-1);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.review-summary__note-date {
		display: block;
		margin-top: var(--space-1);
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}
</style>
