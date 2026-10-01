<script lang="ts">
	import '#lib/styles/tokens.css';
	import '#lib/styles/reset.css';
	import '#lib/styles/global.css';
	import Header from '#lib/components/layout/Header.svelte';
	import Footer from '#lib/components/layout/Footer.svelte';

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

<a href="#main" class="skip-link">Siirry pääsisältöön</a>

<Header />

<main id="main">
	{@render children()}
</main>

<Footer />
