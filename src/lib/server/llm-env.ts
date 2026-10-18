import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER } from '$app/env/private';

// Kept apart from llm.ts so scripts/smoke.ts can import llm.ts outside SvelteKit.
export const llmEnv = { LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, LLM_BASE_URL };
