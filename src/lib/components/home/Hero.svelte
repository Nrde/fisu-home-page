<script lang="ts">
	import Button from '#lib/components/ui/Button.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';

	let {
		seasonName,
		organiserName = 'Finnish Simracing United'
	}: {
		seasonName: string;
		organiserName?: string;
	} = $props();
</script>

<section class="hero bleed">
	<div class="hero__glow" aria-hidden="true"></div>
	<div class="hero__content">
		<Badge accent="info">Käynnissä nyt</Badge>
		<h1 class="hero__title">
			{organiserName}
		</h1>
		<p class="hero__subtitle">{seasonName}</p>
		<div class="hero__actions">
			<Button variant="primary" href="/kaudet">Katso kausi</Button>
			<Button variant="ghost" href="/kuljettajat">Kuljettajat</Button>
		</div>
	</div>
</section>

<style>
	.hero {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 70svh;
		padding-block: var(--space-16);
		overflow: clip;
		text-align: center;
	}

	.hero__glow {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(
				ellipse 60% 50% at 50% 0%,
				color-mix(in oklch, var(--color-info) 22%, transparent),
				transparent 70%
			),
			radial-gradient(
				ellipse 40% 40% at 85% 30%,
				color-mix(in oklch, var(--color-special) 14%, transparent),
				transparent 70%
			);
	}

	.hero__content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		max-width: 48rem;
	}

	.hero__title {
		font-size: var(--font-size-hero);
		font-weight: 900;
		letter-spacing: -0.02em;
		/* 0.95 leikkasi alamerkkejä (g, y) koska rivikorkeus jäi
		   kirjaimen todellista mittaa pienemmäksi — background-clip:
		   text noudattaa rivilaatikon rajoja tarkasti. 1.05 antaa
		   alamerkeille tilan ja pysyy silti visuaalisesti tiiviinä. */
		line-height: 1.05;
		padding-block-end: 0.08em;
		background: linear-gradient(160deg, var(--color-text) 30%, var(--color-info) 100%);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.hero__subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.hero__actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
