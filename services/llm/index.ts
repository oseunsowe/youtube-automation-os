import type { LLMProvider } from "./provider.js";
import { MockLLMProvider } from "./mock.js";
import { GeminiLLMProvider } from "./gemini.js";
import { env } from "../common/env.js";

export type { LLMProvider, ScriptRequest } from "./provider.js";

export function getLLMProvider(providerName: string = env.llm.provider): LLMProvider {
  switch (providerName) {
    case "mock":
      return new MockLLMProvider();
    case "gemini":
      return new GeminiLLMProvider(env.llm.geminiApiKey);
    case "openai":
    case "anthropic":
    case "ollama":
      throw new Error(
        `LLM provider "${providerName}" is not implemented in Phase 1 yet. Use "gemini" or "mock".`,
      );
    default:
      throw new Error(`Unknown LLM provider "${providerName}"`);
  }
}
