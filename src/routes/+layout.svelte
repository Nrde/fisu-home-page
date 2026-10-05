<script lang="ts">
	import '#lib/styles/tokens.css';
	import '#lib/styles/reset.css';
	import '#lib/styles/global.css';
	import Header from '#lib/components/layout/Header.svelte';
	import Footer from '#lib/components/layout/Footer.svelte';
	import { navigating } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<!--
		PÄIVITETTY (1.10.2026, käyttäjän pyyntö): aiempi favicon oli
		SvelteKitin OMA aloitusmallin Svelte-logo (`src/lib/assets/
		favicon.svg`, otsikko kirjaimellisesti "svelte-logo") — ei koskaan
		vaihdettu FISU-brändiin. Korvattu `static/fisu-logo.png`:stä (ks.
		Header.svelte:n logokommentti) generoiduilla ikoneilla: rajattu
		läpinäkyvään neliöön ImageMagickilla, useina kokoina koska mikään
		yksittäinen koko ei kelpaa kaikkialle (perinteinen moniresoluutio-
		.ico isoimmalle osalle selaimia, PNG:t tarkoille koko-pyynnöille,
		`apple-touch-icon` KIINTEÄLLÄ taustavärillä koska läpinäkyvyys
		näkyy rumasti mustana vanhemmissa iOS-versioissa kun kuvaketta ei
		ole tarkoitettu pyöristettäväksi/maskattavaksi niiden toimesta).
		`static/`-tiedostot EIVÄT tarvitse Vite-importtia (eri tapa kuin
		aiempi `.svg`), selain osaa myös hakea `/favicon.ico`:n suoraan
		juuresta ilman `<link>`-tagiakin — tagi on silti mukana selkeyden
		ja tarkkojen kokovihjeiden vuoksi.
	-->
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
	<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

<!--
	UUSI 5.10.2026, käyttäjän palaute: "sivut tuntuvat hitailta ... sivusto
	ei tunnu reagoivan mitenkään" linkin klikkauksen jälkeen ennen kuin
	seuraava sivu ilmestyy kerralla. Tämä EI ratkaise itse hitautta (joka
	tulee palvelinpuolen API-kutsuista `+page.server.ts`-tiedostoissa,
	ks. CLAUDE.md), mutta antaa VÄLITTÖMÄN visuaalisen vahvistuksen siitä
	että klikkaus meni perille ja sivu on latautumassa — `navigating` on
	SvelteKitin OMA `$app/state`-tila (reaktiivinen suoraan, ei store/`$`-
	etuliitettä), joka on `undefined`/`null`-arvoinen `to`-kentältään kun
	mitään navigointia ei ole käynnissä, ja täyttyy heti linkin klikkauksen
	jälkeen ennen kuin uuden sivun `load`-funktiot ovat edes valmiita.
-->
{#if navigating.to}
	<div class="route-loading-bar" aria-hidden="true"></div>
{/if}

<a href="#main" class="skip-link">Siirry pääsisältöön</a>

<Header />

<main id="main">
	{@render children()}
</main>

<Footer />

<style>
	/*
	 * Epämääräinen ("indeterminate") latauspalkki sivun yläreunassa —
	 * ei tiedetä TODELLISTA latautumisprosenttia (SvelteKitin `navigating`
	 * ei anna sellaista), joten palkki vain liukuu edestakaisin niin kauan
	 * kuin `navigating.to` on asetettu (ks. +layout.svelte:n yläosan
	 * kommentti). `position: fixed` + korkea `z-index` pitää sen aina
	 * näkyvissä riippumatta vierityksestä, myös `Header`:in yläpuolella.
	 */
	.route-loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 3px;
		z-index: 1000;
		overflow: hidden;
		background: color-mix(in oklch, var(--color-info) 15%, transparent);
	}

	.route-loading-bar::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		width: 40%;
		background: var(--color-info);
		border-radius: var(--radius-full);
		animation: route-loading-slide 1s var(--ease-out-quart) infinite;
	}

	@keyframes route-loading-slide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(350%);
		}
	}

	/* Käyttäjä joka on pyytänyt vähemmän liikettä ei halua jatkuvasti
	   liikkuvaa palkkia — näytetään silti KIINTEÄ täysi palkki ilman
	   animaatiota, jotta lataus on silti visuaalisesti havaittavissa. */
	@media (prefers-reduced-motion: reduce) {
		.route-loading-bar::after {
			width: 100%;
			animation: none;
		}
	}
</style>
