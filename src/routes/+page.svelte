<script lang="ts">
	import { onMount } from 'svelte';
	import { samplesFor } from '#lib/samples.js';
	import { LANG_NAMES, type BusinessProfile, type Lang, type ReplyResult, type SampleReview, type Stars, type Tone } from '#lib/types.js';

	const PROFILE_KEY = 'review-reply:profile';
	const REPO_URL = 'https://github.com/rahulrr-coder/review-reply';
	const TONES: Tone[] = ['warm', 'professional', 'friendly'];
	const MIXED: Partial<Record<Lang, string>> = { ta: 'Tamil / Tanglish', hi: 'Hindi / Hinglish' };
	const LANGS: { value: Lang; label: string }[] = [
		{ value: 'auto', label: 'Auto-detect' },
		...Object.entries(LANG_NAMES).map(([value, name]) => ({ value: value as Lang, label: MIXED[value as Lang] ?? name }))
	];
	const STYLE_LABEL = { short: 'Short', standard: 'Standard', warm: 'Warm' } as const;
	const SENTIMENT_CLASS = { positive: 'good', mixed: 'mid', negative: 'bad' } as const;

	const emptyProfile: BusinessProfile = { name: '', type: '', tone: 'friendly', signOff: '', contact: '', canOffer: '' };

	let profile = $state<BusinessProfile>({ ...emptyProfile });
	let profileOpen = $state(true);
	let profileMsg = $state('');

	let review = $state('');
	let stars = $state<Stars | 0>(0);
	let lang = $state<Lang>('en');
	let loading = $state(false);
	let error = $state('');
	let result = $state<ReplyResult | null>(null);
	let copiedIndex = $state<number | null>(null);

	const suggestions = $derived(samplesFor(lang));
	const canGenerate = $derived(!loading && review.trim().length > 0 && stars > 0 && profile.name.trim().length > 0);
	const profileSummary = $derived(profile.name ? `${profile.name} · ${profile.tone}` : 'Not set up yet');

	onMount(() => {
		try {
			const saved = localStorage.getItem(PROFILE_KEY);
			if (saved) {
				profile = { ...emptyProfile, ...JSON.parse(saved) };
				profileOpen = false;
			}
		} catch {
			// Storage blocked (private window): the form still works, it just won't persist.
		}
	});

	function saveProfile() {
		if (!profile.name.trim()) {
			profileMsg = 'Add your business name first.';
			return;
		}
		try {
			localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
			profileMsg = 'Saved.';
			profileOpen = false;
		} catch {
			profileMsg = "Couldn't save on this device. It will work for this visit only.";
		}
	}

	function useSample(s: SampleReview) {
		review = s.text;
		stars = s.stars;
		error = '';
		result = null;
	}

	async function generate() {
		if (!canGenerate) return;
		loading = true;
		error = '';
		result = null;
		try {
			const res = await fetch('/api/reply', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ profile, review, stars, lang })
			});
			const data: { message?: string } & Partial<ReplyResult> = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.message ?? "Couldn't generate replies, try again.");
			result = data as ReplyResult;
		} catch (e) {
			error = e instanceof Error ? e.message : "Couldn't generate replies, try again.";
		} finally {
			loading = false;
		}
	}

	async function copy(i: number, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedIndex = i;
			setTimeout(() => (copiedIndex = null), 1500);
		} catch {
			error = "Couldn't copy. Select the text and copy it by hand.";
		}
	}
</script>

<svelte:head>
	<title>Review Reply</title>
	<meta name="description" content="Reply to every Google review in 10 seconds." />
</svelte:head>

