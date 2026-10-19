<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import ReplyCard from '#lib/ReplyCard.svelte';
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
		{ value: 'auto', label: 'Detect automatically' },
		...Object.entries(LANG_NAMES).map(([value, name]) => ({ value: value as Lang, label: MIXED[value as Lang] ?? name }))
	];
	// The headline's last word, cycling through every language we reply in, each in its own script.
	const ROTOR = ['தமிழ்', 'हिन्दी', 'English', 'తెలుగు', 'ಕನ್ನಡ', 'മലയാളം', 'Tanglish', 'मराठी', 'বাংলা', 'ગુજરાતી', 'Hinglish'];

	const emptyProfile: BusinessProfile = { name: '', type: '', tone: 'friendly', signOff: '', contact: '', canOffer: '' };

	type InboxItem = {
		review: ImportedReview;
		stars: Stars;
		status: 'idle' | 'loading' | 'done' | 'error';
		result?: ReplyResult;
		error?: string;
	};

	let rotor = $state(0);

	let profile = $state<BusinessProfile>({ ...emptyProfile });
	let saved = $state(false);
	let editing = $state(false);
	let profileMsg = $state('');
	let profileEl = $state<HTMLElement>();

	let tab = $state<'paste' | 'import'>('paste');

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
	const waiting = $derived(inbox.filter((i) => i.status !== 'done').length);
	const initial = $derived(profile.name.trim().charAt(0).toUpperCase() || '?');

	onMount(() => {
		try {
			const raw = localStorage.getItem(PROFILE_KEY);
			if (raw) {
				profile = { ...emptyProfile, ...JSON.parse(raw) };
				saved = true;
			}
		} catch {
			// Storage blocked (private window): everything still works, it just won't be remembered.
		}
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = setInterval(() => (rotor = (rotor + 1) % ROTOR.length), 1700);
		return () => clearInterval(t);
	});

	async function openProfile(msg = '') {
		editing = true;
		profileMsg = msg;
		await tick();
		profileEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

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
			profile = { ...profile, name: b.name || profile.name, type: b.type || profile.type, contact: profile.contact || b.phone };
			inbox = r.reviews.map((rv) => ({ review: rv, stars: rv.stars, status: 'idle' }));
			imported = { repliedCount: r.repliedCount };
			pasteText = '';
			if (b.name && !saved) await openProfile('Filled in from your Google Maps page. Check it, add a sign-off, then save.');
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
		if (!hasName) return openProfile('Add your business name so replies are signed correctly.');
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
		if (!hasName) return openProfile('Add your business name so replies are signed correctly.');
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
		if (!hasName) return openProfile('Add your business name so replies are signed correctly.');
		if (!stars || !review.trim()) return;
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
	<meta name="description" content="Reply to every Google review in 10 seconds, in English and 8 Indian languages. Open source, runs on an open-weight model." />
</svelte:head>

<header class="hero">
	<div class="hero-inner">
		<div class="pitch">
			<p class="brand"><span class="mark" aria-hidden="true">★</span> Review Reply</p>
			<h1 aria-label="Reply to every Google review in your customer's language">
				<span aria-hidden="true">Reply to every Google review in</span>
				<span class="rotor" aria-hidden="true">
					{#key rotor}<span class="word" in:fly={{ y: 18, duration: 260 }}>{ROTOR[rotor]}</span>{/key}
				</span>
			</h1>
			<p class="sub">Paste a review, get 3 replies you can post in 10 seconds. Built for restaurants, salons, clinics and shops.</p>
			<p class="tags"><span>Open source</span><span>Open-weight AI</span><span>9 languages</span></p>
			<a class="cta" href="#app">Start replying ↓</a>
		</div>

		<div class="demo" aria-label="Example">
			<div class="demo-card review-card">
				<p class="demo-stars" aria-label="1 star">★<span>★★★★</span></p>
				<p class="demo-text">"Waited 35 minutes for a table and the idli came cold. Not coming back on a weekend."</p>
				<p class="demo-who">Karthik · 3 weeks ago</p>
			</div>
			<div class="demo-arrow" aria-hidden="true">↓ 10 seconds later</div>
			<div class="demo-card answer-card">
				<p class="demo-label">Your reply</p>
				<p class="demo-text">Karthik, sorry about the 35-minute wait and the cold idli. That's not the Sunday we want for you. Please call us on 098400 12345 so we can make it right. — Ravi, Owner</p>
			</div>
		</div>
	</div>
</header>

<main class="app" id="app">
	<!-- Who the replies are signed as -->
	<section class="panel" bind:this={profileEl}>
		{#if !editing}
			<div class="shop">
				<span class="avatar" aria-hidden="true">{initial}</span>
				<div class="shop-text">
					{#if saved || hasName}
						<span class="eyebrow">Replying as</span>
						<strong>{profile.name}</strong>
						<span class="muted small">{[profile.type, profile.tone].filter(Boolean).join(' · ')}</span>
					{:else}
						<span class="eyebrow">Step 1</span>
						<strong>Add your business</strong>
						<span class="muted small">So replies sound like you and carry your sign-off.</span>
					{/if}
				</div>
				<button class="btn ghost" type="button" onclick={() => openProfile()}>{saved || hasName ? 'Edit' : 'Add'}</button>
			</div>
		{:else}
			<form class="fields" onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
				<h2>Your business</h2>
				{#if profileMsg}<p class="notice">{profileMsg}</p>{/if}
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
					Something you're happy to offer <span class="muted optional">optional</span>
					<input bind:value={profile.canOffer} placeholder="A free dessert on the next visit" />
					<span class="muted small">Leave empty and replies won't offer anything.</span>
				</label>
				<div class="row">
					<button class="btn" type="submit">Save business</button>
					{#if saved}<button class="btn ghost" type="button" onclick={() => (editing = false)}>Cancel</button>{/if}
				</div>
				<p class="muted small">Tip: use “From Google Maps” below and this fills itself in.</p>
			</form>
		{/if}
	</section>

	<!-- The workspace -->
	<section class="panel">
		<div class="tabs" role="tablist" aria-label="How to add reviews">
			<button role="tab" type="button" aria-selected={tab === 'paste'} onclick={() => (tab = 'paste')}>Paste a review</button>
			<button role="tab" type="button" aria-selected={tab === 'import'} onclick={() => (tab = 'import')}>From Google Maps</button>
		</div>

		{#if tab === 'paste'}
			<div class="stack">
				<div>
					<span class="eyebrow">How many stars?</span>
					<StarPicker bind:value={stars} />
				</div>

				<label>
					Customer's review
					<textarea bind:value={review} rows="5" maxlength="2000" placeholder="Paste the review from Google, WhatsApp or anywhere"></textarea>
				</label>

				<div class="lang-row">
					<label class="grow">
						Language
						<select bind:value={lang}>
							{#each LANGS as l (l.value)}<option value={l.value}>{l.label}</option>{/each}
						</select>
					</label>
					<span class="muted small count">{review.length}/2000</span>
				</div>

				<div>
					<span class="eyebrow">Or try an example</span>
					<div class="chips">
						{#each suggestions as s (s.id)}
							<button type="button" class="chip" onclick={() => useSample(s)}><b>{s.stars}★</b> {s.label}</button>
						{/each}
					</div>
				</div>

				<button class="btn wide" type="button" disabled={loading || !review.trim() || !stars} onclick={generate}>
					{loading ? 'Writing your replies…' : 'Write my replies'}
				</button>
				{#if error}<p class="error" role="alert">{error}</p>{/if}

				{#if result}
					<ReplyCard {result} />
					<button class="btn ghost wide" type="button" disabled={loading} onclick={generate}>Write new ones</button>
				{/if}
			</div>
		{:else}
			<div class="stack">
				<ol class="steps">
					<li><span>1</span>On a computer, open your business on Google Maps.</li>
					<li><span>2</span>Select everything on the page (Ctrl+A or ⌘A) and copy it.</li>
					<li><span>3</span>Paste it below. We find your details and every review without a reply.</li>
				</ol>
				<textarea bind:value={pasteText} rows="6" placeholder="Paste your Google Maps page here" aria-label="Text copied from your Google Maps page"></textarea>
				<button class="btn wide" type="button" disabled={importing || pasteText.trim().length < 40} onclick={importPage}>
					{importing ? 'Reading your page…' : 'Find reviews to reply to'}
				</button>
				{#if importError}<p class="error" role="alert">{importError}</p>{/if}
				<p class="muted small">Want more reviews? Do the same on the Reviews tab sorted by Newest and paste it underneath. Nothing you paste is stored.</p>

				{#if imported}
					<div class="inbox-head">
						{#if inbox.length === 0}
							<h2>Nothing waiting</h2>
							<p class="muted">
								{imported.repliedCount ? `All ${imported.repliedCount} reviews you pasted already have a reply.` : 'No reviews found in what you pasted.'}
							</p>
						{:else}
							<h2>{inbox.length} {inbox.length === 1 ? 'review is' : 'reviews are'} waiting for a reply</h2>
							{#if imported.repliedCount}<p class="muted small">{imported.repliedCount} already replied, skipped.</p>{/if}
						{/if}
					</div>

					{#if waiting > 0}
						<button class="btn wide" type="button" disabled={writingAll} onclick={writeAll}>
							{writingAll ? `Writing… ${inbox.length - waiting} of ${inbox.length} done` : `Write replies for ${waiting === inbox.length ? 'all' : 'the other'} ${waiting}`}
						</button>
					{/if}

					<div class="inbox">
						{#each inbox as item, i (i)}
							<article class="review">
								<div class="review-head">
									<span class="avatar small-avatar" aria-hidden="true">{(item.review.author || 'C').charAt(0).toUpperCase()}</span>
									<div>
										<strong>{item.review.author || 'Customer'}</strong>
										<span class="muted small">{item.review.when}</span>
									</div>
								</div>
								<div class="estimate">
									<StarPicker bind:value={item.stars} size="sm" label="Star rating for {item.review.author || 'this review'}" />
									<span class="muted small">estimated, tap to fix</span>
								</div>
								<p class="quote">{item.review.text}</p>
								{#if item.review.truncated}
									<p class="muted small">Google cut this review short. Tap “More” on Google Maps and paste the full text under “Paste a review” to answer every detail.</p>
								{/if}

								{#if item.status === 'done' && item.result}
									<ReplyCard result={item.result} />
								{:else}
									<button class="btn ghost wide" type="button" disabled={item.status === 'loading' || writingAll} onclick={() => writeFor(item)}>
										{item.status === 'loading' ? 'Writing replies…' : 'Write replies'}
									</button>
									{#if item.error}<p class="error" role="alert">{item.error}</p>{/if}
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<footer>
		<p><strong>Open source</strong> and powered by an open-weight AI model. Your reviews aren't stored.</p>
		<a href={REPO_URL} target="_blank" rel="noopener">View the code on GitHub ↗</a>
	</footer>
</main>

<style>
	/* ---------- Hero: the marigold sign ---------- */
	.hero {
		background: var(--marigold);
		color: var(--sign-ink);
		padding: 22px 16px 96px;
		overflow: hidden;
	}
	.hero-inner {
		max-width: 1080px;
		margin: 0 auto;
		display: grid;
		gap: 30px;
	}
	.brand {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 800;
		font-size: 18px;
	}
	.mark {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: var(--sign-ink);
		color: var(--marigold);
		font-size: 17px;
	}
	h1 {
		margin: 22px 0 0;
		font-size: clamp(46px, 13vw, 92px);
		line-height: 0.92;
		font-weight: 800;
		font-stretch: 75%;
		letter-spacing: -0.005em;
		text-transform: uppercase;
	}
	.rotor {
		display: inline-block;
		margin-top: 0.08em;
		padding: 0.04em 0.22em 0.1em;
		border-radius: 0.14em;
		background: var(--sign-ink);
		color: var(--marigold);
		line-height: 1.12;
		text-transform: none;
		min-width: 2.2em;
	}
	.word {
		display: inline-block;
	}
	.sub {
		margin: 18px 0 0;
		font-size: 19px;
		font-weight: 500;
		max-width: 30em;
	}
	.tags {
		margin: 16px 0 0;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.tags span {
		font-size: 13px;
		font-weight: 700;
		padding: 5px 12px;
		border-radius: 999px;
		border: 2px solid var(--sign-ink);
	}

	.cta {
		display: inline-flex;
		align-items: center;
		min-height: 52px;
		margin-top: 22px;
		padding: 0 24px;
		border-radius: 14px;
		background: var(--sign-ink);
		color: var(--marigold);
		font-weight: 800;
		font-size: 17px;
		text-decoration: none;
	}
	.cta:hover {
		color: #fff;
	}

	.demo {
		display: grid;
		gap: 10px;
		max-width: 420px;
	}
	.demo-card {
		background: #fff;
		color: #1e1a3c;
		border-radius: 18px;
		padding: 16px 18px;
		box-shadow: 0 16px 40px rgb(30 26 60 / 0.22);
	}
	.review-card {
		transform: rotate(-1.6deg);
	}
	.answer-card {
		transform: rotate(1.2deg);
		margin-left: 22px;
		border: 2.5px solid #1e1a3c;
	}
	.demo-stars {
		margin: 0;
		color: #ffb400;
		font-size: 20px;
		letter-spacing: 2px;
	}
	.demo-stars span {
		color: #e4e1f0;
	}
	.demo-text {
		margin: 6px 0 0;
		font-size: 16px;
		line-height: 1.5;
	}
	.demo-who {
		margin: 8px 0 0;
		font-size: 13px;
		color: #66628a;
	}
	.demo-label {
		margin: 0;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #0f7b4b;
	}
	.demo-arrow {
		font-weight: 700;
		font-size: 14px;
		padding-left: 30px;
	}

	@media (min-width: 900px) {
		.hero {
			padding: 36px 24px 140px;
		}
		.hero-inner {
			grid-template-columns: 1.2fr 1fr;
			align-items: center;
			gap: 48px;
		}
		.demo {
			justify-self: end;
			width: 100%;
		}
	}

	/* ---------- The app ---------- */
	.app {
		scroll-margin-top: 80px;
		position: relative;
		max-width: 680px;
		margin: -64px auto 0;
		padding: 0 16px 48px;
		display: grid;
		gap: 16px;
	}
	@media (min-width: 900px) {
		.app {
			margin-top: -100px;
		}
	}
	.panel {
		background: var(--card);
		border-radius: 22px;
		box-shadow: var(--shadow);
		padding: 18px;
	}
	h2 {
		margin: 0;
		font-size: 22px;
		line-height: 1.2;
		font-weight: 800;
		font-stretch: 90%;
	}
	.small {
		font-size: 14px;
	}

	.shop {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.avatar {
		flex: none;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 14px;
		background: var(--marigold);
		color: var(--sign-ink);
		font-weight: 800;
		font-size: 22px;
	}
	.small-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		font-size: 16px;
		background: var(--surface);
		color: var(--ink);
	}
	.shop-text {
		flex: 1;
		display: grid;
		min-width: 0;
	}
	.shop-text strong {
		font-size: 19px;
		line-height: 1.25;
	}

	.tabs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		padding: 5px;
		border-radius: 16px;
		background: var(--surface);
		margin-bottom: 18px;
	}
	.tabs button {
		min-height: 46px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		font-weight: 700;
		font-size: 16px;
		color: var(--muted);
		cursor: pointer;
	}
	.tabs button[aria-selected='true'] {
		background: var(--btn-bg);
		color: var(--btn-ink);
	}

	.stack,
	.fields {
		display: grid;
		gap: 16px;
	}
	label,
	fieldset {
		display: grid;
		gap: 6px;
		font-weight: 700;
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 700;
		margin-bottom: 6px;
	}
	.optional {
		font-weight: 400;
		font-size: 14px;
	}
	input,
	select,
	textarea {
		font-weight: 400;
		background: var(--bg);
		border: 2px solid var(--line);
		border-radius: 14px;
		padding: 12px 14px;
		min-height: 52px;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 140ms;
	}
	input:focus,
	select:focus,
	textarea:focus {
		border-color: var(--ink);
		outline: none;
	}
	textarea {
		resize: vertical;
		min-height: 132px;
		line-height: 1.5;
	}

	.lang-row {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}
	.grow {
		flex: 1;
	}
	.count {
		padding-bottom: 14px;
	}

	.pills,
	.chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.chips {
		margin-top: 8px;
	}
	.pill,
	.chip {
		min-height: 44px;
		padding: 0 16px;
		border-radius: 999px;
		border: 2px solid var(--line);
		background: var(--card);
		cursor: pointer;
		transition: border-color 140ms;
	}
	.pill {
		text-transform: capitalize;
		font-weight: 600;
	}
	.pill[aria-pressed='true'] {
		background: var(--btn-bg);
		border-color: var(--btn-bg);
		color: var(--btn-ink);
	}
	.chip {
		font-size: 15px;
	}
	.chip b {
		color: var(--marigold);
		-webkit-text-stroke: 0.3px var(--sign-ink);
	}
	.chip:hover,
	.pill:hover {
		border-color: var(--ink);
	}

	.row {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.notice {
		margin: 0;
		padding: 12px 14px;
		border-radius: 12px;
		background: var(--marigold-wash);
		font-weight: 600;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.steps li {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.steps li span {
		flex: none;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--marigold);
		color: var(--sign-ink);
		font-weight: 800;
		font-size: 15px;
	}

	.inbox-head {
		display: grid;
		gap: 4px;
		padding-top: 6px;
		border-top: 2px solid var(--line);
	}
	.inbox-head p {
		margin: 0;
	}
	.inbox {
		display: grid;
		gap: 14px;
	}
	.review {
		display: grid;
		gap: 10px;
		padding: 16px;
		border-radius: 18px;
		background: var(--bg);
	}
	.review-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.review-head div {
		display: grid;
	}
	.estimate {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.quote {
		margin: 0;
	}

	.error {
		margin: 0;
		padding: 12px 14px;
		border-radius: 12px;
		color: var(--chilli);
		background: var(--chilli-wash);
	}

	footer {
		display: grid;
		gap: 6px;
		padding: 8px 4px 0;
		font-size: 15px;
		color: var(--muted);
	}
	footer p {
		margin: 0;
	}
	footer a {
		color: var(--ink);
		font-weight: 700;
	}
</style>
