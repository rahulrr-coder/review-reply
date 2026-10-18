import { json } from '@sveltejs/kit';
import { llmEnv } from '#lib/server/llm-env.js';
import { importListing } from '#lib/server/replies.js';
import type { RequestHandler } from './$types';

// A full Google Maps page is long; the business header and the newest reviews sit at the top.
const MAX_PASTE = 15000;
const FAILED = "Couldn't read that page, try again.";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const text = typeof body?.text === 'string' ? body.text.trim() : '';
	if (text.length < 40) {
		return json({ status: 'error', message: 'Paste the text from your Google Maps page first.' }, { status: 400 });
	}

	try {
		const result = await importListing(text.slice(0, MAX_PASTE), llmEnv);
		if (!result) {
			console.error('❌ Import output was not valid JSON after one retry');
			return json({ status: 'error', message: FAILED }, { status: 502 });
		}
		if (!result.business.name && result.reviews.length === 0 && result.repliedCount === 0) {
			return json(
				{ status: 'error', message: "No business details or reviews found. Copy the whole page from Google Maps and paste it again." },
				{ status: 422 }
			);
		}
		return json(result);
	} catch (e) {
		// Log the error only: never the pasted text or the key.
		console.error('❌ Import failed:', e instanceof Error ? e.message : 'unknown error');
		return json({ status: 'error', message: FAILED }, { status: 502 });
	}
};
