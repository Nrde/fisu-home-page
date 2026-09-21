<script lang="ts">
	/**
	 * TrackCard — /radat-indeksisivun ratakortti. Koko kortti on yksi
	 * linkki radan tarkennussivulle (ks. UpcomingRaceCard.svelte:n
	 * tyylikonventiot, joita tämä mukailee) — ei erillistä "avaa"-nappia,
	 * koska koko kortin sisältö on samaa yhtä toimintoa ("näytä tämä
	 * rata") eikä mitään muuta klikattavaa ole kortin sisällä.
	 */
	/**
	 * `imageUrl`-pikkukuva (22.9.2026, käyttäjän vahvistama base-URL):
	 * jos kuva epäonnistuu lataamaan tai sitä ei ole, piilotetaan koko
	 * kuvalohko kortin sisällä — kortti toimii silti täysin ilman kuvaa
	 * (sama periaate kuin tarkennussivun `track-map`, ks. sen kommentti).
	 */
	let {
		id,
		name,
		location,
		length,
		turns,
		built,
		imageUrl
	}: {
		id: string;
		name: string;
		location: string;
		length?: string;
		turns?: number;
		built?: string;
		imageUrl?: string;
	} = $props();

	let imageFailed = $state(false);
</script>

<a class="track-card" href="/radat/{id}">
	{#if imageUrl && !imageFailed}
		<div class="track-card__image">
			<img src={imageUrl} alt="" loading="lazy" onerror={() => (imageFailed = true)} />
		</div>
	{/if}
	<h3 class="track-card__name">{name}</h3>
	<p class="track-card__location">{location}</p>
	{#if length !== undefined || turns !== undefined || built !== undefined}
		<div class="track-card__stats">
			{#if length !== undefined}<span>{length}</span>{/if}
			{#if turns !== undefined}<span>{turns} mutkaa</span>{/if}
			{#if built !== undefined}<span>v. {built}</span>{/if}
		</div>
	{/if}
</a>

<style>
	.track-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-lg);
		/* HUOM: `.track-card__image` ulottuu negatiivisella marginaalilla
		   kortin reunoihin asti (ks. sen kommentti) — `clip` leikkaa sen
		   kulmat kortin omaan pyöristykseen, sama tekniikka kuin
		   ListRow.svelte:n `.list-row__position`-lohkolla. */
		overflow: clip;
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition:
			border-color var(--duration-fast) var(--ease-out-quart),
			transform var(--duration-fast) var(--ease-out-quart);
	}

	.track-card:hover {
		border-color: var(--color-info);
		transform: translateY(-2px);
	}

	.track-card__image {
		margin: calc(var(--space-4) * -1) calc(var(--space-6) * -1) 0;
		padding: var(--space-3) var(--space-6);
		background: color-mix(in oklch, white 96%, var(--color-bg));
	}

	.track-card__image img {
		display: block;
		width: 100%;
		height: 96px;
		object-fit: contain;
	}

	.track-card__name {
		font-size: var(--font-size-lg);
		font-weight: 800;
	}

	.track-card__location {
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.track-card__stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		margin-top: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-faint);
		font-variant-numeric: tabular-nums;
	}

	/* Pisteerotin perättäisten tilastojen väliin, ei ensimmäisen eteen —
	   sama "sisällön muoto määrää CSS:n" -periaate kuin muualla sivustolla
	   (esim. list-row__meta-secondary:empty). */
	.track-card__stats span:not(:first-child)::before {
		content: '·';
		margin-right: var(--space-3);
		color: var(--color-surface-border);
	}
</style>
