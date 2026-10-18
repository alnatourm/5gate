import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FactoryStorage, UserRecord } from './src/server/storage.ts';
import {
  executeRequirementsAgent,
  ProviderHttpClient,
} from './src/server/requirementsAgent.ts';
import {
  RequirementsDocument,
  parseMarkdownToRequirements,
  validateRequirementsDocument,
} from './src/shared/requirementsSchema.ts';

dotenv.config();

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

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'prov-stitch',
    name: 'Google Stitch (UI/UX Design AI)',
    providerType: 'stitch',
    model: 'google-stitch-v2-ui',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://stitch.withgoogle.com/api/v1/generate',
    latency: '110ms',
    assignedGates: ['GATE 02'],
    monthlyQuotaJod: 1500,
    usedQuotaJod: 320,
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

const DEFAULT_AGENTS: AgentConfig[] = [
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
    title: 'وكيل التصميم وتجربة المستخدم (Google Stitch UI/UX Agent)',
    roleEn: 'Google Stitch UI/UX & Design System Architect',
    desc: 'تحويل وثيقة الـ PRD المعتمدة عبر محرك Google Stitch إلى واجهات عصرية متجاوبة تدعم العربية (RTL) بنظام Tailwind CSS.',
    providerId: 'prov-stitch',
    providerName: 'Google Stitch (UI/UX Design AI)',
    model: 'google-stitch-v2-ui',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
    systemPrompt:
      'أنت وكيل التصميم والواجهات (Gate 2 Google Stitch Design Agent) في مصنع OGroup AI Factory. مهمتك تحويل وثيقة المتطلبات إلى تصميم واجهات Google Stitch تفاعلي ونظام ألوان وتخطيط شاشات متجاوب يدعم العربية (RTL) باستخدام Tailwind CSS.',
  },
  {
    gate: 3,
    gateCode: 'GATE 03',
    title: 'وكيل البرمجة وبناء الأنظمة (Full-Stack Coding Agent)',
    roleEn: 'Principal Full-Stack Architect & Code Generator',
    desc: 'كتابة الشيفرة البرمجية الكاملة للواجهات الأمامية والخلفية وقواعد البيانات مع ربط واجهات البرمجة.',
    providerId: 'prov-anthropic',
    providerName: 'Anthropic Claude Direct API',
    model: 'claude-3-7-sonnet',
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
    providerId: 'prov-openai',
    providerName: 'OpenAI Platform Enterprise',
    model: 'gpt-4o-2024-11-20',
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

function inferProviderType(prov: Partial<ProviderConfig>): ProviderType {
  if (prov.providerType) return prov.providerType;
  const hay = `${prov.id || ''} ${prov.name || ''} ${prov.endpoint || ''}`.toLowerCase();
  if (hay.includes('stitch')) return 'stitch';
  if (hay.includes('groq')) return 'groq';
  if (hay.includes('openai') || hay.includes('gpt')) return 'openai';
  if (hay.includes('anthropic') || hay.includes('claude')) return 'anthropic';
  if (hay.includes('deepseek')) return 'deepseek';
  if (hay.includes('mistral') || hay.includes('codestral')) return 'mistral';
  if (hay.includes('xai') || hay.includes('grok')) return 'xai';
  if (hay.includes('openrouter')) return 'openrouter';
  if (hay.includes('v0')) return 'v0';
  if (hay.includes('perplexity') || hay.includes('sonar')) return 'perplexity';
  if (hay.includes('together')) return 'together';
  if (hay.includes('cohere')) return 'cohere';
  if (hay.includes('gemini') || hay.includes('google')) return 'gemini';
  return 'custom';
}

function isModelCompatibleWithProvider(model: string, providerType: ProviderType): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  switch (providerType) {
    case 'groq':
      return m.includes('llama') || m.includes('mixtral') || m.includes('gemma') || m.includes('deepseek-r1-distill') || m.includes('qwen');
    case 'stitch':
      return m.includes('stitch') || m.includes('gemini');
    case 'gemini':
      return m.includes('gemini') && !m.includes('2.5-flash') && !m.includes('1.5');
    case 'openai':
      return m.includes('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4');
    case 'anthropic':
      return m.includes('claude');
    case 'deepseek':
      return m.includes('deepseek');
    case 'mistral':
      return m.includes('mistral') || m.includes('codestral') || m.includes('pixtral');
    case 'xai':
      return m.includes('grok');
    default:
      return true;
  }
}

