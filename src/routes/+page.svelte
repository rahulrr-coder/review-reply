<script lang="ts">
	import { onMount } from 'svelte';
	import ReplySlips from '#lib/ReplySlips.svelte';
	import StarPicker from '#lib/StarPicker.svelte';
	import { samplesFor } from '#lib/samples.js';
	import {
		LANG_NAMES,
		type BusinessProfile,
		type ImportedReview,
		type ImportResult,
		type Lang,
		type ReplyResult,
		type SampleReview,
		type Stars,
		type Tone
	} from '#lib/types.js';

	const PROFILE_KEY = 'review-reply:profile';
	const REPO_URL = 'https://github.com/rahulrr-coder/review-reply';
	const TONES: Tone[] = ['warm', 'professional', 'friendly'];
	const MIXED: Partial<Record<Lang, string>> = { ta: 'Tamil / Tanglish', hi: 'Hindi / Hinglish' };
	const LANGS: { value: Lang; label: string }[] = [
		{ value: 'auto', label: 'Auto-detect' },
		...Object.entries(LANG_NAMES).map(([value, name]) => ({ value: value as Lang, label: MIXED[value as Lang] ?? name }))
	];
	// Each language written in its own script, set in Anek.
	const NATIVE = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'বাংলা', 'ગુજરાતી'];

	const emptyProfile: BusinessProfile = { name: '', type: '', tone: 'friendly', signOff: '', contact: '', canOffer: '' };

	type InboxItem = {
		review: ImportedReview;
		stars: Stars;
		status: 'idle' | 'loading' | 'done' | 'error';
		result?: ReplyResult;
		error?: string;
	};

	let profile = $state<BusinessProfile>({ ...emptyProfile });
	let saved = $state(false);
	let editing = $state(true);
	let setupMode = $state<'import' | 'manual'>('import');
	let profileMsg = $state('');

	let pasteText = $state('');
	let importing = $state(false);
	let importError = $state('');
	let imported = $state<{ repliedCount: number } | null>(null);
	let inbox = $state<InboxItem[]>([]);
	let writingAll = $state(false);

	let review = $state('');
	let stars = $state<Stars | 0>(0);
	let lang = $state<Lang>('en');
	let loading = $state(false);
	let error = $state('');
	let result = $state<ReplyResult | null>(null);

	const suggestions = $derived(samplesFor(lang));
	const hasName = $derived(profile.name.trim().length > 0);
	const canGenerate = $derived(!loading && review.trim().length > 0 && stars > 0 && hasName);
	const waiting = $derived(inbox.filter((i) => i.status !== 'done').length);

	onMount(() => {
		try {
			const raw = localStorage.getItem(PROFILE_KEY);
			if (raw) {
				profile = { ...emptyProfile, ...JSON.parse(raw) };
				saved = true;
				editing = false;
			}
		} catch {
			// Storage blocked (private window): everything still works, it just won't be remembered.
		}
	});

	function saveProfile() {
		if (!hasName) {
			profileMsg = 'Add your business name first.';
			return;
		}
		try {
			localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
			profileMsg = '';
		} catch {
			profileMsg = "This browser won't remember it, but it works for this visit.";
		}
		saved = true;
		editing = false;
	}

	async function post<T>(url: string, body: unknown, fallback: string): Promise<T> {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.message ?? fallback);
		return data as T;
	}

	async function importPage() {
		importing = true;
		importError = '';
		try {
			const r = await post<ImportResult>('/api/import', { text: pasteText }, "Couldn't read that page, try again.");
			const b = r.business;
			// Only fill what the page had; never wipe what the owner already typed.
			profile = {
				...profile,
				name: b.name || profile.name,
				type: b.type || profile.type,
				contact: profile.contact || b.phone
			};
			inbox = r.reviews.map((rv) => ({ review: rv, stars: rv.stars, status: 'idle' }));
			imported = { repliedCount: r.repliedCount };
			pasteText = '';
			setupMode = 'manual';
			editing = true;
		} catch (e) {
			importError = e instanceof Error ? e.message : "Couldn't read that page, try again.";
		} finally {
			importing = false;
		}
	}

	function replyRequest(text: string, s: Stars, l: Lang) {
		return post<ReplyResult>('/api/reply', { profile, review: text, stars: s, lang: l }, "Couldn't write replies, try again.");
	}

	async function writeFor(item: InboxItem) {
		item.status = 'loading';
		item.error = '';
		try {
			item.result = await replyRequest(item.review.text, item.stars, 'auto');
			item.status = 'done';
		} catch (e) {
			item.status = 'error';
			item.error = e instanceof Error ? e.message : "Couldn't write replies, try again.";
		}
	}

	async function writeAll() {
		writingAll = true;
		// One at a time: each reply is its own short request.
		for (const item of inbox) if (item.status !== 'done') await writeFor(item);
		writingAll = false;
	}

	function useSample(s: SampleReview) {
		review = s.text;
		stars = s.stars;
		error = '';
		result = null;
	}

	async function generate() {
		if (!canGenerate || !stars) return;
		loading = true;
		error = '';
		result = null;
		try {
			result = await replyRequest(review, stars, lang);
		} catch (e) {
			error = e instanceof Error ? e.message : "Couldn't write replies, try again.";
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Review Reply</title>
	<meta name="description" content="Reply to every Google review in 10 seconds, in English and 8 Indian languages." />
</svelte:head>

<main>
	<header class="masthead">
		<h1>Review Reply</h1>
		<p class="tagline">Reply to every Google review in 10 seconds.</p>
		<p class="scripts" aria-label="Works in English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali and Gujarati">
			{#each NATIVE as n, i (n)}<span>{n}</span>{#if i < NATIVE.length - 1}<span class="dot" aria-hidden="true">·</span>{/if}{/each}
		</p>
	</header>

	<!-- Business profile -->
	<section class="card">
		{#if !editing && saved}
			<div class="summary">
				<div>
					<span class="label">Replying as</span>
					<p class="biz">{profile.name}</p>
					<p class="muted small">{[profile.type, profile.tone, profile.signOff].filter(Boolean).join(' · ')}</p>
				</div>
				<button class="btn" type="button" onclick={() => (editing = true)}>Edit</button>
			</div>
		{:else}
			<h2>Your business</h2>
			<div class="segmented" role="tablist" aria-label="How to add your business">
				<button role="tab" type="button" aria-selected={setupMode === 'import'} onclick={() => (setupMode = 'import')}>
					From Google Maps
				</button>
				<button role="tab" type="button" aria-selected={setupMode === 'manual'} onclick={() => (setupMode = 'manual')}>
					Type it in
				</button>
			</div>

			{#if setupMode === 'import'}
				<ol class="steps">
					<li>On a computer, open your business on Google Maps.</li>
					<li>Select everything on the page (Ctrl+A or ⌘A) and copy it.</li>
					<li>Paste it here. For more reviews, do the same on the Reviews tab sorted by Newest and paste it underneath.</li>
				</ol>
				<textarea
					bind:value={pasteText}
					rows="6"
					placeholder="Paste your Google Maps page here"
					aria-label="Text copied from your Google Maps page"
				></textarea>
				<button class="btn primary wide" type="button" disabled={importing || pasteText.trim().length < 40} onclick={importPage}>
					{importing ? 'Reading your page…' : 'Read my page'}
				</button>
				{#if importError}<p class="error" role="alert">{importError}</p>{/if}
				<p class="muted small">We read your details and unreplied reviews from it. Nothing you paste is stored.</p>
			{:else}
				{#if imported}
					<p class="filled">Filled in from your Google Maps page. Check it, add a sign-off, then save.</p>
				{/if}
				<form class="fields" onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
					<label>
						Business name
						<input bind:value={profile.name} placeholder="Annapoorna Mess" autocomplete="organization" />
					</label>
					<label>
						Type of business
						<input bind:value={profile.type} placeholder="South Indian restaurant" />
					</label>
					<fieldset>
						<legend>Tone</legend>
						<div class="pills">
							{#each TONES as t (t)}
								<button type="button" class="pill" aria-pressed={profile.tone === t} onclick={() => (profile.tone = t)}>{t}</button>
							{/each}
						</div>
					</fieldset>
					<label>
						Sign-off
						<input bind:value={profile.signOff} placeholder="— Ravi, Owner" />
					</label>
					<label>
						Phone or email for unhappy customers
						<input bind:value={profile.contact} placeholder="098400 12345" />
					</label>
					<label>
						Something you're happy to offer <span class="muted">(optional)</span>
						<input bind:value={profile.canOffer} placeholder="A free dessert on the next visit" />
						<span class="muted small">Leave empty and replies won't offer anything.</span>
					</label>
					<button class="btn primary wide" type="submit">Save business</button>
					{#if profileMsg}<p class="muted small">{profileMsg}</p>{/if}
				</form>
			{/if}
		{/if}
	</section>

	<!-- Unreplied reviews from the import -->
	{#if imported}
		<section class="card">
			<span class="label">From your Google Maps page</span>
			{#if inbox.length === 0}
				<h2>No reviews waiting</h2>
				<p class="muted">
					{imported.repliedCount ? `All ${imported.repliedCount} reviews in what you pasted already have a reply.` : 'No reviews found in what you pasted.'}
					To check older ones, copy the Reviews tab sorted by Newest and import again.
				</p>
			{:else}
				<h2>{inbox.length} {inbox.length === 1 ? 'review needs' : 'reviews need'} a reply</h2>
				{#if imported.repliedCount}<p class="muted small">{imported.repliedCount} already replied, skipped.</p>{/if}
				{#if waiting > 0}
					<button class="btn primary wide" type="button" disabled={writingAll || !hasName} onclick={writeAll}>
						{writingAll ? `Writing replies… ${inbox.length - waiting} of ${inbox.length} done` : `Write replies for ${waiting === inbox.length ? 'all' : 'the other'} ${waiting}`}
					</button>
					{#if !hasName}<p class="muted small">Add your business name above first.</p>{/if}
				{/if}

				<div class="inbox">
					{#each inbox as item, i (i)}
						<article class="review">
							<div class="review-head">
								<p><strong>{item.review.author || 'Customer'}</strong> <span class="muted">{item.review.when}</span></p>
								<div class="estimate">
									<StarPicker bind:value={item.stars} size="sm" label="Star rating for {item.review.author || 'this review'}" />
									<span class="label">Estimated</span>
								</div>
							</div>
							<p class="quote">{item.review.text}</p>
							{#if item.review.truncated}
								<p class="muted small">Google cut this review short. Tap "More" on Google Maps and paste the full text below if you want every detail answered.</p>
							{/if}

							{#if item.status === 'done' && item.result}
								<ReplySlips result={item.result} />
								<button class="btn wide" type="button" onclick={() => writeFor(item)}>Write new replies</button>
							{:else}
								<button class="btn wide" type="button" disabled={item.status === 'loading' || writingAll || !hasName} onclick={() => writeFor(item)}>
									{item.status === 'loading' ? 'Writing replies…' : 'Write replies'}
								</button>
								{#if item.error}<p class="error" role="alert">{item.error}</p>{/if}
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- One review at a time -->
	<section class="card">
		<h2>Reply to one review</h2>
		<p class="muted small">Copied a review from Google Maps or WhatsApp? Paste it here.</p>

		<StarPicker bind:value={stars} />

		<div class="row">
			<label class="grow">
				Language
				<select bind:value={lang}>
					{#each LANGS as l (l.value)}<option value={l.value}>{l.label}</option>{/each}
				</select>
			</label>
		</div>

		<label>
			Customer's review
			<textarea bind:value={review} rows="5" maxlength="2000" placeholder="Paste the review here"></textarea>
		</label>
		<p class="muted small count">{review.length}/2000</p>

		<span class="label">Try an example</span>
		<div class="chips">
			{#each suggestions as s (s.id)}
				<button type="button" class="chip" onclick={() => useSample(s)}>{s.stars}★ {s.label}</button>
			{/each}
		</div>

		<button class="btn primary wide" type="button" disabled={!canGenerate} onclick={generate}>
			{loading ? 'Writing replies…' : 'Write replies'}
		</button>
		{#if !hasName}<p class="muted small">Add your business above first, so replies are signed correctly.</p>{/if}
		{#if error}<p class="error" role="alert">{error}</p>{/if}

		{#if result}
			<div class="result">
				<ReplySlips {result} />
				<button class="btn wide" type="button" disabled={loading} onclick={generate}>Write new replies</button>
			</div>
		{/if}
	</section>

	<footer>
		<p>Runs on an open-weight model. Your reviews aren't stored.</p>
		<a href={REPO_URL} target="_blank" rel="noopener">Source on GitHub</a>
	</footer>
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 28px 16px 48px;
		display: grid;
		gap: 18px;
	}

	.masthead h1 {
		margin: 0;
		font-size: clamp(36px, 10vw, 52px);
		line-height: 0.95;
		font-weight: 800;
		font-stretch: 125%;
		letter-spacing: -0.02em;
		color: var(--carbon);
	}
	.tagline {
		margin: 10px 0 0;
		font-size: 19px;
		font-weight: 500;
	}
	.scripts {
		margin: 10px 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 2px 8px;
		color: var(--muted);
		font-size: 15px;
	}
	.dot {
		color: var(--line);
	}

	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 18px 16px;
		display: grid;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: 21px;
		line-height: 1.2;
		font-weight: 700;
		font-stretch: 112%;
	}
	.small {
		font-size: 14px;
		margin: 0;
	}
	.muted {
		margin: 0;
	}

	.summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.biz {
		margin: 2px 0 0;
		font-size: 21px;
		font-weight: 700;
		font-stretch: 112%;
	}

	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 4px;
		gap: 4px;
		border-radius: 12px;
		background: var(--wash);
	}
	.segmented button {
		min-height: 44px;
		border: 0;
		border-radius: 9px;
		background: transparent;
		font-weight: 600;
		font-size: 15px;
		color: var(--muted);
		cursor: pointer;
	}
	.segmented button[aria-selected='true'] {
		background: var(--card);
		color: var(--carbon);
		box-shadow: 0 1px 2px rgb(27 35 64 / 0.12);
	}

	.steps {
		margin: 0;
		padding-left: 22px;
		display: grid;
		gap: 6px;
	}
	.steps li::marker {
		font: 600 14px var(--mono);
		color: var(--carbon);
	}

	.filled {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		background: var(--wash);
		color: var(--carbon);
		font-weight: 500;
	}

	.fields {
		display: grid;
		gap: 14px;
	}
	label,
	fieldset {
		display: grid;
		gap: 6px;
		font-weight: 600;
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 600;
		margin-bottom: 6px;
	}
	input,
	select,
	textarea {
		font-weight: 400;
		background: var(--paper);
		border: 1.5px solid var(--line);
		border-radius: 10px;
		padding: 10px 12px;
		min-height: 48px;
		width: 100%;
		box-sizing: border-box;
	}
	input:focus,
	select:focus,
	textarea:focus {
		border-color: var(--carbon);
		outline: none;
	}
	textarea {
		resize: vertical;
		min-height: 128px;
	}

	.pills,
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.pill,
	.chip {
		min-height: 44px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1.5px solid var(--line);
		background: var(--card);
		cursor: pointer;
	}
	.pill {
		text-transform: capitalize;
		font-weight: 500;
	}
	.pill[aria-pressed='true'] {
		border-color: var(--carbon);
		background: var(--carbon);
		color: var(--carbon-ink);
	}
	.chip {
		font-size: 15px;
	}
	.chip:hover,
	.pill:hover {
		border-color: var(--carbon);
	}

	.row {
		display: flex;
		gap: 12px;
	}
	.grow {
		flex: 1;
	}
	.count {
		text-align: right;
		margin-top: -6px;
	}

	.inbox {
		display: grid;
		gap: 14px;
		margin-top: 4px;
	}
	.review {
		display: grid;
		gap: 10px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
	.review-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 12px;
	}
	.review-head p {
		margin: 0;
	}
	.estimate {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.quote {
		margin: 0;
		padding-left: 12px;
		border-left: 3px solid var(--gold);
	}

	.result {
		display: grid;
		gap: 12px;
	}

	.error {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		color: var(--stamp);
		background: var(--stamp-wash);
	}

	footer {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 14px;
		color: var(--muted);
	}
	footer p {
		margin: 0;
	}
	footer a {
		color: var(--carbon);
	}
</style>
