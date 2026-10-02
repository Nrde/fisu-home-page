<script lang="ts">
	/**
	 * Arvostelujen kirjautumis- ja lähetyssivu — UUSI 2.10.2026, käyttäjän
	 * pyyntö ("login screen and pw field"). Ks. +page.server.ts:n kommentti
	 * siitä MIKSI tässä ei ole evästepohjaista istuntoa — token ja
	 * "mitä saan arvostella" -lista elävät VAIN tämän sivunäytön ajan
	 * `$state`:ssa, sivun päivitys vaatii uuden kirjautumisen.
	 */
	import { enhance } from '$app/forms';
	import ReviewItemForm from '#lib/components/ui/ReviewItemForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	type Session = NonNullable<Extract<ActionData, { session: unknown }>['session']>;

	let session = $state<Session | undefined>(undefined);
	let loggingIn = $state(false);

	/**
	 * Avain per arvosteltava kohde — `carId`/`trackId` yhdistettynä, koska
	 * sama auto voi esiintyä sekä omana arvosteluna ETTÄ osana useampaa
	 * yhdistelmää (eri radoilla). `''`-merkki puolella joka ei ole käytössä
	 * ei koskaan törmää oikeaan arvoon, koska auton id on aina numero ja
	 * radan id aina ei-tyhjä merkkijono.
	 */
	function reviewKey(carId: number | null, trackId: string | null): string {
		return `${carId ?? ''}|${trackId ?? ''}`;
	}

	let myReviewsByKey = $state<Map<string, { score: number; note?: string }>>(new Map());

	/*
	 * BUGIKORJAUS (2.10.2026, käyttäjän raportoima "effect_update_depth_
	 * exceeded"): tämä kirjoitti `session`:iin JA LUKI SEN HETI PERÄÄN
	 * (`session.myReviews.map(...)`) SAMAN effectin SISÄLLÄ — Svelte 5
	 * tulkitsee tämän "efekti lukee ja kirjoittaa samaa tilaa" -sykliksi,
	 * koska `session`-tilan LUKEMINEN (vaikka vasta omassa kirjoituksensa
	 * jälkeen) rekisteröityy silti tämän effectin riippuvuudeksi, joka
	 * sitten laukeaisi uudelleen `session`:n muuttuessa — ÄÄRETÖN silmukka.
	 * Korjaus: luetaan `form.session` PAIKALLISEEN muuttujaan (`newSession`,
	 * tavallinen JS-muuttuja, EI reaktiivinen `$state`) ja käytetään SITÄ
	 * sekä `session`:n kirjoitukseen ETTÄ `myReviewsByKey`:n laskentaan —
	 * `session`-TILAA ei enää koskaan LUETA tämän effectin sisällä, vain
	 * kirjoitetaan, joten riippuvuussykliä ei synny.
	 */
	$effect(() => {
		if (form && 'session' in form && form.session) {
			const newSession = form.session as Session;
			session = newSession;
			myReviewsByKey = new Map(
				newSession.myReviews.map((review) => [reviewKey(review.carId, review.trackId), { score: review.score, note: review.note }])
			);
		}
	});

	function handleSaved(result: { carId: number | null; trackId: string | null; score: number; note?: string }) {
		const next = new Map(myReviewsByKey);
		next.set(reviewKey(result.carId, result.trackId), { score: result.score, note: result.note });
		myReviewsByKey = next;
	}

	const loginError = $derived(form && 'loginError' in form ? (form.loginError as string) : undefined);
</script>

<svelte:head>
	<title>Arvostelut — FISU</title>
	<meta name="description" content="Arvostele autoja, ratoja ja auto+rata-yhdistelmiä, tai selaa yhteisön arvosteluja." />
</svelte:head>

