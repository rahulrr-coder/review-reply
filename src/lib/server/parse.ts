import type { ReplyResult } from '#lib/types.js';

const STYLES = ['short', 'standard', 'warm'] as const;
const SENTIMENTS = ['positive', 'mixed', 'negative'] as const;

// Returns null when the model output isn't a usable reply set, so the route can retry once.
export function parseReply(raw: string): ReplyResult | null {
	const text = raw.replace(/```(?:json)?/gi, '');
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;

	let data: Record<string, unknown>;
	try {
		data = JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}

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
