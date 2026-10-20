/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Send,
  Terminal,
  FileText,
  Layout,
  Code2,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  Plus,
  Settings,
  User,
  CheckCircle2,
  Download,
  Search,
  Bell,
  Home,
  FolderKanban,
  Zap,
  Key,
  Receipt,
  HelpCircle,
  Check,
  Lock,
  RefreshCcw,
  FolderOpen,
  Shield,
  Layers,
  Cpu,
  Database,
  CheckCircle,
  AlertCircle,
  LogOut,
  Sliders,
  Play,
  FileCode,
  FileBox,
  Globe,
  Network,
  Users,
  Folder,
  BarChart2,
  History,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  PieChart,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Ban,
  UserPlus,
  Filter,
  AlertTriangle
} from 'lucide-react';
import {
  RequirementsDocument,
  REQUIREMENTS_SECTIONS,
  createInitialRequirementsDocument,
  formatRequirementsToMarkdown,
  parseMarkdownToRequirements,
} from './shared/requirementsSchema';
import type { DesignArtifact } from './shared/designSchema';
import type { CodeArtifact, GeneratedProjectFile } from './shared/codeSchema';
import type { QAReportArtifact } from './server/qaRunner';
import type { DeliveryArtifact } from './server/deliveryPackager';

type AppView = 'login' | 'signup' | 'dashboard' | 'create-project' | 'settings' | 'billing' | 'ai-connections' | 'gate-workspace';

type StitchScreen = 
  | 'dashboard' 
  | 'creation-mode' 
  | 'subscription-check' 
  | 'checkout' 
  | 'subscription-success' 
  | 'ai-keys' 
  | 'gate-1' 
  | 'gate-2' 
  | 'gate-3' 
  | 'gate-4' 
  | 'gate-5'
  | 'admin-dashboard'
  | 'admin-agents'
  | 'admin-providers'
  | 'admin-customers'
  | 'admin-projects'
  | 'admin-billing'
  | 'admin-costs'
  | 'admin-audit'
  | 'admin-settings';

type CommercialMode = 'managed' | 'byok';

interface Project {
  id: string;
  name: string;
  description: string;
  mode: CommercialMode;
  currentGate: number; // 1 to 5
  status: 'in_progress' | 'ready_for_approval' | 'approved' | 'completed';
  prd: string;
  designNotes: string;
  codeFiles: { name: string; path?: string; content: string; fileType?: string; version?: number }[];
  testResults: {
    status?: string;
    passed: number;
    failed: number;
    skipped?: number;
    executed?: number;
    buildSucceeded?: boolean;
    testedCodeVersion?: number;
    logs: string[];
  };
  gate1Version?: number;
  gate1Approved?: boolean;
  gate1ApprovedAt?: string | null;
  gate2Version?: number;
  gate2Approved?: boolean;
  gate2ApprovedAt?: string | null;
  gate3Version?: number;
  gate3Approved?: boolean;
  gate3ApprovedAt?: string | null;
  gate4Version?: number;
  gate4Approved?: boolean;
  gate4ApprovedAt?: string | null;
  gate5Version?: number;
  gate5Approved?: boolean;
  gate5ApprovedAt?: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  meta?: string;
}

export type AIProviderEngineType =
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

interface FactoryProvider {
  id: string;
  name: string;
  providerType: AIProviderEngineType;
  model: string;
  status: 'active' | 'standby' | 'disabled';
  enabled: boolean;
  apiKey: string;
  hasKey?: boolean;
  maskedKey?: string;
  useSystemEnv: boolean;
  endpoint: string;
  latency: string;
  assignedGates: string[];
  monthlyQuotaJod: number;
  usedQuotaJod: number;
}

interface FactoryAgent {
  gate: number;
  gateCode: string;
  title: string;
  roleEn: string;
  desc: string;
  providerId: string;
  providerName: string;
  model: string;
  apiKey: string;
  hasKey?: boolean;
  maskedKey?: string;
  useProviderKey: boolean;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  systemPrompt: string;
}

const DEFAULT_PROVIDERS: FactoryProvider[] = [
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
    assignedGates: ['GATE 03'],
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
    assignedGates: ['GATE 04'],
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
  {
    id: 'prov-v0',
    name: 'Vercel v0 UI & Code Engine',
    providerType: 'v0',
    model: 'v0-1.0-md',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.v0.dev/v1/chat/completions',
    latency: '140ms',
    assignedGates: ['GATE 02', 'GATE 03'],
    monthlyQuotaJod: 800,
    usedQuotaJod: 150,
  },
  {
    id: 'prov-perplexity',
    name: 'Perplexity Sonar Research AI',
    providerType: 'perplexity',
    model: 'sonar-pro',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.perplexity.ai/chat/completions',
    latency: '175ms',
    assignedGates: ['GATE 01'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 80,
  },
  {
    id: 'prov-together',
    name: 'Together AI / Fireworks Open-Source Cloud',
    providerType: 'together',
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    latency: '95ms',
    assignedGates: ['GATE 03'],
    monthlyQuotaJod: 600,
    usedQuotaJod: 120,
  },
  {
    id: 'prov-cohere',
    name: 'Cohere Command R+ Enterprise',
    providerType: 'cohere',
    model: 'command-r-plus-08-2024',
    status: 'active',
    enabled: true,
    apiKey: '',
    useSystemEnv: true,
    endpoint: 'https://api.cohere.com/v2/chat',
    latency: '155ms',
    assignedGates: ['GATE 01', 'GATE 05'],
    monthlyQuotaJod: 500,
    usedQuotaJod: 70,
  },
];

const inferProviderTypeClient = (prov: Partial<FactoryProvider>): AIProviderEngineType => {
  if (prov.providerType) return prov.providerType;
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
  if (hay.includes('gemini') || hay.includes('generativelanguage')) return 'gemini';
  return 'custom';
};

const mergeProvidersWithDefaults = (savedList: FactoryProvider[]): FactoryProvider[] => {
  if (!Array.isArray(savedList) || savedList.length === 0) return DEFAULT_PROVIDERS;
  const savedMap = new Map(savedList.filter(Boolean).map((p) => [p.id, p]));
  const mergedDefaults = DEFAULT_PROVIDERS.map((def) => {
    const saved = savedMap.get(def.id);
    if (!saved) return def;
    const providerType = inferProviderTypeClient({ ...def, ...saved });
    return {
      ...def,
      ...saved,
      providerType,
      endpoint: saved.endpoint || def.endpoint,
      model: saved.model && String(saved.model).trim() ? String(saved.model).trim() : def.model,
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : def.enabled,
    };
  });
  const customAdded = savedList
    .filter((p) => p && p.id && !DEFAULT_PROVIDERS.some((def) => def.id === p.id))
    .map((p) => ({
      ...p,
      providerType: inferProviderTypeClient(p),
      enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
    }));
  return [...mergedDefaults, ...customAdded];
};

const DEFAULT_AGENTS: FactoryAgent[] = [
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
    systemPrompt: 'أنت وكيل متطلبات المنتج (Gate 1 Requirements Agent) في مصنع OGroup AI Factory. مهمتك تحليل فكرة العميل وصياغة وثيقة متطلبات منتج (PRD) احترافية ومفصلة باللغة العربية مع تحديد الميزات الأساسية، الأدوار، وتدفق المستخدم.',
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
    systemPrompt: 'أنت وكيل التصميم والواجهات (Gate 2 Design Agent) في مصنع OGroup AI Factory. مهمتك تحويل وثيقة المتطلبات إلى توصيف بصري دقيق، نظام ألوان، وتخطيط شاشات متجاوب يدعم العربية (RTL) باستخدام Tailwind CSS.',
  },
  {
    gate: 3,
    gateCode: 'GATE 03',
    title: 'وكيل البرمجة وتوليد الكود (Full-Stack Coding Agent)',
    roleEn: 'Senior Full-Stack Software Engineer',
    desc: 'بناء الشيفرة البرمجية الكاملة للواجهات الأمامية والخلفية وقواعد البيانات مع ربط واجهات البرمجة.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.4,
    maxTokens: 8192,
    enabled: true,
    systemPrompt: 'أنت وكيل البرمجة وتوليد الكود (Gate 3 Development Agent) في مصنع OGroup AI Factory. مهمتك كتابة أكواد React و TypeScript و Node.js نظيفة وقابلة للتشغيل الفوري بناءً على المتطلبات والتصاميم المعتمدة.',
  },
  {
    gate: 4,
    gateCode: 'GATE 04',
    title: 'وكيل الفحص وضمان الجودة (QA & Security Agent)',
    roleEn: 'Automated QA & Cybersecurity Auditor',
    desc: 'إجراء اختبارات القبول، فحص الثغرات الأمنية (OWASP)، والتحقق من سلامة البناء والأداء.',
    providerId: 'prov-gemini',
    providerName: 'Google Gemini Enterprise',
    model: 'gemini-3.8-flash',
    apiKey: '',
    useProviderKey: true,
    temperature: 0.3,
    maxTokens: 4096,
    enabled: true,
    systemPrompt: 'أنت وكيل ضمان الجودة والأمن السيبراني (Gate 4 QA Agent) في مصنع OGroup AI Factory. مهمتك مراجعة الكود، التحقق من عدم وجود ثغرات أمنية، وتقديم تقرير فحص جودة شامل للعميل.',
  },
  {
    gate: 5,
    gateCode: 'GATE 05',
    title: 'وكيل التسليم والتشغيل السحابي (Delivery & DevOps Agent)',
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
    systemPrompt: 'أنت وكيل التسليم والتشغيل النهائي (Gate 5 Delivery Agent) في مصنع OGroup AI Factory. مهمتك مساعدة العميل في استلام الحزمة البرمجية الكاملة، شرح خطوات النشر عبر Docker والسحابة، وضمان جاهزية الإنتاج.',
  },
];

