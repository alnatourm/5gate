import { GoogleGenAI } from '@google/genai';
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

export class GeminiAdapter implements ProviderAdapter {
  public readonly providerType = 'gemini' as const;

  public async execute(
    request: AIAdapterRequest,
    options: { fetchImpl?: ProviderHttpClient } = {}
  ): Promise<AIAdapterResponse> {
    const startTime = Date.now();
    const model = (request.configuredModel || '').trim();
    const apiKey = (request.apiKey || '').trim();

    if (!model) {
      return {
        ok: false,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
        configuredModel: '',
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'invalid_model',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'لم يتم تحديد نموذج Gemini (Model ID is empty).',
        statusCode: 400,
      };
    }

    if (!model.toLowerCase().startsWith('gemini-')) {
      return {
        ok: false,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'invalid_model',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: `النموذج "${model}" غير متوافق مع مزود Google Gemini.`,
        statusCode: 400,
      };
    }

    const endpointCheck = validateAndNormalizeEndpointForProvider('gemini', request.endpoint);
    if (!endpointCheck.valid) {
      return {
        ok: false,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'endpoint_unavailable',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: endpointCheck.error || 'عنوان الاتصال غير متوافق مع مزود Google Gemini.',
        statusCode: 400,
      };
    }

    if (!apiKey) {
      return {
        ok: false,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs: Date.now() - startTime,
        verified: false,
        status: 'auth_error',
        response: '',
        usage: null,
        keySource: request.keySource,
        error: 'مفتاح API غير متوفر لمزود Google Gemini.',
        statusCode: 401,
      };
    }

    // If custom fetchImpl is provided (for deterministic tests or custom REST endpoint), use Gemini REST format
    if (options.fetchImpl) {
      const fetchFn = options.fetchImpl;
      const baseEndpoint =
        request.endpoint && request.endpoint.includes(':generateContent')
          ? request.endpoint
          : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      try {
        const resp = await fetchFn(baseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          signal: request.signal,
          body: JSON.stringify({
            ...(request.systemPrompt
              ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } }
              : {}),
            contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
            generationConfig: {
              ...(request.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
              temperature: typeof request.temperature === 'number' ? request.temperature : 0.4,
              ...(typeof request.maxTokens === 'number' ? { maxOutputTokens: request.maxTokens } : {}),
            },
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
            provider: 'gemini',
            providerType: 'gemini',
            providerName: request.providerName || 'Google Gemini',
            configuredModel: model,
            executedModel: null,
            agentGate: request.agentGate,
            latencyMs,
            verified: false,
            status: classified.status,
            response: '',
            usage: null,
            keySource: request.keySource,
            error: redactSecrets(`فشل طلب المزود (gemini / ${model}): ${errDetail}`, apiKey),
            statusCode: classified.statusCode,
          };
        }

        const data: any = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const executedModel = data?.modelVersion || data?.model || model;
        let usage: TokenUsageMetrics | null = null;
        if (data?.usageMetadata) {
          usage = {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          };
        }

        return {
          ok: true,
          provider: 'gemini',
          providerType: 'gemini',
          providerName: request.providerName || 'Google Gemini',
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
        const msg = err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Gemini fetch error';
        const classified = classifyHttpError(err?.name === 'AbortError' ? 504 : 502, msg);
        return {
          ok: false,
          provider: 'gemini',
          providerType: 'gemini',
          providerName: request.providerName || 'Google Gemini',
          configuredModel: model,
          executedModel: null,
          agentGate: request.agentGate,
          latencyMs,
          verified: false,
          status: classified.status,
          response: '',
          usage: null,
          keySource: request.keySource,
          error: redactSecrets(`فشل طلب المزود (gemini / ${model}): ${msg}`, apiKey),
          statusCode: classified.statusCode,
        };
      }
    }

    // Live GoogleGenAI SDK call
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const config: Record<string, any> = {
        temperature: typeof request.temperature === 'number' ? request.temperature : 0.4,
      };
      if (request.systemPrompt) {
        config.systemInstruction = request.systemPrompt;
      }
      if (request.responseFormat === 'json') {
        config.responseMimeType = 'application/json';
        if (request.jsonSchema) {
          config.responseSchema = request.jsonSchema;
        }
      }
      if (typeof request.maxTokens === 'number') {
        config.maxOutputTokens = request.maxTokens;
      }
      if (request.signal) {
        config.abortSignal = request.signal;
      }

      const response = await ai.models.generateContent({
        model,
        contents: request.userPrompt,
        config,
      });

      const latencyMs = Date.now() - startTime;
      const text = response.text || '';
      const executedModel = (response as any).modelVersion || model;
      let usage: TokenUsageMetrics | null = null;
      if (response.usageMetadata) {
        usage = {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        };
      }

      return {
        ok: true,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
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
    } catch (sdkErr: any) {
      const latencyMs = Date.now() - startTime;
      const msg = sdkErr?.name === 'AbortError' ? 'Request timed out' : sdkErr?.message || 'Gemini SDK error';
      const statusHint =
        msg.toLowerCase().includes('api key') || msg.includes('401') || msg.includes('403')
          ? 401
          : msg.includes('404') || msg.toLowerCase().includes('not found')
          ? 404
          : msg.includes('429')
          ? 429
          : sdkErr?.name === 'AbortError'
          ? 504
          : 502;
      const classified = classifyHttpError(statusHint, msg);
      return {
        ok: false,
        provider: 'gemini',
        providerType: 'gemini',
        providerName: request.providerName || 'Google Gemini',
        configuredModel: model,
        executedModel: null,
        agentGate: request.agentGate,
        latencyMs,
        verified: false,
        status: classified.status,
        response: '',
        usage: null,
        keySource: request.keySource,
        error: redactSecrets(`فشل طلب المزود (gemini / ${model}): ${msg}`, apiKey),
        statusCode: classified.statusCode,
      };
    }
  }
}
