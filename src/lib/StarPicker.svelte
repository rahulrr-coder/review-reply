<script lang="ts">
	import type { Stars } from './types.js';

	let {
		value = $bindable(),
		label = 'Star rating',
		size = 'lg'
	}: { value: Stars | 0; label?: string; size?: 'lg' | 'sm' } = $props();
</script>

<div class="stars {size}" role="radiogroup" aria-label={label}>
	{#each [1, 2, 3, 4, 5] as n (n)}
		<button
			type="button"
			class:on={value >= n}
			role="radio"
			aria-checked={value === n}
			aria-label="{n} star{n > 1 ? 's' : ''}"
			onclick={() => (value = n as Stars)}
		>★</button>
	{/each}
</div>

<style>
	.stars {
		display: flex;
		gap: 2px;
	}
	button {
		border: 0;
		background: none;
		padding: 0;
		line-height: 1;
		color: var(--line);
		cursor: pointer;
		transition: color 120ms, transform 120ms;
	}
	.lg button {
		font-size: 34px;
		min-width: 44px;
		min-height: 44px;
	}
	.sm button {
		font-size: 22px;
		min-width: 32px;
		min-height: 36px;
	}
	button.on {
		color: var(--gold);
	}
	button:active {
		transform: scale(0.88);
	}
</style>
