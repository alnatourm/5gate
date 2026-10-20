import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FactoryStorage, UserRecord, maskApiKey } from './src/server/storage.ts';
import {
  executeRequirementsAgent,
  ProviderHttpClient,
} from './src/server/requirementsAgent.ts';
import {
  RequirementsDocument,
  parseMarkdownToRequirements,
  validateRequirementsDocument,
} from './src/shared/requirementsSchema.ts';
import {
  AgentConfig,
  ProviderConfig,
  ProviderType,
  redactSecrets,
} from './src/server/ai/types.ts';
import {
  inferProviderType,
  resolveAdminTargetCredentials,
  resolveProjectGateCredentials,
} from './src/server/ai/credentialResolver.ts';
import { executeProviderRequest, executeResolvedTarget } from './src/server/ai/router.ts';
import { executeDesignAgent } from './src/server/designAgent.ts';
import { DesignArtifact, buildIsolatedDesignPreviewHtml } from './src/shared/designSchema.ts';
import { executeDevelopmentAgent } from './src/server/developmentAgent.ts';
import {
  CodeArtifact,
  GeneratedProjectFile,
  inferFileType,
  validateRelativeFilePath,
} from './src/shared/codeSchema.ts';
import { executeGate4VerificationWithRepair } from './src/server/qaRunner.ts';
import { buildProjectDeliveryPackage } from './src/server/deliveryPackager.ts';

dotenv.config();

export type { ProviderType, ProviderConfig, AgentConfig };

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'prov-stitch',
    name: 'Google Stitch (UI/UX Design AI)',
    providerType: 'stitch',
    model: 'google-stitch-v2-ui',
    status: 'standby',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://stitch.withgoogle.com/api/v1/generate',
    latency: 'N/A',
    assignedGates: ['GATE 02'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 0,
  },
  {
    id: 'prov-gemini',
    name: 'Google Gemini Enterprise',
    providerType: 'gemini',
    model: 'gemini-3.8-flash',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    latency: '138ms',
    assignedGates: ['GATE 01', 'GATE 02', 'GATE 03', 'GATE 04', 'GATE 05'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 410,
  },
  {
    id: 'prov-openai',
    name: 'OpenAI Platform Enterprise',
    providerType: 'openai',
    model: 'gpt-4o-2024-11-20',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    latency: '205ms',
    assignedGates: ['GATE 03', 'GATE 04'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 620,
  },
  {
    id: 'prov-anthropic',
    name: 'Anthropic Claude Direct API',
    providerType: 'anthropic',
    model: 'claude-3-7-sonnet',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.anthropic.com/v1/messages',
    latency: '190ms',
    assignedGates: ['GATE 02', 'GATE 03', 'GATE 05'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 680,
  },
  {
    id: 'prov-groq',
    name: 'Groq Cloud LPU Engine',
    providerType: 'groq',
    model: 'llama-3.3-70b-versatile',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    latency: '38ms',
    assignedGates: ['GATE 01', 'GATE 04', 'GATE 05'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 130,
  },
  {
    id: 'prov-deepseek',
    name: 'DeepSeek AI (Coding & Reasoning V3/R1)',
    providerType: 'deepseek',
    model: 'deepseek-chat',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    latency: '145ms',
    assignedGates: ['GATE 03', 'GATE 04'],
    monthlyQuotaJod: 800,
    usedQuotaJod: 190,
  },
  {
    id: 'prov-mistral',
    name: 'Mistral AI & Codestral Engine',
    providerType: 'mistral',
    model: 'codestral-latest',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    latency: '132ms',
    assignedGates: ['GATE 03'],
    monthlyQuotaJod: 600,
    usedQuotaJod: 110,
  },
  {
    id: 'prov-xai',
    name: 'xAI Grok Platform',
    providerType: 'xai',
    model: 'grok-3',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.x.ai/v1/chat/completions',
    latency: '150ms',
    assignedGates: ['GATE 01', 'GATE 04'],
    monthlyQuotaJod: 700,
    usedQuotaJod: 95,
  },
  {
    id: 'prov-openrouter',
    name: 'OpenRouter Universal Gateway (All Models)',
    providerType: 'openrouter',
    model: 'openrouter/auto',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    latency: '160ms',
    assignedGates: ['GATE 01', 'GATE 02', 'GATE 03', 'GATE 04', 'GATE 05'],
    monthlyQuotaJod: 1000,
    usedQuotaJod: 210,
  },
];

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    gate: 1,
    gateCode: 'GATE 01',
    title: 'وكيل المتطلبات وتحليل الأعمال (Requirements Agent)',
    roleEn: 'Lead Product Manager & PRD Architect',
    desc: 'تحليل أفكار وتطلعات العميل وصياغة وثيقة المتطلبات التشغيلية (PRD) وقصص المستخدمين وهيكلة البيانات.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.6,
    maxTokens: 4096,
    enabled: true,
    systemPrompt:
      'أنت وكيل متطلبات المنتج (Gate 1 Requirements Agent) في مصنع OGroup AI Factory. مهمتك تحليل فكرة العميل وصياغة وثيقة متطلبات منتج (PRD) احترافية ومفصلة باللغة العربية مع تحديد الميزات الأساسية، الأدوار، وتدفق المستخدم.',
  },
  {
    gate: 2,
    gateCode: 'GATE 02',
    title: 'وكيل التصميم وتجربة المستخدم (UI/UX Design Agent)',
    roleEn: 'UI/UX & Design System Architect',
    desc: 'تحويل وثيقة الـ PRD المعتمدة إلى مواصفات تصميم وشاشات واجهات عصرية متجاوبة تدعم العربية (RTL) بنظام Tailwind CSS.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.6,
    maxTokens: 4096,
    enabled: true,
    systemPrompt:
      'أنت وكيل التصميم والواجهات (Gate 2 Design Agent) في مصنع OGroup AI Factory. مهمتك تحويل وثيقة المتطلبات المعتمدة إلى تصميم واجهات تفاعلي ونظام ألوان وتخطيط شاشات متجاوب يدعم العربية (RTL) باستخدام Tailwind CSS.',
  },
  {
    gate: 3,
    gateCode: 'GATE 03',
    title: 'وكيل البرمجة وبناء الأنظمة (Full-Stack Coding Agent)',
    roleEn: 'Principal Full-Stack Architect & Code Generator',
    desc: 'كتابة الشيفرة البرمجية الكاملة للواجهات الأمامية والخلفية وقواعد البيانات مع ربط واجهات البرمجة.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.4,
    maxTokens: 8192,
    enabled: true,
    systemPrompt:
      'أنت وكيل البرمجة وتوليد الكود (Gate 3 Development Agent) في مصنع OGroup AI Factory. مهمتك كتابة أكواد React و TypeScript و Node.js نظيفة وقابلة للتشغيل الفوري بناءً على المتطلبات والتصاميم المعتمدة.',
  },
  {
    gate: 4,
    gateCode: 'GATE 04',
    title: 'وكيل فحص الجودة والأمان (QA & Security Auditor)',
    roleEn: 'Automated QA & Cybersecurity Lead',
    desc: 'إجراء اختبارات القبول، فحص الثغرات الأمنية (OWASP)، والتحقق من سلامة البناء والأداء.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.3,
    maxTokens: 4096,
    enabled: true,
    systemPrompt:
      'أنت وكيل ضمان الجودة والأمن السيبراني (Gate 4 QA Agent) في مصنع OGroup AI Factory. مهمتك مراجعة الكود، التحقق من عدم وجود ثغرات أمنية، وتقديم تقرير فحص جودة شامل للعميل.',
  },
  {
    gate: 5,
    gateCode: 'GATE 05',
    title: 'وكيل التسليم والإطلاق السحابي (Release & DevOps Agent)',
    roleEn: 'Cloud DevOps & Release Director',
    desc: 'تجميع حزمة الإنتاج النهائية، إعداد حاويات Docker، وتجهيز دليل التشغيل والتسليم للعميل.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.5,
    maxTokens: 4096,
    enabled: true,
    systemPrompt:
      'أنت وكيل التسليم والتشغيل النهائي (Gate 5 Delivery Agent) في مصنع OGroup AI Factory. مهمتك مساعدة العميل في استلام الحزمة البرمجية الكاملة، شرح خطوات النشر عبر Docker والسحابة، وضمان جاهزية الإنتاج.',
  },
];

function normalizeProviders(list: any[], previousProviders: ProviderConfig[] = DEFAULT_PROVIDERS): ProviderConfig[] {
  if (!Array.isArray(list) || list.length === 0) return previousProviders;
  const savedMap = new Map(list.filter(Boolean).map((p) => [p.id, p]));
  const prevMap = new Map(previousProviders.map((p) => [p.id, p]));

  const mergedDefaults = DEFAULT_PROVIDERS.map((def) => {
    const saved = savedMap.get(def.id);
    const prev = prevMap.get(def.id) || def;
    if (!saved) return prev;
    const providerType = inferProviderType({ ...def, ...prev, ...saved });
    const incomingKey = typeof saved.apiKey === 'string' ? saved.apiKey.trim() : '';
    const resolvedKey =
      saved.clearApiKey === true
        ? ''
        : incomingKey
        ? incomingKey
        : prev.apiKey || def.apiKey;

    return {
      ...def,
      ...prev,
      ...saved,
      providerType,
      apiKey: resolvedKey,
      endpoint: saved.endpoint !== undefined ? saved.endpoint : prev.endpoint || def.endpoint,
      model: saved.model && String(saved.model).trim() ? String(saved.model).trim() : prev.model || def.model,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : prev.enabled,
    };
  });

  const customAdded = list
    .filter((p) => p && p.id && !DEFAULT_PROVIDERS.some((def) => def.id === p.id))
    .map((p) => {
      const prev = prevMap.get(p.id);
      const incomingKey = typeof p.apiKey === 'string' ? p.apiKey.trim() : '';
      return {
        ...prev,
        ...p,
        providerType: inferProviderType({ ...prev, ...p }),
        model: p.model && String(p.model).trim() ? String(p.model).trim() : prev?.model || 'custom-model',
        endpoint: p.endpoint !== undefined ? p.endpoint : prev?.endpoint || '',
        apiKey: p.clearApiKey === true ? '' : incomingKey || prev?.apiKey || '',
        enabled: typeof p.enabled === 'boolean' ? p.enabled : prev?.enabled ?? true,
        useSystemEnv: typeof p.useSystemEnv === 'boolean' ? p.useSystemEnv : prev?.useSystemEnv ?? false,
      };
    });

  return [...mergedDefaults, ...customAdded];
}

function normalizeAgents(
  list: any[],
  providers: ProviderConfig[],
  previousAgents: AgentConfig[] = DEFAULT_AGENTS
): AgentConfig[] {
  if (!Array.isArray(list) || list.length === 0) return previousAgents;
  const savedMap = new Map(list.filter(Boolean).map((a) => [Number(a.gate), a]));
  const prevMap = new Map(previousAgents.map((a) => [Number(a.gate), a]));

  return DEFAULT_AGENTS.map((def) => {
    const saved = savedMap.get(def.gate);
    const prev = prevMap.get(def.gate) || def;
    if (!saved) return prev;

    const targetProviderId = saved.providerId || prev.providerId || def.providerId;
    const linkedProv =
      providers.find((p) => p.id === targetProviderId) ||
      providers.find((p) => p.id === def.providerId) ||
      providers[0];

    const resolvedModel =
      saved.model && String(saved.model).trim()
        ? String(saved.model).trim()
        : linkedProv?.model || prev.model || def.model;

    const incomingKey = typeof saved.apiKey === 'string' ? saved.apiKey.trim() : '';
    const resolvedKey =
      saved.clearApiKey === true ? '' : incomingKey || prev.apiKey || def.apiKey;

    return {
      ...def,
      ...prev,
      ...saved,
      gate: def.gate,
      gateCode: def.gateCode,
      providerId: linkedProv ? linkedProv.id : targetProviderId,
      providerName: linkedProv ? linkedProv.name : saved.providerName || prev.providerName || def.providerName,
      model: resolvedModel,
      apiKey: resolvedKey,
      useProviderKey:
        typeof saved.useProviderKey === 'boolean' ? saved.useProviderKey : prev.useProviderKey ?? true,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : prev.enabled ?? true,
      systemPrompt: saved.systemPrompt || prev.systemPrompt || def.systemPrompt,
      temperature: typeof saved.temperature === 'number' ? saved.temperature : prev.temperature ?? def.temperature,
      maxTokens: typeof saved.maxTokens === 'number' ? saved.maxTokens : prev.maxTokens ?? def.maxTokens,
    };
  });
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.ai-factory-config.json');

function loadPersistedConfig(storage: FactoryStorage): { providers: ProviderConfig[]; agents: AgentConfig[] } {
  const fromDb = storage.loadAdminConfig();
  if (fromDb && (fromDb.providers.length > 0 || fromDb.agents.length > 0)) {
    const providers = normalizeProviders(fromDb.providers);
    const agents = normalizeAgents(fromDb.agents, providers);
    return { providers, agents };
  }
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
      if (
        (Array.isArray(raw.providers) && raw.providers.length > 0) ||
        (Array.isArray(raw.agents) && raw.agents.length > 0)
      ) {
        const providers = normalizeProviders(raw.providers);
        const agents = normalizeAgents(raw.agents, providers);
        storage.saveAdminConfig(providers, agents);
        return { providers, agents };
      }
    }
  } catch (err) {
    console.warn('Failed to load persisted AI config:', err);
  }
  return { providers: DEFAULT_PROVIDERS, agents: DEFAULT_AGENTS };
}

