import type { ImportedReview, ImportResult, ReplyResult, Stars } from '../types.js';
import { MAX_IMPORT_REVIEWS } from './prompt.js';

const STYLES = ['short', 'standard', 'warm'] as const;
const SENTIMENTS = ['positive', 'mixed', 'negative'] as const;

function extractJson(raw: string): Record<string, unknown> | null {
	const text = raw.replace(/```(?:json)?/gi, '');
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		const data = JSON.parse(text.slice(start, end + 1));
		return data && typeof data === 'object' ? data : null;
	} catch {
		return null;
	}
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Returns null when the model output isn't usable, so the caller can retry once.
export function parseImport(raw: string): ImportResult | null {
	const data = extractJson(raw);
	if (!data || !Array.isArray(data.reviews)) return null;
	const b = (data.business ?? {}) as Record<string, unknown>;

	const reviews: ImportedReview[] = data.reviews
		.map((r: Record<string, unknown>) => {
			const stars = Math.round(Number(r?.stars));
			return {
				author: str(r?.author, 80),
				when: str(r?.when, 40),
				stars: (stars >= 1 && stars <= 5 ? stars : 3) as Stars,
				truncated: r?.truncated === true,
				text: str(r?.text, 2000)
			};
		})
		.filter((r) => r.text)
		.slice(0, MAX_IMPORT_REVIEWS);

	return {
		business: { name: str(b.name, 200), type: str(b.type, 200), phone: str(b.phone, 60), address: str(b.address) },
		repliedCount: Math.max(0, Math.round(Number(data.repliedCount)) || 0),
		reviews
	};
}

// Returns null when the model output isn't a usable reply set, so the route can retry once.
export function parseReply(raw: string): ReplyResult | null {
	const data = extractJson(raw);
	if (!data) return null;

	const replies = Array.isArray(data.replies) ? data.replies : [];
	if (replies.length !== 3) return null;

	const cleaned = replies.map((r: { style?: unknown; text?: unknown }, i) => ({
		style: STYLES[i],
		text: typeof r?.text === 'string' ? r.text.trim() : ''
	}));
	if (cleaned.some((r) => !r.text)) return null;

	const sentiment = SENTIMENTS.find((s) => s === data.sentiment) ?? 'mixed';

	return {
		sentiment,
		language: typeof data.language === 'string' ? data.language : 'Unknown',
		replies: cleaned,
		ownerNote: typeof data.ownerNote === 'string' && data.ownerNote.trim() ? data.ownerNote.trim() : undefined
	};
}
