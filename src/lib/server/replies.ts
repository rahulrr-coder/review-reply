import type { ImportResult, ReplyRequest, ReplyResult } from '../types.js';
import { generate, type LlmEnv } from './llm.js';
import { parseImport, parseReply } from './parse.js';
import { buildImportPrompt, buildPrompt } from './prompt.js';

const IMPORT_MAX_TOKENS = 2000;

// One model call, one retry if the output isn't valid JSON. Shared by the API routes and scripts/smoke.ts.
async function withRetry<T>(
	{ system, user }: { system: string; user: string },
	parse: (raw: string) => T | null,
	env: LlmEnv,
	maxTokens?: number
): Promise<T | null> {
	const first = parse(await generate(system, user, env, maxTokens));
	if (first) return first;
	const retryUser = `${user}\n\nYour last output was not valid JSON. Return only the JSON object.`;
	return parse(await generate(system, retryUser, env, maxTokens));
}

export function generateReplies(req: ReplyRequest, env: LlmEnv): Promise<ReplyResult | null> {
	return withRetry(buildPrompt(req), parseReply, env);
}

export function importListing(pageText: string, env: LlmEnv): Promise<ImportResult | null> {
	return withRetry(buildImportPrompt(pageText), parseImport, env, IMPORT_MAX_TOKENS);
}
