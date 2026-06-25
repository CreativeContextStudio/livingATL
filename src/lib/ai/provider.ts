import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type LlmProvider = "openai" | "anthropic";

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-6",
};

function resolveProvider(): LlmProvider {
  const raw = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (raw === "openai" || raw === "anthropic") return raw;
  throw new Error(
    `Invalid LLM_PROVIDER="${raw}". Expected "openai" or "anthropic". See CLAUDE.md "LLM provider".`,
  );
}

function resolveModelId(provider: LlmProvider): string {
  return process.env.LLM_MODEL_SYNTHESIS?.trim() || DEFAULT_MODELS[provider];
}

export function getSynthesisModel(): LanguageModel {
  const provider = resolveProvider();
  const modelId = resolveModelId(provider);

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY is required when LLM_PROVIDER="openai". Set it in livingatl/.env.local.',
      );
    }
    return openai(modelId);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER="anthropic". Set it in livingatl/.env.local.',
    );
  }
  return anthropic(modelId);
}

export function getSynthesisProviderInfo(): { provider: LlmProvider; model: string } {
  const provider = resolveProvider();
  return { provider, model: resolveModelId(provider) };
}