const mergeAgentsWithDefaults = (savedList: FactoryAgent[], providers: FactoryProvider[]): FactoryAgent[] => {
  if (!Array.isArray(savedList) || savedList.length === 0) return DEFAULT_AGENTS;
  const savedMap = new Map(savedList.filter(Boolean).map((a) => [Number(a.gate), a]));
  return DEFAULT_AGENTS.map((def) => {
    const saved = savedMap.get(def.gate);
    if (!saved) return def;
    const linkedProv =
      providers.find((p) => p.id === saved.providerId) ||
      providers.find((p) => p.id === def.providerId) ||
      providers[0];
    const resolvedModel =
      saved.model && String(saved.model).trim()
        ? String(saved.model).trim()
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
};

export default function App() {
  const [sessionToken, setSessionToken] = useState<string>(() => localStorage.getItem('ogroup_session_token') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('ogroup_user_email') || '');
  const [currentView, setCurrentView] = useState<AppView>(() => (localStorage.getItem('ogroup_current_view') as AppView) || 'login');
  const [activeScreen, setActiveScreen] = useState<StitchScreen>(() => {
    const saved = localStorage.getItem('ogroup_active_screen') as StitchScreen;
    const email = localStorage.getItem('ogroup_user_email') || '';
    if (email.toLowerCase() === 'admin@ogroup.ai') {
      return saved && saved.startsWith('admin-') ? saved : 'admin-agents';
    }
    return saved || 'dashboard';
  });

  const [userName, setUserName] = useState('');

  // Durable Projects State loaded from Backend SQLite Database
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => localStorage.getItem('ogroup_active_project_id') || '');
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Gate 1 Structured Document, Versioning, Locking & Approval Artifact State
  const [gate1Document, setGate1Document] = useState<RequirementsDocument | null>(null);
  const [gate1Markdown, setGate1Markdown] = useState<string>('');
  const [gate1Version, setGate1Version] = useState<number>(1);
  const [gate1Locked, setGate1Locked] = useState<boolean>(false);
  const [gate1Dirty, setGate1Dirty] = useState<boolean>(false);
  const [gate1EditorTab, setGate1EditorTab] = useState<'structured' | 'markdown'>('structured');
  const [gate1ErrorBanner, setGate1ErrorBanner] = useState<string | null>(null);
  const [gate1SavingManual, setGate1SavingManual] = useState<boolean>(false);
  const [gate1Approving, setGate1Approving] = useState<boolean>(false);
  const [gate1ApprovedArtifact, setGate1ApprovedArtifact] = useState<{
    approvedVersion: number;
    approvedAt: string;
    document: RequirementsDocument;
    markdown: string;
  } | null>(null);

  // Gate 2..5 Durable Artifacts State
  const [gate2Design, setGate2Design] = useState<DesignArtifact | null>(null);
  const [gate2Version, setGate2Version] = useState<number>(0);
  const [gate2Locked, setGate2Locked] = useState<boolean>(false);
  const [gate2ActiveScreenId, setGate2ActiveScreenId] = useState<string>('');

  const [gate3Code, setGate3Code] = useState<CodeArtifact | null>(null);
  const [gate3Version, setGate3Version] = useState<number>(0);
  const [gate3Locked, setGate3Locked] = useState<boolean>(false);
  const [gate3ViewTab, setGate3ViewTab] = useState<'code' | 'preview' | 'architecture'>('code');
  const [gate3EditingContent, setGate3EditingContent] = useState<string>('');
  const [gate3Dirty, setGate3Dirty] = useState<boolean>(false);

  const [gate4Report, setGate4Report] = useState<QAReportArtifact | null>(null);
  const [gate4Version, setGate4Version] = useState<number>(0);
  const [gate4Locked, setGate4Locked] = useState<boolean>(false);
  const [gate4Repairing, setGate4Repairing] = useState<boolean>(false);

  const [gate5Delivery, setGate5Delivery] = useState<DeliveryArtifact | null>(null);
  const [gate5Version, setGate5Version] = useState<number>(0);
  const [gate5Locked, setGate5Locked] = useState<boolean>(false);
  const [gate5ActiveDocTab, setGate5ActiveDocTab] = useState<'summary' | 'readme' | 'deployment' | 'env' | 'manifest'>('summary');

  const [gateApprovals, setGateApprovals] = useState<Record<number, boolean>>({});

  const [savedByokConnections, setSavedByokConnections] = useState<
    { id: string; provider: string; model: string; active: boolean; hasKey: boolean; maskedKey: string }[]
  >([]);

  // Google Stitch Live Canvas State (Gate 2 Interactive Design Studio)
  const [stitchScreenTab, setStitchScreenTab] = useState<string>(() => {
    return localStorage.getItem('ogroup_stitch_active_tab') || 'landing';
  });
  const [stitchViewport, setStitchViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [stitchTheme, setStitchTheme] = useState<'orange' | 'blue' | 'emerald' | 'violet' | 'dark'>('orange');
  const [stitchSelectedDay, setStitchSelectedDay] = useState<string>('الأحد 18 أكتوبر');
  const [stitchSelectedSlot, setStitchSelectedSlot] = useState<string>('11:00 صباحاً');
  const [stitchBookingClient, setStitchBookingClient] = useState<string>('');
  const [stitchBookingService, setStitchBookingService] = useState<string>('معاينة فيلا سكنية - دابوق');
  const [stitchHeroLocation, setStitchHeroLocation] = useState<string>('دابوق - عمان');
  const [stitchHeroType, setStitchHeroType] = useState<string>('فيلا سكنية مستقلة');
  const [stitchCustomPages, setStitchCustomPages] = useState<
    {
      id: string;
      title: string;
      slug: string;
      prompt: string;
      pageKind: 'auth' | 'pricing' | 'analytics' | 'contact' | 'details' | 'custom';
      aiSummary: string;
      htmlCode?: string;
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem('ogroup_stitch_custom_pages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [stitchAppointments, setStitchAppointments] = useState<
    { id: string; client: string; property: string; time: string; agent: string; status: 'مؤكد' | 'قيد التأكيد' | 'مكتمل' }[]
  >([
    { id: 'APT-101', client: 'م. طارق زياد العتيبي', property: 'معاينة فيلا دابوق الملكية', time: '10:30 صباحاً', agent: 'أ. سامر الحسن', status: 'مؤكد' },
    { id: 'APT-102', client: 'سارة فهد المنصور', property: 'استشارة تمويل وشراء شقة عبدون', time: '12:00 ظهراً', agent: 'م. ريم الكردي', status: 'قيد التأكيد' },
    { id: 'APT-103', client: 'شركة الأفق للاستثمار', property: 'توقيع عقد مكاتب تجارية - العبدلي', time: '02:30 مساءً', agent: 'أ. سامر الحسن', status: 'مؤكد' },
    { id: 'APT-104', client: 'د. خالد إبراهيم العمري', property: 'جولة ميدانية - مشروع بوابة عمان', time: '04:30 مساءً', agent: 'م. ريم الكردي', status: 'مكتمل' },
  ]);

  // New Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjMode, setNewProjMode] = useState<CommercialMode>('managed');

  // BYOK Settings State
  const [byokProvider, setByokProvider] = useState<string>('gemini');
  const [byokApiKey, setByokApiKey] = useState(() => localStorage.getItem('ogroup_byok_key') || '');
  const [byokModel, setByokModel] = useState('gemini-3.8-flash');

  // Factory Providers & Five Agents State (Connected to Backend)
  const [factoryProviders, setFactoryProviders] = useState<FactoryProvider[]>(() => {
    try {
      const saved = localStorage.getItem('ogroup_factory_providers');
      return saved ? mergeProvidersWithDefaults(JSON.parse(saved)) : DEFAULT_PROVIDERS;
    } catch {
      return DEFAULT_PROVIDERS;
    }
  });
  const [factoryAgents, setFactoryAgents] = useState<FactoryAgent[]>(() => {
    try {
      const savedProvsRaw = localStorage.getItem('ogroup_factory_providers');
      const provs = savedProvsRaw ? mergeProvidersWithDefaults(JSON.parse(savedProvsRaw)) : DEFAULT_PROVIDERS;
      const saved = localStorage.getItem('ogroup_factory_agents');
      return saved ? mergeAgentsWithDefaults(JSON.parse(saved), provs) : DEFAULT_AGENTS;
    } catch {
      return DEFAULT_AGENTS;
    }
  });
  const [hasSystemEnvKey, setHasSystemEnvKey] = useState(true);
  const [testingTargetId, setTestingTargetId] = useState<string | null>(null);
  const [agentTestResults, setAgentTestResults] = useState<Record<string, { ok: boolean; status?: string; reply: string; latencyMs: number; model: string; keySource: string }>>({});
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [customModelModeGates, setCustomModelModeGates] = useState<Record<number, boolean>>({});
  const [selectedCodeFileIdx, setSelectedCodeFileIdx] = useState<number>(0);

  // Admin Modals state
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderType, setNewProviderType] = useState<AIProviderEngineType>('stitch');
  const [newProviderModel, setNewProviderModel] = useState('google-stitch-v2-ui');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [newProviderEndpoint, setNewProviderEndpoint] = useState('https://stitch.withgoogle.com/api/v1/generate');
  const [newProviderAssignGate, setNewProviderAssignGate] = useState<number>(0);

  // Billing & Subscription State
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [projectCredits, setProjectCredits] = useState<number>(() => {
    const saved = localStorage.getItem('ogroup_project_credits');
    return saved !== null ? Number(saved) : 4;
  });

  // Chat State per Gate
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({
    1: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة المتطلبات (Gate 1). أنا وكيل المنتجات الخاص بك. كيف يمكنني مساعدتك في تطوير فكرتك اليوم؟', time: '10:00' }
    ],
    2: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة التصميم (Gate 2). اضغط على زر توليد التصميم أو اكتب توجيهاتك لتحويل وثيقة المتطلبات المعتمدة إلى شاشات وتصاميم حية.', time: '10:05' }
    ],
    3: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة البرمجة (Gate 3). سأقوم بتحويل المتطلبات والتصاميم المعتمدة إلى ملفات برمجية حقيقية قابلة للتشغيل والمعاينة.', time: '10:10' }
    ],
    4: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة فحص الجودة والأمان (Gate 4). سأقوم بإجراء اختبارات التحقق من البنية والأمان ومطابقة المتطلبات مع إمكانية الإصلاح التلقائي.', time: '10:15' },
    ],
    5: [
      { id: '1', sender: 'ai', text: 'مرحباً بك في بوابة التسليم النهائي (Gate 5). سأقوم بتوليد حزمة المشروع النهائية وملفات التشغيل والتحميل.', time: '10:20' }
    ]
  });
  const [chatInput, setChatInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // UI Navigation Persistence effects
  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('ogroup_session_token', sessionToken);
    } else {
      localStorage.removeItem('ogroup_session_token');
    }
  }, [sessionToken]);

  useEffect(() => {
    localStorage.setItem('ogroup_user_email', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('ogroup_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('ogroup_active_screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    localStorage.setItem('ogroup_active_project_id', activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem('ogroup_stitch_active_tab', stitchScreenTab);
  }, [stitchScreenTab]);

  useEffect(() => {
    localStorage.setItem('ogroup_stitch_custom_pages', JSON.stringify(stitchCustomPages));
  }, [stitchCustomPages]);

  // Sync providers and agents with backend on mount
  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (typeof data.hasSystemEnvKey === 'boolean') {
          setHasSystemEnvKey(data.hasSystemEnvKey);
        }
        const savedProvsRaw = localStorage.getItem('ogroup_factory_providers');
        const savedAgentsRaw = localStorage.getItem('ogroup_factory_agents');
        const mergedProvs = savedProvsRaw
          ? mergeProvidersWithDefaults(JSON.parse(savedProvsRaw))
          : mergeProvidersWithDefaults(data.providers || DEFAULT_PROVIDERS);
        const mergedAgents = savedAgentsRaw
          ? mergeAgentsWithDefaults(JSON.parse(savedAgentsRaw), mergedProvs)
          : mergeAgentsWithDefaults(data.agents || DEFAULT_AGENTS, mergedProvs);

        setFactoryProviders(mergedProvs);
        setFactoryAgents(mergedAgents);
        localStorage.setItem('ogroup_factory_providers', JSON.stringify(mergedProvs));
        localStorage.setItem('ogroup_factory_agents', JSON.stringify(mergedAgents));

        fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providers: mergedProvs,
            agents: mergedAgents,
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const syncSystemConfigToBackend = async (nextProviders: FactoryProvider[], nextAgents: FactoryAgent[], successMessage?: string) => {
    const normalizedProvs = mergeProvidersWithDefaults(nextProviders);
    const normalizedAgents = mergeAgentsWithDefaults(nextAgents, normalizedProvs);
    setFactoryProviders(normalizedProvs);
    setFactoryAgents(normalizedAgents);
    localStorage.setItem('ogroup_factory_providers', JSON.stringify(normalizedProvs));
    localStorage.setItem('ogroup_factory_agents', JSON.stringify(normalizedAgents));
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: normalizedProvs, agents: normalizedAgents }),
      });
      if (successMessage) showToast(successMessage);
    } catch {
      if (successMessage) showToast(successMessage);
    }
  };

  const handleTestAgentOrProvider = async (targetKey: string, gateNum: number, customKey?: string) => {
    setTestingTargetId(targetKey);
    try {
      const normalizedProvs = mergeProvidersWithDefaults(factoryProviders);
      const normalizedAgents = mergeAgentsWithDefaults(factoryAgents, normalizedProvs);
      const isProviderTest = targetKey.startsWith('prov-');
      const targetAgent = normalizedAgents.find(a => a.gate === gateNum) || normalizedAgents[0];
      const targetProvider = isProviderTest
        ? normalizedProvs.find(p => p.id === targetKey)
        : normalizedProvs.find(p => p.id === targetAgent?.providerId);

      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate: gateNum,
          customKey,
          providerId: isProviderTest ? targetKey : undefined,
          providers: normalizedProvs,
          agents: normalizedAgents,
          agentConfig: targetAgent,
          providerConfig: targetProvider,
        }),
      });
      const data = await res.json();
      if (data.status === 'integration_required') {
        setAgentTestResults(prev => ({
          ...prev,
          [targetKey]: {
            ok: false,
            status: 'integration_required',
            reply: data.error || data.reply || 'يتطلب ربط تكامل خارجي حقيقي (Integration Required)',
            latencyMs: data.latencyMs || 0,
            model: data.model || targetProvider?.model || 'google-stitch-v2-ui',
            keySource: data.keySource || 'Integration Required',
          }
        }));
        showToast(`تنبيه: ${data.error || 'هذا المحرك يتطلب تكامل API خارجي حقيقي'}`);
        return;
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'فشل الاتصال بالمزود');
      }
      setAgentTestResults(prev => ({
        ...prev,
        [targetKey]: {
          ok: true,
          status: 'connected',
          reply: data.reply,
          latencyMs: data.latencyMs || 115,
          model: data.model || targetAgent?.model || 'gemini-3.8-flash',
          keySource: data.keySource || 'System Vault',
        }
      }));
      showToast(`نجح اتصال الوكيل (${data.latencyMs}ms) عبر ${data.providerName || ''} • ${data.model}`);
    } catch (err: any) {
      setAgentTestResults(prev => ({
        ...prev,
        [targetKey]: {
          ok: false,
          status: 'failed',
          reply: err.message || 'خطأ في التحقق من المفتاح',
          latencyMs: 0,
          model: 'error',
          keySource: 'Failed',
        }
      }));
      showToast(`فشل الاختبار: ${err.message || 'تحقق من المفتاح'}`);
    } finally {
      setTestingTargetId(null);
    }
  };

  const handleTestAllFiveAgents = async () => {
    showToast('جاري فحص واختبار الوكلاء الخمسة في جميع البوابات...');
    for (const ag of factoryAgents) {
      await handleTestAgentOrProvider(`agent-${ag.gate}`, ag.gate);
    }
    showToast('اكتمل فحص الوكلاء الخمسة.');
  };

  const ENGINE_PRESETS: Record<AIProviderEngineType, { label: string; model: string; endpoint: string }> = {
    stitch: { label: 'Google Stitch (UI/UX Design Engine)', model: 'google-stitch-v2-ui', endpoint: 'https://stitch.withgoogle.com/api/v1/generate' },
    gemini: { label: 'Google Gemini SDK / Vertex AI', model: 'gemini-3.8-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta' },
    openai: { label: 'OpenAI Platform (GPT-4o / o3 / o1)', model: 'gpt-4o-2024-11-20', endpoint: 'https://api.openai.com/v1/chat/completions' },
    anthropic: { label: 'Anthropic Claude Direct API', model: 'claude-3-7-sonnet', endpoint: 'https://api.anthropic.com/v1/messages' },
    groq: { label: 'Groq Cloud LPU (Ultra-Fast)', model: 'llama-3.3-70b-versatile', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
    deepseek: { label: 'DeepSeek AI (V3 / R1 / Coder)', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
    mistral: { label: 'Mistral AI & Codestral Engine', model: 'codestral-latest', endpoint: 'https://api.mistral.ai/v1/chat/completions' },
    xai: { label: 'xAI Grok Platform (Grok-3 / Grok-2)', model: 'grok-3', endpoint: 'https://api.x.ai/v1/chat/completions' },
    openrouter: { label: 'OpenRouter Universal Gateway (All AI Models)', model: 'openrouter/auto', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
    v0: { label: 'Vercel v0 UI & Code Engine', model: 'v0-1.0-md', endpoint: 'https://api.v0.dev/v1/chat/completions' },
    perplexity: { label: 'Perplexity Sonar Research AI', model: 'sonar-pro', endpoint: 'https://api.perplexity.ai/chat/completions' },
    together: { label: 'Together AI / Fireworks Open-Source Cloud', model: 'Qwen/Qwen2.5-Coder-32B-Instruct', endpoint: 'https://api.together.xyz/v1/chat/completions' },
    cohere: { label: 'Cohere Command R+ Enterprise', model: 'command-r-plus-08-2024', endpoint: 'https://api.cohere.com/v2/chat' },
    cloud: { label: 'AWS Bedrock / Azure OpenAI / Enterprise Cloud', model: 'claude-3-5-sonnet-bedrock', endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com' },
    custom: { label: 'أي مزود ذكاء اصطناعي آخر (Custom REST / OpenAI-Compatible API)', model: 'custom-model-v1', endpoint: 'https://api.custom-ai-provider.com/v1/chat/completions' },
  };

  const openAddProviderModal = (assignGate = 0, presetType: AIProviderEngineType = 'stitch') => {
    const preset = ENGINE_PRESETS[presetType] || ENGINE_PRESETS.custom;
    setNewProviderType(presetType);
    setNewProviderName(presetType === 'stitch' ? 'Google Stitch Design AI' : '');
    setNewProviderModel(preset.model);
    setNewProviderEndpoint(preset.endpoint);
    setNewProviderKey('');
    setNewProviderAssignGate(assignGate);
    setIsAddProviderOpen(true);
  };

  const handleAddNewProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProviderName.trim()) return;
    const preset = ENGINE_PRESETS[newProviderType] || ENGINE_PRESETS.custom;
    const assignedGateCode = newProviderAssignGate > 0 ? `GATE 0${newProviderAssignGate}` : 'GATE 01';
    const newProv: FactoryProvider = {
      id: `prov-${Date.now()}`,
      name: newProviderName.trim(),
      providerType: newProviderType,
      model: newProviderModel.trim() || preset.model,
      status: 'active',
      enabled: true,
      apiKey: newProviderKey.trim(),
      useSystemEnv: !newProviderKey.trim(),
      endpoint: newProviderEndpoint.trim() || preset.endpoint,
      latency: newProviderType === 'groq' ? '38ms' : '115ms',
      assignedGates: [assignedGateCode],
      monthlyQuotaJod: 1000,
      usedQuotaJod: 0,
    };
    const updatedProviders = [newProv, ...factoryProviders];
    let updatedAgents = factoryAgents;
    if (newProviderAssignGate > 0) {
      updatedAgents = factoryAgents.map(a =>
        a.gate === newProviderAssignGate
          ? {
              ...a,
              providerId: newProv.id,
              providerName: newProv.name,
              model: newProv.model,
              useProviderKey: true,
            }
          : a
      );
    }
    await syncSystemConfigToBackend(
      updatedProviders,
      updatedAgents,
      `تم إضافة المزود "${newProv.name}" (${newProv.model}) وربط مفتاحه بالنظام بنجاح`
    );
    setNewProviderName('');
    setNewProviderKey('');
    setIsAddProviderOpen(false);
  };

  // Enforce admin isolation
  const isAdmin = userEmail.trim().toLowerCase() === 'admin@ogroup.ai';
  useEffect(() => {
    if (isAdmin && !activeScreen.startsWith('admin-')) {
      setActiveScreen('admin-agents');
    }
  }, [isAdmin, activeScreen]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const authHeaders = (tokenOverride?: string): Record<string, string> => {
    const tok = tokenOverride !== undefined ? tokenOverride : sessionToken;
    return tok
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }
      : { 'Content-Type': 'application/json' };
  };

  // Load durable state for all 5 gates when active project changes
  const fetchProjectGate1Data = async (projectId: string, tokenOverride?: string) => {
    const tok = tokenOverride !== undefined ? tokenOverride : sessionToken;
    if (!projectId || !tok) return;
    try {
      const [gate1Res, fullProjRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/gates/1`, { headers: authHeaders(tok) }),
        fetch(`/api/projects/${projectId}`, { headers: authHeaders(tok) }),
      ]);

      if (gate1Res.ok) {
        const data = await gate1Res.json();
        if (data.document) {
          setGate1Document(data.document);
          setGate1Markdown(data.markdown || formatRequirementsToMarkdown(data.document));
          setGate1Version(Number(data.version || 1));
          setGate1Locked(Boolean(data.locked));
          setGate1Dirty(false);
          setGate1ErrorBanner(null);
        }
        if (Array.isArray(data.chatHistory)) {
          setChatMessages(prev => ({
            ...prev,
            1: data.chatHistory,
          }));
        }
        if (data.approval && data.approval.approved) {
          setGate1ApprovedArtifact({
            approvedVersion: data.approval.approvedVersion,
            approvedAt: data.approval.approvedAt,
            document: data.approval.document,
            markdown: data.approval.markdown,
          });
        } else {
          setGate1ApprovedArtifact(null);
        }
      }

      if (fullProjRes.ok) {
        const fullData = await fullProjRes.json();
        if (fullData.project) {
          setProjects(prev => prev.map(p => (p.id === fullData.project.id ? fullData.project : p)));
        }
        if (fullData.gates) {
          // Hydrate chat histories for gates 2..5 if present
          setChatMessages(prev => {
            const next = { ...prev };
            for (const g of [2, 3, 4, 5]) {
              const gState = fullData.gates[g];
              if (gState && Array.isArray(gState.chatHistory) && gState.chatHistory.length > 0) {
                next[g] = gState.chatHistory;
              }
            }
            return next;
          });

          // Gate 2 Design
          const g2 = fullData.gates[2];
          if (g2?.artifact?.artifact) {
            const design = g2.artifact.artifact as DesignArtifact;
            setGate2Design(design);
            setGate2Version(g2.artifact.version);
            setGate2Locked(Boolean(g2.artifact.locked));
            if (design.screens?.length > 0 && !gate2ActiveScreenId) {
              setGate2ActiveScreenId(design.screens[0].id);
            }
          } else {
            setGate2Design(null);
            setGate2Version(0);
            setGate2Locked(false);
          }

          // Gate 3 Code
          const g3 = fullData.gates[3];
          if (g3?.artifact?.artifact) {
            const codeArt = g3.artifact.artifact as CodeArtifact;
            setGate3Code(codeArt);
            setGate3Version(g3.artifact.version);
            setGate3Locked(Boolean(g3.artifact.locked));
            setSelectedCodeFileIdx(0);
            setGate3EditingContent(codeArt.files?.[0]?.content || '');
            setGate3Dirty(false);
          } else {
            setGate3Code(null);
            setGate3Version(0);
            setGate3Locked(false);
          }

          // Gate 4 QA Report
          const g4 = fullData.gates[4];
          if (g4?.artifact?.artifact) {
            const qaArt = g4.artifact.artifact as QAReportArtifact;
            setGate4Report(qaArt);
            setGate4Version(g4.artifact.version);
            setGate4Locked(Boolean(g4.artifact.locked));
          } else {
            setGate4Report(null);
            setGate4Version(0);
            setGate4Locked(false);
          }

          // Gate 5 Delivery
          const g5 = fullData.gates[5];
          if (g5?.artifact?.artifact) {
            const delivArt = g5.artifact.artifact as DeliveryArtifact;
            setGate5Delivery(delivArt);
            setGate5Version(g5.artifact.version);
            setGate5Locked(Boolean(g5.artifact.locked));
          } else {
            setGate5Delivery(null);
            setGate5Version(0);
            setGate5Locked(false);
          }
        }

        if (Array.isArray(fullData.approvals)) {
          const appMap: Record<number, boolean> = {};
          for (const ap of fullData.approvals) {
            if (ap.approved) appMap[ap.gateNumber] = true;
          }
          setGateApprovals(appMap);
        }
      }
    } catch (err) {
      console.error('Failed to load project gates state:', err);
    }
  };

  // Restore durable session, projects, and Gate 1..5 state on mount/reload
  useEffect(() => {
    const restoreSession = async () => {
      if (sessionToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: authHeaders(sessionToken),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUserEmail(data.user.email);
              setProjectCredits(data.user.projectCredits);
              setSubscriptionActive(data.user.subscriptionActive);
            }
            if (Array.isArray(data.connections)) {
              setSavedByokConnections(data.connections);
              const activeConn = data.connections.find((c: any) => c.active);
              if (activeConn) {
                setByokProvider(activeConn.provider);
                setByokModel(activeConn.model);
              }
            }
            if (Array.isArray(data.projects)) {
              setProjects(data.projects);
              const targetId = activeProjectId || data.projects[0]?.id || '';
              if (targetId) {
                setActiveProjectId(targetId);
                await fetchProjectGate1Data(targetId, sessionToken);
              }
            }
            return;
          }
        } catch {}
      }

      if (userEmail && userEmail.trim()) {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail.trim() }),
          });
          if (res.ok) {
            const data = await res.json();
            setSessionToken(data.token);
            if (data.user) {
              setProjectCredits(data.user.projectCredits);
              setSubscriptionActive(data.user.subscriptionActive);
            }
            if (Array.isArray(data.connections)) {
              setSavedByokConnections(data.connections);
            }
            if (Array.isArray(data.projects)) {
              setProjects(data.projects);
              const targetId = activeProjectId || data.projects[0]?.id || '';
              if (targetId) {
                setActiveProjectId(targetId);
                await fetchProjectGate1Data(targetId, data.token);
              }
            }
          }
        } catch {}
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (activeProjectId && sessionToken) {
      fetchProjectGate1Data(activeProjectId, sessionToken);
    }
  }, [activeProjectId, sessionToken]);

  const handleLoginOrSignup = async (isSignup: boolean, e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) return;

    const cleanEmail = userEmail.trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: userName.trim() || undefined,
          defaultCredits: 4,
          defaultSubscription: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'فشل تسجيل الدخول');
        return;
      }

      setSessionToken(data.token);
      setUserEmail(data.user.email);
      setProjectCredits(data.user.projectCredits);
      setSubscriptionActive(data.user.subscriptionActive);
      setSavedByokConnections(data.connections || []);
      setProjects(data.projects || []);

      if (cleanEmail === 'admin@ogroup.ai') {
        showToast('تم تسجيل دخول الإدارة بنجاح');
        setActiveScreen('admin-agents');
        setCurrentView('dashboard');
        return;
      }

      if (data.projects && data.projects.length > 0) {
        setActiveProjectId(data.projects[0].id);
      } else {
        setActiveProjectId('');
      }
      setActiveScreen('dashboard');
      setCurrentView('dashboard');
      showToast(isSignup ? 'تم إنشاء الحساب بنجاح' : 'تم تسجيل الدخول بنجاح');
    } catch (err: any) {
      showToast(err.message || 'خطأ في الاتصال بالخادم');
    }
  };

  const handleLogout = () => {
    setSessionToken('');
    setUserEmail('');
    setProjects([]);
    setActiveProjectId('');
    setGate1Document(null);
    setGate1Markdown('');
    setGate1ApprovedArtifact(null);
    setGate2Design(null);
    setGate3Code(null);
    setGate4Report(null);
    setGate5Delivery(null);
    setCurrentView('login');
    setActiveScreen('dashboard');
    localStorage.removeItem('ogroup_session_token');
    localStorage.removeItem('ogroup_user_email');
    localStorage.removeItem('ogroup_current_view');
    localStorage.removeItem('ogroup_active_screen');
    showToast('تم تسجيل الخروج بنجاح');
  };

  const handleSaveByokConnection = async (providerId: string, modelName?: string, apiKeyValue?: string) => {
    if (!sessionToken) {
      showToast('يرجى تسجيل الدخول أولاً لحفظ إعدادات BYOK.');
      return;
    }
    const defaultModels: Record<string, string> = {
      gemini: 'gemini-3.8-flash',
      openai: 'gpt-4o-2024-11-20',
      anthropic: 'claude-3-7-sonnet',
      groq: 'llama-3.3-70b-versatile',
      deepseek: 'deepseek-chat',
      mistral: 'codestral-latest',
      xai: 'grok-3',
      openrouter: 'openrouter/auto',
      stitch: 'google-stitch-v2-ui',
    };
    const resolvedModel = modelName || byokModel || defaultModels[providerId] || 'gemini-3.8-flash';
    const keyToSave = apiKeyValue !== undefined ? apiKeyValue : byokApiKey;

    try {
      const res = await fetch('/api/ai-connections', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider: providerId,
          model: resolvedModel,
          apiKey: keyToSave,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ اتصال الذكاء الاصطناعي');
      }
      setByokProvider(providerId);
      setByokModel(resolvedModel);
      setByokApiKey('');
      if (Array.isArray(data.connections)) {
        setSavedByokConnections(data.connections);
      }
      showToast(`تم تشفير وحفظ مفتاح ${providerId.toUpperCase()} (${resolvedModel}) وتفعيله بنجاح`);
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ المفتاح');
    }
  };

  const handleSaveGate1ManualEdits = async (): Promise<boolean> => {
    if (!activeProject || !sessionToken || !gate1Document) return false;
    setGate1SavingManual(true);
    setGate1ErrorBanner(null);
    try {
      const payload =
        gate1EditorTab === 'markdown'
          ? { markdown: gate1Markdown, expectedVersion: gate1Version }
          : { document: gate1Document, expectedVersion: gate1Version };

      const res = await fetch(`/api/projects/${activeProject.id}/gates/1/document`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ التعديلات اليدوية.');
      }

      setGate1Document(data.document);
      setGate1Markdown(data.markdown);
      setGate1Version(data.version);
      setGate1Dirty(false);
      setProjects(prev =>
        prev.map(p =>
          p.id === activeProject.id
            ? { ...p, name: data.document.projectName, prd: data.markdown, gate1Version: data.version }
            : p
        )
      );
      showToast(`تم حفظ التعديلات اليدوية بنجاح (الإصدار v${data.version})`);
      return true;
    } catch (err: any) {
      setGate1ErrorBanner(err.message || 'حدث خطأ أثناء حفظ التعديلات اليدوية.');
      showToast(err.message || 'فشل حفظ الوثيقة');
      return false;
    } finally {
      setGate1SavingManual(false);
    }
  };

  // Save manual file edit in Gate 3
  const handleSaveGate3FileEdit = async () => {
    if (!activeProject || !sessionToken || !gate3Code) return;
    setGate1ErrorBanner(null);
    try {
      const updatedFiles = gate3Code.files.map((f, idx) =>
        idx === selectedCodeFileIdx ? { ...f, content: gate3EditingContent } : f
      );
      const nextArtifact: CodeArtifact = {
        ...gate3Code,
        files: updatedFiles,
      };
      const res = await fetch(`/api/projects/${activeProject.id}/gates/3/files`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          artifact: nextArtifact,
          expectedVersion: gate3Version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حفظ تعديلات الكود');
      }
      setGate3Code(data.artifact);
      setGate3Version(data.version);
      setGate3Dirty(false);
      if (data.project) {
        setProjects(prev => prev.map(p => (p.id === data.project.id ? data.project : p)));
      }
      showToast(`تم حفظ تعديلات الملف بنجاح (الإصدار v${data.version})`);
    } catch (err: any) {
      setGate1ErrorBanner(err.message || 'فشل حفظ تعديلات الكود');
      showToast(err.message || 'فشل حفظ تعديلات الكود');
    }
  };

  // Run automated Gate 4 -> Gate 3 -> Gate 4 repair loop
  const handleRepairGate4 = async () => {
    if (!activeProject || !sessionToken || gate4Repairing || isAiProcessing) return;
    setGate4Repairing(true);
    setGate1ErrorBanner(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/gates/4/repair`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل الإصلاح التلقائي للكود');
      }
      if (data.codeArtifact) {
        setGate3Code(data.codeArtifact);
        setGate3Version(data.codeVersion);
        setSelectedCodeFileIdx(0);
        setGate3EditingContent(data.codeArtifact.files?.[0]?.content || '');
      }
      if (data.qaArtifact) {
        setGate4Report(data.qaArtifact);
        setGate4Version(data.qaVersion);
      }
      if (data.project) {
        setProjects(prev => prev.map(p => (p.id === data.project.id ? data.project : p)));
      }
      if (data.aiMessage) {
        setChatMessages(prev => ({
          ...prev,
          4: [...(prev[4] || []), data.aiMessage],
        }));
      }
      showToast(`تم إصلاح الكود وإعادة الفحص بنجاح (${data.qaArtifact?.status === 'passed' ? 'اجتاز الفحص' : 'يحتاج مراجعة'})`);
    } catch (err: any) {
      setGate1ErrorBanner(err.message || 'تعذر إكمال حلقة الإصلاح التلقائي');
      showToast(err.message || 'فشل الإصلاح التلقائي');
    } finally {
      setGate4Repairing(false);
    }
  };

  // Execute the active Stage Agent across all 5 Gates
  const executeStageAgentPrompt = async (promptToRun: string) => {
    if (!promptToRun.trim() || isAiProcessing || !activeProject) return;

    const userMsgText = promptToRun.trim();
    const gateNum = activeProject.currentGate;
    setGate1ErrorBanner(null);

    if (gateNum === 1) {
      // If user made manual edits before chatting, persist them first so the AI uses the latest version
      let versionForChat = gate1Version;
      if (gate1Dirty && gate1Document) {
        try {
          const savePayload =
            gate1EditorTab === 'markdown'
              ? { markdown: gate1Markdown, expectedVersion: gate1Version }
              : { document: gate1Document, expectedVersion: gate1Version };
          const saveRes = await fetch(`/api/projects/${activeProject.id}/gates/1/document`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(savePayload),
          });
          const saveData = await saveRes.json();
          if (!saveRes.ok) {
            setGate1ErrorBanner(saveData.error || 'تعذر حفظ التعديلات اليدوية قبل إرسال الرسالة.');
            return;
          }
          setGate1Document(saveData.document);
          setGate1Markdown(saveData.markdown);
          setGate1Version(saveData.version);
          setGate1Dirty(false);
          versionForChat = saveData.version;
        } catch (saveErr: any) {
          setGate1ErrorBanner(saveErr.message || 'تعذر حفظ التعديلات اليدوية.');
          return;
        }
      }

      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text: userMsgText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => ({
        ...prev,
        1: [...(prev[1] || []), tempUserMsg],
      }));
      setChatInput('');
      setIsAiProcessing(true);

      try {
        const res = await fetch(`/api/projects/${activeProject.id}/gates/1/chat`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            message: userMsgText,
            expectedVersion: versionForChat,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'فشل تنفيذ طلب وكيل المتطلبات.');
        }

        // Update structured document and markdown from verified backend response
        setGate1Document(data.document);
        setGate1Markdown(data.markdown);
        setGate1Version(data.version);
        setGate1Dirty(false);

        setChatMessages(prev => {
          const withoutTemp = (prev[1] || []).filter(m => m.id !== tempUserMsg.id);
          const nextMsgs = [...withoutTemp];
          if (data.userMessage) nextMsgs.push(data.userMessage);
          else nextMsgs.push(tempUserMsg);
          if (data.aiMessage) nextMsgs.push(data.aiMessage);
          else {
            nextMsgs.push({
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: data.reply,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              meta: `${data.provider} • ${data.model} • v${data.version}`,
            });
          }
          return { ...prev, 1: nextMsgs };
        });

        setProjects(prev =>
          prev.map(p =>
            p.id === activeProject.id
              ? {
                  ...p,
                  name: data.document.projectName,
                  prd: data.markdown,
                  gate1Version: data.version,
                  status: 'ready_for_approval',
                }
              : p
          )
        );

        showToast(`تم تحديث وثيقة المتطلبات (الإصدار v${data.version}) عبر ${data.provider} (${data.model})`);
      } catch (err: any) {
        const errMessage = err?.message || 'فشل الاتصال بمزود الذكاء الاصطناعي. لم يتم تعديل الوثيقة.';
        setGate1ErrorBanner(errMessage);
        setChatMessages(prev => ({
          ...prev,
          1: (prev[1] || []).filter(m => m.id !== tempUserMsg.id),
        }));
        setChatInput(userMsgText);
        showToast(`خطأ: ${errMessage}`);
      } finally {
        setIsAiProcessing(false);
      }
      return;
    }

    // Gate 2, 3, 4, 5 real execution endpoints
    const endpointByGate: Record<number, string> = {
      2: `/api/projects/${activeProject.id}/gates/2/generate`,
      3: `/api/projects/${activeProject.id}/gates/3/generate`,
      4: `/api/projects/${activeProject.id}/gates/4/run`,
      5: `/api/projects/${activeProject.id}/gates/5/generate`,
    };
    const targetEndpoint = endpointByGate[gateNum];
    if (!targetEndpoint) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => ({
      ...prev,
      [gateNum]: [...(prev[gateNum] || []), tempUserMsg],
    }));
    setChatInput('');
    setIsAiProcessing(true);

    try {
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          prompt: userMsgText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `فشل تنفيذ وكيل البوابة ${gateNum}`);
      }

      if (gateNum === 2 && data.artifact) {
        const design = data.artifact as DesignArtifact;
        setGate2Design(design);
        setGate2Version(data.version);
        setGate2Locked(false);
        if (design.screens?.length > 0) {
          setGate2ActiveScreenId(design.screens[design.screens.length - 1].id);
        }
      } else if (gateNum === 3 && data.artifact) {
        const codeArt = data.artifact as CodeArtifact;
        setGate3Code(codeArt);
        setGate3Version(data.version);
        setGate3Locked(false);
        setSelectedCodeFileIdx(0);
        setGate3EditingContent(codeArt.files?.[0]?.content || '');
        setGate3Dirty(false);
      } else if (gateNum === 4 && data.artifact) {
        const qaArt = data.artifact as QAReportArtifact;
        setGate4Report(qaArt);
        setGate4Version(data.version);
        setGate4Locked(false);
      } else if (gateNum === 5 && data.artifact) {
        const delivArt = data.artifact as DeliveryArtifact;
        setGate5Delivery(delivArt);
        setGate5Version(data.version);
        setGate5Locked(false);
      }

      if (data.project) {
        setProjects(prev => prev.map(p => (p.id === data.project.id ? data.project : p)));
      }

      setChatMessages(prev => {
        const withoutTemp = (prev[gateNum] || []).filter(m => m.id !== tempUserMsg.id);
        const nextMsgs = [...withoutTemp];
        if (data.userMessage) nextMsgs.push(data.userMessage);
        else nextMsgs.push(tempUserMsg);
        if (data.aiMessage) nextMsgs.push(data.aiMessage);
        return { ...prev, [gateNum]: nextMsgs };
      });

      showToast(`تم تحديث مخرجات البوابة ${gateNum} (v${data.version}) عبر ${data.provider} (${data.model})`);
    } catch (err: any) {
      const errMessage = err?.message || `فشل تنفيذ طلب البوابة ${gateNum}`;
      setGate1ErrorBanner(errMessage);
      setChatMessages(prev => ({
        ...prev,
        [gateNum]: (prev[gateNum] || []).filter(m => m.id !== tempUserMsg.id),
      }));
      setChatInput(userMsgText);
      showToast(`خطأ: ${errMessage}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Handle AI Chat Form Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await executeStageAgentPrompt(chatInput);
  };

  // APPROVE & CONTINUE BUTTON (GATES 1-5 REAL VALIDATION, LOCKING & SNAPSHOT)
  const handleApproveAndAdvance = async () => {
    if (!activeProject || !sessionToken) return;
    const currentG = activeProject.currentGate;

    setGate1Approving(true);
    setGate1ErrorBanner(null);

    try {
      if (currentG === 1) {
        const bodyPayload: Record<string, unknown> = {
          expectedVersion: gate1Version,
        };
        if (gate1Dirty) {
          if (gate1EditorTab === 'markdown') {
            bodyPayload.markdown = gate1Markdown;
          } else if (gate1Document) {
            bodyPayload.document = gate1Document;
          }
        }

        const res = await fetch(`/api/projects/${activeProject.id}/gates/1/approve`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'فشل اعتماد وثيقة المتطلبات.');
        }

        const approval = data.approval;
        setGate1Locked(true);
        setGate1Dirty(false);
        setGate1Version(approval.approvedVersion);
        setGate1Document(approval.document);
        setGate1Markdown(approval.markdown);
        setGate1ApprovedArtifact({
          approvedVersion: approval.approvedVersion,
          approvedAt: approval.approvedAt,
          document: approval.document,
          markdown: approval.markdown,
        });
        setGateApprovals(prev => ({ ...prev, 1: true }));

        setProjects(prev =>
          prev.map(p =>
            p.id === activeProject.id
              ? {
                  ...p,
                  ...data.project,
                  currentGate: 2,
                  gate1Approved: true,
                  gate1ApprovedAt: approval.approvedAt,
                  gate1Version: approval.approvedVersion,
                  prd: approval.markdown,
                }
              : p
          )
        );

        showToast(`تم اعتماد وقفل وثيقة المتطلبات (v${approval.approvedVersion}) والانتقال إلى البوابة 2 بنجاح!`);
        return;
      }

      // Gates 2, 3, 4, 5 real server-side approval
      if (currentG === 3 && gate3Dirty) {
        await handleSaveGate3FileEdit();
      }
      const versionMap: Record<number, number> = {
        2: gate2Version,
        3: gate3Version,
        4: gate4Version,
        5: gate5Version,
      };
      const res = await fetch(`/api/projects/${activeProject.id}/gates/${currentG}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          expectedVersion: versionMap[currentG] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `فشل اعتماد البوابة ${currentG}. تأكد من توليد المخرجات أولاً.`);
      }

      setGateApprovals(prev => ({ ...prev, [currentG]: true }));
      if (currentG === 2) setGate2Locked(true);
      if (currentG === 3) setGate3Locked(true);
      if (currentG === 4) setGate4Locked(true);
      if (currentG === 5) setGate5Locked(true);

      if (data.project) {
        setProjects(prev => prev.map(p => (p.id === data.project.id ? data.project : p)));
      }

      if (currentG < 5) {
        showToast(`تم اعتماد وقفل مخرجات البوابة ${currentG} والانتقال إلى البوابة ${currentG + 1} بنجاح!`);
      } else {
        showToast('تم اعتماد البوابة الخامسة وتسليم المشروع نهائياً بنجاح!');
      }
    } catch (err: any) {
      setGate1ErrorBanner(err.message || `فشل اعتماد البوابة ${currentG}`);
      showToast(err.message || `فشل اعتماد البوابة ${currentG}`);
    } finally {
      setGate1Approving(false);
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    if (!sessionToken) {
      showToast('يرجى تسجيل الدخول أولاً.');
      setCurrentView('login');
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDesc.trim() || `نظام برمجي متكامل لـ ${newProjName.trim()}`,
          mode: newProjMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'فشل إنشاء المشروع.');
        if (res.status === 402) {
          setCurrentView('billing');
        }
        return;
      }

      const createdProj: Project = data.project;
      if (data.user) {
        setProjectCredits(data.user.projectCredits);
        setSubscriptionActive(data.user.subscriptionActive);
      }

      setProjects(prev => [createdProj, ...prev]);
      setActiveProjectId(createdProj.id);

      setGate2Design(null);
      setGate2Version(0);
      setGate2Locked(false);
      setGate3Code(null);
      setGate3Version(0);
      setGate3Locked(false);
      setGate4Report(null);
      setGate4Version(0);
      setGate4Locked(false);
      setGate5Delivery(null);
      setGate5Version(0);
      setGate5Locked(false);
      setGateApprovals({});

      if (data.gate1) {
        setGate1Document(data.gate1.document);
        setGate1Markdown(data.gate1.markdown);
        setGate1Version(data.gate1.version);
        setGate1Locked(Boolean(data.gate1.locked));
        setGate1Dirty(false);
        setGate1ApprovedArtifact(null);
        if (Array.isArray(data.gate1.chatHistory)) {
          setChatMessages(prev => ({
            ...prev,
            1: data.gate1.chatHistory,
          }));
        }
      }

      setNewProjName('');
      setNewProjDesc('');
      setCurrentView('gate-workspace');
      showToast('تم إنشاء المشروع وحفظه في قاعدة البيانات وبدء البوابة الأولى!');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إنشاء المشروع');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased flex flex-col select-none" dir="rtl">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AUTH & LOGIN / SIGNUP VIEWS */}
      {/* ========================================================================= */}
      {(currentView === 'login' || currentView === 'signup') && (
        <div className="flex-1 flex items-center justify-center bg-slate-900 p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">OGroup AI Software Factory</h1>
                <p className="text-xs text-slate-500">مصنع البرمجيات الذكي - البوابات الخمس</p>
              </div>
            </div>

            <form onSubmit={e => handleLoginOrSignup(currentView === 'signup', e)} className="space-y-4">
              {currentView === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)} required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="أدخل اسمك الكامل" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="name@example.com أو admin@ogroup.ai" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
                <input type="password" required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs" placeholder="••••••••" />
              </div>

              <button type="submit" className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                {currentView === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setUserEmail('admin@ogroup.ai');
                  setActiveScreen('admin-customers');
                  setCurrentView('dashboard');
                  showToast('تم تسجيل دخول الإدارة السريع بنجاح');
                }}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-orange-600" />
                <span>تسجيل دخول سريع كمسؤول النظام (Admin Portal)</span>
              </button>

              <div className="text-center pt-1">
                {currentView === 'login' ? (
                  <button onClick={() => setCurrentView('signup')} className="text-xs text-orange-600 font-bold hover:underline">
                    ليس لديك حساب؟ إنشاء حساب جديد (Sign up)
                  </button>
                ) : (
                  <button onClick={() => setCurrentView('login')} className="text-xs text-orange-600 font-bold hover:underline">
                    لديك حساب بالفعل؟ تسجيل الدخول
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN PAGES OR CUSTOMER DASHBOARD */}
      {/* ========================================================================= */}
      {currentView !== 'login' && currentView !== 'signup' && (
        <>
          {/* If Admin, render Admin View with full 9-item sidebar */}
          {isAdmin ? (
            <div className="flex-1 flex overflow-hidden bg-[#f9f9ff]">
              {/* Admin Sidebar with all 9 navigation items matching Stitch design */}
              <aside className="fixed right-0 top-0 h-full w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
                <div className="flex flex-col">
                  <div className="h-16 px-6 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
                    <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-lg">O</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold tracking-tight text-slate-800 leading-tight">OGroup AI Factory</span>
                      <span className="text-[11px] text-slate-500 leading-tight">بوابة الإدارة المركزية</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <nav className="flex flex-col gap-1 text-xs font-semibold">
                      <button onClick={() => setActiveScreen('admin-dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-dashboard' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <LayoutGrid className="w-4 h-4 text-slate-500" />
                        <span>الرئيسية (لوحة القيادة العامة)</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-providers')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-providers' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Network className="w-4 h-4 text-slate-500" />
                        <span>مزودو الذكاء الاصطناعي</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-agents')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-agents' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Bot className="w-4 h-4 text-slate-500" />
                        <span>الوكلاء الخمسة</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-customers')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-customers' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>العملاء</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-projects')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-projects' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Folder className="w-4 h-4 text-slate-500" />
                        <span>المشاريع</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-billing')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-billing' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span>الاشتراكات والمدفوعات</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-costs')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-costs' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <BarChart3 className="w-4 h-4 text-slate-500" />
                        <span>الاستهلاك والتكاليف</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-audit')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-audit' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <History className="w-4 h-4 text-slate-500" />
                        <span>سجل النشاط</span>
                      </button>
                      <button onClick={() => setActiveScreen('admin-settings')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition text-right ${activeScreen === 'admin-settings' ? 'bg-orange-50 text-orange-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>الإعدادات</span>
                      </button>

                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition text-right mt-4">
                        <LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </nav>
                  </div>
                </div>
                <div className="p-4 m-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-slate-800 font-semibold">حماية الإدارة نشطة</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>النظام الآمن</span>
                    <span className="font-semibold" dir="ltr">v2.4.0 Admin Core</span>
                  </div>
                </div>
              </aside>

              {/* Admin Main View */}
              <div className="pr-72 flex-1 flex flex-col min-h-screen overflow-y-auto">
                <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
                  <div className="flex items-center gap-4 flex-1 max-w-lg">
                    <div className="relative w-full">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input type="text" placeholder="بحث شامل في العملاء، المشاريع، والعمليات..." className="w-full h-10 pr-10 pl-4 rounded-lg bg-slate-100 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                      <Shield className="w-4 h-4" />
                      <span>Admin / إدارة المنصة</span>
                    </div>
                    <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
                      <div className="text-left rtl:text-right">
                        <span className="block text-xs font-bold text-slate-800">المدير العام - عبد الله المنصور</span>
                        <span className="block text-[10px] text-orange-600 font-medium">مسؤول النظام (admin@ogroup.ai)</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm">ع</div>
                    </div>
                  </div>
                </header>

                {/* Admin Dashboard Overview */}
                {activeScreen === 'admin-dashboard' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الرئيسية (لوحة القيادة العامة)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">الرئيسية (لوحة القيادة العامة للإدارة)</h1>
                        <p className="text-xs text-slate-500 mt-1">نظرة شاملة على أداء مصنع البرمجيات، حالة ربط الوكلاء الخمسة ومفاتيح الذكاء الاصطناعي، والعملاء النشطين.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActiveScreen('admin-providers')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2">
                          <Key className="w-4 h-4 text-orange-600" />
                          <span>إدارة مفاتيح المزودين</span>
                        </button>
                        <button onClick={() => setActiveScreen('admin-agents')} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span>إعداد الوكلاء الخمسة</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">إجمالي المشاريع المصنعة</span>
                        <div className="text-2xl font-black text-slate-900 tabular-nums">3,428 مشروع</div>
                        <span className="text-[11px] text-emerald-600 font-semibold block">342 قيد البناء النشط</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">الوكلاء الخمسة المتصلون</span>
                        <div className="text-2xl font-black text-emerald-600 tabular-nums">
                          {factoryAgents.filter(a => a.enabled).length} / 5 نشط
                        </div>
                        <span className="text-[11px] text-slate-500 block">مرتبطون بمفاتيح النظام الحية</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">إجمالي الإيرادات الشهرية</span>
                        <div className="text-2xl font-black text-orange-600 tabular-nums" dir="ltr">48,400 JOD</div>
                        <span className="text-[11px] text-slate-500 block">100 د.أ مدار • 50 د.أ BYOK</span>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                        <span className="text-xs text-slate-500">مزودو الذكاء الاصطناعي</span>
                        <div className="text-2xl font-black text-slate-900 tabular-nums">
                          {factoryProviders.filter(p => p.enabled).length} مزودات متصلة
                        </div>
                        <span className="text-[11px] text-emerald-600 font-semibold block">Gemini 3.8 Flash جاهز</span>
                      </div>
                    </div>

                    {/* Connected Agents Overview Strip */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-bold text-slate-900">حالة ربط وكلاء المصنع الخمسة (Live AI Agents Pipeline)</h2>
                          <p className="text-xs text-slate-500">النماذج والمفاتيح المفعلة حالياً لتشغيل بوابات بناء البرمجيات للعملاء</p>
                        </div>
                        <button onClick={() => setActiveScreen('admin-agents')} className="text-xs text-orange-600 font-bold hover:underline">
                          تعديل ربط المفاتيح والنماذج ←
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {factoryAgents.map((ag) => (
                          <div key={ag.gate} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-orange-600 font-mono">{ag.gateCode}</span>
                                <span className={`text-[10px] font-bold ${ag.enabled ? 'text-emerald-700' : 'text-red-600'}`}>
                                  {ag.enabled ? 'متصل' : 'متوقف'}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 line-clamp-1">{ag.title}</div>
                            </div>
                            <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                              <div className="truncate">{ag.providerName}</div>
                              <div className="font-mono text-[10px] text-slate-500 truncate" dir="ltr">{ag.model}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Customers Management (Exact Stitch Design) */}
                {activeScreen === 'admin-customers' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>إدارة الحسابات</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل العملاء والمشتركين</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة العملاء والمشتركين (Customer Directory & Accounts)</h1>
                        <p className="text-xs text-slate-500 mt-1">لوحة الرصد والتحكم الشاملة في حسابات العملاء، باقات الاشتراك، المشاريع المفعلة، وإدارة صلاحيات ومفاتيح الوصول.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تصدير تقرير العملاء CSV بنجاح')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <Download className="w-4 h-4 text-orange-600" />
                          <span>تصدير تقرير العملاء (CSV / Excel)</span>
                        </button>
                        <button onClick={() => showToast('تم فتح نافذة دعوة عميل جديد')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          <span>إضافة عميل جديد / دعوة للمنصة</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي العملاء المسجلين</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">1,428</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+12.4% مقارنة بالشهر الماضي</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشتركو الباقة الخاصة (BYOK)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">380</span>
                              <span className="text-xs text-orange-600 font-bold">50 د.أ/شهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Key className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">26.6%</span>
                          <span>من إجمالي العملاء - اشتراك شهري مستمر</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عملاء مصنعنا المدار (Managed)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">1,048</span>
                              <span className="text-xs text-slate-500">100 د.أ/مشروع</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Cpu className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                          <span>دفع حسب المشروع - إجمالي 294 مشروع منفذ</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">الحسابات المعلقة / تحت المراجعة</span>
                            <div className="text-2xl font-black text-red-600 mt-1">14</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-red-600 font-semibold">
                          <span>3 أمان • 11 بانتظار تجديد الدفع</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..." className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                          <option>حالة الحساب: الكل</option>
                          <option>نشط (Active)</option>
                          <option>معلق (Suspended)</option>
                        </select>
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                          <option>نوع الاشتراك: الكل</option>
                          <option>باقة المفاتيح (BYOK)</option>
                          <option>مصنعنا المدار</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">العميل / الحساب</th>
                              <th className="py-3.5 px-6">تاريخ التسجيل</th>
                              <th className="py-3.5 px-6">حالة الحساب</th>
                              <th className="py-3.5 px-6">نمط الاشتراك</th>
                              <th className="py-3.5 px-6 text-center">المشاريع</th>
                              <th className="py-3.5 px-6">إجمالي الإنفاق</th>
                              <th className="py-3.5 px-6">استهلاك الرموز (Tokens)</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {[
                              { name: 'أحمد محمد الرواشدة', email: 'ahmed.r@al-rawnaq.com', phone: '+962 79 123 4567', date: '12 يناير 2024', status: 'نشط', mode: 'مفاتيحي الخاصة (BYOK)', projects: '5 مشاريع', spend: '250 د.أ', tokens: '4.2M' },
                              { name: 'م. سارة فهد المنصور', email: 'sara.mansoor@almasar-logistics.com', phone: '+962 78 554 9921', date: '28 ديسمبر 2023', status: 'نشط', mode: 'مصنعنا المدار (Managed)', projects: '3 مشاريع', spend: '300 د.أ', tokens: '9.8M' },
                              { name: 'د. خالد إبراهيم عمر', email: 'dr.khaled@alshifa-clinics.jo', phone: '+962 77 888 1234', date: '05 نوفمبر 2023', status: 'نشط', mode: 'مصنعنا المدار (Managed)', projects: '4 مشاريع', spend: '400 د.أ', tokens: '14.5M' },
                              { name: 'ريم عبد الله الكردي', email: 'reem.k@natural-oasis.com', phone: '+962 79 987 6543', date: '18 يناير 2024', status: 'نشط', mode: 'مفاتيحي الخاصة (BYOK)', projects: '2 مشاريع', spend: '100 د.أ', tokens: '1.8M' },
                              { name: 'طارق زياد القضاة', email: 'tareq@afaq-properties.jo', phone: '+962 78 443 2109', date: '02 فبراير 2024', status: 'معلق مؤقتاً', mode: 'تجاوز حد الاستهلاك', projects: '1 مشروع', spend: '100 د.أ', tokens: '10.2M' },
                            ].map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
                                      {c.name.slice(0, 2)}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900 flex items-center gap-1">
                                        <span>{c.name}</span>
                                        <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
                                      </div>
                                      <div className="text-[11px] text-slate-400">{c.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 font-medium text-slate-600">{c.date}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${c.status === 'نشط' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    ● {c.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-800">{c.mode}</td>
                                <td className="py-4 px-6 text-center font-bold">{c.projects}</td>
                                <td className="py-4 px-6 font-bold text-slate-900">{c.spend}</td>
                                <td className="py-4 px-6">
                                  <div className="space-y-1 w-28">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                      <span>{c.tokens}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="bg-orange-600 h-full rounded-full" style={{ width: `${Math.random() * 60 + 30}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => showToast(`عرض ملف العميل: ${c.name}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تم تجميد الحساب: ${c.name}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition">
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination as per design */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 1,428 عميل مسجل في المنصة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">287</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen 1: Five Factory Agents Configuration & Key Binding */}
                {activeScreen === 'admin-agents' && (
                  <main className="p-8 space-y-6">
                    {/* Breadcrumb & Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>محرك الذكاء الاصطناعي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">تهيئة الوكلاء الخمسة وربط المفاتيح</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                          تهيئة وكلاء المصنع الخمسة وربط المفاتيح <span className="text-sm font-normal text-slate-500" dir="ltr">(Five AI Agents & API Key Routing)</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                          تحكم كامل في كل وكيل من البوابات الخمس: تفعيل الوكيل، اختيار المزود والنموذج، إدخال مفتاح API مخصص أو ربطه بخزنة النظام، وتجربة استجابة الوكيل مباشرة.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <button
                          onClick={() => openAddProviderModal(2, 'stitch')}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shadow-xs"
                        >
                          <Plus className="w-4 h-4 text-orange-400" />
                          <span>إضافة مزود / مفتاح جديد (Google Stitch أو أي AI)</span>
                        </button>
                        <button
                          onClick={() => setActiveScreen('admin-providers')}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Key className="w-4 h-4 text-orange-600" />
                          <span>خزنة جميع المزودين ({factoryProviders.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTestAllFiveAgents}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 text-orange-400" />
                          <span>اختبار جميع الوكلاء الخمسة معاً</span>
                        </button>
                        <button
                          onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, 'تم حفظ وتفعيل ربط الوكلاء الخمسة ومفاتيحهم في النظام بنجاح')}
                          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>حفظ وتفعيل الإعدادات في النظام</span>
                        </button>
                      </div>
                    </div>

                    {/* Add New Provider / Custom AI Engine Modal (accessible directly on Agents screen) */}
                    {isAddProviderOpen && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-orange-500 shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">
                              إضافة مزود ذكاء اصطناعي أو مفتاح API جديد (Google Stitch أو أي محرك مخصص غير موجود بالقائمة)
                            </h3>
                            <p className="text-xs text-slate-500">
                              اختر من المحركات العالمية الجاهزة أو اختر "أي مزود ذكاء اصطناعي آخر (Custom)" لإدخال أي اسم مزود، نموذج، رابط Endpoint، ومفتاح API.
                            </p>
                          </div>
                          <button onClick={() => setIsAddProviderOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg bg-slate-100">
                            ✕ إغلاق
                          </button>
                        </div>

                        <form onSubmit={handleAddNewProvider} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">1. نوع المحرك (AI Engine Type)</label>
                            <select
                              value={newProviderType}
                              onChange={e => {
                                const val = e.target.value as AIProviderEngineType;
                                setNewProviderType(val);
                                const preset = ENGINE_PRESETS[val] || ENGINE_PRESETS.custom;
                                setNewProviderModel(preset.model);
                                setNewProviderEndpoint(preset.endpoint);
                                if (!newProviderName || newProviderName === 'Google Stitch Design AI') {
                                  setNewProviderName(preset.label.split(' (')[0]);
                                }
                              }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              {Object.entries(ENGINE_PRESETS).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">2. اسم المزود في النظام (Provider Name)</label>
                            <input
                              type="text"
                              required
                              value={newProviderName}
                              onChange={e => setNewProviderName(e.target.value)}
                              placeholder="مثال: Google Stitch UI Pro أو اسم أي مزود"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">3. معرف النموذج (Model ID - يمكنك كتابة أي نموذج)</label>
                            <input
                              type="text"
                              required
                              value={newProviderModel}
                              onChange={e => setNewProviderModel(e.target.value)}
                              placeholder="google-stitch-v2-ui / gpt-4o / custom-model"
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">4. مفتاح الـ API (API Key)</label>
                            <input
                              type="text"
                              value={newProviderKey}
                              onChange={e => setNewProviderKey(e.target.value)}
                              placeholder="الصق مفتاح الـ API هنا (AIza... أو sk-... أو gsk_...)"
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">5. رابط الخدمة (API Endpoint URL)</label>
                            <input
                              type="text"
                              value={newProviderEndpoint}
                              onChange={e => setNewProviderEndpoint(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">6. ربط مباشر مع بوابة (اختياري)</label>
                            <select
                              value={newProviderAssignGate}
                              onChange={e => setNewProviderAssignGate(Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value={0}>إضافة للقائمة العامة بدون تغيير البوابات الحالية</option>
                              <option value={1}>ربط مباشر مع GATE 01 (وكيل المتطلبات)</option>
                              <option value={2}>ربط مباشر مع GATE 02 (وكيل التصميم - Google Stitch)</option>
                              <option value={3}>ربط مباشر مع GATE 03 (وكيل البرمجة والكود)</option>
                              <option value={4}>ربط مباشر مع GATE 04 (وكيل الفحص والأمان)</option>
                              <option value={5}>ربط مباشر مع GATE 05 (وكيل التسليم السحابي)</option>
                            </select>
                          </div>

                          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setIsAddProviderOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                            >
                              حفظ المزود والمفتاح وتفعيله فوراً
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* 4 KPI Summary Cards for Agents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">الوكلاء المفعلون في خط الإنتاج</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                            {factoryAgents.filter(a => a.enabled).length} / 5 وكلاء
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">متصلون ببوابات العملاء مباشرة</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">إجمالي مزودات الـ AI المتاحة</span>
                          <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{factoryProviders.length} مزود</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">
                            يتضمن Google Stitch و Gemini و OpenAI و Claude و Groq
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Key className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">محرك التصميم والـ UI</span>
                          <div className="text-lg font-black text-slate-900 mt-1 font-mono" dir="ltr">Google Stitch + Gemini</div>
                          <span className="text-[11px] text-orange-600 font-semibold mt-2 block">يدعم إضافة أي نموذج أو مفتاح مخصص</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Cpu className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">التسليم التلقائي بين البوابات</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">100% متزامن</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">يمرر سياق المشروع من بوابة لأخرى</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* 5 Interactive Agent Cards */}
                    <div className="space-y-5">
                      {factoryAgents.map((agent) => {
                        const testResult = agentTestResults[`agent-${agent.gate}`];
                        const isTesting = testingTargetId === `agent-${agent.gate}`;
                        const showKey = Boolean(visibleKeyIds[`agent-${agent.gate}`]);
                        const linkedProv = factoryProviders.find(p => p.id === agent.providerId) || factoryProviders[0];
                        const isCustomModelInput = Boolean(customModelModeGates[agent.gate]);
                        const activeKeyVal = agent.useProviderKey ? (linkedProv?.apiKey || '') : (agent.apiKey || '');

                        return (
                          <div key={agent.gate} className={`bg-white rounded-2xl p-6 shadow-sm border transition ${agent.enabled ? 'border-slate-200' : 'border-red-200 bg-slate-50/60'}`}>
                            {/* Top Row: Gate Identity & Enable Switch + Live Test Button */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                              <div className="flex items-start gap-3.5">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${agent.enabled ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                  <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold font-mono text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded">
                                      {agent.gateCode}
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-base">{agent.title}</h3>
                                    <span className="text-xs text-slate-400" dir="ltr">({agent.roleEn})</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{agent.desc}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, enabled: !a.enabled } : a
                                    );
                                    syncSystemConfigToBackend(
                                      factoryProviders,
                                      updated,
                                      !agent.enabled ? `تم تفعيل ${agent.title} في النظام` : `تم إيقاف ${agent.title} مؤقتاً`
                                    );
                                  }}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                                    agent.enabled
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                >
                                  {agent.enabled ? 'مفعل في النظام (Enabled)' : 'متوقف مؤقتاً (Disabled)'}
                                </button>

                                <button
                                  type="button"
                                  disabled={isTesting}
                                  onClick={() => handleTestAgentOrProvider(`agent-${agent.gate}`, agent.gate)}
                                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Play className="w-3.5 h-3.5 text-orange-400" />
                                  <span>{isTesting ? 'جاري فحص الوكيل...' : 'اختبار الوكيل والمفتاح حياً'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Configuration Grid: Provider, Model, API Key Binding, Direct Key Input */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
                              {/* 1. Assigned Provider */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700">المزود المرتبط (AI Provider)</label>
                                  <button
                                    type="button"
                                    onClick={() => openAddProviderModal(agent.gate, 'custom')}
                                    className="text-[11px] font-bold text-orange-600 hover:underline"
                                  >
                                    + إضافة مزود جديد
                                  </button>
                                </div>
                                <select
                                  value={agent.providerId}
                                  onChange={(e) => {
                                    if (e.target.value === '__add_new_provider__') {
                                      openAddProviderModal(agent.gate, 'custom');
                                      return;
                                    }
                                    const selProv = factoryProviders.find(p => p.id === e.target.value) || factoryProviders[0];
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate
                                        ? { ...a, providerId: selProv.id, providerName: selProv.name, model: selProv.model }
                                        : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated, `تم ربط ${agent.gateCode} بالمزود ${selProv.name}`);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  {factoryProviders.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.enabled ? '(نشط)' : '(غير مفعل)'}
                                    </option>
                                  ))}
                                  <option value="__add_new_provider__">➕ إضافة مزود ذكاء اصطناعي غير موجود بالقائمة...</option>
                                </select>
                              </div>

                              {/* 2. Active Model (All AI Models + Custom Free-Text Input) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700">النموذج النشط (Model ID)</label>
                                  <button
                                    type="button"
                                    onClick={() => setCustomModelModeGates(prev => ({ ...prev, [agent.gate]: !isCustomModelInput }))}
                                    className="text-[11px] font-bold text-orange-600 hover:underline"
                                  >
                                    {isCustomModelInput ? 'اختر من القائمة' : 'كتابة نموذج مخصص ✎'}
                                  </button>
                                </div>
                                {isCustomModelInput ? (
                                  <input
                                    type="text"
                                    value={agent.model}
                                    onChange={(e) => {
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, model: e.target.value } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    placeholder="اكتب اسم أي نموذج (مثال: google-stitch-v2-ui)"
                                    dir="ltr"
                                    className="w-full h-10 px-3 rounded-xl bg-white border border-orange-400 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                ) : (
                                  <select
                                    value={agent.model}
                                    onChange={(e) => {
                                      if (e.target.value === '__custom_model__') {
                                        setCustomModelModeGates(prev => ({ ...prev, [agent.gate]: true }));
                                        return;
                                      }
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, model: e.target.value } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    dir="ltr"
                                  >
                                    <optgroup label="Google Stitch (UI/UX Design AI)">
                                      <option value="google-stitch-v2-ui">google-stitch-v2-ui (Google Stitch Design)</option>
                                      <option value="google-stitch-design-pro">google-stitch-design-pro (Stitch Pro RTL)</option>
                                      <option value="google-stitch-figma-rtl">google-stitch-figma-rtl (Stitch + Tailwind)</option>
                                    </optgroup>
                                    <optgroup label="Google Gemini">
                                      <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
                                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                                      <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                                    </optgroup>
                                    <optgroup label="OpenAI (GPT / o-Series)">
                                      <option value="gpt-4o-2024-11-20">gpt-4o-2024-11-20</option>
                                      <option value="gpt-4.5-preview">gpt-4.5-preview</option>
                                      <option value="o3-mini">o3-mini (Reasoning & Code)</option>
                                      <option value="o1">o1 (Deep Reasoning)</option>
                                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                                    </optgroup>
                                    <optgroup label="Anthropic Claude">
                                      <option value="claude-3-7-sonnet">claude-3-7-sonnet (Extended Thinking)</option>
                                      <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                                      <option value="claude-3-5-haiku">claude-3-5-haiku</option>
                                      <option value="claude-3-opus">claude-3-opus</option>
                                    </optgroup>
                                    <optgroup label="Groq Cloud LPU">
                                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                                      <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                                    </optgroup>
                                    <optgroup label="DeepSeek / Mistral / xAI Grok / v0 / OpenRouter">
                                      <option value="deepseek-chat">deepseek-chat (DeepSeek V3)</option>
                                      <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek R1)</option>
                                      <option value="codestral-latest">codestral-latest (Mistral Code)</option>
                                      <option value="mistral-large-latest">mistral-large-latest</option>
                                      <option value="grok-3">grok-3 (xAI)</option>
                                      <option value="v0-1.0-md">v0-1.0-md (Vercel v0 UI)</option>
                                      <option value="openrouter/auto">openrouter/auto (Universal)</option>
                                      <option value="sonar-pro">sonar-pro (Perplexity)</option>
                                      <option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen2.5-Coder-32B (Together AI)</option>
                                      <option value="command-r-plus-08-2024">command-r-plus-08-2024 (Cohere)</option>
                                    </optgroup>
                                    <option value={agent.model}>{agent.model} (Current)</option>
                                    <option value="__custom_model__">➕ كتابة اسم نموذج مخصص غير موجود بالقائمة...</option>
                                  </select>
                                )}
                              </div>

                              {/* 3. Key Mode Selector */}
                              <div>
                                <label className="block font-bold text-slate-700 mb-1.5">مصدر مفتاح التشغيل (Key Source)</label>
                                <select
                                  value={agent.useProviderKey ? 'provider' : 'custom'}
                                  onChange={(e) => {
                                    const useProv = e.target.value === 'provider';
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, useProviderKey: useProv } : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="provider">مفتاح المزود الرئيسي ({agent.providerName})</option>
                                  <option value="custom">مفتاح API مخصص لهذا الوكيل فقط ({agent.gateCode})</option>
                                </select>
                              </div>

                              {/* 4. Direct API Key Input (Works for BOTH Provider Key and Dedicated Agent Key!) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="font-bold text-slate-700 truncate">
                                    {agent.useProviderKey ? `مفتاح ${agent.providerName}` : `مفتاح خاص لـ ${agent.gateCode}`}
                                  </label>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                                    {activeKeyVal ? 'مفتاح مخصص مفعل' : 'مفتاح النظام تلقائياً'}
                                  </span>
                                </div>
                                <div className="relative flex items-center">
                                  <input
                                    type={showKey ? 'text' : 'password'}
                                    value={activeKeyVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (agent.useProviderKey && linkedProv) {
                                        const updatedProvs = factoryProviders.map(p =>
                                          p.id === linkedProv.id ? { ...p, apiKey: val, useSystemEnv: !val.trim() } : p
                                        );
                                        syncSystemConfigToBackend(updatedProvs, factoryAgents);
                                      } else {
                                        const updatedAgents = factoryAgents.map(a =>
                                          a.gate === agent.gate ? { ...a, apiKey: val } : a
                                        );
                                        syncSystemConfigToBackend(factoryProviders, updatedAgents);
                                      }
                                    }}
                                    placeholder={`أدخل مفتاح ${agent.providerName} هنا (أو اتركه للخزنة)`}
                                    dir="ltr"
                                    className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setVisibleKeyIds(prev => ({ ...prev, [`agent-${agent.gate}`]: !showKey }))}
                                    className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                                    title="إظهار / إخفاء المفتاح"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                              {/* System Prompt & Temperature Configuration */}
                            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
                              <div className="lg:col-span-3">
                                <label className="block font-bold text-slate-700 mb-1.5">
                                  التعليمات التوجيهية للوكيل (System Prompt & Gate Instructions)
                                </label>
                                <textarea
                                  rows={2}
                                  value={agent.systemPrompt}
                                  onChange={(e) => {
                                    const updated = factoryAgents.map(a =>
                                      a.gate === agent.gate ? { ...a, systemPrompt: e.target.value } : a
                                    );
                                    syncSystemConfigToBackend(factoryProviders, updated);
                                  }}
                                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div className="flex flex-col justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                  <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                                    <span>درجة الإبداع (Temperature)</span>
                                    <span className="font-mono text-orange-600 tabular-nums" dir="ltr">{agent.temperature}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.1"
                                    value={agent.temperature}
                                    onChange={(e) => {
                                      const updated = factoryAgents.map(a =>
                                        a.gate === agent.gate ? { ...a, temperature: parseFloat(e.target.value) } : a
                                      );
                                      syncSystemConfigToBackend(factoryProviders, updated);
                                    }}
                                    className="w-full accent-orange-600 cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                                  <span>الحد الأقصى للرموز:</span>
                                  <span className="font-mono font-bold text-slate-800 tabular-nums" dir="ltr">{agent.maxTokens} tokens</span>
                                </div>
                              </div>
                            </div>

                            {/* Live Test Response Banner (if tested) */}
                            {testResult && (
                              <div className={`mt-4 p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                testResult.ok ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                <div className="space-y-1">
                                  <div className="font-bold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>رد الوكيل الحي ({testResult.model}):</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed">{testResult.reply}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] bg-white px-3 py-1.5 rounded-lg border border-emerald-200" dir="ltr">
                                  <span>{testResult.keySource}</span>
                                  <span>•</span>
                                  <span className="font-bold text-emerald-700">{testResult.latencyMs}ms</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </main>
                )}

                {/* Admin Screen 2: AI Providers & API Keys Vault Management */}
                {activeScreen === 'admin-providers' && (
                  <main className="p-8 space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>البنية التحتية للذكاء الاصطناعي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">مزودو الذكاء الاصطناعي وخزنة المفاتيح (AI Providers Vault)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                          إدارة مزودي الذكاء الاصطناعي ومفاتيح النظام <span className="text-sm font-normal text-slate-500" dir="ltr">(Factory AI Providers & API Keys)</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                          لوحة التحكم المركزية لإضافة وتفعيل مفاتيح API الخاصة بالمصنع (Google Stitch, Gemini, OpenAI, Claude, Groq, DeepSeek, وأي مزود مخصص).
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleTestAgentOrProvider('prov-stitch', 2)}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>فحص اتصال المزودات</span>
                        </button>
                        <button
                          onClick={() => openAddProviderModal(0, 'custom')}
                          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة مزود أو مفتاح جديد غير موجود بالقائمة</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">المزودات المفعلة في المصنع</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                            {factoryProviders.filter(p => p.enabled).length} / {factoryProviders.length}
                          </div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">متصلة وجاهزة لتشغيل البوابات</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Network className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">مفتاح النظام الأساسي (Env Vault)</span>
                          <div className="text-2xl font-black text-emerald-600 mt-1">
                            {hasSystemEnvKey ? 'متصل ونشط' : 'مفاتيح مخصصة'}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-2 block">تشفير خزنة AES-256-GCM</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">متوسط زمن استجابة المزودات</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums" dir="ltr">142ms</div>
                          <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">99.98% جاهزية (SLA)</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs text-slate-500">الميزانية الشهرية لمفاتيح المصنع</span>
                          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">1,840 / 5,000 د.أ</div>
                          <span className="text-[11px] text-slate-500 mt-2 block">36.8% مستهلك هذا الشهر</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Add New Provider Modal */}
                    {isAddProviderOpen && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-orange-500 shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">إضافة مزود ذكاء اصطناعي أو مفتاح API جديد للنظام</h3>
                            <p className="text-xs text-slate-500">يدعم Google Stitch وجميع محركات الذكاء الاصطناعي العالمية أو أي رابط Endpoint مخصص</p>
                          </div>
                          <button onClick={() => setIsAddProviderOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg bg-slate-100">
                            ✕ إغلاق
                          </button>
                        </div>

                        <form onSubmit={handleAddNewProvider} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">1. نوع المحرك (AI Engine Type)</label>
                            <select
                              value={newProviderType}
                              onChange={e => {
                                const val = e.target.value as AIProviderEngineType;
                                setNewProviderType(val);
                                const preset = ENGINE_PRESETS[val] || ENGINE_PRESETS.custom;
                                setNewProviderModel(preset.model);
                                setNewProviderEndpoint(preset.endpoint);
                                if (!newProviderName) {
                                  setNewProviderName(preset.label.split(' (')[0]);
                                }
                              }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                            >
                              {Object.entries(ENGINE_PRESETS).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">2. اسم المزود (Provider Name)</label>
                            <input
                              type="text"
                              required
                              value={newProviderName}
                              onChange={e => setNewProviderName(e.target.value)}
                              placeholder="مثال: Google Stitch Design Pro أو اسم مزودك"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">3. النموذج الافتراضي (Default Model ID)</label>
                            <input
                              type="text"
                              value={newProviderModel}
                              onChange={e => setNewProviderModel(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">4. مفتاح API (API Key)</label>
                            <input
                              type="text"
                              value={newProviderKey}
                              onChange={e => setNewProviderKey(e.target.value)}
                              placeholder="AIzaSy... أو sk-... أو gsk_..."
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-white border border-orange-300 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">5. رابط الخدمة (API Endpoint URL)</label>
                            <input
                              type="text"
                              value={newProviderEndpoint}
                              onChange={e => setNewProviderEndpoint(e.target.value)}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">6. ربط مباشر مع بوابة (اختياري)</label>
                            <select
                              value={newProviderAssignGate}
                              onChange={e => setNewProviderAssignGate(Number(e.target.value))}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                            >
                              <option value={0}>إضافة للقائمة العامة بدون تغيير البوابات</option>
                              <option value={1}>ربط مع GATE 01 (المتطلبات)</option>
                              <option value={2}>ربط مع GATE 02 (التصميم - Stitch)</option>
                              <option value={3}>ربط مع GATE 03 (البرمجة)</option>
                              <option value={4}>ربط مع GATE 04 (فحص الجودة)</option>
                              <option value={5}>ربط مع GATE 05 (التسليم)</option>
                            </select>
                          </div>
                          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setIsAddProviderOpen(false)}
                              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm"
                            >
                              حفظ المزود وتفعيله في النظام
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Provider Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {factoryProviders.map((prov) => {
                        const showKey = Boolean(visibleKeyIds[prov.id]);
                        const isTesting = testingTargetId === prov.id;
                        const testRes = agentTestResults[prov.id];
                        const linkedAgents = factoryAgents.filter(a => a.providerId === prov.id);

                        return (
                          <div key={prov.id} className={`bg-white rounded-2xl p-6 shadow-sm border space-y-4 transition ${prov.enabled ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${prov.enabled ? 'bg-orange-50 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                  <Network className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                                  <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{prov.endpoint}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, enabled: !p.enabled, status: (!p.enabled ? 'active' : 'disabled') as any } : p
                                    );
                                    syncSystemConfigToBackend(updated, factoryAgents, `تم تحديث حالة المزود ${prov.name}`);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${
                                    prov.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  {prov.enabled ? 'متصل ونشط' : 'معطل'}
                                </button>
                              </div>
                            </div>

                            {/* Key Configuration & Model Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">النموذج المعتمد (Active Model)</label>
                                <input
                                  type="text"
                                  value={prov.model}
                                  onChange={(e) => {
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, model: e.target.value } : p
                                    );
                                    setFactoryProviders(updated);
                                  }}
                                  dir="ltr"
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 mb-1">وضع مفتاح الـ API</label>
                                <select
                                  value={prov.useSystemEnv ? 'env' : 'custom'}
                                  onChange={(e) => {
                                    const useEnv = e.target.value === 'env';
                                    const updated = factoryProviders.map(p =>
                                      p.id === prov.id ? { ...p, useSystemEnv: useEnv } : p
                                    );
                                    setFactoryProviders(updated);
                                  }}
                                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="env">مفتاح النظام المشفر (System Vault Key)</option>
                                  <option value="custom">إدخال مفتاح API مخصص للمزود</option>
                                </select>
                              </div>
                            </div>

                            {/* Custom Key Input Box */}
                            <div className="text-xs">
                              <label className="block font-bold text-slate-700 mb-1">
                                {prov.useSystemEnv ? 'مفتاح الخزنة المركزي (System Environment Key)' : 'مفتاح API الخاص بالمزود (Provider API Key)'}
                              </label>
                              {prov.useSystemEnv ? (
                                <div className="h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-600">
                                  <span className="font-mono text-[11px]" dir="ltr">GEMINI_API_KEY •••••••••••••••••••••••• (Active Vault)</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = factoryProviders.map(p =>
                                        p.id === prov.id ? { ...p, useSystemEnv: false } : p
                                      );
                                      setFactoryProviders(updated);
                                    }}
                                    className="text-orange-600 font-bold hover:underline text-[11px]"
                                  >
                                    تغيير المفتاح
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 flex items-center">
                                    <input
                                      type={showKey ? 'text' : 'password'}
                                      value={prov.apiKey}
                                      onChange={(e) => {
                                        const updated = factoryProviders.map(p =>
                                          p.id === prov.id ? { ...p, apiKey: e.target.value } : p
                                        );
                                        setFactoryProviders(updated);
                                      }}
                                      placeholder="أدخل مفتاح الـ API هنا (AIzaSy... أو sk-...)"
                                      dir="ltr"
                                      className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-orange-300 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setVisibleKeyIds(prev => ({ ...prev, [prov.id]: !showKey }))}
                                      className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, `تم حفظ مفتاح ${prov.name} وربطه بالنظام`)}
                                    className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shrink-0"
                                  >
                                    حفظ المفتاح
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Linked Agents & Actions Footer */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="text-slate-500">
                                <span>الوكلاء المرتبطون: </span>
                                <strong className="text-slate-800">
                                  {linkedAgents.length > 0 ? linkedAgents.map(a => a.gateCode).join(' · ') : 'متاح للربط'}
                                </strong>
                                <span className="mx-2">·</span>
                                <span>الاستجابة: <strong className="font-mono text-slate-800" dir="ltr">{prov.latency}</strong></span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isTesting}
                                  onClick={() => handleTestAgentOrProvider(prov.id, 1, prov.useSystemEnv ? undefined : prov.apiKey)}
                                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <Play className="w-3.5 h-3.5 text-orange-600" />
                                  <span>{isTesting ? 'جاري الاختبار...' : 'اختبار المفتاح والاتصال'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => syncSystemConfigToBackend(factoryProviders, factoryAgents, `تم حفظ إعدادات المزود ${prov.name} بنجاح`)}
                                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition whitespace-nowrap"
                                >
                                  تحديث وربط
                                </button>
                              </div>
                            </div>

                            {testRes && (
                              <div className={`p-3 rounded-xl border text-xs ${testRes.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <div className="flex items-center justify-between font-bold mb-1">
                                  <span>نتيجة اختبار الاتصال المباشر:</span>
                                  <span className="font-mono" dir="ltr">{testRes.latencyMs}ms • {testRes.model}</span>
                                </div>
                                <p className="text-slate-700">{testRes.reply}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </main>
                )}

                {/* Admin Screen: Projects Management */}
                {activeScreen === 'admin-projects' && (
                  <main className="p-8 space-y-6">
                    {/* Header & Stats Banner */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>خط الإنتاج الذكي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل المشاريع والبوابات الخمس</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة المشاريع البرمجية <span className="text-sm font-normal text-slate-500" dir="ltr">(Projects & Gates Pipeline)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">متابعة حية لكافة مشاريع العملاء عبر بوابات المصنع الخمس، أنماط التشغيل، استهلاك الموارد، وحالات التسليم.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تحديث حالة المشاريع والبوابات بنجاح')} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2">
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>مزامنة البوابات</span>
                        </button>
                        <button onClick={() => showToast('تم تصدير تقرير المشاريع الشامل (CSV / Excel)')} className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>تصدير سجل المشاريع</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي المشاريع المسجلة</span>
                            <div className="text-2xl font-black text-slate-900 mt-1">3,428</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <FolderKanban className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+18.2% نمو في المشاريع هذا الشهر</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">قيد التنفيذ في البوابات (1-4)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-orange-600">342</span>
                              <span className="text-xs text-slate-500">مشروع نشط</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Code2 className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                          <span>84 مشروعاً في بوابة توليد الكود (Gate 3)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشاريع مكتملة ومسلمة (Gate 5)</span>
                            <div className="text-2xl font-black text-emerald-600 mt-1">3,069</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <PackageCheck className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700 font-semibold">
                          <span>نسبة إنجاز وتسليم 89.5% بدون أخطاء</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">مشاريع متوقفة / بانتظار الاعتماد</span>
                            <div className="text-2xl font-black text-red-600 mt-1">17</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-red-600 font-semibold">
                          <span>5 نفاد رصيد API • 12 بانتظار موافقة العميل</span>
                        </div>
                      </div>
                    </div>

                    {/* Factory Gates Live Distribution Strip */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-800">توزيع المشاريع النشطة حالياً عبر البوابات الخمس (342 مشروعاً قيد البناء)</span>
                        <span className="text-[11px] text-slate-500">متوسط زمن العبور الكامل: 42 دقيقة</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { gate: 'Gate 1: المتطلبات', count: '68 مشروع', pct: '20%', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                          { gate: 'Gate 2: التصميم', count: '74 مشروع', pct: '22%', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                          { gate: 'Gate 3: البرمجة', count: '84 مشروع', pct: '25%', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                          { gate: 'Gate 4: الفحص والجودة', count: '62 مشروع', pct: '18%', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                          { gate: 'Gate 5: جاهز للتسليم', count: '54 مشروع', pct: '15%', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        ].map((g, i) => (
                          <div key={i} className={`p-3 rounded-xl border ${g.color} flex items-center justify-between`}>
                            <div>
                              <div className="text-[11px] font-bold">{g.gate}</div>
                              <div className="text-sm font-black mt-0.5">{g.count}</div>
                            </div>
                            <span className="text-xs font-extrabold opacity-80">{g.pct}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="ابحث برقم المشروع (#PRJ)، اسم البرمجية، أو البريد الإلكتروني للعميل..." 
                          className="w-full h-10 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 transition text-slate-800"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>جميع البوابات (All Gates)</option>
                          <option>البوابة 1: المتطلبات (PRD)</option>
                          <option>البوابة 2: التصميم (UI/UX)</option>
                          <option>البوابة 3: التطوير البرمجي</option>
                          <option>البوابة 4: الفحص والجودة</option>
                          <option>البوابة 5: التسليم النهائي</option>
                        </select>
                        <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>جميع أنماط التشغيل</option>
                          <option>مصنعنا المدار (100 د.أ / مشروع)</option>
                          <option>مفاتيح العميل الخاصة (BYOK - 50 د.أ)</option>
                        </select>
                      </div>
                    </div>

                    {/* Projects Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold">
                              <th className="py-3.5 px-6">المشروع والبرمجية</th>
                              <th className="py-3.5 px-6">مالك المشروع</th>
                              <th className="py-3.5 px-6">وضع التشغيل</th>
                              <th className="py-3.5 px-6">البوابة الحالية</th>
                              <th className="py-3.5 px-6">حالة التقدم</th>
                              <th className="py-3.5 px-6">استهلاك الرموز</th>
                              <th className="py-3.5 px-6">تاريخ الإنشاء</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { id: '#PRJ-9821', name: 'منصة إدارة العيادات الطبية الشاملة', owner: 'dr.rami@clinic.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 3: التطوير', status: 'قيد التوليد النشط', tokens: '3.4M', date: 'اليوم، 14:20' },
                              { id: '#PRJ-9815', name: 'متجر الحرف اليدوية الأردنية', owner: 'sarah.handicraft@gmail.com', mode: 'مفاتيح خاصة (BYOK)', gate: 'البوابة 5: التسليم', status: 'مكتمل وجاهز للإنتاج', tokens: '5.1M', date: 'أمس، 11:05' },
                              { id: '#PRJ-9802', name: 'نظام إدارة المخازن اللوجستية', owner: 'logistics@amman-hub.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 2: التصميم', status: 'مراجعة الواجهات', tokens: '1.2M', date: '14 أكتوبر 2026' },
                              { id: '#PRJ-9794', name: 'تطبيق المحامي الذكي للاستشارات', owner: 'legal.expert@lawyers.jo', mode: 'مفاتيح خاصة (BYOK)', gate: 'البوابة 4: الفحص والجودة', status: 'فحص ثغرات الأمن', tokens: '4.7M', date: '13 أكتوبر 2026' },
                              { id: '#PRJ-9788', name: 'منصة التعليم التفاعلي للجامعات', owner: 'dean@edu-tech.jo', mode: 'مصنعنا المدار (100 د.أ)', gate: 'البوابة 1: المتطلبات', status: 'صياغة وثيقة الـ PRD', tokens: '0.6M', date: '12 أكتوبر 2026' },
                            ].map((proj, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900">{proj.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{proj.id}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-600 font-mono">{proj.owner}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${proj.mode.includes('مصنعنا') ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {proj.mode}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg text-[10px]">
                                    {proj.gate}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-slate-700 font-semibold">{proj.status}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 font-mono font-bold text-slate-700">{proj.tokens}</td>
                                <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">{proj.date}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => showToast(`معاينة بوابات المشروع: ${proj.name}`)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="معاينة تفاصيل المشروع">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تم تعليق تنفيذ المشروع مؤقتاً: ${proj.id}`)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition" title="إيقاف مؤقت">
                                      <Shield className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 3,428 مشروعاً برمجياً مسجلاً في المنصة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">686</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Billing & Subscriptions (Exact Stitch Design) */}
                {activeScreen === 'admin-billing' && (
                  <main className="p-8 space-y-6">
                    {/* Breadcrumb & Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>الإدارة المالية والفوترة</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الاشتراكات والمدفوعات</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة الاشتراكات والمدفوعات <span className="text-sm font-normal text-slate-500" dir="ltr">(Billing, Subscriptions & Gateways)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">مركز الرقابة المالية لإيرادات المنصة، اشتراكات BYOK الشهرية (50 د.أ)، دفعات مشاريع المصنع (100 د.أ)، وبوابات الدفع.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تصدير التقرير المالي والفواتير الضريبية (CSV / Excel)')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <Download className="w-4 h-4 text-orange-600" />
                          <span>تصدير السجل المالي (CSV / PDF)</span>
                        </button>
                        <button onClick={() => showToast('تم فتح نافذة إصدار فاتورة أو تفعيل اشتراك يدوي')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          <span>+ إصدار فاتورة / تفعيل رصيد يدوي</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Financial KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي الإيرادات الشهرية (MRR + Projects)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-slate-900">48,400</span>
                              <span className="text-xs font-bold text-orange-600">د.أ (JOD)</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          <span>+21.8% مقارنة بالشهر الماضي</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إيرادات اشتراكات BYOK الشهرية</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">19,000</span>
                              <span className="text-xs text-blue-600 font-bold">د.أ / شهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Key className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-bold text-slate-800">380 مشترك نشط</span>
                          <span>× 50 د.أ (تجديد تلقائي 94%)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عوائد مشاريع المصنع المدار (100 د.أ)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-slate-900">29,400</span>
                              <span className="text-xs text-purple-600 font-bold">د.أ هذا الشهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Cpu className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span className="font-bold text-slate-800">294 حزمة مشروع</span>
                          <span>مدفوعة بالكامل (100 د.أ / للمشروع)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">عمليات معلقة أو تحت الخطر (At Risk)</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-2xl font-black text-red-600">1,150</span>
                              <span className="text-xs text-red-600 font-bold">د.أ (18 عملية)</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-red-600 font-semibold">
                          <span>9 معاملات معلقة • 6 بطاقات منتهية • 3 استرداد</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Gateways Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: 'Stripe Connect Global', desc: 'البطاقات الائتمانية العالمية (Visa / Mastercard / Apple Pay)', status: 'متصل ومستقر', volume: '28,900 د.أ', txCount: '382 عملية', fee: '2.9% + 0.20 JOD' },
                        { name: 'Jordan PayHub & CliQ / eFAWATEERcom', desc: 'بوابة الدفع المحلية الأردنية والتحويل الفوري CliQ', status: 'متصل ومستقر', volume: '15,200 د.أ', txCount: '246 عملية', fee: '1.2% محلي' },
                        { name: 'التحويل البنكي المباشر للشركات', desc: 'حسابات الشركات والمؤسسات الحكومية (فواتير ضريبية)', status: 'مفعل (مراجعة يدوية)', volume: '4,300 د.أ', txCount: '46 عملية', fee: '0% عمولة بوابة' }
                      ].map((gw, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold text-slate-900">{gw.name}</h3>
                                <p className="text-[10px] text-slate-400">{gw.desc}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">● {gw.status}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">حجم التداول</span>
                              <span className="font-bold text-slate-900">{gw.volume}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">عدد الحركات</span>
                              <span className="font-bold text-slate-800">{gw.txCount}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">متوسط العمولة</span>
                              <span className="font-mono text-slate-600" dir="ltr">{gw.fee}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Search, Filter Selects & Quick View Tabs */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input type="text" placeholder="بحث برقم الفاتورة (#INV)، اسم العميل، البريد الإلكتروني، أو رقم المرجع البنكي..." className="w-full h-10 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <option>بوابة الدفع: الكل</option>
                            <option>Stripe Connect</option>
                            <option>Jordan PayHub / CliQ</option>
                            <option>تحويل بنكي للشركات</option>
                          </select>
                          <select className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <option>نوع الباقة: الكل</option>
                            <option>مصنعنا المدار (100 د.أ / مشروع)</option>
                            <option>اشتراك BYOK الشهري (50 د.أ)</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick View Tabs with Record Counts */}
                      <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs font-bold">
                        <button className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white shadow-xs">كافة العمليات (674)</button>
                        <button onClick={() => showToast('تصفية: المدفوعات الناجحة')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">المدفوعات المكتملة (656)</button>
                        <button onClick={() => showToast('تصفية: اشتراكات BYOK')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">اشتراكات BYOK الشهرية (380)</button>
                        <button onClick={() => showToast('تصفية: دفعات مشاريع المصنع')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">دفعات مشاريع المصنع (276)</button>
                        <button onClick={() => showToast('تصفية: العمليات المعلقة والمتعثرة')} className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700">معلقة / متعثرة (18)</button>
                      </div>
                    </div>

                    {/* Payments & Invoices Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">رقم الفاتورة / المرجع</th>
                              <th className="py-3.5 px-6">العميل / الجهة</th>
                              <th className="py-3.5 px-6">نوع الاشتراك / العملية</th>
                              <th className="py-3.5 px-6">بوابة وطريقة الدفع</th>
                              <th className="py-3.5 px-6">المبلغ الإجمالي</th>
                              <th className="py-3.5 px-6">حالة الدفع</th>
                              <th className="py-3.5 px-6">التاريخ والتوقيت</th>
                              <th className="py-3.5 px-6 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { inv: '#INV-2026-8841', ref: 'STRP_99281A', client: 'م. سارة فهد المنصور', email: 'sara.mansoor@almasar-logistics.com', plan: 'شحن مشروع - مصنعنا المدار', gateway: 'Stripe • Visa 4242', amount: '100.00 د.أ', status: 'مدفوعة', date: 'اليوم، 13:45' },
                              { inv: '#INV-2026-8840', ref: 'CLIQ_77412J', client: 'أحمد محمد الرواشدة', email: 'ahmed.r@al-rawnaq.com', plan: 'تجديد اشتراك BYOK الشهري', gateway: 'Jordan PayHub • CliQ', amount: '50.00 د.أ', status: 'مدفوعة', date: 'اليوم، 11:20' },
                              { inv: '#INV-2026-8839', ref: 'BNK_55209C', client: 'د. خالد إبراهيم عمر', email: 'dr.khaled@alshifa-clinics.jo', plan: 'حزمة 3 مشاريع - مصنعنا المدار', gateway: 'تحويل بنكي للشركات', amount: '300.00 د.أ', status: 'مدفوعة', date: 'أمس، 16:10' },
                              { inv: '#INV-2026-8838', ref: 'STRP_99104F', client: 'طارق زياد القضاة', email: 'tareq@afaq-properties.jo', plan: 'تجديد اشتراك BYOK الشهري', gateway: 'Stripe • Mastercard 8812', amount: '50.00 د.أ', status: 'فشل الدفع (بطاقة منتهية)', date: '15 أكتوبر 2026' },
                              { inv: '#INV-2026-8837', ref: 'EFW_33190B', client: 'ريم عبد الله الكردي', email: 'reem.k@natural-oasis.com', plan: 'شحن مشروع - مصنعنا المدار', gateway: 'إي فواتيركم (eFAWATEERcom)', amount: '100.00 د.أ', status: 'بانتظار التأكيد', date: '14 أكتوبر 2026' },
                            ].map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900 font-mono">{tx.inv}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{tx.ref}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900">{tx.client}</div>
                                  <div className="text-[11px] text-slate-400">{tx.email}</div>
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-800">{tx.plan}</td>
                                <td className="py-4 px-6 text-slate-600">{tx.gateway}</td>
                                <td className="py-4 px-6 font-black text-slate-900">{tx.amount}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    tx.status === 'مدفوعة' ? 'bg-emerald-50 text-emerald-700' :
                                    tx.status.includes('فشل') ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    ● {tx.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">{tx.date}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={() => showToast(`عرض الفاتورة الضريبية: ${tx.inv}`)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="عرض الفاتورة">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => showToast(`تحميل إيصال الدفع PDF: ${tx.inv}`)} className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition" title="تحميل PDF">
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                        <span>من أصل 674 عملية مالية وفاتورة مسجلة</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <span className="px-2 text-slate-400">...</span>
                        <button onClick={() => showToast('الانتقال للصفحة الأخيرة')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">135</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Usage & Costs Telemetry */}
                {activeScreen === 'admin-costs' && (
                  <main className="p-8 space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>مراقبة الموارد والتكاليف</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">الاستهلاك والتكاليف (Token Telemetry)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">الاستهلاك والتكاليف التشغيلية <span className="text-sm font-normal text-slate-500" dir="ltr">(AI Usage & Cost Analytics)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">مراقبة دقيقة لاستهلاك الرموز (Tokens)، تكاليف مفاتيح المصنع المدارة مقابل عوائد الـ 100 د.أ، وهوامش الربح لكل بوابة.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast('تم تحديث عدادات التوكنز والتكلفة الفورية')} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2">
                          <RefreshCcw className="w-4 h-4 text-orange-600" />
                          <span>مزامنة القياسات</span>
                        </button>
                        <button onClick={() => showToast('تم تصدير تقرير تكاليف المزودين (CSV)')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>تصدير تقرير التكاليف</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Cost & Margin KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">إجمالي استهلاك الرموز (Tokens)</span>
                            <div className="text-2xl font-black text-slate-900 mt-1" dir="ltr">148.6M</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <span>112.4M مصنع مدار • 36.2M مفاتيح BYOK</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">تكلفة مفاتيح المصنع الفعلية (API Cost)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-slate-900">1,840</span>
                              <span className="text-xs font-bold text-orange-600">د.أ / الشهر</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Database className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-600 font-semibold">
                          <span>ضمن السقف الائتماني المحدد (5,000 د.أ)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">متوسط تكلفة المشروع المدار (5 بوابات)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-2xl font-black text-emerald-600">6.25</span>
                              <span className="text-xs font-bold text-slate-500">د.أ / مشروع</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <PieChart className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-700 font-semibold">
                          <span>يباع بـ 100 د.أ (صافي ربح ~93.75 د.أ/مشروع)</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-slate-500">تنبيهات تجاوز السقف (Quota Alerts)</span>
                            <div className="text-2xl font-black text-amber-600 mt-1">4 مشاريع</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-700 font-semibold">
                          <span>تجاوزت 8M Tokens في البوابة الثالثة</span>
                        </div>
                      </div>
                    </div>

                    {/* Provider Cost Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { provider: 'Google Gemini Enterprise', gate: 'البوابة 1 و 5', tokens: '54.2M', cost: '410 د.أ', share: '22%' },
                        { provider: 'Anthropic Claude 3.5 Sonnet', gate: 'البوابة 2 (التصميم)', tokens: '38.9M', cost: '680 د.أ', share: '37%' },
                        { provider: 'OpenAI GPT-4o Enterprise', gate: 'البوابة 3 (البرمجة)', tokens: '34.1M', cost: '620 د.أ', share: '34%' },
                        { provider: 'Groq Cloud (Llama 3.3 70B)', gate: 'البوابة 4 (الفحص)', tokens: '21.4M', cost: '130 د.أ', share: '7%' }
                      ].map((p, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{p.provider}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700">{p.share}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{p.gate}</div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="font-mono text-slate-600">{p.tokens}</span>
                            <span className="font-black text-slate-900">{p.cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Telemetry Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">المشروع / العميل</th>
                              <th className="py-3.5 px-6">البوابة والوكيل</th>
                              <th className="py-3.5 px-6">المزود والنموذج</th>
                              <th className="py-3.5 px-6">رموز الإدخال / الإخراج</th>
                              <th className="py-3.5 px-6">مصدر المفتاح</th>
                              <th className="py-3.5 px-6">التكلفة الفعلية</th>
                              <th className="py-3.5 px-6 text-center">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { proj: 'منصة إدارة العيادات الطبية (#PRJ-9821)', gate: 'Gate 3 • وكيل البرمجة', model: 'gpt-4o-2024-11-20', tokens: '1.8M In / 1.6M Out', keyType: 'مفتاح المصنع المدار', cost: '2.45 د.أ', status: 'طبيعي' },
                              { proj: 'متجر الحرف اليدوية (#PRJ-9815)', gate: 'Gate 5 • وكيل التسليم', model: 'claude-3-5-sonnet', tokens: '3.1M In / 2.0M Out', keyType: 'مفتاح العميل (BYOK)', cost: '0.00 د.أ (على العميل)', status: 'طبيعي' },
                              { proj: 'نظام إدارة المخازن (#PRJ-9802)', gate: 'Gate 2 • وكيل التصميم', model: 'claude-3-5-sonnet', tokens: '0.8M In / 0.4M Out', keyType: 'مفتاح المصنع المدار', cost: '1.15 د.أ', status: 'طبيعي' },
                              { proj: 'تطبيق المحامي الذكي (#PRJ-9794)', gate: 'Gate 4 • وكيل الجودة', model: 'llama-3.3-70b', tokens: '2.9M In / 1.8M Out', keyType: 'مفتاح العميل (BYOK)', cost: '0.00 د.أ (على العميل)', status: 'طبيعي' },
                              { proj: 'بوابة العقارات الذكية (#PRJ-9760)', gate: 'Gate 3 • وكيل البرمجة', model: 'gpt-4o-2024-11-20', tokens: '5.4M In / 3.9M Out', keyType: 'مفتاح المصنع المدار', cost: '8.90 د.أ', status: 'مرتفع (تجاوز الحد)' },
                            ].map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6 font-bold text-slate-900">{row.proj}</td>
                                <td className="py-4 px-6 text-orange-700 font-semibold">{row.gate}</td>
                                <td className="py-4 px-6 font-mono text-slate-600" dir="ltr">{row.model}</td>
                                <td className="py-4 px-6 font-mono text-slate-700" dir="ltr">{row.tokens}</td>
                                <td className="py-4 px-6">{row.keyType}</td>
                                <td className="py-4 px-6 font-black text-slate-900">{row.cost}</td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${row.status === 'طبيعي' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span>عرض</span>
                        <select className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                          <option>5</option>
                          <option>10</option>
                          <option>25</option>
                        </select>
                        <span>من أصل 12,840 سجل استدعاء للوكلاء الذكيين</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <button onClick={() => showToast('الصفحة الأولى')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">السابق</button>
                        <button className="px-3 py-1.5 rounded-lg bg-orange-600 text-white shadow-xs">1</button>
                        <button onClick={() => showToast('الانتقال للصفحة 2')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">2</button>
                        <button onClick={() => showToast('الانتقال للصفحة 3')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">3</button>
                        <button onClick={() => showToast('الصفحة التالية')} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600">التالي</button>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Security & System Audit Log */}
                {activeScreen === 'admin-audit' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>الأمن والحوكمة</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">سجل النشاط والرقابة الأمنية (Audit Log)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">سجل النشاط والعمليات الرقابية <span className="text-sm font-normal text-slate-500" dir="ltr">(System & Security Audit Log)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">توثيق غير قابل للتعديل لكافة عمليات مسؤولي النظام، تعديلات مفاتيح المزودين، اعتمادات البوابات، وحركات الدخول.</p>
                      </div>
                      <button onClick={() => showToast('تم تصدير سجل الرقابة الأمني المشفر (JSON / CSV)')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>تصدير السجل الأمني</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                              <th className="py-3.5 px-6">معرف الحدث</th>
                              <th className="py-3.5 px-6">المنفذ / الحساب</th>
                              <th className="py-3.5 px-6">نوع العملية</th>
                              <th className="py-3.5 px-6">التفاصيل والمورد المتأثر</th>
                              <th className="py-3.5 px-6">عنوان IP</th>
                              <th className="py-3.5 px-6">مستوى الأهمية</th>
                              <th className="py-3.5 px-6">التوقيت</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                            {[
                              { id: 'AUD-99412', actor: 'admin@ogroup.ai (عبد الله المنصور)', action: 'تحديث نموذج وكيل البرمجة', target: 'Gate 3 -> gpt-4o-2024-11-20', ip: '185.22.14.88', level: 'عالي (إداري)', time: 'اليوم، 14:32' },
                              { id: 'AUD-99411', actor: 'sara.mansoor@almasar-logistics.com', action: 'اعتماد البوابة الثانية (Gate 2)', target: 'مشروع #PRJ-9802', ip: '94.249.12.10', level: 'اعتيادي', time: 'اليوم، 13:50' },
                              { id: 'AUD-99410', actor: 'admin@ogroup.ai (عبد الله المنصور)', action: 'تعليق حساب عميل لتجاوز السقف', target: 'tareq@afaq-properties.jo', ip: '185.22.14.88', level: 'حرج (أمني)', time: 'اليوم، 11:15' },
                              { id: 'AUD-99409', actor: 'System Cron / Stripe Webhook', action: 'تأكيد دفعة مشروع مدار (100 JOD)', target: 'فاتورة #INV-2026-8841', ip: '54.187.205.235', level: 'مالي', time: 'أمس، 22:04' },
                              { id: 'AUD-99408', actor: 'ahmed.r@al-rawnaq.com', action: 'تحديث مفتاح OpenAI BYOK مشفر', target: 'خزنة المفاتيح AES-256', ip: '176.29.44.19', level: 'أمني', time: 'أمس، 18:19' },
                            ].map((log, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition">
                                <td className="py-4 px-6 font-mono font-bold text-slate-900">{log.id}</td>
                                <td className="py-4 px-6 font-bold text-slate-800">{log.actor}</td>
                                <td className="py-4 px-6 text-orange-700 font-semibold">{log.action}</td>
                                <td className="py-4 px-6 text-slate-600">{log.target}</td>
                                <td className="py-4 px-6 font-mono text-slate-500" dir="ltr">{log.ip}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    log.level.includes('حرج') ? 'bg-red-50 text-red-700' :
                                    log.level.includes('عالي') || log.level.includes('أمني') ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.level}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono text-slate-500">{log.time}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </main>
                )}

                {/* Admin Screen: Platform System Settings */}
                {activeScreen === 'admin-settings' && (
                  <main className="p-8 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>لوحة التحكم الإدارية</span>
                          <span>/</span>
                          <span>التكوين المركزي</span>
                          <span>/</span>
                          <span className="text-orange-600 font-semibold">إعدادات النظام العامة (System Settings)</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">إعدادات النظام والسياسات التجارية <span className="text-sm font-normal text-slate-500" dir="ltr">(Platform & Commercial Settings)</span></h1>
                        <p className="text-xs text-slate-500 mt-1">ضبط تسعير الباقات، حدود استهلاك الرموز لكل بوابة، تشفير مفاتيح BYOK، وإعدادات البنية التحتية للمصنع.</p>
                      </div>
                      <button onClick={() => showToast('تم حفظ وتطبيق إعدادات النظام بنجاح')} className="px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md hover:bg-orange-700 transition flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>حفظ كافة الإعدادات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">التسعير والسياسات التجارية (Commercial Rules)</h3>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">سعر المشروع في وضع "مصنعنا المدار" (Build For Me)</label>
                            <input type="text" defaultValue="100 JOD" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">سعر الاشتراك الشهري لوضع "مفاتيحك الخاصة" (BYOK)</label>
                            <input type="text" defaultValue="50 JOD / شهر" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900" />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">السقف الأعلى لاستهلاك الرموز للمشروع المدار الواحد</label>
                            <input type="text" defaultValue="10,000,000 Tokens (10M)" className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">الأمان وحوكمة المفاتيح (Security & Key Vault)</h3>
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">تشفير مفاتيح العملاء BYOK بمعيار AES-256-GCM</div>
                              <div className="text-[11px] text-slate-500">عدم تخزين أي مفتاح بنص صريح في قاعدة البيانات</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">مفعل إجبارياً</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">إلزام المصادقة الثنائية (2FA) لحسابات الإدارة</div>
                              <div className="text-[11px] text-slate-500">حماية الدخول إلى بوابة admin@ogroup.ai</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">نشط</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800">الاعتماد الإلزامي للبوابات الخمس بالتسلسل</div>
                              <div className="text-[11px] text-slate-500">منع تجاوز أي بوابة دون ضغط زر الاعتماد من العميل</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">مفعل</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </main>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Top Global Navigation Bar for Customer */}
              <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
                <div className="flex items-center gap-3">
                  <div onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-800">OGroup AI Factory</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <nav className="flex items-center gap-2 text-xs font-semibold">
                    <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'dashboard' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      لوحة التحكم والمشاريع
                    </button>
                    <button onClick={() => setCurrentView('ai-connections')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'ai-connections' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      مفاتيح الذكاء الاصطناعي (BYOK)
                    </button>
                    <button onClick={() => setCurrentView('billing')} className={`px-3 py-1.5 rounded-lg transition ${currentView === 'billing' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      الاشتراكات والفوترة
                    </button>
                  </nav>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left rtl:text-right">
                    <span className="block text-xs font-bold text-slate-800">{userEmail || 'المستخدم'}</span>
                    <span className="block text-[10px] text-orange-600 font-semibold">رصيد المشاريع: {projectCredits} (100 JOD/مشروع)</span>
                  </div>
                  <button onClick={handleLogout} title="تسجيل الخروج" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* MAIN DASHBOARD VIEW */}
              {currentView === 'dashboard' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 inline-block mb-2">منصة البناء المباشر عبر 5 بوابات ذكية</span>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">مشاريعك البرمجية النشطة</h1>
                      <p className="text-xs text-slate-500 mt-1">أنشئ مشروعاً جديداً، تواصل مع الوكيل، راقب المخرجات، واعتمد كل بوابة بكل بساطة.</p>
                    </div>
                    <button onClick={() => setCurrentView('create-project')} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>+ إنشاء مشروع جديد</span>
                    </button>
                  </div>

                  {projects.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                        <FolderKanban className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">لا توجد مشاريع حتى الآن</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">حسابك جديد كلياً. انقر على زر "إنشاء مشروع جديد" لتبدأ رحلتك البرمجية عبر بوابات المصنع.</p>
                      <button onClick={() => setCurrentView('create-project')} className="px-6 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs">
                        أنشئ مشروعك الأول
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map((proj) => (
                        <div key={proj.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${proj.mode === 'managed' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                {proj.mode === 'managed' ? 'مصنعنا (100 JOD)' : 'مفاتيحك الخاصة (BYOK)'}
                              </span>
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                البوابة {proj.currentGate} / 5
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-800">{proj.name}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{proj.description}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">تاريخ الإنشاء: {proj.createdAt}</span>
                            <button 
                              onClick={() => { setActiveProjectId(proj.id); setCurrentView('gate-workspace'); }} 
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                            >
                              <span>فتح مساحة العمل</span>
                              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </main>
              )}

              {/* CREATE PROJECT VIEW */}
              {currentView === 'create-project' && (
                <main className="flex-1 p-8 flex items-center justify-center">
                  <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-bold text-slate-900">إنشاء مشروع برمجي جديد</h2>
                      <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-500 hover:text-slate-800 font-bold">✕ إغلاق</button>
                    </div>

                    <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">اسم المشروع البرمجي</label>
                        <input type="text" value={newProjName} onChange={e => setNewProjName(e.target.value)} placeholder="مثال: نظام إدارة المستشفيات" required className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800" />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">وصف المشروع أو الفكرة</label>
                        <textarea rows={3} value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} placeholder="اشرح فكرة التطبيق باختصار..." className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"></textarea>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-2">وضع التجارة وخدمة الذكاء الاصطناعي</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div 
                            onClick={() => setNewProjMode('managed')}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${newProjMode === 'managed' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className="font-bold text-slate-900 mb-1">مصنعنا (Build For Me)</div>
                            <div className="text-[10px] text-slate-500 mb-2">100 JOD / مشروع (يتطلب رصيد مشاريع)</div>
                            <span className="text-orange-600 font-bold text-[11px]">رصيدك الحالي: {projectCredits} مشروع</span>
                          </div>
                          <div 
                            onClick={() => setNewProjMode('byok')}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition ${newProjMode === 'byok' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className="font-bold text-slate-900 mb-1">مفاتيحك الخاصة (BYOK)</div>
                            <div className="text-[10px] text-slate-500 mb-2">50 JOD / شهر (تستخدم مفاتيح OpenAI أو Gemini الخاصة بك)</div>
                            <span className="text-blue-600 font-bold text-[11px]">الاشتراك النشط: مفعل</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setCurrentView('dashboard')} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
                          إلغاء
                        </button>
                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md transition">
                          إنشاء المشروع والبدء بالبوابة الأولى
                        </button>
                      </div>
                    </form>
                  </div>
                </main>
              )}

              {/* AI CONNECTIONS (BYOK) VIEW */}
              {currentView === 'ai-connections' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">إدارة مفاتيح وتوصيلات الذكاء الاصطناعي (BYOK)</h1>
                      <p className="text-xs text-slate-500 mt-1">تُشفر المفاتيح بمعيار AES-256-GCM وتُحفظ على الخادم بأمان دون كشفها في المتصفح.</p>
                    </div>
                    <button onClick={() => handleSaveByokConnection(byokProvider, byokModel, byokApiKey)} className="px-5 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md">
                      حفظ وتشفير الإعدادات
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { id: 'gemini', defaultModel: 'gemini-3.8-flash', name: 'Google Gemini Enterprise', desc: 'أحدث نماذج جيميناي (Gemini 3.8 Flash / Gemini 3.1 Pro)', icon: <Sparkles className="w-5 h-5 text-orange-600" /> },
                      { id: 'openai', defaultModel: 'gpt-4o-2024-11-20', name: 'OpenAI Platform (GPT-4o / o3)', desc: 'نماذج GPT-4o و o3-mini و o1', icon: <Bot className="w-5 h-5 text-emerald-600" /> },
                      { id: 'anthropic', defaultModel: 'claude-3-7-sonnet', name: 'Anthropic Claude Direct', desc: 'نماذج Claude 3.7 Sonnet و Claude 3.5 Sonnet', icon: <Layers className="w-5 h-5 text-purple-600" /> },
                      { id: 'groq', defaultModel: 'llama-3.3-70b-versatile', name: 'Groq Cloud LPU', desc: 'استدلال فائق السرعة عبر Llama 3.3 70B', icon: <Zap className="w-5 h-5 text-blue-600" /> },
                      { id: 'deepseek', defaultModel: 'deepseek-chat', name: 'DeepSeek AI (V3 / R1)', desc: 'نماذج البرمجة والاستدلال DeepSeek V3 & R1', icon: <Code2 className="w-5 h-5 text-indigo-600" /> },
                      { id: 'mistral', defaultModel: 'codestral-latest', name: 'Mistral & Codestral', desc: 'نماذج Codestral و Mistral Large', icon: <Cpu className="w-5 h-5 text-amber-600" /> },
                      { id: 'xai', defaultModel: 'grok-3', name: 'xAI Grok Platform', desc: 'نماذج Grok-3 و Grok-2', icon: <Network className="w-5 h-5 text-slate-800" /> },
                      { id: 'openrouter', defaultModel: 'openrouter/auto', name: 'OpenRouter / Custom AI', desc: 'بوابة موحدة لكافة نماذج الذكاء الاصطناعي العالمية', icon: <Key className="w-5 h-5 text-rose-600" /> },
                    ].map(prov => {
                      const savedConn = savedByokConnections.find(c => c.provider === prov.id);
                      const isActiveProv = savedConn ? savedConn.active : byokProvider === prov.id;
                      return (
                        <div key={prov.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                                {prov.icon}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-sm">{prov.name}</h3>
                                <p className="text-[11px] text-slate-400">{prov.desc}</p>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isActiveProv ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {isActiveProv ? 'المزود النشط' : 'متاح للربط'}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <label className="block font-bold text-slate-700">النموذج المعتمد ({prov.id})</label>
                            <input
                              type="text"
                              value={byokProvider === prov.id ? byokModel : savedConn?.model || prov.defaultModel}
                              onChange={e => {
                                setByokProvider(prov.id);
                                setByokModel(e.target.value);
                              }}
                              dir="ltr"
                              className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                            />
                            <label className="block font-bold text-slate-700">
                              مفتاح API المشفر {savedConn?.hasKey ? `(محفوظ: ${savedConn.maskedKey})` : ''}
                            </label>
                            <input
                              type="password"
                              placeholder={savedConn?.hasKey ? 'أدخل مفتاحاً جديداً لتحديث المفتاح المشفر...' : 'أدخل مفتاح الـ API هنا...'}
                              value={byokProvider === prov.id ? byokApiKey : ''}
                              onChange={e => {
                                setByokProvider(prov.id);
                                if (byokProvider !== prov.id) setByokModel(savedConn?.model || prov.defaultModel);
                                setByokApiKey(e.target.value);
                              }}
                              dir="ltr"
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                            />
                          </div>

                          <div className="flex items-center justify-end pt-2">
                            <button
                              onClick={() =>
                                handleSaveByokConnection(
                                  prov.id,
                                  byokProvider === prov.id ? byokModel : savedConn?.model || prov.defaultModel,
                                  byokProvider === prov.id ? byokApiKey : ''
                                )
                              }
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition"
                            >
                              حفظ وتفعيل المزود
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </main>
              )}

              {/* BILLING & SUBSCRIPTION VIEW */}
              {currentView === 'billing' && (
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">الاشتراكات والفوترة والمدفوعات (Billing & Plans)</h1>
                      <p className="text-xs text-slate-500 mt-1">اختر البناء الفوري لكل مشروع (100 JOD) أو الاشتراك الشهري للباقة الشاملة (50 JOD/شهر).</p>
                    </div>
                    <div className="text-left rtl:text-right">
                      <span className="block text-xs text-slate-400">رصيدك الحالي</span>
                      <span className="text-xl font-black text-orange-600">{projectCredits} مشاريع</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border-2 border-orange-500 rounded-3xl p-8 shadow-md space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">الخيار الأول • الأكثر طلباً</span>
                        <h3 className="text-xl font-black text-slate-900">مصنعنا المدار (Build For Me)</h3>
                        <div className="text-3xl font-black text-orange-600">100 JOD <span className="text-xs text-slate-500 font-normal">/ لكل مشروع</span></div>
                        <p className="text-xs text-slate-500 leading-relaxed">ندير كافة مفاتيح وخوادم الذكاء الاصطناعي نيابة عنك. تدفع فقط مقابل المشاريع التي تنجزها دون اشتراكات شهرية.</p>
                        <ul className="space-y-2 text-xs text-slate-700">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> لا تحتاج لأي مفاتيح API</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> دعم كامل للبوابات الخمس</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> توليد الكود والمساعد الذكي متضمن</li>
                        </ul>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!sessionToken) return;
                          const res = await fetch('/api/entitlements', {
                            method: 'POST',
                            headers: authHeaders(),
                            body: JSON.stringify({ addProjectCredits: 1 }),
                          });
                          const data = await res.json();
                          if (res.ok && data.user) {
                            setProjectCredits(data.user.projectCredits);
                            showToast('تم شحن رصيد مشروع جديد بنجاح (+1)');
                          }
                        }}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                      >
                        شحن رصيد مشروع جديد (100 JOD)
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">الخيار الثاني • للمطورين</span>
                        <h3 className="text-xl font-black text-slate-900">البناء بمفاتيحك الخاصة (BYOK)</h3>
                        <div className="text-3xl font-black text-blue-600">50 JOD <span className="text-xs text-slate-500 font-normal">/ شهرياً</span></div>
                        <p className="text-xs text-slate-500 leading-relaxed">استخدم مفاتيحك الخاصة لـ OpenAI و Gemini و Anthropic واستفادة كاملة من منصة البناء عبر البوابات الخمس.</p>
                        <ul className="space-y-2 text-xs text-slate-700">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> مشاريع غير محدودة ضمن سياسة الاستخدام العادل</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> ربط مفاتيح OpenAI و Claude و Gemini</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> دعم فني أولوية</li>
                        </ul>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!sessionToken) return;
                          const res = await fetch('/api/entitlements', {
                            method: 'POST',
                            headers: authHeaders(),
                            body: JSON.stringify({ subscriptionActive: true }),
                          });
                          const data = await res.json();
                          if (res.ok && data.user) {
                            setSubscriptionActive(data.user.subscriptionActive);
                            showToast('تم تفعيل اشتراك BYOK الشهري بنجاح');
                          }
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                      >
                        {subscriptionActive ? 'الاشتراك مفعل حالياً' : 'تفعيل اشتراك 50 JOD / شهرياً'}
                      </button>
                    </div>
                  </div>
                </main>
              )}

              {/* GATE WORKSPACE (1 CHAT ON VISUAL LEFT + 1 LIVE WORKSPACE ON VISUAL RIGHT + 1 APPROVAL BUTTON) */}
              {currentView === 'gate-workspace' && activeProject && (
                <main className="flex-1 flex flex-col overflow-hidden">
                  {/* Gate Subheader */}
                  <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentView('dashboard')} className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1">
                        <ChevronRight className="w-4 h-4" />
                        <span>العودة للمشاريع</span>
                      </button>
                      <span className="text-slate-300">|</span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">{activeProject.name}</h2>
                        <span className="text-[11px] text-orange-600 font-semibold">
                          البوابة الحالية: {activeProject.currentGate} من 5 • الإصدار المحفوظ: v
                          {activeProject.currentGate === 1
                            ? gate1Version
                            : activeProject.currentGate === 2
                            ? gate2Version
                            : activeProject.currentGate === 3
                            ? gate3Version
                            : activeProject.currentGate === 4
                            ? gate4Version
                            : gate5Version}
                          {(activeProject.currentGate === 1 && gate1Locked) ||
                          (activeProject.currentGate === 2 && gate2Locked) ||
                          (activeProject.currentGate === 3 && gate3Locked) ||
                          (activeProject.currentGate === 4 && gate4Locked) ||
                          (activeProject.currentGate === 5 && gate5Locked)
                            ? ' (معتمد ومقفل)'
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((gNum) => {
                        const isApproved =
                          gNum === 1
                            ? gate1Locked || Boolean(activeProject.gate1Approved) || Boolean(gateApprovals[1])
                            : Boolean(gateApprovals[gNum]);
                        const prevApproved =
                          gNum === 1
                            ? true
                            : gNum === 2
                            ? gate1Locked || Boolean(activeProject.gate1Approved) || Boolean(gateApprovals[1])
                            : Boolean(gateApprovals[gNum - 1]);
                        return (
                          <button
                            key={gNum}
                            type="button"
                            onClick={() => {
                              if (gNum > 1 && !prevApproved) {
                                showToast(`لا يمكن الانتقال للبوابة ${gNum} قبل اعتماد البوابة ${gNum - 1} السابقة.`);
                                return;
                              }
                              setProjects(prev => prev.map(p => (p.id === activeProject.id ? { ...p, currentGate: gNum } : p)));
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              activeProject.currentGate === gNum
                                ? 'bg-orange-600 text-white shadow-xs'
                                : activeProject.currentGate > gNum || isApproved
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span>بوابة {gNum}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      onClick={handleApproveAndAdvance}
                      disabled={gate1Approving || isAiProcessing || gate4Repairing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {gate1Approving
                          ? 'جاري التحقق واعتماد البوابة...'
                          : activeProject.currentGate === 5
                          ? 'اعتماد وتسليم المشروع نهائياً'
                          : 'اعتماد البوابة والانتقال للتالية (Approve & Continue)'}
                      </span>
                    </button>
                  </div>

                  {/* Two-Column Workspace: flex-row-reverse in RTL keeps Chat on visual LEFT and Requirements Document on visual RIGHT */}
                  <div className="flex-1 flex flex-row-reverse overflow-hidden">
                    {/* VISUAL LEFT PANEL: CHAT WITH AGENT */}
                    <div className="w-5/12 border-r border-slate-200 bg-white flex flex-col justify-between">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                        {(() => {
                          const currentAgent = factoryAgents.find(a => a.gate === activeProject.currentGate) || factoryAgents[0];
                          const defaultRunPrompts: Record<number, string> = {
                            1: `أريد نظام إدارة متكامل لمشروع "${activeProject.name}": ${activeProject.description}`,
                            2: `قم بتوليد وتحديث تصميم الواجهات التفاعلية والشاشات لمشروع "${activeProject.name}" استناداً إلى وثيقة المتطلبات المعتمدة.`,
                            3: `قم بكتابة وتوليد كود المكونات البرمجية الكاملة لمشروع "${activeProject.name}" استناداً إلى المتطلبات والتصميم المعتمد.`,
                            4: `قم بإجراء فحص شامل للجودة والأمان ومطابقة المتطلبات (QA & Security Verification) لمشروع "${activeProject.name}".`,
                            5: `قم بإعداد وتوليد حزمة التسليم النهائية وملفات التشغيل والوثائق لمشروع "${activeProject.name}".`,
                          };
                          const actionLabels: Record<number, string> = {
                            1: 'توليد المتطلبات',
                            2: 'توليد التصميم',
                            3: 'توليد الكود',
                            4: 'تشغيل الفحص',
                            5: 'توليد حزمة التسليم',
                          };
                          const isCurrentGateLocked =
                            (activeProject.currentGate === 1 && gate1Locked) ||
                            (activeProject.currentGate === 2 && gate2Locked) ||
                            (activeProject.currentGate === 3 && gate3Locked) ||
                            (activeProject.currentGate === 4 && gate4Locked) ||
                            (activeProject.currentGate === 5 && gate5Locked);
                          return (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                                  <Bot className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-xs font-bold text-slate-800 truncate">{currentAgent.title}</h3>
                                  <span className="text-[10px] text-emerald-600 font-semibold block truncate">
                                    نشط في البوابة {activeProject.currentGate} · وضع المشروع: {activeProject.mode === 'byok' ? 'BYOK (مفاتيحك الخاصة)' : 'Build For Me (مدار)'}
                                  </span>
                                </div>
                              </div>
                              {!isCurrentGateLocked && (
                                <button
                                  type="button"
                                  disabled={isAiProcessing || gate4Repairing}
                                  onClick={() => executeStageAgentPrompt(defaultRunPrompts[activeProject.currentGate])}
                                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs transition shrink-0 flex items-center gap-1.5"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>{actionLabels[activeProject.currentGate]}</span>
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Actionable Error Alert if AI request or validation fails */}
                      {gate1ErrorBanner && (
                        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                            <div>
                              <span className="font-bold block">فشل العملية:</span>
                              <span>{gate1ErrorBanner}</span>
                            </div>
                          </div>
                          <button onClick={() => setGate1ErrorBanner(null)} className="text-red-500 hover:text-red-800 font-bold">✕</button>
                        </div>
                      )}

                      {/* Chat Messages */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {(chatMessages[activeProject.currentGate] || []).map((msg) => (
                          <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${msg.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-700'}`}>
                              {msg.sender === 'user' ? 'أنت' : 'AI'}
                            </div>
                            <div className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-orange-600 text-white rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tr-none'}`}>
                              {msg.text}
                              <div className={`text-[9px] mt-1 flex items-center justify-between gap-2 ${msg.sender === 'user' ? 'text-orange-200' : 'text-slate-400'}`}>
                                <span>{msg.meta || ''}</span>
                                <span>{msg.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(isAiProcessing || gate4Repairing) && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-orange-50/60 rounded-xl border border-orange-100">
                            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                            <span>
                              {gate4Repairing
                                ? 'جاري إصلاح الكود تلقائياً عبر البوابة 3 وإعادة تشغيل فحوصات البوابة 4...'
                                : `وكيل البوابة ${activeProject.currentGate} يقوم بمعالجة طلبك وتحديث المخرجات...`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                        <input
                          type="text"
                          disabled={
                            isAiProcessing ||
                            gate4Repairing ||
                            (activeProject.currentGate === 1 && gate1Locked)
                          }
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder={
                            activeProject.currentGate === 1 && gate1Locked
                              ? 'تم اعتماد وقفل وثيقة البوابة الأولى'
                              : `اكتب توجيهك لوكيل البوابة ${activeProject.currentGate}...`
                          }
                          className="flex-1 h-11 px-4 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={
                            isAiProcessing ||
                            gate4Repairing ||
                            (activeProject.currentGate === 1 && gate1Locked)
                          }
                          className="w-11 h-11 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow-md transition shrink-0"
                        >
                          <Send className="w-4 h-4 rotate-180" />
                        </button>
                      </form>
                    </div>

                    {/* VISUAL RIGHT PANEL: LIVE DELIVERABLE WORKSPACE */}
                    <div className="w-7/12 bg-slate-100/80 flex flex-col overflow-y-auto p-5 space-y-4">
                      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">مساحة العمل الحية • Live Deliverable</span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono" dir="ltr">
                              Version v
                              {activeProject.currentGate === 1
                                ? gate1Version
                                : activeProject.currentGate === 2
                                ? gate2Version
                                : activeProject.currentGate === 3
                                ? gate3Version
                                : activeProject.currentGate === 4
                                ? gate4Version
                                : gate5Version}
                            </span>
                            {((activeProject.currentGate === 1 && gate1Locked) ||
                              (activeProject.currentGate === 2 && gate2Locked) ||
                              (activeProject.currentGate === 3 && gate3Locked) ||
                              (activeProject.currentGate === 4 && gate4Locked) ||
                              (activeProject.currentGate === 5 && gate5Locked)) && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>معتمد ومقفل</span>
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">
                            {activeProject.currentGate === 1 && 'وثيقة متطلبات المنتج المهيكلة (Structured PRD Document)'}
                            {activeProject.currentGate === 2 && 'بوابة التصميم والواجهات المهيكلة (Gate 2 Design Artifact & Live Preview)'}
                            {activeProject.currentGate === 3 && 'مستودع الكود المصدري والمعاينة الحية (Gate 3 Code Generation & Preview)'}
                            {activeProject.currentGate === 4 && 'تقرير فحص الجودة والأمان وحلقة الإصلاح (Gate 4 QA & Security Verification)'}
                            {activeProject.currentGate === 5 && 'حزمة التسليم النهائية والتحميل (Gate 5 Final Delivery Package)'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeProject.currentGate === 1 && (
                            <>
                              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setGate1EditorTab('structured')}
                                  className={`px-2.5 py-1 rounded-lg transition ${gate1EditorTab === 'structured' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                                >
                                  الأقسام المهيكلة (12)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGate1EditorTab('markdown')}
                                  className={`px-2.5 py-1 rounded-lg transition ${gate1EditorTab === 'markdown' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                                >
                                  المحرر النصي الكامل
                                </button>
                              </div>
                              {!gate1Locked && (
                                <button
                                  type="button"
                                  disabled={gate1SavingManual}
                                  onClick={handleSaveGate1ManualEdits}
                                  className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{gate1SavingManual ? 'جاري الحفظ...' : 'حفظ التعديلات اليدوية'}</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* GATE 1 STRUCTURED & MANUAL DOCUMENT EDITOR */}
                      {activeProject.currentGate === 1 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1">
                          {gate1EditorTab === 'structured' && gate1Document ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">1. اسم المشروع (Project Name)</label>
                                  <input
                                    type="text"
                                    disabled={gate1Locked}
                                    value={gate1Document.projectName}
                                    onChange={e => {
                                      const nextDoc = { ...gate1Document, projectName: e.target.value };
                                      setGate1Document(nextDoc);
                                      setGate1Markdown(formatRequirementsToMarkdown(nextDoc));
                                      setGate1Dirty(true);
                                    }}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <div className="w-full p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-[11px] text-slate-600 flex items-center justify-between">
                                    <span>حالة الوثيقة: {gate1Dirty ? 'تعديلات يدوية غير محفوظة' : `محفوظة في قاعدة البيانات (v${gate1Version})`}</span>
                                    {gate1Dirty && !gate1Locked && (
                                      <button
                                        type="button"
                                        onClick={handleSaveGate1ManualEdits}
                                        className="text-orange-700 font-bold underline"
                                      >
                                        حفظ الآن
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">2. نظرة عامة (Overview)</label>
                                <textarea
                                  rows={2}
                                  disabled={gate1Locked}
                                  value={gate1Document.overview}
                                  onChange={e => {
                                    const nextDoc = { ...gate1Document, overview: e.target.value };
                                    setGate1Document(nextDoc);
                                    setGate1Markdown(formatRequirementsToMarkdown(nextDoc));
                                    setGate1Dirty(true);
                                  }}
                                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {REQUIREMENTS_SECTIONS.filter(s => s.isList).map((sec, idx) => {
                                  const listVal = (gate1Document[sec.key] as string[]) || [];
                                  return (
                                    <div key={sec.key} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800">
                                          {idx + 3}. {sec.labelAr} ({sec.labelEn})
                                        </label>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                          {listVal.length} عناصر
                                        </span>
                                      </div>
                                      <textarea
                                        rows={4}
                                        disabled={gate1Locked}
                                        value={listVal.join('\n')}
                                        onChange={e => {
                                          const items = e.target.value
                                            .split('\n')
                                            .map(line => line.replace(/^[-*•]\s*/, '').trim())
                                            .filter(Boolean);
                                          const nextDoc = {
                                            ...gate1Document,
                                            [sec.key]: items,
                                          };
                                          setGate1Document(nextDoc);
                                          setGate1Markdown(formatRequirementsToMarkdown(nextDoc));
                                          setGate1Dirty(true);
                                        }}
                                        placeholder="عنصر واحد في كل سطر..."
                                        className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <textarea
                              disabled={gate1Locked}
                              value={gate1Markdown}
                              onChange={e => {
                                const updatedVal = e.target.value;
                                setGate1Markdown(updatedVal);
                                if (gate1Document) {
                                  const parsed = parseMarkdownToRequirements(updatedVal, gate1Document);
                                  setGate1Document(parsed);
                                }
                                setGate1Dirty(true);
                              }}
                              className="w-full h-[520px] p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                          )}
                          <p className="text-[11px] text-slate-400">
                            يمكنك تعديل أي قسم من أقسام وثيقة المتطلبات يدوياً وحفظه، أو طلب التعديل عبر المحادثة مع وكيل المتطلبات في اللوحة اليسرى.
                          </p>
                        </div>
                      )}

                      {activeProject.currentGate === 2 && (() => {
                        const themeMap = {
                          orange: {
                            primaryBg: 'bg-orange-600',
                            primaryHover: 'hover:bg-orange-700',
                            lightBg: 'bg-orange-50',
                            lightText: 'text-orange-700',
                            borderAccent: 'border-orange-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          blue: {
                            primaryBg: 'bg-blue-600',
                            primaryHover: 'hover:bg-blue-700',
                            lightBg: 'bg-blue-50',
                            lightText: 'text-blue-700',
                            borderAccent: 'border-blue-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          emerald: {
                            primaryBg: 'bg-emerald-600',
                            primaryHover: 'hover:bg-emerald-700',
                            lightBg: 'bg-emerald-50',
                            lightText: 'text-emerald-700',
                            borderAccent: 'border-emerald-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          violet: {
                            primaryBg: 'bg-violet-600',
                            primaryHover: 'hover:bg-violet-700',
                            lightBg: 'bg-violet-50',
                            lightText: 'text-violet-700',
                            borderAccent: 'border-violet-200',
                            canvasBg: 'bg-slate-50 text-slate-800',
                            cardBg: 'bg-white border-slate-200 text-slate-800',
                          },
                          dark: {
                            primaryBg: 'bg-orange-500',
                            primaryHover: 'hover:bg-orange-600',
                            lightBg: 'bg-slate-800',
                            lightText: 'text-orange-400',
                            borderAccent: 'border-slate-700',
                            canvasBg: 'bg-slate-950 text-slate-100',
                            cardBg: 'bg-slate-900 border-slate-800 text-slate-100',
                          },
                        }[stitchTheme];

                        const viewportWidthClass =
                          stitchViewport === 'mobile'
                            ? 'max-w-[390px] mx-auto'
                            : stitchViewport === 'tablet'
                            ? 'max-w-[680px] mx-auto'
                            : 'w-full';

                        return (
                          <div className="flex-1 flex flex-col space-y-3">
                            {/* Approved Gate 1 Artifact Banner preserved for Gate 2 */}
                            {gate1ApprovedArtifact && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-900">
                                      وثيقة المتطلبات المعتمدة والمقفلة من البوابة الأولى (الإصدار المعتمد v{gate1ApprovedArtifact.approvedVersion})
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-700" dir="ltr">
                                    {gate1ApprovedArtifact.approvedAt}
                                  </span>
                                </div>
                                <div className="text-xs text-emerald-800">
                                  <strong>{gate1ApprovedArtifact.document.projectName}:</strong> {gate1ApprovedArtifact.document.overview}
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {gate1ApprovedArtifact.document.features.map((feat, i) => (
                                    <span key={i} className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-[11px] text-emerald-900 font-semibold">
                                      ✓ {feat}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Real Persisted Gate 2 Design Artifact Viewer & Live HTML Preview */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">
                                    مخرجات وكيل التصميم المهيكلة (Persisted Design Artifact {gate2Version > 0 ? `• v${gate2Version}` : '• لم يتم التوليد بعد'})
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    {gate2Design
                                      ? `${gate2Design.designSummary} (${gate2Design.screens.length} شاشات مهيكلة، ${gate2Design.components.length} مكونات)`
                                      : 'اضغط على "توليد التصميم" لتحويل المتطلبات المعتمدة في البوابة 1 إلى شاشات وتصاميم حقيقية محفوظة في قاعدة البيانات.'}
                                  </p>
                                </div>
                                {!gate2Locked && (
                                  <button
                                    type="button"
                                    disabled={isAiProcessing}
                                    onClick={() =>
                                      executeStageAgentPrompt(
                                        `قم بتوليد وتحديث تصميم الواجهات التفاعلية والشاشات لمشروع "${activeProject.name}" استناداً إلى وثيقة المتطلبات المعتمدة.`
                                      )
                                    }
                                    className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{gate2Design ? 'تحديث التصميم بالذكاء الاصطناعي' : 'توليد التصميم من المتطلبات المعتمدة'}</span>
                                  </button>
                                )}
                              </div>

                              {gate2Design && gate2Design.screens.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {gate2Design.screens.map((scr, sIdx) => {
                                      const isSelected = (gate2ActiveScreenId || gate2Design.screens[0].id) === scr.id;
                                      return (
                                        <button
                                          key={scr.id}
                                          type="button"
                                          onClick={() => setGate2ActiveScreenId(scr.id)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            isSelected
                                              ? 'bg-orange-600 text-white shadow-2xs'
                                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                          }`}
                                        >
                                          {sIdx + 1}. {scr.name} ({scr.route})
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {(() => {
                                    const activeScr =
                                      gate2Design.screens.find(s => s.id === gate2ActiveScreenId) || gate2Design.screens[0];
                                    if (!activeScr) return null;
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                          <div>
                                            <span className="font-bold text-slate-900">{activeScr.name}: </span>
                                            <span className="text-slate-600">{activeScr.summary}</span>
                                          </div>
                                          <span className="font-mono text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded" dir="ltr">
                                            Route: {activeScr.route} • Role: {activeScr.primaryRole}
                                          </span>
                                        </div>
                                        <div className="rounded-2xl border border-slate-300 overflow-hidden bg-white h-[360px]">
                                          <iframe
                                            title={`gate2-preview-${activeScr.id}`}
                                            srcDoc={activeScr.htmlContent}
                                            sandbox="allow-scripts"
                                            className="w-full h-full border-0"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Stitch Studio Screen Tabs & Theme Bar */}
                            <div className="bg-white rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('landing')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    stitchScreenTab === 'landing'
                                      ? 'bg-orange-600 text-white shadow-xs'
                                      : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>1. الصفحة الرئيسية (Landing Page)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('dashboard')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  2. لوحة المواعيد الرئيسية
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('booking')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'booking' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  3. نموذج الحجز الفوري
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('portal')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'portal' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  4. بوابة العقارات والعملاء
                                </button>

                                {/* Dynamically Added Pages from Gate 2 Chat */}
                                {stitchCustomPages.map((cp, idx) => (
                                  <div key={cp.id} className="inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => setStitchScreenTab(cp.id)}
                                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                        stitchScreenTab === cp.id
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                    >
                                      <span>{idx + 5}. ✨ {cp.title}</span>
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => setStitchScreenTab('code')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                    stitchScreenTab === 'code' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  كود الواجهة (Tailwind)
                                </button>
                              </div>

                              {/* Live Color Palette Dots */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400 font-semibold ml-1">الألوان:</span>
                                {([
                                  { id: 'orange', color: 'bg-orange-500', label: 'برتقالي' },
                                  { id: 'blue', color: 'bg-blue-600', label: 'أزرق' },
                                  { id: 'emerald', color: 'bg-emerald-600', label: 'زمردي' },
                                  { id: 'violet', color: 'bg-violet-600', label: 'بنفسجي' },
                                  { id: 'dark', color: 'bg-slate-900', label: 'داكن' },
                                ] as const).map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    title={t.label}
                                    onClick={() => setStitchTheme(t.id)}
                                    className={`w-5 h-5 rounded-full ${t.color} transition ${
                                      stitchTheme === t.id ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* LIVE INTERACTIVE STITCH CANVAS WINDOW */}
                            <div className={`${viewportWidthClass} flex-1 rounded-3xl border-2 border-slate-300/90 shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${themeMap.canvasBg}`}>
                              {/* Simulated Browser Top Bar */}
                              <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between text-[11px] border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                  <span className="mr-2 font-bold text-white">{activeProject.name}</span>
                                </div>
                                <div className="px-3 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px]" dir="ltr">
                                  stitch://live-canvas/{activeProject.id}/{stitchScreenTab}
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold">● معاينة حية تفاعلية (RTL)</span>
                              </div>

                              {/* Inner Designed Application Header / Sticky Navbar */}
                              <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${themeMap.cardBg}`}>
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-9 h-9 rounded-xl ${themeMap.primaryBg} text-white flex items-center justify-center font-black text-sm shadow-xs`}>
                                    عقار
                                  </div>
                                  <div>
                                    <div className="font-black text-xs">{activeProject.name}</div>
                                    <div className="text-[10px] opacity-60">{activeProject.designNotes}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('landing')}
                                    className={`transition ${stitchScreenTab === 'landing' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    الرئيسية
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('portal')}
                                    className={`transition ${stitchScreenTab === 'portal' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    العقارات المتاحة
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('dashboard')}
                                    className={`transition ${stitchScreenTab === 'dashboard' ? themeMap.lightText : 'opacity-65 hover:opacity-100'}`}
                                  >
                                    جدول المواعيد
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStitchScreenTab('booking')}
                                    className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-bold shadow-xs transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                  >
                                    + حجز موعد معاينة جديد
                                  </button>
                                </div>
                              </div>

                              {/* TAB 0: LANDING PAGE (الصفحة الرئيسية - LANDING PAGE) */}
                              {stitchScreenTab === 'landing' && (
                                <div className="flex-1 overflow-y-auto space-y-5 p-5">
                                  {/* Luxury Real Estate Hero Banner (#0F172A Slate-900 + Gold/Brand Accent) */}
                                  <div className="rounded-3xl bg-slate-900 text-white p-6 md:p-7 relative overflow-hidden shadow-md border border-slate-800">
                                    <div className="relative z-10 space-y-4">
                                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                                        <span>✨ الصفحة الرئيسية (Landing Page) • مصممة بواسطة Google Stitch</span>
                                      </div>
                                      <h2 className="text-xl md:text-2xl font-black leading-snug">
                                        احجز موعد معاينتك العقارية القادمة <span className="text-amber-400">في 60 ثانية</span>
                                      </h2>
                                      <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                                        منصة متكاملة لمعاينة الفلل السكنية، الشقق الطابقية، والمكاتب التجارية الفاخرة مع نخبة المستشارين العقاريين وتأكيد فوري للموعد عبر الواتساب وSMS.
                                      </p>

                                      {/* Interactive Quick Search & Instant Booking Bar inside Hero */}
                                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs pt-3">
                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">المنطقة / الموقع</label>
                                          <select
                                            value={stitchHeroLocation}
                                            onChange={e => setStitchHeroLocation(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="دابوق - عمان" className="text-slate-900">دابوق - عمان</option>
                                            <option value="عبدون الشمالي" className="text-slate-900">عبدون الشمالي</option>
                                            <option value="العبدلي بوليفارد" className="text-slate-900">العبدلي بوليفارد</option>
                                            <option value="طريق المطار - غمدان" className="text-slate-900">طريق المطار - غمدان</option>
                                          </select>
                                        </div>

                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">نوع العقار المطلوب</label>
                                          <select
                                            value={stitchHeroType}
                                            onChange={e => setStitchHeroType(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="فيلا سكنية مستقلة" className="text-slate-900">فيلا سكنية مستقلة</option>
                                            <option value="شقة طابقية فاخرة" className="text-slate-900">شقة طابقية فاخرة</option>
                                            <option value="مكاتب تجارية ذكية" className="text-slate-900">مكاتب تجارية ذكية</option>
                                            <option value="أرض استثمارية" className="text-slate-900">أرض استثمارية</option>
                                          </select>
                                        </div>

                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                                          <label className="block text-[10px] text-slate-400 mb-1">الفترة المفضلة للمعاينة</label>
                                          <select
                                            value={stitchSelectedSlot}
                                            onChange={e => setStitchSelectedSlot(e.target.value)}
                                            className="w-full bg-transparent text-white font-bold text-xs focus:outline-none"
                                          >
                                            <option value="09:30 صباحاً" className="text-slate-900">09:30 صباحاً</option>
                                            <option value="11:00 صباحاً" className="text-slate-900">11:00 صباحاً</option>
                                            <option value="01:00 ظهراً" className="text-slate-900">01:00 ظهراً</option>
                                            <option value="03:30 مساءً" className="text-slate-900">03:30 مساءً</option>
                                            <option value="05:00 مساءً" className="text-slate-900">05:00 مساءً</option>
                                          </select>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStitchBookingService(`${stitchHeroType} - ${stitchHeroLocation}`);
                                            setStitchScreenTab('booking');
                                            showToast(`تم اختيار "${stitchHeroType} - ${stitchHeroLocation}" للانتقال إلى الحجز الفوري`);
                                          }}
                                          className={`rounded-xl font-black text-xs text-white shadow-md transition flex items-center justify-center gap-1.5 py-3 ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                        >
                                          <span>احجز موعد المعاينة الآن</span>
                                          <span>←</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Trust & Real Estate Metrics Strip */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    {[
                                      { val: '+1,480', label: 'معاينة عقارية ناجحة', badge: 'موثق 100%' },
                                      { val: '64 عقاراً', label: 'جاهز للمعاينة الفورية', badge: 'تحديث يومي' },
                                      { val: '15 مستشاراً', label: 'خبراء عقاريون معتمدون', badge: 'خدمة VIP' },
                                      { val: '98.4%', label: 'تقييم رضا العملاء', badge: 'تأكيد فوري SMS' },
                                    ].map((stat, i) => (
                                      <div key={i} className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                        <div className="text-base font-black tabular-nums">{stat.val}</div>
                                        <div className="text-[11px] opacity-70 mt-0.5">{stat.label}</div>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>
                                          {stat.badge}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Featured Properties Preview on Landing Page */}
                                  <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-black text-xs">أبرز العقارات المتاحة لحجز معاينة هذا الأسبوع</h4>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('portal')}
                                        className={`text-[11px] font-bold ${themeMap.lightText} hover:underline`}
                                      >
                                        عرض جميع العقارات (64) ←
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      {[
                                        { title: 'فيلا الياسمين الملكية - دابوق', specs: '620 م² • 5 غرف ماستر • مسبح خاص', price: '480,000 د.أ', status: 'متاح للمعاينة اليوم' },
                                        { title: 'بنتهاوس بانوراما - عبدون', specs: '310 م² • ترس مطل • تشطيب فندقي', price: '245,000 د.أ', status: '3 أوقات متاحة' },
                                        { title: 'مقر شركات ذكي - البوليفارد', specs: '400 م² • طابق كامل • مواقف خاصة', price: '320,000 د.أ', status: 'متاح للمعاينة غداً' },
                                      ].map((item, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 shadow-2xs ${themeMap.cardBg}`}>
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                ● {item.status}
                                              </span>
                                              <span className="font-black text-xs text-amber-600">{item.price}</span>
                                            </div>
                                            <div className="font-bold text-xs">{item.title}</div>
                                            <div className="text-[11px] opacity-65">{item.specs}</div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setStitchBookingService(item.title);
                                              setStitchScreenTab('booking');
                                            }}
                                            className={`w-full py-2 rounded-xl text-white font-bold text-[11px] transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                          >
                                            حجز موعد معاينة العقار
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* 3-Step How It Works Strip */}
                                  <div className={`p-4 rounded-2xl border ${themeMap.cardBg} space-y-3`}>
                                    <div className="font-black text-xs">كيف يعمل نظام حجز المواعيد العقارية؟</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 01</span>
                                        <div className="font-bold">اختر العقار أو نوع الاستشارة</div>
                                        <p className="text-[11px] opacity-65">تصفح الفلل والشقق والمكاتب مع صور ومواصفات دقيقة.</p>
                                      </div>
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 02</span>
                                        <div className="font-bold">حدد اليوم والوقت والمستشار</div>
                                        <p className="text-[11px] opacity-65">جدول زمني حي يعرض الأوقات المتاحة فعلياً دون تضارب.</p>
                                      </div>
                                      <div className="p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 space-y-1">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>الخطوة 03</span>
                                        <div className="font-bold">تأكيد فوري وموقع المعاينة</div>
                                        <p className="text-[11px] opacity-65">تصلك رسالة تأكيد فورية مع رابط الموقع الجغرافي (GPS).</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 1: MAIN DASHBOARD & APPOINTMENTS SCHEDULE */}
                              {stitchScreenTab === 'dashboard' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  {/* 4 KPI Cards inside Stitch Canvas */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">إجمالي المواعيد النشطة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">{stitchAppointments.length + 144} موعد</div>
                                      <span className="text-[10px] text-emerald-500 font-bold">+18% هذا الأسبوع</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">معاينات اليوم المؤكدة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">
                                        {stitchAppointments.filter(a => a.status === 'مؤكد').length + 12} معاينة
                                      </div>
                                      <span className={`text-[10px] font-bold ${themeMap.lightText}`}>مزامنة مع الوكلاء</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">الوحدات العقارية المتاحة</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">64 عقار</div>
                                      <span className="text-[10px] opacity-60">فلل • شقق • مكاتب</span>
                                    </div>
                                    <div className={`p-3.5 rounded-2xl border shadow-2xs ${themeMap.cardBg}`}>
                                      <span className="text-[10px] opacity-60 block">معدل حضور العملاء</span>
                                      <div className="text-lg font-black mt-0.5 tabular-nums">94.2%</div>
                                      <span className="text-[10px] text-emerald-500 font-bold">تذكير SMS مفعل</span>
                                    </div>
                                  </div>

                                  {/* Day Filter Strip */}
                                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 overflow-x-auto ${themeMap.cardBg}`}>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-bold opacity-75 ml-1">جدول أيام الأسبوع:</span>
                                      {['الأحد 18 أكتوبر', 'الإثنين 19 أكتوبر', 'الثلاثاء 20 أكتوبر', 'الأربعاء 21 أكتوبر'].map(day => (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => setStitchSelectedDay(day)}
                                          className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap ${
                                            stitchSelectedDay === day
                                              ? `${themeMap.primaryBg} text-white`
                                              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                                          }`}
                                        >
                                          {day}
                                        </button>
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-bold opacity-60 shrink-0">{stitchSelectedDay}</span>
                                  </div>

                                  {/* Interactive Appointments Table */}
                                  <div className={`rounded-2xl border overflow-hidden shadow-2xs ${themeMap.cardBg}`}>
                                    <div className="px-4 py-3 border-b border-slate-200/60 flex items-center justify-between">
                                      <span className="font-bold text-xs">جدول مواعيد المعاينات العقارية ({stitchSelectedDay})</span>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('booking')}
                                        className={`text-[11px] font-bold ${themeMap.lightText} hover:underline`}
                                      >
                                        + إضافة حجز للجدول
                                      </button>
                                    </div>
                                    <div className="divide-y divide-slate-200/50 text-xs">
                                      {stitchAppointments.map((apt) => (
                                        <div key={apt.id} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-slate-500/5 transition">
                                          <div className="space-y-0.5">
                                            <div className="font-bold flex items-center gap-2">
                                              <span>{apt.client}</span>
                                              <span className="text-[10px] font-mono opacity-50">{apt.id}</span>
                                            </div>
                                            <div className="text-[11px] opacity-70">{apt.property} · المستشار: {apt.agent}</div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-500/10">
                                              {apt.time}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setStitchAppointments(prev =>
                                                  prev.map(item =>
                                                    item.id === apt.id
                                                      ? { ...item, status: item.status === 'مؤكد' ? 'مكتمل' : 'مؤكد' }
                                                      : item
                                                  )
                                                );
                                                showToast(`تم تحديث حالة موعد ${apt.client}`);
                                              }}
                                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                                                apt.status === 'مؤكد'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : apt.status === 'مكتمل'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              ● {apt.status}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 2: INTERACTIVE BOOKING FORM SCREEN */}
                              {stitchScreenTab === 'booking' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  <div className={`p-5 rounded-2xl border space-y-4 ${themeMap.cardBg}`}>
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                      <div>
                                        <h4 className="font-black text-sm">حجز موعد معاينة عقارية جديدة</h4>
                                        <p className="text-[11px] opacity-60">اختر العقار والوقت المناسب ليتم إضافته فوراً إلى جدول المواعيد الحي</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('dashboard')}
                                        className="text-xs font-bold opacity-60 hover:opacity-100"
                                      >
                                        العودة للجدول ←
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <label className="block font-bold mb-1">اسم العميل الكامل</label>
                                        <input
                                          type="text"
                                          value={stitchBookingClient}
                                          onChange={e => setStitchBookingClient(e.target.value)}
                                          placeholder="مثال: م. سامي عبد الرحمن"
                                          className="w-full h-10 px-3 rounded-xl bg-slate-500/5 border border-slate-300/60 text-xs focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block font-bold mb-1">العقار / نوع الموعد</label>
                                        <select
                                          value={stitchBookingService}
                                          onChange={e => setStitchBookingService(e.target.value)}
                                          className="w-full h-10 px-3 rounded-xl bg-slate-500/5 border border-slate-300/60 text-xs font-semibold focus:outline-none"
                                        >
                                          <option value="معاينة فيلا سكنية - دابوق">معاينة فيلا سكنية - دابوق</option>
                                          <option value="معاينة شقة طابقية - عبدون">معاينة شقة طابقية - عبدون</option>
                                          <option value="مكتب تجاري ذكي - البوليفارد">مكتب تجاري ذكي - البوليفارد</option>
                                          <option value="استشارة استثمار وتمويل عقاري">استشارة استثمار وتمويل عقاري</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="text-xs space-y-1.5">
                                      <label className="block font-bold">اختر الفترة الزمنية المتاحة ({stitchSelectedDay})</label>
                                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {['09:30 صباحاً', '11:00 صباحاً', '01:00 ظهراً', '03:30 مساءً', '05:00 مساءً'].map(slot => (
                                          <button
                                            key={slot}
                                            type="button"
                                            onClick={() => setStitchSelectedSlot(slot)}
                                            className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition ${
                                              stitchSelectedSlot === slot
                                                ? `${themeMap.primaryBg} text-white border-transparent shadow-xs`
                                                : 'border-slate-300/60 hover:border-orange-400'
                                            }`}
                                          >
                                            {slot}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newEntry = {
                                            id: `APT-${Math.floor(105 + Math.random() * 90)}`,
                                            client: stitchBookingClient.trim() || 'عميل جديد (معاينة فورية)',
                                            property: stitchBookingService,
                                            time: stitchSelectedSlot,
                                            agent: 'أ. سامر الحسن',
                                            status: 'مؤكد' as const,
                                          };
                                          setStitchAppointments(prev => [newEntry, ...prev]);
                                          setStitchBookingClient('');
                                          setStitchScreenTab('dashboard');
                                          showToast(`تم تأكيد حجز الموعد (${newEntry.time}) وإضافته للوحة المواعيد الحية!`);
                                        }}
                                        className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                      >
                                        تأكيد الحجز وإضافته للجدول الحي
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TAB 3: CUSTOMER PORTAL & PROPERTY SHOWCASE CARDS */}
                              {stitchScreenTab === 'portal' && (
                                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    {[
                                      { title: 'فيلا الياسمين الذكية - دابوق', area: '620 م² • 5 غرف ماستر', price: '480,000 د.أ', slots: '3 مواعيد متاحة اليوم', tag: 'حصري VIP' },
                                      { title: 'شقة بانوراما - عبدون الشمالي', area: '245 م² • ترس مطل', price: '195,000 د.أ', slots: '5 مواعيد متاحة اليوم', tag: 'الأكثر طلباً' },
                                      { title: 'مكاتب أبراج العبدلي التجارية', area: '310 م² • تجهيز كامل', price: '260,000 د.أ', slots: 'موعدان متاحان اليوم', tag: 'استثماري' },
                                    ].map((prop, idx) => (
                                      <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 shadow-2xs ${themeMap.cardBg}`}>
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>
                                              {prop.tag}
                                            </span>
                                            <span className="font-black text-xs">{prop.price}</span>
                                          </div>
                                          <h5 className="font-bold text-xs">{prop.title}</h5>
                                          <p className="text-[11px] opacity-65">{prop.area}</p>
                                          <div className="text-[10px] text-emerald-500 font-bold">● {prop.slots}</div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setStitchBookingService(prop.title);
                                            setStitchScreenTab('booking');
                                          }}
                                          className={`w-full py-2 rounded-xl text-white font-bold text-[11px] transition ${themeMap.primaryBg} ${themeMap.primaryHover}`}
                                        >
                                          احجز موعد معاينة للعقار
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* DYNAMICALLY ADDED CUSTOM PAGES FROM GATE 2 CHAT */}
                              {stitchCustomPages
                                .filter(cp => cp.id === stitchScreenTab)
                                .map(cp => (
                                  <div key={cp.id} className="p-5 space-y-4 flex-1 overflow-y-auto">
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${themeMap.cardBg}`}>
                                      <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                          <span>● صفحة مولدة بالذكاء الاصطناعي عبر Google Stitch</span>
                                        </div>
                                        <h4 className="font-black text-sm">{cp.title}</h4>
                                        <p className="text-[11px] opacity-65">بناءً على طلبك في الشات: "{cp.prompt}"</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setStitchScreenTab('landing')}
                                        className="text-xs font-bold opacity-60 hover:opacity-100"
                                      >
                                        العودة للرئيسية ←
                                      </button>
                                    </div>

                                    {cp.pageKind === 'auth' && (
                                      <div className={`max-w-md mx-auto p-6 rounded-3xl border shadow-sm space-y-4 ${themeMap.cardBg}`}>
                                        <div className="text-center space-y-1">
                                          <div className={`w-11 h-11 rounded-2xl mx-auto flex items-center justify-center text-white font-black ${themeMap.primaryBg}`}>
                                            عقار
                                          </div>
                                          <h5 className="font-black text-sm mt-2">تسجيل الدخول إلى بوابة المكتب العقاري</h5>
                                          <p className="text-[11px] opacity-60">أدخل بياناتك لإدارة حجوزات ومعاينات العقارات</p>
                                        </div>
                                        <div className="space-y-3 text-xs">
                                          <div>
                                            <label className="block font-bold mb-1">البريد الإلكتروني أو رقم الجوال</label>
                                            <input type="text" placeholder="client@realestate.jo" className="w-full h-10 px-3 rounded-xl border border-slate-300/70 bg-transparent" />
                                          </div>
                                          <div>
                                            <label className="block font-bold mb-1">كلمة المرور</label>
                                            <input type="password" value="••••••••" readOnly className="w-full h-10 px-3 rounded-xl border border-slate-300/70 bg-transparent" />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              showToast('تم تسجيل الدخول بنجاح في المعاينة التفاعلية!');
                                              setStitchScreenTab('dashboard');
                                            }}
                                            className={`w-full py-2.5 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                          >
                                            دخول إلى المنصة
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {cp.pageKind === 'pricing' && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        {[
                                          { name: 'باقة المعاينة الأساسية', price: 'مجاناً', desc: 'حجز مواعيد معاينة حتى 3 عقارات أسبوعياً', btn: 'الباقة الحالية' },
                                          { name: 'باقة المستثمر العقاري VIP', price: '150 د.أ / شهر', desc: 'جولات ميدانية خاصة + مستشار مالي وعقاري مخصص', btn: 'اشترك الآن' },
                                          { name: 'باقة الشركات والمطورين', price: '450 د.أ / شهر', desc: 'إدارة مفتوحة لجميع المشاريع والوكلاء وتقارير متقدمة', btn: 'تواصل للمؤسسات' },
                                        ].map((plan, i) => (
                                          <div key={i} className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${themeMap.cardBg}`}>
                                            <div className="space-y-2">
                                              <div className="font-bold text-xs">{plan.name}</div>
                                              <div className="text-lg font-black text-amber-600">{plan.price}</div>
                                              <p className="text-[11px] opacity-70">{plan.desc}</p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => showToast(`تم اختيار ${plan.name}`)}
                                              className={`w-full py-2 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                            >
                                              {plan.btn}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {cp.pageKind !== 'auth' && cp.pageKind !== 'pricing' && (
                                      <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم الرئيسي 01</span>
                                            <div className="font-bold text-xs">واجهة {cp.title}</div>
                                            <p className="text-[11px] opacity-65">مكون تفاعلي مصمم خصيصاً لـ {activeProject.name} مع دعم كامل للعربية.</p>
                                          </div>
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم التفاعلي 02</span>
                                            <div className="font-bold text-xs">إدارة البيانات والإجراءات السريعة</div>
                                            <p className="text-[11px] opacity-65">مرتبط مباشرة بقاعدة بيانات المواعيد والعقارات والعملاء.</p>
                                          </div>
                                          <div className={`p-4 rounded-2xl border space-y-1.5 ${themeMap.cardBg}`}>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${themeMap.lightBg} ${themeMap.lightText}`}>القسم التحليلي 03</span>
                                            <div className="font-bold text-xs">ملخص مخرجات Google Stitch</div>
                                            <p className="text-[11px] opacity-65 line-clamp-2">{cp.aiSummary}</p>
                                          </div>
                                        </div>

                                        <div className={`p-5 rounded-2xl border space-y-3 ${themeMap.cardBg}`}>
                                          <div className="font-bold text-xs">نموذج التفاعل السريع في {cp.title}</div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input type="text" placeholder="الاسم أو العنوان..." className="h-10 px-3 rounded-xl border border-slate-300/60 bg-transparent text-xs" />
                                            <input type="text" placeholder="التفاصيل أو الملاحظات..." className="h-10 px-3 rounded-xl border border-slate-300/60 bg-transparent text-xs" />
                                            <button
                                              type="button"
                                              onClick={() => showToast(`تم حفظ البيانات في ${cp.title} بنجاح!`)}
                                              className={`h-10 rounded-xl text-white font-bold ${themeMap.primaryBg}`}
                                            >
                                              حفظ وتنفيذ الإجراء
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                              {/* TAB 4: STITCH GENERATED TAILWIND / REACT CODE */}
                              {stitchScreenTab === 'code' && (
                                <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] flex-1 overflow-auto" dir="ltr">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                                    <span>// Google Stitch Generated UI Component (Tailwind CSS RTL)</span>
                                    <button
                                      type="button"
                                      onClick={() => showToast('تم نسخ كود واجهة Google Stitch إلى الحافظة')}
                                      className="px-2.5 py-1 rounded bg-slate-800 text-white text-[10px] font-sans font-bold"
                                    >
                                      نسخ الكود
                                    </button>
                                  </div>
                                  <pre>{`export default function RealEstateBookingStitchUI() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-6 space-y-6">
      <header className="bg-white p-4 rounded-2xl border flex items-center justify-between">
        <h1 className="text-lg font-black">${activeProject.name}</h1>
        <button className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold">
          + حجز موعد معاينة جديد
        </button>
      </header>
      {/* Landing Page + Live Appointments Schedule + Custom Stitch Pages */}
    </div>
  );
}`}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {activeProject.currentGate === 3 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col">
                          {(() => {
                            const filesList =
                              gate3Code && gate3Code.files.length > 0
                                ? gate3Code.files.map(f => ({ name: f.path, content: f.content, description: f.description }))
                                : activeProject.codeFiles.map(f => ({ name: f.name, content: f.content, description: '' }));
                            const currentFile = filesList[selectedCodeFileIdx] || filesList[0];

                            return (
                              <>
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {filesList.map((file, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCodeFileIdx(idx);
                                          setGate3EditingContent(file.content);
                                          setGate3Dirty(false);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                                          selectedCodeFileIdx === idx
                                            ? 'bg-orange-600 text-white shadow-2xs'
                                            : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                        }`}
                                        dir="ltr"
                                      >
                                        {file.name}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => setGate3ViewTab('code')}
                                        className={`px-2.5 py-1 rounded-lg transition ${gate3ViewTab === 'code' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                                      >
                                        محرر الكود ({filesList.length})
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGate3ViewTab('preview')}
                                        className={`px-2.5 py-1 rounded-lg transition ${gate3ViewTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                                      >
                                        معاينة التطبيق الحية
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setGate3ViewTab('architecture')}
                                        className={`px-2.5 py-1 rounded-lg transition ${gate3ViewTab === 'architecture' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                                      >
                                        البنية المعمارية و APIs
                                      </button>
                                    </div>

                                    {!gate3Locked && gate3Code && gate3Dirty && (
                                      <button
                                        type="button"
                                        onClick={handleSaveGate3FileEdit}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                                      >
                                        حفظ تعديل الملف
                                      </button>
                                    )}

                                    {!gate3Locked && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          executeStageAgentPrompt(
                                            `قم بكتابة وتوليد كود المكونات البرمجية الكاملة لمشروع "${activeProject.name}" باستخدام React و TypeScript و Tailwind CSS`
                                          )
                                        }
                                        disabled={isAiProcessing}
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
                                      >
                                        <Code2 className="w-3.5 h-3.5 text-orange-400" />
                                        <span>{gate3Code ? 'تحديث الكود بالذكاء الاصطناعي' : '+ توليد الكود عبر وكيل البوابة 3'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {gate3ViewTab === 'code' && (
                                  <div className="flex-1 flex flex-col space-y-2">
                                    {currentFile?.description && (
                                      <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                        {currentFile.description}
                                      </div>
                                    )}
                                    <textarea
                                      disabled={gate3Locked || !gate3Code}
                                      value={gate3Code ? gate3EditingContent : currentFile?.content || '// اضغط على توليد الكود لإنشاء الملفات البرمجية'}
                                      onChange={e => {
                                        setGate3EditingContent(e.target.value);
                                        setGate3Dirty(true);
                                      }}
                                      dir="ltr"
                                      className="flex-1 min-h-[420px] bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                    />
                                  </div>
                                )}

                                {gate3ViewTab === 'preview' && (
                                  <div className="flex-1 min-h-[440px] rounded-2xl border border-slate-300 overflow-hidden bg-white">
                                    {gate3Code?.previewHtml ? (
                                      <iframe
                                        title="gate3-live-app-preview"
                                        srcDoc={gate3Code.previewHtml}
                                        sandbox="allow-scripts"
                                        className="w-full h-[440px] border-0"
                                      />
                                    ) : (
                                      <div className="h-[440px] flex items-center justify-center text-xs text-slate-400">
                                        قم بتوليد الكود أولاً لعرض المعاينة التفاعلية للتطبيق المبرمج.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {gate3ViewTab === 'architecture' && (
                                  <div className="flex-1 space-y-4 text-xs overflow-y-auto">
                                    {gate3Code ? (
                                      <>
                                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                                          <div className="font-bold text-slate-900">ملخص البنية المعمارية (Architecture Summary)</div>
                                          <p className="text-slate-600 leading-relaxed">{gate3Code.architectureSummary}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                            <div className="font-bold text-slate-900">نقاط النهاية البرمجية (API Endpoints)</div>
                                            <ul className="space-y-1 font-mono text-[11px] text-slate-700" dir="ltr">
                                              {gate3Code.apiEndpoints.map((ep, i) => (
                                                <li key={i}>• {ep}</li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                            <div className="font-bold text-slate-900">جداول البيانات وحزم التشغيل</div>
                                            <ul className="space-y-1 font-mono text-[11px] text-slate-700" dir="ltr">
                                              {gate3Code.databaseTables.map((tb, i) => (
                                                <li key={i}>Table: {tb}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="p-8 text-center text-slate-400">لم يتم توليد الكود المصدري بعد.</div>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {activeProject.currentGate === 4 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-900 space-y-1">
                                <span className="text-xs text-emerald-600 font-semibold">الفحوصات الناجحة (Passed Checks)</span>
                                <div className="text-2xl font-black">
                                  {gate4Report
                                    ? `${gate4Report.summary.passed} / ${gate4Report.summary.total}`
                                    : `${activeProject.testResults?.passed || 0} / ${(activeProject.testResults?.passed || 0) + (activeProject.testResults?.failed || 0)}`}
                                </div>
                              </div>
                              <div className={`border p-4 rounded-2xl space-y-1 ${gate4Report?.status === 'failed' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                                <span className="text-xs font-semibold">درجة الجودة والأمان (QA Score)</span>
                                <div className="text-2xl font-black">
                                  {gate4Report ? `${gate4Report.summary.score}% (${gate4Report.status === 'passed' ? 'ناجح' : 'يتطلب إصلاح'})` : 'بانتظار الفحص'}
                                </div>
                              </div>
                              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 space-y-1">
                                <span className="text-xs text-amber-700 font-semibold">حلقات الإصلاح التلقائي</span>
                                <div className="text-2xl font-black">
                                  {gate4Report ? `${gate4Report.repairIterations} مرات` : '0'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {gate4Report && gate4Report.status === 'failed' && !gate4Locked && (
                                <button
                                  type="button"
                                  onClick={handleRepairGate4}
                                  disabled={gate4Repairing || isAiProcessing}
                                  className="px-4 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                  <span>{gate4Repairing ? 'جاري إصلاح الكود...' : 'إصلاح الكود تلقائياً وإعادة الفحص (Auto-Repair)'}</span>
                                </button>
                              )}
                              {!gate4Locked && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    executeStageAgentPrompt(
                                      `قم بإجراء فحص أمني واختبار جودة شامل للكود والمتطلبات في "${activeProject.name}" وإصدار التقرير`
                                    )
                                  }
                                  disabled={isAiProcessing || gate4Repairing}
                                  className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shrink-0"
                                >
                                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                  <span>تشغيل فحص وكيل البوابة 4 الآن</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {gate4Report && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                                <div className="font-bold text-slate-800">تفاصيل الفحوصات الآلية ({gate4Report.checks.length})</div>
                                {gate4Report.checks.map(chk => (
                                  <div key={chk.id} className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                                    <div>
                                      <span className="font-bold">{chk.title}: </span>
                                      <span className="text-slate-600">{chk.details}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${chk.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : chk.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {chk.status.toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                                <div className="font-bold text-slate-800">تغطية المتطلبات وفحص الأمان</div>
                                <p className="text-slate-600">{gate4Report.aiAnalysis}</p>
                                {gate4Report.securityFindings.length === 0 ? (
                                  <div className="text-emerald-700 font-bold">✓ لم يتم رصد أي ثغرات أمنية حرجة أو مفاتيح مسربة في الكود.</div>
                                ) : (
                                  gate4Report.securityFindings.map((sf, idx) => (
                                    <div key={idx} className="text-red-700">
                                      • {typeof sf === 'string' ? sf : JSON.stringify(sf)}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl p-4 space-y-1.5 flex-1 overflow-y-auto" dir="ltr">
                            {(gate4Report?.logs || activeProject.testResults?.logs || [
                              '[INFO] Ready to run Gate 4 QA & Security verification against Gate 3 generated code.',
                            ]).map((logLine, i) => (
                              <div key={i} className={logLine.includes('[PASS]') ? 'text-emerald-400' : logLine.includes('[FAIL]') ? 'text-rose-400' : 'text-amber-300'}>
                                {logLine}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeProject.currentGate === 5 && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex-1 flex flex-col">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <PackageCheck className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-sm">
                                  {gate5Delivery ? `حزمة التسليم النهائية جاهزة (${gate5Delivery.zipFileName})` : 'توليد حزمة الإنتاج والتسليم النهائي (Gate 5)'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  {gate5Delivery
                                    ? gate5Delivery.releaseSummary
                                    : 'اضغط على توليد حزمة التسليم لتجميع المتطلبات والتصاميم والكود وتقرير الفحص في أرشيف ZIP حقيقي قابل للتحميل.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {!gate5Locked && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    executeStageAgentPrompt(
                                      `قم بتوليد حزمة التسليم النهائية ودليل التشغيل والإطلاق السحابي لمشروع "${activeProject.name}"`
                                    )
                                  }
                                  disabled={isAiProcessing}
                                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
                                >
                                  <Play className="w-3.5 h-3.5 text-orange-400" />
                                  <span>{gate5Delivery ? 'تحديث حزمة التسليم' : 'توليد حزمة التسليم عبر وكيل البوابة 5'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/projects/${activeProject.id}/gates/5/download`, {
                                      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
                                    });
                                    if (!res.ok) {
                                      const errData = await res.json().catch(() => ({}));
                                      throw new Error(errData.error || 'يرجى توليد حزمة التسليم في البوابة 5 أولاً قبل التحميل.');
                                    }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = gate5Delivery?.zipFileName || `${activeProject.id}-delivery-bundle.zip`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    showToast('تم تحميل أرشيف المشروع النهائي (ZIP) بنجاح!');
                                  } catch (err: any) {
                                    setGate1ErrorBanner(err.message || 'فشل تحميل ملف ZIP');
                                    showToast(err.message || 'فشل تحميل ملف ZIP');
                                  }
                                }}
                                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                <span>تحميل الحزمة البرمجية الكاملة (ZIP Archive)</span>
                              </button>
                            </div>
                          </div>

                          {gate5Delivery ? (
                            <div className="flex-1 flex flex-col space-y-3">
                              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                {([
                                  { id: 'summary', label: 'ملخص الحزمة والملفات' },
                                  { id: 'readme', label: 'README.md' },
                                  { id: 'deployment', label: 'DEPLOYMENT.md' },
                                  { id: 'env', label: '.env.example' },
                                  { id: 'manifest', label: 'manifest.json' },
                                ] as const).map(tab => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setGate5ActiveDocTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition ${
                                      gate5ActiveDocTab === tab.id ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>

                              {gate5ActiveDocTab === 'summary' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs flex-1">
                                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                    <div className="font-bold text-slate-900">محتويات أرشيف التسليم الموثقة</div>
                                    <ul className="space-y-1 text-slate-700">
                                      <li>• وثيقة المتطلبات المعتمدة (Gate 1 v{gate5Delivery.manifest.approvedGates.gate1Version})</li>
                                      <li>• مخرجات التصميم والشاشات (Gate 2 v{gate5Delivery.manifest.approvedGates.gate2Version})</li>
                                      <li>• الكود المصدري الكامل (Gate 3 v{gate5Delivery.manifest.approvedGates.gate3Version})</li>
                                      <li>• شهادة فحص الجودة والأمان (Gate 4 v{gate5Delivery.manifest.approvedGates.gate4Version} • {gate5Delivery.manifest.qaScore}%)</li>
                                      <li>• إجمالي الملفات المضمنة في الأرشيف: {gate5Delivery.includedFiles.length} ملف</li>
                                    </ul>
                                  </div>
                                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 max-h-60 overflow-y-auto">
                                    <div className="font-bold text-slate-900">قائمة الملفات داخل الحزمة</div>
                                    <ul className="space-y-1 font-mono text-[11px] text-slate-600" dir="ltr">
                                      {gate5Delivery.includedFiles.map((f, i) => (
                                        <li key={i}>✓ {f}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {gate5ActiveDocTab !== 'summary' && (
                                <pre className="flex-1 min-h-[320px] bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl p-4 overflow-auto" dir="ltr">
                                  {gate5ActiveDocTab === 'readme'
                                    ? gate5Delivery.readmeMarkdown
                                    : gate5ActiveDocTab === 'deployment'
                                    ? gate5Delivery.deploymentGuideMarkdown
                                    : gate5ActiveDocTab === 'env'
                                    ? gate5Delivery.envExample
                                    : JSON.stringify(gate5Delivery.manifest, null, 2)}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-slate-400">
                              اضغط على الزر أعلاه لتوليد حزمة التسليم الكاملة وتجهيز ملف الـ ZIP للتحميل.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </main>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
}
