import {
  AIAdapterRequest,
  AIAdapterResponse,
  ProviderAdapter,
  ProviderHttpClient,
} from '../types.ts';

/**
 * Dedicated Google Stitch adapter.
 * CRITICAL RULE (Section 2.2):
 * - Never pretend Stitch is a generic Gemini text model.
 * - Never invent a Stitch endpoint or report a fake successful Stitch connection.
 * - When direct Stitch automation is unavailable in this environment, return an explicit
 *   `integration_required` non-success status so the admin or system can use an active
 *   alternative design provider (such as Gemini, Anthropic, or OpenAI) for Gate 2.
 */
export class StitchAdapter implements ProviderAdapter {
  public readonly providerType = 'stitch' as const;

  public async execute(
    request: AIAdapterRequest,
    _options: { fetchImpl?: ProviderHttpClient } = {}
  ): Promise<AIAdapterResponse> {
    const startTime = Date.now();
    const configuredModel = (request.configuredModel || 'google-stitch-v2-ui').trim();

    return {
      ok: false,
      provider: 'stitch',
      providerType: 'stitch',
      providerName: request.providerName || 'Google Stitch (UI/UX Design AI)',
      configuredModel,
      executedModel: null,
      agentGate: request.agentGate,
      latencyMs: Date.now() - startTime,
      verified: false,
      status: 'integration_required',
      response: '',
      usage: null,
      keySource: request.keySource || 'Unavailable',
      error:
        'تكامل Google Stitch المباشر عبر واجهة برمجية خارجية غير مدعوم تلقائياً في هذه البيئة (integration_required). يرجى استخدام مزود تصميم بديل مفعل للبوابة الثانية (مثل Google Gemini أو Anthropic Claude أو OpenAI).',
      statusCode: 501,
    };
  }
}

export class CloudUnsupportedAdapter implements ProviderAdapter {
  public readonly providerType = 'cloud' as const;

  public async execute(
    request: AIAdapterRequest,
    _options: { fetchImpl?: ProviderHttpClient } = {}
  ): Promise<AIAdapterResponse> {
    const startTime = Date.now();
    const configuredModel = (request.configuredModel || 'cloud-model').trim();

    return {
      ok: false,
      provider: 'cloud',
      providerType: 'cloud',
      providerName: request.providerName || 'Enterprise Cloud (AWS Bedrock / Vertex / Azure)',
      configuredModel,
      executedModel: null,
      agentGate: request.agentGate,
      latencyMs: Date.now() - startTime,
      verified: false,
      status: 'unsupported_protocol',
      response: '',
      usage: null,
      keySource: request.keySource || 'Unavailable',
      error:
        'تكامل السحابة المؤسسية المباشر (AWS Bedrock SigV4 / IAM) يتطلب بروتوكول مصادقة سحابي خاص غير مدعوم عبر مفتاح Bearer تقليدي (unsupported_protocol). استخدم بوابة متوافقة أو مزود مباشر.',
      statusCode: 501,
    };
  }
}

