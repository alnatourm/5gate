export type ProviderType =
  | 'stitch'
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'deepseek'
  | 'mistral'
  | 'xai'
  | 'openrouter'
  | 'v0'
  | 'perplexity'
  | 'together'
  | 'cohere'
  | 'cloud'
  | 'custom';

export type ExecutionStatus =
  | 'succeeded'
  | 'failed'
  | 'auth_error'
  | 'invalid_model'
  | 'endpoint_unavailable'
  | 'integration_required'
  | 'unsupported'
  | 'rate_limit'
  | 'timeout';

export interface TokenUsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  providerType: ProviderType;
  model: string;
  status: 'active' | 'standby' | 'disabled';
  enabled: boolean;
  apiKey: string;
  useSystemEnv: boolean;
  endpoint: string;
  latency: string;
  assignedGates: string[];
  monthlyQuotaJod: number;
  usedQuotaJod: number;
}

export interface AgentConfig {
  gate: number;
  gateCode: string;
  title: string;
  roleEn: string;
  desc: string;
  providerId: string;
  providerName: string;
  model: string;
  apiKey: string;
  useProviderKey: boolean;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  systemPrompt: string;
}

export type ProviderHttpClient = typeof fetch;

export interface AIAdapterRequest {
  providerId: string;
  providerType: ProviderType;
  providerName?: string;
  configuredModel: string;
  apiKey: string;
  keySource: string;
  endpoint?: string;
  systemPrompt?: string;
  userPrompt: string;
  responseFormat?: 'json' | 'text';
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  agentGate?: number;
}

export interface AIAdapterResponse {
  ok: boolean;
  provider: string;
  providerType: ProviderType;
  providerName?: string;
  configuredModel: string;
  executedModel: string | null;
  agentGate?: number;
  latencyMs: number;
  verified: boolean;
  status: ExecutionStatus;
  response: string;
  usage: TokenUsageMetrics | null;
  keySource: string;
  error?: string;
  statusCode?: number;
}

export interface ProviderAdapter {
  readonly providerType: ProviderType;
  execute(
    request: AIAdapterRequest,
    options?: { fetchImpl?: ProviderHttpClient }
  ): Promise<AIAdapterResponse>;
}

export function classifyHttpError(
  status: number,
  rawMessage: string
): { status: ExecutionStatus; statusCode: number } {
  const msg = (rawMessage || '').toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    msg.includes('invalid api key') ||
    msg.includes('incorrect api key') ||
    msg.includes('authentication') ||
    msg.includes('unauthorized') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid x-api-key')
  ) {
    return { status: 'auth_error', statusCode: 401 };
  }
  if (
    status === 404 ||
    msg.includes('model_not_found') ||
    msg.includes('model not found') ||
    msg.includes('does not exist') ||
    msg.includes('not supported for generatecontent') ||
    msg.includes('invalid model') ||
    msg.includes('unknown model')
  ) {
    return { status: 'invalid_model', statusCode: 400 };
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) {
    return { status: 'rate_limit', statusCode: 429 };
  }
  if (status === 501 || msg.includes('integration_required')) {
    return { status: 'integration_required', statusCode: 501 };
  }
  if (status === 504 || msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
    return { status: 'timeout', statusCode: 504 };
  }
  return { status: 'failed', statusCode: status >= 400 && status < 600 ? status : 502 };
}

export function redactSecrets(text: string, apiKey?: string): string {
  if (!text) return '';
  let out = text;
  if (apiKey && apiKey.trim().length >= 6) {
    const escaped = apiKey.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'g'), '[REDACTED_API_KEY]');
  }
  out = out.replace(/sk-[a-zA-Z0-9_-]{12,}/g, '[REDACTED_KEY]');
  out = out.replace(/AIza[a-zA-Z0-9_-]{12,}/g, '[REDACTED_KEY]');
  out = out.replace(/gsk_[a-zA-Z0-9_-]{12,}/g, '[REDACTED_KEY]');
  return out;
}
