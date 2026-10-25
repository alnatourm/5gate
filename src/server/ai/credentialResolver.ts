import { AgentConfig, ProviderConfig, ProviderType } from './types.ts';
import { FactoryStorage } from '../storage.ts';

export interface ResolvedExecutionTarget {
  providerId: string;
  providerType: ProviderType;
  providerName: string;
  configuredModel: string;
  apiKey: string;
  keySource: string;
  endpoint: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  agentGate?: number;
}

export const GROQ_MODEL_ALIASES: Record<string, string> = {
  'gpt oss 120b': 'openai/gpt-oss-120b',
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'openai/gpt-oss-120b': 'openai/gpt-oss-120b',
  'gpt oss 20b': 'openai/gpt-oss-20b',
  'gpt-oss-20b': 'openai/gpt-oss-20b',
  'openai/gpt-oss-20b': 'openai/gpt-oss-20b',
  'safety gpt oss 20b': 'openai/gpt-oss-safeguard-20b',
  'gpt-oss-safeguard-20b': 'openai/gpt-oss-safeguard-20b',
  'openai/gpt-oss-safeguard-20b': 'openai/gpt-oss-safeguard-20b',
  'qwen 3.8 27b': 'qwen/qwen-3.8-27b',
  'qwen-3.8-27b': 'qwen/qwen-3.8-27b',
  'qwen/qwen-3.8-27b': 'qwen/qwen-3.8-27b',
  'qwen 3 32b': 'qwen/qwen3-32b',
  'qwen/qwen3-32b': 'qwen/qwen3-32b',
  'orpheus english': 'canopylabs/orpheus-v1-english',
  'orpheus-v1-english': 'canopylabs/orpheus-v1-english',
  'canopylabs/orpheus-v1-english': 'canopylabs/orpheus-v1-english',
  'orpheus arabic saudi': 'canopylabs/orpheus-arabic-saudi',
  'orpheus-arabic-saudi': 'canopylabs/orpheus-arabic-saudi',
  'canopylabs/orpheus-arabic-saudi': 'canopylabs/orpheus-arabic-saudi',
  'whisper large v3': 'whisper-large-v3',
  'whisper-large-v3': 'whisper-large-v3',
  'whisper large v3 turbo': 'whisper-large-v3-turbo',
  'whisper-large-v3-turbo': 'whisper-large-v3-turbo',
};

export function normalizeGroqModelId(rawModel: string): string {
  const trimmed = (rawModel || '').trim();
  if (!trimmed) return trimmed;
  const lookup = GROQ_MODEL_ALIASES[trimmed.toLowerCase()];
  return lookup || trimmed;
}

export function isGroqModelIdentifier(modelLower: string): boolean {
  if (!modelLower) return false;
  if (GROQ_MODEL_ALIASES[modelLower]) return true;
  return (
    modelLower.includes('llama-') ||
    modelLower.includes('mixtral-') ||
    modelLower.includes('gpt-oss') ||
    modelLower.startsWith('openai/gpt-oss') ||
    modelLower.includes('qwen-3.8-27b') ||
    modelLower.startsWith('qwen/qwen') ||
    modelLower.includes('orpheus') ||
    modelLower.startsWith('canopylabs/') ||
    modelLower.startsWith('whisper-large-v3')
  );
}

