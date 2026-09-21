<script lang="ts">
	/**
	 * DriverRaceRow — kuljettajaprofiilin kisarivi: YHDEN kuljettajan oma
	 * tulos YHDESTÄ kisasta (nimi = kisan/radan nimi, EI kuljettajan nimi —
	 * eri asia kuin RaceResultRow, joka näyttää monen kuljettajan tuloksia
	 * SAMASTA kisasta). Sama ListRow-pohja ja visuaalinen kieli kuin
	 * RaceResultRow.svelte:ssä (positionChange-nuolet, DNF-tunniste) —
	 * katso sen kommentit, ei toisteta tässä.
	 *
	 * Uutta tähän verrattuna: `win`/`podium`/`pole` tulevat `/drivers/
	 * {organiser}/{id}/career`-endpointilta VALMIINA totuusarvoina (ei
	 * pääteltynä), ks. mappers.ts:n DriverCareerRace-kommentti — näytetään
	 * pienenä badge-tekstinä kun jokin niistä on tosi.
	 */
	import ListRow from './ListRow.svelte';

	let {
		raceName,
		position,
		points,
		gapDisplay,
		positionChange,
		win = false,
		podium = false,
		pole = false,
		fastestLap = false,
		dnf = false
	}: {
		raceName: string;
		position: number;
		points: number;
		gapDisplay?: string;
		positionChange?: number;
		win?: boolean;
		podium?: boolean;
		pole?: boolean;
		fastestLap?: boolean;
		dnf?: boolean;
	} = $props();
</script>

<ListRow
	{position}
	name={raceName}
	positionAccent={dnf ? 'danger' : win || fastestLap ? 'highlight' : 'default'}
	metaAccent="warning"
>
	{#snippet meta()}
		{points} pistettä
	{/snippet}
	{#snippet metaSecondary()}
		{#if gapDisplay}
			{gapDisplay}
		{/if}
	{/snippet}
	{#snippet nameTrailing()}
		{#if dnf || pole || positionChange !== undefined}
			<span class="trailing-group">
				{#if dnf}
					<span class="dnf-badge">DNF</span>
				{:else if pole}
					<span class="accolade-badge">Paalupaikka</span>
				{/if}
				{#if positionChange !== undefined}
					<span
						class="position-change"
						data-direction={positionChange > 0 ? 'up' : positionChange < 0 ? 'down' : 'flat'}
					>
						<!--
							Käyttäjän palaute 22.9.2026: pelkkä "▲ 6" ei kerro MISTÄ
							muutos on laskettu — pieni "muutos aika-ajosta"-label
							selventää että luku on ero lähtöruutuun (positionChange =
							starting Position - position, ks. mappers.ts:n
							mapDriverCareerRace) eikä esim. edelliseen kisaan tai
							sarjataulukkoon. Teksti tarkennettu (22.9.2026, toinen
							kierros) "aika-ajosta" -> "muutos aika-ajosta" — pelkkä
							"aika-ajosta" luki helposti niin että LUKU ITSE olisi jokin
							aika-ajotulos, ei muutos siitä.
						-->
						<span class="position-change__label">muutos aika-ajosta</span>
						{#if positionChange > 0}
							<span class="position-change__icon">▲</span><span>{positionChange}</span>
						{:else if positionChange < 0}
							<span class="position-change__icon">▼</span><span>{Math.abs(positionChange)}</span>
						{:else}
							<span class="position-change__icon">─</span>
						{/if}
					</span>
				{/if}
			</span>
		{/if}
	{/snippet}
</ListRow>

<style>
	.trailing-group {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dnf-badge {
		font-size: clamp(0.75rem, 0.64rem + 1cqi, 0.9rem);
		font-weight: 800;
		letter-spacing: 0.03em;
		color: var(--color-danger);
		text-transform: uppercase;
	}

	/* Palkintosija/pole — sama hillitty "tekstitunniste"-periaate kuin DNF-badgessa, eri väri (--color-special, sama kuin "nopein kierros"-korostus). */
	.accolade-badge {
		font-size: clamp(0.75rem, 0.64rem + 1cqi, 0.9rem);
		font-weight: 800;
		letter-spacing: 0.03em;
		color: var(--color-special);
		text-transform: uppercase;
	}

	.position-change__label {
		font-size: clamp(0.7rem, 0.6rem + 0.8cqi, 0.85rem);
		font-weight: 600;
		text-transform: none;
		color: var(--color-text-faint);
	}

	.position-change {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: clamp(0.85rem, 0.72rem + 1.4cqi, 1.05rem);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.position-change__icon {
		font-size: 0.7em;
		line-height: 1;
	}

	.position-change[data-direction='up'] {
		color: var(--color-success);
	}

	.position-change[data-direction='down'] {
		color: var(--color-danger);
	}

	.position-change[data-direction='flat'] {
		color: var(--color-text-faint);
	}
</style>