function savePersistedConfig(
  storage: FactoryStorage,
  providers: ProviderConfig[],
  agents: AgentConfig[],
  isolateConfig?: boolean
) {
  storage.saveAdminConfig(providers, agents);
  if (!isolateConfig) {
    try {
      const sanitizedProviders = providers.map((p) => ({ ...p, apiKey: '' }));
      const sanitizedAgents = agents.map((a) => ({ ...a, apiKey: '' }));
      fs.writeFileSync(
        CONFIG_FILE_PATH,
        JSON.stringify({ providers: sanitizedProviders, agents: sanitizedAgents }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.warn('Failed to save persisted AI config file:', err);
    }
  }
}

export interface CreateAppOptions {
  dbPath?: string;
  encryptionSecret?: string;
  fetchImpl?: ProviderHttpClient;
  managedGeminiApiKey?: string;
  isolateConfig?: boolean;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const storage = new FactoryStorage(options.dbPath, options.encryptionSecret);
  const systemEnvKey =
    options.managedGeminiApiKey !== undefined
      ? options.managedGeminiApiKey
      : process.env.GEMINI_API_KEY || '';

  const initialConfig = options.isolateConfig
    ? {
        providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
        agents: DEFAULT_AGENTS.map((a) => ({ ...a })),
      }
    : loadPersistedConfig(storage);
  let providersConfig: ProviderConfig[] = initialConfig.providers;
  let agentsConfig: AgentConfig[] = initialConfig.agents;

  // Authentication middleware
  const requireAuth = (req: Request & { user?: UserRecord }, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const headerToken =
      typeof req.headers['x-session-token'] === 'string' ? req.headers['x-session-token'].trim() : '';
    const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    const token = bearerToken || headerToken || queryToken;

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح. يرجى تسجيل الدخول أولاً (Authentication Required).' });
    }

    const user = storage.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ error: 'جلسة الدخول غير صالحة أو منتهية الصلاحية.' });
    }

    req.user = user;
    next();
  };

  function getGateAIConnectionSummary(projectId: string, userId: string, gate: number) {
    const project = storage.getProjectById(projectId);
    if (!project) return null;
    if (project.mode === 'byok') {
      const conn = storage.getDecryptedAIConnectionForUser(userId, project.selectedConnectionId, gate);
      return conn
        ? { mode: 'byok', provider: conn.provider, model: conn.model, hasKey: Boolean(conn.apiKey) }
        : { mode: 'byok', provider: 'unconfigured', model: 'unconfigured', hasKey: false };
    }
    const resolved = resolveAdminTargetCredentials({
      gate,
      providers: providersConfig,
      agents: agentsConfig,
      managedGeminiApiKey: systemEnvKey,
    });
    return {
      mode: 'managed',
      provider: resolved.providerType,
      providerName: resolved.providerName,
      model: resolved.configuredModel,
      hasKey: Boolean(resolved.apiKey),
    };
  }

  // =========================================================================
  // AUTHENTICATION & ENTITLEMENTS ENDPOINTS
  // =========================================================================

  app.post('/api/auth/session', (req, res) => {
    try {
      const { email, name, defaultCredits, defaultSubscription } = req.body || {};
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'البريد الإلكتروني مطلوب.' });
      }
      const user = storage.upsertUserByEmail({
        email: email.trim(),
        name: typeof name === 'string' ? name : undefined,
        defaultCredits: typeof defaultCredits === 'number' ? defaultCredits : 4,
        defaultSubscription: typeof defaultSubscription === 'boolean' ? defaultSubscription : false,
      });
      const token = storage.createSession(user.id);
      const connections = storage.getUserAIConnections(user.id);
      const projects = storage.getProjectsByOwner(user.id);

      return res.json({
        token,
        user,
        connections,
        projects,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل تسجيل الدخول.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const user = req.user!;
    const connections = storage.getUserAIConnections(user.id);
    const projects = storage.getProjectsByOwner(user.id);
    return res.json({ user, connections, projects });
  });

  app.post('/api/entitlements', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    try {
      const { addProjectCredits, projectCredits, subscriptionActive } = req.body || {};
      const updatedUser = storage.updateUserEntitlements(req.user!.id, {
        addProjectCredits: typeof addProjectCredits === 'number' ? addProjectCredits : undefined,
        projectCredits: typeof projectCredits === 'number' ? projectCredits : undefined,
        subscriptionActive: typeof subscriptionActive === 'boolean' ? subscriptionActive : undefined,
      });
      return res.json({ user: updatedUser });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل تحديث الباقة.' });
    }
  });

  // =========================================================================
  // CUSTOMER ENCRYPTED BYOK AI CONNECTIONS ENDPOINTS
  // =========================================================================

  app.get('/api/ai-connections', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const connections = storage.getUserAIConnections(req.user!.id);
    return res.json({ connections });
  });

  app.post('/api/ai-connections', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    try {
      const { provider, model, apiKey, endpoint, active, assignedGate } = req.body || {};
      if (!provider || !model) {
        return res.status(400).json({ error: 'يجب تحديد المزود (provider) والنموذج (model).' });
      }
      const saved = storage.saveAIConnection({
        userId: req.user!.id,
        provider: String(provider),
        model: String(model),
        apiKey: typeof apiKey === 'string' ? apiKey : '',
        endpoint: typeof endpoint === 'string' ? endpoint : '',
        active: typeof active === 'boolean' ? active : true,
        assignedGate: typeof assignedGate === 'number' ? assignedGate : null,
      });
      return res.json({
        connection: saved,
        connections: storage.getUserAIConnections(req.user!.id),
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل حفظ إعدادات مزود الذكاء الاصطناعي.' });
    }
  });

  // =========================================================================
  // PROJECT ENDPOINTS
  // =========================================================================

  app.post('/api/projects', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    try {
      const { name, description, mode, selectedConnectionId } = req.body || {};
      const project = storage.createProject({
        ownerId: req.user!.id,
        name: String(name || ''),
        description: String(description || ''),
        mode: mode === 'byok' ? 'byok' : 'managed',
        selectedConnectionId: selectedConnectionId || null,
      });
      const gate1 = storage.getGate1State(project.id);
      const updatedUser = storage.getUserById(req.user!.id);
      return res.status(201).json({
        project,
        gate1,
        user: updatedUser,
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل إنشاء المشروع.' });
    }
  });

  app.get('/api/projects', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const projects = storage.getProjectsByOwner(req.user!.id);
    return res.json({ projects });
  });

  app.get('/api/projects/:id', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
    }
    const gate1State = storage.getGate1State(project.id);
    const gate2State = storage.getGate2State(project.id);
    const gate3State = storage.getGate3State(project.id);
    const gate4State = storage.getGate4State(project.id);
    const gate5State = storage.getGate5State(project.id);

    const gate1ApprovedArtifact = storage.getGate1ApprovedArtifact(project.id);
    const gate2ApprovedArtifact = storage.getGate2ApprovedArtifact(project.id);
    const gate3ApprovedArtifact = storage.getGate3ApprovedArtifact(project.id);
    const gate4ApprovedArtifact = storage.getGate4ApprovedArtifact(project.id);
    const gate5ApprovedArtifact = storage.getGate5ApprovedArtifact(project.id);

    const wrapGateState = <T extends Record<string, any>>(state: {
      gate: number;
      version: number;
      locked: boolean;
      updatedAt: string | null;
      artifact: T | null;
      chatHistory: any[];
      approval: any;
    } | null) => {
      if (!state) return null;
      return {
        ...state,
        artifact: state.artifact
          ? {
              ...state.artifact,
              artifact: state.artifact,
              version: state.version,
              locked: state.locked,
            }
          : null,
      };
    };

    const approvals = [
      {
        gateNumber: 1,
        approved: Boolean(gate1State?.approval?.approved),
        approvedVersion: gate1State?.approval?.approvedVersion || null,
        approvedAt: gate1State?.approval?.approvedAt || null,
      },
      {
        gateNumber: 2,
        approved: Boolean(gate2State?.approval?.approved),
        approvedVersion: gate2State?.approval?.approvedVersion || null,
        approvedAt: gate2State?.approval?.approvedAt || null,
      },
      {
        gateNumber: 3,
        approved: Boolean(gate3State?.approval?.approved),
        approvedVersion: gate3State?.approval?.approvedVersion || null,
        approvedAt: gate3State?.approval?.approvedAt || null,
      },
      {
        gateNumber: 4,
        approved: Boolean(gate4State?.approval?.approved),
        approvedVersion: gate4State?.approval?.approvedVersion || null,
        approvedAt: gate4State?.approval?.approvedAt || null,
      },
      {
        gateNumber: 5,
        approved: Boolean(gate5State?.approval?.approved),
        approvedVersion: gate5State?.approval?.approvedVersion || null,
        approvedAt: gate5State?.approval?.approvedAt || null,
      },
    ];

    return res.json({
      project,
      gate1ApprovedArtifact,
      gate2ApprovedArtifact,
      gate3ApprovedArtifact,
      gate4ApprovedArtifact,
      gate5ApprovedArtifact,
      gates: {
        1: gate1State,
        2: wrapGateState(gate2State),
        3: wrapGateState(gate3State),
        4: wrapGateState(gate4State),
        5: wrapGateState(gate5State),
      },
      approvals,
    });
  });

  // =========================================================================
  // GATE 1 SPECIFIC ENDPOINTS (PRESERVED FOR BACKWARD COMPATIBILITY)
  // =========================================================================

  app.get('/api/projects/:id/gates/1/approved-artifact', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى مخرجات هذا المشروع.' });
    }

    const artifact = storage.getGate1ApprovedArtifact(project.id);
    if (!artifact) {
      return res.status(404).json({
        error: 'لم يتم اعتماد وثيقة المتطلبات في البوابة الأولى بعد. يجب اعتماد البوابة الأولى أولاً.',
      });
    }

    return res.json({ artifact });
  });

  // Handler shared by POST /api/projects/:id/gates/1/chat and POST /api/projects/:id/gates/1/run
  async function handleGate1Execution(req: Request & { user?: UserRecord }, res: Response) {
    let runId = '';
    const startTime = Date.now();
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
      }

      const { message, instructions, expectedVersion } = req.body || {};
      const userMessage = typeof message === 'string' && message.trim()
        ? message.trim()
        : typeof instructions === 'string' && instructions.trim()
        ? instructions.trim()
        : '';

      if (!userMessage) {
        return res.status(400).json({ error: 'الرسالة مطلوبة ولا يمكن أن تكون فارغة.' });
      }

      const gate1State = storage.getGate1State(project.id);
      if (!gate1State) {
        return res.status(404).json({ error: 'وثيقة المتطلبات غير موجودة.' });
      }
      if (gate1State.locked) {
        return res.status(409).json({
          error: 'تم اعتماد وقفل وثيقة المتطلبات للبوابة الأولى ولا يمكن تعديلها.',
        });
      }
      if (typeof expectedVersion === 'number' && expectedVersion !== gate1State.version) {
        return res.status(409).json({
          error: `تعارض في إصدار الوثيقة (النسخة المحفوظة v${gate1State.version} مقابل v${expectedVersion}).`,
        });
      }

      const target = resolveProjectGateCredentials({
        storage,
        projectId: project.id,
        userId: req.user!.id,
        gate: 1,
        providers: providersConfig,
        agents: agentsConfig,
        managedGeminiApiKey: systemEnvKey,
      });

      const run = storage.startGateRun({
        projectId: project.id,
        gate: 1,
        userId: req.user!.id,
        provider: target.providerType,
        configuredModel: target.configuredModel,
        inputVersion: gate1State.version,
      });
      runId = run.runId;

      const executionResult = await executeRequirementsAgent(
        {
          provider: target.providerType,
          model: target.configuredModel,
          apiKey: target.apiKey,
          endpoint: target.endpoint,
          userMessage,
          currentDocument: gate1State.document,
          chatHistory: gate1State.chatHistory.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        },
        { fetchImpl: options.fetchImpl }
      );

      const savedTurn = storage.recordGate1AIChatTurn({
        projectId: project.id,
        userId: req.user!.id,
        userMessage,
        aiReply: executionResult.reply,
        updatedDocument: executionResult.updatedDocument,
        provider: executionResult.providerUsed,
        model: executionResult.modelUsed,
        usage: executionResult.usage ? (executionResult.usage as Record<string, unknown>) : null,
        expectedVersion: gate1State.version,
      });

      const completedRun = storage.completeGateRun({
        runId,
        status: 'succeeded',
        executedModel: executionResult.modelUsed,
        outputVersion: savedTurn.version,
        latencyMs: Date.now() - startTime,
        usage: executionResult.usage ? (executionResult.usage as Record<string, unknown>) : null,
        logs: [`[Gate 1] Updated PRD to v${savedTurn.version} using ${executionResult.providerUsed}/${executionResult.modelUsed}`],
      });

      return res.json({
        runId,
        run: completedRun,
        reply: executionResult.reply,
        document: savedTurn.document,
        artifact: savedTurn.document,
        markdown: savedTurn.markdown,
        version: savedTurn.version,
        provider: executionResult.providerUsed,
        model: executionResult.modelUsed,
        status: 'succeeded',
        usage: executionResult.usage,
        userMessage: savedTurn.userMessageRecord,
        aiMessage: savedTurn.aiMessageRecord,
      });
    } catch (err: any) {
      if (runId) {
        storage.completeGateRun({
          runId,
          status: 'failed',
          latencyMs: Date.now() - startTime,
          errorType: err.errorType || 'execution_error',
          errorMessage: redactSecrets(err.message || 'Failed'),
          logs: [`[ERROR] ${redactSecrets(err.message || 'Execution failed')}`],
        });
      }
      const status = err.statusCode || 500;
      return res.status(status).json({
        runId: runId || undefined,
        error: redactSecrets(err.message || 'فشل تنفيذ طلب وكيل المتطلبات.'),
        status: 'failed',
      });
    }
  }

  app.post('/api/projects/:id/gates/1/chat', requireAuth, handleGate1Execution);

  function handleGate1ManualUpdate(req: Request & { user?: UserRecord }, res: Response) {
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بتعديل وثيقة هذا المشروع.' });
      }

      const currentState = storage.getGate1State(project.id);
      if (!currentState) {
        return res.status(404).json({ error: 'وثيقة المتطلبات غير موجودة.' });
      }

      const { document, artifact, markdown, expectedVersion } = req.body || {};
      const docPayload = document || artifact;
      let targetDoc: RequirementsDocument;

      if (docPayload && typeof docPayload === 'object') {
        const merged = {
          ...currentState.document,
          ...docPayload,
        };
        const validation = validateRequirementsDocument(merged);
        if (!validation.valid || !validation.document) {
          return res.status(400).json({
            error: `فشل التحقق من الوثيقة: ${validation.errors.join(' | ')}`,
            errors: validation.errors,
          });
        }
        targetDoc = validation.document;
      } else if (typeof markdown === 'string') {
        if (!markdown.trim()) {
          return res.status(400).json({ error: 'محتوى الوثيقة لا يمكن أن يكون فارغاً.' });
        }
        const parsed = parseMarkdownToRequirements(markdown, currentState.document);
        const validation = validateRequirementsDocument(parsed);
        if (!validation.valid || !validation.document) {
          return res.status(400).json({
            error: `فشل التحقق من الوثيقة: ${validation.errors.join(' | ')}`,
            errors: validation.errors,
          });
        }
        targetDoc = validation.document;
      } else {
        return res.status(400).json({ error: 'يرجى إرسال الوثيقة المهيكلة (document) أو النص (markdown).' });
      }

      const saved = storage.updateGate1DocumentManual({
        projectId: project.id,
        userId: req.user!.id,
        document: targetDoc,
        expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
      });

      return res.json({
        document: saved.document,
        artifact: saved.document,
        markdown: saved.markdown,
        version: saved.version,
        updatedAt: saved.updatedAt,
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل حفظ التعديلات اليدوية.' });
    }
  }

  app.put('/api/projects/:id/gates/1/document', requireAuth, handleGate1ManualUpdate);

  // =========================================================================
  // UNIFIED 5-GATE WORKFLOW ENDPOINTS (SECTION 12)
  // =========================================================================

  // GET /api/projects/:id/gates/:gate
  app.get('/api/projects/:id/gates/:gate', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
    }

    const gateNum = Number(req.params.gate);
    const aiConnection = getGateAIConnectionSummary(project.id, req.user!.id, gateNum);

    if (gateNum === 1) {
      const state = storage.getGate1State(project.id);
      if (!state) return res.status(404).json({ error: 'بيانات البوابة الأولى غير موجودة.' });
      return res.json({ ...state, aiConnection });
    }
    if (gateNum === 2) {
      const state = storage.getGate2State(project.id);
      return res.json({ ...state, aiConnection });
    }
    if (gateNum === 3) {
      const state = storage.getGate3State(project.id);
      return res.json({ ...state, aiConnection });
    }
    if (gateNum === 4) {
      const state = storage.getGate4State(project.id);
      return res.json({ ...state, aiConnection });
    }
    if (gateNum === 5) {
      const state = storage.getGate5State(project.id);
      return res.json({ ...state, aiConnection });
    }

    return res.status(400).json({ error: 'رقم البوابة غير صالح (1-5).' });
  });

  // GET /api/projects/:id/gates/:gate/runs/:runId
  app.get('/api/projects/:id/gates/:gate/runs/:runId', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
    }
    const run = storage.getGateRun(project.id, Number(req.params.gate), req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'سجل التشغيل غير موجود.' });
    }
    return res.json({ run });
  });

  // Handler shared by POST /api/projects/:id/gates/:gate/run and POST /api/projects/:id/gates/:gate/generate
  async function handleGateExecution(req: Request & { user?: UserRecord }, res: Response) {
    const gateNum = Number(req.params.gate);
    if (gateNum === 1) {
      return handleGate1Execution(req, res);
    }

    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
    }

    let runId = '';
    const startTime = Date.now();

    try {
      const { prompt, message, instructions, stackPreference, maxRepairAttempts, expectedVersion } =
        req.body || {};
      const userPrompt =
        typeof prompt === 'string' && prompt.trim()
          ? prompt.trim()
          : typeof message === 'string' && message.trim()
          ? message.trim()
          : typeof instructions === 'string' && instructions.trim()
          ? instructions.trim()
          : '';

      // GATE 2: DESIGN GENERATION
      if (gateNum === 2) {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        if (!approvedPrd) {
          return res.status(409).json({
            error: 'لا يمكن تشغيل وكيل التصميم (Gate 2) قبل اعتماد وثيقة المتطلبات في البوابة الأولى (Gate 1).',
          });
        }

        const gate2State = storage.getGate2State(project.id)!;
        const target = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 2,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const run = storage.startGateRun({
          projectId: project.id,
          gate: 2,
          userId: req.user!.id,
          provider: target.providerType,
          configuredModel: target.configuredModel,
          inputVersion: approvedPrd.approvedVersion,
        });
        runId = run.runId;

        const designResult = await executeDesignAgent(
          {
            provider: target.providerType,
            model: target.configuredModel,
            apiKey: target.apiKey,
            endpoint: target.endpoint,
            systemPrompt: target.systemPrompt,
            temperature: target.temperature,
            maxTokens: target.maxTokens,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            currentDesign: gate2State.artifact,
            userInstructions: userPrompt || undefined,
            chatHistory: gate2State.chatHistory.map((m) => ({ sender: m.sender, text: m.text })),
          },
          { fetchImpl: options.fetchImpl }
        );

        const saved = storage.saveGate2DesignArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: designResult.designArtifact,
          source: 'ai',
          provider: designResult.providerUsed,
          model: designResult.modelUsed,
          usage: designResult.usage ? (designResult.usage as Record<string, unknown>) : null,
          userMessage: userPrompt || 'توليد التصميم المعماري والواجهات التفاعلية بناءً على الـ PRD المعتمد',
          aiReply: designResult.reply,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });

        const completedRun = storage.completeGateRun({
          runId,
          status: 'succeeded',
          executedModel: designResult.modelUsed,
          outputVersion: saved.version,
          latencyMs: Date.now() - startTime,
          usage: designResult.usage ? (designResult.usage as Record<string, unknown>) : null,
          logs: [
            `[Gate 2] Generated DesignArtifact v${saved.version} (${saved.artifact.screenInventory.length} screens, ${saved.artifact.uiFiles.length} UI files)`,
          ],
        });

        return res.json({
          runId,
          run: completedRun,
          status: 'succeeded',
          reply: designResult.reply,
          artifact: saved.artifact,
          version: saved.version,
          provider: designResult.providerUsed,
          model: designResult.modelUsed,
          usage: designResult.usage,
          userMessage: saved.chatTurn?.userMessageRecord,
          aiMessage: saved.chatTurn?.aiMessageRecord,
        });
      }

      // GATE 3: FULL-STACK SOFTWARE DEVELOPMENT
      if (gateNum === 3) {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
        if (!approvedPrd || !approvedDesign) {
          return res.status(409).json({
            error:
              'لا يمكن تشغيل وكيل البرمجة (Gate 3) قبل اعتماد المتطلبات (Gate 1) والتصميم (Gate 2).',
          });
        }

        const gate3State = storage.getGate3State(project.id)!;
        const target = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 3,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const nextVersion = gate3State.version + 1;
        const run = storage.startGateRun({
          projectId: project.id,
          gate: 3,
          userId: req.user!.id,
          provider: target.providerType,
          configuredModel: target.configuredModel,
          inputVersion: approvedDesign.approvedVersion,
        });
        runId = run.runId;

        const devResult = await executeDevelopmentAgent(
          {
            provider: target.providerType,
            model: target.configuredModel,
            apiKey: target.apiKey,
            endpoint: target.endpoint,
            systemPrompt: target.systemPrompt,
            temperature: target.temperature,
            maxTokens: target.maxTokens,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            approvedDesign: approvedDesign.artifact,
            approvedDesignVersion: approvedDesign.approvedVersion,
            currentCode: gate3State.artifact,
            nextVersion,
            stackPreference: typeof stackPreference === 'string' ? stackPreference : undefined,
            userInstructions: userPrompt || undefined,
            chatHistory: gate3State.chatHistory.map((m) => ({ sender: m.sender, text: m.text })),
          },
          { fetchImpl: options.fetchImpl }
        );

        const saved = storage.saveGate3CodeArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: devResult.codeArtifact,
          source: 'ai',
          provider: devResult.providerUsed,
          model: devResult.modelUsed,
          usage: devResult.usage ? (devResult.usage as Record<string, unknown>) : null,
          userMessage: userPrompt || 'توليد الشيفرة البرمجية الكاملة للمشروع بناءً على المتطلبات والتصميم المعتمدين',
          aiReply: devResult.reply,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });

        const completedRun = storage.completeGateRun({
          runId,
          status: 'succeeded',
          executedModel: devResult.modelUsed,
          outputVersion: saved.version,
          latencyMs: Date.now() - startTime,
          usage: devResult.usage ? (devResult.usage as Record<string, unknown>) : null,
          logs: [
            `[Gate 3] Generated CodeArtifact v${saved.version} (${saved.artifact.files.length} files)`,
          ],
        });

        return res.json({
          runId,
          run: completedRun,
          status: 'succeeded',
          reply: devResult.reply,
          artifact: saved.artifact,
          files: saved.artifact.files,
          version: saved.version,
          provider: devResult.providerUsed,
          model: devResult.modelUsed,
          usage: devResult.usage,
          userMessage: saved.chatTurn?.userMessageRecord,
          aiMessage: saved.chatTurn?.aiMessageRecord,
        });
      }

      // GATE 4: ISOLATED QA EXECUTION & REPAIR LOOP
      if (gateNum === 4) {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
        const approvedCode = storage.getGate3ApprovedArtifact(project.id);
        if (!approvedPrd || !approvedDesign || !approvedCode) {
          return res.status(409).json({
            error:
              'لا يمكن تشغيل فحص الجودة (Gate 4) قبل اعتماد الكود المصدري في البوابة الثالثة (Gate 3).',
          });
        }

        const qaTarget = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 4,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const devTarget = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 3,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const run = storage.startGateRun({
          projectId: project.id,
          gate: 4,
          userId: req.user!.id,
          provider: qaTarget.providerType,
          configuredModel: qaTarget.configuredModel,
          inputVersion: approvedCode.approvedVersion,
        });
        runId = run.runId;

        const qaResult = await executeGate4VerificationWithRepair(
          {
            qaProvider: qaTarget.providerType,
            qaModel: qaTarget.configuredModel,
            qaApiKey: qaTarget.apiKey,
            qaEndpoint: qaTarget.endpoint,
            qaSystemPrompt: qaTarget.systemPrompt,
            devProvider: devTarget.providerType,
            devModel: devTarget.configuredModel,
            devApiKey: devTarget.apiKey,
            devEndpoint: devTarget.endpoint,
            devSystemPrompt: devTarget.systemPrompt,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            approvedDesign: approvedDesign.artifact,
            approvedDesignVersion: approvedDesign.approvedVersion,
            initialCodeArtifact: approvedCode.artifact,
            maxRepairAttempts: typeof maxRepairAttempts === 'number' ? maxRepairAttempts : 0,
            userInstructions: userPrompt || undefined,
            onSaveRepairedCode: (repairedArtifact) => {
              const savedRepair = storage.saveGate3CodeArtifact({
                projectId: project.id,
                userId: req.user!.id,
                artifact: repairedArtifact,
                source: 'repair',
                provider: devTarget.providerType,
                model: devTarget.configuredModel,
                aiReply: `تم إصلاح أخطاء الكود تلقائياً بواسطة حلقة إصلاح الجودة (QA Repair Loop -> v${repairedArtifact.version}).`,
                keepGate3ApprovalUpdatedOnRepair: true,
              });
              return savedRepair.artifact;
            },
          },
          { fetchImpl: options.fetchImpl }
        );

        const savedQa = storage.saveGate4QAReport({
          projectId: project.id,
          userId: req.user!.id,
          report: qaResult.qaReport,
          provider: qaResult.providerUsed,
          model: qaResult.modelUsed,
          usage: qaResult.usage ? (qaResult.usage as Record<string, unknown>) : null,
          userMessage: userPrompt || 'تشغيل الفحص الشامل المعزول (Isolated QA Runner) والتحقق من البناء والأمان',
          aiReply: qaResult.qaReport.aiSummary,
        });

        const completedRun = storage.completeGateRun({
          runId,
          status: qaResult.qaReport.status === 'passed' ? 'succeeded' : 'failed',
          executedModel: qaResult.modelUsed,
          outputVersion: savedQa.version,
          latencyMs: Date.now() - startTime,
          usage: qaResult.usage ? (qaResult.usage as Record<string, unknown>) : null,
          logs: qaResult.qaReport.logs,
        });

        return res.json({
          runId,
          run: completedRun,
          status: qaResult.qaReport.status,
          reply: qaResult.qaReport.aiSummary,
          artifact: savedQa.report,
          qaReport: savedQa.report,
          finalCodeArtifact: qaResult.finalCodeArtifact,
          version: savedQa.version,
          provider: qaResult.providerUsed,
          model: qaResult.modelUsed,
          userMessage: savedQa.chatTurn?.userMessageRecord,
          aiMessage: savedQa.chatTurn?.aiMessageRecord,
        });
      }

      // GATE 5: DELIVERY PACKAGE GENERATION
      if (gateNum === 5) {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
        const approvedCode = storage.getGate3ApprovedArtifact(project.id);
        const approvedQa = storage.getGate4ApprovedArtifact(project.id);

        if (!approvedPrd || !approvedDesign || !approvedCode || !approvedQa) {
          return res.status(409).json({
            error:
              'لا يمكن تجميع حزمة التسليم النهائية (Gate 5) قبل اعتماد جميع البوابات السابقة (1 إلى 4).',
          });
        }

        const target = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 5,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const gate5State = storage.getGate5State(project.id)!;
        const nextVersion = gate5State.version + 1;

        const run = storage.startGateRun({
          projectId: project.id,
          gate: 5,
          userId: req.user!.id,
          provider: target.providerType,
          configuredModel: target.configuredModel,
          inputVersion: approvedQa.approvedVersion,
        });
        runId = run.runId;

        const deliveryResult = await buildProjectDeliveryPackage(
          {
            projectId: project.id,
            deliveryVersion: nextVersion,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            approvedDesign: approvedDesign.artifact,
            approvedDesignVersion: approvedDesign.approvedVersion,
            approvedCode: approvedCode.artifact,
            approvedCodeVersion: approvedCode.approvedVersion,
            approvedQa: approvedQa.artifact,
            approvedQaVersion: approvedQa.approvedVersion,
            provider: target.providerType,
            model: target.configuredModel,
            apiKey: target.apiKey,
            endpoint: target.endpoint,
            systemPrompt: target.systemPrompt,
            userInstructions: userPrompt || undefined,
          },
          { fetchImpl: options.fetchImpl }
        );

        const saved = storage.saveGate5DeliveryArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: deliveryResult.deliveryArtifact,
          provider: deliveryResult.providerUsed,
          model: deliveryResult.modelUsed,
          usage: deliveryResult.usage ? (deliveryResult.usage as Record<string, unknown>) : null,
          userMessage: userPrompt || 'تجهيز حزمة التسليم النهائية (ZIP) ودليل النشر السحابي',
          aiReply: deliveryResult.deliveryArtifact.releaseNotes,
        });

        const completedRun = storage.completeGateRun({
          runId,
          status: 'succeeded',
          executedModel: deliveryResult.modelUsed,
          outputVersion: saved.version,
          latencyMs: Date.now() - startTime,
          usage: deliveryResult.usage ? (deliveryResult.usage as Record<string, unknown>) : null,
          logs: [
            `[Gate 5] Packaged ${saved.artifact.fileName} (${saved.artifact.fileCount} files, ${deliveryResult.zipBuffer.length} bytes)`,
          ],
        });

        return res.json({
          runId,
          run: completedRun,
          status: 'succeeded',
          reply: saved.artifact.releaseNotes,
          artifact: saved.artifact,
          version: saved.version,
          provider: deliveryResult.providerUsed,
          model: deliveryResult.modelUsed,
          userMessage: saved.chatTurn?.userMessageRecord,
          aiMessage: saved.chatTurn?.aiMessageRecord,
        });
      }

      return res.status(400).json({ error: 'رقم البوابة غير صالح.' });
    } catch (err: any) {
      if (runId) {
        storage.completeGateRun({
          runId,
          status: 'failed',
          latencyMs: Date.now() - startTime,
          errorType: err.errorType || 'execution_error',
          errorMessage: redactSecrets(err.message || 'Execution failed'),
          logs: [`[ERROR] ${redactSecrets(err.message || 'Execution failed')}`],
        });
      }
      const status = err.statusCode || 500;
        return res.status(status).json({
          runId: runId || undefined,
          error: redactSecrets(err.message || `فشل تشغيل وكيل البوابة ${gateNum}.`),
          status: 'failed',
        });
      }
    }

  app.post('/api/projects/:id/gates/:gate/run', requireAuth, handleGateExecution);
  app.post('/api/projects/:id/gates/:gate/generate', requireAuth, handleGateExecution);

  // POST /api/projects/:id/gates/4/repair
  app.post(
    '/api/projects/:id/gates/4/repair',
    requireAuth,
    async (req: Request & { user?: UserRecord }, res) => {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
      }

      let runId = '';
      const startTime = Date.now();
      try {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
        const approvedCode = storage.getGate3ApprovedArtifact(project.id);
        if (!approvedPrd || !approvedDesign || !approvedCode) {
          return res.status(409).json({
            error: 'لا يمكن تشغيل الإصلاح التلقائي قبل اعتماد المتطلبات والتصميم والكود.',
          });
        }

        const qaTarget = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 4,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const devTarget = resolveProjectGateCredentials({
          storage,
          projectId: project.id,
          userId: req.user!.id,
          gate: 3,
          providers: providersConfig,
          agents: agentsConfig,
          managedGeminiApiKey: systemEnvKey,
        });

        const run = storage.startGateRun({
          projectId: project.id,
          gate: 4,
          userId: req.user!.id,
          provider: qaTarget.providerType,
          configuredModel: qaTarget.configuredModel,
          inputVersion: approvedCode.approvedVersion,
        });
        runId = run.runId;

        let latestCodeVersion = approvedCode.approvedVersion;
        const maxAttempts =
          typeof req.body?.maxRepairAttempts === 'number' ? req.body.maxRepairAttempts : 2;

        const qaResult = await executeGate4VerificationWithRepair(
          {
            qaProvider: qaTarget.providerType,
            qaModel: qaTarget.configuredModel,
            qaApiKey: qaTarget.apiKey,
            qaEndpoint: qaTarget.endpoint,
            qaSystemPrompt: qaTarget.systemPrompt,
            devProvider: devTarget.providerType,
            devModel: devTarget.configuredModel,
            devApiKey: devTarget.apiKey,
            devEndpoint: devTarget.endpoint,
            devSystemPrompt: devTarget.systemPrompt,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            approvedDesign: approvedDesign.artifact,
            approvedDesignVersion: approvedDesign.approvedVersion,
            initialCodeArtifact: approvedCode.artifact,
            maxRepairAttempts: maxAttempts,
            userInstructions: req.body?.prompt || req.body?.instructions || undefined,
            onSaveRepairedCode: (repairedArtifact) => {
              const savedRepair = storage.saveGate3CodeArtifact({
                projectId: project.id,
                userId: req.user!.id,
                artifact: repairedArtifact,
                source: 'repair',
                provider: devTarget.providerType,
                model: devTarget.configuredModel,
                aiReply: `تم إصلاح أخطاء الكود تلقائياً بواسطة حلقة إصلاح الجودة (QA Repair Loop -> v${repairedArtifact.version}).`,
                keepGate3ApprovalUpdatedOnRepair: true,
              });
              latestCodeVersion = savedRepair.version;
              return savedRepair.artifact;
            },
          },
          { fetchImpl: options.fetchImpl }
        );

        const savedQa = storage.saveGate4QAReport({
          projectId: project.id,
          userId: req.user!.id,
          report: qaResult.qaReport,
          provider: qaResult.providerUsed,
          model: qaResult.modelUsed,
          usage: qaResult.usage ? (qaResult.usage as Record<string, unknown>) : null,
          userMessage: 'تشغيل حلقة الإصلاح التلقائي (Gate 4 -> Gate 3 -> Gate 4)',
          aiReply: qaResult.qaReport.aiSummary,
        });

        const completedRun = storage.completeGateRun({
          runId,
          status: qaResult.qaReport.status === 'passed' ? 'succeeded' : 'failed',
          executedModel: qaResult.modelUsed,
          outputVersion: savedQa.version,
          latencyMs: Date.now() - startTime,
          usage: qaResult.usage ? (qaResult.usage as Record<string, unknown>) : null,
          logs: qaResult.qaReport.logs,
        });

        const updatedProject = storage.getProjectById(project.id);
        return res.json({
          runId,
          run: completedRun,
          status: qaResult.qaReport.status,
          reply: qaResult.qaReport.aiSummary,
          codeVersion: latestCodeVersion,
          qaVersion: savedQa.version,
          version: savedQa.version,
          codeArtifact: qaResult.finalCodeArtifact,
          finalCodeArtifact: qaResult.finalCodeArtifact,
          qaArtifact: savedQa.report,
          artifact: savedQa.report,
          qaReport: savedQa.report,
          project: updatedProject,
          userMessage: savedQa.chatTurn?.userMessageRecord,
          aiMessage: savedQa.chatTurn?.aiMessageRecord,
        });
      } catch (err: any) {
        if (runId) {
          storage.completeGateRun({
            runId,
            status: 'failed',
            latencyMs: Date.now() - startTime,
            errorType: err.errorType || 'repair_error',
            errorMessage: redactSecrets(err.message || 'Repair failed'),
            logs: [`[ERROR] ${redactSecrets(err.message || 'Repair failed')}`],
          });
        }
        const status = err.statusCode || 500;
        return res.status(status).json({
          error: redactSecrets(err.message || 'فشل تشغيل حلقة الإصلاح التلقائي.'),
        });
      }
    }
  );

  // PUT /api/projects/:id/gates/:gate/artifact & /files & /design
  function handleGateArtifactUpdate(req: Request & { user?: UserRecord }, res: Response) {
    const gateNum = Number(req.params.gate);
    if (gateNum === 1) {
      return handleGate1ManualUpdate(req, res);
    }

    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بتعديل مخرجات هذا المشروع.' });
      }

      const { artifact, files, fileUpdate, expectedVersion } = req.body || {};

      if (gateNum === 2) {
        const current = storage.getGate2State(project.id);
        if (!current || !current.artifact) {
          return res.status(404).json({ error: 'مخرجات التصميم غير موجودة لتعديلها.' });
        }
        const merged: DesignArtifact = {
          ...current.artifact,
          ...(artifact || {}),
        };
        const previewHtml = buildIsolatedDesignPreviewHtml(merged);
        merged.previewMetadata = {
          ...merged.previewMetadata,
          isolatedPreviewHtml: previewHtml,
        };
        const saved = storage.saveGate2DesignArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: merged,
          source: 'manual',
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });
        return res.json({
          artifact: saved.artifact,
          version: saved.version,
          updatedAt: saved.updatedAt,
          project: storage.getProjectById(project.id),
        });
      }

      if (gateNum === 3) {
        const current = storage.getGate3State(project.id);
        if (!current || !current.artifact) {
          return res.status(404).json({ error: 'مخرجات الكود غير موجودة لتعديلها.' });
        }

        let updatedFiles: GeneratedProjectFile[] = [...current.artifact.files];
        if (fileUpdate && typeof fileUpdate === 'object' && fileUpdate.path) {
          const check = validateRelativeFilePath(fileUpdate.path);
          if (!check.valid || !check.normalizedPath) {
            return res.status(400).json({ error: check.error || 'مسار الملف غير صالح.' });
          }
          const normPath = check.normalizedPath;
          const idx = updatedFiles.findIndex((f) => f.path === normPath);
          const entry: GeneratedProjectFile = {
            path: normPath,
            content: String(fileUpdate.content ?? ''),
            fileType: fileUpdate.fileType || inferFileType(normPath),
            version: current.version + 1,
            description: fileUpdate.description,
          };
          if (idx >= 0) {
            updatedFiles[idx] = entry;
          } else {
            updatedFiles.push(entry);
          }
        } else if (Array.isArray(files)) {
          updatedFiles = files;
        } else if (artifact && Array.isArray(artifact.files)) {
          updatedFiles = artifact.files;
        }

        const updatedArtifact: CodeArtifact = {
          ...current.artifact,
          ...(artifact || {}),
          files: updatedFiles,
        };

        const saved = storage.saveGate3CodeArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: updatedArtifact,
          source: 'manual',
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });

        return res.json({
          artifact: saved.artifact,
          files: saved.artifact.files,
          version: saved.version,
          updatedAt: saved.updatedAt,
          project: storage.getProjectById(project.id),
        });
      }

      return res.status(400).json({ error: 'التعديل اليدوي غير مدعوم لهذه البوابة.' });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل حفظ التعديلات.' });
    }
  }

  app.put('/api/projects/:id/gates/:gate/artifact', requireAuth, handleGateArtifactUpdate);
  app.put('/api/projects/:id/gates/:gate/files', requireAuth, handleGateArtifactUpdate);
  app.put('/api/projects/:id/gates/:gate/design', requireAuth, handleGateArtifactUpdate);

  // POST /api/projects/:id/gates/:gate/approve
  app.post('/api/projects/:id/gates/:gate/approve', requireAuth, async (req: Request & { user?: UserRecord }, res) => {
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك باعتماد هذا المشروع.' });
      }

      const gateNum = Number(req.params.gate);
      const { document, markdown, expectedVersion } = req.body || {};

      if (gateNum === 1) {
        const currentState = storage.getGate1State(project.id);
        if (!currentState) {
          return res.status(404).json({ error: 'وثيقة المتطلبات غير موجودة.' });
        }
        let finalDocument: RequirementsDocument | undefined;
        if (document && typeof document === 'object') {
          const validation = validateRequirementsDocument(document, { strictForApproval: true });
          if (!validation.valid || !validation.document) {
            return res.status(400).json({
              error: `لا يمكن الاعتماد: ${validation.errors.join(' | ')}`,
              errors: validation.errors,
            });
          }
          finalDocument = validation.document;
        } else if (typeof markdown === 'string' && markdown.trim()) {
          const parsed = parseMarkdownToRequirements(markdown, currentState.document);
          const validation = validateRequirementsDocument(parsed, { strictForApproval: true });
          if (!validation.valid || !validation.document) {
            return res.status(400).json({
              error: `لا يمكن الاعتماد: ${validation.errors.join(' | ')}`,
              errors: validation.errors,
            });
          }
          finalDocument = validation.document;
        }

        const approval = storage.approveGate1({
          projectId: project.id,
          userId: req.user!.id,
          finalDocument,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });
        const updatedProject = storage.getProjectById(project.id)!;
        return res.json({ approval, project: updatedProject });
      }

      if (gateNum === 2) {
        const approval = storage.approveGate2({
          projectId: project.id,
          userId: req.user!.id,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });
        const updatedProject = storage.getProjectById(project.id)!;
        return res.json({ approval, project: updatedProject });
      }

      if (gateNum === 3) {
        const approval = storage.approveGate3({
          projectId: project.id,
          userId: req.user!.id,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });
        const updatedProject = storage.getProjectById(project.id)!;
        return res.json({ approval, project: updatedProject });
      }

      if (gateNum === 4) {
        const approval = storage.approveGate4({
          projectId: project.id,
          userId: req.user!.id,
          expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined,
        });
        const updatedProject = storage.getProjectById(project.id)!;
        return res.json({ approval, project: updatedProject });
      }

      if (gateNum === 5) {
        const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
        const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
        const approvedCode = storage.getGate3ApprovedArtifact(project.id);
        const approvedQa = storage.getGate4ApprovedArtifact(project.id);
        if (!approvedPrd || !approvedDesign || !approvedCode || !approvedQa) {
          return res.status(409).json({
            error: 'لا يمكن اعتماد التسليم النهائي قبل اعتماد البوابات 1 إلى 4.',
          });
        }

        let gate5State = storage.getGate5State(project.id)!;
        let deliveryArtifact = gate5State.artifact;
        if (!deliveryArtifact) {
          const built = await buildProjectDeliveryPackage({
            projectId: project.id,
            deliveryVersion: 1,
            approvedPrd: approvedPrd.document,
            approvedPrdVersion: approvedPrd.approvedVersion,
            approvedDesign: approvedDesign.artifact,
            approvedDesignVersion: approvedDesign.approvedVersion,
            approvedCode: approvedCode.artifact,
            approvedCodeVersion: approvedCode.approvedVersion,
            approvedQa: approvedQa.artifact,
            approvedQaVersion: approvedQa.approvedVersion,
          });
          const saved = storage.saveGate5DeliveryArtifact({
            projectId: project.id,
            userId: req.user!.id,
            artifact: built.deliveryArtifact,
          });
          deliveryArtifact = saved.artifact;
        }

        const approval = storage.approveGate5({
          projectId: project.id,
          userId: req.user!.id,
          artifact: deliveryArtifact,
        });
        const updatedProject = storage.getProjectById(project.id)!;
        return res.json({ approval, project: updatedProject });
      }

      return res.status(400).json({ error: 'رقم البوابة غير صالح.' });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل اعتماد البوابة.' });
    }
  });

  // GET /api/projects/:id/files
  app.get('/api/projects/:id/files', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى ملفات هذا المشروع.' });
    }
    const version = req.query.version ? Number(req.query.version) : undefined;
    const files = storage.getProjectFiles(project.id, version);
    const gate3State = storage.getGate3State(project.id);
    return res.json({
      projectId: project.id,
      version: version || gate3State?.version || 0,
      approvedVersion: gate3State?.approval?.approvedVersion || null,
      files,
    });
  });

  // GET /api/projects/:id/qa-report
  app.get('/api/projects/:id/qa-report', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى تقرير الجودة لهذا المشروع.' });
    }
    const gate4State = storage.getGate4State(project.id);
    if (!gate4State || !gate4State.artifact) {
      return res.status(404).json({ error: 'لم يتم تشغيل فحص الجودة لهذا المشروع بعد.' });
    }
    return res.json({
      projectId: project.id,
      version: gate4State.version,
      approved: Boolean(gate4State.approval?.approved),
      approvedVersion: gate4State.approval?.approvedVersion || null,
      qaReport: gate4State.artifact,
    });
  });

  // GET /api/projects/:id/delivery/download & /api/projects/:id/gates/5/download
  async function handleGate5Download(req: Request & { user?: UserRecord }, res: Response) {
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بتحميل حزمة هذا المشروع.' });
      }

      const approvedPrd = storage.getGate1ApprovedArtifact(project.id);
      const approvedDesign = storage.getGate2ApprovedArtifact(project.id);
      const approvedCode = storage.getGate3ApprovedArtifact(project.id);
      const approvedQa = storage.getGate4ApprovedArtifact(project.id);

      if (!approvedPrd || !approvedDesign || !approvedCode || !approvedQa) {
        return res.status(409).json({
          error:
            'لا يمكن تحميل الحزمة النهائية (ZIP) قبل اعتماد المتطلبات (Gate 1)، التصميم (Gate 2)، الكود (Gate 3)، وفحص الجودة (Gate 4).',
        });
      }

      const gate5State = storage.getGate5State(project.id);
      const deliveryVersion = gate5State?.version && gate5State.version > 0 ? gate5State.version : 1;

      const packageResult = await buildProjectDeliveryPackage({
        projectId: project.id,
        deliveryVersion,
        approvedPrd: approvedPrd.document,
        approvedPrdVersion: approvedPrd.approvedVersion,
        approvedDesign: approvedDesign.artifact,
        approvedDesignVersion: approvedDesign.approvedVersion,
        approvedCode: approvedCode.artifact,
        approvedCodeVersion: approvedCode.approvedVersion,
        approvedQa: approvedQa.artifact,
        approvedQaVersion: approvedQa.approvedVersion,
      });

      if (!gate5State?.artifact) {
        storage.saveGate5DeliveryArtifact({
          projectId: project.id,
          userId: req.user!.id,
          artifact: packageResult.deliveryArtifact,
        });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${packageResult.deliveryArtifact.fileName}"`
      );
      res.setHeader('Content-Length', String(packageResult.zipBuffer.length));
      return res.status(200).send(packageResult.zipBuffer);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: redactSecrets(err.message || 'فشل إنشاء وتحميل ملف المشروع ZIP.'),
      });
    }
  }

  app.get('/api/projects/:id/delivery/download', requireAuth, handleGate5Download);
  app.get('/api/projects/:id/gates/5/download', requireAuth, handleGate5Download);

  // =========================================================================
  // ADMIN CONFIGURATION & REAL PROVIDER TEST ENDPOINTS (SECTION 2)
  // =========================================================================

  app.get('/api/admin/config', (_req, res) => {
    res.json({
      hasSystemEnvKey: Boolean(systemEnvKey),
      providers: providersConfig.map((p) => ({
        ...p,
        hasKey: Boolean(p.apiKey && p.apiKey.trim()),
        maskedKey: maskApiKey(p.apiKey || ''),
        apiKey: '',
      })),
      agents: agentsConfig.map((a) => ({
        ...a,
        hasKey: Boolean(a.apiKey && a.apiKey.trim()),
        maskedKey: maskApiKey(a.apiKey || ''),
        apiKey: '',
      })),
    });
  });

  app.post('/api/admin/config', (req, res) => {
    const { providers, agents } = req.body || {};
    if (Array.isArray(providers) && providers.length > 0) {
      providersConfig = normalizeProviders(providers, providersConfig);
    }
    if (Array.isArray(agents) && agents.length > 0) {
      agentsConfig = normalizeAgents(agents, providersConfig, agentsConfig);
    }
    savePersistedConfig(storage, providersConfig, agentsConfig, options.isolateConfig);
    res.json({
      ok: true,
      providers: providersConfig.map((p) => ({
        ...p,
        hasKey: Boolean(p.apiKey && p.apiKey.trim()),
        maskedKey: maskApiKey(p.apiKey || ''),
        apiKey: '',
      })),
      agents: agentsConfig.map((a) => ({
        ...a,
        hasKey: Boolean(a.apiKey && a.apiKey.trim()),
        maskedKey: maskApiKey(a.apiKey || ''),
        apiKey: '',
      })),
    });
  });

  app.post('/api/admin/test-connection', async (req, res) => {
    try {
      const {
        gate,
        agentGate,
        providerId,
        provider,
        model,
        endpoint,
        customKey,
        promptText,
        agentOverride,
        providerOverride,
        agentConfig,
        providerConfig,
      } = req.body || {};

      const requestedGate =
        typeof agentGate === 'number'
          ? agentGate
          : typeof gate === 'number' || (typeof gate === 'string' && gate.trim() !== '')
          ? Number(gate)
          : undefined;

      // Support testing an explicit provider OR a specific gate agent
      let effectiveProviderId = providerId;
      let effectiveProviderOverride: Partial<ProviderConfig> | undefined =
        providerOverride || providerConfig;
      const effectiveAgentOverride: Partial<AgentConfig> | undefined =
        agentOverride || agentConfig;

      if (provider && !effectiveProviderId) {
        const cleanProv = String(provider).toLowerCase().trim();
        const matched = providersConfig.find(
          (p) => p.id === cleanProv || p.providerType === cleanProv
        );
        effectiveProviderId = matched ? matched.id : `prov-${cleanProv}`;
        effectiveProviderOverride = {
          ...effectiveProviderOverride,
          providerType: inferProviderType({ provider: cleanProv, endpoint }),
          model: model ? String(model).trim() : matched?.model || '',
          endpoint: endpoint ? String(endpoint).trim() : matched?.endpoint || '',
        };
      } else if (model || endpoint) {
        effectiveProviderOverride = {
          ...effectiveProviderOverride,
          ...(model ? { model: String(model).trim() } : {}),
          ...(endpoint ? { endpoint: String(endpoint).trim() } : {}),
        };
      }

      const resolved = resolveAdminTargetCredentials({
        gate: requestedGate,
        providerId: effectiveProviderId,
        customKey,
        providers: providersConfig,
        agents: agentsConfig,
        agentOverride: {
          ...effectiveAgentOverride,
          ...(model && requestedGate && !effectiveProviderId ? { model: String(model).trim() } : {}),
        },
        providerOverride: effectiveProviderOverride,
        managedGeminiApiKey: systemEnvKey,
      });

      const agentObj = requestedGate
        ? agentsConfig.find((a) => a.gate === requestedGate)
        : undefined;

      if (!resolved.apiKey && resolved.providerType !== 'stitch') {
        return res.status(400).json({
          ok: false,
          verified: false,
          status: 'failed',
          errorType: 'auth_error',
          provider: resolved.providerType,
          providerType: resolved.providerType,
          providerId: resolved.providerId,
          providerName: resolved.providerName,
          configuredModel: resolved.configuredModel,
          executedModel: null,
          model: resolved.configuredModel,
          agentGate: requestedGate ?? null,
          gate: requestedGate ?? null,
          keySource: resolved.keySource,
          latencyMs: 0,
          error: `لا يوجد مفتاح API مهيأ للمزود (${resolved.providerName}). يرجى إدخال مفتاح صالح.`,
        });
      }

      const userPrompt =
        promptText ||
        (agentObj
          ? `أكد جاهزيتك للعمل كـ "${agentObj.title}" في البوابة ${agentObj.gate} بجملة عربية مختصرة.`
          : `Respond with a concise confirmation that provider ${resolved.providerType} and model ${resolved.configuredModel} are active.`);

      const adapterResult = await executeResolvedTarget(
        resolved,
        {
          systemPrompt: resolved.systemPrompt,
          userPrompt,
          temperature: resolved.temperature ?? 0.2,
          maxTokens: 256,
          timeoutMs: 25000,
        },
        {
          fetchImpl: options.fetchImpl,
        }
      );

      if (!adapterResult.ok) {
        const httpStatus =
          adapterResult.status === 'integration_required' || adapterResult.status === 'unsupported'
            ? 501
            : adapterResult.statusCode || 502;

        return res.status(httpStatus).json({
          ok: false,
          verified: false,
          status:
            adapterResult.status === 'integration_required' || adapterResult.status === 'unsupported'
              ? adapterResult.status
              : 'failed',
          errorType: adapterResult.status,
          provider: adapterResult.provider,
          providerType: adapterResult.providerType,
          providerId: resolved.providerId,
          providerName: resolved.providerName,
          configuredModel: adapterResult.configuredModel,
          executedModel: adapterResult.executedModel,
          model: adapterResult.executedModel || adapterResult.configuredModel,
          agentGate: requestedGate ?? null,
          gate: requestedGate ?? null,
          keySource: resolved.keySource,
          latencyMs: adapterResult.latencyMs,
          error: redactSecrets(adapterResult.error || 'فشل الاتصال بالمزود المحدد.'),
        });
      }

      return res.json({
        ok: true,
        verified: true,
        status: 'connected',
        provider: adapterResult.provider,
        providerType: adapterResult.providerType,
        providerId: resolved.providerId,
        providerName: resolved.providerName,
        configuredModel: adapterResult.configuredModel,
        executedModel: adapterResult.executedModel || adapterResult.configuredModel,
        model: adapterResult.executedModel || adapterResult.configuredModel,
        agentGate: requestedGate ?? null,
        gate: requestedGate ?? null,
        agentTitle: agentObj?.title || resolved.providerName,
        keySource: resolved.keySource,
        latencyMs: adapterResult.latencyMs,
        response: adapterResult.response,
        reply: adapterResult.response,
        usage: adapterResult.usage,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        verified: false,
        status: 'failed',
        error: redactSecrets(error.message || 'فشل الاتصال بالمزود.'),
      });
    }
  });

  return { app, storage };
}

async function startServer() {
  const { app } = createApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OGroup AI Software Factory server running on port ${PORT}`);
  });
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  startServer();
}