export function inferProviderType(prov: Partial<ProviderConfig> & { provider?: string }): ProviderType {
  const idAndName = `${prov.id || ''} ${prov.name || ''}`.toLowerCase();
  const modelLower = (prov.model || '').toLowerCase().trim();
  const keyTrimmed = (prov.apiKey || '').trim();

  // Strong identity signals from provider ID, Name, or API key prefix take precedence over stale default types
  if (idAndName.includes('groq') || keyTrimmed.startsWith('gsk_')) return 'groq';
  if (idAndName.includes('stitch')) return 'stitch';
  if (idAndName.includes('openrouter') || keyTrimmed.startsWith('sk-or-')) return 'openrouter';
  if (idAndName.includes('anthropic') || idAndName.includes('claude') || keyTrimmed.startsWith('sk-ant-')) return 'anthropic';
  if (idAndName.includes('deepseek')) return 'deepseek';
  if (idAndName.includes('mistral') || idAndName.includes('codestral')) return 'mistral';
  if (idAndName.includes('xai') || idAndName.includes('grok')) return 'xai';
  if (idAndName.includes('perplexity') || idAndName.includes('sonar')) return 'perplexity';
  if (idAndName.includes('together')) return 'together';
  if (idAndName.includes('cohere')) return 'cohere';
  if (idAndName.includes('v0')) return 'v0';
  if (idAndName.includes('openai')) return 'openai';
  if (idAndName.includes('gemini')) return 'gemini';

  const explicit = (prov.providerType || prov.provider || '').toLowerCase().trim();
  if (
    explicit === 'stitch' ||
    explicit === 'gemini' ||
    explicit === 'openai' ||
    explicit === 'anthropic' ||
    explicit === 'groq' ||
    explicit === 'deepseek' ||
    explicit === 'mistral' ||
    explicit === 'xai' ||
    explicit === 'openrouter' ||
    explicit === 'v0' ||
    explicit === 'perplexity' ||
    explicit === 'together' ||
    explicit === 'cohere' ||
    explicit === 'cloud' ||
    explicit === 'custom'
  ) {
    // Guard against a non-Gemini model on a card that accidentally kept 'gemini' or 'stitch' type
    if (explicit === 'gemini' || explicit === 'stitch') {
      if (isGroqModelIdentifier(modelLower)) return 'groq';
      if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) return 'openai';
      if (modelLower.startsWith('claude-')) return 'anthropic';
      if (modelLower.startsWith('deepseek-')) return 'deepseek';
    }
    return explicit;
  }

  if (isGroqModelIdentifier(modelLower)) return 'groq';
  if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) return 'openai';
  if (modelLower.startsWith('claude-')) return 'anthropic';
  if (modelLower.startsWith('deepseek-')) return 'deepseek';
  if (modelLower.includes('codestral') || modelLower.startsWith('mistral-')) return 'mistral';
  if (modelLower.startsWith('grok-')) return 'xai';
  if (modelLower.startsWith('openrouter/')) return 'openrouter';

  const hay = `${prov.id || ''} ${prov.name || ''} ${prov.endpoint || ''}`.toLowerCase();
  if (hay.includes('stitch')) return 'stitch';
  if (hay.includes('groq')) return 'groq';
  if (hay.includes('openrouter')) return 'openrouter';
  if (hay.includes('openai')) return 'openai';
  if (hay.includes('anthropic') || hay.includes('claude')) return 'anthropic';
  if (hay.includes('deepseek')) return 'deepseek';
  if (hay.includes('mistral') || hay.includes('codestral')) return 'mistral';
  if (hay.includes('xai') || hay.includes('grok')) return 'xai';
  if (hay.includes('v0')) return 'v0';
  if (hay.includes('perplexity') || hay.includes('sonar')) return 'perplexity';
  if (hay.includes('together')) return 'together';
  if (hay.includes('cohere')) return 'cohere';
  if (hay.includes('gemini') || hay.includes('generativelanguage.googleapis')) return 'gemini';
  return 'custom';
}

export interface ProviderEndpointSpec {
  providerType: ProviderType;
  defaultEndpoint: string;
  allowedHosts: string[];
  operationPath: string;
  protocol:
    | 'gemini_native'
    | 'openai_chat_completions'
    | 'anthropic_messages'
    | 'openrouter_chat_completions'
    | 'perplexity_chat_completions'
    | 'cohere_v2_chat'
    | 'stitch_integration'
    | 'unsupported_protocol'
    | 'openai_compatible_custom';
}

