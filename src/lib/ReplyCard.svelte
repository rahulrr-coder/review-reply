<script lang="ts">
	import type { ReplyResult } from './types.js';

	let { result }: { result: ReplyResult } = $props();

	const STYLE_LABEL = { short: 'Short', standard: 'Standard', warm: 'Warm' } as const;
	const SENTIMENT = {
		positive: { cls: 'pos', label: 'Happy customer' },
		mixed: { cls: 'mid', label: 'Mixed review' },
		negative: { cls: 'neg', label: 'Unhappy customer' }
	} as const;

	let active = $state(1); // start on "standard"
	let copied = $state(false);
	let blocked = $state(false);

	const reply = $derived(result.replies[active]);
	const words = $derived(reply.text.trim().split(/\s+/).length);

	function pick(i: number) {
		active = i;
		copied = false;
		blocked = false;
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(reply.text);
			blocked = false;
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			blocked = true;
		}
	}
</script>

<div class="reply-card">
	<div class="head">
		<span class="sentiment {SENTIMENT[result.sentiment].cls}">{SENTIMENT[result.sentiment].label}</span>
		<span class="muted lang">{result.language}</span>
	</div>

	<div class="styles" role="tablist" aria-label="Reply length">
		{#each result.replies as r, i (r.style)}
			<button type="button" role="tab" aria-selected={active === i} onclick={() => pick(i)}>{STYLE_LABEL[r.style]}</button>
		{/each}
	</div>

	<p class="text" aria-live="polite">{reply.text}</p>

	<div class="foot">
		<span class="muted count">{words} words</span>
		<button type="button" class="btn copy" class:done={copied} onclick={copy}>
			{copied ? 'Copied ✓ Paste it on Google' : 'Copy reply'}
		</button>
	</div>
	{#if blocked}<p class="hint">Your browser blocked copying. Press and hold the reply to copy it.</p>{/if}

	{#if result.ownerNote}
		<aside class="note">
			<span class="eyebrow">Just for you, not for posting</span>
			<p>{result.ownerNote}</p>
		</aside>
	{/if}
</div>

<style>
	.reply-card {
		display: grid;
		gap: 14px;
		padding: 16px;
		border: 2px solid var(--ink);
		border-radius: 18px;
		background: var(--card);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.sentiment {
		font-size: 13px;
		font-weight: 700;
		padding: 5px 12px;
		border-radius: 999px;
	}
	.pos {
		color: var(--leaf);
		background: var(--leaf-wash);
	}
	.mid {
		color: var(--sign-ink);
		background: var(--marigold);
	}
	.neg {
		color: var(--chilli);
		background: var(--chilli-wash);
	}
	.lang {
		font-size: 14px;
	}

	.styles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		padding: 4px;
		border-radius: 12px;
		background: var(--surface);
	}
	.styles button {
		min-height: 40px;
		border: 0;
		border-radius: 9px;
		background: transparent;
		font-weight: 600;
		font-size: 15px;
		color: var(--muted);
		cursor: pointer;
	}
	.styles button[aria-selected='true'] {
		background: var(--card);
		color: var(--ink);
		box-shadow: 0 1px 3px rgb(30 26 60 / 0.15);
	}

	.text {
		margin: 0;
		font-size: 19px;
		line-height: 1.6;
		user-select: text;
		min-height: 4.8em;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.count {
		font-size: 14px;
		white-space: nowrap;
	}
	.copy {
		flex: 1;
		max-width: 320px;
	}
	.copy.done {
		background: var(--leaf);
		border-color: var(--leaf);
		color: #fff;
	}
	.hint {
		margin: 0;
		font-size: 14px;
		color: var(--chilli);
	}

	.note {
		padding: 12px 14px;
		border-radius: 12px;
		background: var(--marigold-wash);
	}
	.note p {
		margin: 4px 0 0;
	}
</style>
