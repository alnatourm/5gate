import { ProviderAdapter, ProviderType } from './types.ts';
import { GeminiAdapter } from './adapters/gemini.ts';
import { OpenAIAdapter } from './adapters/openai.ts';
import { AnthropicAdapter } from './adapters/anthropic.ts';
import { GroqAdapter } from './adapters/groq.ts';
import { OpenRouterAdapter } from './adapters/openrouter.ts';
import { OpenAICompatibleAdapter } from './adapters/openaiCompatible.ts';
import { StitchAdapter } from './adapters/stitch.ts';

const adapters = new Map<ProviderType, ProviderAdapter>([
  ['gemini', new GeminiAdapter()],
  ['openai', new OpenAIAdapter()],
  ['anthropic', new AnthropicAdapter()],
  ['groq', new GroqAdapter()],
  ['openrouter', new OpenRouterAdapter()],
  ['stitch', new StitchAdapter()],
  ['deepseek', new OpenAICompatibleAdapter('deepseek')],
  ['mistral', new OpenAICompatibleAdapter('mistral')],
  ['xai', new OpenAICompatibleAdapter('xai')],
  ['v0', new OpenAICompatibleAdapter('v0')],
  ['perplexity', new OpenAICompatibleAdapter('perplexity')],
  ['together', new OpenAICompatibleAdapter('together')],
  ['cohere', new OpenAICompatibleAdapter('cohere')],
  ['cloud', new OpenAICompatibleAdapter('cloud')],
  ['custom', new OpenAICompatibleAdapter('custom')],
]);

export function getProviderAdapter(providerType: ProviderType): ProviderAdapter {
  const adapter = adapters.get(providerType);
  if (adapter) {
    return adapter;
  }
  return new OpenAICompatibleAdapter(providerType);
}
