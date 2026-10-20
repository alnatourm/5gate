import {
  AIAdapterRequest,
  AIAdapterResponse,
  ProviderHttpClient,
  redactSecrets,
} from './types.ts';
import { getProviderAdapter } from './registry.ts';
import { ResolvedExecutionTarget } from './credentialResolver.ts';

export async function executeProviderRequest(
  request: AIAdapterRequest,
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<AIAdapterResponse> {
  const adapter = getProviderAdapter(request.providerType);
  const timeoutMs = typeof request.timeoutMs === 'number' && request.timeoutMs > 0 ? request.timeoutMs : 45000;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  if (request.signal) {
    request.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const result = await adapter.execute(
      {
        ...request,
        signal: controller.signal,
      },
      options
    );
    // Ensure no API key ever leaks into response or error
    return {
      ...result,
      response: redactSecrets(result.response, request.apiKey),
      error: result.error ? redactSecrets(result.error, request.apiKey) : undefined,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function executeResolvedTarget(
  target: ResolvedExecutionTarget,
  promptParams: {
    systemPrompt?: string;
    userPrompt: string;
    responseFormat?: 'json' | 'text';
    jsonSchema?: Record<string, unknown>;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  },
  options: { fetchImpl?: ProviderHttpClient } = {}
): Promise<AIAdapterResponse> {
  return executeProviderRequest(
    {
      providerId: target.providerId,
      providerType: target.providerType,
      providerName: target.providerName,
      configuredModel: target.configuredModel,
      apiKey: target.apiKey,
      keySource: target.keySource,
      endpoint: target.endpoint,
      systemPrompt: promptParams.systemPrompt ?? target.systemPrompt,
      userPrompt: promptParams.userPrompt,
      responseFormat: promptParams.responseFormat,
      jsonSchema: promptParams.jsonSchema,
      temperature: promptParams.temperature ?? target.temperature,
      maxTokens: promptParams.maxTokens ?? target.maxTokens,
      timeoutMs: promptParams.timeoutMs,
      agentGate: target.agentGate,
    },
    options
  );
}
