<script lang="ts">
	import type { ReplyResult } from './types.js';

	let { result }: { result: ReplyResult } = $props();

	const STYLE_LABEL = { short: 'Short', standard: 'Standard', warm: 'Warm' } as const;
	const SENTIMENT_CLASS = { positive: 'pos', mixed: 'mid', negative: 'neg' } as const;

	let copied = $state<number | null>(null);
	let blocked = $state<number | null>(null);

	const words = (t: string) => t.trim().split(/\s+/).length;

	async function copy(i: number, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			blocked = null;
			copied = i;
			setTimeout(() => {
				if (copied === i) copied = null;
			}, 1500);
		} catch {
			blocked = i;
		}
	}
</script>

<div class="meta">
	<span class="sentiment {SENTIMENT_CLASS[result.sentiment]}">{result.sentiment}</span>
	<span class="muted">{result.language}</span>
</div>

<div class="slips">
	{#each result.replies as r, i (r.style)}
		<div class="slip">
			<div class="slip-head">
				<span class="label">{STYLE_LABEL[r.style]} · {words(r.text)} words</span>
				<button type="button" class="copy" onclick={() => copy(i, r.text)}>
					{copied === i ? 'Copied ✓' : 'Copy'}
				</button>
			</div>
			<p>{r.text}</p>
			{#if copied === i}<span class="stamp" aria-hidden="true">Copied</span>{/if}
			{#if blocked === i}<p class="hint">Your browser blocked copying. Press and hold the text to copy it.</p>{/if}
		</div>
	{/each}
</div>

{#if result.ownerNote}
	<aside class="note">
		<span class="label">For you only, don't post</span>
		<p>{result.ownerNote}</p>
	</aside>
{/if}

<style>
	.meta {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		font-size: 15px;
	}
	.sentiment {
		font: 600 12px/1 var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 6px 10px;
		border-radius: 6px;
	}
	.pos {
		color: var(--carbon);
		background: var(--wash);
	}
	.mid {
		color: var(--gold);
		background: var(--gold-wash);
	}
	.neg {
		color: var(--stamp);
		background: var(--stamp-wash);
	}

	.slips {
		display: grid;
		gap: 14px;
		margin-top: 12px;
	}

	/* A tear-off slip: perforated top edge punched in the colour of the card behind it. */
	.slip {
		position: relative;
		background: var(--slip);
		border-radius: 3px 3px 10px 10px;
		padding: 18px 16px 14px;
		overflow: hidden;
	}
	.slip::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 6px;
		background: radial-gradient(circle at 6px 0, var(--card) 3.5px, transparent 4px) repeat-x;
		background-size: 12px 6px;
	}
	.slip-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.slip p {
		margin: 8px 0 0;
		user-select: text;
	}
	.copy {
		min-height: 40px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1.5px solid var(--carbon);
		background: var(--card);
		color: var(--carbon);
		font-weight: 600;
		cursor: pointer;
	}
	.hint {
		font-size: 14px;
		color: var(--stamp);
	}

	/* Rubber stamp that lands when a reply is copied. */
	.stamp {
		position: absolute;
		right: 18px;
		bottom: 12px;
		padding: 2px 10px;
		border: 2.5px solid var(--carbon);
		border-radius: 6px;
		color: var(--carbon);
		font: 600 18px/1.3 var(--mono);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.85;
		transform: rotate(-11deg);
		pointer-events: none;
		animation: stamp 260ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
	}
	@keyframes stamp {
		from {
			opacity: 0;
			transform: rotate(-11deg) scale(1.8);
		}
		to {
			opacity: 0.85;
			transform: rotate(-11deg) scale(1);
		}
	}

	.note {
		margin-top: 14px;
		padding: 12px 14px;
		border: 1.5px dashed var(--line);
		border-radius: 10px;
	}
	.note p {
		margin: 4px 0 0;
	}
</style>
