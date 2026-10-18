import { defineEnvVars } from '@sveltejs/kit/env';

// Server-only, read at startup. All optional here; llm.ts reports what's missing.
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	LLM_PROVIDER: { schema: optional, description: '"google" or "openai-compatible" (inferred from LLM_BASE_URL if unset)' },
	LLM_API_KEY: { schema: optional, description: 'API key for the model provider' },
	LLM_MODEL: { schema: optional, description: 'Open-weight model ID' },
	LLM_BASE_URL: { schema: optional, description: 'Base URL, only for openai-compatible' }
});