function normalizeProviders(list: any[]): ProviderConfig[] {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_PROVIDERS;
  const savedMap = new Map(list.filter(Boolean).map((p) => [p.id, p]));
  const mergedDefaults = DEFAULT_PROVIDERS.map((def) => {
    const saved = savedMap.get(def.id);
    if (!saved) return def;
    const providerType = inferProviderType({ ...def, ...saved });
    return {
      ...def,
      ...saved,
      providerType,
      endpoint: saved.endpoint || def.endpoint,
      model: isModelCompatibleWithProvider(saved.model, providerType) ? saved.model : def.model,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : def.enabled,
    };
  });
  const customAdded = list
    .filter((p) => p && p.id && !DEFAULT_PROVIDERS.some((def) => def.id === p.id))
    .map((p) => ({
      ...p,
      providerType: inferProviderType(p),
      enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
    }));
  return [...mergedDefaults, ...customAdded];
}

function normalizeAgents(list: any[], providers: ProviderConfig[]): AgentConfig[] {
  if (!Array.isArray(list) || list.length === 0) return DEFAULT_AGENTS;
  const savedMap = new Map(list.filter(Boolean).map((a) => [Number(a.gate), a]));
  return DEFAULT_AGENTS.map((def) => {
    const saved = savedMap.get(def.gate);
    if (!saved) return def;
    const linkedProv =
      providers.find((p) => p.id === saved.providerId) ||
      providers.find((p) => p.id === def.providerId) ||
      providers[0];
    const pType = linkedProv ? inferProviderType(linkedProv) : 'gemini';
    const resolvedModel = isModelCompatibleWithProvider(saved.model, pType)
      ? saved.model
      : linkedProv?.model || def.model;

    return {
      ...def,
      ...saved,
      gate: def.gate,
      gateCode: def.gateCode,
      providerId: linkedProv ? linkedProv.id : def.providerId,
      providerName: linkedProv ? linkedProv.name : saved.providerName || def.providerName,
      model: resolvedModel,
      useProviderKey: typeof saved.useProviderKey === 'boolean' ? saved.useProviderKey : true,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true,
      systemPrompt: saved.systemPrompt || def.systemPrompt,
      temperature: typeof saved.temperature === 'number' ? saved.temperature : def.temperature,
      maxTokens: typeof saved.maxTokens === 'number' ? saved.maxTokens : def.maxTokens,
    };
  });
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.ai-factory-config.json');

function loadPersistedConfig(): { providers: ProviderConfig[]; agents: AgentConfig[] } {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
      const providers = normalizeProviders(raw.providers);
      const agents = normalizeAgents(raw.agents, providers);
      return { providers, agents };
    }
  } catch (err) {
    console.warn('Failed to load persisted AI config:', err);
  }
  return { providers: DEFAULT_PROVIDERS, agents: DEFAULT_AGENTS };
}