export const PROVIDER_ENDPOINT_REGISTRY: Record<ProviderType, ProviderEndpointSpec> = {
  gemini: {
    providerType: 'gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    allowedHosts: ['generativelanguage.googleapis.com'],
    operationPath: '/v1beta',
    protocol: 'gemini_native',
  },
  groq: {
    providerType: 'groq',
    defaultEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    allowedHosts: ['api.groq.com'],
    operationPath: '/openai/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  openai: {
    providerType: 'openai',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    allowedHosts: ['api.openai.com'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  anthropic: {
    providerType: 'anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    allowedHosts: ['api.anthropic.com'],
    operationPath: '/v1/messages',
    protocol: 'anthropic_messages',
  },
  deepseek: {
    providerType: 'deepseek',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    allowedHosts: ['api.deepseek.com'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  mistral: {
    providerType: 'mistral',
    defaultEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    allowedHosts: ['api.mistral.ai'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  xai: {
    providerType: 'xai',
    defaultEndpoint: 'https://api.x.ai/v1/chat/completions',
    allowedHosts: ['api.x.ai'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  openrouter: {
    providerType: 'openrouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    allowedHosts: ['openrouter.ai'],
    operationPath: '/api/v1/chat/completions',
    protocol: 'openrouter_chat_completions',
  },
  perplexity: {
    providerType: 'perplexity',
    defaultEndpoint: 'https://api.perplexity.ai/chat/completions',
    allowedHosts: ['api.perplexity.ai'],
    operationPath: '/chat/completions',
    protocol: 'perplexity_chat_completions',
  },
  together: {
    providerType: 'together',
    defaultEndpoint: 'https://api.together.xyz/v1/chat/completions',
    allowedHosts: ['api.together.xyz'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  cohere: {
    providerType: 'cohere',
    defaultEndpoint: 'https://api.cohere.com/v2/chat',
    allowedHosts: ['api.cohere.com'],
    operationPath: '/v2/chat',
    protocol: 'cohere_v2_chat',
  },
  v0: {
    providerType: 'v0',
    defaultEndpoint: 'https://api.v0.dev/v1/chat/completions',
    allowedHosts: ['api.v0.dev'],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_chat_completions',
  },
  stitch: {
    providerType: 'stitch',
    defaultEndpoint: 'https://stitch.googleapis.com/mcp',
    allowedHosts: ['stitch.googleapis.com', 'stitch.withgoogle.com'],
    operationPath: '/mcp',
    protocol: 'stitch_integration',
  },
  cloud: {
    providerType: 'cloud',
    defaultEndpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    allowedHosts: ['amazonaws.com', 'azure.com', 'openai.azure.com'],
    operationPath: '',
    protocol: 'unsupported_protocol',
  },
  custom: {
    providerType: 'custom',
    defaultEndpoint: '',
    allowedHosts: [],
    operationPath: '/v1/chat/completions',
    protocol: 'openai_compatible_custom',
  },
};

export function getDefaultEndpointForProviderType(providerType: ProviderType): string {
  return PROVIDER_ENDPOINT_REGISTRY[providerType]?.defaultEndpoint ?? '';
}

function collapseDuplicateOperationSegments(pathname: string): string {
  let clean = pathname.replace(/\/{2,}/g, '/');
  while (/\/chat\/completions\/chat\/completions$/i.test(clean)) {
    clean = clean.replace(/\/chat\/completions\/chat\/completions$/i, '/chat/completions');
  }
  while (/\/v1\/v1(\/|$)/i.test(clean)) {
    clean = clean.replace(/\/v1\/v1(\/|$)/i, '/v1$1');
  }
  while (/\/messages\/messages$/i.test(clean)) {
    clean = clean.replace(/\/messages\/messages$/i, '/messages');
  }
  return clean;
}

export function validateAndNormalizeEndpointForProvider(
  providerType: ProviderType,
  rawEndpoint?: string,
  options: { allowRepairOnBoot?: boolean } = {}
): { valid: boolean; endpoint: string; error?: string } {
  const spec = PROVIDER_ENDPOINT_REGISTRY[providerType] || PROVIDER_ENDPOINT_REGISTRY.custom;
  const trimmed = (rawEndpoint || '').trim();

  if (!trimmed) {
    if (providerType === 'custom') {
      return {
        valid: false,
        endpoint: '',
        error: 'يجب تحديد عنوان الاتصال (Endpoint URL) للمزود المخصص (custom).',
      };
    }
    return { valid: true, endpoint: spec.defaultEndpoint };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    if (options.allowRepairOnBoot && spec.defaultEndpoint) {
      return { valid: true, endpoint: spec.defaultEndpoint };
    }
    return {
      valid: false,
      endpoint: trimmed,
      error: `عنوان الاتصال "${trimmed}" غير صالح. يجب أن يكون رابط HTTP/HTTPS كامل.`,
    };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      endpoint: trimmed,
      error: `بروتوكول الرابط "${parsedUrl.protocol}" غير مدعوم. استخدم https:// أو http://.`,
    };
  }

  const hostLower = parsedUrl.hostname.toLowerCase();

  // For known provider types (non-custom), enforce host matching against the central provider registry
  if (providerType !== 'custom') {
    const hostAllowed = spec.allowedHosts.some(
      (allowed) => hostLower === allowed || hostLower.endsWith(`.${allowed}`)
    );
    if (!hostAllowed) {
      if (options.allowRepairOnBoot && spec.defaultEndpoint) {
        return { valid: true, endpoint: spec.defaultEndpoint };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `عدم تطابق عنوان الاتصال: المزود "${providerType}" لا يمكنه استخدام الرابط "${trimmed}" التابع لمزود آخر أو نطاق غير متوافق. العنوان الصحيح هو: ${spec.defaultEndpoint}`,
      };
    }

    // Normalize base URLs and operation paths for the known provider
    const cleanPath = collapseDuplicateOperationSegments(
      parsedUrl.pathname.replace(/\/+$/, '') || ''
    );
    const pathLower = cleanPath.toLowerCase();

    if (providerType === 'groq') {
      if (
        !pathLower ||
        pathLower === '/openai' ||
        pathLower === '/openai/v1' ||
        pathLower === '/v1' ||
        pathLower === '/v1/chat/completions' ||
        pathLower === '/chat/completions' ||
        pathLower === '/openai/v1/chat/completions'
      ) {
        parsedUrl.pathname = '/openai/v1/chat/completions';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار عنوان Groq غير صالح (${cleanPath}). المسار الصحيح هو /openai/v1/chat/completions.`,
      };
    }

    if (
      providerType === 'openai' ||
      providerType === 'deepseek' ||
      providerType === 'mistral' ||
      providerType === 'xai' ||
      providerType === 'together' ||
      providerType === 'v0'
    ) {
      if (
        !pathLower ||
        pathLower === '/v1' ||
        pathLower === '/chat/completions' ||
        pathLower === '/v1/chat/completions'
      ) {
        parsedUrl.pathname = '/v1/chat/completions';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال للمزود "${providerType}" غير صالح (${cleanPath}). المسار المطلوب هو /v1/chat/completions.`,
      };
    }

    if (providerType === 'anthropic') {
      if (!pathLower || pathLower === '/v1' || pathLower === '/messages' || pathLower === '/v1/messages') {
        parsedUrl.pathname = '/v1/messages';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لمزود Anthropic غير صالح (${cleanPath}). المسار المطلوب هو /v1/messages.`,
      };
    }

    if (providerType === 'openrouter') {
      if (
        !pathLower ||
        pathLower === '/api' ||
        pathLower === '/api/v1' ||
        pathLower === '/v1' ||
        pathLower === '/v1/chat/completions' ||
        pathLower === '/api/v1/chat/completions'
      ) {
        parsedUrl.pathname = '/api/v1/chat/completions';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لمزود OpenRouter غير صالح (${cleanPath}). المسار المطلوب هو /api/v1/chat/completions.`,
      };
    }

    if (providerType === 'perplexity') {
      if (
        !pathLower ||
        pathLower === '/v1' ||
        pathLower === '/v1/chat/completions' ||
        pathLower === '/chat/completions'
      ) {
        parsedUrl.pathname = '/chat/completions';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لمزود Perplexity غير صالح (${cleanPath}). المسار المطلوب هو /chat/completions.`,
      };
    }

    if (providerType === 'cohere') {
      if (!pathLower || pathLower === '/v2' || pathLower === '/v1/chat' || pathLower === '/v2/chat' || pathLower === '/chat') {
        parsedUrl.pathname = '/v2/chat';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لمزود Cohere غير صالح (${cleanPath}). المسار المطلوب هو /v2/chat.`,
      };
    }

    if (providerType === 'gemini') {
      if (!pathLower || pathLower === '/v1' || pathLower === '/v1beta') {
        parsedUrl.pathname = '/v1beta';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      if (pathLower.includes(':generatecontent')) {
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لمزود Gemini غير صالح (${cleanPath}).`,
      };
    }

    if (providerType === 'stitch') {
      // Automatically migrate legacy stitch.withgoogle.com endpoints to the official Stitch MCP service
      if (hostLower === 'stitch.withgoogle.com' || hostLower.endsWith('.stitch.withgoogle.com')) {
        return { valid: true, endpoint: 'https://stitch.googleapis.com/mcp' };
      }
      if (
        !pathLower ||
        pathLower === '/' ||
        pathLower === '/mcp' ||
        pathLower === '/v1/mcp' ||
        pathLower === '/api/v1/generate'
      ) {
        parsedUrl.hostname = 'stitch.googleapis.com';
        parsedUrl.pathname = '/mcp';
        return { valid: true, endpoint: parsedUrl.toString() };
      }
      return {
        valid: false,
        endpoint: trimmed,
        error: `مسار الاتصال لخدمة Google Stitch MCP غير صالح (${cleanPath}). المسار الصحيح هو https://stitch.googleapis.com/mcp.`,
      };
    }

    return { valid: true, endpoint: parsedUrl.toString() };
  }

  // Custom provider validation (providerType === 'custom')
  if (
    hostLower === 'generativelanguage.googleapis.com' ||
    hostLower === 'api.anthropic.com' ||
    hostLower === 'stitch.withgoogle.com' ||
    hostLower === 'stitch.googleapis.com' ||
    hostLower === 'api.cohere.com'
  ) {
    return {
      valid: false,
      endpoint: trimmed,
      error: `الرابط "${trimmed}" يتبع بروتوكول مزود خاص غير متوافق مع وضع OpenAI-Compatible Custom. يرجى اختيار نوع المزود الصحيح.`,
    };
  }

  const cleanCustomPath = collapseDuplicateOperationSegments(parsedUrl.pathname.replace(/\/+$/, ''));
  if (!cleanCustomPath || cleanCustomPath === '/') {
    parsedUrl.pathname = '/v1/chat/completions';
  } else if (cleanCustomPath.toLowerCase() === '/v1' || cleanCustomPath.toLowerCase() === '/openai/v1') {
    parsedUrl.pathname = `${cleanCustomPath}/chat/completions`;
  } else {
    parsedUrl.pathname = cleanCustomPath;
  }

  return { valid: true, endpoint: parsedUrl.toString() };
}

/**
 * Normalizes provider endpoints when valid or when repairing legacy persisted state on boot.
 */
export function normalizeEndpointForProviderType(
  providerType: ProviderType,
  rawEndpoint?: string,
  options: { allowRepairOnBoot?: boolean } = {}
): string {
  const res = validateAndNormalizeEndpointForProvider(providerType, rawEndpoint, options);
  return res.endpoint;
}

/**
 * Resolves the environment variable key strictly for the matching provider type.
 * NEVER resolves GEMINI_API_KEY for OpenAI, Anthropic, Groq, OpenRouter, Stitch, or custom providers.
 */
export function resolveSystemEnvKeyForProvider(
  providerType: ProviderType,
  managedGeminiApiKey?: string
): string {
  switch (providerType) {
    case 'gemini':
      return (
        managedGeminiApiKey !== undefined
          ? managedGeminiApiKey
          : process.env.GEMINI_API_KEY || ''
      ).trim();
    case 'openai':
      return (process.env.OPENAI_API_KEY || '').trim();
    case 'anthropic':
      return (process.env.ANTHROPIC_API_KEY || '').trim();
    case 'groq':
      return (process.env.GROQ_API_KEY || '').trim();
    case 'openrouter':
      return (process.env.OPENROUTER_API_KEY || '').trim();
    case 'deepseek':
      return (process.env.DEEPSEEK_API_KEY || '').trim();
    case 'mistral':
      return (process.env.MISTRAL_API_KEY || '').trim();
    case 'xai':
      return (process.env.XAI_API_KEY || '').trim();
    case 'stitch':
      return (process.env.STITCH_API_KEY || '').trim();
    case 'v0':
      return (process.env.V0_API_KEY || '').trim();
    case 'perplexity':
      return (process.env.PERPLEXITY_API_KEY || '').trim();
    case 'together':
      return (process.env.TOGETHER_API_KEY || '').trim();
    case 'cohere':
      return (process.env.COHERE_API_KEY || '').trim();
    default:
      return (process.env.CUSTOM_AI_API_KEY || '').trim();
  }
}

function cleanApiKeyCandidate(val?: string): string {
  const trimmed = (val || '').trim();
  if (!trimmed || trimmed.includes('•')) return '';
  return trimmed;
}

function isModelCompatibleWithProvider(model: string, providerType: ProviderType): boolean {
  const m = (model || '').toLowerCase().trim();
  if (!m) return false;
  if (providerType === 'stitch') {
    return (
      m === 'gemini_3_flash' ||
      m === 'gemini_3_1_pro' ||
      m === 'gemini_3_pro' ||
      m.includes('stitch') ||
      m.startsWith('gemini-')
    );
  }
  if (providerType !== 'gemini' && (m.startsWith('gemini-') || m.startsWith('gemini_'))) return false;
  if (m.includes('stitch')) return false;
  return true;
}

function normalizeConfiguredModelForProvider(model: string, providerType: ProviderType): string {
  const trimmed = (model || '').trim();
  if (providerType === 'stitch') {
    const upper = trimmed.toUpperCase().replace(/[\s.-]+/g, '_');
    if (upper === 'GEMINI_3_1_PRO' || upper.includes('3_1_PRO')) return 'GEMINI_3_1_PRO';
    if (upper === 'GEMINI_3_PRO' || (upper.includes('3_PRO') && !upper.includes('3_1'))) return 'GEMINI_3_PRO';
    if (upper === 'GEMINI_3_FLASH' || upper.includes('FLASH')) return 'GEMINI_3_FLASH';
    return 'GEMINI_3_FLASH';
  }
  return trimmed;
}

export function resolveAdminTargetCredentials(params: {
  gate?: number;
  providerId?: string;
  customKey?: string;
  providers: ProviderConfig[];
  agents: AgentConfig[];
  agentOverride?: Partial<AgentConfig>;
  providerOverride?: Partial<ProviderConfig>;
  managedGeminiApiKey?: string;
}): ResolvedExecutionTarget {
  const {
    gate,
    providerId,
    customKey,
    providers,
    agents,
    agentOverride,
    providerOverride,
    managedGeminiApiKey,
  } = params;

  // 1. Direct provider test (when providerId is explicitly specified)
  if (providerId) {
    const foundProv = providers.find((p) => p.id === providerId);
    const inferredType = inferProviderType({ ...foundProv, ...providerOverride });
    const rawEndpoint =
      providerOverride?.endpoint !== undefined && String(providerOverride.endpoint).trim() !== ''
        ? providerOverride.endpoint
        : foundProv?.endpoint || '';

    const overrideProvKey = cleanApiKeyCandidate(providerOverride?.apiKey);
    const savedProvKey = cleanApiKeyCandidate(foundProv?.apiKey);
    const linkedAgentKey = cleanApiKeyCandidate(
      agents.find((a) => a.providerId === providerId && cleanApiKeyCandidate(a.apiKey))?.apiKey
    );
    const resolvedProvKey = overrideProvKey || savedProvKey || linkedAgentKey;

    const mergedProv: ProviderConfig = {
      id: providerId,
      name: providerOverride?.name || foundProv?.name || providerId,
      providerType: inferredType,
      model: normalizeConfiguredModelForProvider(
        (providerOverride?.model || foundProv?.model || '').trim(),
        inferredType
      ),
      status: providerOverride?.status || foundProv?.status || 'active',
      enabled:
        typeof providerOverride?.enabled === 'boolean'
          ? providerOverride.enabled
          : foundProv
          ? foundProv.enabled
          : true,
      apiKey: resolvedProvKey,
      useSystemEnv:
        typeof providerOverride?.useSystemEnv === 'boolean'
          ? providerOverride.useSystemEnv
          : foundProv
          ? foundProv.useSystemEnv
          : true,
      endpoint: normalizeEndpointForProviderType(inferredType, rawEndpoint),
      latency: foundProv?.latency || '100ms',
      assignedGates: foundProv?.assignedGates || [],
      monthlyQuotaJod: foundProv?.monthlyQuotaJod || 1000,
      usedQuotaJod: foundProv?.usedQuotaJod || 0,
    };

    const pType = mergedProv.providerType;
    const explicitCustom = cleanApiKeyCandidate(customKey);
    const storedProvKey = cleanApiKeyCandidate(mergedProv.apiKey);
    const envKey = mergedProv.useSystemEnv
      ? resolveSystemEnvKeyForProvider(pType, managedGeminiApiKey)
      : '';

    let apiKey = '';
    let keySource = 'Missing';
    if (explicitCustom) {
      apiKey = explicitCustom;
      keySource = 'Custom Key';
    } else if (storedProvKey) {
      apiKey = storedProvKey;
      keySource = 'Provider Key';
    } else if (envKey) {
      apiKey = envKey;
      keySource = 'System Vault';
    }

    return {
      providerId: mergedProv.id,
      providerType: pType,
      providerName: mergedProv.name,
      configuredModel: mergedProv.model,
      apiKey,
      keySource,
      endpoint: mergedProv.endpoint,
      agentGate: gate,
    };
  }

  // 2. Agent test / gate execution
  const gateNum = Number(gate) || 1;
  const savedAgent = agents.find((a) => a.gate === gateNum) || agents[0];
  const resolvedAgentKey =
    cleanApiKeyCandidate(agentOverride?.apiKey) || cleanApiKeyCandidate(savedAgent?.apiKey);

  const mergedAgent: AgentConfig = {
    ...savedAgent,
    ...agentOverride,
    gate: gateNum,
    model: (
      agentOverride?.model !== undefined && String(agentOverride.model).trim() !== ''
        ? agentOverride.model
        : savedAgent?.model || ''
    ).trim(),
    providerId: agentOverride?.providerId || savedAgent?.providerId || 'prov-gemini',
    useProviderKey:
      typeof agentOverride?.useProviderKey === 'boolean'
        ? agentOverride.useProviderKey
        : savedAgent?.useProviderKey ?? true,
    apiKey: resolvedAgentKey,
  };

  const foundProv =
    providers.find((p) => p.id === mergedAgent.providerId) ||
    (providerOverride?.id ? providers.find((p) => p.id === providerOverride.id) : undefined);

  const pType = inferProviderType({
    ...foundProv,
    ...providerOverride,
    id: mergedAgent.providerId,
    name: mergedAgent.providerName || foundProv?.name,
  });

  const providerModel = (providerOverride?.model || foundProv?.model || '').trim();
  const rawSelectedModel =
    mergedAgent.model && isModelCompatibleWithProvider(mergedAgent.model, pType)
      ? mergedAgent.model
      : providerModel || mergedAgent.model || '';
  const configuredModel = normalizeConfiguredModelForProvider(rawSelectedModel, pType);

  const endpoint = normalizeEndpointForProviderType(
    pType,
    (providerOverride?.endpoint && String(providerOverride.endpoint).trim()) || foundProv?.endpoint
  );

  const explicitCustom = cleanApiKeyCandidate(customKey);
  const providerKey =
    cleanApiKeyCandidate(providerOverride?.apiKey) || cleanApiKeyCandidate(foundProv?.apiKey);
  const allowEnv = foundProv ? foundProv.useSystemEnv !== false : true;
  const envKey = allowEnv ? resolveSystemEnvKeyForProvider(pType, managedGeminiApiKey) : '';

  let apiKey = '';
  let keySource = 'Missing';
  if (explicitCustom) {
    apiKey = explicitCustom;
    keySource = 'Custom Key';
  } else if (!mergedAgent.useProviderKey && resolvedAgentKey) {
    apiKey = resolvedAgentKey;
    keySource = `Agent Gate ${gateNum} Key`;
  } else if (providerKey) {
    apiKey = providerKey;
    keySource = 'Provider Key';
  } else if (resolvedAgentKey) {
    apiKey = resolvedAgentKey;
    keySource = `Agent Gate ${gateNum} Key`;
  } else if (envKey) {
    apiKey = envKey;
    keySource = 'System Vault';
  }

  return {
    providerId: mergedAgent.providerId,
    providerType: pType,
    providerName: foundProv?.name || mergedAgent.providerName || pType,
    configuredModel,
    apiKey,
    keySource,
    endpoint,
    systemPrompt: mergedAgent.systemPrompt,
    temperature: mergedAgent.temperature,
    maxTokens: mergedAgent.maxTokens,
    agentGate: gateNum,
  };
}

/**
 * Resolves the provider, model, and credentials for a project's gate execution.
 * Strictly enforces:
 * - Stored project commercial mode ('managed' vs 'byok')
 * - BYOK never falls back to OGroup-managed credentials
 * - Managed mode uses the Admin-configured agent & provider for that gate
 */
export function resolveProjectGateCredentials(params: {
  storage: FactoryStorage;
  projectId: string;
  userId: string;
  gate: number;
  providers: ProviderConfig[];
  agents: AgentConfig[];
  managedGeminiApiKey?: string;
}): ResolvedExecutionTarget {
  const { storage, projectId, userId, gate, providers, agents, managedGeminiApiKey } = params;
  const project = storage.getProjectById(projectId);
  if (!project) {
    const err: any = new Error('المشروع غير موجود.');
    err.statusCode = 404;
    throw err;
  }
  if (project.ownerId !== userId) {
    const err: any = new Error('غير مصرح لك بالوصول إلى هذا المشروع.');
    err.statusCode = 403;
    throw err;
  }

  const agent = agents.find((a) => a.gate === gate);
  if (agent && !agent.enabled) {
    const err: any = new Error(`وكيل البوابة ${gate} (${agent.title}) متوقف حالياً من قبل الإدارة.`);
    err.statusCode = 503;
    throw err;
  }

  if (project.mode === 'byok') {
    const user = storage.getUserById(userId);
    if (!user || !user.subscriptionActive) {
      const err: any = new Error(
        'اشتراك باقة Build With My AI (50 JOD شهرياً) غير مفعل. لا يمكن تشغيل الوكيل.'
      );
      err.statusCode = 402;
      throw err;
    }

    const conn = storage.getDecryptedAIConnectionForUser(userId, project.selectedConnectionId, gate);
    if (!conn || !conn.active) {
      const err: any = new Error(
        'لا يوجد اتصال ذكاء اصطناعي (BYOK) مفعل لحسابك. يرجى إعداد وتفعيل المفتاح أولاً.'
      );
      err.statusCode = 400;
      throw err;
    }
    if (!conn.apiKey || !conn.apiKey.trim()) {
      const err: any = new Error(
        `مفتاح API الخاص بك للمزود (${conn.provider}) غير موجود أو فارغ. لن يتم استخدام مفتاح المنصة البديل.`
      );
      err.statusCode = 401;
      throw err;
    }

    const pType = inferProviderType({ provider: conn.provider, model: conn.model, endpoint: conn.endpoint });
    return {
      providerId: conn.id,
      providerType: pType,
      providerName: conn.provider,
      configuredModel: normalizeConfiguredModelForProvider(conn.model, pType),
      apiKey: conn.apiKey.trim(),
      keySource: 'Customer BYOK Vault',
      endpoint: normalizeEndpointForProviderType(pType, conn.endpoint),
      systemPrompt: agent?.systemPrompt,
      temperature: agent?.temperature,
      maxTokens: agent?.maxTokens,
      agentGate: gate,
    };
  }

  // Managed Mode ("Build For Me" — 100 JOD per project)
  if (!project.entitlementVerified) {
    const err: any = new Error('لم يتم تأكيد استحقاق المشروع في باقة Build For Me (100 JOD).');
    err.statusCode = 402;
    throw err;
  }

  const resolved = resolveAdminTargetCredentials({
    gate,
    providers,
    agents,
    managedGeminiApiKey,
  });

  if (!resolved.apiKey) {
    const err: any = new Error(
      resolved.providerType === 'stitch'
        ? `مفتاح Google Stitch API Key (X-Goog-Api-Key) غير مهيأ على الخادم للبوابة ${gate}. يرجى إدخال مفتاح Stitch الرسمي في لوحة الإدارة للاتصال بـ https://stitch.googleapis.com/mcp.`
        : `مفتاح الذكاء الاصطناعي المدار للمزود (${resolved.providerType}) في البوابة ${gate} غير مهيأ على الخادم.`
    );
    err.statusCode = 503;
    err.errorType = 'auth_error';
    throw err;
  }

  return resolved;
}
