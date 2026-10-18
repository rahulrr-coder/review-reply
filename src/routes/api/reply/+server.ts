import { json } from '@sveltejs/kit';
import { llmEnv } from '#lib/server/llm-env.js';
import { generateReplies } from '#lib/server/replies.js';
import { LANG_NAMES, type Lang, type ReplyRequest, type Stars, type Tone } from '#lib/types.js';
import type { RequestHandler } from './$types';

const TONES: Tone[] = ['warm', 'professional', 'friendly'];
const LANGS = ['auto', ...Object.keys(LANG_NAMES)] as Lang[];
const FAILED = "Couldn't generate replies, try again.";

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validate(body: unknown): ReplyRequest | string {
	if (!body || typeof body !== 'object') return 'Send a review to reply to.';
	const b = body as Record<string, unknown>;
	const p = (b.profile ?? {}) as Record<string, unknown>;

	const review = typeof b.review === 'string' ? b.review.trim() : '';
	if (!review) return 'Paste a review first.';
	if (review.length > 2000) return 'That review is too long. Keep it under 2000 characters.';

	const stars = Number(b.stars);
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) return 'Pick a star rating from 1 to 5.';

	const name = str(p.name);
	if (!name) return 'Add your business name in the profile first.';

	return {
		review,
		stars: stars as Stars,
		lang: LANGS.includes(b.lang as Lang) ? (b.lang as Lang) : 'auto',
		profile: {
			name,
			type: str(p.type) || 'local business',
			tone: TONES.includes(p.tone as Tone) ? (p.tone as Tone) : 'friendly',
			signOff: str(p.signOff),
			contact: str(p.contact),
			canOffer: str(p.canOffer)
		}
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const req = validate(body);
	if (typeof req === 'string') return json({ status: 'error', message: req }, { status: 400 });

	try {
		const result = await generateReplies(req, llmEnv);
		if (!result) {
			console.error('❌ Model output was not valid JSON after one retry');
			return json({ status: 'error', message: FAILED }, { status: 502 });
		}
		return json(result);
	} catch (e) {
		// Log the error only: never the review text or the key.
		console.error('❌ Reply generation failed:', e instanceof Error ? e.message : 'unknown error');
		return json({ status: 'error', message: FAILED }, { status: 502 });
	}
};
