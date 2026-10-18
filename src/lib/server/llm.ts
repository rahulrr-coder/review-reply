// All model calls go through here. Nothing else knows which provider is used.

export interface LlmEnv {
	LLM_PROVIDER?: string;
	LLM_API_KEY?: string;
	LLM_MODEL?: string;
	LLM_BASE_URL?: string;
}

export class LlmError extends Error {}

const TIMEOUT_MS = 20_000;
const TEMPERATURE = 0.7;
const MAX_TOKENS = 600;

export async function generate(system: string, user: string, env: LlmEnv, maxTokens = MAX_TOKENS): Promise<string> {
	// Default to openai-compatible when a base URL is set, so an existing OpenAI-style .env works unchanged.
	const provider = env.LLM_PROVIDER || (env.LLM_BASE_URL ? 'openai-compatible' : 'google');
	if (!env.LLM_API_KEY || !env.LLM_MODEL) throw new LlmError('Server is not configured: set LLM_API_KEY and LLM_MODEL.');

	const signal = AbortSignal.timeout(TIMEOUT_MS);
	try {
		if (provider === 'google') return await google(system, user, env, signal, maxTokens);
		if (provider === 'openai-compatible') return await openaiCompatible(system, user, env, signal, maxTokens);
		throw new LlmError(`Unknown LLM_PROVIDER "${provider}".`);
	} catch (e) {
		if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
			throw new LlmError(`The model took longer than ${TIMEOUT_MS / 1000}s.`);
		}
		throw e;
	}
}

async function openaiCompatible(system: string, user: string, env: LlmEnv, signal: AbortSignal, maxTokens: number) {
	if (!env.LLM_BASE_URL) throw new LlmError('LLM_BASE_URL is required for openai-compatible.');
	const base = {
		model: env.LLM_MODEL,
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user }
		]
	};
	const call = (body: object) =>
		fetch(`${env.LLM_BASE_URL!.replace(/\/+$/, '')}/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LLM_API_KEY}` },
			body: JSON.stringify(body),
			signal
		}).then(readJson);

	try {
		const data = await call({ ...base, temperature: TEMPERATURE, max_tokens: maxTokens });
		return String(data?.choices?.[0]?.message?.content ?? '');
	} catch (e) {
		// Some hosted reasoning models reject temperature/max_tokens. Retry once with defaults.
		if (!(e instanceof LlmError && /400: .*unsupported/i.test(e.message))) throw e;
		const data = await call(base);
		return String(data?.choices?.[0]?.message?.content ?? '');
	}
}

async function google(system: string, user: string, env: LlmEnv, signal: AbortSignal, maxTokens: number) {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.LLM_MODEL!)}:generateContent`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-goog-api-key': env.LLM_API_KEY! },
		body: JSON.stringify({
			// Gemma models on the Gemini API reject systemInstruction, so the system prompt goes first in the user turn.
			contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
			generationConfig: { temperature: TEMPERATURE, maxOutputTokens: maxTokens }
		}),
		signal
	});
	const data = await readJson(res);
	const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
	return parts.map((p) => p.text ?? '').join('');
}

// Provider responses are untyped JSON; callers read them defensively with optional chaining.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJson(res: Response): Promise<any> {
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		// Provider error messages only, never the request body (it contains the review).
		const detail = String(data?.error?.message ?? '').slice(0, 200);
		throw new LlmError(`Model provider returned ${res.status}${detail ? `: ${detail}` : ''}`);
	}
	return data;
}
