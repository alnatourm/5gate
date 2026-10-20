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

export class CohereAdapter implements ProviderAdapter {
  public readonly providerType = 'cohere' as const;

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
        provider: 'cohere',
        providerType: 'cohere',
        providerName: request.providerName || 'Cohere',
        configuredModel: '',
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'invalid_model',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'لم يتم تحديد نموذج Cohere (Model ID is empty).',
        statusCode: 400,
      };
    }

    const endpointValidation = validateAndNormalizeEndpointForProvider('cohere', request.endpoint);
    if (!endpointValidation.valid) {
      return {
        ok: false,
        provider: 'cohere',
        providerType: 'cohere',
        providerName: request.providerName || 'Cohere',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'endpoint_unavailable',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: endpointValidation.error || 'عنوان الاتصال غير متوافق مع مزود Cohere.',
        statusCode: 400,
      };
    }
    const endpoint = endpointValidation.endpoint;

    if (!apiKey) {
      return {
        ok: false,
        provider: 'cohere',
        providerType: 'cohere',
        providerName: request.providerName || 'Cohere',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'auth_error',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'مفتاح API غير متوفر لمزود Cohere.',
        statusCode: 401,
      };
    }

    try {
      const messages: { role: string; content: string }[] = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.userPrompt });

      const resp = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: request.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: typeof request.temperature === 'number' ? request.temperature : 0.3,
          ...(typeof request.maxTokens === 'number' ? { max_tokens: request.maxTokens } : {}),
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!resp.ok) {
        let errDetail = `HTTP ${resp.status}`;
        try {
          const errJson: any = await resp.json();
          errDetail = errJson?.message || errJson?.error?.message || errJson?.error || errDetail;
        } catch {}
        const classified = classifyHttpError(resp.status, String(errDetail));
        return {
          ok: false,
          provider: 'cohere',
          providerType: 'cohere',
          providerName: request.providerName || 'Cohere',
          configuredModel: model,
          executedModel: null,
          agentGate: request.agentGate,
          latencyMs,
          verified: false,
          status: classified.status,
          response: '',
          usage: null,
          keySource: request.keySource,
          error: redactSecrets(`فشل طلب المزود (cohere / ${model}): ${errDetail}`, apiKey),
          statusCode: classified.statusCode,
        };
      }

      const data: any = await resp.json();
      const text =
        data?.message?.content?.[0]?.text ||
        data?.text ||
        data?.choices?.[0]?.message?.content ||
        '';
      let usage: TokenUsageMetrics | null = null;
      if (data?.usage) {
        const p = data.usage.tokens?.input_tokens ?? data.usage.billed_units?.input_tokens;
        const c = data.usage.tokens?.output_tokens ?? data.usage.billed_units?.output_tokens;
        usage = {
          promptTokens: p,
          completionTokens: c,
          totalTokens: typeof p === 'number' && typeof c === 'number' ? p + c : undefined,
        };
      }

      return {
        ok: true,
        provider: 'cohere',
        providerType: 'cohere',
        providerName: request.providerName || 'Cohere',
        configuredModel: model,
        executedModel: model,
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
      const msg = err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Cohere network error';
      const classified = classifyHttpError(err?.name === 'AbortError' ? 504 : 502, msg);
      return {
        ok: false,
        provider: 'cohere',
        providerType: 'cohere',
        providerName: request.providerName || 'Cohere',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs,
        verified: false,
        status: classified.status,
        response: '',
        usage: null,
        keySource: request.keySource,
        error: redactSecrets(`فشل طلب المزود (cohere / ${model}): ${msg}`, apiKey),
        statusCode: classified.statusCode,
      };
    }
  }
}
