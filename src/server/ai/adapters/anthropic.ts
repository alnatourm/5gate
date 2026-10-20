import {
  AIAdapterRequest,
  AIAdapterResponse,
  ProviderAdapter,
  ProviderHttpClient,
  TokenUsageMetrics,
  classifyHttpError,
  redactSecrets,
} from '../types.ts';
import { validateAndNormalizeEndpointForProvider } from '../credentialResolver.ts';

export class AnthropicAdapter implements ProviderAdapter {
  public readonly providerType = 'anthropic' as const;

  public async execute(
    request: AIAdapterRequest,
    options: { fetchImpl?: ProviderHttpClient } = {}
  ): Promise<AIAdapterResponse> {
    const startTime = Date.now();
    const fetchFn = options.fetchImpl || globalThis.fetch;
    const model = (request.configuredModel || '').trim();
    const apiKey = (request.apiKey || '').trim();

    if (!model) {
      return {
        ok: false,
        provider: 'anthropic',
        providerType: 'anthropic',
        providerName: request.providerName || 'Anthropic Claude',
        configuredModel: '',
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'invalid_model',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'لم يتم تحديد نموذج Anthropic (Model ID is empty).',
        statusCode: 400,
      };
    }

    const endpointCheck = validateAndNormalizeEndpointForProvider('anthropic', request.endpoint);
    if (!endpointCheck.valid) {
      return {
        ok: false,
        provider: 'anthropic',
        providerType: 'anthropic',
        providerName: request.providerName || 'Anthropic Claude',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'endpoint_unavailable',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: endpointCheck.error || 'عنوان الاتصال غير متوافق مع مزود Anthropic.',
        statusCode: 400,
      };
    }
    const endpoint = endpointCheck.endpoint;

    if (!apiKey) {
      return {
        ok: false,
        provider: 'anthropic',
        providerType: 'anthropic',
        providerName: request.providerName || 'Anthropic Claude',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'auth_error',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'مفتاح API غير متوفر لمزود Anthropic.',
        statusCode: 401,
      };
    }

    try {
      const resp = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: request.signal,
        body: JSON.stringify({
          model,
          max_tokens: typeof request.maxTokens === 'number' ? request.maxTokens : 4096,
          ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
          messages: [{ role: 'user', content: request.userPrompt }],
          ...(typeof request.temperature === 'number' ? { temperature: request.temperature } : {}),
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!resp.ok) {
        let errDetail = `HTTP ${resp.status}`;
        try {
          const errJson: any = await resp.json();
          errDetail = errJson?.error?.message || errJson?.error || errDetail;
        } catch {}
        const classified = classifyHttpError(resp.status, String(errDetail));
        return {
          ok: false,
          provider: 'anthropic',
          providerType: 'anthropic',
          providerName: request.providerName || 'Anthropic Claude',
          configuredModel: model,
          executedModel: null,
          agentGate: request.agentGate,
          latencyMs,
          verified: false,
          status: classified.status,
          response: '',
          usage: null,
          keySource: request.keySource,
          error: redactSecrets(`فشل طلب المزود (anthropic / ${model}): ${errDetail}`, apiKey),
          statusCode: classified.statusCode,
        };
      }

      const data: any = await resp.json();
      const text = data?.content?.[0]?.text || '';
      const executedModel = data?.model || model;
      let usage: TokenUsageMetrics | null = null;
      if (data?.usage) {
        const p = typeof data.usage.input_tokens === 'number' ? data.usage.input_tokens : undefined;
        const c = typeof data.usage.output_tokens === 'number' ? data.usage.output_tokens : undefined;
        usage = {
          promptTokens: p,
          completionTokens: c,
          totalTokens: typeof p === 'number' && typeof c === 'number' ? p + c : undefined,
        };
      }

      return {
        ok: true,
        provider: 'anthropic',
        providerType: 'anthropic',
        providerName: request.providerName || 'Anthropic Claude',
        configuredModel: model,
        executedModel: String(executedModel),
        agentGate: request.agentGate,
        latencyMs,
        verified: true,
        status: 'succeeded',
        response: text,
        usage,
        keySource: request.keySource,
        statusCode: 200,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const msg = err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Anthropic network error';
      const classified = classifyHttpError(err?.name === 'AbortError' ? 504 : 502, msg);
      return {
        ok: false,
        provider: 'anthropic',
        providerType: 'anthropic',
        providerName: request.providerName || 'Anthropic Claude',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs,
        verified: false,
        status: classified.status,
        response: '',
        usage: null,
        keySource: request.keySource,
        error: redactSecrets(`فشل طلب المزود (anthropic / ${model}): ${msg}`, apiKey),
        statusCode: classified.statusCode,
      };
    }
  }
}
