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

export function inferProviderType(prov: Partial<ProviderConfig> & { provider?: string }): ProviderType {
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
    return explicit;
  }

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

export function getDefaultEndpointForProviderType(providerType: ProviderType): string {
  switch (providerType) {
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages';
    case 'groq':
      return 'https://api.groq.com/openai/v1/chat/completions';
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions';
    case 'mistral':
      return 'https://api.mistral.ai/v1/chat/completions';
    case 'xai':
      return 'https://api.x.ai/v1/chat/completions';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions';
    case 'v0':
      return 'https://api.v0.dev/v1/chat/completions';
    case 'perplexity':
      return 'https://api.perplexity.ai/chat/completions';
    case 'together':
      return 'https://api.together.xyz/v1/chat/completions';
    case 'cohere':
      return 'https://api.cohere.com/v2/chat';
    case 'stitch':
      return 'https://stitch.withgoogle.com/api/v1/generate';
    default:
      return '';
  }
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
    const mergedProv: ProviderConfig = {
      id: providerId,
      name: providerOverride?.name || foundProv?.name || providerId,
      providerType: inferProviderType({ ...foundProv, ...providerOverride }),
      model: (providerOverride?.model || foundProv?.model || '').trim(),
      status: providerOverride?.status || foundProv?.status || 'active',
      enabled:
        typeof providerOverride?.enabled === 'boolean'
          ? providerOverride.enabled
          : foundProv
          ? foundProv.enabled
          : true,
      apiKey:
        providerOverride?.apiKey !== undefined
          ? providerOverride.apiKey
          : foundProv?.apiKey || '',
      useSystemEnv:
        typeof providerOverride?.useSystemEnv === 'boolean'
          ? providerOverride.useSystemEnv
          : foundProv
          ? foundProv.useSystemEnv
          : true,
      endpoint:
        providerOverride?.endpoint !== undefined
          ? providerOverride.endpoint
          : foundProv?.endpoint || '',
      latency: foundProv?.latency || '100ms',
      assignedGates: foundProv?.assignedGates || [],
      monthlyQuotaJod: foundProv?.monthlyQuotaJod || 1000,
      usedQuotaJod: foundProv?.usedQuotaJod || 0,
    };

    const pType = mergedProv.providerType;
    const explicitCustom = (customKey || '').trim();
    const storedProvKey = (mergedProv.apiKey || '').trim();
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
      endpoint: mergedProv.endpoint || getDefaultEndpointForProviderType(pType),
      agentGate: gate,
    };
  }

  // 2. Agent test / gate execution
  const gateNum = Number(gate) || 1;
  const savedAgent = agents.find((a) => a.gate === gateNum) || agents[0];
  const mergedAgent: AgentConfig = {
    ...savedAgent,
    ...agentOverride,
    gate: gateNum,
    model: (agentOverride?.model !== undefined ? agentOverride.model : savedAgent?.model || '').trim(),
    providerId: agentOverride?.providerId || savedAgent?.providerId || 'prov-gemini',
    useProviderKey:
      typeof agentOverride?.useProviderKey === 'boolean'
        ? agentOverride.useProviderKey
        : savedAgent?.useProviderKey ?? true,
    apiKey:
      agentOverride?.apiKey !== undefined ? agentOverride.apiKey : savedAgent?.apiKey || '',
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

  const configuredModel = mergedAgent.model || providerOverride?.model || foundProv?.model || '';
  const endpoint =
    providerOverride?.endpoint ||
    foundProv?.endpoint ||
    getDefaultEndpointForProviderType(pType);

  const explicitCustom = (customKey || '').trim();
  const dedicatedAgentKey = !mergedAgent.useProviderKey ? (mergedAgent.apiKey || '').trim() : '';
  const providerKey = (providerOverride?.apiKey || foundProv?.apiKey || '').trim();
  const allowEnv = foundProv ? foundProv.useSystemEnv !== false : true;
  const envKey = allowEnv ? resolveSystemEnvKeyForProvider(pType, managedGeminiApiKey) : '';

  let apiKey = '';
  let keySource = 'Missing';
  if (explicitCustom) {
    apiKey = explicitCustom;
    keySource = 'Custom Key';
  } else if (dedicatedAgentKey) {
    apiKey = dedicatedAgentKey;
    keySource = `Agent Gate ${gateNum} Key`;
  } else if (providerKey) {
    apiKey = providerKey;
    keySource = 'Provider Key';
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

    const pType = inferProviderType({ provider: conn.provider, endpoint: conn.endpoint });
    return {
      providerId: conn.id,
      providerType: pType,
      providerName: conn.provider,
      configuredModel: conn.model,
      apiKey: conn.apiKey.trim(),
      keySource: 'Customer BYOK Vault',
      endpoint: conn.endpoint || getDefaultEndpointForProviderType(pType),
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

  if (!resolved.apiKey && resolved.providerType !== 'stitch') {
    const err: any = new Error(
      `مفتاح الذكاء الاصطناعي المدار للمزود (${resolved.providerType}) في البوابة ${gate} غير مهيأ على الخادم.`
    );
    err.statusCode = 503;
    throw err;
  }

  return resolved;
}
