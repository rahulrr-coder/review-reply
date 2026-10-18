// Runs every sample through the real model and prints the parsed replies.
// Usage: npm run smoke   (reads .env)
import { samples } from '../src/lib/samples.ts';
import { generateReplies } from '../src/lib/server/replies.ts';
import type { BusinessProfile } from '../src/lib/types.ts';

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
process.exit(failed ? 1 : 0);
