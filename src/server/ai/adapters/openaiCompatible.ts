import {
  AIAdapterRequest,
  AIAdapterResponse,
  ProviderAdapter,
  ProviderHttpClient,
  ProviderType,
  TokenUsageMetrics,
  classifyHttpError,
  redactSecrets,
} from '../types.ts';
import {
  normalizeGroqModelId,
  validateAndNormalizeEndpointForProvider,
} from '../credentialResolver.ts';

export class OpenAICompatibleAdapter implements ProviderAdapter {
  public readonly providerType: ProviderType;

  constructor(providerType: ProviderType = 'custom') {
    this.providerType = providerType;
  }

  public async execute(
    request: AIAdapterRequest,
    options: { fetchImpl?: ProviderHttpClient } = {}
  ): Promise<AIAdapterResponse> {
    const startTime = Date.now();
    const fetchFn = options.fetchImpl || globalThis.fetch;
    const providerLabel = request.providerType || this.providerType;
    const rawModel = (request.configuredModel || '').trim();
    const model = providerLabel === 'groq' ? normalizeGroqModelId(rawModel) : rawModel;
    const apiKey = (request.apiKey || '').trim();

    if (!model) {
      return {
        ok: false,
        provider: providerLabel,
        providerType: providerLabel,
        providerName: request.providerName || providerLabel,
        configuredModel: '',
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'invalid_model',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: `لم يتم تحديد النموذج للمزود (${providerLabel}).`,
        statusCode: 400,
      };
    }

    const endpointCheck = validateAndNormalizeEndpointForProvider(providerLabel, request.endpoint);
    if (!endpointCheck.valid || !endpointCheck.endpoint) {
      return {
        ok: false,
        provider: providerLabel,
        providerType: providerLabel,
        providerName: request.providerName || providerLabel,
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'endpoint_unavailable',
        response: '',
        usage: null,
        keySource: request.keySource,
        error:
          endpointCheck.error ||
          `عنوان الاتصال (Endpoint) غير صالح أو غير محدد للمزود (${providerLabel}).`,
        statusCode: 400,
      };
    }
    const endpoint = endpointCheck.endpoint;

    if (!apiKey) {
      return {
        ok: false,
        provider: providerLabel,
        providerType: providerLabel,
        providerName: request.providerName || providerLabel,
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'auth_error',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: `مفتاح API غير متوفر للمزود (${providerLabel}).`,
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
          Authorization: `Bearer ${apiKey}`,
        },
        signal: request.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: typeof request.temperature === 'number' ? request.temperature : 0.4,
          ...(typeof request.maxTokens === 'number' ? { max_tokens: request.maxTokens } : {}),
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
          provider: providerLabel,
          providerType: providerLabel,
          providerName: request.providerName || providerLabel,
          configuredModel: model,
          executedModel: null,
          agentGate: request.agentGate,
          latencyMs,
          verified: false,
          status: classified.status,
          response: '',
          usage: null,
          keySource: request.keySource,
          error: redactSecrets(`فشل طلب المزود (${providerLabel} / ${model}): ${errDetail}`, apiKey),
          statusCode: classified.statusCode,
        };
      }

      const data: any = await resp.json();
      const text =
        data?.choices?.[0]?.message?.content ||
        data?.message?.content?.[0]?.text ||
        data?.text ||
        '';
      const executedModel = data?.model || model;
      let usage: TokenUsageMetrics | null = null;
      if (data?.usage) {
        usage = {
          promptTokens: data.usage.prompt_tokens ?? data.usage.tokens?.input_tokens,
          completionTokens: data.usage.completion_tokens ?? data.usage.tokens?.output_tokens,
          totalTokens: data.usage.total_tokens,
        };
      }

      return {
        ok: true,
        provider: providerLabel,
        providerType: providerLabel,
        providerName: request.providerName || providerLabel,
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
      const msg = err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Compatible provider network error';
      const classified = classifyHttpError(err?.name === 'AbortError' ? 504 : 502, msg);
      return {
        ok: false,
        provider: providerLabel,
        providerType: providerLabel,
        providerName: request.providerName || providerLabel,
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs,
        verified: false,
        status: classified.status,
        response: '',
        usage: null,
        keySource: request.keySource,
        error: redactSecrets(`فشل طلب المزود (${providerLabel} / ${model}): ${msg}`, apiKey),
        statusCode: classified.statusCode,
      };
    }
  }
}