<main>
	<header>
		<h1>Review Reply</h1>
		<p class="tagline">Reply to every Google review in 10 seconds.</p>
	</header>

	<section class="card">
		<button class="card-head" aria-expanded={profileOpen} onclick={() => (profileOpen = !profileOpen)}>
			<span>
				<strong>Your business</strong>
				<small>{profileSummary}</small>
			</span>
			<span class="chev" aria-hidden="true">{profileOpen ? '−' : '+'}</span>
		</button>

		{#if profileOpen}
			<form class="fields" onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
				<label>
					Business name
					<input bind:value={profile.name} placeholder="Annapoorna Mess" autocomplete="organization" />
				</label>
				<label>
					Type
					<input bind:value={profile.type} placeholder="South Indian restaurant" />
				</label>
				<fieldset>
					<legend>Tone</legend>
					<div class="pills">
						{#each TONES as t (t)}
							<button type="button" class="pill" aria-pressed={profile.tone === t} onclick={() => (profile.tone = t)}>
								{t}
							</button>
						{/each}
					</div>
				</fieldset>
				<label>
					Sign-off
					<input bind:value={profile.signOff} placeholder="— Ravi, Owner" />
				</label>
				<label>
					Contact for unhappy customers
					<input bind:value={profile.contact} placeholder="Phone or email" />
				</label>
				<label>
					OK to offer
					<input bind:value={profile.canOffer} placeholder="e.g. a free dessert on next visit (empty = offer nothing)" />
				</label>
				<div class="row">
					<button class="primary" type="submit">Save</button>
					{#if profileMsg}<span class="muted">{profileMsg}</span>{/if}
				</div>
			</form>
		{/if}
	</section>

	<section class="card">
		<h2>Review</h2>

		<div class="stars" role="radiogroup" aria-label="Star rating">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<button
					type="button"
					class="star"
					class:on={stars >= n}
					role="radio"
					aria-checked={stars === n}
					aria-label="{n} star{n > 1 ? 's' : ''}"
					onclick={() => (stars = n as Stars)}
				>★</button>
			{/each}
		</div>

		<label>
			Review language
			<select bind:value={lang}>
				{#each LANGS as l (l.value)}
					<option value={l.value}>{l.label}</option>
				{/each}
			</select>
		</label>

		<label>
			Customer's review
			<textarea bind:value={review} rows="6" maxlength="2000" placeholder="Paste the review here"></textarea>
		</label>
		<p class="muted small">{review.length}/2000</p>

		<p class="label">Suggestions to paste</p>
		<div class="chips">
			{#each suggestions as s (s.id)}
				<button type="button" class="chip" onclick={() => useSample(s)}>{s.stars}★ · {s.label}</button>
			{/each}
		</div>

		<button class="primary wide" disabled={!canGenerate} onclick={generate}>
			{loading ? 'Writing replies…' : 'Generate replies'}
		</button>
		{#if !profile.name.trim()}
			<p class="muted small">Save your business name above to start.</p>
		{/if}
	</section>

	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}

	{#if result}
		<section class="results">
			<div class="meta">
				<span class="sentiment {SENTIMENT_CLASS[result.sentiment]}">{result.sentiment}</span>
				<span class="muted">Language: {result.language}</span>
			</div>

			{#each result.replies as r, i (r.style)}
				<article class="reply">
					<div class="row between">
						<span class="style">{STYLE_LABEL[r.style]}</span>
						<button class="copy" onclick={() => copy(i, r.text)}>
							{copiedIndex === i ? 'Copied ✓' : 'Copy'}
						</button>
					</div>
					<p>{r.text}</p>
				</article>
			{/each}

			{#if result.ownerNote}
				<aside class="note">
					<strong>Private note for you (not posted)</strong>
					<p>{result.ownerNote}</p>
				</aside>
			{/if}

			<button class="ghost wide" disabled={loading} onclick={generate}>Regenerate</button>
		</section>
	{/if}

	<footer>
		<p>Runs on an open-weight model. Your reviews aren't stored.</p>
		<a href={REPO_URL} target="_blank" rel="noopener">GitHub</a>
	</footer>
</main>

<style>
	:global(:root) {
		--bg: #fafaf7;
		--card: #ffffff;
		--text: #1d1f1c;
		--muted: #6b6f68;
		--line: #e2e2da;
		--accent: #1f6f5c;
		--accent-ink: #ffffff;
		--good: #1f7a3f;
		--good-bg: #e6f4ea;
		--mid: #8a5a00;
		--mid-bg: #fdf3dc;
		--bad: #b42318;
		--bad-bg: #fde8e6;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #141513;
			--card: #1e201d;
			--text: #ecede8;
			--muted: #a3a79e;
			--line: #33362f;
			--accent: #5cc3a6;
			--accent-ink: #0f1411;
			--good: #7fd69a;
			--good-bg: #1d3325;
			--mid: #f2c46d;
			--mid-bg: #3a2f17;
			--bad: #ff9b92;
			--bad-bg: #3d1f1c;
		}
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 24px 16px 40px;
		display: grid;
		gap: 16px;
	}
	h1 { margin: 0; font-size: 28px; }
	h2 { margin: 0 0 8px; font-size: 18px; }
	.tagline { margin: 4px 0 0; color: var(--muted); }

	.card, .reply, .note {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 16px;
	}
	.card { display: grid; gap: 12px; }

	.card-head {
		all: unset;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		min-height: 44px;
		cursor: pointer;
	}
	.card-head span:first-child { display: grid; }
	.card-head small { color: var(--muted); }
	.chev { font-size: 22px; color: var(--muted); }

	label, fieldset { display: grid; gap: 6px; font-weight: 600; border: 0; margin: 0; padding: 0; }
	fieldset legend { font-weight: 600; margin-bottom: 6px; }
	input, select, textarea {
		font: inherit;
		font-weight: 400;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 10px 12px;
		min-height: 44px;
		box-sizing: border-box;
		width: 100%;
	}
	textarea { resize: vertical; min-height: 140px; }

	.fields { display: grid; gap: 12px; }
	.pills { display: flex; gap: 8px; flex-wrap: wrap; }
	.pill, .chip, .copy, .ghost {
		font: inherit;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--card);
		color: var(--text);
		cursor: pointer;
	}
	.pill[aria-pressed='true'] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }

	.stars { display: flex; gap: 4px; }
	.star {
		font-size: 32px;
		line-height: 1;
		min-width: 44px;
		min-height: 44px;
		border: 0;
		background: none;
		color: var(--line);
		cursor: pointer;
	}
	.star.on { color: var(--accent); }

	.chips { display: flex; gap: 8px; flex-wrap: wrap; }
	.chip { font-size: 15px; }
	.chip:hover, .copy:hover, .pill:hover { border-color: var(--accent); }

	.primary, .ghost { cursor: pointer; }
	.primary {
		font: inherit;
		font-weight: 600;
		min-height: 48px;
		padding: 0 20px;
		border: 0;
		border-radius: 12px;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.primary:disabled { opacity: 0.5; cursor: not-allowed; }
	.ghost { background: transparent; }
	.wide { width: 100%; }

	.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
	.between { justify-content: space-between; }
	.label { margin: 0; font-weight: 600; }
	.muted { color: var(--muted); margin: 0; }
	.small { font-size: 14px; }

	.results { display: grid; gap: 12px; }
	.meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
	.sentiment { font-weight: 700; text-transform: capitalize; padding: 4px 12px; border-radius: 999px; }
	.sentiment.good { color: var(--good); background: var(--good-bg); }
	.sentiment.mid { color: var(--mid); background: var(--mid-bg); }
	.sentiment.bad { color: var(--bad); background: var(--bad-bg); }

	.reply p { margin: 8px 0 0; }
	.style { font-size: 14px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
	.note { border-style: dashed; background: var(--bg); }
	.note p { margin: 6px 0 0; }

	.error { color: var(--bad); background: var(--bad-bg); padding: 12px; border-radius: 10px; margin: 0; }

	footer { color: var(--muted); font-size: 14px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
	footer p { margin: 0; }
	footer a { color: var(--accent); }
</style>
