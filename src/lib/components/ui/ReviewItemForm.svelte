<script lang="ts">
	/**
	 * ReviewItemForm — YHDEN arvosteltavan kohteen (auto/rata/yhdistelmä)
	 * pieni lomake arvostelut-sivulla. UUSI 2.10.2026.
	 *
	 * TÄRKEÄ RAKENNEPÄÄTÖS: käyttää OMAA `use:enhance`-käsittelijäänsä
	 * joka kutsuu `onSaved`/`onError`-propseja suoraan, sen sijaan että
	 * luottaisi SvelteKitin jaettuun `form`-propsiin. Syy: sivulla on
	 * MONTA tällaista lomaketta samanaikaisesti (yksi per auto/rata/
	 * yhdistelmä) — jaettu `form`-propsi heijastaisi VAIN VIIMEISIMMÄN
	 * lähetetyn lomakkeen tuloksen, joten kaksi eri korttia EIVÄT voisi
	 * luotettavasti näyttää kumpikin omaa tilaansa (onnistui/virhe) jos
	 * käyttäjä lähettää useita peräkkäin. Oma callback-pohjainen käsittely
	 * välttää tämän kokonaan.
	 */
	import { enhance } from '$app/forms';

	let {
		token,
		carId,
		trackId,
		label,
		racesCount,
		initialScore,
		initialNote,
		onSaved
	}: {
		token: string;
		carId?: number;
		trackId?: string;
		label: string;
		racesCount: number;
		initialScore?: number;
		initialNote?: string;
		onSaved: (result: { carId: number | null; trackId: string | null; score: number; note?: string }) => void;
	} = $props();

	// HUOM: svelte-check varoittaa näistä ("captures only the initial value") —
	// TARKOITUKSELLISTA. Jokainen ReviewItemForm on OMA komponentti-instanssinsa
	// avainnetussa {#each}-lohkossa (ks. +page.svelte), joten `initialScore`/
	// `initialNote` muuttuvat VAIN kun koko komponentti luodaan uudelleen eri
	// kohteelle — silloin alkuarvon "kaappaus" on juuri haluttu käytös
	// (esitäyttö), ei bugi jota pitäisi korjata `$derived`:llä.
	let score = $state(initialScore ?? 0);
	let note = $state(initialNote ?? '');
	let submitting = $state(false);
	let error = $state<string | undefined>(undefined);
	let saved = $state(initialScore !== undefined);
</script>

<form
	method="POST"
	action="?/submit"
	class="review-item"
	use:enhance={() => {
		submitting = true;
		error = undefined;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'success' && result.data?.submitted) {
				const submitted = result.data.submitted as {
					carId: number | null;
					trackId: string | null;
					score: number;
					note?: string;
				};
				saved = true;
				onSaved(submitted);
			} else if (result.type === 'failure') {
				error = (result.data?.submitError as string | undefined) ?? 'Tallennus epäonnistui.';
			} else if (result.type === 'error') {
				error = 'Odottamaton virhe — yritä uudelleen.';
			}
		};
	}}
>
	<input type="hidden" name="token" value={token} />
	{#if carId !== undefined}
		<input type="hidden" name="carId" value={carId} />
	{/if}
	{#if trackId !== undefined}
		<input type="hidden" name="trackId" value={trackId} />
	{/if}
	<input type="hidden" name="score" value={score} />

	<div class="review-item__header">
		<span class="review-item__label">{label}</span>
		<span class="review-item__races">{racesCount} {racesCount === 1 ? 'kisa' : 'kisaa'}</span>
	</div>

	<div class="review-item__score" role="radiogroup" aria-label="Arvosana 1–5">
		{#each [1, 2, 3, 4, 5] as value (value)}
			<button
				type="button"
				class="review-item__star"
				class:review-item__star--active={score >= value}
				aria-pressed={score === value}
				onclick={() => {
					score = value;
					saved = false;
				}}
			>
				★
			</button>
		{/each}
	</div>

	<textarea
		name="note"
		bind:value={note}
		oninput={() => (saved = false)}
		placeholder="Kommentti (valinnainen)"
		maxlength="500"
		rows="2"
		class="review-item__note"
	></textarea>

	<div class="review-item__footer">
		<button type="submit" class="review-item__save" disabled={score === 0 || submitting}>
			{#if submitting}
				Tallennetaan…
			{:else if saved}
				Tallennettu ✓
			{:else if initialScore !== undefined}
				Päivitä arvio
			{:else}
				Tallenna arvio
			{/if}
		</button>
		{#if error}
			<span class="review-item__error">{error}</span>
		{/if}
	</div>
</form>

<style>
	.review-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-border);
		transition: border-color var(--duration-fast) var(--ease-out-quart);
	}

	.review-item:focus-within {
		border-color: var(--color-info);
	}

	.review-item__header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-2) var(--space-4);
	}

	.review-item__label {
		font-weight: 700;
	}

	.review-item__races {
		font-size: var(--font-size-sm);
		color: var(--color-text-faint);
	}

	.review-item__score {
		display: flex;
		gap: var(--space-1);
	}

	.review-item__star {
		font-size: var(--font-size-xl, 1.5rem);
		line-height: 1;
		color: var(--color-surface-border);
		transition: color var(--duration-fast) var(--ease-out-quart);
	}

	.review-item__star--active {
		color: var(--color-warning);
	}

	.review-item__note {
		width: 100%;
		resize: vertical;
		background: var(--color-bg);
		border: 1px solid var(--color-surface-border);
		border-radius: var(--radius-sm);
		padding: var(--space-2);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-family: inherit;
	}

	.review-item__footer {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.review-item__save {
		padding: var(--space-1) var(--space-4);
		border-radius: var(--radius-full);
		background: var(--color-info);
		color: var(--color-bg);
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.review-item__save:disabled {
		opacity: 0.5;
	}

	.review-item__error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
	}
</style>
