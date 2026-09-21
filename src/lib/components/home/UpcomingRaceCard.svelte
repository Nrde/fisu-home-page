<script lang="ts">
	/**
	 * UpcomingRaceCard — nostaa esiin seuraavan ajettavan kisan.
	 *
	 * Laskuri (päivää/tuntia/minuuttia jäljellä) tulee `createCountdown`-
	 * apufunktiosta (#lib/utils/countdown.svelte.ts) — itse komponentti
	 * ei tiedä MITEN aika lasketaan, vain MITÄ näytetään. Tämä on sama
	 * "logiikka erilleen näkymästä" -periaate kuin StatTilen
	 * `inView`-actionissa.
	 */
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import { createCountdown } from '#lib/utils/countdown.svelte.ts';

	let {
		seasonName,
		raceNumber,
		trackName,
		date,
		simulator,
		href
	}: {
		seasonName: string;
		/** Kauden kisan järjestysnumero, esim. 7 -> "Kierros 7" */
		raceNumber: number;
		trackName: string;
		date: Date;
		/**
		 * Lyhyt simulaattoritunniste, esim. "ACC". Valinnainen: API ei
		 * (vielä) tarjoa simulaattoritietoa per kisa `/races/{season}`-
		 * endpointista (tilanne 20.9.2026, kysytty API-tsätiltä) — badge
		 * jää vain näkymättä kunnes se on saatavilla, ei kaada mitään.
		 */
		simulator?: string;
		href: string;
	} = $props();

	// $derived.by(): käytetään kun laskennassa on useampi askel/haara
	// eikä pelkkä yksi lauseke — tässä muotoillaan päivämäärä Suomen
	// aikavyöhykkeelle sopivaksi tekstiksi.
	const formattedDate = $derived.by(() => {
		return new Intl.DateTimeFormat('fi-FI', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	});

	const countdown = createCountdown(() => date);
</script>

<article class="upcoming-race">
	<div class="upcoming-race__info">
		{#if simulator}
			<Badge accent="special">{simulator}</Badge>
		{/if}
		<h3 class="upcoming-race__track">{trackName}</h3>
		<p class="upcoming-race__meta">
			{seasonName} — Kierros {raceNumber}
		</p>
		<p class="upcoming-race__date">{formattedDate}</p>
		<Button variant="primary" {href}>Kisan tiedot</Button>
	</div>

	{#if !countdown.isPast}
		<div class="upcoming-race__countdown" role="timer" aria-label="Aikaa kisan alkuun">
			<div class="upcoming-race__countdown-unit">
				<p class="upcoming-race__countdown-value">{countdown.days}</p>
				<p class="upcoming-race__countdown-label">Päivää</p>
			</div>
			<div class="upcoming-race__countdown-unit">
				<p class="upcoming-race__countdown-value">{countdown.hours}</p>
				<p class="upcoming-race__countdown-label">Tuntia</p>
			</div>
			<div class="upcoming-race__countdown-unit">
				<p class="upcoming-race__countdown-value">{countdown.minutes}</p>
				<p class="upcoming-race__countdown-label">Minuuttia</p>
			</div>
		</div>
	{/if}
</article>

<style>
	.upcoming-race {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-8);
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		position: relative;
		overflow: clip;
	}

	.upcoming-race::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			ellipse 70% 60% at 100% 0%,
			color-mix(in oklch, var(--color-special) 16%, transparent),
			transparent 70%
		);
	}

	.upcoming-race__info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		max-width: 32rem;
	}

	.upcoming-race__track {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.upcoming-race__meta {
		font-size: var(--font-size-base);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.upcoming-race__date {
		font-size: var(--font-size-sm);
		color: var(--color-text-faint);
		margin-bottom: var(--space-2);
		text-transform: capitalize;
	}

	.upcoming-race__countdown {
		display: flex;
		gap: var(--space-6);
		flex-shrink: 0;
	}

	.upcoming-race__countdown-unit {
		text-align: center;
	}

	.upcoming-race__countdown-value {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		background: linear-gradient(135deg, var(--color-text) 0%, var(--color-special) 120%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.upcoming-race__countdown-label {
		margin-top: var(--space-1);
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}
</style>