function savePersistedConfig(providers: ProviderConfig[], agents: AgentConfig[]) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ providers, agents }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save persisted AI config:', err);
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
  app.use(express.json({ limit: '5mb' }));

  const storage = new FactoryStorage(options.dbPath, options.encryptionSecret);
  const systemEnvKey =
    options.managedGeminiApiKey !== undefined
      ? options.managedGeminiApiKey
      : process.env.GEMINI_API_KEY || '';

  const initialConfig = options.isolateConfig
    ? { providers: DEFAULT_PROVIDERS, agents: DEFAULT_AGENTS }
    : loadPersistedConfig();
  let providersConfig: ProviderConfig[] = initialConfig.providers;
  let agentsConfig: AgentConfig[] = initialConfig.agents;

  // Authentication middleware
  const requireAuth = (req: Request & { user?: UserRecord }, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const headerToken = typeof req.headers['x-session-token'] === 'string' ? req.headers['x-session-token'].trim() : '';
    const token = bearerToken || headerToken;

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
      const { provider, model, apiKey, endpoint, active } = req.body || {};
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
  // REQUIRED GATE 1 & PROJECT ENDPOINTS (SECTION 9)
  // =========================================================================

  // 1. POST /api/projects
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

  // List projects for authenticated user
  app.get('/api/projects', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const projects = storage.getProjectsByOwner(req.user!.id);
    return res.json({ projects });
  });

  // 2. GET /api/projects/:id
  app.get('/api/projects/:id', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
    }
    const approvedArtifact = storage.getGate1ApprovedArtifact(project.id);
    return res.json({
      project,
      gate1ApprovedArtifact: approvedArtifact,
    });
  });

  // 3. GET /api/projects/:id/gates/1
  app.get('/api/projects/:id/gates/1', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    const project = storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود.' });
    }
    if (project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى وثيقة هذا المشروع.' });
    }
    const state = storage.getGate1State(project.id);
    if (!state) {
      return res.status(404).json({ error: 'بيانات البوابة الأولى غير موجودة.' });
    }

    let aiConnectionSummary: { mode: string; provider: string; model: string; hasKey: boolean } | null = null;
    if (project.mode === 'byok') {
      const conn = storage.getDecryptedAIConnectionForUser(req.user!.id, project.selectedConnectionId);
      aiConnectionSummary = conn
        ? { mode: 'byok', provider: conn.provider, model: conn.model, hasKey: Boolean(conn.apiKey) }
        : { mode: 'byok', provider: 'unconfigured', model: 'unconfigured', hasKey: false };
    } else {
      const gate1Agent = agentsConfig.find((a) => a.gate === 1) || DEFAULT_AGENTS[0];
      const gate1Prov = providersConfig.find((p) => p.id === gate1Agent.providerId) || DEFAULT_PROVIDERS[1];
      aiConnectionSummary = {
        mode: 'managed',
        provider: gate1Prov.providerType || 'gemini',
        model: gate1Agent.model || 'gemini-3.8-flash',
        hasKey: Boolean(systemEnvKey || gate1Agent.apiKey || gate1Prov.apiKey),
      };
    }

    return res.json({
      ...state,
      aiConnection: aiConnectionSummary,
    });
  });

  // 4. POST /api/projects/:id/gates/1/chat
  app.post('/api/projects/:id/gates/1/chat', requireAuth, async (req: Request & { user?: UserRecord }, res) => {
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع.' });
      }

      const { message, expectedVersion } = req.body || {};
      const userMessage = typeof message === 'string' ? message.trim() : '';
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

      // CRITICAL: Determine commercial mode strictly from trusted stored project record
      const trustedMode = project.mode;
      let providerToUse = '';
      let modelToUse = '';
      let apiKeyToUse = '';
      let endpointToUse = '';

      if (trustedMode === 'byok') {
        const freshUser = storage.getUserById(req.user!.id)!;
        if (!freshUser.subscriptionActive) {
          return res.status(402).json({
            error: 'اشتراك باقة Build With My AI (50 JOD شهرياً) غير مفعل. لا يمكن تشغيل الوكيل.',
          });
        }

        const conn = storage.getDecryptedAIConnectionForUser(req.user!.id, project.selectedConnectionId);
        if (!conn || !conn.active) {
          return res.status(400).json({
            error: 'لا يوجد اتصال ذكاء اصطناعي (BYOK) مفعل لحسابك. يرجى إعداد وتفعيل المفتاح أولاً.',
          });
        }
        if (!conn.apiKey || !conn.apiKey.trim()) {
          return res.status(401).json({
            error: `مفتاح API الخاص بك للمزود (${conn.provider}) غير موجود أو فارغ. لن يتم استخدام مفتاح المنصة البديل.`,
          });
        }

        // Strict BYOK rules: use exact selected provider & model, NEVER infer from key prefix, NEVER fall back to platform Gemini key
        providerToUse = conn.provider;
        modelToUse = conn.model;
        apiKeyToUse = conn.apiKey;
        endpointToUse = conn.endpoint;
      } else {
        // Managed mode ("Build For Me" - 100 JOD per project)
        if (!project.entitlementVerified) {
          return res.status(402).json({
            error: 'لم يتم تأكيد استحقاق المشروع في باقة Build For Me (100 JOD).',
          });
        }

        const gate1Agent = agentsConfig.find((a) => a.gate === 1) || DEFAULT_AGENTS[0];
        const gate1Prov =
          providersConfig.find((p) => p.id === gate1Agent.providerId) || DEFAULT_PROVIDERS[1];

        const dedicatedKey = !gate1Agent.useProviderKey ? (gate1Agent.apiKey || '').trim() : '';
        const provKey = (gate1Prov.apiKey || '').trim();

        if (dedicatedKey || provKey) {
          providerToUse = gate1Prov.providerType;
          modelToUse = gate1Agent.model || gate1Prov.model;
          apiKeyToUse = dedicatedKey || provKey;
          endpointToUse = gate1Prov.endpoint;
        } else {
          // Use OGroup-managed platform Gemini credentials
          providerToUse = 'gemini';
          modelToUse =
            gate1Agent.model && gate1Agent.model.startsWith('gemini-')
              ? gate1Agent.model
              : 'gemini-3.8-flash';
          apiKeyToUse = systemEnvKey;
          endpointToUse = '';
        }

        if (!apiKeyToUse) {
          return res.status(503).json({
            error: 'مفتاح الذكاء الاصطناعي المدار الخاص بالمنصة (OGroup Managed Key) غير مهيأ على الخادم.',
          });
        }
      }

      const executionResult = await executeRequirementsAgent(
        {
          provider: providerToUse,
          model: modelToUse,
          apiKey: apiKeyToUse,
          endpoint: endpointToUse,
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

      return res.json({
        reply: executionResult.reply,
        document: savedTurn.document,
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
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'فشل تنفيذ طلب وكيل المتطلبات.',
        status: 'failed',
      });
    }
  });

  // 5. PUT /api/projects/:id/gates/1/document
  app.put('/api/projects/:id/gates/1/document', requireAuth, (req: Request & { user?: UserRecord }, res) => {
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

      const { document, markdown, expectedVersion } = req.body || {};
      let targetDoc: RequirementsDocument;

      if (document && typeof document === 'object') {
        const merged = {
          ...currentState.document,
          ...document,
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
        markdown: saved.markdown,
        version: saved.version,
        updatedAt: saved.updatedAt,
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل حفظ التعديلات اليدوية.' });
    }
  });

  // 6. POST /api/projects/:id/gates/1/approve
  app.post('/api/projects/:id/gates/1/approve', requireAuth, (req: Request & { user?: UserRecord }, res) => {
    try {
      const project = storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'المشروع غير موجود.' });
      }
      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'غير مصرح لك باعتماد هذا المشروع.' });
      }

      const currentState = storage.getGate1State(project.id);
      if (!currentState) {
        return res.status(404).json({ error: 'وثيقة المتطلبات غير موجودة.' });
      }

      const { document, markdown, expectedVersion } = req.body || {};
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

      return res.json({
        approval,
        project: updatedProject,
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message || 'فشل اعتماد البوابة الأولى.' });
    }
  });

  // 7. GET /api/projects/:id/gates/1/approved-artifact
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

  // =========================================================================
  // ADMIN CONFIGURATION ENDPOINTS (PRESERVED FOR ADMIN PORTAL)
  // =========================================================================

  app.get('/api/admin/config', (_req, res) => {
    res.json({
      hasSystemEnvKey: Boolean(systemEnvKey),
      providers: providersConfig.map((p) => ({ ...p, apiKey: '' })),
      agents: agentsConfig.map((a) => ({ ...a, apiKey: '' })),
    });
  });

  app.post('/api/admin/config', (req, res) => {
    const { providers, agents } = req.body || {};
    if (Array.isArray(providers) && providers.length > 0) {
      providersConfig = normalizeProviders(providers);
    }
    if (Array.isArray(agents) && agents.length > 0) {
      agentsConfig = normalizeAgents(agents, providersConfig);
    }
    savePersistedConfig(providersConfig, agentsConfig);
    res.json({
      ok: true,
      providers: providersConfig.map((p) => ({ ...p, apiKey: '' })),
      agents: agentsConfig.map((a) => ({ ...a, apiKey: '' })),
    });
  });

  app.post('/api/admin/test-connection', async (req, res) => {
    const startTime = Date.now();
    try {
      const { gate, customKey, promptText } = req.body || {};
      const gateNum = Number(gate) || 1;
      const agent = agentsConfig.find((a) => a.gate === gateNum) || DEFAULT_AGENTS[0];
      const provider = providersConfig.find((p) => p.id === agent.providerId) || DEFAULT_PROVIDERS[1];
      const effectiveKey = (customKey || agent.apiKey || provider.apiKey || systemEnvKey || '').trim();

      if (!effectiveKey) {
        return res.status(400).json({ ok: false, error: 'مفتاح API غير متوفر لاختبار الاتصال.' });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents:
          promptText ||
          `أكد جاهزيتك للعمل كـ "${agent.title}" في البوابة ${agent.gate} بجملة عربية مختصرة.`,
      });

      const latencyMs = Date.now() - startTime;
      return res.json({
        ok: true,
        gate: agent.gate,
        agentTitle: agent.title,
        providerName: provider.name,
        model: agent.model,
        keySource: customKey ? 'Custom Key' : 'System Vault',
        latencyMs,
        reply: response.text || 'الوكيل متصل وجاهز.',
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'فشل الاتصال بالمزود.',
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
