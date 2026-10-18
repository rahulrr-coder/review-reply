// Runs every sample through the real model and prints the parsed replies.
// Usage: npm run smoke   (reads .env)
import { readFileSync } from 'node:fs';
import { samples } from '../src/lib/samples.ts';
import { generateReplies, importListing } from '../src/lib/server/replies.ts';
import type { BusinessProfile } from '../src/lib/types.ts';

// 1. Import: an invented Google Maps page in the real copied-text format.
{
	const t0 = Date.now();
	const page = readFileSync(new URL('./fixtures/maps-paste.txt', import.meta.url), 'utf8');
	const r = await importListing(page, process.env);
	const secs = ((Date.now() - t0) / 1000).toFixed(1);
	const checks: [string, boolean][] = r
		? [
				['name', r.business.name === 'Annapoorna Mess'],
				['type', /south indian restaurant/i.test(r.business.type)],
				['phone', r.business.phone.replace(/\D/g, '').endsWith('9840012345')],
				['address', /Bazullah/i.test(r.business.address)],
				['2 replied', r.repliedCount === 2],
				['3 unreplied', r.reviews.length === 3],
				['no replied review leaked', !r.reviews.some((x) => /Priya|Lakshmi/.test(x.author))],
				['no summary snippet', !r.reviews.some((x) => /best in the area|slow on a Sunday/i.test(x.text))],
				['truncated flagged', r.reviews.some((x) => x.author.startsWith('Arjun') && x.truncated)],
				['negative scored low', (r.reviews.find((x) => x.author.startsWith('Karthik'))?.stars ?? 5) <= 2]
			]
		: [['valid JSON', false]];
	console.log(`\nImport (${secs}s): ${checks.every(([, ok]) => ok) ? '✓' : '✗'}`);
	for (const [name, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
	if (r) for (const x of r.reviews) console.log(`  · ${x.author} · ${x.stars}★${x.truncated ? ' · truncated' : ''} · ${x.text.slice(0, 60)}`);
	if (!checks.every(([, ok]) => ok)) process.exitCode = 1;
}

const profile: BusinessProfile = {
	name: 'Annapoorna Mess',
	type: 'South Indian restaurant',
	tone: 'warm',
	signOff: '— Ravi, Owner',
	contact: '98400 12345',
	canOffer: ''
};

let failed = 0;
for (const s of samples) {
	const t0 = Date.now();
	try {
		const r = await generateReplies({ profile, review: s.text, stars: s.stars, lang: 'auto' }, process.env);
		const secs = ((Date.now() - t0) / 1000).toFixed(1);
		if (!r) {
			failed++;
			console.log(`\n✗ ${s.id} (${secs}s): invalid JSON after retry`);
			continue;
		}
		console.log(`\n✓ ${s.id} (${secs}s) · ${s.stars}★ · ${r.sentiment} · ${r.language}`);
		for (const reply of r.replies) console.log(`  [${reply.style}] ${reply.text}`);
		if (r.ownerNote) console.log(`  [owner note] ${r.ownerNote}`);
	} catch (e) {
		failed++;
		console.log(`\n✗ ${s.id}: ${e instanceof Error ? e.message : e}`);
	}
}
console.log(`\n${samples.length - failed}/${samples.length} parsed`);
process.exit(failed || process.exitCode ? 1 : 0);