<section class="page-grid section">
	<h1 class="page-title">Arvostelut</h1>
	<p class="page-intro">
		Arvostele asteikolla 1–5 autoja, ratoja ja niiden yhdistelmiä joita olet oikeasti ajanut FISU:n kisoissa. Arvostelut
		ovat anonyymejä.
	</p>

	{#if !session}
		<!--
			Kirjautumislomake käyttää TAVALLISTA (ei-custom) `use:enhance`:ia —
			sivulla on vain TÄMÄ yksi kirjautumislomake, ei useita samanaikaisia
			kuten arvostelulomakkeilla (ks. ReviewItemForm.svelte:n kommentti
			miksi NE käyttävät omaa käsittelijäänsä), joten jaetun `form`-propsin
			oletustoiminta riittää tänne ongelmitta.
		-->
		<form
			method="POST"
			action="?/login"
			class="login-form"
			use:enhance={() => {
				loggingIn = true;
				return async ({ update }) => {
					loggingIn = false;
					await update();
				};
			}}
		>
			<label class="login-form__field">
				<span>Steam ID (SteamID64, 17 numeroa)</span>
				<input type="text" name="steamId" inputmode="numeric" pattern="[0-9]{'{'}17{'}'}" required autocomplete="off" />
			</label>
			<label class="login-form__field">
				<span>Salasana</span>
				<input type="password" name="pw" required autocomplete="off" />
			</label>
			<button type="submit" class="login-form__submit" disabled={loggingIn}>
				{loggingIn ? 'Kirjaudutaan…' : 'Kirjaudu'}
			</button>
			{#if loginError}
				<p class="login-form__error">{loginError}</p>
			{/if}
			<p class="login-form__hint">
				Salasana on jaettu FISU:n sisäisessä Discordissa — kysy ylläpidolta jos et löydä sitä.
			</p>
			<!--
				UUSI 2.10.2026 — API-tiimin diagnoosi: kuljettajan ENSIMMÄINEN
				kirjautuminen voi joutua laskemaan koko hänen urahistoriansa ensi
				kertaa (kylmä välimuisti), kestäen kymmeniä sekunteja. Ilman tätä
				huomautusta napin "Kirjaudutaan…"-teksti näyttäisi jumiutuneelta/
				rikkinäiseltä juuri silloin kun se EI ole — myöhemmät kirjautumiset
				samalle kuljettajalle ovat nopeita (ks. +page.server.ts:n `config`-
				kommentti tunnetusta Vercel-aikakatkaisun jäännösriskistä).
			-->
			{#if loggingIn}
				<p class="login-form__hint login-form__hint--loading">
					Ensimmäinen kirjautuminen voi kestää jopa minuutin — myöhemmät kirjautumiset ovat nopeita.
				</p>
			{/if}
		</form>
	{:else}
		<div class="session-header">
			<p>Kirjautunut: <strong>{session.driverName}</strong></p>
			<button type="button" class="session-header__logout" onclick={() => (session = undefined)}>Kirjaudu ulos</button>
		</div>

		{#if session.cars.length > 0}
			<h2 class="section-title">Autot</h2>
			<div class="review-grid">
				{#each session.cars as car (car.carId)}
					{@const existing = myReviewsByKey.get(reviewKey(car.carId, null))}
					<ReviewItemForm
						token={session.token}
						carId={car.carId}
						label={car.name}
						racesCount={car.races}
						initialScore={existing?.score}
						initialNote={existing?.note}
						onSaved={handleSaved}
					/>
				{/each}
			</div>
		{/if}

		{#if session.tracks.length > 0}
			<h2 class="section-title">Radat</h2>
			<div class="review-grid">
				{#each session.tracks as track (track.trackId)}
					{@const existing = myReviewsByKey.get(reviewKey(null, track.trackId))}
					<ReviewItemForm
						token={session.token}
						trackId={track.trackId}
						label={track.trackName}
						racesCount={track.races}
						initialScore={existing?.score}
						initialNote={existing?.note}
						onSaved={handleSaved}
					/>
				{/each}
			</div>
		{/if}

		{#if session.combos.length > 0}
			<h2 class="section-title">Auto + rata -yhdistelmät</h2>
			<div class="review-grid">
				{#each session.combos as combo (combo.carId + '|' + combo.trackId)}
					{@const existing = myReviewsByKey.get(reviewKey(combo.carId, combo.trackId))}
					{@const car = session.cars.find((c) => c.carId === combo.carId)}
					{@const track = session.tracks.find((t) => t.trackId === combo.trackId)}
					<ReviewItemForm
						token={session.token}
						carId={combo.carId}
						trackId={combo.trackId}
						label="{car?.name ?? `Auto ${combo.carId}`} · {track?.trackName ?? combo.trackId}"
						racesCount={combo.races}
						initialScore={existing?.score}
						initialNote={existing?.note}
						onSaved={handleSaved}
					/>
				{/each}
			</div>
		{/if}

		{#if session.cars.length === 0 && session.tracks.length === 0 && session.combos.length === 0}
			<p class="empty-state">Et ole vielä ajanut yhtäkään FISU-kisaa jolle olisi tiedossa auto tai rata.</p>
		{/if}
	{/if}
</section>

<style>
	.section {
		padding-block: var(--space-12);
	}

	.page-title {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.page-intro {
		margin-top: var(--space-1);
		margin-bottom: var(--space-8);
		max-width: 60ch;
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 24rem;
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
	}

	.login-form__field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.login-form__field input {
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-sm);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text);
		font-size: var(--font-size-base);
	}

	.login-form__submit {
		padding: var(--space-2) var(--space-6);
		border-radius: var(--radius-full);
		background: var(--color-info);
		color: var(--color-bg);
		font-weight: 700;
	}

	.login-form__submit:disabled {
		opacity: 0.6;
	}

	.login-form__error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
	}

	.login-form__hint {
		color: var(--color-text-faint);
		font-size: var(--font-size-sm);
	}

	/* Aktiivinen "tämä voi kestää" -tila, ei vain passiivinen vihje — eri väri erottaa sen yläpuolisesta pysyvästä salasanavihjeestä. */
	.login-form__hint--loading {
		color: var(--color-info);
		font-weight: 600;
	}

	.session-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--color-surface-border);
	}

	.session-header__logout {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		text-decoration: underline;
		text-decoration-color: transparent;
		transition: text-decoration-color var(--duration-fast) var(--ease-out-quart);
	}

	.session-header__logout:hover {
		text-decoration-color: currentColor;
	}

	.section-title {
		margin-top: var(--space-10);
		margin-bottom: var(--space-4);
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.review-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
		gap: var(--space-3);
	}

	.empty-state {
		color: var(--color-text-faint);
	}
</style>
