import type { ReplyRequest, ReplyResult } from '../types.js';
import { generate, type LlmEnv } from './llm.js';
import { parseReply } from './parse.js';
import { buildPrompt } from './prompt.js';

// One model call, one retry if the output isn't valid. Shared by the API route and scripts/smoke.ts.
export async function generateReplies(req: ReplyRequest, env: LlmEnv): Promise<ReplyResult | null> {
	const { system, user } = buildPrompt(req);
	const first = parseReply(await generate(system, user, env));
	if (first) return first;
	const retryUser = `${user}\n\nYour last output was not valid JSON. Return only the JSON object.`;
	return parseReply(await generate(system, retryUser, env));
}
