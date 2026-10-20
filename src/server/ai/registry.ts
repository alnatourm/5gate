import { ProviderAdapter, ProviderType } from './types.ts';
import { GeminiAdapter } from './adapters/gemini.ts';
import { OpenAIAdapter } from './adapters/openai.ts';
import { AnthropicAdapter } from './adapters/anthropic.ts';
import { GroqAdapter } from './adapters/groq.ts';
import { OpenRouterAdapter } from './adapters/openrouter.ts';
import { CohereAdapter } from './adapters/cohere.ts';
import { OpenAICompatibleAdapter } from './adapters/openaiCompatible.ts';
import { StitchAdapter, CloudUnsupportedAdapter } from './adapters/stitch.ts';
import {
  PROVIDER_ENDPOINT_REGISTRY,
  getDefaultEndpointForProviderType,
  validateAndNormalizeEndpointForProvider,
} from './credentialResolver.ts';

export {
  PROVIDER_ENDPOINT_REGISTRY,
  getDefaultEndpointForProviderType,
  validateAndNormalizeEndpointForProvider,
};

const adapters = new Map<ProviderType, ProviderAdapter>([
  ['gemini', new GeminiAdapter()],
  ['openai', new OpenAIAdapter()],
  ['anthropic', new AnthropicAdapter()],
  ['groq', new GroqAdapter()],
  ['openrouter', new OpenRouterAdapter()],
  ['cohere', new CohereAdapter()],
  ['stitch', new StitchAdapter()],
  ['cloud', new CloudUnsupportedAdapter()],
  ['deepseek', new OpenAICompatibleAdapter('deepseek')],
  ['mistral', new OpenAICompatibleAdapter('mistral')],
  ['xai', new OpenAICompatibleAdapter('xai')],
  ['v0', new OpenAICompatibleAdapter('v0')],
  ['perplexity', new OpenAICompatibleAdapter('perplexity')],
  ['together', new OpenAICompatibleAdapter('together')],
  ['custom', new OpenAICompatibleAdapter('custom')],
]);

export function getProviderAdapter(providerType: ProviderType): ProviderAdapter {
  const adapter = adapters.get(providerType);
  if (adapter) {
    return adapter;
  }
  return new OpenAICompatibleAdapter(providerType);
}

